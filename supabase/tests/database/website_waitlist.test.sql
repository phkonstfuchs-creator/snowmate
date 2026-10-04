begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

-- Clients cannot touch the waitlist at all.
set local role anon;
select throws_ok($$select * from public.pistl_website_waitlist$$, '42501', null, 'anon cannot read the waitlist');
select throws_ok(
  $$select public.pistl_join_waitlist('a@example.com', false, repeat('a', 64))$$,
  '42501', null, 'anon cannot call the join function');
reset role;
set local role authenticated;
select throws_ok($$select * from public.pistl_website_rate_limits$$, '42501', null, 'signed-in users cannot read the limits');
select throws_ok(
  $$select public.pistl_join_waitlist('a@example.com', false, repeat('a', 64))$$,
  '42501', null, 'signed-in users cannot call the join function');
reset role;

-- The website server (service role) can.
set local role service_role;
select is(public.pistl_join_waitlist('lena@example.com', false, repeat('a', 64)), 'accepted', 'a valid signup is accepted');
select throws_ok(
  $$select public.pistl_join_waitlist('Lena@Example.com', false, repeat('a', 64))$$,
  'P0001', 'Invalid input', 'an address that is not normalised is refused');
select throws_ok(
  $$select public.pistl_join_waitlist('not-an-email', false, repeat('a', 64))$$,
  'P0001', 'Invalid input', 'something that is not an address is refused');
select throws_ok(
  $$select public.pistl_join_waitlist('max@example.com', false, 'raw-ip-1.2.3.4')$$,
  'P0001', 'Invalid input', 'only a 64-character digest is accepted as rate key, never a raw IP');
select is(public.pistl_join_waitlist('lena@example.com', true, repeat('a', 64)), 'accepted',
  'signing up again is accepted without revealing the earlier signup');
reset role;

select results_eq(
  $$select early_access, early_access_consent_at is not null, consent_version from public.pistl_website_waitlist where email = 'lena@example.com'$$,
  $$values (true, true, 'waitlist-v1-2026-10-04'::text)$$,
  'opting into Early Access later records its own consent time'
);
select is((select count(*)::int from public.pistl_website_waitlist), 1, 'a repeated signup does not create a duplicate');

-- Five attempts an hour per visitor digest.
set local role service_role;
select is(public.pistl_join_waitlist('c@example.com', false, repeat('b', 64)), 'accepted', 'attempt 1');
select lives_ok($$select public.pistl_join_waitlist('d' || n || '@example.com', false, repeat('b', 64)) from generate_series(1, 4) n$$,
  'attempts 2 to 5');
select is(public.pistl_join_waitlist('f@example.com', false, repeat('b', 64)), 'rate_limited', 'the sixth attempt in an hour is refused');
reset role;

select * from finish();
rollback;
