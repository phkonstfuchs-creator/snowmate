begin;

create extension if not exists pgtap with schema extensions;

select plan(100);

select has_table('public', 'resorts', 'resorts table exists');
select has_table('public', 'rides', 'rides table exists');
select has_table('private', 'ride_details', 'exact ride details use the private schema');
select has_table('public', 'ride_join_requests', 'ride requests are normalized');
select has_table('public', 'carpools', 'carpools table exists');
select has_table('private', 'carpool_details', 'exact departure data uses the private schema');
select has_table('public', 'carpool_members', 'accepted carpool members are normalized');
select has_table('public', 'carpool_requests', 'carpool seat requests are normalized');

select has_function(
  'public',
  'create_ride',
  array['text', 'text', 'timestamp with time zone', 'integer', 'text', 'text', 'text', 'uuid'],
  'ride creation has no caller-supplied user id'
);
select has_function(
  'public',
  'get_ride_feed',
  array['text', 'integer'],
  'ride discovery uses a broad DTO RPC'
);
select has_function(
  'public',
  'get_ride_detail',
  array['uuid'],
  'ride details use an authorization-aware DTO RPC'
);
select has_function(
  'public',
  'respond_ride_request',
  array['uuid', 'boolean', 'uuid'],
  'ride acceptance is transactional'
);
select has_function(
  'public',
  'create_carpool',
  array['text', 'text', 'text', 'timestamp with time zone', 'integer', 'text', 'text', 'text', 'uuid'],
  'carpool creation has no caller-supplied user id'
);
select has_function(
  'public',
  'get_carpool_feed',
  array['text', 'integer'],
  'carpool discovery uses a broad DTO RPC'
);
select has_function(
  'public',
  'get_carpool_detail',
  array['uuid'],
  'carpool details use an authorization-aware DTO RPC'
);
select has_function(
  'public',
  'request_carpool',
  array['uuid', 'uuid'],
  'carpool seat requests are idempotent commands'
);
select has_function(
  'public',
  'respond_carpool_request',
  array['uuid', 'boolean', 'uuid'],
  'carpool seat assignment is transactional'
);
select has_function(
  'private',
  'cleanup_expired_coordination_data',
  array['timestamp with time zone'],
  'sensitive coordination data has a private retention job'
);
select has_function(
  'public',
  'get_ride_members',
  array['uuid'],
  'ride rosters use an authorization-aware DTO RPC'
);
select has_function(
  'public',
  'get_ride_requests',
  array['uuid'],
  'ride requests use an authorization-aware DTO RPC'
);
select has_function(
  'public',
  'get_carpool_members',
  array['uuid'],
  'carpool rosters use an authorization-aware DTO RPC'
);
select has_function(
  'public',
  'get_carpool_requests',
  array['uuid'],
  'carpool requests use an authorization-aware DTO RPC'
);
select has_function(
  'public',
  'leave_ride',
  array['uuid', 'uuid'],
  'leaving a ride is idempotent'
);
select has_function(
  'public',
  'cancel_ride',
  array['uuid', 'uuid'],
  'cancelling a ride is idempotent'
);
select has_function(
  'public',
  'leave_carpool',
  array['uuid', 'uuid'],
  'leaving a carpool is idempotent'
);
select has_function(
  'public',
  'cancel_carpool',
  array['uuid', 'uuid'],
  'cancelling a carpool is idempotent'
);

select ok(
  (select relforcerowsecurity from pg_class where oid = 'public.rides'::regclass),
  'rides force RLS'
);
select ok(
  not has_table_privilege('authenticated', 'private.ride_details', 'SELECT'),
  'clients cannot query exact ride details directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.rides', 'INSERT'),
  'clients cannot insert rides directly'
);
select ok(
  (select relforcerowsecurity from pg_class where oid = 'public.carpools'::regclass),
  'carpools force RLS'
);
select ok(
  not has_table_privilege('authenticated', 'private.carpool_details', 'SELECT'),
  'clients cannot query exact carpool details directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.carpools', 'INSERT'),
  'clients cannot insert carpools directly'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'private.cleanup_expired_coordination_data(timestamp with time zone)',
    'EXECUTE'
  ),
  'clients cannot invoke sensitive-data cleanup'
);
select ok(
  not has_table_privilege('authenticated', 'public.rides', 'SELECT'),
  'clients cannot bypass the ride DTO boundary'
);
select ok(
  not has_table_privilege('authenticated', 'public.ride_members', 'SELECT'),
  'clients cannot query ride rosters directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.ride_join_requests', 'SELECT'),
  'clients cannot query ride requests directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.carpools', 'SELECT'),
  'clients cannot bypass the carpool DTO boundary'
);
select ok(
  not has_table_privilege('authenticated', 'public.carpool_members', 'SELECT'),
  'clients cannot query carpool rosters directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.carpool_requests', 'SELECT'),
  'clients cannot query carpool requests directly'
);

