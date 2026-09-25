begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

-- H: complete adult host. N: signed up, never finished the profile.
insert into auth.users (id, email)
values
  ('dddddddd-0000-4000-8000-000000000001', 'host@example.com'),
  ('dddddddd-0000-4000-8000-000000000002', 'nameless@example.com');

update public.profiles
set display_name = 'Host', handle = 'host_d', city = 'innsbruck', ability_level = 'chill', is_minor = false
where id = 'dddddddd-0000-4000-8000-000000000001';

insert into public.rides (host_id, resort, city, ability_level, ride_date, meet_time, meet_point, total_spots, visibility, title)
values ('dddddddd-0000-4000-8000-000000000001', 'Nordkette', 'innsbruck', 'chill', current_date + 2, '09:00', 'Seegrube', 4, 'public', 'Open day');

insert into public.carpools (author_id, role, resort, city, ride_date, departure_point, departure_time, seats)
values ('dddddddd-0000-4000-8000-000000000001', 'driver', 'Nordkette', 'innsbruck', current_date + 2, 'Hbf', '08:00', 2);

create temp table ids on commit drop as
select (select id from public.rides limit 1) as ride, (select id from public.carpools limit 1) as pool;
grant select on ids to authenticated;

set local role authenticated;
set local request.jwt.claim.sub = 'dddddddd-0000-4000-8000-000000000002';

select throws_ok(
  $$
    insert into public.rides (resort, city, ability_level, ride_date, meet_time, meet_point, total_spots)
    values ('Stubai', 'innsbruck', 'chill', current_date + 1, '08:00', 'Somewhere', 2)
  $$,
  '42501',
  null,
  'an incomplete profile cannot post a ride'
);

select throws_ok(
  $$
    insert into public.carpools (role, resort, city, ride_date, departure_point, departure_time, seats)
    values ('driver', 'Stubai', 'innsbruck', current_date + 1, 'Hbf', '08:00', 2)
  $$,
  '42501',
  null,
  'an incomplete profile cannot post a carpool'
);

select is(public.join_ride((select ride from ids)), 'profile_incomplete', 'an incomplete profile cannot join a ride');
select is(public.request_friendship('host_d'), 'profile_incomplete', 'an incomplete profile cannot send friend requests');
select is(public.request_carpool((select pool from ids)), 'profile_incomplete', 'an incomplete profile cannot ask for a seat');

reset role;
update public.profiles
set display_name = 'Now Named', handle = 'now_named', city = 'innsbruck', ability_level = 'park'
where id = 'dddddddd-0000-4000-8000-000000000002';
set local role authenticated;
set local request.jwt.claim.sub = 'dddddddd-0000-4000-8000-000000000002';

select is(public.join_ride((select ride from ids)), 'joined', 'once complete, joining works');
select is(public.request_friendship('host_d'), 'requested', 'once complete, friend requests work');

select throws_ok(
  $$select private.has_complete_profile('dddddddd-0000-4000-8000-000000000001')$$,
  '42501',
  null,
  'the profile check itself is not callable by clients'
);

reset role;

select * from finish();

rollback;
