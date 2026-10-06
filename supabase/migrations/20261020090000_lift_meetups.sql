-- Short-lived lift meetup estimates. Only the rider and confirmed friends
-- can read the current status; a block or age change closes access immediately.
-- The viewer's coordinates and route are never sent to this table.
-- Visibility ends exactly 30 minutes after start. Expired rows are purged
-- on the next start/read; without a later request, physical deletion waits
-- until account deletion. This mirrors live-location housekeeping.

-- Kept in sync with the reviewed reference data in lib/lifts.ts. A direct RPC
-- caller cannot invent a resort/lift pair that the app does not support.
create table private.lift_meetup_lifts (
  resort text not null,
  lift_id text not null,
  duration_minutes numeric(12, 9) not null check (duration_minutes > 0 and duration_minutes <= 60),
  primary key (resort, lift_id)
);
insert into private.lift_meetup_lifts (resort, lift_id, duration_minutes) values
  ('Stubai Glacier', 'osm-way-26531292', 4.3),
  ('Stubai Glacier', 'osm-way-27174768', 8.3),
  ('Stubai Glacier', 'osm-way-27174767', 5),
  ('Stubai Glacier', 'osm-way-447819757', 6),
  ('Nordkette', 'osm-way-25170582', 5.33),
  ('Nordkette', 'osm-way-25282282', 2),
  ('Nordkette', 'osm-way-25750412', 5.16667),
  ('Axamer Lizum', 'osm-way-1064844583', 6),
  ('Axamer Lizum', 'osm-way-1526166177', 6),
  ('Axamer Lizum', 'osm-way-25298607', 7),
  ('Axamer Lizum', 'osm-way-144280300', 7),
  ('Schlick 2000', 'osm-way-1214995327', 4),
  ('Schlick 2000', 'osm-way-26506233', 15),
  ('Schlick 2000', 'osm-way-29263441', 3.66667),
  ('Schlick 2000', 'osm-way-29262933', 8.5),
  ('Kühtai', 'osm-way-23362765', 6),
  ('Kühtai', 'osm-way-23362775', 14),
  ('Kühtai', 'osm-way-37126033', 6),
  ('Kühtai', 'osm-way-23362764', 12),
  ('Glungezer', 'osm-way-842247153', 9),
  ('Glungezer', 'osm-way-54302055', 9),
  ('Patscherkofel', 'osm-way-485884144', 10),
  ('Patscherkofel', 'osm-way-293962729', 2),
  ('Bergeralm', 'osm-way-22715771', 4),
  ('Bergeralm', 'osm-way-22715772', 7),
  ('Bergeralm', 'osm-way-22715773', 6),
  ('Rangger Köpfl', 'osm-way-26698910', 5),
  ('Rangger Köpfl', 'osm-way-26698926', 5),
  ('Rangger Köpfl', 'osm-way-26698984', 5),
  ('Hochoetz', 'osm-way-27755623', 9),
  ('Hochoetz', 'osm-way-93716244', 9),
  ('Hochoetz', 'osm-way-30816523', 5),
  ('Mutterer Alm', 'osm-way-26746748', 10),
  ('Serlesbahnen Mieders', 'osm-way-26779051', 7),
  ('Serlesbahnen Mieders', 'osm-way-29284858', 2),
  ('Serlesbahnen Mieders', 'osm-way-29284449', 8),
  ('Sölden', 'osm-way-29330800', 8.87),
  ('Sölden', 'osm-way-30816314', 6.67),
  ('Sölden', 'osm-way-24189367', 7.5),
  ('Sölden', 'osm-way-30816315', 5.5),
  ('Saalbach-Hinterglemm', 'osm-way-91739594', 4.5),
  ('Saalbach-Hinterglemm', 'osm-way-29877382', 6),
  ('Saalbach-Hinterglemm', 'osm-way-989835855', 3.5),
  ('Saalbach-Hinterglemm', 'osm-way-143200349', 5.7),
  ('Flachau', 'osm-way-23149679', 10),
  ('Flachau', 'osm-way-30745873', 10),
  ('Flachau', 'osm-way-23149659', 13),
  ('Kitzsteinhorn', 'osm-way-673539309', 9),
  ('Kitzsteinhorn', 'osm-way-15503046', 9),
  ('Kitzsteinhorn', 'osm-way-14498567', 4),
  ('Zell am See', 'osm-way-104403103', 6),
  ('Zell am See', 'osm-way-30473147', 8.95),
  ('Zell am See', 'osm-way-5213151', 6),
  ('Wagrain', 'osm-way-1551817347', 3),
  ('Wagrain', 'osm-way-23149574', 4),
  ('Bad Gastein', 'osm-way-187714641', 6),
  ('Bad Gastein', 'osm-way-448912800', 5),
  ('Bad Gastein', 'osm-way-443576005', 7),
  ('Hochkönig', 'osm-way-30783688', 5.33333),
  ('Hochkönig', 'osm-way-30783686', 5.66667),
  ('Hochkönig', 'osm-way-698595419', 4.83333);
alter table private.lift_meetup_lifts enable row level security;
alter table private.lift_meetup_lifts force row level security;
-- The reference IDs are public facts, but the schema and grants keep the
-- table out of client access. This SELECT policy permits the definer RPC to
-- verify IDs even when FORCE RLS also applies to its owner.
create policy lift_meetup_lifts_read on private.lift_meetup_lifts
  for select using (true);
revoke all on table private.lift_meetup_lifts from public, anon, authenticated;