insert into auth.users (id, email)
values
  ('20000000-0000-4000-8000-000000000001', 'ride-a@example.com'),
  ('20000000-0000-4000-8000-000000000002', 'ride-b@example.com'),
  ('20000000-0000-4000-8000-000000000003', 'ride-c@example.com'),
  ('20000000-0000-4000-8000-000000000004', 'ride-d@example.com'),
  ('20000000-0000-4000-8000-000000000005', 'ride-minor@example.com'),
  ('20000000-0000-4000-8000-000000000006', 'ride-f@example.com');

update public.profiles
set
  display_name = 'Rider ' || right(id::text, 1),
  handle = 'ride_' || right(id::text, 1),
  city = 'innsbruck',
  ability_level = 'chill',
  onboarding_completed = true,
  is_minor = id = '20000000-0000-4000-8000-000000000005'
where id in (
  '20000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000003',
  '20000000-0000-4000-8000-000000000004',
  '20000000-0000-4000-8000-000000000005',
  '20000000-0000-4000-8000-000000000006'
);

insert into public.friendships (
  user_low,
  user_high,
  requested_by,
  status,
  responded_at
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    'accepted',
    now()
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000002',
    'accepted',
    now()
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000005',
    '20000000-0000-4000-8000-000000000005',
    'accepted',
    now()
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000006',
    '20000000-0000-4000-8000-000000000002',
    'accepted',
    now()
  );

create temporary table test_ride_state (
  key text primary key,
  value uuid not null
);
grant select, insert, update on table test_ride_state to authenticated;

set local role authenticated;
set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000001';

insert into test_ride_state (key, value)
values (
  'adult_ride',
  public.create_ride(
    'stubai-glacier',
    'chill',
    now() + interval '1 day',
    2,
    'friends-of-friends',
    'First lift',
    'Talstation Kassa 2',
    '21111111-0000-4000-8000-000000000001'
  )
);

select ok(
  (select value is not null from test_ride_state where key = 'adult_ride'),
  'an adult can create a friends-of-friends ride'
);
select throws_ok(
  $$select public.create_ride(
    'stubai-glacier',
    'chill',
    now() + interval '1 day',
    2,
    'friends-of-friends',
    'Different caption',
    'Talstation Kassa 2',
    '21111111-0000-4000-8000-000000000001'
  )$$,
  '22023',
  null,
  'a create_ride key cannot confirm a different payload'
);

select results_eq(
  $$select taken_spots from public.get_ride_feed('innsbruck', 20)$$,
  array[1],
  'the host is the first occupied ride spot'
);

set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000003';

select results_eq(
  $$select id from public.get_ride_feed('innsbruck', 20)$$,
  $$select value from test_ride_state where key = 'adult_ride'$$,
  'an adult friend-of-friend receives the broad ride DTO'
);

select is(
  (
    select meeting_point
    from public.get_ride_detail(
      (select value from test_ride_state where key = 'adult_ride')
    )
  ),
  null::text,
  'a friend-of-friend cannot see the exact meeting point before acceptance'
);

select results_eq(
  $$
    select count(*)
    from public.get_ride_members(
      (select value from test_ride_state where key = 'adult_ride')
    )
  $$,
  array[0::bigint],
  'a friend-of-friend cannot inspect the ride roster before acceptance'
);

