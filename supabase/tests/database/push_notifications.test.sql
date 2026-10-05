begin;

create extension if not exists pgtap with schema extensions;

select plan(27);

-- me (1), friend (2), new contact (3), blocked friend (4), no device (5)
insert into auth.users (id, email)
select ('9054b000-0000-4000-8000-00000000000' || n)::uuid, 'push' || n || '@example.com'
from generate_series(1, 5) n;

update public.profiles
set display_name = 'Pusher ' || right(id::text, 1), handle = 'push_' || right(id::text, 1),
    city = 'innsbruck', ability_level = 'chill', onboarding_completed = true
where id::text like '9054b000-%';

insert into public.friendships (requester_id, addressee_id, status) values
  ('9054b000-0000-4000-8000-000000000001', '9054b000-0000-4000-8000-000000000002', 'accepted'),
  ('9054b000-0000-4000-8000-000000000001', '9054b000-0000-4000-8000-000000000004', 'accepted'),
  ('9054b000-0000-4000-8000-000000000001', '9054b000-0000-4000-8000-000000000005', 'accepted');

-- Closed tables.
set local role authenticated;
set local request.jwt.claim.sub = '9054b000-0000-4000-8000-000000000001';
select throws_ok($$select * from public.push_subscriptions$$, '42501', null, 'subscriptions are not readable directly');
select throws_ok($$select * from private.push_outbox$$, '42501', null, 'the queue is not readable');
select throws_ok($$select * from public.push_take_outbox()$$, '42501', null, 'a client cannot take the queue');
select throws_ok($$select public.push_forget_subscription('x')$$, '42501', null, 'a client cannot forget devices');

-- Devices.
select is(public.save_push_subscription('https://fcm.googleapis.com/fcm/send/me-1', repeat('A', 87), repeat('b', 22)), 'saved', 'I can store a device');
select is(public.save_push_subscription('https://evil.example.com/hook', repeat('A', 87), repeat('b', 22)), 'invalid', 'other hosts are refused');
select is(public.save_push_subscription('https://fcm.googleapis.com.evil.com/x', repeat('A', 87), repeat('b', 22)), 'invalid', 'look-alike hosts are refused');
select is(public.save_push_subscription('https://web.push.apple.com/x', 'short', repeat('b', 22)), 'invalid', 'malformed keys are refused');
select is((select count(*)::int from generate_series(1, 11) n
  where public.save_push_subscription('https://web.push.apple.com/me-' || n, repeat('A', 87), repeat('b', 22)) = 'saved'), 11, 'more devices can be added');
reset role;
select is((select count(*)::int from public.push_subscriptions where user_id = '9054b000-0000-4000-8000-000000000001'), 10, 'only the 10 newest devices are kept');
set local role authenticated;

set local request.jwt.claim.sub = '9054b000-0000-4000-8000-000000000002';
select is(public.save_push_subscription('https://updates.push.services.mozilla.com/wpush/v2/friend', repeat('C', 87), repeat('d', 22)), 'saved', 'my friend stores a device');
select ok(not public.delete_push_subscription('https://web.push.apple.com/me-11'), 'nobody deletes someone else''s device');
set local request.jwt.claim.sub = '9054b000-0000-4000-8000-000000000003';
select is(public.save_push_subscription('https://wns2-par02p.notify.windows.com/w/?token=x', repeat('E', 87), repeat('f', 22)), 'saved', 'a new contact stores a device');
set local request.jwt.claim.sub = '9054b000-0000-4000-8000-000000000004';
select is(public.save_push_subscription('https://fcm.googleapis.com/fcm/send/blocked', repeat('G', 87), repeat('h', 22)), 'saved', 'a friend I will block stores a device');
reset role;
insert into public.blocks (blocker_id, blocked_id)
values ('9054b000-0000-4000-8000-000000000001', '9054b000-0000-4000-8000-000000000004');

