begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

-- Supabase has this table; the plain-Postgres test shim does not.
insert into auth.users (id, email)
values ('a8a8a8a8-0000-4000-8000-0000000000bb', 'revoked@example.com');

set local role authenticated;
set local request.jwt.claim.sub = 'a8a8a8a8-0000-4000-8000-0000000000bb';
set local request.jwt.claims = '{"role":"authenticated","sub":"a8a8a8a8-0000-4000-8000-0000000000bb","session_id":"a8a8a8a8-0000-4000-8000-0000000000cc"}';
select throws_ok($$select public.check_request()$$, 'PGRST', null,
  'a missing Auth sessions table fails closed');
reset role;
create table if not exists auth.sessions (id uuid primary key, user_id uuid);
set local role authenticated;
select throws_ok($$select public.check_request()$$, 'PGRST', null,
  'a JWT whose Auth session was revoked cannot reach the Data API');
set local request.jwt.claims = '{"role":"authenticated","sub":"a8a8a8a8-0000-4000-8000-0000000000bb"}';
select throws_ok($$select public.check_request()$$, 'PGRST', null,
  'an authenticated JWT without a session id cannot bypass revocation checks');

select * from finish();
rollback;
