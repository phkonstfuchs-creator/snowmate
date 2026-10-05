begin;

create extension if not exists pgtap with schema extensions;

select plan(33);

-- me (1), friend (2), friend of friend (3), stranger (4), blocked friend (5)
insert into auth.users (id, email)
select ('e0e0e0e0-0000-4000-8000-00000000000' || n)::uuid, 'loc' || n || '@example.com'
from generate_series(1, 5) n;

update public.profiles
set display_name = 'Rider ' || right(id::text, 1), handle = 'loc_' || right(id::text, 1),
    city = 'innsbruck', ability_level = 'chill', birth_date = date '1990-01-01'
where id::text like 'e0e0e0e0-%';

insert into public.friendships (requester_id, addressee_id, status) values
  ('e0e0e0e0-0000-4000-8000-000000000001', 'e0e0e0e0-0000-4000-8000-000000000002', 'accepted'),
  ('e0e0e0e0-0000-4000-8000-000000000002', 'e0e0e0e0-0000-4000-8000-000000000003', 'accepted'),
  ('e0e0e0e0-0000-4000-8000-000000000005', 'e0e0e0e0-0000-4000-8000-000000000001', 'accepted'),
  ('e0e0e0e0-0000-4000-8000-000000000004', 'e0e0e0e0-0000-4000-8000-000000000003', 'pending');

-- Direct table access is closed.
set local role authenticated;
set local request.jwt.claim.sub = 'e0e0e0e0-0000-4000-8000-000000000001';
select throws_ok($$select * from public.live_locations$$, '42501', null, 'the table is not readable');
select throws_ok(
  $$insert into public.live_locations (user_id, lat, lng, expires_at) values (auth.uid(), 47, 11, now() + interval '1 hour')$$,
  '42501', null, 'the table is not writable');

-- Sharing.
select is(public.my_location_sharing(), null, 'sharing is off by default');
select is(public.share_my_location(47.263456, 11.394321, 15, 60), 'sharing', 'I can start sharing for an hour');
select isnt(public.my_location_sharing(), null, 'my sharing has an end time');
select is(public.share_my_location(47.3, 11.4, 15, null), 'throttled', 'refreshing within 10 s is throttled');
select is(public.share_my_location(91, 11, 15, 60), 'invalid', 'an impossible latitude is refused');
select is(public.share_my_location(47, 11, 15, 721), 'invalid', 'more than 12 hours is refused');
select is(public.share_my_location(47, 11, 15, 2), 'invalid', 'less than 5 minutes is refused');
select is(public.share_my_location(null, 11, 15, 60), 'invalid', 'a missing coordinate is refused');

reset role;
select results_eq(
  $$select lat, lng from public.live_locations where user_id = 'e0e0e0e0-0000-4000-8000-000000000001'$$,
  $$values (47.2635::double precision, 11.3943::double precision)$$,
  'the position is stored rounded to about 10 m'
);

-- Others also share.
insert into public.live_locations (user_id, lat, lng, expires_at)
select id, 47.1, 11.2, now() + interval '1 hour' from public.profiles
where id in ('e0e0e0e0-0000-4000-8000-000000000002', 'e0e0e0e0-0000-4000-8000-000000000003',
             'e0e0e0e0-0000-4000-8000-000000000004', 'e0e0e0e0-0000-4000-8000-000000000005');

-- Who sees whom.
set local role authenticated;
set local request.jwt.claim.sub = 'e0e0e0e0-0000-4000-8000-000000000001';
select results_eq(
  $$select handle from public.list_friend_locations() order by handle$$,
  $$values ('loc_2'::text), ('loc_5'::text)$$,
  'I see confirmed friends only, in both friendship directions'
);

set local request.jwt.claim.sub = 'e0e0e0e0-0000-4000-8000-000000000003';
select is((select count(*)::int from public.list_friend_locations() where handle = 'loc_1'), 0,
  'a friend of a friend does not see me');
select is((select count(*)::int from public.list_friend_locations() where handle = 'loc_4'), 0,
  'a pending request does not show a position');

set local request.jwt.claim.sub = 'e0e0e0e0-0000-4000-8000-000000000004';
select is((select count(*)::int from public.list_friend_locations() where handle = 'loc_1'), 0,
  'a stranger does not see me');

-- Blocking hides at once, both ways.
reset role;
insert into public.blocks (blocker_id, blocked_id)
values ('e0e0e0e0-0000-4000-8000-000000000001', 'e0e0e0e0-0000-4000-8000-000000000005');
set local role authenticated;
set local request.jwt.claim.sub = 'e0e0e0e0-0000-4000-8000-000000000005';
select is((select count(*)::int from public.list_friend_locations() where handle = 'loc_1'), 0,
  'a blocked person does not see me');
