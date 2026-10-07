begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, email) values
  ('a8a8a8a8-0000-4000-8000-0000000000dd', 'date-bounds@example.com');
update public.profiles set display_name = 'Date Bounds', handle = 'date_bounds',
  city = 'innsbruck', ability_level = 'chill', onboarding_completed = true
where id = 'a8a8a8a8-0000-4000-8000-0000000000dd';

select throws_ok($$insert into public.rides (host_id, resort, city, ability_level, ride_date, meet_time, meet_point, total_spots)
  values ('a8a8a8a8-0000-4000-8000-0000000000dd', 'Nordkette', 'innsbruck', 'chill',
  private.local_today() - 1, '09:00', 'Seegrube', 3)$$, '23514', null,
  'past ride date rejected');
select throws_ok($$insert into public.rides (host_id, resort, city, ability_level, ride_date, meet_time, meet_point, total_spots)
  values ('a8a8a8a8-0000-4000-8000-0000000000dd', 'Nordkette', 'innsbruck', 'chill',
  private.local_today() + 366, '09:00', 'Seegrube', 3)$$, '23514', null,
  'ride beyond one year rejected');
select throws_ok($$insert into public.carpools (author_id, role, resort, city, ride_date, departure_point, departure_time, seats)
  values ('a8a8a8a8-0000-4000-8000-0000000000dd', 'driver', 'Nordkette', 'innsbruck',
  private.local_today() - 1, 'City center', '09:00', 3)$$, '23514', null,
  'past carpool date rejected');
select throws_ok($$insert into public.carpools (author_id, role, resort, city, ride_date, departure_point, departure_time, seats)
  values ('a8a8a8a8-0000-4000-8000-0000000000dd', 'driver', 'Nordkette', 'innsbruck',
  private.local_today() + 366, 'City center', '09:00', 3)$$, '23514', null,
  'carpool beyond one year rejected');

insert into public.rides (id, host_id, resort, city, ability_level, ride_date, meet_time, meet_point, total_spots)
values ('a8a8a8a8-0000-4000-8000-0000000000de', 'a8a8a8a8-0000-4000-8000-0000000000dd',
  'Nordkette', 'innsbruck', 'chill', private.local_today(), '09:00', 'Seegrube', 3);
insert into public.carpools (id, author_id, role, resort, city, ride_date, departure_point, departure_time, seats)
values ('a8a8a8a8-0000-4000-8000-0000000000df', 'a8a8a8a8-0000-4000-8000-0000000000dd',
  'driver', 'Nordkette', 'innsbruck', private.local_today(), 'City center', '09:00', 3);
select throws_ok($$update public.rides set ride_date = private.local_today() + 366
  where id = 'a8a8a8a8-0000-4000-8000-0000000000de'$$, '23514', null,
  'updating a ride to a distant date is rejected');
select throws_ok($$update public.carpools set ride_date = private.local_today() - 1
  where id = 'a8a8a8a8-0000-4000-8000-0000000000df'$$, '23514', null,
  'updating a carpool to the past is rejected');

select * from finish();
rollback;
