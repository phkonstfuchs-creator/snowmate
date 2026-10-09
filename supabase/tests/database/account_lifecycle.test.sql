begin;

create extension if not exists pgtap with schema extensions;

select plan(55);

select has_table(
  'private',
  'data_export_requests',
  'self-service exports are stored outside the public schema'
);
select has_table(
  'private',
  'account_deletion_jobs',
  'account deletion uses a private retry queue'
);
select has_column(
  'private',
  'account_deletion_jobs',
  'lease_token',
  'account deletion claims have an unguessable ownership token'
);
select has_column(
  'private',
  'account_deletion_jobs',
  'lease_expires_at',
  'account deletion claims expire automatically'
);

select has_function(
  'public',
  'request_export',
  array['uuid'],
  'JSON export requests are idempotent'
);
select has_function(
  'public',
  'get_export_requests',
  array[]::text[],
  'export status uses a session-scoped DTO'
);
select has_function(
  'public',
  'download_account_export',
  array['uuid'],
  'export downloads are session-bound'
);
select has_function(
  'public',
  'request_account_deletion',
  array['text', 'uuid'],
  'account deletion requires confirmation and an idempotency key'
);
select has_function(
  'public',
  'get_account_deletion_status',
  array[]::text[],
  'deletion progress uses a session-scoped DTO'
);
select has_function(
  'public',
  'claim_account_deletion_jobs',
  array['integer'],
  'the deletion worker claims bounded batches'
);
select has_function(
  'public',
  'complete_account_deletion_job',
  array['uuid', 'uuid', 'text', 'text', 'text', 'text', 'text'],
  'the deletion worker records provider outcomes'
);
select has_function(
  'private',
  'cleanup_data_exports',
  array['timestamp with time zone'],
  'expired exports have a private cleanup job'
);
select has_function(
  'private',
  'cleanup_account_deletion_jobs',
  array['timestamp with time zone'],
  'completed deletion audit rows have a private cleanup job'
);
select has_function(
  'private',
  'invoke_account_deletion_worker',
  array[]::text[],
  'the deletion worker has a Vault-backed scheduler entry point'
);

select ok(
  (select relforcerowsecurity from pg_class where oid = 'private.data_export_requests'::regclass),
  'export payloads force RLS'
);
select ok(
  (select relforcerowsecurity from pg_class where oid = 'private.account_deletion_jobs'::regclass),
  'deletion jobs force RLS'
);
select ok(
  not has_table_privilege('authenticated', 'private.data_export_requests', 'SELECT'),
  'clients cannot inspect raw export payloads'
);
select ok(
  not has_table_privilege('authenticated', 'private.account_deletion_jobs', 'SELECT'),
  'clients cannot inspect deletion worker identifiers'
);
select ok(
  has_function_privilege('authenticated', 'public.request_export(uuid)', 'EXECUTE'),
  'authenticated users can request their own export'
);
select ok(
  not has_function_privilege('anon', 'public.request_export(uuid)', 'EXECUTE'),
  'anonymous users cannot request exports'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.request_account_deletion(text,uuid)',
    'EXECUTE'
  ),
  'authenticated users can request account deletion'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.claim_account_deletion_jobs(integer)',
    'EXECUTE'
  ),
  'clients cannot claim deletion jobs'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.claim_account_deletion_jobs(integer)',
    'EXECUTE'
  ),
  'the server worker can claim deletion jobs'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.complete_account_deletion_job(uuid,uuid,text,text,text,text,text)',
    'EXECUTE'
  ),
  'the server worker can record deletion outcomes'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'private.cleanup_data_exports(timestamp with time zone)',
    'EXECUTE'
  ),
  'clients cannot run export retention jobs'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'private.invoke_account_deletion_worker()',
    'EXECUTE'
  ),
  'clients cannot invoke the privileged deletion worker'
);
select results_eq(
  $$
    select schedule, command
    from cron.job
    where jobname = 'snowmate-account-deletion-worker'
  $$,
  $expected$
    values (
      '*/5 * * * *'::text,
      'select private.invoke_account_deletion_worker()'::text
    )
  $expected$,
  'the account deletion queue is invoked every five minutes'
);

insert into auth.users (id, email, raw_app_meta_data)
values
  (
    '70000000-0000-4000-8000-000000000001',
    'export-owner@example.com',
    '{}'::jsonb
  ),
  (
    '70000000-0000-4000-8000-000000000002',
    'other-person@example.com',
    '{}'::jsonb
  );

update public.profiles
set
  display_name = case id
    when '70000000-0000-4000-8000-000000000001' then 'Export Owner'
    else 'Other Person'
  end,
  handle = case id
    when '70000000-0000-4000-8000-000000000001' then 'export_owner'
    else 'other_person'
  end,
  city = 'innsbruck',
  ability_level = 'chill',
  onboarding_completed = true,
  is_minor = false
