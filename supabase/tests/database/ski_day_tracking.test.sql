begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

insert into auth.users (id, email)
select ('9058c000-0000-4000-8000-00000000000' || n)::uuid, 'track' || n || '@example.com'
from generate_series(1, 2) n;

set local role authenticated;
set local request.jwt.claim.sub = '9058c000-0000-4000-8000-000000000001';

select throws_ok($$select * from public.ski_days$$, '42501', null, 'ski days are not readable directly');
select throws_ok($$insert into public.ski_days (user_id, started_at, ended_at, distance_m, vertical_m, max_speed_kmh, runs)
  values (auth.uid(), now() - interval '2 hours', now(), 1, 1, 1, 1)$$, '42501', null, 'ski days are not writable directly');

select is(public.save_ski_day('Nordkette', now() - interval '5 hours', now() - interval '1 hour', 42000, 5200, 87.46, 14), 'saved', 'I save a day');
select is(public.save_ski_day('Nordkette', now() - interval '5 hours', now() - interval '1 hour', 42000, 5200, 87.46, 14), 'saved', 'saving the same day again is harmless');
select is((select count(*)::int from public.list_my_ski_days()), 1, 'and it is stored once');
select results_eq($$select resort, distance_m, vertical_m, max_speed_kmh, runs from public.list_my_ski_days()$$,
  $$values ('Nordkette'::text, 42000, 5200, 87.5::numeric, 14)$$, 'the summary is stored, speed to one decimal');

-- Plausibility.
select is(public.save_ski_day(null, now() - interval '2 hours', now(), 1000, 100, 151, 1), 'invalid', 'over 150 km/h is refused');
select is(public.save_ski_day(null, now() - interval '2 hours', now(), 300000, 100, 50, 1), 'invalid', 'over 250 km is refused');
select is(public.save_ski_day(null, now() - interval '2 hours', now(), 1000, 30000, 50, 1), 'invalid', 'over 25 000 m vertical is refused');
select is(public.save_ski_day(null, now() - interval '20 hours', now(), 1000, 100, 50, 1), 'invalid', 'more than 16 hours is refused');
select is(public.save_ski_day(null, now() - interval '3 days', now() - interval '3 days' + interval '1 hour', 1000, 100, 50, 1), 'invalid', 'days long past are refused');
select is(public.save_ski_day('<b>x</b>', now() - interval '2 hours', now(), 1000, 100, 50, 1), 'invalid', 'markup in the resort is refused');

-- Rate limit: 5 a day.
select is((select count(*)::int from generate_series(1, 4) n
  where public.save_ski_day(null, now() - (n || ' minutes')::interval - interval '1 hour', now() - (n || ' minutes')::interval, 100, 0, 10, 0) = 'saved'), 4, 'up to five days in 24 hours');
select is(public.save_ski_day(null, now() - interval '30 minutes', now(), 100, 0, 10, 0), 'rate_limited', 'the sixth is refused');

-- Only the owner.
create temp table my_day as select id from public.list_my_ski_days() limit 1;
grant select on my_day to authenticated;
set local request.jwt.claim.sub = '9058c000-0000-4000-8000-000000000002';
select is((select count(*)::int from public.list_my_ski_days()), 0, 'nobody else sees my days');
select ok(not public.delete_my_ski_day((select id from my_day)), 'nor deletes them');

set local request.jwt.claim.sub = '9058c000-0000-4000-8000-000000000001';
select is(jsonb_array_length(public.export_my_data() -> 'ski_days'), 5, 'the export lists my days');
select ok(public.delete_my_ski_day((select id from my_day)), 'I delete my own day');

select * from finish();
rollback;
