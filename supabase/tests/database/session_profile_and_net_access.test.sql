begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

select ok(
  has_function_privilege('authenticated', 'private.can_current_account_use_core()', 'EXECUTE'),
  'profile RLS can evaluate the session capability'
);
select ok(
  not has_function_privilege('anon', 'private.can_current_account_use_core()', 'EXECUTE'),
  'anonymous callers cannot evaluate account capabilities'
);
select ok(
  not has_function_privilege('authenticated', 'private.can_account_use_core(uuid)', 'EXECUTE'),
  'clients cannot probe another account capability'
);
select ok(
  not has_schema_privilege('anon', 'net', 'USAGE'),
  'anonymous callers cannot resolve network extension objects'
);
select ok(
  not has_function_privilege('authenticated', 'net.http_get(text,jsonb,jsonb,integer)', 'EXECUTE'),
  'authenticated callers cannot dispatch arbitrary network requests'
);
select ok(
  not has_table_privilege('anon', 'net.http_request_queue', 'SELECT'),
  'anonymous callers cannot read queued worker authorization headers'
);
select ok(
  not has_schema_privilege('service_role', 'net', 'USAGE'),
  'provider workers use scoped commands instead of extension access'
);

insert into auth.users (id, email, raw_app_meta_data)
values
  ('79000000-0000-4000-8000-000000000001', 'policy-one@example.com', '{}'::jsonb),
  ('79000000-0000-4000-8000-000000000002', 'policy-two@example.com', '{}'::jsonb);

set local role authenticated;
set local request.jwt.claim.sub = '79000000-0000-4000-8000-000000000001';
select is(
  (select count(*) from public.profiles), 1::bigint,
  'an active account reads only its own profile through RLS'
);
select is(
  (select id from public.profiles),
  '79000000-0000-4000-8000-000000000001'::uuid,
  'the own-profile projection belongs to the authenticated session'
);
select results_eq(
  $$update public.profiles set display_name = 'Policy Rider' returning display_name$$,
  array['Policy Rider'::text],
  'an active account can update its own permitted profile fields'
);
select results_eq(
  $$select id from public.profiles where id = '79000000-0000-4000-8000-000000000002'$$,
  array[]::uuid[],
  'another account profile remains hidden'
);
reset role;

insert into private.account_controls (user_id, account_status)
values ('79000000-0000-4000-8000-000000000001', 'deletion_pending')
on conflict (user_id) do update set account_status = 'deletion_pending';

set local role authenticated;
set local request.jwt.claim.sub = '79000000-0000-4000-8000-000000000001';
select is(
  (select count(*) from public.profiles), 0::bigint,
  'an account pending deletion loses own-profile read access'
);
select results_eq(
  $$update public.profiles set display_name = 'Blocked update' returning id$$,
  array[]::uuid[],
  'an inactive account cannot update its profile'
);
reset role;
select * from finish();
rollback;
