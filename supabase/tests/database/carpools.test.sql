begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

-- Driver D (adult), friend F (adult), friend-of-friend G (adult),
-- minor friend-of-friend M, stranger S.
insert into auth.users (id, email)
values
  ('cccccccc-0000-4000-8000-000000000001', 'driver@example.com'),
  ('cccccccc-0000-4000-8000-000000000002', 'friend@example.com'),
  ('cccccccc-0000-4000-8000-000000000003', 'fof@example.com'),
  ('cccccccc-0000-4000-8000-000000000004', 'minor@example.com'),
  ('cccccccc-0000-4000-8000-000000000005', 'stranger@example.com');

update public.profiles
set
  display_name = 'Carpooler ' || right(id::text, 1),
  handle = 'carpooler_' || right(id::text, 1),
  city = 'innsbruck',
  ability_level = 'chill',
  is_minor = (right(id::text, 1) = '4')
where id::text like 'cccccccc-%';

insert into public.friendships (requester_id, addressee_id, status)
values
  ('cccccccc-0000-4000-8000-000000000001', 'cccccccc-0000-4000-8000-000000000002', 'accepted'),
  ('cccccccc-0000-4000-8000-000000000002', 'cccccccc-0000-4000-8000-000000000003', 'accepted'),
  ('cccccccc-0000-4000-8000-000000000002', 'cccccccc-0000-4000-8000-000000000004', 'accepted');

select ok(
  (select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.carpools'::regclass),
  'carpools forces row level security'
);

select ok(
  (select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.carpool_requests'::regclass),
  'carpool_requests forces row level security'
);

set local role anon;
select throws_ok($$select * from public.list_carpools()$$, '42501', null, 'anon cannot list carpools');
reset role;

set local role authenticated;
set local request.jwt.claim.sub = 'cccccccc-0000-4000-8000-000000000001';

select lives_ok(
  $$
    insert into public.carpools (role, resort, city, ride_date, departure_point, departure_time, seats, note)
    values ('driver', 'Stubai Glacier', 'innsbruck', current_date + 1, 'Innsbruck Hbf, north exit', '07:30', 1, 'Room for skis')
  $$,
  'an adult can offer seats'
);

select throws_ok(
  $$
    insert into public.carpools (author_id, role, resort, city, ride_date, departure_point, departure_time, seats)
    values ('cccccccc-0000-4000-8000-000000000005', 'driver', 'Stubai', 'innsbruck', current_date + 1, 'Somewhere', '07:00', 2)
  $$,
  '42501',
  null,
  'nobody can post in someone else''s name'
);

select throws_ok($$select * from public.carpools$$, '42501', null, 'carpools cannot be read directly');
select throws_ok($$select * from public.carpool_requests$$, '42501', null, 'carpool requests cannot be read directly');

reset role;
create temp table pool_ids on commit drop as
select (select id from public.carpools where resort = 'Stubai Glacier') as driver_pool;
grant select on pool_ids to authenticated;
set local role authenticated;

set local request.jwt.claim.sub = 'cccccccc-0000-4000-8000-000000000002';

select results_eq(
  $$select departure_point, departure_point_locked from public.list_carpools()$$,
  $$values ('Innsbruck Hbf, north exit'::text, false)$$,
  'a confirmed friend sees the departure point'
);

set local request.jwt.claim.sub = 'cccccccc-0000-4000-8000-000000000003';

select results_eq(
  $$select departure_point, departure_point_locked, requests from public.list_carpools()$$,
  $$values (null::text, true, '[]'::jsonb)$$,
  'an adult friend of a friend sees the offer but not where to meet or who asked'
);

set local request.jwt.claim.sub = 'cccccccc-0000-4000-8000-000000000004';

select is_empty($$select 1 from public.list_carpools()$$, 'a minor friend of a friend does not see an adult''s carpool');
select is(public.request_carpool((select driver_pool from pool_ids)), 'not_found', 'a minor friend of a friend cannot request a seat');

set local request.jwt.claim.sub = 'cccccccc-0000-4000-8000-000000000005';

select is_empty($$select 1 from public.list_carpools()$$, 'a stranger does not see the carpool');

set local request.jwt.claim.sub = 'cccccccc-0000-4000-8000-000000000003';

select is(public.request_carpool((select driver_pool from pool_ids)), 'requested', 'an adult friend of a friend can request a seat');
select is(public.request_carpool((select driver_pool from pool_ids)), 'already_requested', 'requesting twice is a no-op');

select results_eq(
  $$select my_request, departure_point from public.list_carpools()$$,
  $$values ('pending'::text, null::text)$$,
  'a pending request does not unlock the departure point'
);

set local request.jwt.claim.sub = 'cccccccc-0000-4000-8000-000000000002';
select is(public.request_carpool((select driver_pool from pool_ids)), 'requested', 'the friend requests too');

set local request.jwt.claim.sub = 'cccccccc-0000-4000-8000-000000000003';
select is(
  public.respond_carpool_request((select driver_pool from pool_ids), 'cccccccc-0000-4000-8000-000000000003', true),
  'not_found',
  'only the author can accept requests'
);

set local request.jwt.claim.sub = 'cccccccc-0000-4000-8000-000000000001';

select is(
  (select jsonb_array_length(requests) from public.list_carpools()),
  2,
  'the author sees who asked'
);

select is(
  public.respond_carpool_request((select driver_pool from pool_ids), 'cccccccc-0000-4000-8000-000000000003', true),
  'accepted',
  'the author accepts a request'
);

select is(
  public.respond_carpool_request((select driver_pool from pool_ids), 'cccccccc-0000-4000-8000-000000000002', true),
  'full',
  'accepting beyond the offered seats is refused'
);

select is(
  public.respond_carpool_request((select driver_pool from pool_ids), 'cccccccc-0000-4000-8000-000000000002', false),
  'declined',
  'the author declines a request'
);

set local request.jwt.claim.sub = 'cccccccc-0000-4000-8000-000000000003';

select results_eq(
  $$select my_request, departure_point, seats_taken from public.list_carpools()$$,
  $$values ('accepted'::text, 'Innsbruck Hbf, north exit'::text, 1)$$,
  'an accepted rider sees the departure point'
);

select is(public.cancel_carpool((select driver_pool from pool_ids)), false, 'a rider cannot cancel the carpool');

set local request.jwt.claim.sub = 'cccccccc-0000-4000-8000-000000000001';
select is(public.cancel_carpool((select driver_pool from pool_ids)), true, 'the author can cancel the carpool');

reset role;

select * from finish();

rollback;
