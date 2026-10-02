begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

-- A and B are friends; C is a friend of both (so B is a friend of a
-- friend of A through C as well).
insert into auth.users (id, email)
values
  ('bcbcbcbc-0000-4000-8000-000000000001', 'a@example.com'),
  ('bcbcbcbc-0000-4000-8000-000000000002', 'b@example.com'),
  ('bcbcbcbc-0000-4000-8000-000000000003', 'c@example.com');

update public.profiles
set display_name = 'Block ' || right(id::text, 1), handle = 'block_' || right(id::text, 1),
    city = 'innsbruck', ability_level = 'chill', is_minor = false
where id::text like 'bcbcbcbc-%';

insert into public.friendships (requester_id, addressee_id, status)
values
  ('bcbcbcbc-0000-4000-8000-000000000001', 'bcbcbcbc-0000-4000-8000-000000000002', 'accepted'),
  ('bcbcbcbc-0000-4000-8000-000000000001', 'bcbcbcbc-0000-4000-8000-000000000003', 'accepted'),
  ('bcbcbcbc-0000-4000-8000-000000000002', 'bcbcbcbc-0000-4000-8000-000000000003', 'accepted');

insert into public.rides (host_id, resort, city, ability_level, ride_date, meet_time, meet_point, total_spots)
values
  ('bcbcbcbc-0000-4000-8000-000000000001', 'Nordkette', 'innsbruck', 'chill', current_date + 2, '09:00', 'A meet', 4),
  ('bcbcbcbc-0000-4000-8000-000000000002', 'Stubai Glacier', 'innsbruck', 'chill', current_date + 2, '09:00', 'B meet', 4);

insert into public.ride_participants (ride_id, user_id)
select id, 'bcbcbcbc-0000-4000-8000-000000000002' from public.rides where meet_point = 'A meet';

insert into public.carpools (author_id, role, resort, city, ride_date, departure_point, departure_time, seats)
values ('bcbcbcbc-0000-4000-8000-000000000001', 'driver', 'Nordkette', 'innsbruck', current_date + 2, 'Hbf', '08:00', 3);

insert into public.carpool_requests (carpool_id, user_id)
select id, 'bcbcbcbc-0000-4000-8000-000000000002' from public.carpools where departure_point = 'Hbf';

create temp table ids on commit drop as
select
  (select id from public.rides where meet_point = 'A meet') as ride_a,
  (select id from public.rides where meet_point = 'B meet') as ride_b,
  (select id from public.carpools where departure_point = 'Hbf') as pool_a;
grant select on ids to authenticated;

select ok(
  (select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.reports'::regclass),
  'reports forces row level security'
);

set local role anon;
select throws_ok($$select public.block_user(gen_random_uuid())$$, '42501', null, 'anon cannot block');
reset role;

set local role authenticated;
set local request.jwt.claim.sub = 'bcbcbcbc-0000-4000-8000-000000000001';

select is(public.block_user('bcbcbcbc-0000-4000-8000-000000000001'), 'self', 'you cannot block yourself');
select is(public.block_user('bcbcbcbc-0000-4000-8000-000000000002'), 'blocked', 'A blocks B');

select is_empty(
  $$select 1 from public.list_my_friendships() where handle = 'block_2'$$,
  'the friendship is gone'
);

select is_empty(
  $$select 1 from public.list_rides() where id = (select ride_b from ids)$$,
  'the blocker no longer sees the blocked person''s rides'
);

select is(
  (select taken_spots from public.list_rides() where id = (select ride_a from ids)),
  0,
  'the blocked person was removed from the blocker''s ride'
);

select is(
  (select jsonb_array_length(requests) from public.list_carpools() where id = (select pool_a from ids)),
  0,
  'the blocked person''s seat request is gone'
);

select is(
  (select handle from public.list_my_blocks()),
  'block_2',
  'the blocker sees whom they blocked'
);

set local request.jwt.claim.sub = 'bcbcbcbc-0000-4000-8000-000000000002';

select is_empty(
  $$select 1 from public.list_rides() where id = (select ride_a from ids)$$,
  'the blocked person no longer sees the blocker''s rides, even as a friend of a friend'
);

select is_empty($$select 1 from public.list_carpools()$$, 'nor their carpools');
select is(public.join_ride((select ride_a from ids)), 'not_found', 'nor can they join');
select is(public.request_carpool((select pool_a from ids)), 'not_found', 'nor ask for a seat');
select is(public.request_friendship('block_1'), 'not_found', 'a friend request looks like an unknown handle');

select is_empty($$select 1 from public.list_my_blocks()$$, 'the blocked person does not see the block');

select is(
  public.report_user('bcbcbcbc-0000-4000-8000-000000000003', 'spam', '  sends links  ', (select ride_a from ids)),
  'reported',
  'anyone can file a report'
);

select throws_ok($$select * from public.reports$$, '42501', null, 'reports cannot be read by clients');

reset role;

select results_eq(
  $$select reporter_id, reported_handle, reason, details, ride_id from public.reports$$,
  $$values ('bcbcbcbc-0000-4000-8000-000000000002'::uuid, 'block_3'::text, 'spam'::text, 'sends links'::text, null::uuid)$$,
  'the report stores who, about whom and why, but no ride the reporter cannot see'
);

insert into public.reports (reporter_id, reported_user_id, reason)
select 'bcbcbcbc-0000-4000-8000-000000000002', 'bcbcbcbc-0000-4000-8000-000000000003', 'other'
from generate_series(1, 9);

set local role authenticated;
set local request.jwt.claim.sub = 'bcbcbcbc-0000-4000-8000-000000000002';

select is(
  public.report_user('bcbcbcbc-0000-4000-8000-000000000003', 'spam'),
  'too_many',
  'an eleventh report in a day is refused'
);

set local request.jwt.claim.sub = 'bcbcbcbc-0000-4000-8000-000000000001';
select is(public.unblock_user('bcbcbcbc-0000-4000-8000-000000000002'), true, 'the blocker can unblock');

reset role;

select * from finish();

rollback;
