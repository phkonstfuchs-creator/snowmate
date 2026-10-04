begin;

create extension if not exists pgtap with schema extensions;

select plan(41);

-- me (1), friend (2), friend of friend (3), stranger (4), pending (5), rider (6)
insert into auth.users (id, email)
select ('c4a70000-0000-4000-8000-00000000000' || n)::uuid, 'chat' || n || '@example.com'
from generate_series(1, 6) n;

update public.profiles
set display_name = 'Chatter ' || right(id::text, 1), handle = 'chat_' || right(id::text, 1),
    city = 'innsbruck', ability_level = 'chill'
where id::text like 'c4a70000-%';

insert into public.friendships (requester_id, addressee_id, status) values
  ('c4a70000-0000-4000-8000-000000000001', 'c4a70000-0000-4000-8000-000000000002', 'accepted'),
  ('c4a70000-0000-4000-8000-000000000002', 'c4a70000-0000-4000-8000-000000000003', 'accepted'),
  ('c4a70000-0000-4000-8000-000000000001', 'c4a70000-0000-4000-8000-000000000005', 'pending'),
  ('c4a70000-0000-4000-8000-000000000006', 'c4a70000-0000-4000-8000-000000000001', 'accepted');

-- A ride hosted by me: the friend (2) and rider (6) are in, the friend of a friend (3) asked.
insert into public.rides (id, host_id, resort, city, ability_level, ride_date, meet_time, meet_point, total_spots)
values ('c4a7f1de-0000-4000-8000-000000000001', 'c4a70000-0000-4000-8000-000000000001',
        'Nordkette', 'innsbruck', 'chill', current_date + 2, '09:00', 'Seegrube', 6);
insert into public.ride_participants (ride_id, user_id, status) values
  ('c4a7f1de-0000-4000-8000-000000000001', 'c4a70000-0000-4000-8000-000000000002', 'accepted'),
  ('c4a7f1de-0000-4000-8000-000000000001', 'c4a70000-0000-4000-8000-000000000006', 'accepted'),
  ('c4a7f1de-0000-4000-8000-000000000001', 'c4a70000-0000-4000-8000-000000000003', 'pending');

create temp table ids (name text primary key, id uuid);
grant select, insert on ids to authenticated;

set local role authenticated;
set local request.jwt.claim.sub = 'c4a70000-0000-4000-8000-000000000001';

-- 1. Tables are closed.
select throws_ok($$select * from public.messages$$, '42501', null, 'messages are not readable directly');
select throws_ok($$select * from public.conversations$$, '42501', null, 'conversations are not readable directly');
select throws_ok(
  $$insert into public.messages (conversation_id, sender_id, body) values (gen_random_uuid(), auth.uid(), 'x')$$,
  '42501', null, 'messages are not writable directly');

-- 2. Direct chat between friends.
insert into ids values ('direct', public.open_direct_chat('c4a70000-0000-4000-8000-000000000002'));
select isnt((select id from ids where name = 'direct'), null, 'friends can open a direct chat');
select is(public.open_direct_chat('c4a70000-0000-4000-8000-000000000002'), (select id from ids where name = 'direct'),
  'opening again returns the same chat');
select is(public.open_direct_chat('c4a70000-0000-4000-8000-000000000003'), null, 'no chat with a friend of a friend');
select is(public.open_direct_chat('c4a70000-0000-4000-8000-000000000004'), null, 'no chat with a stranger');
select is(public.open_direct_chat('c4a70000-0000-4000-8000-000000000005'), null, 'no chat on a pending request');
select is(public.open_direct_chat('c4a70000-0000-4000-8000-000000000001'), null, 'no chat with myself');

select is(public.send_message((select id from ids where name = 'direct'), '  Servus! Morgen Nordkette?  '), 'sent', 'I can write to my friend');
select is(public.send_message((select id from ids where name = 'direct'), ''), 'invalid', 'an empty message is refused');
select is(public.send_message((select id from ids where name = 'direct'), repeat('a', 1001)), 'invalid', 'more than 1000 characters is refused');
select is(public.send_message((select id from ids where name = 'direct'), 'bell' || chr(7)), 'invalid', 'control characters are refused');
select is(public.send_message((select id from ids where name = 'direct'), U&'evil\202Etxt'), 'invalid', 'bidi overrides are refused');
select is(public.send_message((select id from ids where name = 'direct'), E'two\nlines'), 'sent', 'line breaks are fine');

select results_eq(
  $$select body, is_mine from public.list_messages((select id from ids where name = 'direct'))$$,
  $$values ('Servus! Morgen Nordkette?'::text, true), (E'two\nlines'::text, true)$$,
  'messages come back trimmed, oldest first'
);

set local request.jwt.claim.sub = 'c4a70000-0000-4000-8000-000000000002';
select is((select unread from public.list_my_conversations() where kind = 'direct'), 2, 'the friend has two unread messages');
select is(public.my_unread_chats(), 1, 'the badge counts one unread chat');
select is((select count(*)::int from public.list_messages((select id from ids where name = 'direct')) where not is_mine), 2,
  'the friend reads them');
select lives_ok($$select public.mark_conversation_read((select id from ids where name = 'direct'))$$, 'the friend marks the chat read');
select is((select unread from public.list_my_conversations() where kind = 'direct'), 0, 'reading clears the unread count');

