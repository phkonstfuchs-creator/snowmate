create table public.resort_presence (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  resort_id text not null references public.resorts (id),
  audience text not null default 'friends',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint resort_presence_audience_value check (
    audience in ('friends', 'friends-of-friends')
  ),
  constraint resort_presence_timestamp_order check (
    last_seen_at >= first_seen_at
  )
);

create index resort_presence_resort_last_seen
  on public.resort_presence (resort_id, last_seen_at desc);
create index resort_presence_retention
  on public.resort_presence (last_seen_at);

create table private.location_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  resort_id text not null references public.resorts (id),
  audience text not null default 'friends',
  ride_id uuid references public.rides (id) on delete set null,
  foreground_only boolean not null default true,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  stopped_at timestamptz,
  last_heartbeat_at timestamptz,
  constraint location_sessions_audience_value check (
    audience in ('friends', 'friends-of-friends')
  ),
  constraint location_sessions_foreground_only check (foreground_only),
  constraint location_sessions_lifetime check (
    expires_at >= started_at + interval '1 hour'
    and expires_at <= started_at + interval '8 hours'
  ),
  constraint location_sessions_stop_after_start check (
    stopped_at is null or stopped_at >= started_at
  ),
  constraint location_sessions_heartbeat_after_start check (
    last_heartbeat_at is null or last_heartbeat_at >= started_at
  )
);

create unique index location_sessions_one_open_per_owner
  on private.location_sessions (owner_id)
  where stopped_at is null;
create index location_sessions_expiry
  on private.location_sessions (expires_at);
create index location_sessions_ride
  on private.location_sessions (ride_id)
  where ride_id is not null and stopped_at is null;

