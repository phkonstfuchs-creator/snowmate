begin;

create extension if not exists pgtap with schema extensions;
select plan(41);

select is(private.lift_meetup_wait_minutes('2026-01-06 08:30+00'::timestamptz), 4,
  'Vienna weekday morning baseline is four minutes');
select is(private.lift_meetup_wait_minutes('2026-01-06 11:30+00'::timestamptz), 2,
  'Vienna weekday midday baseline is two minutes');
select is(private.lift_meetup_wait_minutes('2026-01-06 05:30+00'::timestamptz), 1,
  'Vienna off-peak baseline is one minute');
select is(private.lift_meetup_wait_minutes('2026-01-10 08:30+00'::timestamptz), 10,
  'Vienna weekend morning adds six minutes');

insert into auth.users (id, email)
select ('f1f1f1f1-0000-4000-8000-00000000000' || n)::uuid, 'lift' || n || '@example.com'
from generate_series(1, 6) n;

update public.profiles
set display_name = 'Lift Rider ' || right(id::text, 1),
    handle = 'lift_' || right(id::text, 1),
    city = 'innsbruck', ability_level = 'chill', birth_date = date '1990-01-01'
where id::text like 'f1f1f1f1-%';

update public.profiles
set birth_date = (private.local_today() - interval '16 years' + interval '1 day')::date
where id = 'f1f1f1f1-0000-4000-8000-000000000006';

insert into public.friendships (requester_id, addressee_id, status) values
  ('f1f1f1f1-0000-4000-8000-000000000001', 'f1f1f1f1-0000-4000-8000-000000000002', 'accepted'),
  ('f1f1f1f1-0000-4000-8000-000000000002', 'f1f1f1f1-0000-4000-8000-000000000003', 'accepted'),
  ('f1f1f1f1-0000-4000-8000-000000000004', 'f1f1f1f1-0000-4000-8000-000000000001', 'pending'),
  ('f1f1f1f1-0000-4000-8000-000000000006', 'f1f1f1f1-0000-4000-8000-000000000002', 'accepted');

-- Model an active authenticated session for the session-bound account export.
insert into auth.sessions(id,user_id) select id,id from auth.users on conflict (id) do nothing;
set local role authenticated;
set local request.jwt.claim.sub = 'f1f1f1f1-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"role":"authenticated","session_id":"f1f1f1f1-0000-4000-8000-000000000001"}';
select throws_ok($$select * from private.lift_meetup_lifts$$, '42501', null,
  'client cannot read the private lift allowlist');
select throws_ok($$select * from public.lift_meetups$$, '42501', null, 'client cannot read meetup table');
select throws_ok($$insert into public.lift_meetups (user_id, resort, lift_id, arrival_at, expires_at) values (auth.uid(), 'Nordkette', 'osm-way-25170582', now() + interval '10 minutes', now() + interval '30 minutes')$$,
  '42501', null, 'client cannot write meetup table');
select is((select count(*)::int from public.my_lift_meetup()), 0, 'off by default');
select is(public.start_my_lift_meetup('Nordkette', 'osm-way-25170582'), 'sharing', 'starts a meetup');
select is(to_regprocedure('public.start_my_lift_meetup(text,text,timestamp with time zone)') is null, true,
  'no RPC overload accepts a forged arrival');
select throws_ok($$select public.start_my_lift_meetup('Nordkette', 'osm-way-25170582', now() + interval '60 minutes')$$,
  '42883', null, 'a direct caller cannot forge an ETA');
reset role;
select is((select abs(extract(epoch from (m.arrival_at - (m.started_at +
  (private.lift_meetup_wait_minutes(m.started_at) + 5.33) * interval '1 minute')))) < 0.001
  from public.lift_meetups m where m.user_id = 'f1f1f1f1-0000-4000-8000-000000000001'), true,
  'ETA uses trusted lift duration and Vienna wait');
set local role authenticated;
select is((select count(*)::int from public.my_lift_meetup()), 1, 'owner can read current meetup');
select is(public.start_my_lift_meetup('Nordkette', 'osm-way-25282282'), 'sharing', 'starting another replaces previous');
select is((select lift_id from public.my_lift_meetup()), 'osm-way-25282282', 'replacement has latest lift');
select is((select arrival_at <= started_at + interval '30 minutes' from public.my_lift_meetup()), true,
  'server-computed ETA remains inside the checked time window');
select is(public.start_my_lift_meetup('', 'osm-way-25170582'), 'invalid', 'empty resort rejected');
select is(public.start_my_lift_meetup('Nordkette', ''), 'invalid', 'empty lift rejected');
select is(public.start_my_lift_meetup('Nordkette', repeat('x', 101)), 'invalid', 'oversized id rejected');
select is(public.start_my_lift_meetup('Nordkette', 'osm-way-99999999'), 'invalid', 'unknown OSM lift rejected');

set local request.jwt.claim.sub = 'f1f1f1f1-0000-4000-8000-000000000002';
set local request.jwt.claims = '{"role":"authenticated","session_id":"f1f1f1f1-0000-4000-8000-000000000002"}';
select results_eq($$select handle from public.list_friend_lift_meetups()$$,
  $$values ('lift_1'::text)$$, 'confirmed friend sees meetup');
select is(public.start_my_lift_meetup('Nordkette', 'osm-way-25170582'), 'sharing', 'friend can share in reverse direction');
set local request.jwt.claim.sub = 'f1f1f1f1-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"role":"authenticated","session_id":"f1f1f1f1-0000-4000-8000-000000000001"}';
select is((select count(*)::int from public.list_friend_lift_meetups() where handle = 'lift_2'), 1,
  'accepted friendship works in both directions');
