begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

insert into auth.users (id, email)
values
  ('c0c0c0c0-0000-4000-8000-000000000001', 'plain@example.com'),
  ('c0c0c0c0-0000-4000-8000-000000000002', 'mfa@example.com');

insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at)
values (gen_random_uuid(), 'c0c0c0c0-0000-4000-8000-000000000002', 'test', 'totp', 'verified', now(), now());

-- Anonymous requests pass (sign-in, sign-up checks).
set local role anon;
select lives_ok($$select public.check_request()$$, 'anonymous requests are not blocked');
reset role;

set local role authenticated;
set local request.method = 'POST';

-- Without a second factor, an aal1 session is enough.
set local request.jwt.claims = '{"sub":"c0c0c0c0-0000-4000-8000-000000000001","aal":"aal1"}';
select lives_ok($$select public.check_request()$$, 'an account without 2FA passes with aal1');

-- With a verified factor, aal1 is refused for reads and writes alike.
set local request.jwt.claims = '{"sub":"c0c0c0c0-0000-4000-8000-000000000002","aal":"aal1"}';
select throws_ok($$select public.check_request()$$, 'PGRST', null, 'an account with 2FA is refused with aal1');
set local request.method = 'GET';
select throws_ok($$select public.check_request()$$, 'PGRST', null, 'reads are refused too without the second factor');
set local request.method = 'POST';
set local request.jwt.claims = '{"sub":"c0c0c0c0-0000-4000-8000-000000000002"}';
select throws_ok($$select public.check_request()$$, 'PGRST', null, 'a session without an aal claim counts as aal1');
set local request.jwt.claims = '{"sub":"c0c0c0c0-0000-4000-8000-000000000002","aal":"aal2"}';
select lives_ok($$select public.check_request()$$, 'an account with 2FA passes with aal2');

-- An unverified (abandoned) enrolment does not lock anyone out.
reset role;
update auth.mfa_factors set status = 'unverified' where user_id = 'c0c0c0c0-0000-4000-8000-000000000002';
set local role authenticated;
set local request.jwt.claims = '{"sub":"c0c0c0c0-0000-4000-8000-000000000002","aal":"aal1"}';
select lives_ok($$select public.check_request()$$, 'an unverified factor does not require aal2');

-- Rate limit: 300 writes a minute.
reset role;
insert into private.request_log (user_id, requested_at)
select 'c0c0c0c0-0000-4000-8000-000000000001', now() from generate_series(1, 298);  -- plus the one write above
set local role authenticated;
set local request.jwt.claims = '{"sub":"c0c0c0c0-0000-4000-8000-000000000001","aal":"aal1"}';
select lives_ok($$select public.check_request()$$, 'the 300th write in a minute passes');
select throws_ok($$select public.check_request()$$, 'PGRST', null, 'the 301st write in a minute is refused');

set local request.method = 'GET';
select lives_ok($$select public.check_request()$$, 'reads are not rate limited');

-- Clients cannot see or reset the counter.
select throws_ok($$select count(*) from private.request_log$$, '42501', null, 'the request log is not readable');
select throws_ok($$delete from private.request_log$$, '42501', null, 'the request log cannot be cleared');

-- PostgREST runs STABLE functions in a read-only transaction even when
-- they are called with POST (/rpc). The guard must not try to log then,
-- or every list_* call fails. The check runs in a subtransaction that is
-- rolled back, which also restores read-write mode for pgTAP.
reset role;
create temp table read_only_result (error text);
set local request.method = 'POST';
set local request.jwt.claims = '{"sub":"c0c0c0c0-0000-4000-8000-000000000001","aal":"aal1"}';
do $$
begin
  begin
    set local transaction_read_only = on;
    perform public.check_request();
    raise exception 'passed';
  exception when others then
    insert into read_only_result values (sqlerrm);
  end;
end;
$$;
select is((select error from read_only_result), 'passed', 'a POST to a read-only function is not blocked by the guard');

select * from finish();
rollback;
