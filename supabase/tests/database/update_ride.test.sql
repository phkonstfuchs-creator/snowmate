begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

insert into auth.users (id, email)
values
  ('abababab-0000-4000-8000-000000000001', 'host@example.com'),
  ('abababab-0000-4000-8000-000000000002', 'rider@example.com');

update public.profiles
set display_name = 'Edit ' || right(id::text, 1), handle = 'edit_' || right(id::text, 1),
    city = 'innsbruck', ability_level = 'chill', is_minor = false
where id::text like 'abababab-%';

insert into public.friendships (requester_id, addressee_id, status)
values ('abababab-0000-4000-8000-000000000001', 'abababab-0000-4000-8000-000000000002', 'accepted');

insert into public.rides (host_id, resort, city, ability_level, ride_date, meet_time, meet_point, total_spots)
values ('abababab-0000-4000-8000-000000000001', 'Nordkette', 'innsbruck', 'chill', current_date + 2, '09:00', 'Congress', 3);

insert into public.ride_participants (ride_id, user_id)
select id, 'abababab-0000-4000-8000-000000000002' from public.rides where resort = 'Nordkette' and meet_point = 'Congress';

create temp table ids on commit drop as
select id as ride from public.rides where meet_point = 'Congress';
grant select on ids to authenticated;

set local role authenticated;
set local request.jwt.claim.sub = 'abababab-0000-4000-8000-000000000002';

select is(
  public.update_ride((select ride from ids), '10:00', 'Elsewhere', 3::smallint, null),
  'not_found',
  'a participant cannot edit the host''s ride'
);

set local request.jwt.claim.sub = 'abababab-0000-4000-8000-000000000001';

select is(
  public.update_ride((select ride from ids), '10:00', 'Hungerburg', 0::smallint, null),
  'below_taken',
  'spots cannot drop below the people already in'
);

select is(
  public.update_ride((select ride from ids), '10:30', ' Hungerburg ', 2::smallint, '  '),
  'updated',
  'the host can edit their ride'
);

select results_eq(
  $$select meet_time, meet_point, total_spots::integer, caption from public.list_rides() where id = (select ride from ids)$$,
  $$values ('10:30'::time, 'Hungerburg'::text, 2, null::text)$$,
  'the edit is stored trimmed'
);

select throws_ok(
  $$select public.update_ride((select ride from ids), '10:30', 'x', 2::smallint, null)$$,
  '23514',
  null,
  'the table constraints still apply'
);

reset role;
set local role anon;

select throws_ok(
  $$select public.update_ride(gen_random_uuid(), '10:30', 'Somewhere', 2::smallint, null)$$,
  '42501',
  null,
  'anon cannot edit rides'
);

reset role;

select * from finish();

rollback;
