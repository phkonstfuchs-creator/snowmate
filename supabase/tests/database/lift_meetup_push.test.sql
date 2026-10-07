begin;

create extension if not exists pgtap with schema extensions;
select plan(21);

insert into auth.users (id, email)
select ('a11f7000-0000-4000-8000-00000000000' || n)::uuid,
       'lift-push-' || n || '@example.com'
from generate_series(1, 6) n;

update public.profiles
set display_name = 'Lift Push ' || right(id::text, 1),
    handle = 'lift_push_' || right(id::text, 1),
    city = 'innsbruck', ability_level = 'chill', onboarding_completed = true,
    birth_date = date '1990-01-01'
where id::text like 'a11f7000-%';
insert into auth.sessions (id, user_id) select id, id from auth.users where id::text like 'a11f7000-%';

update public.profiles
set birth_date = (private.local_today() - interval '16 years' + interval '1 day')::date
where id = 'a11f7000-0000-4000-8000-000000000005';

insert into public.friendships (requester_id, addressee_id, status) values
  ('a11f7000-0000-4000-8000-000000000001', 'a11f7000-0000-4000-8000-000000000002', 'accepted'),
  ('a11f7000-0000-4000-8000-000000000001', 'a11f7000-0000-4000-8000-000000000003', 'pending'),
  ('a11f7000-0000-4000-8000-000000000001', 'a11f7000-0000-4000-8000-000000000004', 'accepted'),
  ('a11f7000-0000-4000-8000-000000000001', 'a11f7000-0000-4000-8000-000000000005', 'accepted'),
  ('a11f7000-0000-4000-8000-000000000001', 'a11f7000-0000-4000-8000-000000000006', 'accepted');

set local role authenticated;
set local request.jwt.claim.sub = 'a11f7000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"role":"authenticated","session_id":"a11f7000-0000-4000-8000-000000000001"}';
select is(public.save_push_subscription('https://web.push.apple.com/lift-owner', repeat('A', 87), repeat('b', 22)), 'saved', 'owner has a device');
set local request.jwt.claim.sub = 'a11f7000-0000-4000-8000-000000000002';
set local request.jwt.claims = '{"role":"authenticated","session_id":"a11f7000-0000-4000-8000-000000000002"}';
select is(public.save_push_subscription('https://web.push.apple.com/lift-friend', repeat('A', 87), repeat('b', 22)), 'saved', 'friend has a device');
set local request.jwt.claim.sub = 'a11f7000-0000-4000-8000-000000000003';
set local request.jwt.claims = '{"role":"authenticated","session_id":"a11f7000-0000-4000-8000-000000000003"}';
select is(public.save_push_subscription('https://web.push.apple.com/lift-pending', repeat('A', 87), repeat('b', 22)), 'saved', 'pending contact has a device');
set local request.jwt.claim.sub = 'a11f7000-0000-4000-8000-000000000004';
set local request.jwt.claims = '{"role":"authenticated","session_id":"a11f7000-0000-4000-8000-000000000004"}';
select is(public.save_push_subscription('https://web.push.apple.com/lift-blocked', repeat('A', 87), repeat('b', 22)), 'saved', 'blocked friend has a device');
set local request.jwt.claim.sub = 'a11f7000-0000-4000-8000-000000000005';
set local request.jwt.claims = '{"role":"authenticated","session_id":"a11f7000-0000-4000-8000-000000000005"}';
select is(public.save_push_subscription('https://web.push.apple.com/lift-young-viewer', repeat('A', 87), repeat('b', 22)), 'saved', 'under-16 viewer has a device');
reset role;

insert into public.blocks (blocker_id, blocked_id)
values ('a11f7000-0000-4000-8000-000000000004', 'a11f7000-0000-4000-8000-000000000001');
delete from private.push_outbox;

set local role authenticated;
set local request.jwt.claim.sub = 'a11f7000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"role":"authenticated","session_id":"a11f7000-0000-4000-8000-000000000001"}';
select is(public.start_my_lift_meetup('Nordkette', 'osm-way-25170582'), 'sharing', 'adult starts a lift meetup');
reset role;
select results_eq(
  $$select recipient_id, kind, url from private.push_outbox order by recipient_id$$,
  $$values ('a11f7000-0000-4000-8000-000000000002'::uuid, 'lift_meetup'::text, '/map'::text),
           ('a11f7000-0000-4000-8000-000000000005'::uuid, 'lift_meetup'::text, '/map'::text)$$,
  'only subscribed confirmed and unblocked friends get a queue entry; owner, pending, blocked and no-device accounts do not'
);

