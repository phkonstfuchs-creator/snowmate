begin;

create extension if not exists pgtap with schema extensions;

select plan(31);

-- Clients cannot touch the waitlist at all.
set local role anon;
select throws_ok($$select * from public.pistl_website_waitlist$$, '42501', null, 'anon cannot read the waitlist');
select throws_ok(
  $$select public.pistl_request_waitlist('a@example.com', false, repeat('a', 64), repeat('1', 64))$$,
  '42501', null, 'anon cannot call the request function');
select throws_ok(
  $$select public.pistl_confirm_waitlist(repeat('1', 64))$$,
  '42501', null, 'anon cannot confirm');
reset role;
set local role authenticated;
select throws_ok($$select * from public.pistl_website_rate_limits$$, '42501', null, 'signed-in users cannot read the limits');
select throws_ok(
  $$select public.pistl_request_waitlist('a@example.com', false, repeat('a', 64), repeat('1', 64))$$,
  '42501', null, 'signed-in users cannot call the request function');
select throws_ok(
  $$select public.pistl_release_waitlist_token(repeat('1', 64))$$,
  '42501', null, 'signed-in users cannot release a token');
reset role;

-- Input checks.
set local role service_role;
select throws_ok(
  $$select public.pistl_request_waitlist('Lena@Example.com', false, repeat('a', 64), repeat('1', 64))$$,
  'P0001', 'Invalid input', 'an address that is not normalised is refused');
select throws_ok(
  $$select public.pistl_request_waitlist('not-an-email', false, repeat('a', 64), repeat('1', 64))$$,
  'P0001', 'Invalid input', 'something that is not an address is refused');
select throws_ok(
  $$select public.pistl_request_waitlist('max@example.com', false, 'raw-ip-1.2.3.4', repeat('1', 64))$$,
  'P0001', 'Invalid input', 'only a 64-character digest is accepted as rate key, never a raw IP');
select throws_ok(
  $$select public.pistl_request_waitlist('max@example.com', false, repeat('a', 64), 'raw-token')$$,
  'P0001', 'Invalid input', 'only a token digest is stored, never a raw token');

-- A new signup is pending until the link is used.
select is(public.pistl_request_waitlist('lena@example.com', false, repeat('a', 64), repeat('1', 64)), 'send',
  'a new signup asks for a confirmation email');
reset role;
select results_eq(
  $$select confirmed_at is null, confirm_token_hash, consent_version from public.pistl_website_waitlist where email = 'lena@example.com'$$,
  $$values (true, repeat('1', 64), 'waitlist-v2-2026-10-05'::text)$$,
  'the signup is stored unconfirmed with the token digest'
);

set local role service_role;
select is(public.pistl_request_waitlist('lena@example.com', true, repeat('a', 64), repeat('2', 64)), 'wait',
  'a second signup within five minutes sends no further email');
select is(public.pistl_confirm_waitlist(repeat('9', 64)), 'invalid', 'an unknown token confirms nothing');
select is(public.pistl_confirm_waitlist('not-a-digest'), 'invalid', 'a malformed token confirms nothing');
select is(public.pistl_confirm_waitlist(repeat('1', 64)), 'confirmed', 'the emailed link confirms the signup');
select is(public.pistl_confirm_waitlist(repeat('1', 64)), 'invalid', 'a link works only once');
select is(public.pistl_request_waitlist('lena@example.com', true, repeat('a', 64), repeat('3', 64)), 'confirmed',
  'a confirmed address gets no new email');
reset role;
select results_eq(
  $$select confirmed_at is not null, confirm_token_hash is null, early_access from public.pistl_website_waitlist where email = 'lena@example.com'$$,
  $$values (true, true, false)$$,
  'the open form cannot change a confirmed signup'
);
select is((select count(*)::int from public.pistl_website_waitlist), 1, 'a repeated signup does not create a duplicate');

-- After the five-minute pause a pending signup gets a fresh link; the old one stops working.
insert into public.pistl_website_waitlist (email, confirm_token_hash, confirm_sent_at)
values ('tom@example.com', repeat('4', 64), now() - interval '10 minutes');
set local role service_role;
select is(public.pistl_request_waitlist('tom@example.com', true, repeat('c', 64), repeat('5', 64)), 'send',
  'a pending signup gets a new link after the pause');
select is(public.pistl_confirm_waitlist(repeat('4', 64)), 'invalid', 'the replaced link no longer works');
reset role;
select results_eq(
  $$select early_access, early_access_consent_at is not null from public.pistl_website_waitlist where email = 'tom@example.com'$$,
  $$values (true, true)$$,
  'opting into Early Access records its own consent time'
);

-- A failed email releases the token, so the next attempt sends at once.
set local role service_role;
select lives_ok($$select public.pistl_release_waitlist_token(repeat('5', 64))$$, 'the token can be released');
select is(public.pistl_confirm_waitlist(repeat('5', 64)), 'invalid', 'a released token confirms nothing');
select is(public.pistl_request_waitlist('tom@example.com', true, repeat('c', 64), repeat('6', 64)), 'send',
  'after a release the next attempt sends again');
reset role;

-- Links expire after seven days; unconfirmed signups are deleted then.
insert into public.pistl_website_waitlist (email, confirm_token_hash, confirm_sent_at, created_at)
values ('old@example.com', repeat('7', 64), now() - interval '8 days', now() - interval '8 days');
set local role service_role;
select is(public.pistl_confirm_waitlist(repeat('7', 64)), 'invalid', 'a link older than seven days does not confirm');
select is(public.pistl_request_waitlist('new@example.com', false, repeat('d', 64), repeat('8', 64)), 'send', 'another signup');
reset role;
select is((select count(*)::int from public.pistl_website_waitlist where email = 'old@example.com'), 0,
  'unconfirmed signups older than seven days are deleted');

-- Five attempts an hour per visitor digest.
set local role service_role;
select is(
  (select count(*)::int from generate_series(1, 5) n
   where public.pistl_request_waitlist('r' || n || '@example.com', false, repeat('b', 64), md5(n::text) || md5(n::text)) = 'send'),
  5, 'five attempts in an hour are allowed');
select is(public.pistl_request_waitlist('f@example.com', false, repeat('b', 64), repeat('e', 64)), 'rate_limited',
  'the sixth attempt in an hour is refused');
reset role;

select * from finish();
rollback;
