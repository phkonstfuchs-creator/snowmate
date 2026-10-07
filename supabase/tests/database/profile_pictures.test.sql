begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

-- owner (1), friend (2), friend of a friend (3), stranger (4), ride mate (5),
-- minor (6, friend of 2), blocked friend (7)
insert into auth.users (id, email)
select ('a7a7a7a7-0000-4000-8000-00000000000' || n)::uuid, 'pic' || n || '@example.com'
from generate_series(1, 7) n;
insert into auth.sessions (id, user_id)
select id, id from auth.users where id::text like 'a7a7a7a7-%';

update public.profiles
set display_name = 'Pic ' || right(id::text, 1), handle = 'pic_' || right(id::text, 1),
    city = 'innsbruck', ability_level = 'chill', birth_date = date '1995-01-01'
where id::text like 'a7a7a7a7-%';
update public.profiles set birth_date = (private.local_today() - interval '15 years')::date
where id = 'a7a7a7a7-0000-4000-8000-000000000006';

insert into public.friendships (requester_id, addressee_id, status) values
  ('a7a7a7a7-0000-4000-8000-000000000001', 'a7a7a7a7-0000-4000-8000-000000000002', 'accepted'),
  ('a7a7a7a7-0000-4000-8000-000000000002', 'a7a7a7a7-0000-4000-8000-000000000003', 'accepted'),
  ('a7a7a7a7-0000-4000-8000-000000000006', 'a7a7a7a7-0000-4000-8000-000000000002', 'accepted'),
  ('a7a7a7a7-0000-4000-8000-000000000001', 'a7a7a7a7-0000-4000-8000-000000000007', 'accepted');
insert into public.blocks (blocker_id, blocked_id)
values ('a7a7a7a7-0000-4000-8000-000000000007', 'a7a7a7a7-0000-4000-8000-000000000001');

insert into public.rides (id, host_id, resort, city, ability_level, ride_date, meet_time, meet_point, total_spots)
values ('a7a7f1de-0000-4000-8000-000000000001', 'a7a7a7a7-0000-4000-8000-000000000001',
        'Nordkette', 'innsbruck', 'chill', current_date + 1, '09:00', 'Seegrube', 4);
insert into public.ride_participants (ride_id, user_id, status)
values ('a7a7f1de-0000-4000-8000-000000000001', 'a7a7a7a7-0000-4000-8000-000000000005', 'accepted');

insert into storage.objects (bucket_id, name)
select 'avatars', id::text || '/me.webp' from public.profiles where id::text like 'a7a7a7a7-%';
insert into private.media_attestations (object_id, owner_id, bucket_id, name, key_id, issued_at)
select o.id, split_part(o.name, '/', 1)::uuid, o.bucket_id, o.name, 'v1', now()
from storage.objects o where o.bucket_id = 'avatars' and o.name like 'a7a7a7a7-%';
update public.profiles set avatar_path = id::text || '/me.webp'
where id::text like 'a7a7a7a7-%';

create function pg_temp.sees(viewer text, owner text) returns boolean language plpgsql as $$
declare result boolean;
begin
  perform set_config('request.jwt.claim.sub', viewer, true);
  perform set_config('request.jwt.claims',
    jsonb_build_object('role', 'authenticated', 'session_id', viewer)::text, true);
  execute 'set local role authenticated';
  select public.can_see_avatar(owner::uuid) into result;
  execute 'reset role';
  return result;
end $$;

select is(bucket_id, 'avatars', 'the avatars bucket exists') from (select id as bucket_id from storage.buckets where id = 'avatars') b;
select is((select public from storage.buckets where id = 'avatars'), false, 'the bucket is private');

