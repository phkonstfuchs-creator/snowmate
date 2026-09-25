begin;

create extension if not exists pgtap with schema extensions;

select plan(48);

-- Cast: adult host A, friend F, friend-of-friend G, stranger S,
-- pending requestee P, minor M (friends with F).
insert into auth.users (id, email)
values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'host@example.com'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'friend@example.com'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'fof@example.com'),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'stranger@example.com'),
  ('aaaaaaaa-0000-4000-8000-000000000005', 'pending@example.com'),
  ('aaaaaaaa-0000-4000-8000-000000000006', 'minor@example.com');

update public.profiles
set
  display_name = 'Rider ' || right(id::text, 1),
  handle = 'rider_' || right(id::text, 1),
  city = 'innsbruck',
  ability_level = 'chill',
  is_minor = (right(id::text, 1) = '6')
where id::text like 'aaaaaaaa-%';

insert into public.friendships (requester_id, addressee_id, status)
values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002', 'accepted'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000003', 'accepted'),
  ('aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000005', 'pending'),
  ('aaaaaaaa-0000-4000-8000-000000000006', 'aaaaaaaa-0000-4000-8000-000000000002', 'accepted');

-- ─── Structure ────────────────────────────────────────────────────────

select ok(
  (select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.rides'::regclass),
  'rides forces row level security'
);

select ok(
  (select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.ride_participants'::regclass),
  'ride_participants forces row level security'
);

select ok(
  (select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.friendships'::regclass),
  'friendships forces row level security'
);

select col_default_is('public', 'rides', 'visibility', 'friends'::text, 'visibility defaults to friends');

-- ─── Anonymous ────────────────────────────────────────────────────────

set local role anon;

select throws_ok($$select * from public.list_rides()$$, '42501', null, 'anon cannot list rides');
select throws_ok($$select * from public.rides$$, '42501', null, 'anon cannot read rides');
select throws_ok($$select public.join_ride(gen_random_uuid())$$, '42501', null, 'anon cannot join rides');
select throws_ok($$select public.request_friendship('rider_1')$$, '42501', null, 'anon cannot send friend requests');

reset role;

-- ─── Posting ──────────────────────────────────────────────────────────

set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000006';

select throws_ok(
  $$
    insert into public.rides (resort, city, ability_level, ride_date, meet_time, meet_point, total_spots, visibility, title)
    values ('Nordkette', 'innsbruck', 'chill', current_date + 1, '08:00', 'Hungerburg Talstation', 4, 'public', 'Minor event')
  $$,
  '23514',
  'minors cannot host public rides',
  'rule 3: a minor cannot post a public ride'
);

select lives_ok(
  $$
    insert into public.rides (resort, city, ability_level, ride_date, meet_time, meet_point, total_spots)
    values ('Axamer Lizum', 'innsbruck', 'park', current_date + 1, '09:00', 'Minor meet point', 3)
  $$,
  'a minor can post a friends-only ride'
);

set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000001';

select lives_ok(
  $$
    insert into public.rides (resort, city, ability_level, ride_date, meet_time, meet_point, total_spots, caption)
    values ('Stubai', 'innsbruck', 'off-piste', current_date + 1, '07:30', 'Parking lot P2', 2, 'Early start')
  $$,
  'an adult can post a friends-only ride'
);

select lives_ok(
  $$
    insert into public.rides (resort, city, ability_level, ride_date, meet_time, meet_point, total_spots, visibility, title)
    values ('Nordkette', 'innsbruck', 'chill', current_date + 2, '10:00', 'Seegrube exit', 1, 'public', 'Sunday cruise')
  $$,
  'an adult can post a public ride'
);

select throws_ok(
  $$
    insert into public.rides (host_id, resort, city, ability_level, ride_date, meet_time, meet_point, total_spots)
    values ('aaaaaaaa-0000-4000-8000-000000000004', 'Stubai', 'innsbruck', 'chill', current_date + 1, '08:00', 'Somewhere', 2)
  $$,
  '42501',
  null,
  'a client cannot post a ride in someone else''s name'
);

reset role;

create temp table ride_ids on commit drop as
select
  (select id from public.rides where resort = 'Stubai') as friends_ride,
  (select id from public.rides where resort = 'Nordkette') as public_ride,
  (select id from public.rides where resort = 'Axamer Lizum') as minor_ride;
grant select on ride_ids to authenticated;

set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000001';

select throws_ok($$select * from public.rides$$, '42501', null, 'authenticated clients cannot read rides directly');
select throws_ok($$select * from public.ride_participants$$, '42501', null, 'authenticated clients cannot read participants directly');
select throws_ok($$select * from public.friendships$$, '42501', null, 'authenticated clients cannot read friendships directly');

select throws_ok(
  $$insert into public.ride_participants (ride_id, user_id) values ((select friends_ride from ride_ids), 'aaaaaaaa-0000-4000-8000-000000000004')$$,
  '42501',
  null,
  'participants cannot be inserted directly, only through join_ride'
);

select results_eq(
  $$select meet_point, is_host from public.list_rides() where id = (select friends_ride from ride_ids)$$,
  $$values ('Parking lot P2'::text, true)$$,
  'the host sees their own meeting point'
);

-- ─── Friends-only ride ────────────────────────────────────────────────

set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000002';

select results_eq(
  $$select meet_point, meet_point_locked from public.list_rides() where id = (select friends_ride from ride_ids)$$,
  $$values ('Parking lot P2'::text, false)$$,
  'a confirmed friend sees the meeting point of a friends ride'
);

set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000003';

select results_eq(
  $$select meet_point, meet_point_locked from public.list_rides() where id = (select friends_ride from ride_ids)$$,
  $$values (null::text, true)$$,
  'rule 1: a friend of a friend sees the ride but not the meeting point'
);

select is_empty(
  $$select 1 from public.list_rides() where id = (select minor_ride from ride_ids)$$,
  'a minor''s ride does not reach friends of friends'
);

set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000002';

select isnt_empty(
  $$select 1 from public.list_rides() where id = (select minor_ride from ride_ids)$$,
  'a minor''s ride reaches their confirmed friends'
);

set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000004';

select is_empty(
  $$select 1 from public.list_rides() where id = (select friends_ride from ride_ids)$$,
  'a stranger does not see a friends ride'
);

select is(
  public.join_ride((select friends_ride from ride_ids)),
  'not_found',
  'a stranger cannot join a friends ride they cannot see'
);

set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000005';

select is_empty(
  $$select 1 from public.list_rides() where id = (select friends_ride from ride_ids)$$,
  'a pending friend request does not grant visibility'
);

-- ─── Public ride ──────────────────────────────────────────────────────

set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000002';

select results_eq(
  $$select meet_point, meet_point_locked from public.list_rides() where id = (select public_ride from ride_ids)$$,
  $$values (null::text, true)$$,
  'rule 2: friendship alone does not unlock a public meeting point'
);

set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000004';

select results_eq(
  $$select meet_point, title from public.list_rides() where id = (select public_ride from ride_ids)$$,
  $$values (null::text, 'Sunday cruise'::text)$$,
  'a stranger sees a public ride without its meeting point'
);

select is(public.join_ride((select public_ride from ride_ids)), 'joined', 'a stranger can join a public ride');

select results_eq(
  $$select meet_point, is_joined, taken_spots from public.list_rides() where id = (select public_ride from ride_ids)$$,
  $$values ('Seegrube exit'::text, true, 1)$$,
  'joining unlocks the meeting point'
);

select is(public.join_ride((select public_ride from ride_ids)), 'already_joined', 'joining twice is a no-op');

select is(
  (select participants -> 0 ->> 'handle' from public.list_rides() where id = (select public_ride from ride_ids)),
  'rider_4',
  'a participant sees who else is going'
);

set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000003';

select is(public.join_ride((select public_ride from ride_ids)), 'full', 'rule 4: joining a full ride is refused');

select results_eq(
  $$select taken_spots, participants from public.list_rides() where id = (select public_ride from ride_ids)$$,
  $$values (1, '[]'::jsonb)$$,
  'someone outside the ride sees the count but not who joined'
);

set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000001';

select is(public.join_ride((select public_ride from ride_ids)), 'host', 'the host cannot join their own ride');

-- ─── Leaving and deleting ─────────────────────────────────────────────

set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000004';

select is(public.cancel_ride((select public_ride from ride_ids)), false, 'a participant cannot cancel someone else''s ride');

select throws_ok(
  $$delete from public.rides$$,
  '42501',
  null,
  'rides cannot be deleted directly'
);

select is(public.leave_ride((select public_ride from ride_ids)), true, 'a participant can leave a ride');

select results_eq(
  $$select meet_point, taken_spots from public.list_rides() where id = (select public_ride from ride_ids)$$,
  $$values (null::text, 0)$$,
  'leaving a ride locks the meeting point again'
);

-- ─── Rule 5 ───────────────────────────────────────────────────────────

reset role;
update public.profiles set is_minor = true where id = 'aaaaaaaa-0000-4000-8000-000000000001';
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000004';

select is_empty(
  $$select 1 from public.list_rides() where id = (select public_ride from ride_ids)$$,
  'rule 5: a public ride whose host is a minor never reaches strangers'
);

reset role;
update public.profiles set is_minor = false where id = 'aaaaaaaa-0000-4000-8000-000000000001';
set local role authenticated;

-- ─── Friend requests ──────────────────────────────────────────────────

set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000004';

select is(public.request_friendship('@Rider_2'), 'requested', 'a request by handle is created');
select is(public.request_friendship('rider_2'), 'already_requested', 'a second request is not duplicated');
select is(public.request_friendship('nobody_here'), 'not_found', 'an unknown handle is not found');
select is(public.request_friendship('rider_4'), 'self', 'you cannot befriend yourself');

set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000002';

select is(public.request_friendship('rider_4'), 'accepted', 'requesting back accepts the open request');

select results_eq(
  $$select handle, status, direction from public.list_my_friendships() where handle = 'rider_4'$$,
  $$values ('rider_4'::text, 'accepted'::text, 'incoming'::text)$$,
  'the friend list shows the accepted friendship'
);

set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000001';

select results_eq(
  $$select handle, status, direction from public.list_my_friendships() where handle = 'rider_5'$$,
  $$values ('rider_5'::text, 'pending'::text, 'outgoing'::text)$$,
  'the friend list shows an outgoing pending request'
);

select is(public.remove_friendship('aaaaaaaa-0000-4000-8000-000000000005'), true, 'either side can withdraw a request');

select is(public.cancel_ride((select friends_ride from ride_ids)), true, 'the host can cancel their own ride');

reset role;

select * from finish();

rollback;
