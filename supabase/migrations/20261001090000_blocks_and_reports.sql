-- Blocking and reporting. See docs/specs/report-and-block.md and
-- docs/adr/0010-blocking-hides-both-ways.md.
--
-- A block hides both people from each other in rides and carpools, ends
-- every connection between them and stops new ones. Reports are
-- write-only for clients and reviewed by the operator.

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),

  primary key (blocker_id, blocked_id),
  constraint blocks_not_self check (blocker_id <> blocked_id)
);

create index blocks_blocked_idx on public.blocks (blocked_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  -- Kept when either side deletes their account, so the operator can
  -- still act on a pattern; the handle is a snapshot for that case.
  reporter_id uuid references public.profiles (id) on delete set null,
  reported_user_id uuid references public.profiles (id) on delete set null,
  reported_handle text,
  ride_id uuid references public.rides (id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now(),

  constraint reports_reason_value check (
    reason in ('unsafe', 'harassment', 'spam', 'fake_profile', 'other')
  ),
  constraint reports_details_length check (details is null or char_length(details) <= 1000),
  constraint reports_status_value check (status in ('open', 'reviewed', 'actioned'))
);

create index reports_reported_idx on public.reports (reported_user_id);
create index reports_reporter_idx on public.reports (reporter_id, created_at);

alter table public.blocks enable row level security;
alter table public.blocks force row level security;
alter table public.reports enable row level security;
alter table public.reports force row level security;

revoke all on table public.blocks from public, anon, authenticated;
revoke all on table public.reports from public, anon, authenticated;

create or replace function private.is_blocked(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks bl
    where (bl.blocker_id = a and bl.blocked_id = b)
       or (bl.blocker_id = b and bl.blocked_id = a)
  );
$$;

revoke all on function private.is_blocked(uuid, uuid) from public, anon, authenticated;

-- Second line of defence: whatever path writes a connection, a blocked
-- pair cannot get one.
create or replace function private.reject_blocked_connection()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  a uuid;
  b uuid;
begin
  if tg_table_name = 'friendships' then
    a := new.requester_id;
    b := new.addressee_id;
  elsif tg_table_name = 'ride_participants' then
    a := new.user_id;
    select r.host_id into b from public.rides r where r.id = new.ride_id;
  else
    a := new.user_id;
    select c.author_id into b from public.carpools c where c.id = new.carpool_id;
  end if;

  if private.is_blocked(a, b) then
    raise exception 'blocked' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function private.reject_blocked_connection() from public, anon, authenticated;

create trigger friendships_reject_blocked
  before insert on public.friendships
  for each row execute function private.reject_blocked_connection();

create trigger ride_participants_reject_blocked
  before insert on public.ride_participants
  for each row execute function private.reject_blocked_connection();

create trigger carpool_requests_reject_blocked
  before insert on public.carpool_requests
  for each row execute function private.reject_blocked_connection();

-- Visibility now excludes blocked pairs in both directions.
create or replace function private.can_see_ride(
  viewer uuid,
  ride public.rides,
  host_is_minor boolean
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    viewer = ride.host_id
    or not private.is_blocked(viewer, ride.host_id) and (
    exists (
      select 1 from public.ride_participants rp
      where rp.ride_id = ride.id and rp.user_id = viewer
    )
    or private.are_friends(viewer, ride.host_id)
    -- Adult hosts reach friends of friends; minors only confirmed friends.
    or (
      ride.visibility = 'friends'
      and not host_is_minor
      and private.are_friends_of_friends(viewer, ride.host_id)
    )
    -- Rule 5: a public ride by a minor never reaches strangers, even if
    -- the flag got set somehow.
    or (ride.visibility = 'public' and not host_is_minor)
    );
$$;

create or replace function private.can_see_carpool(viewer uuid, pool public.carpools)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    viewer = pool.author_id
    or not private.is_blocked(viewer, pool.author_id) and (
    exists (
      select 1 from public.carpool_requests cr
      where cr.carpool_id = pool.id and cr.user_id = viewer
    )
    or private.are_friends(viewer, pool.author_id)
    or (
      private.are_friends_of_friends(viewer, pool.author_id)
      and not exists (
        select 1 from public.profiles p
        where p.id in (viewer, pool.author_id) and p.is_minor
      )
    )
    );
$$;

create or replace function public.request_friendship(target_handle text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  target uuid;
  existing public.friendships;
begin
  if me is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if not private.has_complete_profile(me) then
    return 'profile_incomplete';
  end if;

  -- A cap on unanswered requests keeps this from being used to probe
  -- handles or to spray requests at people, minors included.
  if (
    select count(*) from public.friendships f
    where f.requester_id = me and f.status = 'pending'
  ) >= 20 then
    return 'too_many_pending';
  end if;

  select p.id into target
  from public.profiles p
  where p.handle = lower(btrim(target_handle, ' @'))
    and p.onboarding_completed;

  if target is null then
    return 'not_found';
  end if;

  if target = me then
    return 'self';
  end if;

  -- A block in either direction looks like an unknown handle: the
  -- blocked person learns nothing.
  if private.is_blocked(me, target) then
    return 'not_found';
  end if;

  select * into existing
  from public.friendships f
  where least(f.requester_id, f.addressee_id) = least(me, target)
    and greatest(f.requester_id, f.addressee_id) = greatest(me, target);

  if found then
    if existing.status = 'accepted' then
      return 'already_friends';
    end if;

    if existing.addressee_id = me then
      update public.friendships
      set status = 'accepted', responded_at = now()
      where requester_id = existing.requester_id
        and addressee_id = existing.addressee_id;
      return 'accepted';
    end if;

    return 'already_requested';
  end if;

  insert into public.friendships (requester_id, addressee_id)
  values (me, target);

  return 'requested';
end;
$$;

create or replace function public.export_my_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'exported_at', now(),
    'account', (
      select jsonb_build_object('id', u.id, 'email', u.email, 'created_at', u.created_at)
      from auth.users u where u.id = me
    ),
    'profile', (
      select to_jsonb(p) - 'id' from public.profiles p where p.id = me
    ),
    'friendships', coalesce((
      select jsonb_agg(jsonb_build_object(
        'handle', other.handle,
        'status', f.status,
        'direction', case when f.requester_id = me then 'outgoing' else 'incoming' end,
        'created_at', f.created_at,
        'responded_at', f.responded_at
      ) order by f.created_at)
      from public.friendships f
      join public.profiles other
        on other.id = case when f.requester_id = me then f.addressee_id else f.requester_id end
      where me in (f.requester_id, f.addressee_id)
    ), '[]'::jsonb),
    'rides_hosted', coalesce((
      select jsonb_agg(to_jsonb(r) - 'host_id' order by r.ride_date)
      from public.rides r where r.host_id = me
    ), '[]'::jsonb),
    'rides_joined', coalesce((
      select jsonb_agg(jsonb_build_object(
        'ride_id', rp.ride_id,
        'resort', r.resort,
        'ride_date', r.ride_date,
        'status', rp.status,
        'joined_at', rp.joined_at
      ) order by rp.joined_at)
      from public.ride_participants rp
      join public.rides r on r.id = rp.ride_id
      where rp.user_id = me
    ), '[]'::jsonb),
    'carpools', coalesce((
      select jsonb_agg(to_jsonb(c) - 'author_id' order by c.ride_date)
      from public.carpools c where c.author_id = me
    ), '[]'::jsonb),
    'carpool_requests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'carpool_id', cr.carpool_id,
        'resort', c.resort,
        'ride_date', c.ride_date,
        'status', cr.status,
        'created_at', cr.created_at
      ) order by cr.created_at)
      from public.carpool_requests cr
      join public.carpools c on c.id = cr.carpool_id
      where cr.user_id = me
    ), '[]'::jsonb),
    'blocked', coalesce((
      select jsonb_agg(jsonb_build_object('handle', p.handle, 'since', b.created_at) order by b.created_at)
      from public.blocks b
      join public.profiles p on p.id = b.blocked_id
      where b.blocker_id = me
    ), '[]'::jsonb),
    'reports_filed', coalesce((
      select jsonb_agg(jsonb_build_object(
        'reported_handle', r.reported_handle,
        'reason', r.reason,
        'details', r.details,
        'created_at', r.created_at
      ) order by r.created_at)
      from public.reports r
      where r.reporter_id = me
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.block_user(target uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if target is null or target = me then
    return 'self';
  end if;

  if not exists (select 1 from public.profiles p where p.id = target) then
    return 'not_found';
  end if;

  insert into public.blocks (blocker_id, blocked_id)
  values (me, target)
  on conflict do nothing;

  delete from public.friendships f
  where least(f.requester_id, f.addressee_id) = least(me, target)
    and greatest(f.requester_id, f.addressee_id) = greatest(me, target);

  delete from public.ride_participants rp
  using public.rides r
  where r.id = rp.ride_id
    and ((r.host_id = me and rp.user_id = target) or (r.host_id = target and rp.user_id = me));

  delete from public.carpool_requests cr
  using public.carpools c
  where c.id = cr.carpool_id
    and ((c.author_id = me and cr.user_id = target) or (c.author_id = target and cr.user_id = me));

  return 'blocked';
end;
$$;

create or replace function public.unblock_user(target uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  delete from public.blocks b
  where b.blocker_id = auth.uid() and b.blocked_id = target;

  return found;
end;
$$;

create or replace function public.list_my_blocks()
returns table (user_id uuid, display_name text, handle text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.display_name, p.handle, b.created_at
  from public.blocks b
  join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid()
  order by b.created_at desc;
$$;

create or replace function public.report_user(
  target uuid,
  reason text,
  details text default null,
  ride uuid default null,
  also_block boolean default false
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  handle_snapshot text;
begin
  if me is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if target is null or target = me then
    return 'self';
  end if;

  select p.handle into handle_snapshot from public.profiles p where p.id = target;

  if not found then
    return 'not_found';
  end if;

  if (
    select count(*) from public.reports r
    where r.reporter_id = me and r.created_at > now() - interval '1 day'
  ) >= 10 then
    return 'too_many';
  end if;

  insert into public.reports (reporter_id, reported_user_id, reported_handle, ride_id, reason, details)
  values (
    me,
    target,
    handle_snapshot,
    -- Only a ride the reporter can actually see; anything else would let
    -- a report probe for ride ids.
    case when exists (
      select 1 from public.rides r
      join public.profiles hp on hp.id = r.host_id
      where r.id = ride and private.can_see_ride(me, r, hp.is_minor)
    ) then ride end,
    reason,
    nullif(btrim(coalesce(details, '')), '')
  );

  if also_block then
    perform public.block_user(target);
  end if;

  return 'reported';
end;
$$;

revoke all on function public.block_user(uuid) from public, anon;
revoke all on function public.unblock_user(uuid) from public, anon;
revoke all on function public.list_my_blocks() from public, anon;
revoke all on function public.report_user(uuid, text, text, uuid, boolean) from public, anon;
grant execute on function public.block_user(uuid) to authenticated;
grant execute on function public.unblock_user(uuid) to authenticated;
grant execute on function public.list_my_blocks() to authenticated;
grant execute on function public.report_user(uuid, text, text, uuid, boolean) to authenticated;
