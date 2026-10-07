begin;
create extension if not exists pgtap with schema extensions;
create table if not exists auth.sessions (id uuid primary key, user_id uuid);
select plan(9);

insert into auth.users (id, email) values
  ('a8a8a8a8-0000-4000-8000-000000000001', 'hardening1@example.com'),
  ('a8a8a8a8-0000-4000-8000-000000000002', 'hardening2@example.com'),
  ('a8a8a8a8-0000-4000-8000-000000000003', 'hardening3@example.com');
update public.profiles set display_name = 'Hardening ' || right(id::text, 1),
  handle = 'harden_' || right(id::text, 1), city = 'innsbruck', ability_level = 'chill'
where id::text like 'a8a8a8a8-%';
insert into auth.sessions (id, user_id) select id, id from auth.users where id::text like 'a8a8a8a8-%';
select throws_ok($$insert into private.push_outbox (recipient_id, actor_id, kind, url)
  values ('a8a8a8a8-0000-4000-8000-000000000002',
          'a8a8a8a8-0000-4000-8000-000000000001', 'message', '//evil')$$,
  '23514', null, 'queued push URL cannot be protocol-relative');
insert into public.friendships (requester_id, addressee_id, status) values
  ('a8a8a8a8-0000-4000-8000-000000000001', 'a8a8a8a8-0000-4000-8000-000000000002', 'accepted');
insert into storage.objects (bucket_id, name) values
  ('avatars', 'a8a8a8a8-0000-4000-8000-000000000001/current.webp'),
  ('avatars', 'a8a8a8a8-0000-4000-8000-000000000001/old.webp'),
  ('post-photos', 'a8a8a8a8-0000-4000-8000-000000000001/current.webp'),
  ('post-photos', 'a8a8a8a8-0000-4000-8000-000000000001/orphan.webp');
insert into private.media_attestations (object_id, owner_id, bucket_id, name, key_id, issued_at)
select o.id, 'a8a8a8a8-0000-4000-8000-000000000001', o.bucket_id, o.name, 'v1', now()
from storage.objects o where o.name in (
  'a8a8a8a8-0000-4000-8000-000000000001/current.webp'
);
update public.profiles set avatar_path = id::text || '/current.webp'
where id = 'a8a8a8a8-0000-4000-8000-000000000001';
insert into public.posts (id, author_id, body, photo_path) values
  ('a8a8a8a8-0000-4000-8000-0000000000aa', 'a8a8a8a8-0000-4000-8000-000000000001',
   'A current post', 'a8a8a8a8-0000-4000-8000-000000000001/current.webp');

set local role authenticated;
set local request.jwt.claim.sub = 'a8a8a8a8-0000-4000-8000-000000000002';
set local request.jwt.claims = '{"role":"authenticated","session_id":"a8a8a8a8-0000-4000-8000-000000000002"}';
select is((select count(*)::int from storage.objects where bucket_id = 'avatars'
  and name = 'a8a8a8a8-0000-4000-8000-000000000001/old.webp'), 0,
  'friends cannot fetch an old avatar that is no longer current');
select is(public.can_see_post_photo('a8a8a8a8-0000-4000-8000-000000000001/orphan.webp'), false,
  'a friend cannot authorize an unattached post photo');
select is((select count(*)::int from storage.objects where bucket_id = 'post-photos'
  and name = 'a8a8a8a8-0000-4000-8000-000000000001/orphan.webp'), 0,
  'storage RLS also hides unattached post photos');
reset role;
delete from public.posts where id = 'a8a8a8a8-0000-4000-8000-0000000000aa';
set local role authenticated;
set local request.jwt.claim.sub = 'a8a8a8a8-0000-4000-8000-000000000002';
set local request.jwt.claims = '{"role":"authenticated","session_id":"a8a8a8a8-0000-4000-8000-000000000002"}';
select is((select count(*)::int from storage.objects where bucket_id = 'post-photos'
  and name = 'a8a8a8a8-0000-4000-8000-000000000001/current.webp'), 0,
  'a deleted post no longer grants access to an orphaned photo');

set local request.jwt.claim.sub = 'a8a8a8a8-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"role":"authenticated","session_id":"a8a8a8a8-0000-4000-8000-000000000001"}';
select is(public.save_push_subscription('https://fcm.googleapis.com/fcm/send/hardening-one',
  repeat('A', 87), repeat('b', 22)), 'saved', 'owner can register their push endpoint');
set local request.jwt.claim.sub = 'a8a8a8a8-0000-4000-8000-000000000003';
set local request.jwt.claims = '{"role":"authenticated","session_id":"a8a8a8a8-0000-4000-8000-000000000003"}';
select is(public.save_push_subscription('https://fcm.googleapis.com/fcm/send/hardening-one',
  repeat('C', 87), repeat('d', 22)), 'invalid', 'another account cannot take over that endpoint');
reset role;
select is((select user_id from public.push_subscriptions
  where endpoint = 'https://fcm.googleapis.com/fcm/send/hardening-one'),
  'a8a8a8a8-0000-4000-8000-000000000001'::uuid, 'the endpoint remains with its owner');

set local role authenticated;
set local request.jwt.claim.sub = 'a8a8a8a8-0000-4000-8000-000000000002';
set local request.jwt.claims = '{"role":"authenticated","session_id":"a8a8a8a8-0000-4000-8000-000000000002"}';
select public.save_push_subscription('https://fcm.googleapis.com/fcm/send/hardening-two',
  repeat('A', 87), repeat('b', 22));
reset role;
select private.queue_push('a8a8a8a8-0000-4000-8000-000000000002',
  'a8a8a8a8-0000-4000-8000-000000000001', 'message', '/crew');
insert into public.blocks (blocker_id, blocked_id) values
  ('a8a8a8a8-0000-4000-8000-000000000002', 'a8a8a8a8-0000-4000-8000-000000000001');
set local role service_role;
create temp table pg_temp.blocked_dispatch as select * from public.push_take_outbox();
reset role;
select is((select count(*)::int from pg_temp.blocked_dispatch), 0,
  'a queued push is rechecked against a block before dispatch');

select * from finish();
rollback;
