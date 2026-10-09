begin;

create extension if not exists pgtap with schema extensions;

select plan(21);

-- Adults: 1 me, 2 opted in, 3 not opted in, 4 other region, 5 blocked me, 6 already my friend.
-- Teens 16-17: 7 me-teen, 8 friend of a friend of 7, 9 stranger teen. 10 is the shared friend (16-17).
-- 11 is 14-15 and also a friend of 10.
insert into auth.users (id, email)
select ('905e0000-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid, 'swipe' || n || '@example.com'
from generate_series(1, 11) n;

update public.profiles p
set display_name = 'Swiper ' || right(p.id::text, 2), handle = 'swipe_' || right(p.id::text, 2),
    ability_level = 'chill', onboarding_completed = true,
    city = case when right(p.id::text, 2) = '04' then 'salzburg' else 'innsbruck' end,
    discoverable = right(p.id::text, 2) <> '03',
    birth_date = case
      when right(p.id::text, 2) in ('07', '08', '09', '10') then (current_date - interval '17 years')::date
      when right(p.id::text, 2) = '11' then (current_date - interval '15 years')::date
      else (current_date - interval '25 years')::date end
where p.id::text like '905e0000-%';

insert into public.friendships (requester_id, addressee_id, status) values
  ('905e0000-0000-4000-8000-000000000001', '905e0000-0000-4000-8000-000000000006', 'accepted'),
  ('905e0000-0000-4000-8000-000000000007', '905e0000-0000-4000-8000-000000000010', 'accepted'),
  ('905e0000-0000-4000-8000-000000000008', '905e0000-0000-4000-8000-000000000010', 'accepted'),
  ('905e0000-0000-4000-8000-000000000011', '905e0000-0000-4000-8000-000000000010', 'accepted');
insert into public.blocks (blocker_id, blocked_id)
values ('905e0000-0000-4000-8000-000000000005', '905e0000-0000-4000-8000-000000000001');

-- Model an active authenticated session for the session-bound account export.
insert into auth.sessions(id,user_id) select id,id from auth.users on conflict (id) do nothing;
set local role authenticated;
set local request.jwt.claim.sub = '905e0000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"role":"authenticated","session_id":"905e0000-0000-4000-8000-000000000001"}';

select throws_ok($$select * from public.swipes$$, '42501', null, 'swipes are not readable directly');
select results_eq($$select display_name from public.discovery_deck()$$, $$values ('Swiper 02'::text)$$,
  'adult deck: opted-in adults of my region, no blocks, no friends, no teens');

-- Teens.
set local request.jwt.claim.sub = '905e0000-0000-4000-8000-000000000007';
set local request.jwt.claims = '{"role":"authenticated","session_id":"905e0000-0000-4000-8000-000000000007"}';
select results_eq($$select display_name, mutual_friends from public.discovery_deck()$$, $$values ('Swiper 08'::text, 1)$$,
  'teen deck: only friends of friends in the same age band');
select is(public.swipe('905e0000-0000-4000-8000-000000000009', true), 'invalid', 'a teen cannot like a stranger teen');
select is(public.swipe('905e0000-0000-4000-8000-000000000011', true), 'invalid', 'nor someone from the younger band');
select is(public.swipe('905e0000-0000-4000-8000-000000000001', true), 'invalid', 'nor an adult');
set local request.jwt.claim.sub = '905e0000-0000-4000-8000-000000000011';
set local request.jwt.claims = '{"role":"authenticated","session_id":"905e0000-0000-4000-8000-000000000011"}';
select is((select count(*)::int from public.discovery_deck()), 0, '14-15 sees nobody from 16-17 even with a shared friend');
set local request.jwt.claim.sub = '905e0000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"role":"authenticated","session_id":"905e0000-0000-4000-8000-000000000001"}';
select is(public.swipe('905e0000-0000-4000-8000-000000000007', true), 'invalid', 'an adult cannot like a teen');

-- Liking and matching (adults).
select is(public.swipe('905e0000-0000-4000-8000-000000000002', true), 'liked', 'I like someone');
select is((select count(*)::int from public.discovery_deck()), 0, 'a liked person leaves my deck');
set local request.jwt.claim.sub = '905e0000-0000-4000-8000-000000000002';
set local request.jwt.claims = '{"role":"authenticated","session_id":"905e0000-0000-4000-8000-000000000002"}';
select is(public.swipe('905e0000-0000-4000-8000-000000000001', true), 'matched', 'they like me back: a match');
reset role;
select ok(private.are_friends('905e0000-0000-4000-8000-000000000001', '905e0000-0000-4000-8000-000000000002'), 'a match makes us friends');
set local role authenticated;
select is(public.swipe('905e0000-0000-4000-8000-000000000001', true), 'invalid', 'friends no longer appear to swipe');

-- Passing hides for 30 days.
set local request.jwt.claim.sub = '905e0000-0000-4000-8000-000000000008';
set local request.jwt.claims = '{"role":"authenticated","session_id":"905e0000-0000-4000-8000-000000000008"}';
select is(public.swipe('905e0000-0000-4000-8000-000000000007', false), 'passed', 'a teen passes');
select is((select count(*)::int from public.discovery_deck()), 0, 'and the person is gone from the deck');
reset role;
update public.swipes set created_at = now() - interval '31 days' where swiper_id = '905e0000-0000-4000-8000-000000000008';
set local role authenticated;
select is((select count(*)::int from public.discovery_deck()), 1, 'after 30 days they can come back');

-- Not opted in: no deck, nobody can swipe on me.
set local request.jwt.claim.sub = '905e0000-0000-4000-8000-000000000003';
set local request.jwt.claims = '{"role":"authenticated","session_id":"905e0000-0000-4000-8000-000000000003"}';
select is((select count(*)::int from public.discovery_deck()), 0, 'not discoverable: empty deck');
set local request.jwt.claim.sub = '905e0000-0000-4000-8000-000000000002';
set local request.jwt.claims = '{"role":"authenticated","session_id":"905e0000-0000-4000-8000-000000000002"}';
select is(public.swipe('905e0000-0000-4000-8000-000000000003', true), 'invalid', 'and nobody can like me');

-- Opting out takes effect at once; only the own row.
set local request.jwt.claim.sub = '905e0000-0000-4000-8000-000000000008';
set local request.jwt.claims = '{"role":"authenticated","session_id":"905e0000-0000-4000-8000-000000000008"}';
update public.profiles set discoverable = false where id = '905e0000-0000-4000-8000-000000000008';
set local request.jwt.claim.sub = '905e0000-0000-4000-8000-000000000007';
set local request.jwt.claims = '{"role":"authenticated","session_id":"905e0000-0000-4000-8000-000000000007"}';
select is((select count(*)::int from public.discovery_deck()), 0, 'someone who opted out disappears');

-- Rate limit and export.
reset role;
insert into public.swipes (swiper_id, target_id, liked, created_at)
select '905e0000-0000-4000-8000-000000000001', ('905e0000-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid, false, now()
from generate_series(3, 11) n where n <> 6 and n <> 5
on conflict do nothing;
set local role authenticated;
set local request.jwt.claim.sub = '905e0000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"role":"authenticated","session_id":"905e0000-0000-4000-8000-000000000001"}';
select is(jsonb_array_length(public.export_my_data() -> 'discovery_swipes'), 8, 'the export lists my swipes');
select is(public.swipe(null, true), 'invalid', 'nonsense is refused');

select * from finish();
rollback;
