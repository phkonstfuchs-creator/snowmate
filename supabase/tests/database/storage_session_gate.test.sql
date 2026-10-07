begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, email) values
  ('a8a8a8a8-0000-4000-8000-0000000000a1', 'storage-session@example.com');
insert into storage.objects (bucket_id, name) values
  ('avatars', 'a8a8a8a8-0000-4000-8000-0000000000a1/me.webp'),
  ('post-photos', 'a8a8a8a8-0000-4000-8000-0000000000a1/photo.webp');
set local role authenticated;
set local request.jwt.claim.sub = 'a8a8a8a8-0000-4000-8000-0000000000a1';
set local request.jwt.claims = '{"role":"authenticated","session_id":"a8a8a8a8-0000-4000-8000-0000000000a2","aal":"aal2"}';
select is((select count(*)::int from storage.objects where bucket_id in ('avatars', 'post-photos')), 0,
  'missing Auth sessions table fails closed for Storage RLS');
reset role;
create table if not exists auth.sessions (id uuid primary key, user_id uuid);
insert into auth.sessions (id, user_id) values
  ('a8a8a8a8-0000-4000-8000-0000000000a2', 'a8a8a8a8-0000-4000-8000-0000000000a1');
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at)
values (gen_random_uuid(), 'a8a8a8a8-0000-4000-8000-0000000000a1', 'test', 'totp', 'verified', now(), now());

set local role authenticated;
set local request.jwt.claim.sub = 'a8a8a8a8-0000-4000-8000-0000000000a1';
set local request.jwt.claims = '{"role":"authenticated","session_id":"a8a8a8a8-0000-4000-8000-0000000000a2","aal":"aal1"}';
select is((select count(*)::int from storage.objects where bucket_id in ('avatars', 'post-photos')), 0,
  'AAL1 cannot read private media after MFA enrolment');
select throws_ok($$insert into storage.objects (bucket_id, name)
  values ('avatars', 'a8a8a8a8-0000-4000-8000-0000000000a1/new.webp')$$,
  '42501', null, 'AAL1 cannot upload private media after MFA enrolment');
set local request.jwt.claims = '{"role":"authenticated","session_id":"a8a8a8a8-0000-4000-8000-0000000000a2","aal":"aal2"}';
select is((select count(*)::int from storage.objects where bucket_id in ('avatars', 'post-photos')), 2,
  'AAL2 active session reads its own private media');
set local request.jwt.claims = '{"session_id":"a8a8a8a8-0000-4000-8000-0000000000a2","aal":"aal2"}';
select is((select count(*)::int from storage.objects where bucket_id in ('avatars', 'post-photos')), 0,
  'missing authenticated role cannot read private media');
set local request.jwt.claims = '{"role":"authenticated","session_id":"a8a8a8a8-0000-4000-8000-0000000000a2","aal":"aal2"}';
reset role;

delete from auth.sessions where id = 'a8a8a8a8-0000-4000-8000-0000000000a2';
set local role authenticated;
select is((select count(*)::int from storage.objects where bucket_id in ('avatars', 'post-photos')), 0,
  'revoked session cannot read private media even with AAL2');
select throws_ok($$insert into storage.objects (bucket_id, name)
  values ('post-photos', 'a8a8a8a8-0000-4000-8000-0000000000a1/new.webp')$$,
  '42501', null, 'revoked session cannot upload a photo');

select * from finish();
rollback;
