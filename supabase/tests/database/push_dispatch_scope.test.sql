begin;
create extension if not exists pgtap with schema extensions;
select plan(10);
create table if not exists auth.sessions (id uuid primary key, user_id uuid);

insert into auth.users (id, email) values
  ('a8a8a8a8-0000-4000-8000-0000000000b1', 'dispatch-a@example.com'),
  ('a8a8a8a8-0000-4000-8000-0000000000b2', 'dispatch-b@example.com'),
  ('a8a8a8a8-0000-4000-8000-0000000000b3', 'dispatch-recipient@example.com');
insert into auth.sessions (id, user_id) values
  ('a8a8a8a8-0000-4000-8000-0000000000c1', 'a8a8a8a8-0000-4000-8000-0000000000b1'),
  ('a8a8a8a8-0000-4000-8000-0000000000c2', 'a8a8a8a8-0000-4000-8000-0000000000b2'),
  ('a8a8a8a8-0000-4000-8000-0000000000c3', 'a8a8a8a8-0000-4000-8000-0000000000b3');
insert into public.push_subscriptions (endpoint, user_id, p256dh, auth, session_id)
values ('https://web.push.apple.com/dispatch-recipient',
  'a8a8a8a8-0000-4000-8000-0000000000b3', repeat('A', 87), repeat('b', 22),
  'a8a8a8a8-0000-4000-8000-0000000000c3');
insert into private.push_outbox (recipient_id, actor_id, kind, url) values
  ('a8a8a8a8-0000-4000-8000-0000000000b3', 'a8a8a8a8-0000-4000-8000-0000000000b1', 'message', '/crew'),
  ('a8a8a8a8-0000-4000-8000-0000000000b3', 'a8a8a8a8-0000-4000-8000-0000000000b2', 'friend_request', '/crew');

set local role authenticated;
select throws_ok($$select * from public.push_take_session_outbox(
  'a8a8a8a8-0000-4000-8000-0000000000b1', 'a8a8a8a8-0000-4000-8000-0000000000c1')$$,
  '42501', null, 'regular users cannot take even their own queued push');
reset role;
set local role service_role;
create temp table pg_temp.actor_a as select * from public.push_take_session_outbox(
  'a8a8a8a8-0000-4000-8000-0000000000b1', 'a8a8a8a8-0000-4000-8000-0000000000c1');
reset role;
select is((select count(*)::int from pg_temp.actor_a), 1,
  'A dispatches only A-originated notice');
select is((select count(*)::int from private.push_outbox), 1,
  'B-originated notice stays queued');

set local role service_role;
create temp table pg_temp.forged as select * from public.push_take_session_outbox(
  'a8a8a8a8-0000-4000-8000-0000000000b2', 'a8a8a8a8-0000-4000-8000-0000000000c1');
reset role;
select is((select count(*)::int from pg_temp.forged), 0,
  'a mismatched source session cannot take another actor''s notice');
select is((select count(*)::int from private.push_outbox), 1,
  'forged source session does not drain queue');

delete from auth.sessions where id = 'a8a8a8a8-0000-4000-8000-0000000000c2';
set local role service_role;
create temp table pg_temp.revoked as select * from public.push_take_session_outbox(
  'a8a8a8a8-0000-4000-8000-0000000000b2', 'a8a8a8a8-0000-4000-8000-0000000000c2');
reset role;
select is((select count(*)::int from pg_temp.revoked), 0,
  'revoked source session cannot take queued notice');
select is((select count(*)::int from private.push_outbox), 1,
  'revoked source leaves notice queued');

set local role service_role;
create temp table pg_temp.global as select * from public.push_take_outbox();
reset role;
select is((select count(*)::int from pg_temp.global), 1,
  'service-only global dispatch retains existing internal behavior');

-- Deliberately seed more than the normal per-account device cap to prove
-- the dispatcher itself still has a hard output bound.
insert into public.push_subscriptions (endpoint, user_id, p256dh, auth, session_id)
select 'https://web.push.apple.com/dispatch-extra-' || n,
  'a8a8a8a8-0000-4000-8000-0000000000b3', repeat('A', 87), repeat('b', 22),
  'a8a8a8a8-0000-4000-8000-0000000000c3'
from generate_series(1, 10) n;
insert into private.push_outbox (recipient_id, actor_id, kind, url)
select 'a8a8a8a8-0000-4000-8000-0000000000b3',
  'a8a8a8a8-0000-4000-8000-0000000000b1', 'message', '/crew'
from generate_series(1, 120);
set local role service_role;
create temp table pg_temp.bounded as select * from public.push_take_session_outbox(
  'a8a8a8a8-0000-4000-8000-0000000000b1', 'a8a8a8a8-0000-4000-8000-0000000000c1');
reset role;
select is((select count(*)::int from pg_temp.bounded), 1000,
  'one dispatch returns at most 1000 device rows from 100 notices');
select is((select count(*)::int from private.push_outbox), 20,
  'remaining notices stay queued for another dispatch');

select * from finish();
rollback;