reset role;
update public.lift_meetups set expires_at = now() - interval '1 second',
  started_at = now() - interval '30 minutes', arrival_at = now() - interval '20 minutes'
where user_id = 'f1f1f1f1-0000-4000-8000-000000000002';
set local role authenticated;
select is((select count(*)::int from public.list_friend_lift_meetups() where handle = 'lift_2'), 0,
  'expired meetup is hidden');
reset role;
select is((select count(*)::int from public.lift_meetups where user_id = 'f1f1f1f1-0000-4000-8000-000000000002'), 0,
  'read purges expired meetup from storage');
set local role authenticated;
set local request.jwt.claim.sub = 'f1f1f1f1-0000-4000-8000-000000000002';
set local request.jwt.claims = '{"role":"authenticated","session_id":"f1f1f1f1-0000-4000-8000-000000000002"}';
select is(public.start_my_lift_meetup('Nordkette', 'osm-way-25170582'), 'sharing',
  'expired meetup can be replaced');
set local request.jwt.claim.sub = 'f1f1f1f1-0000-4000-8000-000000000003';
set local request.jwt.claims = '{"role":"authenticated","session_id":"f1f1f1f1-0000-4000-8000-000000000003"}';
select is((select count(*)::int from public.list_friend_lift_meetups() where handle = 'lift_1'), 0,
  'friend of friend cannot see that meetup');
set local request.jwt.claim.sub = 'f1f1f1f1-0000-4000-8000-000000000004';
set local request.jwt.claims = '{"role":"authenticated","session_id":"f1f1f1f1-0000-4000-8000-000000000004"}';
select is((select count(*)::int from public.list_friend_lift_meetups()), 0, 'pending requester cannot see meetup');
set local request.jwt.claim.sub = 'f1f1f1f1-0000-4000-8000-000000000005';
set local request.jwt.claims = '{"role":"authenticated","session_id":"f1f1f1f1-0000-4000-8000-000000000005"}';
select is((select count(*)::int from public.list_friend_lift_meetups()), 0, 'stranger cannot see meetup');

set local request.jwt.claim.sub = 'f1f1f1f1-0000-4000-8000-000000000006';
set local request.jwt.claims = '{"role":"authenticated","session_id":"f1f1f1f1-0000-4000-8000-000000000006"}';
select is(public.start_my_lift_meetup('Nordkette', 'osm-way-25170582'), 'too_young', 'under 16 cannot share');
select is((select count(*)::int from public.list_friend_lift_meetups() where handle = 'lift_2'), 1,
  'under 16 can still see a confirmed friend');

reset role;
insert into public.lift_meetups (user_id, resort, lift_id, arrival_at, expires_at)
values ('f1f1f1f1-0000-4000-8000-000000000006', 'Nordkette', 'osm-way-25170582',
        now() + interval '10 minutes', now() + interval '30 minutes');
set local role authenticated;
select is((select count(*)::int from public.my_lift_meetup()), 0,
  'a previously stored under-16 status is hidden from its owner');
set local request.jwt.claim.sub = 'f1f1f1f1-0000-4000-8000-000000000002';
set local request.jwt.claims = '{"role":"authenticated","session_id":"f1f1f1f1-0000-4000-8000-000000000002"}';
select is((select count(*)::int from public.list_friend_lift_meetups() where handle = 'lift_6'), 0,
  'a previously stored under-16 status is hidden from friends');

reset role;
delete from public.friendships where requester_id = 'f1f1f1f1-0000-4000-8000-000000000001'
  and addressee_id = 'f1f1f1f1-0000-4000-8000-000000000002';
set local role authenticated;
set local request.jwt.claim.sub = 'f1f1f1f1-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"role":"authenticated","session_id":"f1f1f1f1-0000-4000-8000-000000000001"}';
select is((select count(*)::int from public.list_friend_lift_meetups() where handle = 'lift_2'), 0,
  'unfriending removes meetup visibility immediately');
reset role;
insert into public.friendships (requester_id, addressee_id, status) values
  ('f1f1f1f1-0000-4000-8000-000000000001', 'f1f1f1f1-0000-4000-8000-000000000002', 'accepted');

reset role;
insert into public.blocks (blocker_id, blocked_id)
values ('f1f1f1f1-0000-4000-8000-000000000001', 'f1f1f1f1-0000-4000-8000-000000000002');
set local role authenticated;
set local request.jwt.claim.sub = 'f1f1f1f1-0000-4000-8000-000000000002';
set local request.jwt.claims = '{"role":"authenticated","session_id":"f1f1f1f1-0000-4000-8000-000000000002"}';
select is((select count(*)::int from public.list_friend_lift_meetups()), 0, 'blocked friend loses visibility immediately');
set local request.jwt.claim.sub = 'f1f1f1f1-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"role":"authenticated","session_id":"f1f1f1f1-0000-4000-8000-000000000001"}';
select is((select count(*)::int from public.list_friend_lift_meetups()), 0, 'blocking acts in both directions');
select is(public.export_my_data() -> 'lift_meetup' ->> 'lift_id', 'osm-way-25282282', 'own meetup is in export');
select lives_ok($$select public.stop_my_lift_meetup()$$, 'owner can stop sharing');
select is((select count(*)::int from public.my_lift_meetup()), 0, 'stopped meetup is gone');

reset role;
set local role anon;
select throws_ok($$select public.list_friend_lift_meetups()$$, '42501', null, 'anon cannot list meetups');
select throws_ok($$select public.start_my_lift_meetup('Nordkette', 'osm-way-25170582')$$,
  '42501', null, 'anon cannot start meetup');

select * from finish();
rollback;
