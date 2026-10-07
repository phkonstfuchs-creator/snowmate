begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

insert into auth.users (id, email)
values ('b10c0000-0000-4000-8000-000000000001', 'filter1@example.com'),
       ('b10c0000-0000-4000-8000-000000000002', 'filter2@example.com');

update public.profiles
set display_name = 'Filter ' || right(id::text, 1), handle = 'filter_' || right(id::text, 1),
    city = 'innsbruck', ability_level = 'chill'
where id::text like 'b10c0000-%';

insert into public.friendships (requester_id, addressee_id, status)
values ('b10c0000-0000-4000-8000-000000000001', 'b10c0000-0000-4000-8000-000000000002', 'accepted');

-- The rule itself.
select ok(private.has_blocked_term('du HURENSOHN'), 'a listed insult is caught regardless of case');
select ok(private.has_blocked_term('N1GG3R'), 'look-alike digits are caught');
select ok(private.has_blocked_term('heil   hitler'), 'extra spaces do not hide a slogan');
select ok(private.has_blocked_term('kys'), 'a whole-word term alone is caught');
select ok(not private.has_blocked_term('Spastik ist eine Krankheit'), 'a whole-word term inside another word is allowed');
select ok(not private.has_blocked_term('Pulver am Stubai, wer kommt mit?'), 'normal ski talk passes');
select ok(not private.has_blocked_term(null), 'no text is fine');

-- Closed to clients.
set local role authenticated;
set local request.jwt.claim.sub = 'b10c0000-0000-4000-8000-000000000001';
select throws_ok($$select * from private.blocked_terms$$, '42501', null, 'the list is not readable');
select throws_ok($$select private.has_blocked_term('x')$$, '42501', null, 'the check is not callable');

-- Every write path is covered.
select throws_ok($$select public.create_post('Du Missgeburt', null, null)$$, 'PB001', null, 'a post with a slur is refused');
select is(public.create_post('Bluebird am Hintertux', null, null), 'created', 'a normal post still works');
select throws_ok(
  $$select public.send_message(public.open_direct_chat('b10c0000-0000-4000-8000-000000000002'), 'kill yourself')$$,
  'PB001', null, 'a chat message with a call to self-harm is refused');
select throws_ok(
  $$update public.profiles set bio = 'sieg heil' where id = auth.uid()$$,
  'PB001', null, 'a profile bio with a hate slogan is refused');
select lives_ok(
  $$update public.profiles set bio = 'Freerider aus Innsbruck' where id = auth.uid()$$,
  'a normal bio is saved');

select * from finish();
rollback;
