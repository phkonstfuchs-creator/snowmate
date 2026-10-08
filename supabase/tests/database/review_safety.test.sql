begin;

create extension if not exists pgtap with schema extensions;

select plan(38);

-- asker (1), decliner (2), reporter (3), second reporter (4), author (5)
insert into auth.users (id, email)
select ('7e710000-0000-4000-8000-00000000000' || n)::uuid, 'review' || n || '@example.com'
from generate_series(1, 5) n;

update public.profiles
set display_name = 'Review ' || right(id::text, 1), handle = 'review_' || right(id::text, 1),
    city = 'innsbruck', ability_level = 'chill', onboarding_completed = true
where id::text like '7e710000-%';

-- ── Word filter: invisible characters and spaced letters ────────────
select ok(private.has_blocked_term('neger test'), 'the plain slur is caught');
select ok(private.has_blocked_term(E'ne​ger test'), 'a zero-width space inside the slur is caught');
select ok(private.has_blocked_term(E'ne­ger'), 'a soft hyphen inside the slur is caught');
select ok(private.has_blocked_term(E'k﻿ys'), 'a byte-order mark inside a term is caught');
select ok(private.has_blocked_term('k y s'), 'single letters with spaces are caught');
select ok(private.has_blocked_term('k y s.'), 'spaced letters followed by a full stop are caught');
select ok(private.has_blocked_term('h e i l hitler'), 'a spaced-out slogan is caught');
select ok(not private.has_blocked_term('ski a b c heute'), 'single letters in normal text stay harmless');
select ok(not private.has_blocked_term('Pulver am Stubai, wer kommt mit?'), 'normal ski talk passes');

-- ── Friend requests: declines lead to a growing pause ───────────────
set local role authenticated;

-- Decline once: asking again is fine.
set local request.jwt.claim.sub = '7e710000-0000-4000-8000-000000000001';
select is(public.request_friendship('review_2'), 'requested', 'a first request goes out');
set local request.jwt.claim.sub = '7e710000-0000-4000-8000-000000000002';
select ok(public.remove_friendship('7e710000-0000-4000-8000-000000000001'), 'the addressee declines');
set local request.jwt.claim.sub = '7e710000-0000-4000-8000-000000000001';
select is(public.request_friendship('review_2'), 'requested', 'after one decline a new request is allowed');

-- Decline twice: a pause starts.
set local request.jwt.claim.sub = '7e710000-0000-4000-8000-000000000002';
select ok(public.remove_friendship('7e710000-0000-4000-8000-000000000001'), 'the addressee declines again');
set local request.jwt.claim.sub = '7e710000-0000-4000-8000-000000000001';
select is(public.request_friendship('review_2'), 'cooling_down', 'after two declines the asker has to wait');

-- A withdrawal by the asker is not a decline.
set local request.jwt.claim.sub = '7e710000-0000-4000-8000-000000000003';
select is(public.request_friendship('review_2'), 'requested', 'someone else asks');
select ok(public.remove_friendship('7e710000-0000-4000-8000-000000000002'), 'and withdraws');
select is(public.request_friendship('review_2'), 'requested', 'a withdrawal never pauses the asker');

-- The declined person can still ask the asker themselves.
set local request.jwt.claim.sub = '7e710000-0000-4000-8000-000000000002';
select is(public.request_friendship('review_1'), 'requested', 'the decliner can still ask the other way');
select ok(public.remove_friendship('7e710000-0000-4000-8000-000000000001'), 'and withdraw again');

-- The pause ends; after five declines it never does.
reset role;
update private.friend_request_declines set last_declined_at = now() - interval '8 days'
where requester_id = '7e710000-0000-4000-8000-000000000001';
set local role authenticated;
set local request.jwt.claim.sub = '7e710000-0000-4000-8000-000000000001';
select is(public.request_friendship('review_2'), 'requested', 'after a week the pause for two declines is over');
reset role;
delete from public.friendships where requester_id = '7e710000-0000-4000-8000-000000000001';
update private.friend_request_declines set declines = 5, last_declined_at = now() - interval '5 years'
where requester_id = '7e710000-0000-4000-8000-000000000001';
set local role authenticated;
select is(public.request_friendship('review_2'), 'declined_often', 'after five declines the asker can no longer ask');
select throws_ok($$select * from private.friend_request_declines$$, '42501', null, 'nobody reads the decline record');

