begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, email) values
  ('a8a8a8a8-0000-4000-8000-0000000000e1', 'push-session-one@example.com'),
  ('a8a8a8a8-0000-4000-8000-0000000000e2', 'push-session-two@example.com');
insert into auth.sessions (id, user_id) values
  ('a8a8a8a8-0000-4000-8000-0000000000f1', 'a8a8a8a8-0000-4000-8000-0000000000e1'),
  ('a8a8a8a8-0000-4000-8000-0000000000f2', 'a8a8a8a8-0000-4000-8000-0000000000e2');

set local role authenticated;
set local request.jwt.claim.sub = 'a8a8a8a8-0000-4000-8000-0000000000e1';
set local request.jwt.claims = '{"role":"authenticated","session_id":"a8a8a8a8-0000-4000-8000-0000000000f1"}';
select is(public.save_push_subscription('https://web.push.apple.com/session-one', repeat('A', 87), repeat('b', 22)),
  'saved', 'active session can opt in');
reset role;
insert into public.push_subscriptions (endpoint, user_id, p256dh, auth, session_id)
values ('https://fcm.googleapis.com/fcm/send/other-account',
  'a8a8a8a8-0000-4000-8000-0000000000e2', repeat('C', 87), repeat('d', 22),
  'a8a8a8a8-0000-4000-8000-0000000000f2');
set local role authenticated;
select is((public.export_my_data() -> 'push_subscriptions' -> 0 ->> 'session_id'),
  'a8a8a8a8-0000-4000-8000-0000000000f1',
  'owner export includes their subscription session id');
select is(jsonb_array_length(public.export_my_data() -> 'push_subscriptions'), 1,
  'owner export excludes another account subscription');
select ok(not (public.export_my_data() -> 'push_subscriptions' -> 0 ?| array['endpoint', 'p256dh', 'auth']),
  'export never exposes push endpoint or encryption keys');
set local request.jwt.claim.sub = 'a8a8a8a8-0000-4000-8000-0000000000e2';
set local request.jwt.claims = '{"role":"authenticated","session_id":"a8a8a8a8-0000-4000-8000-0000000000f2"}';
select is((public.export_my_data() -> 'push_subscriptions' -> 0 ->> 'session_id'),
  'a8a8a8a8-0000-4000-8000-0000000000f2',
  'second account sees its own session but never first account session');
set local request.jwt.claim.sub = 'a8a8a8a8-0000-4000-8000-0000000000e1';
set local request.jwt.claims = '{"role":"authenticated","session_id":"a8a8a8a8-0000-4000-8000-0000000000f1"}';
select is(public.is_my_push_subscription('https://web.push.apple.com/session-one'), true,
  'current session owns its endpoint');
set local request.jwt.claims = '{"session_id":"a8a8a8a8-0000-4000-8000-0000000000f1"}';
select is(public.is_my_push_subscription('https://web.push.apple.com/session-one'), false,
  'missing authenticated role cannot inherit push consent');
select is(public.save_push_subscription('https://web.push.apple.com/role-missing', repeat('A', 87), repeat('b', 22)),
  'invalid', 'missing authenticated role cannot opt in');
set local request.jwt.claims = '{"role":"authenticated","session_id":"a8a8a8a8-0000-4000-8000-0000000000f1"}';
set local request.jwt.claims = '{"role":"authenticated","session_id":"a8a8a8a8-0000-4000-8000-0000000000f2"}';
select is(public.is_my_push_subscription('https://web.push.apple.com/session-one'), false,
  'another session cannot inherit push consent');
select is(public.save_push_subscription('https://web.push.apple.com/session-forged', repeat('A', 87), repeat('b', 22)),
  'invalid', 'session belonging to another account cannot opt in');
reset role;

insert into public.push_subscriptions (endpoint, user_id, p256dh, auth)
values ('https://web.push.apple.com/legacy-device', 'a8a8a8a8-0000-4000-8000-0000000000e1',
  repeat('A', 87), repeat('b', 22));
select private.queue_push('a8a8a8a8-0000-4000-8000-0000000000e1',
  'a8a8a8a8-0000-4000-8000-0000000000e2', 'message', '/crew');
set local role service_role;
create temp table pg_temp.active_delivery as select * from public.push_take_outbox();
reset role;
select is((select count(*)::int from pg_temp.active_delivery), 1,
  'unbound legacy device never receives queued push');
select is((select endpoint from pg_temp.active_delivery), 'https://web.push.apple.com/session-one',
  'only the currently bound device receives push');

delete from auth.sessions where id = 'a8a8a8a8-0000-4000-8000-0000000000f1';
set local role authenticated;
set local request.jwt.claim.sub = 'a8a8a8a8-0000-4000-8000-0000000000e1';
set local request.jwt.claims = '{"role":"authenticated","session_id":"a8a8a8a8-0000-4000-8000-0000000000f1"}';
select is(public.is_my_push_subscription('https://web.push.apple.com/session-one'), false,
  'revoked session loses consent immediately');
reset role;
select private.queue_push('a8a8a8a8-0000-4000-8000-0000000000e1',
  'a8a8a8a8-0000-4000-8000-0000000000e2', 'message', '/crew');
set local role service_role;
create temp table pg_temp.revoked_delivery as select * from public.push_take_outbox();
reset role;
select is((select count(*)::int from pg_temp.revoked_delivery), 0,
  'revoked session device gets no push');

select * from finish();
rollback;