where id in (
  '70000000-0000-4000-8000-000000000001'::uuid,
  '70000000-0000-4000-8000-000000000002'::uuid
);

insert into public.friendships (
  user_low,
  user_high,
  requested_by,
  status,
  responded_at
) values (
  '70000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000002',
  '70000000-0000-4000-8000-000000000001',
  'accepted',
  statement_timestamp()
);

create temporary table test_account_lifecycle_state (
  key text primary key,
  value uuid not null
);
grant select, insert, update on table test_account_lifecycle_state
  to authenticated, service_role;

set local role authenticated;
set local request.jwt.claim.sub = '70000000-0000-4000-8000-000000000001';

insert into test_account_lifecycle_state (key, value)
values (
  'export',
  public.request_export('71111111-0000-4000-8000-000000000001')
);

select ok(
  (select value is not null from test_account_lifecycle_state where key = 'export'),
  'an authenticated user can create a short-lived export snapshot'
);
select is(
  public.request_export('71111111-0000-4000-8000-000000000001'),
  (select value from test_account_lifecycle_state where key = 'export'),
  'replaying an export request returns the same snapshot'
);
select results_eq(
  $$select status from public.get_export_requests()$$,
  array['ready'::text],
  'the export status DTO exposes the ready snapshot'
);
select is(
  public.download_account_export(
    (select value from test_account_lifecycle_state where key = 'export')
  ) #>> '{account,email}',
  'export-owner@example.com',
  'the export contains the caller own account email'
);
select is(
  public.download_account_export(
    (select value from test_account_lifecycle_state where key = 'export')
  ) #>> '{profile,handle}',
  'export_owner',
  'the export contains the caller own profile fields'
);
select is(
  public.download_account_export(
    (select value from test_account_lifecycle_state where key = 'export')
  ) #>> '{friendships,0,other_user_id}',
  '70000000-0000-4000-8000-000000000002',
  'the export represents the caller own relationship record'
);
select ok(
  public.download_account_export(
    (select value from test_account_lifecycle_state where key = 'export')
  )::text not like '%other-person@example.com%',
  'the export does not disclose another account email'
);
select ok(
  public.download_account_export(
    (select value from test_account_lifecycle_state where key = 'export')
  )::text not like '%encrypted_password%'
    and public.download_account_export(
      (select value from test_account_lifecycle_state where key = 'export')
    )::text not like '%invite_token%',
  'the export excludes auth secrets and invitation tokens'
);

set local request.jwt.claim.sub = '70000000-0000-4000-8000-000000000002';

select throws_ok(
  format(
    'select public.download_account_export(%L)',
    (select value from test_account_lifecycle_state where key = 'export')
  ),
  '42501',
  null,
  'another authenticated user cannot download the export'
);

set local request.jwt.claim.sub = '70000000-0000-4000-8000-000000000001';

-- This consent fixture exercises deletion of a previously enabled provider identity.
-- The flag change rolls back with this test transaction.
reset role;
update private.runtime_feature_flags set enabled = true
where feature_key = 'analytics_collection';
set local role authenticated;

insert into test_account_lifecycle_state (key, value)
values (
  'analytics',
  public.set_analytics_consent(
    true,
    '70000000-0000-4000-8000-000000000010'
  )
);

select throws_ok(
  $$select public.request_account_deletion(
    'delete',
    '72222222-0000-4000-8000-000000000001'
  )$$,
  '23514',
  null,
  'account deletion requires the exact destructive confirmation'
);

insert into test_account_lifecycle_state (key, value)
values (
  'deletion',
  public.request_account_deletion(
    'DELETE',
    '72222222-0000-4000-8000-000000000002'
  )
);

select ok(
  (select value is not null from test_account_lifecycle_state where key = 'deletion'),
  'a confirmed account deletion creates a retryable job'
);
select is(
  public.request_account_deletion(
    'DELETE',
    '72222222-0000-4000-8000-000000000002'
  ),
  (select value from test_account_lifecycle_state where key = 'deletion'),
  'replaying the deletion command returns the original job'
);
-- Inspect the privileged deletion payload with the test administrator role.
reset role;

select results_eq(
  $$
    select analytics_id
    from private.account_deletion_jobs
    where id = (select value from test_account_lifecycle_state where key = 'deletion')
  $$,
  $$select value from test_account_lifecycle_state where key = 'analytics'$$,
  'the deletion job copies only the analytics id bound to the session account'
);

reset role;

select results_eq(
  $$
    select account_status
    from private.account_controls
    where user_id = '70000000-0000-4000-8000-000000000001'
  $$,
  array['deletion_pending'::text],
  'the deletion request deactivates the account immediately'
);

set local role authenticated;
set local request.jwt.claim.sub = '70000000-0000-4000-8000-000000000001';