-- Notices.
set local role authenticated;
set local request.jwt.claim.sub = '9054b000-0000-4000-8000-000000000001';
select is(public.send_message(public.open_direct_chat('9054b000-0000-4000-8000-000000000002'), 'Erste Gondel um 8?'), 'sent', 'I write to my friend');
select is(public.send_message(public.open_direct_chat('9054b000-0000-4000-8000-000000000002'), 'Oder 9?'), 'sent', 'and again');
select is(public.send_message(public.open_direct_chat('9054b000-0000-4000-8000-000000000005'), 'Hi'), 'sent', 'and to a friend without a device');
select is(public.request_friendship('push_3'), 'requested', 'I ask a new contact to be friends');
reset role;

select results_eq(
  $$select r.handle, o.kind, o.actor_id from private.push_outbox o join public.profiles r on r.id = o.recipient_id order by o.id$$,
  $$values ('push_2'::text, 'message'::text, '9054b000-0000-4000-8000-000000000001'::uuid),
           ('push_3', 'friend_request', '9054b000-0000-4000-8000-000000000001')$$,
  'one waiting notice per chat, none without a device, none for myself'
);

set local role service_role;
create temp table taken as select * from public.push_take_outbox();
reset role;
select results_eq(
  $$select endpoint, kind, actor_name, url like '/crew%' from taken order by endpoint$$,
  $$values ('https://updates.push.services.mozilla.com/wpush/v2/friend'::text, 'message'::text, 'Pusher 1'::text, true),
           ('https://wns2-par02p.notify.windows.com/w/?token=x', 'friend_request', 'Pusher 1', true)$$,
  'the sender gets each notice with the device, the actor''s name and a page; no message text'
);
select is((select count(*)::int from private.push_outbox), 0, 'taken notices leave the queue');

-- Accepting tells the one who asked, not the one who accepted.
set local role authenticated;
set local request.jwt.claim.sub = '9054b000-0000-4000-8000-000000000003';
select ok(public.accept_friendship('9054b000-0000-4000-8000-000000000001'), 'the new contact accepts');
reset role;
select is((select count(*)::int from private.push_outbox where kind = 'friend_accepted'), 1, 'one acceptance notice, to me');

-- Rides: the host hears about joins and requests.
delete from private.push_outbox;
insert into public.rides (id, host_id, resort, city, ability_level, ride_date, meet_time, meet_point, total_spots)
values ('9054b000-0000-4000-8000-0000000000aa', '9054b000-0000-4000-8000-000000000001', 'Nordkette', 'innsbruck', 'chill', current_date + 2, '09:00', 'Seegrube', 5);
insert into public.ride_participants (ride_id, user_id, status) values
  ('9054b000-0000-4000-8000-0000000000aa', '9054b000-0000-4000-8000-000000000002', 'accepted'),
  ('9054b000-0000-4000-8000-0000000000aa', '9054b000-0000-4000-8000-000000000003', 'pending');
select results_eq(
  $$select recipient_id, actor_id, kind, url from private.push_outbox order by id$$,
  $$values ('9054b000-0000-4000-8000-000000000001'::uuid, '9054b000-0000-4000-8000-000000000002'::uuid, 'ride_joined'::text, '/feed'::text),
           ('9054b000-0000-4000-8000-000000000001', '9054b000-0000-4000-8000-000000000003', 'ride_request', '/feed')$$,
  'the host hears about a join and a request'
);
update public.ride_participants set status = 'accepted'
where ride_id = '9054b000-0000-4000-8000-0000000000aa' and user_id = '9054b000-0000-4000-8000-000000000003';
select is((select count(*)::int from private.push_outbox where kind = 'ride_accepted' and recipient_id = '9054b000-0000-4000-8000-000000000003'), 1, 'an accepted rider hears about it');

-- Blocks: whatever the path, a block in either direction stops a notice.
select private.queue_push('9054b000-0000-4000-8000-000000000004', '9054b000-0000-4000-8000-000000000001', 'message', '/crew');
select private.queue_push('9054b000-0000-4000-8000-000000000001', '9054b000-0000-4000-8000-000000000004', 'message', '/crew');
select is((select count(*)::int from private.push_outbox where '9054b000-0000-4000-8000-000000000004' in (recipient_id, actor_id)), 0, 'no notice between blocked people');
set local role authenticated;
select is(jsonb_array_length(public.export_my_data() -> 'push_subscriptions'), 1, 'the export lists my devices');
reset role;

select * from finish();
rollback;
