-- Friend graph and rides, with the visibility rules from
-- docs/BACKEND_REQUESTS.md enforced in the database rather than the client.
--
-- Access model: clients never select from friendships, rides or
-- ride_participants directly. Reads go through security-definer functions
-- that apply the audience rules row by row and only return the meeting
-- point to people allowed to see it. Posting a ride is a plain insert
-- (column grant + RLS); every other write is a function, because a
-- filtered delete would need select rights on the table.

-- ─── Friendships ───────────────────────────────────────────────────────

create table public.friendships (
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,

  primary key (requester_id, addressee_id),
  constraint friendships_not_self check (requester_id <> addressee_id),
  constraint friendships_status_value check (status in ('pending', 'accepted'))
);

-- One row per pair, whichever direction asked first.
create unique index friendships_pair_unique
  on public.friendships (
    least(requester_id, addressee_id),
    greatest(requester_id, addressee_id)
  );

create index friendships_addressee_idx on public.friendships (addressee_id);

alter table public.friendships enable row level security;
alter table public.friendships force row level security;

revoke all on table public.friendships from public, anon, authenticated;

create or replace function private.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.friendships f
    where f.status = 'accepted'
      and least(f.requester_id, f.addressee_id) = least(a, b)
      and greatest(f.requester_id, f.addressee_id) = greatest(a, b)
  );
$$;

create or replace function private.friend_ids(u uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select case when f.requester_id = u then f.addressee_id else f.requester_id end
  from public.friendships f
  where f.status = 'accepted'
    and u in (f.requester_id, f.addressee_id);
$$;

create or replace function private.are_friends_of_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.friend_ids(a) fa
    join private.friend_ids(b) fb on fa = fb
  );
$$;

revoke all on function private.are_friends(uuid, uuid) from public, anon, authenticated;
revoke all on function private.friend_ids(uuid) from public, anon, authenticated;
revoke all on function private.are_friends_of_friends(uuid, uuid) from public, anon, authenticated;

-- Send a request by exact handle. There is no search: you need to know
-- the handle, which keeps minors out of open stranger discovery.
-- If the other side already asked you, this accepts instead.
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