insert into test_ride_state (key, value)
values (
  'request_c',
  public.request_ride(
    (select value from test_ride_state where key = 'adult_ride'),
    '23333333-0000-4000-8000-000000000001'
  )
);
select throws_ok(
  $$select public.request_ride(
    '29999999-0000-4000-8000-000000000001',
    '23333333-0000-4000-8000-000000000001'
  )$$,
  '22023',
  null,
  'a request_ride key cannot confirm a different ride'
);

select results_eq(
  $$
    select id
    from public.get_ride_requests(
      (select value from test_ride_state where key = 'adult_ride')
    )
  $$,
  $$select value from test_ride_state where key = 'request_c'$$,
  'a requester can read their own ride request DTO'
);

select is(
  (
    select meeting_point
    from public.get_ride_detail(
      (select value from test_ride_state where key = 'adult_ride')
    )
  ),
  null::text,
  'a pending request still cannot see the exact meeting point'
);

set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000002';

insert into test_ride_state (key, value)
values (
  'request_b',
  public.request_ride(
    (select value from test_ride_state where key = 'adult_ride'),
    '22222222-0000-4000-8000-000000000001'
  )
);

set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000001';

select results_eq(
  $$
    select count(*)
    from public.get_ride_requests(
      (select value from test_ride_state where key = 'adult_ride')
    )
  $$,
  array[2::bigint],
  'the ride host can read the pending request queue'
);

select lives_ok(
  $$select public.respond_ride_request(
    (select value from test_ride_state where key = 'request_c'),
    true,
    '21111111-0000-4000-8000-000000000002'
  )$$,
  'the host can accept an adult participant'
);
select throws_ok(
  $$select public.respond_ride_request(
    (select value from test_ride_state where key = 'request_c'),
    false,
    '21111111-0000-4000-8000-000000000002'
  )$$,
  '22023',
  null,
  'a respond_ride_request key cannot confirm a different decision'
);

select throws_ok(
  $$select public.respond_ride_request(
    (select value from test_ride_state where key = 'request_b'),
    true,
    '21111111-0000-4000-8000-000000000003'
  )$$,
  '23514',
  null,
  'a locked capacity check prevents overbooking'
);

set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000003';

select results_eq(
  $$
    select count(*)
    from public.get_ride_members(
      (select value from test_ride_state where key = 'adult_ride')
    )
  $$,
  array[2::bigint],
  'an accepted participant can inspect the ride roster'
);

select results_eq(
  $$
    select meeting_point
    from public.get_ride_detail(
      (select value from test_ride_state where key = 'adult_ride')
    )
  $$,
  array['Talstation Kassa 2'::text],
  'an accepted adult participant can see the exact meeting point'
);

set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000004';

select results_eq(
  $$select count(*) from public.get_ride_feed('innsbruck', 20)$$,
  array[0::bigint],
  'an unrelated user cannot discover the ride'
);

set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000005';

select throws_ok(
  $$select public.create_ride(
    'stubai-glacier',
    'chill',
    now() + interval '1 day',
    4,
    'friends-of-friends',
    'Minor ride',
    'Talstation',
    '25555555-0000-4000-8000-000000000001'
  )$$,
  '23514',
  null,
  'a minor cannot publish a friends-of-friends ride'
);

insert into test_ride_state (key, value)
values (
  'minor_ride',
  public.create_ride(
    'stubai-glacier',
    'chill',
    now() + interval '1 day',
    4,
    'friends',
    'Minor ride',
    'Freundetreffpunkt',
    '25555555-0000-4000-8000-000000000002'
  )
);

select ok(
  (select value is not null from test_ride_state where key = 'minor_ride'),
  'a minor can create a friends-only ride'
);

set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000001';

select results_eq(
  $$
    select count(*)
    from public.get_ride_feed('innsbruck', 20)
    where id = (select value from test_ride_state where key = 'minor_ride')
  $$,
  array[0::bigint],
  'an adult friend-of-friend cannot discover a minor ride'
);

set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000002';

select results_eq(
  $$
    select meeting_point
    from public.get_ride_detail(
      (select value from test_ride_state where key = 'minor_ride')
    )
  $$,
  array['Freundetreffpunkt'::text],
  'a confirmed friend can see a minor ride meeting point'
);

set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000003';

