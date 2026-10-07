begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

insert into auth.users (id, email) values
  ('a9a9a9a9-0000-4000-8000-0000000000e1', 'native-one@example.com'),
  ('a9a9a9a9-0000-4000-8000-0000000000e2', 'native-two@example.com');
insert into auth.sessions (id, user_id) values
  ('a9a9a9a9-0000-4000-8000-0000000000f1', 'a9a9a9a9-0000-4000-8000-0000000000e1'),
  ('a9a9a9a9-0000-4000-8000-0000000000f2', 'a9a9a9a9-0000-4000-8000-0000000000e2');
update public.profiles set display_name = 'Native ' || right(id::text, 1), handle = 'native_' || right(id::text, 1)
where id::text like 'a9a9a9a9-%';

-- Saving.
set local role authenticated;
set local request.jwt.claim.sub = 'a9a9a9a9-0000-4000-8000-0000000000e1';
set local request.jwt.claims = '{"role":"authenticated","session_id":"a9a9a9a9-0000-4000-8000-0000000000f1"}';
select is(public.save_native_push_token(repeat('AB', 32), 'ios'), 'saved', 'an active session can register an iPhone');
select is(public.is_my_native_push_token(repeat('ab', 32)), true, 'the current session owns its iPhone');
select is(public.save_native_push_token('not-a-token', 'ios'), 'invalid', 'a malformed token is refused');
select is(public.save_native_push_token(repeat('ab', 32), 'android'), 'invalid', 'Android is not supported yet');
select throws_ok($$select * from public.native_push_tokens$$, '42501', null, 'tokens are not readable');
select throws_ok($$select public.push_take_outbox()$$, '42501', null, 'clients cannot take the outbox');
select throws_ok($$select public.push_forget_native_token('x')$$, '42501', null, 'clients cannot forget tokens');
select is(jsonb_array_length(public.export_my_data() -> 'native_push_devices'), 1, 'the export lists the device');
select ok(not (public.export_my_data() -> 'native_push_devices' -> 0 ? 'token'), 'the export never shows the token');

set local request.jwt.claims = '{"role":"authenticated"}';
select is(public.save_native_push_token(repeat('cd', 32), 'ios'), 'invalid', 'no session, no registration');

-- Another live account cannot take the device over.
set local request.jwt.claim.sub = 'a9a9a9a9-0000-4000-8000-0000000000e2';
set local request.jwt.claims = '{"role":"authenticated","session_id":"a9a9a9a9-0000-4000-8000-0000000000f2"}';
select is(public.save_native_push_token(repeat('ab', 32), 'ios'), 'invalid', 'a device with a live session stays with its owner');
select is(public.delete_native_push_token(repeat('ab', 32)), false, 'nor can another account delete it');
select is(public.is_my_native_push_token(repeat('ab', 32)), false, 'nor see it as its own');
reset role;

-- Delivery: web and native targets come out of the same outbox.
insert into public.push_subscriptions (endpoint, user_id, p256dh, auth, session_id)
values ('https://web.push.apple.com/native-test', 'a9a9a9a9-0000-4000-8000-0000000000e1',
  repeat('A', 87), repeat('b', 22), 'a9a9a9a9-0000-4000-8000-0000000000f1');
select private.queue_push('a9a9a9a9-0000-4000-8000-0000000000e1', 'a9a9a9a9-0000-4000-8000-0000000000e2', 'message', '/crew');
set local role service_role;
create temp table pg_temp.delivery as select * from public.push_take_outbox();
reset role;
select is((select count(*)::int from pg_temp.delivery), 2, 'one notice reaches the browser and the iPhone');
select is((select endpoint from pg_temp.delivery where channel = 'ios'), repeat('ab', 32), 'the iPhone target carries its token');
select is((select actor_name from pg_temp.delivery where channel = 'ios'), 'Native 2', 'and who caused it');

-- After sign-out the device goes quiet and can change hands.
delete from auth.sessions where id = 'a9a9a9a9-0000-4000-8000-0000000000f1';
select private.queue_push('a9a9a9a9-0000-4000-8000-0000000000e1', 'a9a9a9a9-0000-4000-8000-0000000000e2', 'message', '/crew');
set local role service_role;
select is((select count(*)::int from public.push_take_outbox() where channel = 'ios'), 0, 'an ended session receives nothing');
reset role;
set local role authenticated;
set local request.jwt.claim.sub = 'a9a9a9a9-0000-4000-8000-0000000000e2';
set local request.jwt.claims = '{"role":"authenticated","session_id":"a9a9a9a9-0000-4000-8000-0000000000f2"}';
select is(public.save_native_push_token(repeat('ab', 32), 'ios'), 'saved', 'the next account on that iPhone takes it over');
select is(public.delete_native_push_token(repeat('AB', 32)), true, 'and can remove it on sign-out');

select * from finish();
rollback;
