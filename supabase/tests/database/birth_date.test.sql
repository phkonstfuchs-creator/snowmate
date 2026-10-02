begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

insert into auth.users (id, email)
values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'adult@example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'teen@example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000003', 'kid@example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000004', 'birthday@example.com');

select is(
  (select bool_and(is_minor) from public.profiles where id::text like 'bbbbbbbb-%'),
  true,
  'without a birth date everyone is treated as a minor'
);

set local role anon;
select throws_ok($$select public.set_my_birth_date('2000-01-01')$$, '42501', null, 'anon cannot set a birth date');
select throws_ok($$select public.refresh_my_age()$$, '42501', null, 'anon cannot refresh an age');
reset role;

set local role authenticated;

-- Adult
set local request.jwt.claim.sub = 'bbbbbbbb-0000-4000-8000-000000000001';
select is(public.set_my_birth_date('2000-05-20'), 'set', 'an adult can set their birth date');
select is((select is_minor from public.profiles where id = auth.uid()), false, 'an adult birth date clears is_minor');
select is(public.set_my_birth_date('1990-01-01'), 'already_set', 'the birth date can only be set once');
select is((select birth_date from public.profiles where id = auth.uid()), date '2000-05-20', 'a second call changes nothing');
select throws_ok(
  $$update public.profiles set birth_date = '2015-01-01' where id = auth.uid()$$,
  '42501', null, 'the column cannot be written directly'
);
select throws_ok(
  $$update public.profiles set is_minor = false where id = auth.uid()$$,
  '42501', null, 'is_minor cannot be written directly'
);
select is(
  (select count(*)::int from public.profiles where birth_date is not null),
  1,
  'a user reads only their own birth date'
);

-- Teen: 16 years old
set local request.jwt.claim.sub = 'bbbbbbbb-0000-4000-8000-000000000002';
select is(
  public.set_my_birth_date(((now() at time zone 'Europe/Vienna')::date - interval '16 years')::date),
  'set',
  'a 16-year-old can set their birth date'
);
select is((select is_minor from public.profiles where id = auth.uid()), true, 'a 16-year-old stays a minor');

-- Under 14 and nonsense dates
set local request.jwt.claim.sub = 'bbbbbbbb-0000-4000-8000-000000000003';
select is(
  public.set_my_birth_date(((now() at time zone 'Europe/Vienna')::date - interval '13 years')::date),
  'too_young',
  'under 14 is refused'
);
select is(public.set_my_birth_date(((now() at time zone 'Europe/Vienna')::date + 1)), 'invalid', 'a future date is refused');
select is((select birth_date from public.profiles where id = auth.uid()), null, 'a refused date is not stored');

reset role;

-- Turning 18: stored as minor (set before the birthday), refreshed after.
update public.profiles
set birth_date = ((now() at time zone 'Europe/Vienna')::date - interval '18 years')::date
where id = 'bbbbbbbb-0000-4000-8000-000000000004';
update public.profiles set is_minor = true where id = 'bbbbbbbb-0000-4000-8000-000000000004';

set local role authenticated;
set local request.jwt.claim.sub = 'bbbbbbbb-0000-4000-8000-000000000004';
select public.refresh_my_age();
select is((select is_minor from public.profiles where id = auth.uid()), false, 'refresh_my_age switches someone who has turned 18');

select * from finish();
rollback;
