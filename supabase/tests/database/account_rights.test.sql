begin;

create extension if not exists pgtap with schema extensions;

select plan(11);

insert into auth.users (id, email)
values
  ('ffffffff-0000-4000-8000-000000000001', 'leaving@example.com'),
  ('ffffffff-0000-4000-8000-000000000002', 'staying@example.com');

update public.profiles
set display_name = 'Rider ' || right(id::text, 1), handle = 'rights_' || right(id::text, 1),
    city = 'salzburg', ability_level = 'park', is_minor = false
where id::text like 'ffffffff-%';

insert into public.friendships (requester_id, addressee_id)
values ('ffffffff-0000-4000-8000-000000000002', 'ffffffff-0000-4000-8000-000000000001');

insert into public.rides (host_id, resort, city, ability_level, ride_date, meet_time, meet_point, total_spots)
values ('ffffffff-0000-4000-8000-000000000001', 'Zell am See', 'salzburg', 'park', current_date + 3, '09:00', 'Base', 3);

insert into public.carpools (author_id, role, resort, city, ride_date, departure_point, departure_time, seats)
values ('ffffffff-0000-4000-8000-000000000001', 'driver', 'Zell am See', 'salzburg', current_date + 3, 'Salzburg Hbf', '07:00', 2);

insert into public.carpool_requests (carpool_id, user_id)
select id, 'ffffffff-0000-4000-8000-000000000002' from public.carpools where resort = 'Zell am See';

set local role anon;
select throws_ok($$select public.delete_my_account()$$, '42501', null, 'anon cannot delete accounts');
select throws_ok($$select public.export_my_data()$$, '42501', null, 'anon cannot export data');
reset role;

-- Model an active authenticated session for the session-bound account export.
insert into auth.sessions(id,user_id) select id,id from auth.users on conflict (id) do nothing;
set local role authenticated;
set local request.jwt.claim.sub = 'ffffffff-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"role":"authenticated","session_id":"ffffffff-0000-4000-8000-000000000001"}';

select results_eq(
  $$select friend_requests, carpool_requests from public.my_pending_counts()$$,
  $$values (1, 1)$$,
  'pending counts cover friend requests and requests on own carpools'
);

select is(
  (public.export_my_data() -> 'profile' ->> 'handle'),
  'rights_1',
  'the export contains the profile'
);

select is(
  jsonb_array_length(public.export_my_data() -> 'rides_hosted'),
  1,
  'the export contains hosted rides'
);

select is(
  (public.export_my_data() -> 'rides_hosted' -> 0 ->> 'meet_point'),
  'Base',
  'the export includes the caller''s own meeting points'
);

select is(
  (public.export_my_data() -> 'friendships' -> 0 ->> 'direction'),
  'incoming',
  'the export contains friendships'
);

set local request.jwt.claim.sub = 'ffffffff-0000-4000-8000-000000000002';
set local request.jwt.claims = '{"role":"authenticated","session_id":"ffffffff-0000-4000-8000-000000000002"}';

select is(
  (public.export_my_data() -> 'carpool_requests' -> 0 ->> 'status'),
  'pending',
  'the export contains the caller''s carpool requests'
);

set local request.jwt.claim.sub = 'ffffffff-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"role":"authenticated","session_id":"ffffffff-0000-4000-8000-000000000001"}';

select is(public.delete_my_account(), true, 'a user can delete their own account');

reset role;

select is(
  (select count(*)::integer from public.profiles where id = 'ffffffff-0000-4000-8000-000000000001')
  + (select count(*)::integer from public.rides where host_id = 'ffffffff-0000-4000-8000-000000000001')
  + (select count(*)::integer from public.carpools where author_id = 'ffffffff-0000-4000-8000-000000000001'),
  0,
  'deleting the account removes the profile, rides and carpools'
);

select is(
  (select count(*)::integer from auth.users where id = 'ffffffff-0000-4000-8000-000000000002'),
  1,
  'other accounts are untouched'
);

select * from finish();

rollback;
