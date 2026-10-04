begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

insert into auth.users (id, email) values ('f0f0f0f0-0000-4000-8000-000000000001', 'text@example.com');
update public.profiles
set display_name = 'Text Rider', handle = 'text_rider', city = 'innsbruck', ability_level = 'chill', is_minor = false
where id = 'f0f0f0f0-0000-4000-8000-000000000001';

set local role authenticated;
set local request.jwt.claim.sub = 'f0f0f0f0-0000-4000-8000-000000000001';

select lives_ok(
  $$update public.profiles set bio = E'First line\nsecond line' where id = auth.uid()$$,
  'a bio may contain line breaks');
select throws_ok(
  $$update public.profiles set bio = E'hidden‮text' where id = auth.uid()$$,
  '23514', null, 'a bidi override in the bio is refused');
select throws_ok(
  $$update public.profiles set bio = E'bell\x07' where id = auth.uid()$$,
  '23514', null, 'a control character in the bio is refused');

select lives_ok(
  $$insert into public.rides (resort, city, ability_level, ride_date, meet_time, meet_point, total_spots, caption)
    values ('Axamer Lizum', 'innsbruck', 'chill', current_date + 1, '09:00', 'Base station', 3, E'Plan:\n<script>alert(1)</script>')$$,
  'markup is stored as plain text (React escapes it on output)');
select throws_ok(
  $$insert into public.rides (resort, city, ability_level, ride_date, meet_time, meet_point, total_spots)
    values ('Axamer Lizum', 'innsbruck', 'chill', current_date + 1, '09:00', E'Base⁦station', 3)$$,
  '23514', null, 'a bidi isolate in the meeting point is refused');
select throws_ok(
  $$insert into public.carpools (role, resort, city, ride_date, departure_point, departure_time, seats)
    values ('driver', 'Axamer Lizum', 'innsbruck', current_date + 1, E'Hbf\x01', '07:00', 2)$$,
  '23514', null, 'a control character in a pickup spot is refused');

select * from finish();
rollback;
