begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

-- adult (1), second adult (2), 15-year-old (3), 17-year-old (4),
-- no birth date (5), 14-year-old (6), adult friend of the 14-year-old (7)
insert into auth.users (id, email)
select ('a0c10000-0000-4000-8000-00000000000' || n)::uuid, 'contact' || n || '@example.com'
from generate_series(1, 7) n;

update public.profiles
set display_name = 'Contact ' || right(id::text, 1), handle = 'contact_' || right(id::text, 1),
    city = 'innsbruck', ability_level = 'chill', onboarding_completed = true
where id::text like 'a0c10000-%';

update public.profiles set birth_date = current_date - interval '30 years' where handle in ('contact_1', 'contact_2', 'contact_7');
update public.profiles set birth_date = current_date - interval '15 years' where handle = 'contact_3';
update public.profiles set birth_date = current_date - interval '17 years' where handle = 'contact_4';
update public.profiles set birth_date = current_date - interval '14 years' where handle = 'contact_6';

-- A friendship from before the rule.
insert into public.friendships (requester_id, addressee_id, status, responded_at)
values ('a0c10000-0000-4000-8000-000000000007', 'a0c10000-0000-4000-8000-000000000006', 'accepted', now());

set local role authenticated;

-- ── An adult cannot start contact with the protected ────────────────
set local request.jwt.claim.sub = 'a0c10000-0000-4000-8000-000000000001';
select is(public.request_friendship('contact_3'), 'not_found', 'an adult cannot ask a 15-year-old');
select is(public.request_friendship('contact_5'), 'not_found', 'nor someone without a birth date');
select is(public.request_friendship('contact_6'), 'not_found', 'nor a 14-year-old');
select is(public.request_friendship('contact_4'), 'requested', 'a 17-year-old can be asked');
select is(public.request_friendship('contact_2'), 'requested', 'adults ask adults as before');

reset role;
select is(
  (select count(*)::integer from public.friendships where requester_id = 'a0c10000-0000-4000-8000-000000000001'),
  2, 'the refused requests left no row');
set local role authenticated;

-- ── The younger person may ask; the adult may accept ────────────────
set local request.jwt.claim.sub = 'a0c10000-0000-4000-8000-000000000003';
select is(public.request_friendship('contact_1'), 'requested', 'a 15-year-old can ask an adult');
set local request.jwt.claim.sub = 'a0c10000-0000-4000-8000-000000000001';
select is(public.request_friendship('contact_3'), 'accepted', 'the adult accepts the request they were sent');

-- ── Not adults: teens among themselves, unknown age ─────────────────
set local request.jwt.claim.sub = 'a0c10000-0000-4000-8000-000000000004';
select is(public.request_friendship('contact_6'), 'requested', 'a 17-year-old can ask a 14-year-old');
set local request.jwt.claim.sub = 'a0c10000-0000-4000-8000-000000000005';
select is(public.request_friendship('contact_6'), 'requested', 'someone without a birth date counts as young, not adult');

-- ── Existing friendships stay ───────────────────────────────────────
set local request.jwt.claim.sub = 'a0c10000-0000-4000-8000-000000000007';
select is(public.request_friendship('contact_6'), 'already_friends', 'a friendship from before the rule stays');

-- ── Turning 16 lifts the rule ───────────────────────────────────────
reset role;
update public.profiles set birth_date = current_date - interval '16 years' where handle = 'contact_6';
set local role authenticated;
set local request.jwt.claim.sub = 'a0c10000-0000-4000-8000-000000000002';
select is(public.request_friendship('contact_6'), 'requested', 'from the 16th birthday an adult can ask');

-- ── A block still wins, and the helper is private ───────────────────
reset role;
insert into public.blocks (blocker_id, blocked_id)
values ('a0c10000-0000-4000-8000-000000000004', 'a0c10000-0000-4000-8000-000000000002');
set local role authenticated;
set local request.jwt.claim.sub = 'a0c10000-0000-4000-8000-000000000002';
select is(public.request_friendship('contact_4'), 'not_found', 'a block still looks like an unknown handle');
select is(public.request_friendship('contact_1'), 'accepted', 'adults still accept each other''s requests');

select throws_ok(
  $$select private.adult_may_not_ask('a0c10000-0000-4000-8000-000000000001', 'a0c10000-0000-4000-8000-000000000003')$$,
  '42501', null, 'clients cannot call the age check themselves');

-- ── Signed out, nothing works ───────────────────────────────────────
reset role;
set local role anon;
select throws_ok($$select public.request_friendship('contact_3')$$, '42501', null, 'anonymous callers are refused');

select * from finish();
rollback;
