-- Safety fixes from the team review of 2026-10-07 (docs/qa/TEAM_REVIEW.md,
-- ADR 0034). Applied migrations stay untouched; the functions below
-- replace their earlier definitions.

-- ── 1. Word filter: invisible characters and spaced letters ─────────
-- "ne<zero-width space>ger" and "k y s" slipped through. Format
-- characters (soft hyphen, zero-width space/joiners, bidi marks, word
-- joiner, byte-order mark) are removed, and runs of single letters
-- separated by spaces are joined (also before punctuation, "k y s."),
-- before the terms are matched.
create or replace function private.normalize_for_filter(input text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(
    regexp_replace(
      translate(
        lower(regexp_replace(input, '[­​-‏‪-‮⁠-⁤⁦-⁩﻿]', '', 'g')),
        '013457@$!', 'oieastasi'),
      '\s+', ' ', 'g'),
    '(?<=(^|\W)\w) (?=\w(\W|$))', '', 'g');
$$;

revoke all on function private.normalize_for_filter(text) from public, anon, authenticated;

-- ── 2. Friend requests: declines lead to a growing pause ────────────
-- Owner decision 2026-10-07: no age gate on requests; instead, after two
-- declines by the same person the asker waits 7 days, then 14, then 28,
-- and after five declines can no longer ask that person. A withdrawal by
-- the asker never counts. Only the database reads this record.
create table private.friend_request_declines (
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  declines integer not null default 1 check (declines > 0),
  last_declined_at timestamptz not null default now(),
  primary key (requester_id, addressee_id)
);

alter table private.friend_request_declines enable row level security;
revoke all on table private.friend_request_declines from public, anon, authenticated;

-- Either side may decline a request, withdraw it, or end a friendship.
-- Only the addressee turning down a pending request is a decline.
create or replace function public.remove_friendship(other uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed public.friendships;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  delete from public.friendships f
  where least(f.requester_id, f.addressee_id) = least(auth.uid(), other)
    and greatest(f.requester_id, f.addressee_id) = greatest(auth.uid(), other)
  returning * into removed;

  if removed.requester_id is null then
    return false;
  end if;

  if removed.status = 'pending' and removed.addressee_id = auth.uid() then
    insert into private.friend_request_declines (requester_id, addressee_id)
    values (removed.requester_id, removed.addressee_id)
    on conflict (requester_id, addressee_id) do update
      set declines = private.friend_request_declines.declines + 1,
          last_declined_at = now();
  end if;

  return true;
end;
$$;

revoke all on function public.remove_friendship(uuid) from public, anon;
grant execute on function public.remove_friendship(uuid) to authenticated;

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
  declined private.friend_request_declines;
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

  select * into declined
  from private.friend_request_declines d
  where d.requester_id = me and d.addressee_id = target;

  if found then
    if declined.declines >= 5 then
      return 'declined_often';
    end if;
    if declined.declines >= 2
       and declined.last_declined_at > now() - interval '7 days' * power(2, declined.declines - 2) then
      return 'cooling_down';
    end if;
  end if;

  insert into public.friendships (requester_id, addressee_id)
  values (me, target);

  return 'requested';
end;
$$;

revoke all on function public.request_friendship(text) from public, anon;
grant execute on function public.request_friendship(text) to authenticated;

-- ── 3. A reported post is held ──────────────────────────────────────
-- Owner decision 2026-10-07 (App Store 1.2, no external screening): a
-- post someone reports disappears for that person at once, and for
-- everyone once two different people have reported it, until the
-- operator reviews it (status 'reviewed' brings it back). The author
-- keeps seeing it.
alter table public.reports
  add column post_id uuid references public.posts (id) on delete set null;

-- One open report per person and post: a person counts once towards a
-- hold, even after deleting their account (reporter_id becomes null).
create unique index reports_post_open on public.reports (post_id, reporter_id)
  where post_id is not null and status = 'open';

create or replace function private.post_is_held(p_id uuid, viewer uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.reports r
    where r.post_id = p_id and r.status = 'open' and r.reporter_id = viewer
  ) or (
    -- A report whose author deleted their account keeps counting: the
    -- hold must not lift without a review.
    select count(distinct coalesce(r.reporter_id::text, r.id::text)) from public.reports r
    where r.post_id = p_id and r.status = 'open'
  ) >= 2;
$$;

revoke all on function private.post_is_held(uuid, uuid) from public, anon, authenticated;

drop function public.report_user(uuid, text, text, uuid, boolean);

create function public.report_user(
  target uuid,
  reason text,
  details text default null,
  ride uuid default null,
  also_block boolean default false,
  post uuid default null
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

  -- The same post reported again by the same person adds nothing.
  if post is not null and exists (
    select 1 from public.reports r
    where r.post_id = post and r.reporter_id = me and r.status = 'open'
  ) then
    if also_block then
      perform public.block_user(target);
    end if;
    return 'reported';
  end if;

  -- Two reports of the same post at once both pass the check above; the
  -- unique index stops the second, and the requested block still runs.
  begin
    insert into public.reports (reporter_id, reported_user_id, reported_handle, ride_id, post_id, reason, details)
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
      -- Only a post by the reported person that the reporter can see.
      case when exists (
        select 1 from public.posts p
        where p.id = post and p.author_id = target and private.can_see_posts_of(p.author_id, me)
      ) then post end,
      reason,
      nullif(btrim(coalesce(details, '')), '')
    );
  exception when unique_violation then
    null;
  end;

  if also_block then
    perform public.block_user(target);
  end if;

  return 'reported';
end;
$$;

revoke all on function public.report_user(uuid, text, text, uuid, boolean, uuid) from public, anon;
grant execute on function public.report_user(uuid, text, text, uuid, boolean, uuid) to authenticated;

create or replace function public.list_post_feed(before timestamptz default null, only_mine boolean default false)
returns table (
  id uuid,
  author_id uuid,
  author_name text,
  author_handle text,
  body text,
  resort text,
  has_photo boolean,
  created_at timestamptz,
  is_mine boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.author_id, a.display_name, a.handle, p.body, p.resort, p.photo_path is not null, p.created_at,
         p.author_id = auth.uid()
  from public.posts p
  join public.profiles a on a.id = p.author_id
  where auth.uid() is not null
    and private.can_see_posts_of(p.author_id, auth.uid())
    and (p.author_id = auth.uid() or not private.post_is_held(p.id, auth.uid()))
    and (not only_mine or p.author_id = auth.uid())
    and (before is null or p.created_at < before)
  order by p.created_at desc
  limit 30;
$$;

create or replace function public.post_photo_path_for(p_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.photo_path from public.posts p
  where p.id = p_id
    and private.can_see_posts_of(p.author_id, auth.uid())
    and (p.author_id = auth.uid() or not private.post_is_held(p.id, auth.uid()));
$$;

-- An owner's unsubmitted photo remains manageable by them, but a friend
-- cannot fetch an upload unless a currently visible, unheld post
-- references it.
create or replace function public.can_see_post_photo(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (storage.foldername(object_name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then (storage.foldername(object_name))[1] = auth.uid()::text
      or exists (
        select 1 from public.posts p
        where p.photo_path = object_name
          and private.can_see_posts_of(p.author_id, auth.uid())
          and not private.post_is_held(p.id, auth.uid())
      )
    else false
  end;
$$;

revoke all on function public.list_post_feed(timestamptz, boolean) from public, anon;
revoke all on function public.post_photo_path_for(uuid) from public, anon;
revoke all on function public.can_see_post_photo(text) from public, anon;
grant execute on function public.list_post_feed(timestamptz, boolean) to authenticated;
grant execute on function public.post_photo_path_for(uuid) to authenticated;
grant execute on function public.can_see_post_photo(text) to authenticated;

-- ── 4. Row-level security on the push queue ─────────────────────────
-- Defence in depth: no client role has a grant, and with RLS on and no
-- policy a grant added by mistake still returns nothing. Not forced,
-- because the security-definer functions that own the queue rely on
-- their owner's rights.
alter table private.push_outbox enable row level security;

-- ── 5. Leaderboard: hidden minors are not ordered by name ───────────
-- Equal totals used to be sorted by display_name, which leaked the
-- alphabetical order of anonymous minors on the regional board.
create or replace function public.leaderboard(scope text, metric text)
returns table (
  rank integer,
  user_id uuid,
  display_name text,
  handle text,
  value numeric,
  is_me boolean,
  anonymous boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  my_city text;
begin
  if me is null or scope not in ('friends', 'region') or metric not in ('vertical', 'distance', 'days', 'speed') then
    return;
  end if;

  select p.city into my_city from public.profiles p where p.id = me;

  return query
  with members as (
    select p.id, p.display_name, p.handle, p.is_minor
    from public.profiles p
    where (
      scope = 'friends' and (
        p.id = me
        or (p.leaderboard_friends and private.are_friends(p.id, me) and not private.is_blocked(p.id, me))
      )
    ) or (
      scope = 'region' and my_city is not null and p.city = my_city and p.leaderboard_region
      and (p.id = me or not private.is_blocked(p.id, me))
    )
  ),
  totals as (
    select m.id, m.display_name, m.handle, m.is_minor,
      case metric
        when 'vertical' then sum(d.vertical_m)::numeric
        when 'distance' then sum(d.distance_m)::numeric
        when 'days' then count(*)::numeric
        else max(d.max_speed_kmh)
      end as total
    from members m
    join public.ski_days d on d.user_id = m.id and d.started_at >= private.season_start()
    group by m.id, m.display_name, m.handle, m.is_minor
  ),
  ranked as (
    select (rank() over (order by t.total desc))::int as position, t.*,
      not (t.id = me or not (scope = 'region' and t.is_minor)) as hidden
    from totals t
  )
  select r.position,
    case when not r.hidden then r.id end,
    case when not r.hidden then r.display_name end,
    case when not r.hidden then r.handle end,
    r.total,
    r.id = me,
    r.hidden
  from ranked r
  where r.position <= 20 or r.id = me
  order by r.position, r.hidden, case when not r.hidden then r.display_name end nulls last, md5(r.id::text);
end;
$$;

revoke all on function public.leaderboard(text, text) from public, anon;
grant execute on function public.leaderboard(text, text) to authenticated;
