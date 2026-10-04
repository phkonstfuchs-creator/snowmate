-- Live location for confirmed friends (ADR 0015, spec live-location).
--
-- * Off by default. A person turns sharing on for a set time (at most
--   12 hours); it ends by itself, and they can stop it any time.
-- * Only confirmed friends see it. Friends of friends, strangers and
--   blocked people never do, minors and adults alike.
-- * Only the latest position is kept, rounded to about 10 m. There is no
--   history. Stopping, expiry, blocking, unfriending and deleting the
--   account all remove it.
-- * Clients cannot read or write the table; four functions are the only
--   way in.

create table public.live_locations (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  accuracy_m integer,
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null,

  constraint live_locations_lat_range check (lat between -90 and 90),
  constraint live_locations_lng_range check (lng between -180 and 180),
  constraint live_locations_accuracy_range check (accuracy_m is null or accuracy_m between 0 and 100000),
  constraint live_locations_expiry check (expires_at > updated_at and expires_at <= updated_at + interval '12 hours 1 minute')
);

create index live_locations_expires on public.live_locations (expires_at);

alter table public.live_locations enable row level security;
alter table public.live_locations force row level security;
revoke all on table public.live_locations from public, anon, authenticated;

-- ── Share, refresh, stop ────────────────────────────────────────────

-- Returns: sharing | throttled | invalid | profile_incomplete | unauthenticated
-- p_minutes: how long sharing should last from now; null keeps the
-- current end time (a position refresh while sharing).
create or replace function public.share_my_location(
  p_lat double precision,
  p_lng double precision,
  p_accuracy integer,
  p_minutes integer
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  existing public.live_locations;
  new_expiry timestamptz;
begin
  if me is null then
    return 'unauthenticated';
  end if;

  if not exists (select 1 from public.profiles p where p.id = me and p.onboarding_completed) then
    return 'profile_incomplete';
  end if;

  if p_lat is null or p_lng is null
     or p_lat not between -90 and 90 or p_lng not between -180 and 180
     or (p_accuracy is not null and p_accuracy not between 0 and 100000)
     or (p_minutes is not null and p_minutes not between 5 and 720) then
    return 'invalid';
  end if;

  select * into existing from public.live_locations where user_id = me;

  if p_minutes is null then
    if existing.user_id is null or existing.expires_at <= now() then
      return 'invalid';
    end if;
    -- A refresh more often than every 10 s adds nothing.
    if existing.updated_at > now() - interval '10 seconds' then
      return 'throttled';
    end if;
    new_expiry := existing.expires_at;
  else
    new_expiry := now() + make_interval(mins => p_minutes);
  end if;

  insert into public.live_locations (user_id, lat, lng, accuracy_m, updated_at, expires_at)
  values (me, round(p_lat::numeric, 4)::double precision, round(p_lng::numeric, 4)::double precision,
          p_accuracy, now(), new_expiry)
  on conflict (user_id) do update
    set lat = excluded.lat,
        lng = excluded.lng,
        accuracy_m = excluded.accuracy_m,
        updated_at = excluded.updated_at,
        expires_at = excluded.expires_at;

  -- Housekeeping: nobody else's expired position is kept around either.
  delete from public.live_locations where expires_at <= now();

  return 'sharing';
end;
$$;

create or replace function public.stop_sharing_location()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.live_locations where user_id = auth.uid();
$$;

create or replace function public.my_location_sharing()
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select expires_at from public.live_locations
  where user_id = auth.uid() and expires_at > now();
$$;

-- ── Friends' positions ──────────────────────────────────────────────

create or replace function public.list_friend_locations()
returns table (
  user_id uuid,
  display_name text,
  handle text,
  lat double precision,
  lng double precision,
  accuracy_m integer,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select l.user_id, p.display_name, p.handle, l.lat, l.lng, l.accuracy_m, l.updated_at
  from public.live_locations l
  join public.profiles p on p.id = l.user_id
  join public.friendships f
    on f.status = 'accepted'
   and ((f.requester_id = auth.uid() and f.addressee_id = l.user_id)
     or (f.addressee_id = auth.uid() and f.requester_id = l.user_id))
  where auth.uid() is not null
    and l.user_id <> auth.uid()
    and l.expires_at > now()
    and not private.is_blocked(auth.uid(), l.user_id)
  order by l.updated_at desc;
$$;

revoke all on function public.share_my_location(double precision, double precision, integer, integer) from public, anon;
revoke all on function public.stop_sharing_location() from public, anon;
revoke all on function public.my_location_sharing() from public, anon;
revoke all on function public.list_friend_locations() from public, anon;
grant execute on function public.share_my_location(double precision, double precision, integer, integer) to authenticated;
grant execute on function public.stop_sharing_location() to authenticated;
grant execute on function public.my_location_sharing() to authenticated;
grant execute on function public.list_friend_locations() to authenticated;

-- ── Data export includes the live position ──────────────────────────

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
    'live_location', (
      select jsonb_build_object('lat', l.lat, 'lng', l.lng, 'accuracy_m', l.accuracy_m,
                                'updated_at', l.updated_at, 'expires_at', l.expires_at)
      from public.live_locations l where l.user_id = me
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
