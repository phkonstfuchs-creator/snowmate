begin;

create extension if not exists pgtap with schema extensions;

select plan(83);

select has_table(
  'public',
  'resort_presence',
  'broad resort presence has its own table'
);
select has_table(
  'private',
  'location_sessions',
  'location session internals use the private schema'
);
select has_table(
  'private',
  'live_locations',
  'exact live locations use the private schema'
);
select hasnt_column(
  'public',
  'resort_presence',
  'latitude',
  'broad presence never stores latitude'
);
select hasnt_column(
  'public',
  'resort_presence',
  'longitude',
  'broad presence never stores longitude'
);
select has_column(
  'private',
  'live_locations',
  'latitude',
  'exact latitude exists only in the private location table'
);

select has_function(
  'public',
  'start_location_session',
  array['text', 'text', 'uuid', 'boolean', 'uuid', 'integer'],
  'location start derives its owner from the authenticated session'
);
select has_function(
  'public',
  'publish_location',
  array[
    'uuid',
    'double precision',
    'double precision',
    'double precision',
    'timestamp with time zone',
    'boolean',
    'uuid'
  ],
  'location publishing has a narrow command interface'
);
select has_function(
  'public',
  'stop_location_session',
  array['uuid', 'uuid'],
  'location stopping is an idempotent command'
);
select has_function(
  'public',
  'get_resort_presence',
  array['text', 'integer'],
  'resort presence is exposed through a broad DTO RPC'
);
select has_function(
  'public',
  'get_live_locations',
  array['text', 'integer'],
  'exact locations are exposed through an authorization-aware DTO RPC'
);
select has_function(
  'private',
  'cleanup_expired_location_data',
  array['timestamp with time zone'],
  'a private retention cleanup function exists'
);

select ok(
  (select relforcerowsecurity from pg_class where oid = 'public.resort_presence'::regclass),
  'resort presence forces RLS'
);
select ok(
  (select relforcerowsecurity from pg_class where oid = 'private.location_sessions'::regclass),
  'location sessions force RLS'
);
select ok(
  (select relforcerowsecurity from pg_class where oid = 'private.live_locations'::regclass),
  'live locations force RLS'
);
select ok(
  not has_table_privilege('authenticated', 'public.resort_presence', 'SELECT'),
  'clients cannot query resort presence directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.resort_presence', 'INSERT'),
  'clients cannot forge resort presence directly'
);
select ok(
  not has_table_privilege('authenticated', 'private.location_sessions', 'SELECT'),
  'clients cannot inspect location session internals'
);
select ok(
  not has_table_privilege('authenticated', 'private.live_locations', 'SELECT'),
  'clients cannot query exact coordinates directly'
);
select ok(
  not has_table_privilege('authenticated', 'private.live_locations', 'INSERT'),
  'clients cannot insert exact coordinates directly'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.start_location_session(text,text,uuid,boolean,uuid,integer)',
    'EXECUTE'
  ),
  'authenticated users can start foreground sessions'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.get_live_locations(text,integer)',
    'EXECUTE'
  ),
  'anonymous users cannot execute the exact location DTO'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'private.cleanup_expired_location_data(timestamp with time zone)',
    'EXECUTE'
  ),
  'clients cannot invoke retention cleanup'
);

insert into auth.users (id, email)
values
  ('60000000-0000-4000-8000-000000000001', 'location-owner@example.com'),
  ('60000000-0000-4000-8000-000000000002', 'location-friend@example.com'),
  ('60000000-0000-4000-8000-000000000003', 'location-fof@example.com'),
  ('60000000-0000-4000-8000-000000000004', 'location-unrelated@example.com'),
  ('60000000-0000-4000-8000-000000000005', 'location-rider@example.com'),
  ('60000000-0000-4000-8000-000000000006', 'location-minor-owner@example.com'),
  ('60000000-0000-4000-8000-000000000007', 'location-minor-viewer@example.com'),
  ('60000000-0000-4000-8000-000000000008', 'location-blocked-friend@example.com');