set local role authenticated;
set local request.jwt.claim.sub = 'a11f7000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"role":"authenticated","session_id":"a11f7000-0000-4000-8000-000000000001"}';
select is(public.start_my_lift_meetup('Nordkette', 'osm-way-25282282'), 'sharing', 'replacement status starts');
reset role;
select is((select count(*)::int from private.push_outbox where kind = 'lift_meetup'), 2,
  'replacement leaves one notice per eligible friend');

delete from public.friendships
where requester_id = 'a11f7000-0000-4000-8000-000000000001'
  and addressee_id = 'a11f7000-0000-4000-8000-000000000002';
insert into public.blocks (blocker_id, blocked_id)
values ('a11f7000-0000-4000-8000-000000000005', 'a11f7000-0000-4000-8000-000000000001');
set local role service_role;
create temp table lift_push_taken as select * from public.push_take_outbox();
reset role;
select is((select count(*)::int from lift_push_taken where kind = 'lift_meetup'), 0,
  'dispatch rechecks friendship and both-way blocks before sending');

insert into public.friendships (requester_id, addressee_id, status)
values ('a11f7000-0000-4000-8000-000000000001', 'a11f7000-0000-4000-8000-000000000002', 'accepted');
delete from private.push_outbox;
set local role authenticated;
set local request.jwt.claim.sub = 'a11f7000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"role":"authenticated","session_id":"a11f7000-0000-4000-8000-000000000001"}';
select is(public.start_my_lift_meetup('Nordkette', 'osm-way-25170582'), 'sharing', 'new status requeues');
reset role;
set local role service_role;
create temp table lift_push_delivery as select * from public.push_take_outbox();
reset role;
select results_eq(
  $$select kind, actor_name, url from lift_push_delivery where kind = 'lift_meetup'$$,
  $$values ('lift_meetup'::text, 'Lift Push 1'::text, '/map'::text)$$,
  'sent payload has only kind, display name and map URL, never lift or coordinates'
);

set local role authenticated;
set local request.jwt.claim.sub = 'a11f7000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"role":"authenticated","session_id":"a11f7000-0000-4000-8000-000000000001"}';
select is(public.start_my_lift_meetup('Nordkette', 'osm-way-25170582'), 'sharing', 'another status queues');
select lives_ok($$select public.stop_my_lift_meetup()$$, 'owner can stop sharing');
reset role;
select is((select count(*)::int from private.push_outbox where kind = 'lift_meetup'), 0,
  'stop retracts unsent location-revealing notices');

set local role authenticated;
set local request.jwt.claim.sub = 'a11f7000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"role":"authenticated","session_id":"a11f7000-0000-4000-8000-000000000001"}';
select is(public.start_my_lift_meetup('Nordkette', 'osm-way-25170582'), 'sharing', 'status queues for expiry check');
reset role;
update public.lift_meetups set started_at = now() - interval '31 minutes',
  arrival_at = now() - interval '20 minutes', expires_at = now() - interval '1 minute'
where user_id = 'a11f7000-0000-4000-8000-000000000001';
set local role service_role;
create temp table lift_push_expired as select * from public.push_take_outbox();
reset role;
select is((select count(*)::int from lift_push_expired where kind = 'lift_meetup'), 0,
  'expired status never reaches a device');

set local role authenticated;
set local request.jwt.claim.sub = 'a11f7000-0000-4000-8000-000000000005';
set local request.jwt.claims = '{"role":"authenticated","session_id":"a11f7000-0000-4000-8000-000000000005"}';
select is(public.start_my_lift_meetup('Nordkette', 'osm-way-25170582'), 'too_young',
  'under-16 account cannot generate lift push');
reset role;
select is((select count(*)::int from private.push_outbox where actor_id = 'a11f7000-0000-4000-8000-000000000005' and kind = 'lift_meetup'), 0,
  'under-16 attempt queues nothing');

set local role authenticated;
set local request.jwt.claim.sub = 'a11f7000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"role":"authenticated","session_id":"a11f7000-0000-4000-8000-000000000001"}';
select is(public.start_my_lift_meetup('Nordkette', 'osm-way-25170582'), 'sharing',
  'adult queues a status before age changes');
reset role;
update public.profiles
set birth_date = (private.local_today() - interval '16 years' + interval '1 day')::date
where id = 'a11f7000-0000-4000-8000-000000000001';
set local role service_role;
create temp table lift_push_age_changed as select * from public.push_take_outbox();
reset role;
select is((select count(*)::int from lift_push_age_changed where kind = 'lift_meetup'), 0,
  'dispatch drops a queued lift notice if rider no longer passes the age gate');

select * from finish();
rollback;