-- ── Reported posts are held ─────────────────────────────────────────
reset role;
insert into public.friendships (requester_id, addressee_id, status) values
  ('7e710000-0000-4000-8000-000000000005', '7e710000-0000-4000-8000-000000000003', 'accepted'),
  ('7e710000-0000-4000-8000-000000000005', '7e710000-0000-4000-8000-000000000004', 'accepted'),
  ('7e710000-0000-4000-8000-000000000005', '7e710000-0000-4000-8000-000000000002', 'accepted');
insert into storage.objects (bucket_id, name)
values ('post-photos', '7e710000-0000-4000-8000-000000000005/held.webp');
insert into private.media_attestations (object_id, owner_id, bucket_id, name, key_id, issued_at)
select o.id, '7e710000-0000-4000-8000-000000000005', o.bucket_id, o.name, 'v1', now()
from storage.objects o where o.name = '7e710000-0000-4000-8000-000000000005/held.webp';
set local role authenticated;
set local request.jwt.claim.sub = '7e710000-0000-4000-8000-000000000005';
select is(public.create_post('Seht euch das an', null, '7e710000-0000-4000-8000-000000000005/held.webp'), 'created', 'the author posts with a photo');

create temp table held_post as
  select p.id from public.list_post_feed(null, true) p;
grant select on held_post to authenticated;

set local request.jwt.claim.sub = '7e710000-0000-4000-8000-000000000003';
select is(
  public.report_user('7e710000-0000-4000-8000-000000000005', 'harassment', null, null, false, (select id from held_post)),
  'reported', 'a friend reports the post');
select is((select count(*)::int from public.list_post_feed()), 0, 'the reporter no longer sees the post');
select is(public.post_photo_path_for((select id from held_post)), null, 'nor its photo path');
select ok(not public.can_see_post_photo('7e710000-0000-4000-8000-000000000005/held.webp'), 'nor the photo file');

select is(
  public.report_user('7e710000-0000-4000-8000-000000000005', 'spam', null, null, false, (select id from held_post)),
  'reported', 'reporting the same post again is accepted');
reset role;
select is(
  (select count(*)::int from public.reports where post_id = (select id from held_post)),
  1, 'but stored once, so one person never counts twice');
set local role authenticated;

set local request.jwt.claim.sub = '7e710000-0000-4000-8000-000000000002';
select is((select count(*)::int from public.list_post_feed()), 1, 'one report alone does not hide it from others');

set local request.jwt.claim.sub = '7e710000-0000-4000-8000-000000000004';
select is(
  public.report_user('7e710000-0000-4000-8000-000000000005', 'spam', null, null, false, (select id from held_post)),
  'reported', 'a second person reports it');

set local request.jwt.claim.sub = '7e710000-0000-4000-8000-000000000002';
select is((select count(*)::int from public.list_post_feed()), 0, 'two reports hold the post for everyone until review');
select ok(not public.can_see_post_photo('7e710000-0000-4000-8000-000000000005/held.webp'), 'the photo is held too');

set local request.jwt.claim.sub = '7e710000-0000-4000-8000-000000000005';
select is((select count(*)::int from public.list_post_feed(null, true)), 1, 'the author still sees their own post');
select isnt(public.post_photo_path_for((select id from held_post)), null, 'and its photo');

-- A reporter deleting their account does not release the hold.
reset role;
delete from auth.users where id = '7e710000-0000-4000-8000-000000000004';
set local role authenticated;
set local request.jwt.claim.sub = '7e710000-0000-4000-8000-000000000002';
select is((select count(*)::int from public.list_post_feed()), 0, 'the hold stays when a reporter deletes their account');

-- The operator's review brings it back.
reset role;
update public.reports set status = 'reviewed' where post_id = (select id from held_post);
set local role authenticated;
select is((select count(*)::int from public.list_post_feed()), 1, 'a reviewed post is visible again');
select ok(public.can_see_post_photo('7e710000-0000-4000-8000-000000000005/held.webp'), 'with its photo');

select * from finish();
rollback;