update public.profiles
set
  display_name = 'Location ' || right(id::text, 1),
  handle = 'location_' || right(id::text, 1),
  city = 'innsbruck',
  ability_level = 'chill',
  onboarding_completed = true,
  is_minor = id in (
    '60000000-0000-4000-8000-000000000006',
    '60000000-0000-4000-8000-000000000007'
  )
where id::text like '60000000-0000-4000-8000-%';

insert into public.friendships (
  user_low,
  user_high,
  requested_by,
  status,
  responded_at
)
values
  (
    '60000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000002',
    '60000000-0000-4000-8000-000000000001',
    'accepted',
    now()
  ),
  (
    '60000000-0000-4000-8000-000000000002',
    '60000000-0000-4000-8000-000000000003',
    '60000000-0000-4000-8000-000000000002',
    'accepted',
    now()
  ),
  (
    '60000000-0000-4000-8000-000000000002',
    '60000000-0000-4000-8000-000000000006',
    '60000000-0000-4000-8000-000000000006',
    'accepted',
    now()
  ),
  (
    '60000000-0000-4000-8000-000000000002',
    '60000000-0000-4000-8000-000000000007',
    '60000000-0000-4000-8000-000000000007',
    'accepted',
    now()
  ),
  (
    '60000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000008',
    '60000000-0000-4000-8000-000000000001',
    'accepted',
    now()
  );

insert into public.rides (
  id,
  host_id,
  resort_id,
  ability_level,
  starts_at,
  capacity,
  audience,
  caption,
  status
)
values
  (
    '61111111-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000001',
    'stubai-glacier',
    'chill',
    now() + interval '1 day',
    4,
    'friends-of-friends',
    'Adult live-location ride',
    'active'
  ),
  (
    '61111111-0000-4000-8000-000000000002',
    '60000000-0000-4000-8000-000000000006',
    'stubai-glacier',
    'chill',
    now() + interval '1 day',
    3,
    'friends',
    'Minor live-location ride',
    'active'
  );

insert into private.ride_details (ride_id, meeting_point)
values
  ('61111111-0000-4000-8000-000000000001', 'Adult meeting point'),
  ('61111111-0000-4000-8000-000000000002', 'Minor meeting point');

insert into public.ride_members (ride_id, user_id, role)
values
  (
    '61111111-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000001',
    'host'
  ),
  (
    '61111111-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000005',
    'participant'
  ),
  (
    '61111111-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000007',
    'participant'
  ),
  (
    '61111111-0000-4000-8000-000000000002',
    '60000000-0000-4000-8000-000000000006',
    'host'
  ),
  (
    '61111111-0000-4000-8000-000000000002',
    '60000000-0000-4000-8000-000000000005',
    'participant'
  );

create temporary table test_location_state (
  key text primary key,
  value uuid not null
);
grant select, insert, update on table test_location_state to authenticated;

set local role anon;

