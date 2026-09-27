begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

-- Host H (adult), friend F, friend-of-friend G, second friend-of-friend K.
insert into auth.users (id, email)
values
  ('acacacac-0000-4000-8000-000000000001', 'host@example.com'),
  ('acacacac-0000-4000-8000-000000000002', 'friend@example.com'),
  ('acacacac-0000-4000-8000-000000000003', 'fof@example.com'),
  ('acacacac-0000-4000-8000-000000000004', 'fof2@example.com');

update public.profiles
set display_name = 'Req ' || right(id::text, 1), handle = 'req_' || right(id::text, 1),
    city = 'innsbruck', ability_level = 'chill', is_minor = false
where id::text like 'acacacac-%';

insert into public.friendships (requester_id, addressee_id, status)
values
  ('acacacac-0000-4000-8000-000000000001', 'acacacac-0000-4000-8000-000000000002', 'accepted'),
  ('acacacac-0000-4000-8000-000000000002', 'acacacac-0000-4000-8000-000000000003', 'accepted'),
  ('acacacac-0000-4000-8000-000000000002', 'acacacac-0000-4000-8000-000000000004', 'accepted');

insert into public.rides (host_id, resort, city, ability_level, ride_date, meet_time, meet_point, total_spots)
values ('acacacac-0000-4000-8000-000000000001', 'Nordkette', 'innsbruck', 'chill', current_date + 2, '09:00', 'Seegrube', 2);

create temp table ids on commit drop as select id as ride from public.rides where meet_point = 'Seegrube';
grant select on ids to authenticated;

set local role authenticated;

set local request.jwt.claim.sub = 'acacacac-0000-4000-8000-000000000002';
select is(public.join_ride((select ride from ids)), 'joined', 'a confirmed friend joins straight away');

set local request.jwt.claim.sub = 'acacacac-0000-4000-8000-000000000003';
select is(public.join_ride((select ride from ids)), 'requested', 'a friend of a friend asks instead of joining');
select is(public.join_ride((select ride from ids)), 'already_requested', 'asking twice is a no-op');

select results_eq(
  $$select meet_point, my_status, is_joined, taken_spots from public.list_rides() where id = (select ride from ids)$$,
  $$values (null::text, 'pending'::text, false, 1)$$,
  'a pending request neither unlocks the meeting point nor takes a spot'
);

set local request.jwt.claim.sub = 'acacacac-0000-4000-8000-000000000004';
select is(public.join_ride((select ride from ids)), 'requested', 'a second friend of a friend asks too');

select is(
  public.respond_ride_request((select ride from ids), 'acacacac-0000-4000-8000-000000000003', true),
  'not_found',
  'only the host can answer requests'
);

set local request.jwt.claim.sub = 'acacacac-0000-4000-8000-000000000002';
select is(
  (select requests from public.list_rides() where id = (select ride from ids)),
  '[]'::jsonb,
  'participants do not see who is asking'
);

set local request.jwt.claim.sub = 'acacacac-0000-4000-8000-000000000001';

select is(
  (select jsonb_array_length(requests) from public.list_rides() where id = (select ride from ids)),
  2,
  'the host sees both requests'
);

select is(
  (select ride_requests from public.my_pending_counts()),
  2,
  'the host''s badge counts open ride requests'
);

select is(
  public.respond_ride_request((select ride from ids), 'acacacac-0000-4000-8000-000000000003', true),
  'accepted',
  'the host lets a friend of a friend in'
);

select is(
  public.respond_ride_request((select ride from ids), 'acacacac-0000-4000-8000-000000000004', true),
  'full',
  'accepting beyond the spots is refused'
);

set local request.jwt.claim.sub = 'acacacac-0000-4000-8000-000000000003';

select results_eq(
  $$select meet_point, is_joined from public.list_rides() where id = (select ride from ids)$$,
  $$values ('Seegrube'::text, true)$$,
  'once accepted, the meeting point unlocks'
);

reset role;

select * from finish();

rollback;
