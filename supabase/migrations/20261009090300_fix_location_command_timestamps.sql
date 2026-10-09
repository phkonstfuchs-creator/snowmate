-- CURRENT_TIME is a SQL keyword returning time, not a timestamp.
-- Keep session timestamps unambiguous during rollover and publishing.
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
  v_now timestamptz := statement_timestamp();
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
  set stopped_at = v_now
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
    v_now,
    v_now + (p_duration_hours * interval '1 hour')
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
    v_now,
    v_now
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
  v_now timestamptz := statement_timestamp();
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
    or current_session.expires_at <= v_now
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
    or p_observed_at < v_now - interval '120 seconds'
    or p_observed_at > v_now + interval '30 seconds'
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
    v_now
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
  set last_heartbeat_at = v_now
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
    v_now,
    v_now
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
