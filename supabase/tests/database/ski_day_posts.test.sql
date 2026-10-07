begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

-- me (1), friend (2), friend of a friend (3), stranger (4), friend who blocked me (5)
insert into auth.users (id, email)
select ('9057a000-0000-4000-8000-00000000000' || n)::uuid, 'post' || n || '@example.com'
from generate_series(1, 5) n;

update public.profiles
set display_name = 'Poster ' || right(id::text, 1), handle = 'post_' || right(id::text, 1),
    city = 'innsbruck', ability_level = 'chill'
where id::text like '9057a000-%';

insert into public.friendships (requester_id, addressee_id, status) values
  ('9057a000-0000-4000-8000-000000000001', '9057a000-0000-4000-8000-000000000002', 'accepted'),
  ('9057a000-0000-4000-8000-000000000002', '9057a000-0000-4000-8000-000000000003', 'accepted'),
  ('9057a000-0000-4000-8000-000000000001', '9057a000-0000-4000-8000-000000000005', 'accepted');
insert into public.blocks (blocker_id, blocked_id)
values ('9057a000-0000-4000-8000-000000000005', '9057a000-0000-4000-8000-000000000001');
insert into storage.objects (bucket_id, name)
values ('post-photos', '9057a000-0000-4000-8000-000000000001/a.webp');
insert into private.media_attestations (object_id, owner_id, bucket_id, name, key_id, issued_at)
select o.id, '9057a000-0000-4000-8000-000000000001', o.bucket_id, o.name, 'v1', now()
from storage.objects o where o.name = '9057a000-0000-4000-8000-000000000001/a.webp';

-- Closed table.
set local role authenticated;
set local request.jwt.claim.sub = '9057a000-0000-4000-8000-000000000001';
select throws_ok($$select * from public.posts$$, '42501', null, 'posts are not readable directly');
select throws_ok($$insert into public.posts (author_id, body) values (auth.uid(), 'x')$$, '42501', null, 'posts are not writable directly');

-- Creating.
select is(public.create_post('  Pulver am Stubai!  ', 'Stubai Glacier', '9057a000-0000-4000-8000-000000000001/a.webp'), 'created', 'I can post with a photo');
select is(public.create_post('Nur Text', null, null), 'created', 'a text-only post works');
select is(public.create_post('', null, null), 'invalid', 'an empty post is refused');
select is(public.create_post(repeat('a', 501), null, null), 'invalid', 'more than 500 characters is refused');
select is(public.create_post('bell' || chr(7), null, null), 'invalid', 'control characters are refused');
select is(public.create_post('x', null, '9057a000-0000-4000-8000-000000000002/a.webp'), 'invalid', 'a photo from someone else''s folder is refused');
select is(public.create_post('x', null, '9057a000-0000-4000-8000-000000000001/../x'), 'invalid', 'a path escape is refused');

select is((select count(*)::int from public.list_post_feed(null, true)), 2, 'I see my own posts');
select results_eq($$select body from public.list_post_feed() order by created_at limit 1$$, $$values ('Pulver am Stubai!'::text)$$, 'text is stored trimmed');

-- Audience.
set local request.jwt.claim.sub = '9057a000-0000-4000-8000-000000000002';
select is((select count(*)::int from public.list_post_feed()), 2, 'a friend sees my posts');
select isnt(public.post_photo_path_for((select id from public.list_post_feed() where has_photo)), null, 'a friend gets the photo path');
select ok(public.can_see_post_photo('9057a000-0000-4000-8000-000000000001/a.webp'), 'a friend may read the photo file');
create temp table friend_post as select id from public.list_post_feed() where has_photo;
grant select on friend_post to authenticated;

set local request.jwt.claim.sub = '9057a000-0000-4000-8000-000000000003';
select is((select count(*)::int from public.list_post_feed()), 0, 'a friend of a friend sees nothing');
select is(public.post_photo_path_for((select id from friend_post)), null, 'nor the photo path');
set local request.jwt.claim.sub = '9057a000-0000-4000-8000-000000000004';
select is((select count(*)::int from public.list_post_feed()), 0, 'a stranger sees nothing');
select ok(not public.can_see_post_photo('9057a000-0000-4000-8000-000000000001/a.webp'), 'a stranger may not read the photo file');
set local request.jwt.claim.sub = '9057a000-0000-4000-8000-000000000005';
select is((select count(*)::int from public.list_post_feed()), 0, 'a friend who blocked me sees nothing');

-- Deleting.
set local request.jwt.claim.sub = '9057a000-0000-4000-8000-000000000002';
select results_eq($$select deleted from public.delete_my_post((select id from friend_post))$$, $$values (false)$$, 'nobody deletes someone else''s post');
set local request.jwt.claim.sub = '9057a000-0000-4000-8000-000000000001';
select results_eq($$select deleted, photo_path from public.delete_my_post((select id from friend_post))$$,
  $$values (true, '9057a000-0000-4000-8000-000000000001/a.webp'::text)$$, 'I delete my post and learn its photo path');

-- Rate limit: 10 a day.
select is((select count(*)::int from generate_series(1, 9) n where public.create_post('post ' || n, null, null) = 'created'), 9, 'up to ten posts a day');
select is(public.create_post('one more', null, null), 'rate_limited', 'the eleventh post in a day is refused');

-- Export.
select is(jsonb_array_length(public.export_my_data() -> 'posts'), 10, 'the export lists my posts');
reset role;

select * from finish();
rollback;