select throws_ok(
  $$select * from public.get_resort_presence('stubai-glacier', 20)$$,
  '42501',
  null,
  'anonymous users cannot read resort presence'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '60000000-0000-4000-8000-000000000001';

select throws_ok(
  $$select public.start_location_session(
    'stubai-glacier',
    'friends',
    null,
    false,
    '62222222-0000-4000-8000-000000000001'
  )$$,
  '23514',
  null,
  'background-intent sessions are rejected'
);
select throws_ok(
  $$select public.start_location_session(
    'stubai-glacier',
    'friends',
    null,
    true,
    '62222222-0000-4000-8000-000000000002',
    0
  )$$,
  '23514',
  null,
  'sessions shorter than one hour are rejected'
);
select throws_ok(
  $$select public.start_location_session(
    'stubai-glacier',
    'friends',
    null,
    true,
    '62222222-0000-4000-8000-000000000003',
    9
  )$$,
  '23514',
  null,
  'sessions longer than eight hours are rejected'
);

insert into test_location_state (key, value)
values (
  'adult_session',
  public.start_location_session(
    'stubai-glacier',
    'friends-of-friends',
    '61111111-0000-4000-8000-000000000001',
    true,
    '62222222-0000-4000-8000-000000000004'
  )
);

select ok(
  (select value is not null from test_location_state where key = 'adult_session'),
  'an adult can start a foreground friends-of-friends session'
);
select is(
  public.start_location_session(
    'stubai-glacier',
    'friends-of-friends',
    '61111111-0000-4000-8000-000000000001',
    true,
    '62222222-0000-4000-8000-000000000004'
  ),
  (select value from test_location_state where key = 'adult_session'),
  'reusing the start idempotency key returns the original session'
);
select throws_ok(
  $$select public.start_location_session(
    'stubai-glacier',
    'friends',
    '61111111-0000-4000-8000-000000000001',
    true,
    '62222222-0000-4000-8000-000000000004'
  )$$,
  '22023',
  null,
  'a start key cannot confirm a different location audience'
);

reset role;

select is(
  (
    select request_count
    from private.command_rate_limits
    where user_id = '60000000-0000-4000-8000-000000000001'
      and command_name = 'start_location_session'
  ),
  1,
  'starting a location session consumes one server-side rate-limit slot'
);

select ok(
  (
    select foreground_only
    from private.location_sessions
    where id = (select value from test_location_state where key = 'adult_session')
  ),
  'foreground-only intent is stored with the session'
);
select ok(
  (
    select expires_at between started_at + interval '3 hours 59 minutes'
      and started_at + interval '4 hours 1 minute'
    from private.location_sessions
    where id = (select value from test_location_state where key = 'adult_session')
  ),
  'omitting duration applies the four-hour default'
);

set local role authenticated;
set local request.jwt.claim.sub = '60000000-0000-4000-8000-000000000001';

select results_eq(
  $$select user_id from public.get_resort_presence('stubai-glacier', 20)$$,
  array['60000000-0000-4000-8000-000000000001'::uuid],
  'the owner receives their own broad presence'
);

set local request.jwt.claim.sub = '60000000-0000-4000-8000-000000000002';

select results_eq(
  $$select user_id from public.get_resort_presence('stubai-glacier', 20)$$,
  array['60000000-0000-4000-8000-000000000001'::uuid],
  'a confirmed friend receives broad resort presence'
);

set local request.jwt.claim.sub = '60000000-0000-4000-8000-000000000003';

select results_eq(
  $$select user_id from public.get_resort_presence('stubai-glacier', 20)$$,
  array['60000000-0000-4000-8000-000000000001'::uuid],
  'an adult friend-of-friend receives resort presence only'
);
select results_eq(
  $$select count(*) from public.get_live_locations('stubai-glacier', 20)$$,
  array[0::bigint],
  'a friend-of-friend receives no exact location'
);

set local request.jwt.claim.sub = '60000000-0000-4000-8000-000000000004';

select results_eq(
  $$select count(*) from public.get_resort_presence('stubai-glacier', 20)$$,
  array[0::bigint],
  'an unrelated user receives no resort presence'
);

set local request.jwt.claim.sub = '60000000-0000-4000-8000-000000000007';

select results_eq(
  $$select count(*) from public.get_resort_presence('stubai-glacier', 20)$$,
  array[0::bigint],
  'a minor cannot use friend-of-friend resort discovery'
);

set local request.jwt.claim.sub = '60000000-0000-4000-8000-000000000004';

select throws_ok(
  $$select public.start_location_session(
    'stubai-glacier',
    'friends',
    '61111111-0000-4000-8000-000000000001',
    true,
    '64444444-0000-4000-8000-000000000001'
  )$$,
  '42501',
  null,
  'a caller cannot forge a ride binding without accepted membership'
);
select throws_ok(
  $$select public.publish_location(
    (select value from test_location_state where key = 'adult_session'),
    47.1,
    11.3,
    12,
    now(),
    true,
    '64444444-0000-4000-8000-000000000002'
  )$$,
  '42501',
  null,
  'a caller cannot publish to another user session'
);
select throws_ok(
  $$select public.stop_location_session(
    (select value from test_location_state where key = 'adult_session'),
    '64444444-0000-4000-8000-000000000003'
  )$$,
  '42501',
  null,
  'a caller cannot stop another user session'
);

set local request.jwt.claim.sub = '60000000-0000-4000-8000-000000000001';

select throws_ok(
  $$select public.publish_location(
    (select value from test_location_state where key = 'adult_session'),
    91,
    11.3,
    12,
    now(),
    true,
    '63333333-0000-4000-8000-000000000001'
  )$$,
  '23514',
  null,
  'invalid latitude is rejected'
);
select throws_ok(
  $$select public.publish_location(
    (select value from test_location_state where key = 'adult_session'),
    47.1,
    181,
    12,
    statement_timestamp(),
    true,
    '63333333-0000-4000-8000-000000000002'
  )$$,
  '23514',
  null,
  'invalid longitude is rejected'
);
select throws_ok(
  $$select public.publish_location(
    (select value from test_location_state where key = 'adult_session'),
    47.1,
    11.3,
    1001,
    statement_timestamp(),
    true,
    '63333333-0000-4000-8000-000000000003'
  )$$,
  '23514',
  null,
  'unusable location accuracy is rejected'
);
select throws_ok(
  $$select public.publish_location(
    (select value from test_location_state where key = 'adult_session'),
    47.1,
    11.3,
    12,
    statement_timestamp() - interval '121 seconds',
    true,
    '63333333-0000-4000-8000-000000000004'
  )$$,
  '23514',
  null,
  'positions older than 120 seconds are rejected'
);
select throws_ok(
  $$select public.publish_location(
    (select value from test_location_state where key = 'adult_session'),
    47.1,
    11.3,
    12,
    statement_timestamp() + interval '31 seconds',
    true,
    '63333333-0000-4000-8000-000000000005'
  )$$,
  '23514',
  null,
  'positions more than 30 seconds in the future are rejected'
);
select throws_ok(
  $$select public.publish_location(
    (select value from test_location_state where key = 'adult_session'),
    47.1,
    11.3,
    12,
    statement_timestamp(),
    false,
    '63333333-0000-4000-8000-000000000006'
  )$$,
  '23514',
  null,
  'background publishing is rejected'
);

select is(
  public.publish_location(
    (select value from test_location_state where key = 'adult_session'),
    47.1001,
    11.3001,
    12,
    now() - interval '1 second',
    true,
    '63333333-0000-4000-8000-000000000007'
  ),
  (select value from test_location_state where key = 'adult_session'),
  'a valid foreground position is accepted'
);
select is(
  public.publish_location(
    (select value from test_location_state where key = 'adult_session'),
    47.2002,
    11.4002,
    9,
    now(),
    true,
    '63333333-0000-4000-8000-000000000008'
  ),
  (select value from test_location_state where key = 'adult_session'),
  'a second foreground position replaces the first'
);
select is(
  public.publish_location(
    (select value from test_location_state where key = 'adult_session'),
    47.2002,
    11.4002,
    9,
    now(),
    true,
    '63333333-0000-4000-8000-000000000008'
  ),
  (select value from test_location_state where key = 'adult_session'),
  'a repeated publish idempotency key returns the original result'
);
select throws_ok(
  $$select public.publish_location(
    (select value from test_location_state where key = 'adult_session'),
    48.8,
    12.8,
    8,
    now(),
    true,
    '63333333-0000-4000-8000-000000000008'
  )$$,
  '22023',
  null,
  'a publish key cannot confirm different coordinates'
);

reset role;

select is(
  (
    select request_count
    from private.command_rate_limits
    where user_id = '60000000-0000-4000-8000-000000000001'
      and command_name = 'publish_location'
  ),
  2,
  'new location publishes consume rate-limit slots while replay does not'
);

select is(
  (
    select count(*)
    from private.live_locations
    where session_id = (select value from test_location_state where key = 'adult_session')
  ),
  1::bigint,
  'publishing retains one current row rather than movement history'
);
select is(
  (
    select latitude
    from private.live_locations
    where session_id = (select value from test_location_state where key = 'adult_session')
  ),
  47.2002::double precision,
  'the sole exact row contains the newest accepted latitude'
);

set local role authenticated;
set local request.jwt.claim.sub = '60000000-0000-4000-8000-000000000002';

select results_eq(
  $$select latitude from public.get_live_locations('stubai-glacier', 20)$$,
  array[47.2002::double precision],
  'a confirmed friend receives the fresh exact location'
);

set local request.jwt.claim.sub = '60000000-0000-4000-8000-000000000003';

select results_eq(
  $$select count(*) from public.get_live_locations('stubai-glacier', 20)$$,
  array[0::bigint],
  'an adult friend-of-friend still receives no exact location after publishing'
);

set local request.jwt.claim.sub = '60000000-0000-4000-8000-000000000004';

select results_eq(
  $$select count(*) from public.get_live_locations('stubai-glacier', 20)$$,
  array[0::bigint],
  'an unrelated user receives no exact location'
);

set local request.jwt.claim.sub = '60000000-0000-4000-8000-000000000005';

select results_eq(
  $$select user_id from public.get_live_locations('stubai-glacier', 20)$$,
  array['60000000-0000-4000-8000-000000000001'::uuid],
  'an accepted adult ride participant receives the bound live location'
);

set local request.jwt.claim.sub = '60000000-0000-4000-8000-000000000007';

select results_eq(
  $$select count(*) from public.get_live_locations('stubai-glacier', 20)$$,
  array[0::bigint],
  'an accepted minor ride participant receives no non-friend exact location'
);

set local request.jwt.claim.sub = '60000000-0000-4000-8000-000000000008';

select results_eq(
  $$select user_id from public.get_live_locations('stubai-glacier', 20)$$,
  array['60000000-0000-4000-8000-000000000001'::uuid],
  'a confirmed friend can see exact location before blocking'
);
select lives_ok(
  $$select public.block_user(
    '60000000-0000-4000-8000-000000000001',
    '68888888-0000-4000-8000-000000000001'
  )$$,
  'the friend can block the location owner'
);
select results_eq(
  $$select count(*) from public.get_resort_presence('stubai-glacier', 20)$$,
  array[0::bigint],
  'blocking immediately revokes broad presence'
);
select results_eq(
  $$select count(*) from public.get_live_locations('stubai-glacier', 20)$$,
  array[0::bigint],
  'blocking immediately revokes exact location'
);

reset role;

update private.location_sessions
set
  started_at = now() - interval '1 hour',
  expires_at = now() + interval '3 hours',
  last_heartbeat_at = now() - interval '6 minutes'
where id = (select value from test_location_state where key = 'adult_session');

update private.live_locations
set observed_at = now()
where session_id = (select value from test_location_state where key = 'adult_session');

set local role authenticated;
set local request.jwt.claim.sub = '60000000-0000-4000-8000-000000000002';

select results_eq(
  $$select count(*) from public.get_live_locations('stubai-glacier', 20)$$,
  array[0::bigint],
  'a heartbeat older than five minutes is invisible before cleanup runs'
);

reset role;

update private.location_sessions
set last_heartbeat_at = now()
where id = (select value from test_location_state where key = 'adult_session');

update private.live_locations
set observed_at = now() - interval '6 minutes'
where session_id = (select value from test_location_state where key = 'adult_session');

set local role authenticated;
set local request.jwt.claim.sub = '60000000-0000-4000-8000-000000000002';

select results_eq(
  $$select count(*) from public.get_live_locations('stubai-glacier', 20)$$,
  array[0::bigint],
  'a position older than five minutes is invisible before cleanup runs'
);

reset role;

select is(
  (
    select deleted_live_locations
    from private.cleanup_expired_location_data(now())
  ),
  1::bigint,
  'cleanup deletes exact positions after five minutes'
);

set local role authenticated;
set local request.jwt.claim.sub = '60000000-0000-4000-8000-000000000006';

select throws_ok(
  $$select public.start_location_session(
    'stubai-glacier',
    'friends-of-friends',
    null,
    true,
    '66666666-0000-4000-8000-000000000001'
  )$$,
  '23514',
  null,
  'a minor cannot publish friends-of-friends presence'
);

insert into test_location_state (key, value)
values (
  'minor_session',
  public.start_location_session(
    'stubai-glacier',
    'friends',
    '61111111-0000-4000-8000-000000000002',
    true,
    '66666666-0000-4000-8000-000000000002',
    1
  )
);

select is(
  public.publish_location(
    (select value from test_location_state where key = 'minor_session'),
    47.055,
    11.322,
    15,
    statement_timestamp(),
    true,
    '66666666-0000-4000-8000-000000000003'
  ),
  (select value from test_location_state where key = 'minor_session'),
  'a minor can publish a friends-only foreground location'
);

set local request.jwt.claim.sub = '60000000-0000-4000-8000-000000000002';

select results_eq(
  $$select user_id from public.get_live_locations('stubai-glacier', 20)$$,
  array['60000000-0000-4000-8000-000000000006'::uuid],
  'a confirmed friend can see a minor owner exact location'
);

set local request.jwt.claim.sub = '60000000-0000-4000-8000-000000000005';

select results_eq(
  $select$
    select count(*)
    from public.get_live_locations('stubai-glacier', 20)
    where user_id = '60000000-0000-4000-8000-000000000006'
  $select$,
  array[0::bigint],
  'an accepted adult participant cannot see a non-friend minor owner'
);

set local request.jwt.claim.sub = '60000000-0000-4000-8000-000000000006';

select is(
  public.stop_location_session(
    (select value from test_location_state where key = 'minor_session'),
    '66666666-0000-4000-8000-000000000004'
  ),
  (select value from test_location_state where key = 'minor_session'),
  'the owner can stop their location session'
);
select is(
  public.stop_location_session(
    (select value from test_location_state where key = 'minor_session'),
    '66666666-0000-4000-8000-000000000004'
  ),
  (select value from test_location_state where key = 'minor_session'),
  'stopping is idempotent for the same command key'
);
select throws_ok(
  $$select public.stop_location_session(
    (select value from test_location_state where key = 'adult_session'),
    '66666666-0000-4000-8000-000000000004'
  )$$,
  '22023',
  null,
  'a stop key cannot confirm a different location session'
);

reset role;

select is(
  (
    select request_count
    from private.command_rate_limits
    where user_id = '60000000-0000-4000-8000-000000000006'
      and command_name = 'stop_location_session'
  ),
  1,
  'stopping a location session consumes one server-side rate-limit slot'
);

select is(
  (
    select count(*)
    from private.live_locations
    where session_id = (select value from test_location_state where key = 'minor_session')
  ),
  0::bigint,
  'stopping deletes the exact position immediately'
);
select is(
  (
    select count(*)
    from public.resort_presence
    where user_id = '60000000-0000-4000-8000-000000000006'
  ),
  1::bigint,
  'stopping retains broad resort presence until its retention deadline'
);

select is(
  (
    select deleted_sessions
    from private.cleanup_expired_location_data(now() + interval '9 hours')
  ),
  2::bigint,
  'cleanup removes location sessions after their expiry'
);
select is(
  (
    select count(*)
    from private.location_sessions
    where owner_id in (
      '60000000-0000-4000-8000-000000000001',
      '60000000-0000-4000-8000-000000000006'
    )
  ),
  0::bigint,
  'expired session internals are no longer retained'
);
select ok(
  (
    select deleted_resort_presences >= 2
    from private.cleanup_expired_location_data(now() + interval '25 hours')
  ),
  'cleanup removes broad resort presence after 24 hours'
);

set local role authenticated;
set local request.jwt.claim.sub = '60000000-0000-4000-8000-000000000002';

select throws_ok(
  $$insert into public.resort_presence (
    user_id,
    resort_id,
    audience
  ) values (
    '60000000-0000-4000-8000-000000000002',
    'stubai-glacier',
    'friends'
  )$$,
  '42501',
  null,
  'authenticated clients cannot forge broad presence writes'
);
select throws_ok(
  $$select * from private.live_locations$$,
  '42501',
  null,
  'authenticated clients cannot bypass the exact-location DTO'
);
select throws_ok(
  $$insert into private.location_sessions (
    owner_id,
    resort_id,
    audience,
    foreground_only,
    expires_at
  ) values (
    '60000000-0000-4000-8000-000000000002',
    'stubai-glacier',
    'friends',
    true,
    now() + interval '4 hours'
  )$$,
  '42501',
  null,
  'authenticated clients cannot forge private sessions'
);

reset role;

select * from finish();

rollback;
