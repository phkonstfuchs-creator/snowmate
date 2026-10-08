begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

-- me (1), friend (2), rider (3), stranger (4), blocked friend (5), a friend who asked (6)
insert into auth.users (id, email)
select ('9a1c0000-0000-4000-8000-00000000000' || n)::uuid, 'nav' || n || '@example.com'
from generate_series(1, 6) n;

update public.profiles
set display_name = 'Nav ' || right(id::text, 1), handle = 'nav_' || right(id::text, 1),
    city = 'innsbruck', ability_level = 'chill'
where id::text like '9a1c0000-%';

insert into public.friendships (requester_id, addressee_id, status) values
  ('9a1c0000-0000-4000-8000-000000000001', '9a1c0000-0000-4000-8000-000000000002', 'accepted'),
  ('9a1c0000-0000-4000-8000-000000000001', '9a1c0000-0000-4000-8000-000000000005', 'accepted'),
  ('9a1c0000-0000-4000-8000-000000000006', '9a1c0000-0000-4000-8000-000000000001', 'pending');

-- A ride hosted by the rider (3); I am in. A second ride of the stranger I am not in.
insert into public.rides (id, host_id, resort, city, ability_level, ride_date, meet_time, meet_point, total_spots)
values
  ('9a1cf1de-0000-4000-8000-000000000001', '9a1c0000-0000-4000-8000-000000000003', 'Nordkette', 'innsbruck', 'chill', current_date + 1, '09:00', 'Seegrube', 4),
  ('9a1cf1de-0000-4000-8000-000000000002', '9a1c0000-0000-4000-8000-000000000004', 'Stubai', 'innsbruck', 'chill', current_date + 1, '09:00', 'Talstation', 4);
insert into public.ride_participants (ride_id, user_id, status) values
  ('9a1cf1de-0000-4000-8000-000000000001', '9a1c0000-0000-4000-8000-000000000001', 'accepted');

insert into public.conversations (id, kind, user_low, user_high) values
  ('9a1cc0de-0000-4000-8000-000000000001', 'direct', '9a1c0000-0000-4000-8000-000000000001', '9a1c0000-0000-4000-8000-000000000002'),
  ('9a1cc0de-0000-4000-8000-000000000005', 'direct', '9a1c0000-0000-4000-8000-000000000001', '9a1c0000-0000-4000-8000-000000000005');
insert into public.conversations (id, kind, ride_id) values
  ('9a1cc0de-0000-4000-8000-000000000003', 'ride', '9a1cf1de-0000-4000-8000-000000000001'),
  ('9a1cc0de-0000-4000-8000-000000000004', 'ride', '9a1cf1de-0000-4000-8000-000000000002');
insert into public.messages (conversation_id, sender_id, body) values
  ('9a1cc0de-0000-4000-8000-000000000001', '9a1c0000-0000-4000-8000-000000000002', 'Morgen?'),
  ('9a1cc0de-0000-4000-8000-000000000003', '9a1c0000-0000-4000-8000-000000000003', 'Treffpunkt Seegrube'),
  ('9a1cc0de-0000-4000-8000-000000000004', '9a1c0000-0000-4000-8000-000000000004', 'Not for you'),
  ('9a1cc0de-0000-4000-8000-000000000005', '9a1c0000-0000-4000-8000-000000000005', 'From someone I block');
insert into public.blocks (blocker_id, blocked_id)
values ('9a1c0000-0000-4000-8000-000000000001', '9a1c0000-0000-4000-8000-000000000005');

set local role authenticated;
set local request.jwt.claim.sub = '9a1c0000-0000-4000-8000-000000000001';

-- The conversation list keeps its audience while reading only my own chats.
select results_eq(
  $$select conversation_id from public.list_my_conversations() order by conversation_id$$,
  $$values ('9a1cc0de-0000-4000-8000-000000000001'::uuid), ('9a1cc0de-0000-4000-8000-000000000003'::uuid)$$,
  'my chats: the friend and the ride I am in; not a stranger''s ride, not a blocked friend');
select is(public.my_unread_chats(), 2, 'two chats have unread messages');

-- One call for every navigation badge.
select is((select friend_requests from public.my_nav_counts()), 1, 'one friend request waits');
select is((select ride_requests from public.my_nav_counts()), 0, 'no ride requests');
select is((select carpool_requests from public.my_nav_counts()), 0, 'no carpool requests');
select is((select unread_chats from public.my_nav_counts()), 2, 'unread chats match my_unread_chats');
select is((select age_outdated from public.my_nav_counts()), false, 'nothing to refresh without a birth date');

select lives_ok($$select public.mark_conversation_read('9a1cc0de-0000-4000-8000-000000000001')$$, 'reading a chat');
select is((select unread_chats from public.my_nav_counts()), 1, 'drops the unread count');

-- A stranger's counts are their own.
set local request.jwt.claim.sub = '9a1c0000-0000-4000-8000-000000000004';
select is((select unread_chats from public.my_nav_counts()), 0, 'the stranger has no unread chat of mine');
select is((select friend_requests from public.my_nav_counts()), 0, 'nor my requests');

-- Turning 18: the counts say so, and only then is a write needed.
reset role;
update public.profiles set birth_date = current_date - interval '18 years' - interval '1 day'
where id = '9a1c0000-0000-4000-8000-000000000001';
-- As stored before the 18th birthday passed.
update public.profiles set is_minor = true where id = '9a1c0000-0000-4000-8000-000000000001';
set local role authenticated;
set local request.jwt.claim.sub = '9a1c0000-0000-4000-8000-000000000001';
select is((select age_outdated from public.my_nav_counts()), true, 'an adult still marked minor needs a refresh');
select lives_ok($$select public.refresh_my_age()$$, 'the refresh runs');
select is((select age_outdated from public.my_nav_counts()), false, 'and is not needed again');

select * from finish();
rollback;