-- Default: friends only.
select is(pg_temp.sees('a7a7a7a7-0000-4000-8000-000000000001', 'a7a7a7a7-0000-4000-8000-000000000001'), true, 'I see my own picture');
select is(pg_temp.sees('a7a7a7a7-0000-4000-8000-000000000002', 'a7a7a7a7-0000-4000-8000-000000000001'), true, 'a friend sees it');
select is(pg_temp.sees('a7a7a7a7-0000-4000-8000-000000000003', 'a7a7a7a7-0000-4000-8000-000000000001'), false, 'a friend of a friend does not, by default');
select is(pg_temp.sees('a7a7a7a7-0000-4000-8000-000000000005', 'a7a7a7a7-0000-4000-8000-000000000001'), false, 'a ride mate does not, by default');
select is(pg_temp.sees('a7a7a7a7-0000-4000-8000-000000000004', 'a7a7a7a7-0000-4000-8000-000000000001'), false, 'a stranger does not');
select is(pg_temp.sees('a7a7a7a7-0000-4000-8000-000000000007', 'a7a7a7a7-0000-4000-8000-000000000001'), false, 'a friend who blocked me does not');
select is(pg_temp.sees('a7a7a7a7-0000-4000-8000-000000000001', 'a7a7a7a7-0000-4000-8000-000000000007'), false, 'nor do I see theirs');

-- Contacts: friends of friends and ride mates too.
update public.profiles set avatar_visibility = 'contacts' where id in ('a7a7a7a7-0000-4000-8000-000000000001', 'a7a7a7a7-0000-4000-8000-000000000006');
select is(pg_temp.sees('a7a7a7a7-0000-4000-8000-000000000003', 'a7a7a7a7-0000-4000-8000-000000000001'), true, 'with contacts, a friend of a friend sees it');
select is(pg_temp.sees('a7a7a7a7-0000-4000-8000-000000000005', 'a7a7a7a7-0000-4000-8000-000000000001'), true, 'with contacts, a ride mate sees it');
select is(pg_temp.sees('a7a7a7a7-0000-4000-8000-000000000004', 'a7a7a7a7-0000-4000-8000-000000000001'), false, 'with contacts, a stranger still does not');
select is(pg_temp.sees('a7a7a7a7-0000-4000-8000-000000000007', 'a7a7a7a7-0000-4000-8000-000000000001'), false, 'with contacts, a block still hides it');

-- Minors stay friends-only.
select is(pg_temp.sees('a7a7a7a7-0000-4000-8000-000000000002', 'a7a7a7a7-0000-4000-8000-000000000006'), true, 'a minor''s friend sees the picture');
select is(pg_temp.sees('a7a7a7a7-0000-4000-8000-000000000003', 'a7a7a7a7-0000-4000-8000-000000000006'), false, 'a minor''s picture stays friends-only even with contacts');

-- Paths and storage rows follow the same rule.
set local role authenticated;
set local request.jwt.claim.sub = 'a7a7a7a7-0000-4000-8000-000000000004';
set local request.jwt.claims = '{"role":"authenticated","session_id":"a7a7a7a7-0000-4000-8000-000000000004"}';
select is(public.avatar_path_for('a7a7a7a7-0000-4000-8000-000000000001'), null, 'a stranger gets no path');
select is((select count(*)::int from storage.objects where bucket_id = 'avatars'), 1, 'a stranger reads only their own object');
set local request.jwt.claim.sub = 'a7a7a7a7-0000-4000-8000-000000000002';
set local request.jwt.claims = '{"role":"authenticated","session_id":"a7a7a7a7-0000-4000-8000-000000000002"}';
select is(public.avatar_path_for('a7a7a7a7-0000-4000-8000-000000000001'), 'a7a7a7a7-0000-4000-8000-000000000001/me.webp', 'a friend gets the path');

-- Writing: only your own folder.
set local request.jwt.claim.sub = 'a7a7a7a7-0000-4000-8000-000000000004';
set local request.jwt.claims = '{"role":"authenticated","session_id":"a7a7a7a7-0000-4000-8000-000000000004"}';
select lives_ok($$insert into storage.objects (bucket_id, name) values ('avatars', 'a7a7a7a7-0000-4000-8000-000000000004/new.webp')$$,
  'I can upload into my own folder');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('avatars', 'a7a7a7a7-0000-4000-8000-000000000001/evil.webp')$$,
  '42501', null, 'I cannot upload into someone else''s folder');
reset role;

-- Visibility values are fixed; anon cannot ask.
select throws_ok($$update public.profiles set avatar_visibility = 'everyone' where id = 'a7a7a7a7-0000-4000-8000-000000000001'$$,
  '23514', null, 'only friends or contacts');
set local role anon;
select throws_ok($$select public.can_see_avatar('a7a7a7a7-0000-4000-8000-000000000001')$$, '42501', null, 'anon cannot ask');
reset role;

select * from finish();
rollback;