select lives_ok(
  $$select public.block_user(
    '20000000-0000-4000-8000-000000000001',
    '23333333-0000-4000-8000-000000000002'
  )$$,
  'an accepted participant can block the host'
);

select results_eq(
  $$
    select count(*)
    from public.get_ride_detail(
      (select value from test_ride_state where key = 'adult_ride')
    )
  $$,
  array[0::bigint],
  'blocking immediately revokes broad and exact ride access'
);

set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000001';

insert into test_ride_state (key, value)
values (
  'carpool',
  public.create_carpool(
    'stubai-glacier',
    'innsbruck',
    'driver',
    now() + interval '1 day',
    1,
    'friends-of-friends',
    'Ski bag fits',
    'Innsbruck Hauptbahnhof',
    '21111111-0000-4000-8000-000000000004'
  )
);

select ok(
  (select value is not null from test_ride_state where key = 'carpool'),
  'an adult can create a carpool with private departure details'
);
select throws_ok(
  $$select public.create_carpool(
    'stubai-glacier',
    'innsbruck',
    'driver',
    now() + interval '1 day',
    1,
    'friends-of-friends',
    'Different note',
    'Innsbruck Hauptbahnhof',
    '21111111-0000-4000-8000-000000000004'
  )$$,
  '22023',
  null,
  'a create_carpool key cannot confirm a different payload'
);

set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000002';

select results_eq(
  $$select available_seats from public.get_carpool_feed('innsbruck', 20)$$,
  array[1],
  'carpool feed derives availability from accepted members'
);

select results_eq(
  $$
    select departure_point
    from public.get_carpool_detail(
      (select value from test_ride_state where key = 'carpool')
    )
  $$,
  array['Innsbruck Hauptbahnhof'::text],
  'a confirmed friend can see the exact departure point'
);

set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000006';

select results_eq(
  $$select id from public.get_carpool_feed('innsbruck', 20)$$,
  $$select value from test_ride_state where key = 'carpool'$$,
  'an adult friend-of-friend receives the broad carpool DTO'
);

select is(
  (
    select departure_point
    from public.get_carpool_detail(
      (select value from test_ride_state where key = 'carpool')
    )
  ),
  null::text,
  'a friend-of-friend cannot see the departure point before acceptance'
);

select results_eq(
  $$
    select count(*)
    from public.get_carpool_members(
      (select value from test_ride_state where key = 'carpool')
    )
  $$,
  array[0::bigint],
  'a friend-of-friend cannot inspect the carpool roster before acceptance'
);

insert into test_ride_state (key, value)
values (
  'carpool_request_f',
  public.request_carpool(
    (select value from test_ride_state where key = 'carpool'),
    '26666666-0000-4000-8000-000000000001'
  )
);
select throws_ok(
  $$select public.request_carpool(
    '29999999-0000-4000-8000-000000000002',
    '26666666-0000-4000-8000-000000000001'
  )$$,
  '22023',
  null,
  'a request_carpool key cannot confirm a different carpool'
);

select results_eq(
  $$
    select id
    from public.get_carpool_requests(
      (select value from test_ride_state where key = 'carpool')
    )
  $$,
  $$select value from test_ride_state where key = 'carpool_request_f'$$,
  'a requester can read their own carpool request DTO'
);

set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000002';

insert into test_ride_state (key, value)
values (
  'carpool_request_b',
  public.request_carpool(
    (select value from test_ride_state where key = 'carpool'),
    '22222222-0000-4000-8000-000000000002'
  )
);

set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000001';

select results_eq(
  $$
    select count(*)
    from public.get_carpool_requests(
      (select value from test_ride_state where key = 'carpool')
    )
  $$,
  array[2::bigint],
  'the carpool host can read the pending request queue'
);

select lives_ok(
  $$select public.respond_carpool_request(
    (select value from test_ride_state where key = 'carpool_request_f'),
    true,
    '21111111-0000-4000-8000-000000000005'
  )$$,
  'the host can accept an adult carpool participant'
);
select throws_ok(
  $$select public.respond_carpool_request(
    (select value from test_ride_state where key = 'carpool_request_f'),
    false,
    '21111111-0000-4000-8000-000000000005'
  )$$,
  '22023',
  null,
  'a respond_carpool_request key cannot confirm a different decision'
);