create table public.lift_meetups (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  resort text not null,
  lift_id text not null,
  started_at timestamptz not null default now(),
  arrival_at timestamptz not null,
  expires_at timestamptz not null,
  constraint lift_meetups_known_lift foreign key (resort, lift_id)
    references private.lift_meetup_lifts (resort, lift_id),
  constraint lift_meetups_time_window check (
    arrival_at > started_at and arrival_at <= started_at + interval '30 minutes'
    and expires_at > started_at and expires_at <= started_at + interval '30 minutes'
  )
);

create index lift_meetups_expires on public.lift_meetups (expires_at);
alter table public.lift_meetups enable row level security;
alter table public.lift_meetups force row level security;
revoke all on table public.lift_meetups from public, anon, authenticated;

-- Same default queue heuristic as features/lift-meetup/estimate.ts. The
-- database has no verified holiday calendar or new-snow input, so both
-- optional modifiers are zero for status sharing.
create or replace function private.lift_meetup_wait_minutes(p_at timestamptz)
returns integer
language sql
stable
set search_path = ''
as $$
  select (case
    when extract(hour from p_at at time zone 'Europe/Vienna') between 8 and 10 then 4
    when extract(hour from p_at at time zone 'Europe/Vienna') between 11 and 13 then 2
    else 1
  end + case when extract(isodow from p_at at time zone 'Europe/Vienna') in (6, 7) then 6 else 0 end)::integer;
$$;
revoke all on function private.lift_meetup_wait_minutes(timestamptz) from public, anon, authenticated;

-- No caller-supplied identity, start time, ETA, coordinates or wait time.
create or replace function public.start_my_lift_meetup(p_resort text, p_lift_id text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  duration numeric;
  started timestamptz := now();
  estimated_arrival timestamptz;
begin
  if me is null then
    return 'unauthenticated';
  end if;
  if not exists (select 1 from public.profiles p where p.id = me and p.onboarding_completed) then
    return 'profile_incomplete';
  end if;
  if not private.may_share_location(me) then
    delete from public.lift_meetups where user_id = me;
    return 'too_young';
  end if;
  if p_resort is null or p_lift_id is null
     or char_length(p_resort) not between 2 and 60
     or char_length(p_lift_id) not between 1 and 100 then
    return 'invalid';
  end if;

  select l.duration_minutes into duration
  from private.lift_meetup_lifts l
  where l.resort = p_resort and l.lift_id = p_lift_id;
  if duration is null then
    return 'invalid';
  end if;

  -- Match JS Math.round of positive (wait + duration) milliseconds.
  estimated_arrival := started + round((private.lift_meetup_wait_minutes(started) + duration) * 60000)::double precision
    * interval '1 millisecond';
  insert into public.lift_meetups (user_id, resort, lift_id, started_at, arrival_at, expires_at)
  values (me, p_resort, p_lift_id, started, estimated_arrival, started + interval '30 minutes')
  on conflict (user_id) do update
    set resort = excluded.resort,
        lift_id = excluded.lift_id,
        started_at = excluded.started_at,
        arrival_at = excluded.arrival_at,
        expires_at = excluded.expires_at;

  delete from public.lift_meetups where expires_at <= now();
  return 'sharing';
end;
$$;

create or replace function public.stop_my_lift_meetup()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.lift_meetups where user_id = auth.uid();
$$;

create or replace function public.my_lift_meetup()
returns table (
  user_id uuid, display_name text, handle text, resort text, lift_id text,
  started_at timestamptz, arrival_at timestamptz, expires_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  delete from public.lift_meetups m where m.expires_at <= now();
  return query
    select m.user_id, p.display_name, p.handle, m.resort, m.lift_id,
           m.started_at, m.arrival_at, m.expires_at
    from public.lift_meetups m
    join public.profiles p on p.id = m.user_id
    where m.user_id = auth.uid() and m.expires_at > now()
      and private.may_share_location(m.user_id);
end;
$$;

create or replace function public.list_friend_lift_meetups()
returns table (
  user_id uuid, display_name text, handle text, resort text, lift_id text,
  started_at timestamptz, arrival_at timestamptz, expires_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  delete from public.lift_meetups m where m.expires_at <= now();
  return query
    select m.user_id, p.display_name, p.handle, m.resort, m.lift_id,
           m.started_at, m.arrival_at, m.expires_at
    from public.lift_meetups m
    join public.profiles p on p.id = m.user_id
    where auth.uid() is not null
      and m.user_id <> auth.uid()
      and m.expires_at > now()
      and private.may_share_location(m.user_id)
      and private.are_friends(auth.uid(), m.user_id)
      and not private.is_blocked(auth.uid(), m.user_id)
    order by m.started_at desc;
end;
$$;

revoke all on function public.start_my_lift_meetup(text, text) from public, anon;
revoke all on function public.stop_my_lift_meetup() from public, anon;
revoke all on function public.my_lift_meetup() from public, anon;
revoke all on function public.list_friend_lift_meetups() from public, anon;
grant execute on function public.start_my_lift_meetup(text, text) to authenticated;
grant execute on function public.stop_my_lift_meetup() to authenticated;
grant execute on function public.my_lift_meetup() to authenticated;
grant execute on function public.list_friend_lift_meetups() to authenticated;

-- The export follows the latest version (discovery swipes) and adds this status.
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
    'lift_meetup', (
      select jsonb_build_object(
        'resort', m.resort, 'lift_id', m.lift_id,
        'started_at', m.started_at, 'arrival_at', m.arrival_at, 'expires_at', m.expires_at
      )
      from public.lift_meetups m where m.user_id = me
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
    'discovery_swipes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'handle', p.handle,
        'liked', s.liked,
        'created_at', s.created_at
      ) order by s.created_at)
      from public.swipes s
      join public.profiles p on p.id = s.target_id
      where s.swiper_id = me
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
