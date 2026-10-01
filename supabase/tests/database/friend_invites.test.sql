begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

insert into auth.users (id, email)
values
  ('cdcdcdcd-0000-4000-8000-000000000001', 'inviter@example.com'),
  ('cdcdcdcd-0000-4000-8000-000000000002', 'guest@example.com'),
  ('cdcdcdcd-0000-4000-8000-000000000003', 'late@example.com'),
  ('cdcdcdcd-0000-4000-8000-000000000004', 'nameless@example.com');

update public.profiles
set display_name = 'Invite ' || right(id::text, 1), handle = 'invite_' || right(id::text, 1),
    city = 'salzburg', ability_level = 'park'
where id::text like 'cdcdcdcd-%' and right(id::text, 1) <> '4';

set local role anon;
select throws_ok($$select * from public.create_friend_invite()$$, '42501', null, 'anon cannot create invites');
select throws_ok($$select * from public.preview_friend_invite('x')$$, '42501', null, 'anon cannot preview invites');
reset role;

set local role authenticated;

set local request.jwt.claim.sub = 'cdcdcdcd-0000-4000-8000-000000000004';
select is((select status from public.create_friend_invite()), 'profile_incomplete', 'an unfinished profile cannot invite');

set local request.jwt.claim.sub = 'cdcdcdcd-0000-4000-8000-000000000001';

create temp table invite on commit drop as select * from public.create_friend_invite();
grant select on invite to authenticated;

select is((select status from invite), 'created', 'a finished profile can create an invite');
select matches((select token from invite), '^[0-9a-f]{32}$', 'the token is 32 random hex characters');
select is(public.accept_friend_invite((select token from invite)), 'self', 'your own link does not befriend you');
select throws_ok($$select * from public.friend_invites$$, '42501', null, 'invites cannot be read directly');

set local request.jwt.claim.sub = 'cdcdcdcd-0000-4000-8000-000000000002';

select results_eq(
  $$select status, inviter_handle from public.preview_friend_invite((select token from invite))$$,
  $$values ('valid'::text, 'invite_1'::text)$$,
  'a signed-in guest sees who invited them'
);

select is(public.accept_friend_invite((select token from invite)), 'accepted', 'confirming makes them friends');

select is(
  (select status from public.list_my_friendships() where handle = 'invite_1'),
  'accepted',
  'the friendship exists'
);

set local request.jwt.claim.sub = 'cdcdcdcd-0000-4000-8000-000000000003';
select is(public.accept_friend_invite((select token from invite)), 'used', 'a used link stops working');
select is(public.accept_friend_invite('0123456789abcdef0123456789abcdef'), 'not_found', 'an unknown link is not found');

reset role;
update public.friend_invites set expires_at = now() - interval '1 minute';
insert into public.friend_invites (token, inviter_id)
select md5(n::text), 'cdcdcdcd-0000-4000-8000-000000000001' from generate_series(1, 11) n;
set local role authenticated;

set local request.jwt.claim.sub = 'cdcdcdcd-0000-4000-8000-000000000003';
select is(public.accept_friend_invite(md5('1')) , 'accepted', 'a fresh link works for someone else');

set local request.jwt.claim.sub = 'cdcdcdcd-0000-4000-8000-000000000001';
select is((select status from public.create_friend_invite()), 'too_many', 'an eleventh open link is refused');

reset role;

select * from finish();

rollback;