select throws_ok(
  $$select public.respond_carpool_request(
    (select value from test_ride_state where key = 'carpool_request_b'),
    true,
    '21111111-0000-4000-8000-000000000006'
  )$$,
  '23514',
  null,
  'a locked seat check prevents carpool overbooking'
);

set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000006';

select results_eq(
  $$
    select count(*)
    from public.get_carpool_members(
      (select value from test_ride_state where key = 'carpool')
    )
  $$,
  array[1::bigint],
  'an accepted participant can inspect the carpool roster'
);

select results_eq(
  $select$
    select departure_point
    from public.get_carpool_detail(
      (select value from test_ride_state where key = 'carpool')
    )
  $select$,
  array['Innsbruck Hauptbahnhof'::text],
  'an accepted adult carpool participant can see the departure point'
);

set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000005';

select results_eq(
  $$select count(*) from public.get_carpool_feed('innsbruck', 20)$$,
  array[0::bigint],
  'a minor cannot use friend-of-friend carpool discovery'
);

select throws_ok(
  $$select public.request_carpool(
    (select value from test_ride_state where key = 'carpool'),
    '25555555-0000-4000-8000-000000000003'
  )$$,
  '42501',
  null,
  'a minor cannot request a friend-of-friend carpool seat'
);

set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000006';

select lives_ok(
  $$select public.block_user(
    '20000000-0000-4000-8000-000000000001',
    '26666666-0000-4000-8000-000000000002'
  )$$,
  'an accepted carpool participant can block the host'
);

select results_eq(
  $select$
    select count(*)
    from public.get_carpool_detail(
      (select value from test_ride_state where key = 'carpool')
    )
  $select$,
  array[0::bigint],
  'blocking immediately revokes carpool access'
);

set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000001';

select results_eq(
  $$select available_seats from public.get_carpool_feed('innsbruck', 20)$$,
  array[1],
  'blocking the host also releases the accepted carpool seat'
);

set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000002';

select throws_ok(
  $$insert into public.rides (
    host_id,
    resort_id,
    ability_level,
    starts_at,
    capacity,
    audience,
    caption
  ) values (
    '20000000-0000-4000-8000-000000000002',
    'stubai-glacier',
    'chill',
    now() + interval '1 day',
    4,
    'friends',
    'forged'
  )$$,
  '42501',
  null,
  'clients cannot bypass ride commands with a direct insert'
);

select throws_ok(
  $$insert into public.carpools (
    host_id,
    resort_id,
    city,
    direction,
    departs_at,
    seat_capacity,
    audience,
    note
  ) values (
    '20000000-0000-4000-8000-000000000002',
    'stubai-glacier',
    'innsbruck',
    'driver',
    now() + interval '1 day',
    4,
    'friends',
    'forged'
  )$$,
  '42501',
  null,
  'clients cannot bypass carpool commands with a direct insert'
);

reset role;

update public.rides
set starts_at = now() - interval '25 hours'
where id = (select value from test_ride_state where key = 'adult_ride');

update public.carpools
set departs_at = now() - interval '25 hours'
where id = (select value from test_ride_state where key = 'carpool');

set local role authenticated;
set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000002';

select throws_ok(
  $$select public.request_ride(
    (select value from test_ride_state where key = 'adult_ride'),
    '22222222-0000-4000-8000-000000000007'
  )$$,
  '42501',
  null,
  'a departed ride cannot receive a new request'
);
select throws_ok(
  $$select public.request_carpool(
    (select value from test_ride_state where key = 'carpool'),
    '22222222-0000-4000-8000-000000000008'
  )$$,
  '42501',
  null,
  'a departed carpool cannot receive a new request'
);

set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000001';

select throws_ok(
  $$select public.respond_ride_request(
    (select value from test_ride_state where key = 'request_b'),
    true,
    '21111111-0000-4000-8000-000000000009'
  )$$,
  '23514',
  null,
  'a departed ride request cannot be accepted'
);
select throws_ok(
  $$select public.respond_carpool_request(
    (select value from test_ride_state where key = 'carpool_request_b'),
    true,
    '21111111-0000-4000-8000-000000000010'
  )$$,
  '23514',
  null,
  'a departed carpool request cannot be accepted'
);

