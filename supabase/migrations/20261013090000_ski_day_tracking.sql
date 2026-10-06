-- Ski-day tracking (ADR 0026, spec ski-day-tracking).
--
-- * The phone records the GPS track and turns it into a summary: when,
--   where, distance, vertical, top speed and runs. Only that summary is
--   stored; the track itself never leaves the device.
-- * For now only the owner sees their days. Sharing (leaderboards) is a
--   separate decision.
-- * Values a skier cannot reach are refused, so later rankings are not
--   trivially gamed. At most 5 saved days per 24 hours.

create table public.ski_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  resort text,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  distance_m integer not null,
  vertical_m integer not null,
  max_speed_kmh numeric(4, 1) not null,
  runs integer not null,
  created_at timestamptz not null default now(),

  constraint ski_days_resort_length check (resort is null or char_length(resort) between 2 and 60),
  constraint ski_days_time_order check (ended_at > started_at and ended_at - started_at <= interval '16 hours'),
  constraint ski_days_distance check (distance_m between 0 and 250000),
  constraint ski_days_vertical check (vertical_m between 0 and 25000),
  constraint ski_days_speed check (max_speed_kmh between 0 and 150),
  constraint ski_days_runs check (runs between 0 and 200)
);

create index ski_days_user_time on public.ski_days (user_id, started_at desc);

alter table public.ski_days enable row level security;
alter table public.ski_days force row level security;
revoke all on table public.ski_days from public, anon, authenticated;

-- Stores the caller's summary of a finished day.
create or replace function public.save_ski_day(
  p_resort text,
  p_started_at timestamptz,
  p_ended_at timestamptz,
  p_distance_m integer,
  p_vertical_m integer,
  p_max_speed_kmh numeric,
  p_runs integer
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  recent integer;
  place text := nullif(btrim(coalesce(p_resort, '')), '');
begin
  if me is null then
    return 'unauthenticated';
  end if;

  if p_started_at is null or p_ended_at is null
     or p_started_at < now() - interval '36 hours'
     or p_ended_at > now() + interval '5 minutes'
     or p_ended_at <= p_started_at
     or p_ended_at - p_started_at > interval '16 hours'
     or p_distance_m is null or p_distance_m not between 0 and 250000
     or p_vertical_m is null or p_vertical_m not between 0 and 25000
     or p_max_speed_kmh is null or p_max_speed_kmh not between 0 and 150
     or p_runs is null or p_runs not between 0 and 200
     or (place is not null and (char_length(place) not between 2 and 60 or place ~ '[\x01-\x1f\x7f<>]')) then
    return 'invalid';
  end if;

  -- The same day twice (a double tap, a retry) is stored once.
  if exists (
    select 1 from public.ski_days d
    where d.user_id = me and d.started_at = p_started_at
  ) then
    return 'saved';
  end if;

  select count(*) into recent from public.ski_days d where d.user_id = me and d.created_at > now() - interval '1 day';
  if recent >= 5 then
    return 'rate_limited';
  end if;

  insert into public.ski_days (user_id, resort, started_at, ended_at, distance_m, vertical_m, max_speed_kmh, runs)
  values (me, place, p_started_at, p_ended_at, p_distance_m, p_vertical_m, round(p_max_speed_kmh, 1), p_runs);
  return 'saved';
end;
$$;

-- The caller's days, newest first.
create or replace function public.list_my_ski_days(max_rows integer default 60)
returns table (
  id uuid,
  resort text,
  started_at timestamptz,
  ended_at timestamptz,
  distance_m integer,
  vertical_m integer,
  max_speed_kmh numeric,
  runs integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select d.id, d.resort, d.started_at, d.ended_at, d.distance_m, d.vertical_m, d.max_speed_kmh, d.runs
  from public.ski_days d
  where d.user_id = auth.uid()
  order by d.started_at desc
  limit least(greatest(coalesce(max_rows, 60), 1), 200);
$$;

create or replace function public.delete_my_ski_day(p_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with gone as (
    delete from public.ski_days d where d.id = p_id and d.user_id = auth.uid() returning 1
  )
  select exists (select 1 from gone);
$$;

revoke all on function public.save_ski_day(text, timestamptz, timestamptz, integer, integer, numeric, integer) from public, anon;
revoke all on function public.list_my_ski_days(integer) from public, anon;
revoke all on function public.delete_my_ski_day(uuid) from public, anon;
grant execute on function public.save_ski_day(text, timestamptz, timestamptz, integer, integer, numeric, integer) to authenticated;
grant execute on function public.list_my_ski_days(integer) to authenticated;
grant execute on function public.delete_my_ski_day(uuid) to authenticated;

-- The data export lists the caller's ski days.
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
    'messages_sent', coalesce((
      select jsonb_agg(jsonb_build_object(
        'conversation_id', m.conversation_id,
        'kind', m.kind,
        'body', m.body,
        'lat', m.lat,
        'lng', m.lng,
        'created_at', m.created_at
      ) order by m.created_at)
      from public.messages m
      where m.sender_id = me
    ), '[]'::jsonb),
    'posts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'body', p.body,
        'resort', p.resort,
        'photo_path', p.photo_path,
        'created_at', p.created_at
      ) order by p.created_at)
      from public.posts p
      where p.author_id = me
    ), '[]'::jsonb),
    'ski_days', coalesce((
      select jsonb_agg(jsonb_build_object(
        'resort', d.resort,
        'started_at', d.started_at,
        'ended_at', d.ended_at,
        'distance_m', d.distance_m,
        'vertical_m', d.vertical_m,
        'max_speed_kmh', d.max_speed_kmh,
        'runs', d.runs
      ) order by d.started_at)
      from public.ski_days d
      where d.user_id = me
    ), '[]'::jsonb),
    'push_subscriptions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'push_service', split_part(substr(s.endpoint, 9), '/', 1),
        'created_at', s.created_at
      ) order by s.created_at)
      from public.push_subscriptions s
      where s.user_id = me
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