select results_eq(
  $$select status from public.get_account_deletion_status()$$,
  array['pending'::text],
  'the account can read its non-sensitive deletion progress'
);
select results_eq(
  $$select count(*) from public.profiles$$,
  array[0::bigint],
  'deactivation immediately closes direct profile reads'
);
select results_eq(
  $$select count(*) from public.get_friendships()$$,
  array[0::bigint],
  'deactivation immediately closes social graph reads'
);
select throws_ok(
  $$select public.request_export(
    '71111111-0000-4000-8000-000000000002'
  )$$,
  '42501',
  null,
  'a deletion-pending account cannot create another export'
);

reset role;
set local role service_role;

select results_eq(
  $$select id from public.claim_account_deletion_jobs(1)$$,
  $$select value from test_account_lifecycle_state where key = 'deletion'$$,
  'the server worker can atomically claim the pending deletion job'
);

reset role;

insert into test_account_lifecycle_state (key, value)
select 'deletion_lease', lease_token
from private.account_deletion_jobs
where id = (select value from test_account_lifecycle_state where key = 'deletion');

select results_eq(
  $$
    select status, attempt_count
    from private.account_deletion_jobs
    where id = (select value from test_account_lifecycle_state where key = 'deletion')
  $$,
  $expected$ values ('processing'::text, 1) $expected$,
  'claiming records the in-progress attempt'
);
select ok(
  (
    select lease_token is not null
      and lease_expires_at > statement_timestamp()
    from private.account_deletion_jobs
    where id = (select value from test_account_lifecycle_state where key = 'deletion')
  ),
  'claiming gives the worker a live lease'
);

set local role service_role;

select results_eq(
  $$select count(*) from public.claim_account_deletion_jobs(1)$$,
  array[0::bigint],
  'an active account deletion lease cannot be claimed twice'
);

reset role;

update private.account_deletion_jobs
set
  last_attempt_at = statement_timestamp() - interval '6 minutes',
  lease_expires_at = statement_timestamp() - interval '1 minute'
where id = (select value from test_account_lifecycle_state where key = 'deletion');

set local role service_role;

insert into test_account_lifecycle_state (key, value)
select 'deletion_lease_reclaimed', lease_token
from public.claim_account_deletion_jobs(1);

reset role;

select isnt(
  (select value from test_account_lifecycle_state where key = 'deletion_lease_reclaimed'),
  (select value from test_account_lifecycle_state where key = 'deletion_lease'),
  'reclaiming an expired account deletion attempt rotates its lease token'
);

set local role service_role;

select throws_ok(
  $$select public.complete_account_deletion_job(
    (select value from test_account_lifecycle_state where key = 'deletion'),
    (select value from test_account_lifecycle_state where key = 'deletion_lease'),
    'skipped',
    'pending',
    'failed',
    'skipped',
    'brevo_configuration_missing'
  )$$,
  '23514',
  'deletion job lease invalid',
  'a stale worker cannot overwrite the current account deletion attempt'
);

select is(
  public.complete_account_deletion_job(
    (select value from test_account_lifecycle_state where key = 'deletion'),
    (select value from test_account_lifecycle_state where key = 'deletion_lease_reclaimed'),
    'skipped',
    'pending',
    'failed',
    'skipped',
    'brevo_configuration_missing'
  ),
  (select value from test_account_lifecycle_state where key = 'deletion'),
  'the worker records a retryable provider failure without exposing details'
);

reset role;

select results_eq(
  $$
    select status, error_code, lease_token, lease_expires_at
    from private.account_deletion_jobs
    where id = (select value from test_account_lifecycle_state where key = 'deletion')
  $$,
  $expected$
    values (
      'failed'::text,
      'brevo_configuration_missing'::text,
      null::uuid,
      null::timestamptz
    )
  $expected$,
  'a failed provider step keeps the deletion job in the retry queue'
);

select is(
  private.cleanup_data_exports(now() + interval '25 hours'),
  1::bigint,
  'export snapshots are deleted after 24 hours'
);

insert into private.account_deletion_jobs (
  user_id,
  status,
  storage_status,
  database_status,
  brevo_status,
  posthog_status,
  requested_at,
  escalation_at,
  hard_deadline_at,
  next_attempt_at,
  completed_at
)
select
  null,
  'completed',
  'skipped',
  'completed',
  'skipped',
  'skipped',
  old.requested_at,
  old.requested_at + interval '24 hours',
  old.requested_at + interval '7 days',
  old.requested_at,
  old.requested_at + interval '1 hour'
from (
  select now() - interval '13 months' as requested_at
) as old;

select is(
  private.cleanup_account_deletion_jobs(now()),
  1::bigint,
  'minimal completed deletion audit rows expire after 12 months'
);

select * from finish();

rollback;
