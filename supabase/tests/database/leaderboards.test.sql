begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

-- me (1, adult), friend (2, adult), friend who hides (3), stranger in region opted in (4, adult),
-- minor in region opted in (5), stranger in region not opted in (6), region person who blocked me (7),
-- opted-in person in the other region (8)
insert into auth.users (id, email)
select ('905d0000-0000-4000-8000-00000000000' || n)::uuid, 'board' || n || '@example.com'
from generate_series(1, 8) n;

update public.profiles
set display_name = 'Rider ' || right(id::text, 1), handle = 'board_' || right(id::text, 1),
    city = case when right(id::text, 1) = '8' then 'salzburg' else 'innsbruck' end, ability_level = 'chill',
    is_minor = right(id::text, 1) = '5',
    leaderboard_region = right(id::text, 1) in ('1', '4', '5', '7', '8'),
    leaderboard_friends = right(id::text, 1) <> '3'
where id::text like '905d0000-%';

insert into public.friendships (requester_id, addressee_id, status) values
  ('905d0000-0000-4000-8000-000000000001', '905d0000-0000-4000-8000-000000000002', 'accepted'),
  ('905d0000-0000-4000-8000-000000000001', '905d0000-0000-4000-8000-000000000003', 'accepted');
insert into public.blocks (blocker_id, blocked_id)
values ('905d0000-0000-4000-8000-000000000007', '905d0000-0000-4000-8000-000000000001');

-- One day each this season (vertical 1000 * n), plus one last season for me.
insert into public.ski_days (user_id, started_at, ended_at, distance_m, vertical_m, max_speed_kmh, runs)
select ('905d0000-0000-4000-8000-00000000000' || n)::uuid, now() - interval '3 hours', now() - interval '1 hour', 10000 * n, 1000 * n, 50 + n, n
from generate_series(1, 8) n;
insert into public.ski_days (user_id, started_at, ended_at, distance_m, vertical_m, max_speed_kmh, runs)
values ('905d0000-0000-4000-8000-000000000001', private.season_start() - interval '30 days', private.season_start() - interval '30 days' + interval '2 hours', 99000, 20000, 120, 1);

set local role authenticated;
set local request.jwt.claim.sub = '905d0000-0000-4000-8000-000000000001';

select results_eq(
  $$select handle, value from public.leaderboard('friends', 'vertical')$$,
  $$values ('board_2'::text, 2000::numeric), ('board_1', 1000)$$,
  'friends: me and friends who show themselves, this season only'
);
select results_eq(
  $$select rank, is_me from public.leaderboard('friends', 'vertical') where is_me$$,
  $$values (2, true)$$, 'my own rank is marked'
);
select is((select value from public.leaderboard('friends', 'days') where is_me), 1::numeric, 'days count this season only');
select is((select value from public.leaderboard('friends', 'speed') where is_me), 51::numeric, 'top speed this season only');

select results_eq(
  $$select handle, anonymous, value from public.leaderboard('region', 'vertical') order by rank$$,
  $$values (null::text, true, 5000::numeric), ('board_4', false, 4000), ('board_1', false, 1000)$$,
  'region: opted in, same region, minors anonymous, no blocked people, no other region'
);
select is((select user_id from public.leaderboard('region', 'vertical') where anonymous), null, 'an anonymous rider carries no id');

select is((select count(*)::int from public.leaderboard('nonsense', 'vertical')), 0, 'unknown scopes return nothing');
select is((select count(*)::int from public.leaderboard('friends', 'nonsense')), 0, 'unknown metrics return nothing');

-- The minor sees themselves with their name.
set local request.jwt.claim.sub = '905d0000-0000-4000-8000-000000000005';
select results_eq($$select handle, anonymous from public.leaderboard('region', 'vertical') where is_me$$,
  $$values ('board_5'::text, false)$$, 'a minor sees their own row by name');

-- Someone who did not opt in sees the board but is not on it.
set local request.jwt.claim.sub = '905d0000-0000-4000-8000-000000000006';
select ok(not exists (select 1 from public.leaderboard('region', 'vertical') where is_me), 'not opted in: not on the region board');
select is((select count(*)::int from public.leaderboard('region', 'vertical')), 4, 'but the opted-in riders are visible');

-- The friend who hides does not appear to me, but sees themselves.
set local request.jwt.claim.sub = '905d0000-0000-4000-8000-000000000003';
select ok(exists (select 1 from public.leaderboard('friends', 'vertical') where is_me), 'someone hidden still sees their own row');

-- Settings: only the own row, only these columns.
set local request.jwt.claim.sub = '905d0000-0000-4000-8000-000000000001';
update public.profiles set leaderboard_region = false where id = '905d0000-0000-4000-8000-000000000001';
select is((select leaderboard_region from public.profiles where id = '905d0000-0000-4000-8000-000000000001'), false, 'I can leave the region board');
select ok(not exists (select 1 from public.leaderboard('region', 'vertical') where is_me), 'and I am off it');

select * from finish();
rollback;
