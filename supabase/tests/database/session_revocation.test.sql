begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

-- Both Supabase and the plain-Postgres test shim provide auth.sessions.
insert into auth.users (id, email)
values ('a8a8a8a8-0000-4000-8000-0000000000bb', 'revoked@example.com');

set local role authenticated;
set local request.jwt.claim.sub = 'a8a8a8a8-0000-4000-8000-0000000000bb';
set local request.jwt.claims = '{"role":"authenticated","sub":"a8a8a8a8-0000-4000-8000-0000000000bb","session_id":"not-a-uuid"}';
select throws_ok($$select public.check_request()$$, 'PGRST', null,
  'a malformed session id cannot bypass the Data API guard');
set local request.jwt.claims = '{"role":"authenticated","sub":"a8a8a8a8-0000-4000-8000-0000000000bb","session_id":"a8a8a8a8-0000-4000-8000-0000000000cc"}';
select throws_ok($$select public.check_request()$$, 'PGRST', null,
  'a JWT whose Auth session row is absent cannot reach the Data API');
set local request.jwt.claims = '{"role":"authenticated","sub":"a8a8a8a8-0000-4000-8000-0000000000bb"}';
select throws_ok($$select public.check_request()$$, 'PGRST', null,
  'an authenticated JWT without a session id cannot bypass revocation checks');

select * from finish();
rollback;
