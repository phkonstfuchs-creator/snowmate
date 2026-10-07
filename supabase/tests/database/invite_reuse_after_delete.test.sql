begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

insert into auth.users (id, email) values
  ('a8a8a8a8-0000-4000-8000-0000000000e1', 'single-use-owner@example.com'),
  ('a8a8a8a8-0000-4000-8000-0000000000e2', 'single-use-guest@example.com'),
  ('a8a8a8a8-0000-4000-8000-0000000000e3', 'single-use-attacker@example.com');
update public.profiles set display_name = 'Invite ' || right(id::text, 1),
  handle = 'single_' || right(id::text, 1), city = 'innsbruck', ability_level = 'chill'
where id::text like 'a8a8a8a8-%';
insert into public.friend_invites (token, inviter_id, used_by, used_at)
values ('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        'a8a8a8a8-0000-4000-8000-0000000000e1',
        'a8a8a8a8-0000-4000-8000-0000000000e2', now());
delete from auth.users where id = 'a8a8a8a8-0000-4000-8000-0000000000e2';

set local role authenticated;
set local request.jwt.claim.sub = 'a8a8a8a8-0000-4000-8000-0000000000e3';
select is((select status from public.preview_friend_invite('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')), 'used',
  'deleting the first guest does not reactivate a consumed link');
select is(public.accept_friend_invite('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'), 'used',
  'another person cannot reuse the consumed link');
reset role;

insert into public.friend_invites (token, inviter_id, used_at)
select md5(n::text), 'a8a8a8a8-0000-4000-8000-0000000000e1', now()
from generate_series(1, 10) n;
set local role authenticated;
set local request.jwt.claim.sub = 'a8a8a8a8-0000-4000-8000-0000000000e1';
select is((select status from public.create_friend_invite()), 'created',
  'consumed links do not exhaust the open-link quota after guest deletion');

select * from finish();
rollback;