set local request.jwt.claim.sub = 'e0e0e0e0-0000-4000-8000-000000000001';
select is((select count(*)::int from public.list_friend_locations() where handle = 'loc_5'), 0,
  'I do not see someone I blocked');

-- Expiry.
reset role;
update public.live_locations set updated_at = now() - interval '2 hours', expires_at = now() - interval '1 minute'
where user_id = 'e0e0e0e0-0000-4000-8000-000000000002';
set local role authenticated;
select is((select count(*)::int from public.list_friend_locations() where handle = 'loc_2'), 0,
  'an expired position is not shown');

-- Stopping.
select lives_ok($$select public.stop_sharing_location()$$, 'I can stop sharing');
select is(public.my_location_sharing(), null, 'after stopping nothing is shared');

-- Only from 16 (ADR 0019): 15-year-old (6), 16 today (7), no birth date (8).
reset role;
insert into auth.users (id, email)
select ('e0e0e0e0-0000-4000-8000-00000000000' || n)::uuid, 'loc' || n || '@example.com'
from generate_series(6, 8) n;
update public.profiles
set display_name = 'Rider ' || right(id::text, 1), handle = 'loc_' || right(id::text, 1),
    city = 'innsbruck', ability_level = 'chill'
where id::text like 'e0e0e0e0-%' and right(id::text, 1) in ('6', '7', '8');
update public.profiles set birth_date = (private.local_today() - interval '16 years' + interval '1 day')::date
where id = 'e0e0e0e0-0000-4000-8000-000000000006';
update public.profiles set birth_date = (private.local_today() - interval '16 years')::date
where id = 'e0e0e0e0-0000-4000-8000-000000000007';
insert into public.friendships (requester_id, addressee_id, status) values
  ('e0e0e0e0-0000-4000-8000-000000000006', 'e0e0e0e0-0000-4000-8000-000000000003', 'accepted');

set local role authenticated;
set local request.jwt.claim.sub = 'e0e0e0e0-0000-4000-8000-000000000006';
select is(public.can_share_my_location(), false, 'someone under 16 may not share');
select is(public.share_my_location(47, 11, 15, 60), 'too_young', 'sharing under 16 is refused');
select results_eq($$select handle from public.list_friend_locations()$$, $$values ('loc_3'::text)$$,
  'someone under 16 still sees confirmed friends');
set local request.jwt.claim.sub = 'e0e0e0e0-0000-4000-8000-000000000007';
select is(public.can_share_my_location(), true, 'from the 16th birthday sharing is allowed');
select is(public.share_my_location(47, 11, 15, 60), 'sharing', 'a 16-year-old can share');
set local request.jwt.claim.sub = 'e0e0e0e0-0000-4000-8000-000000000008';
select is(public.share_my_location(47, 11, 15, 60), 'too_young', 'without a birth date sharing is refused');
reset role;
update public.profiles set is_minor = false where id = 'e0e0e0e0-0000-4000-8000-000000000008';
set local role authenticated;
select is(public.can_share_my_location(), true, 'an account the operator marked adult may share without a birth date');

-- A position stored for someone under 16 is never shown.
reset role;
insert into public.live_locations (user_id, lat, lng, expires_at)
values ('e0e0e0e0-0000-4000-8000-000000000006', 47.1, 11.2, now() + interval '1 hour');
set local role authenticated;
set local request.jwt.claim.sub = 'e0e0e0e0-0000-4000-8000-000000000003';
select is((select count(*)::int from public.list_friend_locations() where handle = 'loc_6'), 0,
  'a position of someone under 16 is not shown to friends');
set local request.jwt.claim.sub = 'e0e0e0e0-0000-4000-8000-000000000006';
select lives_ok($$select public.share_my_location(47, 11, 15, 60)$$, 'a refused share');
reset role;
select is((select count(*)::int from public.live_locations where user_id = 'e0e0e0e0-0000-4000-8000-000000000006'), 0,
  'a refused share removes any stored position');

-- Anonymous callers.
reset role;
set local role anon;
select throws_ok($$select public.list_friend_locations()$$, '42501', null, 'anon cannot list positions');
select throws_ok($$select public.share_my_location(47, 11, 10, 60)$$, '42501', null, 'anon cannot share');
select throws_ok($$select public.can_share_my_location()$$, '42501', null, 'anon cannot ask');
reset role;

select * from finish();
rollback;