create or replace function public.accept_friendship(requester uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  update public.friendships
  set status = 'accepted', responded_at = now()
  where requester_id = requester
    and addressee_id = auth.uid()
    and status = 'pending';

  return found;
end;
$$;

-- Either side may decline a request, withdraw it, or end a friendship.
create or replace function public.remove_friendship(other uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  delete from public.friendships f
  where least(f.requester_id, f.addressee_id) = least(auth.uid(), other)
    and greatest(f.requester_id, f.addressee_id) = greatest(auth.uid(), other);

  return found;
end;
$$;

-- Your own friend graph: accepted friends plus open requests in both
-- directions, with the minimum profile fields needed to show them.
create or replace function public.list_my_friendships()
returns table (
  user_id uuid,
  display_name text,
  handle text,
  city text,
  ability_level text,
  status text,
  direction text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.display_name,
    p.handle,
    p.city,
    p.ability_level,
    f.status,
    case when f.requester_id = auth.uid() then 'outgoing' else 'incoming' end
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
  where auth.uid() in (f.requester_id, f.addressee_id)
  order by f.status, p.display_name;
$$;

revoke all on function public.request_friendship(text) from public, anon;
revoke all on function public.accept_friendship(uuid) from public, anon;
revoke all on function public.list_my_friendships() from public, anon;
revoke all on function public.remove_friendship(uuid) from public, anon;
grant execute on function public.remove_friendship(uuid) to authenticated;
grant execute on function public.request_friendship(text) to authenticated;
grant execute on function public.accept_friendship(uuid) to authenticated;
grant execute on function public.list_my_friendships() to authenticated;

-- ─── Rides ─────────────────────────────────────────────────────────────

create table public.rides (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  resort text not null,
  city text not null,
  ability_level text not null,
  ride_date date not null,
  meet_time time not null,
  meet_point text not null,
  total_spots smallint not null,
  caption text,
  title text,
  -- Forgetting the field yields the narrower audience, not the wider one.
  visibility text not null default 'friends',
  created_at timestamptz not null default now(),

  constraint rides_resort_format check (
    resort = btrim(resort) and char_length(resort) between 2 and 60
  ),
  constraint rides_city_value check (city in ('innsbruck', 'salzburg')),
  constraint rides_ability_level_value check (
    ability_level in ('chill', 'park', 'off-piste')
  ),
  constraint rides_meet_point_format check (
    meet_point = btrim(meet_point) and char_length(meet_point) between 2 and 120
  ),
  constraint rides_total_spots_range check (total_spots between 1 and 50),
  constraint rides_caption_length check (
    caption is null or char_length(caption) <= 280
  ),
  constraint rides_title_format check (
    title is null or (title = btrim(title) and char_length(title) between 3 and 60)
  ),
  constraint rides_visibility_value check (visibility in ('friends', 'public'))
);

create index rides_host_idx on public.rides (host_id);
create index rides_date_idx on public.rides (ride_date);

create table public.ride_participants (
  ride_id uuid not null references public.rides (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),

  primary key (ride_id, user_id)
);

create index ride_participants_user_idx on public.ride_participants (user_id);

alter table public.rides enable row level security;
alter table public.rides force row level security;
alter table public.ride_participants enable row level security;
alter table public.ride_participants force row level security;

revoke all on table public.rides from public, anon, authenticated;
revoke all on table public.ride_participants from public, anon, authenticated;

-- Posting: the host is always the caller (default plus policy), and
-- host_id is not in the insert grant.
grant insert (
  resort,
  city,
  ability_level,
  ride_date,
  meet_time,
  meet_point,
  total_spots,
  caption,
  title,
  visibility
) on table public.rides to authenticated;

create policy "rides_insert_as_self"
  on public.rides
  for insert
  to authenticated
  with check ((select auth.uid()) = host_id);


-- Rule 3: a minor can never host a public ride. A trigger rather than a
-- policy, so it also holds for server-side writes that bypass RLS.
create or replace function private.enforce_ride_host_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.visibility = 'public' and exists (
    select 1 from public.profiles p where p.id = new.host_id and p.is_minor
  ) then
    raise exception 'minors cannot host public rides'
      using errcode = '23514';
  end if;

  if new.visibility = 'friends' then
    new.title = null;
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_ride_host_rules() from public, anon, authenticated;

create trigger rides_enforce_host_rules
  before insert or update on public.rides
  for each row
  execute function private.enforce_ride_host_rules();

-- Who may see that a ride exists (resort level, no meeting point).
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
    or exists (
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
    or (ride.visibility = 'public' and not host_is_minor);
$$;

-- Who may see the exact meeting point (rules 1 and 2).
create or replace function private.can_see_meet_point(viewer uuid, ride public.rides)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    viewer = ride.host_id
    or exists (
      select 1 from public.ride_participants rp
      where rp.ride_id = ride.id and rp.user_id = viewer
    )
    -- On a public ride friendship alone does not unlock it; only joining.
    or (ride.visibility = 'friends' and private.are_friends(viewer, ride.host_id));
$$;

revoke all on function private.can_see_ride(uuid, public.rides, boolean) from public, anon, authenticated;
revoke all on function private.can_see_meet_point(uuid, public.rides) from public, anon, authenticated;

-- The single read path for rides. meet_point is null unless the caller
-- may see it, so it never reaches a client that should not have it.
create or replace function public.list_rides(include_past boolean default false)
returns table (
  id uuid,
  host_id uuid,
  host_display_name text,
  host_handle text,
  host_is_minor boolean,
  resort text,
  city text,
  ability_level text,
  ride_date date,
  meet_time time,
  meet_point text,
  meet_point_locked boolean,
  total_spots smallint,
  taken_spots integer,
  caption text,
  title text,
  visibility text,
  created_at timestamptz,
  is_host boolean,
  is_joined boolean,
  participants jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  viewer uuid := auth.uid();
begin
  if viewer is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  return query
  select
    r.id,
    r.host_id,
    p.display_name,
    p.handle,
    p.is_minor,
    r.resort,
    r.city,
    r.ability_level,
    r.ride_date,
    r.meet_time,
    case when unlocked.ok then r.meet_point end,
    not unlocked.ok,
    r.total_spots,
    coalesce(cardinality(parts.ids), 0),
    r.caption,
    r.title,
    r.visibility,
    r.created_at,
    r.host_id = viewer,
    viewer = any(coalesce(parts.ids, '{}')),
    -- Who else is going is inside information, like the meeting point:
    -- people who cannot see the meeting point only get the count.
    case when unlocked.ok then coalesce(parts.people, '[]'::jsonb) else '[]'::jsonb end
  from public.rides r
  join public.profiles p on p.id = r.host_id
  left join lateral (
    select
      array_agg(rp.user_id order by rp.joined_at) as ids,
      jsonb_agg(
        jsonb_build_object(
          'id', pp.id,
          'display_name', pp.display_name,
          'handle', pp.handle
        )
        order by rp.joined_at
      ) as people
    from public.ride_participants rp
    join public.profiles pp on pp.id = rp.user_id
    where rp.ride_id = r.id
  ) parts on true
  cross join lateral (
    select private.can_see_meet_point(viewer, r) as ok
  ) unlocked
  where (include_past or r.ride_date >= current_date)
    and private.can_see_ride(viewer, r, p.is_minor)
  order by r.ride_date, r.meet_time;
end;
$$;

-- Rule 4: capacity is checked under a row lock, so two concurrent joins
-- cannot both take the last spot.
create or replace function public.join_ride(target_ride uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := auth.uid();
  ride public.rides;
  host_is_minor boolean;
  taken integer;
begin
  if viewer is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select * into ride from public.rides r where r.id = target_ride for update;

  if not found then
    return 'not_found';
  end if;

  select p.is_minor into host_is_minor from public.profiles p where p.id = ride.host_id;

  if not private.can_see_ride(viewer, ride, host_is_minor) then
    return 'not_found';
  end if;

  if ride.host_id = viewer then
    return 'host';
  end if;

  if ride.ride_date < current_date then
    return 'past';
  end if;

  if exists (
    select 1 from public.ride_participants rp
    where rp.ride_id = target_ride and rp.user_id = viewer
  ) then
    return 'already_joined';
  end if;

  select count(*) into taken from public.ride_participants rp where rp.ride_id = target_ride;

  if taken >= ride.total_spots then
    return 'full';
  end if;

  insert into public.ride_participants (ride_id, user_id) values (target_ride, viewer);
  return 'joined';
end;
$$;

create or replace function public.leave_ride(target_ride uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  delete from public.ride_participants rp
  where rp.ride_id = target_ride and rp.user_id = auth.uid();

  return found;
end;
$$;

-- Only the host can cancel a ride; participants go with it.
create or replace function public.cancel_ride(target_ride uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  delete from public.rides r
  where r.id = target_ride and r.host_id = auth.uid();

  return found;
end;
$$;

revoke all on function public.leave_ride(uuid) from public, anon;
revoke all on function public.cancel_ride(uuid) from public, anon;
grant execute on function public.leave_ride(uuid) to authenticated;
grant execute on function public.cancel_ride(uuid) to authenticated;
revoke all on function public.list_rides(boolean) from public, anon;
revoke all on function public.join_ride(uuid) from public, anon;
grant execute on function public.list_rides(boolean) to authenticated;
grant execute on function public.join_ride(uuid) to authenticated;