set local request.jwt.claim.sub = 'c4a70000-0000-4000-8000-000000000004';
select is((select count(*)::int from public.list_messages((select id from ids where name = 'direct'))), 0, 'a stranger reads nothing');
select is(public.send_message((select id from ids where name = 'direct'), 'hi'), 'forbidden', 'a stranger cannot write');
select is((select count(*)::int from public.list_my_conversations()), 0, 'a stranger has no chats');

-- 3. Ride chat.
set local request.jwt.claim.sub = 'c4a70000-0000-4000-8000-000000000006';
insert into ids values ('ride', public.open_ride_chat('c4a7f1de-0000-4000-8000-000000000001'));
select isnt((select id from ids where name = 'ride'), null, 'an accepted rider can open the ride chat');
select is(public.send_message((select id from ids where name = 'ride'), 'Bin dabei'), 'sent', 'an accepted rider can write');

set local request.jwt.claim.sub = 'c4a70000-0000-4000-8000-000000000003';
select is(public.open_ride_chat('c4a7f1de-0000-4000-8000-000000000001'), null, 'a pending rider cannot open the ride chat');
select is((select count(*)::int from public.list_messages((select id from ids where name = 'ride'))), 0, 'a pending rider reads nothing');

set local request.jwt.claim.sub = 'c4a70000-0000-4000-8000-000000000001';
select is((select count(*)::int from public.list_messages((select id from ids where name = 'ride'))), 1, 'the host reads the ride chat');

-- A rider who leaves loses access.
reset role;
delete from public.ride_participants where user_id = 'c4a70000-0000-4000-8000-000000000006';
set local role authenticated;
set local request.jwt.claim.sub = 'c4a70000-0000-4000-8000-000000000006';
select is(public.send_message((select id from ids where name = 'ride'), 'still here?'), 'forbidden', 'a former rider cannot write');

-- 4. Blocking ends the direct chat and hides messages in a shared ride chat.
reset role;
insert into public.ride_participants (ride_id, user_id, status)
values ('c4a7f1de-0000-4000-8000-000000000001', 'c4a70000-0000-4000-8000-000000000006', 'accepted');
set local role authenticated;
set local request.jwt.claim.sub = 'c4a70000-0000-4000-8000-000000000002';
select is(public.send_message((select id from ids where name = 'ride'), 'Hi crew'), 'sent', 'the friend writes in the ride chat');
reset role;
insert into public.blocks (blocker_id, blocked_id)
values ('c4a70000-0000-4000-8000-000000000001', 'c4a70000-0000-4000-8000-000000000002');
set local role authenticated;
set local request.jwt.claim.sub = 'c4a70000-0000-4000-8000-000000000002';
select is(public.send_message((select id from ids where name = 'direct'), 'why?'), 'forbidden', 'a blocked friend cannot write');
select is((select count(*)::int from public.list_messages((select id from ids where name = 'direct'))), 0, 'a blocked friend reads nothing');
set local request.jwt.claim.sub = 'c4a70000-0000-4000-8000-000000000001';
select is((select count(*)::int from public.list_messages((select id from ids where name = 'ride')) where sender_handle = 'chat_2'), 0,
  'the blocked person''s ride messages are hidden from me');

-- 5. Rate limit and export.
reset role;
insert into public.messages (conversation_id, sender_id, body)
select (select id from ids where name = 'ride'), 'c4a70000-0000-4000-8000-000000000006', 'spam ' || n
from generate_series(1, 30) n;
set local role authenticated;
set local request.jwt.claim.sub = 'c4a70000-0000-4000-8000-000000000006';
select is(public.send_message((select id from ids where name = 'ride'), 'one more'), 'rate_limited', 'the 31st message in a minute is refused');

set local request.jwt.claim.sub = 'c4a70000-0000-4000-8000-000000000001';
select is(jsonb_array_length(public.export_my_data() -> 'messages_sent'), 2, 'the export holds my sent messages');

-- 6. Unfriending ends the direct chat; deleting the account removes the messages.
insert into ids values ('direct6', public.open_direct_chat('c4a70000-0000-4000-8000-000000000006'));
select is(public.send_message((select id from ids where name = 'direct6'), 'Servus'), 'sent', 'I write to another friend');
reset role;
delete from public.friendships
where requester_id = 'c4a70000-0000-4000-8000-000000000006' and addressee_id = 'c4a70000-0000-4000-8000-000000000001';
set local role authenticated;
select is(public.send_message((select id from ids where name = 'direct6'), 'hello?'), 'forbidden', 'after unfriending I cannot write');
select is((select count(*)::int from public.list_messages((select id from ids where name = 'direct6'))), 0, 'after unfriending I read nothing');

reset role;
delete from auth.users where id = 'c4a70000-0000-4000-8000-000000000006';
select is((select count(*)::int from public.messages where sender_id = 'c4a70000-0000-4000-8000-000000000006'), 0,
  'a deleted account takes its messages with it');
-- My two messages to friend 2 stay; the direct chat with the deleted
-- person goes away as a whole.
select is((select count(*)::int from public.messages where sender_id = 'c4a70000-0000-4000-8000-000000000001'), 2,
  'the others keep theirs, except in the direct chat with the deleted person');

select * from finish();
rollback;