create table private.live_locations (
  session_id uuid primary key
    references private.location_sessions (id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  accuracy_meters double precision not null,
  observed_at timestamptz not null,
  received_at timestamptz not null default now(),
  constraint live_locations_latitude_range check (
    latitude between -90 and 90
  ),
  constraint live_locations_longitude_range check (
    longitude between -180 and 180
  ),
  constraint live_locations_accuracy_range check (
    accuracy_meters > 0 and accuracy_meters <= 1000
  )
);

create index live_locations_observed_at
  on private.live_locations (observed_at);

alter table public.resort_presence enable row level security;
alter table public.resort_presence force row level security;
alter table private.location_sessions enable row level security;
alter table private.location_sessions force row level security;
alter table private.live_locations enable row level security;
alter table private.live_locations force row level security;

revoke all on table public.resort_presence
  from public, anon, authenticated, service_role;
revoke all on table private.location_sessions
  from public, anon, authenticated, service_role;
revoke all on table private.live_locations
  from public, anon, authenticated, service_role;

create or replace function private.can_view_resort_presence(
  p_viewer_id uuid,
  p_owner_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.resort_presence as presence
    where presence.user_id = p_owner_id
      and presence.last_seen_at >= now() - interval '24 hours'
      and private.can_account_use_core(p_viewer_id)
      and private.can_account_use_core(p_owner_id)
      and not private.is_blocked_between(p_viewer_id, p_owner_id)
      and (
        p_viewer_id = p_owner_id
        or private.are_friends(p_viewer_id, p_owner_id)
        or (
          presence.audience = 'friends-of-friends'
          and not private.is_minor_account(p_viewer_id)
          and not private.is_minor_account(p_owner_id)
          and private.are_friends_of_friends(p_viewer_id, p_owner_id)
        )
      )
  );
$$;

create or replace function private.can_view_live_location(
  p_viewer_id uuid,
  p_session_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.location_sessions as session
    join private.live_locations as location
      on location.session_id = session.id
    where session.id = p_session_id
      and session.foreground_only
      and session.stopped_at is null
      and session.expires_at > now()
      and session.last_heartbeat_at >= now() - interval '5 minutes'
      and location.observed_at >= now() - interval '5 minutes'
      and private.can_account_use_core(p_viewer_id)
      and private.can_account_use_core(session.owner_id)
      and not private.is_blocked_between(p_viewer_id, session.owner_id)
      and (
        p_viewer_id = session.owner_id
        or private.are_friends(p_viewer_id, session.owner_id)
        or (
          session.ride_id is not null
          and not private.is_minor_account(p_viewer_id)
          and not private.is_minor_account(session.owner_id)
          and private.is_ride_member(session.ride_id, p_viewer_id)
          and private.is_ride_member(session.ride_id, session.owner_id)
          and exists (
            select 1
            from public.rides as ride
            where ride.id = session.ride_id
              and ride.status in ('scheduled', 'active')
          )
        )
      )
  );
$$;

revoke all on function private.can_view_resort_presence(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.can_view_live_location(uuid, uuid)
  from public, anon, authenticated, service_role;

create or replace function public.start_location_session(
  p_resort_id text,
  p_audience text,
  p_ride_id uuid,
  p_foreground_only boolean,
  p_idempotency_key uuid,
  p_duration_hours integer default 4
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  session_id uuid;
  current_time timestamptz := statement_timestamp();
  request_hash text;
  stored_request_hash text;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_idempotency_key is null then
    raise exception using errcode = '22004', message = 'idempotency key required';
  end if;

  request_hash := private.command_request_hash(
    pg_catalog.jsonb_build_object(
      'resort_id', p_resort_id,
      'audience', p_audience,
      'ride_id', p_ride_id,
      'foreground_only', p_foreground_only,
      'duration_hours', p_duration_hours
    )
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('location:' || current_user_id::text, 0)
  );

  select resource_id, command_receipts.request_hash
  into session_id, stored_request_hash
  from private.command_receipts
  where user_id = current_user_id
    and command_name = 'start_location_session'
    and idempotency_key = p_idempotency_key;
  if found then
    if stored_request_hash is distinct from request_hash then
      raise exception using
        errcode = '22023',
        message = 'idempotency key was already used for a different request';
    end if;
    return session_id;
  end if;

  perform private.consume_command_rate_limit(
    current_user_id, 'start_location_session', 20, interval '1 day'
  );

  if p_foreground_only is distinct from true then
    raise exception using
      errcode = '23514',
      message = 'location sessions must be foreground-only';
  end if;
  if p_audience is null
    or p_audience not in ('friends', 'friends-of-friends')
  then
    raise exception using errcode = '23514', message = 'invalid location audience';
  end if;
  if p_duration_hours is null or p_duration_hours not between 1 and 8 then
    raise exception using
      errcode = '23514',
      message = 'location duration must be between one and eight hours';
  end if;
  if not exists (
    select 1
    from public.profiles
    where id = current_user_id and onboarding_completed
  ) then
    raise exception using errcode = '42501', message = 'completed profile required';
  end if;
  if not exists (
    select 1
    from public.resorts
    where id = p_resort_id and is_active
  ) then
    raise exception using errcode = '23503', message = 'resort unavailable';
  end if;
  if private.is_minor_account(current_user_id)
    and p_audience <> 'friends'
  then
    raise exception using
      errcode = '23514',
      message = 'minor location presence is friends-only';
  end if;
  if p_ride_id is not null and not exists (
    select 1
    from public.rides as ride
    where ride.id = p_ride_id
      and ride.resort_id = p_resort_id
      and ride.status in ('scheduled', 'active')
      and private.is_ride_member(ride.id, current_user_id)
  ) then
    raise exception using
      errcode = '42501',
      message = 'accepted ride membership required';
  end if;

  delete from private.live_locations as location
  using private.location_sessions as prior_session
  where location.session_id = prior_session.id
    and prior_session.owner_id = current_user_id
    and prior_session.stopped_at is null;

  update private.location_sessions
  set stopped_at = current_time
  where owner_id = current_user_id and stopped_at is null;

  insert into private.location_sessions (
    owner_id,
    resort_id,
    audience,
    ride_id,
    foreground_only,
    started_at,
    expires_at
  ) values (
    current_user_id,
    p_resort_id,
    p_audience,
    p_ride_id,
    true,
    current_time,
    current_time + (p_duration_hours * interval '1 hour')
  ) returning id into session_id;

  insert into public.resort_presence as existing (
    user_id,
    resort_id,
    audience,
    first_seen_at,
    last_seen_at
  ) values (
    current_user_id,
    p_resort_id,
    p_audience,
    current_time,
    current_time
  )
  on conflict (user_id) do update
  set
    resort_id = excluded.resort_id,
    audience = excluded.audience,
    first_seen_at = case
      when existing.resort_id is distinct from excluded.resort_id
        then excluded.first_seen_at
      else existing.first_seen_at
    end,
    last_seen_at = excluded.last_seen_at;

  insert into private.command_receipts (
    user_id,
    command_name,
    idempotency_key,
    resource_id,
    request_hash
  ) values (
    current_user_id,
    'start_location_session',
    p_idempotency_key,
    session_id,
    request_hash
  );

  return session_id;
end;
$$;

create or replace function public.publish_location(
  p_session_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_meters double precision,
  p_observed_at timestamptz,
  p_is_foreground boolean,
  p_idempotency_key uuid
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_session private.location_sessions%rowtype;
  prior_resource_id uuid;
  current_time timestamptz := statement_timestamp();
  request_hash text;
  stored_request_hash text;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_idempotency_key is null then
    raise exception using errcode = '22004', message = 'idempotency key required';
  end if;

  request_hash := private.command_request_hash(
    pg_catalog.jsonb_build_object(
      'session_id', p_session_id,
      'latitude', p_latitude,
      'longitude', p_longitude,
      'accuracy_meters', p_accuracy_meters,
      'observed_at', p_observed_at,
      'is_foreground', p_is_foreground
    )
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('location:' || current_user_id::text, 0)
  );

  select resource_id, command_receipts.request_hash
  into prior_resource_id, stored_request_hash
  from private.command_receipts
  where user_id = current_user_id
    and command_name = 'publish_location'
    and idempotency_key = p_idempotency_key;
  if found then
    if stored_request_hash is distinct from request_hash then
      raise exception using
        errcode = '22023',
        message = 'idempotency key was already used for a different request';
    end if;
    return prior_resource_id;
  end if;

  perform private.consume_command_rate_limit(
    current_user_id, 'publish_location', 120, interval '1 minute'
  );

  select session.* into current_session
  from private.location_sessions as session
  where session.id = p_session_id
    and session.owner_id = current_user_id
  for update;

  if not found then
    raise exception using errcode = '42501', message = 'location session unavailable';
  end if;
  if current_session.stopped_at is not null
    or current_session.expires_at <= current_time
  then
    raise exception using errcode = '23514', message = 'location session is inactive';
  end if;
  if p_is_foreground is distinct from true
    or not current_session.foreground_only
  then
    raise exception using
      errcode = '23514',
      message = 'background location publishing is not allowed';
  end if;
  if p_latitude is null or p_latitude not between -90 and 90 then
    raise exception using errcode = '23514', message = 'invalid latitude';
  end if;
  if p_longitude is null or p_longitude not between -180 and 180 then
    raise exception using errcode = '23514', message = 'invalid longitude';
  end if;
  if p_accuracy_meters is null
    or p_accuracy_meters <= 0
    or p_accuracy_meters > 1000
  then
    raise exception using errcode = '23514', message = 'invalid location accuracy';
  end if;
  if p_observed_at is null
    or p_observed_at < current_time - interval '120 seconds'
    or p_observed_at > current_time + interval '30 seconds'
  then
    raise exception using errcode = '23514', message = 'invalid observation time';
  end if;

  insert into private.live_locations as current_location (
    session_id,
    latitude,
    longitude,
    accuracy_meters,
    observed_at,
    received_at
  ) values (
    current_session.id,
    p_latitude,
    p_longitude,
    p_accuracy_meters,
    p_observed_at,
    current_time
  )
  on conflict (session_id) do update
  set
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    accuracy_meters = excluded.accuracy_meters,
    observed_at = excluded.observed_at,
    received_at = excluded.received_at
  where current_location.observed_at <= excluded.observed_at;

  update private.location_sessions
  set last_heartbeat_at = current_time
  where id = current_session.id;

  insert into public.resort_presence as existing (
    user_id,
    resort_id,
    audience,
    first_seen_at,
    last_seen_at
  ) values (
    current_user_id,
    current_session.resort_id,
    current_session.audience,
    current_time,
    current_time
  )
  on conflict (user_id) do update
  set
    resort_id = excluded.resort_id,
    audience = excluded.audience,
    first_seen_at = case
      when existing.resort_id is distinct from excluded.resort_id
        then excluded.first_seen_at
      else existing.first_seen_at
    end,
    last_seen_at = excluded.last_seen_at;

  insert into private.command_receipts (
    user_id,
    command_name,
    idempotency_key,
    resource_id,
    request_hash
  ) values (
    current_user_id,
    'publish_location',
    p_idempotency_key,
    current_session.id,
    request_hash
  );

  return current_session.id;
end;
$$;

create or replace function public.stop_location_session(
  p_session_id uuid,
  p_idempotency_key uuid
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  owned_session_id uuid;
  prior_resource_id uuid;
  request_hash text;
  stored_request_hash text;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_idempotency_key is null then
    raise exception using errcode = '22004', message = 'idempotency key required';
  end if;

  request_hash := private.command_request_hash(
    pg_catalog.jsonb_build_object('session_id', p_session_id)
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('location:' || current_user_id::text, 0)
  );

  select resource_id, command_receipts.request_hash
  into prior_resource_id, stored_request_hash
  from private.command_receipts
  where user_id = current_user_id
    and command_name = 'stop_location_session'
    and idempotency_key = p_idempotency_key;
  if found then
    if stored_request_hash is distinct from request_hash then
      raise exception using
        errcode = '22023',
        message = 'idempotency key was already used for a different request';
    end if;
    return prior_resource_id;
  end if;

  perform private.consume_command_rate_limit(
    current_user_id, 'stop_location_session', 30, interval '1 hour'
  );

  select id into owned_session_id
  from private.location_sessions
  where id = p_session_id and owner_id = current_user_id
  for update;

  if not found then
    raise exception using errcode = '42501', message = 'location session unavailable';
  end if;

  delete from private.live_locations where session_id = owned_session_id;
  update private.location_sessions
  set stopped_at = coalesce(stopped_at, statement_timestamp())
  where id = owned_session_id;

  insert into private.command_receipts (
    user_id,
    command_name,
    idempotency_key,
    resource_id,
    request_hash
  ) values (
    current_user_id,
    'stop_location_session',
    p_idempotency_key,
    owned_session_id,
    request_hash
  );

  return owned_session_id;
end;
$$;

create or replace function public.get_resort_presence(
  p_resort_id text default null,
  p_limit integer default 100
)
returns table (
  user_id uuid,
  display_name text,
  handle text,
  avatar_path text,
  resort_id text,
  resort_name text,
  city text,
  last_seen_at timestamptz,
  relationship text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    presence.user_id,
    profile.display_name,
    profile.handle,
    profile.avatar_path,
    presence.resort_id,
    resort.name,
    resort.city,
    presence.last_seen_at,
    case
      when presence.user_id = auth.uid() then 'self'
      when private.are_friends(auth.uid(), presence.user_id) then 'friend'
      else 'friend-of-friend'
    end
  from public.resort_presence as presence
  join public.profiles as profile on profile.id = presence.user_id
  join public.resorts as resort on resort.id = presence.resort_id
  where auth.uid() is not null
    and (p_resort_id is null or presence.resort_id = p_resort_id)
    and presence.last_seen_at >= now() - interval '24 hours'
    and private.can_view_resort_presence(auth.uid(), presence.user_id)
  order by presence.last_seen_at desc, presence.user_id
  limit greatest(1, least(coalesce(p_limit, 100), 100));
$$;

create or replace function public.get_live_locations(
  p_resort_id text default null,
  p_limit integer default 100
)
returns table (
  session_id uuid,
  user_id uuid,
  display_name text,
  handle text,
  avatar_path text,
  resort_id text,
  ride_id uuid,
  latitude double precision,
  longitude double precision,
  accuracy_meters double precision,
  observed_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    session.id,
    session.owner_id,
    profile.display_name,
    profile.handle,
    profile.avatar_path,
    session.resort_id,
    session.ride_id,
    location.latitude,
    location.longitude,
    location.accuracy_meters,
    location.observed_at
  from private.location_sessions as session
  join private.live_locations as location on location.session_id = session.id
  join public.profiles as profile on profile.id = session.owner_id
  where auth.uid() is not null
    and (p_resort_id is null or session.resort_id = p_resort_id)
    and session.stopped_at is null
    and session.expires_at > now()
    and session.last_heartbeat_at >= now() - interval '5 minutes'
    and location.observed_at >= now() - interval '5 minutes'
    and private.can_view_live_location(auth.uid(), session.id)
  order by location.observed_at desc, session.id
  limit greatest(1, least(coalesce(p_limit, 100), 100));
$$;

create or replace function private.cleanup_expired_location_data(
  p_now timestamptz default now()
)
returns table (
  deleted_live_locations bigint,
  deleted_sessions bigint,
  deleted_resort_presences bigint
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  live_location_count bigint;
  session_count bigint;
  resort_presence_count bigint;
begin
  if p_now is null then
    raise exception using errcode = '22004', message = 'cleanup timestamp required';
  end if;

  delete from private.live_locations as location
  using private.location_sessions as session
  where location.session_id = session.id
    and (
      location.observed_at <= p_now - interval '5 minutes'
      or session.last_heartbeat_at is null
      or session.last_heartbeat_at <= p_now - interval '5 minutes'
      or session.stopped_at is not null
      or session.expires_at <= p_now
    );
  get diagnostics live_location_count = row_count;

  delete from private.location_sessions
  where expires_at <= p_now;
  get diagnostics session_count = row_count;

  delete from public.resort_presence
  where last_seen_at <= p_now - interval '24 hours';
  get diagnostics resort_presence_count = row_count;

  return query select
    live_location_count,
    session_count,
    resort_presence_count;
end;
$$;

revoke all on function public.start_location_session(
  text, text, uuid, boolean, uuid, integer
) from public, anon;
revoke all on function public.publish_location(
  uuid, double precision, double precision, double precision,
  timestamptz, boolean, uuid
) from public, anon;
revoke all on function public.stop_location_session(uuid, uuid)
  from public, anon;
revoke all on function public.get_resort_presence(text, integer)
  from public, anon;
revoke all on function public.get_live_locations(text, integer)
  from public, anon;
revoke all on function private.cleanup_expired_location_data(timestamptz)
  from public, anon, authenticated, service_role;

grant execute on function public.start_location_session(
  text, text, uuid, boolean, uuid, integer
) to authenticated;
grant execute on function public.publish_location(
  uuid, double precision, double precision, double precision,
  timestamptz, boolean, uuid
) to authenticated;
grant execute on function public.stop_location_session(uuid, uuid)
  to authenticated;
grant execute on function public.get_resort_presence(text, integer)
  to authenticated;
grant execute on function public.get_live_locations(text, integer)
  to authenticated;

comment on table public.resort_presence is
  'Broad resort-level presence without coordinates; retained for at most 24 hours.';
comment on table private.live_locations is
  'One replaceable current coordinate per foreground location session; never movement history.';
comment on function private.cleanup_expired_location_data(timestamptz) is
  'Deletes stale exact positions, expired sessions, and resort presence past retention.';