set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000002';

select results_eq(
  $$
    select public.leave_ride(
      (select value from test_ride_state where key = 'adult_ride'),
      '22222222-0000-4000-8000-000000000011'
    )
    from generate_series(1, 2)
  $$,
  $$
    select value
    from test_ride_state cross join generate_series(1, 2)
    where key = 'adult_ride'
  $$,
  'replaying leave_ride returns the original resource without a second mutation'
);
select throws_ok(
  $$select public.leave_ride(
    '29999999-0000-4000-8000-000000000003',
    '22222222-0000-4000-8000-000000000011'
  )$$,
  '22023',
  null,
  'a leave_ride key cannot confirm a different ride'
);
select results_eq(
  $$
    select public.leave_carpool(
      (select value from test_ride_state where key = 'carpool'),
      '22222222-0000-4000-8000-000000000012'
    )
    from generate_series(1, 2)
  $$,
  $$
    select value
    from test_ride_state cross join generate_series(1, 2)
    where key = 'carpool'
  $$,
  'replaying leave_carpool returns the original resource without a second mutation'
);
select throws_ok(
  $$select public.leave_carpool(
    '29999999-0000-4000-8000-000000000004',
    '22222222-0000-4000-8000-000000000012'
  )$$,
  '22023',
  null,
  'a leave_carpool key cannot confirm a different carpool'
);

reset role;

update private.command_receipts
set created_at = now() - interval '31 days'
where user_id = '20000000-0000-4000-8000-000000000001'
  and command_name = 'create_ride'
  and idempotency_key = '21111111-0000-4000-8000-000000000001';

create temporary table test_coordination_cleanup as
select * from private.cleanup_expired_coordination_data(now());

select is(
  (select deleted_ride_details from test_coordination_cleanup),
  1::bigint,
  'ride meeting details are deleted 24 hours after the ride'
);
select is(
  (select deleted_carpool_details from test_coordination_cleanup),
  1::bigint,
  'carpool departure details are deleted 24 hours after departure'
);
select is(
  (select deleted_command_receipts from test_coordination_cleanup),
  1::bigint,
  'idempotency receipts are deleted after 30 days'
);

set local role authenticated;
set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000001';

select results_eq(
  $query$
    select meeting_point, can_view_exact
    from public.get_ride_detail(
      (select value from test_ride_state where key = 'adult_ride')
    )
  $query$,
  $expected$
    values (null::text, false)
  $expected$,
  'the broad ride detail remains available after exact data expires'
);
select results_eq(
  $query$
    select departure_point, can_view_exact
    from public.get_carpool_detail(
      (select value from test_ride_state where key = 'carpool')
    )
  $query$,
  $expected$
    values (null::text, false)
  $expected$,
  'the broad carpool detail remains available after exact data expires'
);

select results_eq(
  $$
    select public.cancel_ride(
      (select value from test_ride_state where key = 'adult_ride'),
      '21111111-0000-4000-8000-000000000013'
    )
    from generate_series(1, 2)
  $$,
  $$
    select value
    from test_ride_state cross join generate_series(1, 2)
    where key = 'adult_ride'
  $$,
  'replaying cancel_ride returns the original resource without a second mutation'
);
select throws_ok(
  $$select public.cancel_ride(
    '29999999-0000-4000-8000-000000000005',
    '21111111-0000-4000-8000-000000000013'
  )$$,
  '22023',
  null,
  'a cancel_ride key cannot confirm a different ride'
);
select results_eq(
  $$
    select public.cancel_carpool(
      (select value from test_ride_state where key = 'carpool'),
      '21111111-0000-4000-8000-000000000014'
    )
    from generate_series(1, 2)
  $$,
  $$
    select value
    from test_ride_state cross join generate_series(1, 2)
    where key = 'carpool'
  $$,
  'replaying cancel_carpool returns the original resource without a second mutation'
);
select throws_ok(
  $$select public.cancel_carpool(
    '29999999-0000-4000-8000-000000000006',
    '21111111-0000-4000-8000-000000000014'
  )$$,
  '22023',
  null,
  'a cancel_carpool key cannot confirm a different carpool'
);

reset role;

select * from finish();

rollback;
