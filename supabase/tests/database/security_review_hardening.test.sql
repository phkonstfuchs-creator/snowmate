begin;

create extension if not exists pgtap with schema extensions;

select plan(74);

select has_table(
  'private',
  'analytics_identities',
  'analytics identities are bound outside the public schema'
);
select has_table(
  'private',
  'runtime_feature_flags',
  'sensitive runtime capabilities have a private kill switch'
);
select has_table(
  'private',
  'analytics_consent_events',
  'optional analytics consent has an append-only server ledger'
);
select has_table(
  'private',
  'analytics_erasure_jobs',
  'analytics withdrawal has a retryable private erasure queue'
);
select has_column(
  'private',
  'analytics_erasure_jobs',
  'lease_token',
  'analytics erasure claims have an unguessable ownership token'
);
select has_column(
  'private',
  'analytics_erasure_jobs',
  'lease_expires_at',
  'analytics erasure claims expire automatically'
);
select has_table(
  'private',
  'account_deletion_worker_runs',
  'worker invocations have a private operational audit'
);
select has_function(
  'public',
  'set_analytics_consent',
  array['boolean', 'uuid'],
  'analytics consent is session-bound and idempotent'
);
select has_function(
  'private',
  'reconcile_account_deletion_worker_runs',
  array['timestamp with time zone'],
  'queued worker calls have a response reconciler'
);
select has_function(
  'public',
  'claim_analytics_erasure_jobs',
  array['integer'],
  'the provider worker can claim analytics erasures'
);
select has_function(
  'public',
  'complete_analytics_erasure_job',
  array['uuid', 'uuid', 'text', 'text'],
  'the provider worker can complete or retry analytics erasures'
);

select ok(
  (select relforcerowsecurity from pg_class where oid = 'private.analytics_identities'::regclass),
  'analytics identities force RLS'
);
select ok(
  (select relforcerowsecurity from pg_class where oid = 'private.runtime_feature_flags'::regclass),
  'runtime feature flags force RLS'
);
select ok(
  (select relforcerowsecurity from pg_class where oid = 'private.analytics_consent_events'::regclass),
  'analytics consent events force RLS'
);
select ok(
  (select relforcerowsecurity from pg_class where oid = 'private.analytics_erasure_jobs'::regclass),
  'analytics erasure jobs force RLS'
);
select ok(
  (select relforcerowsecurity from pg_class where oid = 'private.account_deletion_worker_runs'::regclass),
  'worker monitoring rows force RLS'
);
select ok(
  not has_table_privilege('authenticated', 'private.analytics_identities', 'SELECT'),
  'clients cannot inspect analytics identity bindings'
);
select ok(
  not has_table_privilege('authenticated', 'private.runtime_feature_flags', 'SELECT'),
  'clients cannot inspect or change sensitive runtime flags'
);
select ok(
  not has_table_privilege('authenticated', 'private.analytics_consent_events', 'SELECT'),
  'clients cannot inspect the consent ledger directly'
);
select ok(
  not has_table_privilege('authenticated', 'private.analytics_erasure_jobs', 'SELECT'),
  'clients cannot inspect analytics erasure jobs directly'
);
select ok(
  not has_table_privilege('authenticated', 'private.account_deletion_worker_runs', 'SELECT'),
  'clients cannot inspect worker operations'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.set_analytics_consent(boolean,uuid)',
    'EXECUTE'
  ),
  'an authenticated account can record its analytics choice'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.set_analytics_consent(boolean,uuid)',
    'EXECUTE'
  ),
  'anonymous callers cannot create analytics identities'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.claim_analytics_erasure_jobs(integer)',
    'EXECUTE'
  ),
  'only the provider worker role can claim analytics erasures'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.complete_analytics_erasure_job(uuid,uuid,text,text)',
    'EXECUTE'
  ),
  'the provider worker role can record analytics erasure outcomes'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.claim_analytics_erasure_jobs(integer)',
    'EXECUTE'
  ),
  'clients cannot claim analytics erasures'
);
select results_eq(
  $$
    select enabled
    from private.runtime_feature_flags
    where feature_key = 'analytics_collection'
  $$,
  array[false],
  'analytics collection is disabled until provider erasure is proven'
);

select ok(
  not exists (
    select 1
    from pg_namespace as namespace
    cross join lateral aclexplode(
      coalesce(namespace.nspacl, acldefault('n', namespace.nspowner))
    ) as acl
    where namespace.nspname = 'net' and acl.grantee = 0
  ),
  'the pg_net schema grants no privilege to PUBLIC'
);
select ok(
  not has_schema_privilege('authenticated', 'net', 'USAGE'),
  'authenticated clients cannot resolve pg_net objects'
);
select ok(
  not has_table_privilege('authenticated', 'net.http_request_queue', 'SELECT'),
  'authenticated clients cannot read queued worker secrets'
);
select ok(
  not has_table_privilege('authenticated', 'net._http_response', 'SELECT'),
  'authenticated clients cannot read worker responses'
);
select results_eq(
  $$
    select schedule, command
    from cron.job
    where jobname = 'snowmate-account-deletion-worker-monitor'
  $$,
  $expected$
    values (
    '*/5 * * * *'::text,
    'select private.reconcile_account_deletion_worker_runs(statement_timestamp())'::text
  )
  $expected$,
  'worker responses are reconciled every five minutes'
);
select ok(
  position(
    'timeout_milliseconds := 120000'
    in pg_get_functiondef(
      'private.invoke_account_deletion_worker()'::regprocedure
    )
  ) > 0,
  'the scheduler allows a bounded worker run to finish before timing out'
);

select ok(
  pg_get_function_arguments(
    'public.request_account_deletion(text,uuid)'::regprocedure
  ) !~ 'analytics',
  'account deletion accepts no client-supplied analytics identity'
);
select ok(
  position(
    'identity.analytics_enabled'
    in pg_get_functiondef(
      'public.request_account_deletion(text,uuid)'::regprocedure
    )
  ) > 0,
  'account deletion queues only an analytics identity not already withdrawn'
);
select ok(
  position(
    'snowmate:analytics_identity:'
    in pg_get_functiondef(
      'public.set_analytics_consent(boolean,uuid)'::regprocedure
    )
  ) > 0,
  'analytics grant and withdrawal serialize on the account identity'
);
select ok(
  position(
    'snowmate:analytics_identity:'
    in pg_get_functiondef(
      'public.request_account_deletion(text,uuid)'::regprocedure
    )
  ) > 0,
  'account deletion snapshots analytics under the same account identity lock'
);
select ok(
  pg_get_functiondef(
    'public.invite_crew_member(uuid,uuid,uuid)'::regprocedure
  ) ~ 'lock_relationship_pair',
  'crew invitation creation shares the block relationship lock'
);
select ok(
  pg_get_functiondef(
    'public.respond_crew_invitation(uuid,boolean,uuid)'::regprocedure
  ) ~ 'lock_relationship_pair'
    and pg_get_functiondef(
      'public.respond_crew_invitation(uuid,boolean,uuid)'::regprocedure
    ) ~ 'are_friends',
  'crew acceptance rechecks both blocking and friendship under the pair lock'
);
select ok(
  pg_get_functiondef(
    'private.refresh_account_moderation_control(uuid)'::regprocedure
  ) ~ 'pg_advisory_xact_lock',
  'sanction projections serialize on the moderated account'
);
select ok(
  pg_get_functiondef(
    'private.cleanup_expired_coordination_data(timestamp with time zone)'::regprocedure
  ) ~ 'report_appeals',
  'coordination retention preserves ride context during pending appeals'
);
select ok(
  pg_get_functiondef(
    'private.enforce_account_control_change()'::regprocedure
  ) ~ 'report_appeals',
  'account enforcement preserves private ride context during pending appeals'
);
select ok(
  pg_get_functiondef(
    'private.cleanup_chat_and_moderation_data(timestamp with time zone)'::regprocedure
  ) ~ 'appeal.status = ''pending''',
  'moderation evidence retention explicitly protects pending appeals'
);
select ok(
  position(
    'appeal.resolved_at > p_now - interval ''90 days'''
    in pg_get_functiondef(
      'private.cleanup_expired_coordination_data(timestamp with time zone)'::regprocedure
    )
  ) > 0,
  'coordination evidence remains for ninety days after an appeal decision'
);
select ok(
  position(
    'appeal.resolved_at > v_now - interval ''90 days'''
    in pg_get_functiondef(
      'private.enforce_account_control_change()'::regprocedure
    )
  ) > 0,
  'account enforcement preserves recent appeal evidence'
);
select ok(
  position(
    'appeal.resolved_at > p_now - interval ''90 days'''
    in pg_get_functiondef(
      'private.cleanup_chat_and_moderation_data(timestamp with time zone)'::regprocedure
    )
  ) > 0,
  'report evidence remains for ninety days after an appeal decision'
);
select ok(
  position(
    'appeal.resolved_at > p_now - interval ''12 months'''
    in pg_get_functiondef(
      'private.cleanup_chat_and_moderation_data(timestamp with time zone)'::regprocedure
    )
  ) > 0,
  'moderation decision metadata remains for twelve months after an appeal decision'
);

insert into auth.users (id, email, raw_app_meta_data)
values
  (
    '74000000-0000-4000-8000-000000000001',
    'analytics-one@example.com',
    '{}'::jsonb
  ),
  (
    '74000000-0000-4000-8000-000000000002',
    'analytics-two@example.com',
    '{}'::jsonb
  );

create temporary table test_security_state (
  key text primary key,
  value uuid not null
);
grant select, insert, update on table test_security_state to authenticated, service_role;

set local role authenticated;
set local request.jwt.claim.sub = '74000000-0000-4000-8000-000000000001';

select throws_ok(
  $$select public.set_analytics_consent(
    true,
    '74111111-0000-4000-8000-000000000000'
  )$$,
  '55000',
  null,
  'analytics cannot be enabled before the provider erasure gate is released'
);

reset role;

select results_eq(
  $$
    select count(*)
    from private.analytics_identities
    where user_id = '74000000-0000-4000-8000-000000000001'
  $$,
  array[0::bigint],
  'a blocked analytics grant creates no pseudonymous identity'
);

update private.runtime_feature_flags
set enabled = true, updated_at = statement_timestamp()
where feature_key = 'analytics_collection';

set local role authenticated;
set local request.jwt.claim.sub = '74000000-0000-4000-8000-000000000001';

insert into test_security_state (key, value)
values (
  'analytics_one',
  public.set_analytics_consent(
    true,
    '74111111-0000-4000-8000-000000000001'
  )
);

select matches(
  (select value::text from test_security_state where key = 'analytics_one'),
  '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
  'Supabase generates the pseudonymous analytics id'
);
select is(
  public.set_analytics_consent(
    true,
    '74111111-0000-4000-8000-000000000001'
  ),
  (select value from test_security_state where key = 'analytics_one'),
  'analytics opt-in replays with the same command key'
);
select throws_ok(
  $$select public.set_analytics_consent(
    false,
    '74111111-0000-4000-8000-000000000001'
  )$$,
  '22023',
  null,
  'an analytics command key cannot be reused for another choice'
);

reset role;

select results_eq(
  $$
    select decision
    from private.analytics_consent_events
    where user_id = '74000000-0000-4000-8000-000000000001'
    order by recorded_at, id
  $$,
  array['granted'::text],
  'the server records the granted analytics choice once'
);

set local role authenticated;
set local request.jwt.claim.sub = '74000000-0000-4000-8000-000000000002';

insert into test_security_state (key, value)
values (
  'analytics_two',
  public.set_analytics_consent(
    true,
    '74111111-0000-4000-8000-000000000002'
  )
);

select isnt(
  (select value from test_security_state where key = 'analytics_two'),
  (select value from test_security_state where key = 'analytics_one'),
  'different accounts receive different random analytics ids'
);

set local request.jwt.claim.sub = '74000000-0000-4000-8000-000000000001';

select is(
  public.set_analytics_consent(
    false,
    '74111111-0000-4000-8000-000000000003'
  ),
  (select value from test_security_state where key = 'analytics_one'),
  'withdrawal refers only to the caller server-bound identity'
);

reset role;

select results_eq(
  $$
    select analytics_enabled
    from private.analytics_identities
    where user_id = '74000000-0000-4000-8000-000000000001'
  $$,
  array[false],
  'withdrawal disables the server-side analytics identity'
);
select results_eq(
  $$
    select analytics_id, status
    from private.analytics_erasure_jobs
    where analytics_id = (
      select value from test_security_state where key = 'analytics_one'
    )
  $$,
  $expected$
    values (
    (select value from test_security_state where key = 'analytics_one'),
    'pending'::text
  )
  $expected$,
  'withdrawal queues deletion for the exact previous analytics identity'
);

set local role authenticated;
set local request.jwt.claim.sub = '74000000-0000-4000-8000-000000000001';

insert into test_security_state (key, value)
values (
  'analytics_one_regrant',
  public.set_analytics_consent(
    true,
    '74111111-0000-4000-8000-000000000004'
  )
);

reset role;

select isnt(
  (select value from test_security_state where key = 'analytics_one_regrant'),
  (select value from test_security_state where key = 'analytics_one'),
  'regrant rotates the analytics identity before new events can be sent'
);
select results_eq(
  $$
    select analytics_id, analytics_enabled
    from private.analytics_identities
    where user_id = '74000000-0000-4000-8000-000000000001'
  $$,
  $expected$
    values (
    (select value from test_security_state where key = 'analytics_one_regrant'),
    true
  )
  $expected$,
  'the account exposes only the new active analytics identity'
);
select results_eq(
  $$
    select decision
    from private.analytics_consent_events
    where user_id = '74000000-0000-4000-8000-000000000001'
    order by recorded_at, id
  $$,
  $expected$
    values ('granted'::text), ('withdrawn'::text), ('granted'::text)
  $expected$,
  'grant, withdrawal, and regrant remain in the append-only ledger'
);
select throws_ok(
  $$
    update private.analytics_consent_events
    set decision = 'granted'
    where user_id = '74000000-0000-4000-8000-000000000001'
      and decision = 'withdrawn'
  $$,
  '55000',
  'analytics consent events are immutable',
  'recorded analytics choices cannot be rewritten'
);

set local role service_role;

insert into test_security_state (key, value)
select 'analytics_erasure_job', id
from public.claim_analytics_erasure_jobs(1);

reset role;

insert into test_security_state (key, value)
select 'analytics_erasure_lease', lease_token
from private.analytics_erasure_jobs
where id = (
  select value from test_security_state where key = 'analytics_erasure_job'
);

select is(
  (
    select analytics_id
    from private.analytics_erasure_jobs
    where id = (
      select value from test_security_state where key = 'analytics_erasure_job'
    )
  ),
  (select value from test_security_state where key = 'analytics_one'),
  'the worker claims the withdrawn identity rather than the regranted identity'
);
select ok(
  (
    select lease_token is not null
      and lease_expires_at > statement_timestamp()
    from private.analytics_erasure_jobs
    where id = (
      select value from test_security_state where key = 'analytics_erasure_job'
    )
  ),
  'claiming gives the analytics worker a live lease'
);

set local role service_role;

select results_eq(
  $$select count(*) from public.claim_analytics_erasure_jobs(1)$$,
  array[0::bigint],
  'an active analytics erasure lease cannot be claimed twice'
);

reset role;

update private.analytics_erasure_jobs
set
  last_attempt_at = statement_timestamp() - interval '6 minutes',
  lease_expires_at = statement_timestamp() - interval '1 minute'
where id = (
  select value from test_security_state where key = 'analytics_erasure_job'
);

set local role service_role;

insert into test_security_state (key, value)
select 'analytics_erasure_lease_reclaimed', lease_token
from public.claim_analytics_erasure_jobs(1);

reset role;

select isnt(
  (
    select value
    from test_security_state
    where key = 'analytics_erasure_lease_reclaimed'
  ),
  (select value from test_security_state where key = 'analytics_erasure_lease'),
  'reclaiming an expired analytics attempt rotates its lease token'
);

set local role service_role;

select throws_ok(
  $$select public.complete_analytics_erasure_job(
    (select value from test_security_state where key = 'analytics_erasure_job'),
    (select value from test_security_state where key = 'analytics_erasure_lease'),
    'completed',
    null
  )$$,
  '23514',
  'erasure job lease invalid',
  'a stale worker cannot overwrite the current analytics erasure attempt'
);

select is(
  public.complete_analytics_erasure_job(
    (select value from test_security_state where key = 'analytics_erasure_job'),
    (
      select value
      from test_security_state
      where key = 'analytics_erasure_lease_reclaimed'
    ),
    'completed',
    null
  ),
  (select value from test_security_state where key = 'analytics_erasure_job'),
  'the worker can idempotently record provider confirmation'
);

reset role;

select results_eq(
  $$
    select status, analytics_id is null, lease_token, lease_expires_at
    from private.analytics_erasure_jobs
    where id = (
      select value from test_security_state where key = 'analytics_erasure_job'
    )
  $$,
  $expected$
    values ('completed'::text, true, null::uuid, null::timestamptz)
  $expected$,
  'provider confirmation removes the direct analytics identifier from the queue'
);

insert into private.account_deletion_jobs (
  id,
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
  attempt_count,
  error_code
) values (
  '75000000-0000-4000-8000-000000000001',
  null,
  'failed',
  'skipped',
  'failed',
  'skipped',
  'skipped',
  statement_timestamp() - interval '8 days',
  statement_timestamp() - interval '7 days',
  statement_timestamp() - interval '1 day',
  statement_timestamp() - interval '1 hour',
  100,
  'auth_delete_failed'
);

set local role service_role;

select results_eq(
  $$select id from public.claim_account_deletion_jobs(1)$$,
  array['75000000-0000-4000-8000-000000000001'::uuid],
  'an overdue deletion still retries after one hundred attempts'
);

reset role;

select results_eq(
  $$
    select attempt_count
    from private.account_deletion_jobs
    where id = '75000000-0000-4000-8000-000000000001'
  $$,
  array[101],
  'the retry counter has no terminal cap'
);

insert into private.account_deletion_worker_runs (
  request_id,
  status,
  queued_at
) values (
  9223372036854775000,
  'queued',
  statement_timestamp() - interval '20 minutes'
);

select is(
  private.reconcile_account_deletion_worker_runs(statement_timestamp()),
  1::bigint,
  'the monitor reconciles a queued call with no response'
);
select results_eq(
  $$
    select status, error_code
    from private.account_deletion_worker_runs
    where request_id = 9223372036854775000
  $$,
  $expected$
    values ('failed'::text, 'worker_response_missing'::text)
  $expected$,
  'a missing worker response becomes an observable failure'
);

insert into private.account_deletion_worker_runs (
  request_id,
  status,
  queued_at
) values
  (9223372036854774001, 'queued', statement_timestamp()),
  (9223372036854774002, 'queued', statement_timestamp()),
  (9223372036854774003, 'queued', statement_timestamp()),
  (9223372036854774004, 'queued', statement_timestamp());

insert into net._http_response (id, status_code, headers) values
  (9223372036854774001, 200, '{}'::jsonb),
  (
    9223372036854774002,
    200,
    '{"x-snowmate-claimed-jobs":"2","x-snowmate-completed-jobs":"0","x-snowmate-failed-jobs":"0"}'::jsonb
  ),
  (
    9223372036854774003,
    200,
    '{"x-snowmate-claimed-jobs":"2","x-snowmate-completed-jobs":"1","x-snowmate-failed-jobs":"1"}'::jsonb
  ),
  (
    9223372036854774004,
    200,
    '{"x-snowmate-claimed-jobs":"0","x-snowmate-completed-jobs":"0","x-snowmate-failed-jobs":"0"}'::jsonb
  );

select is(
  private.reconcile_account_deletion_worker_runs(statement_timestamp()),
  4::bigint,
  'the monitor reconciles every available worker response'
);
select results_eq(
  $$
    select request_id, status, error_code
    from private.account_deletion_worker_runs
    where request_id between 9223372036854774001 and 9223372036854774004
    order by request_id
  $$,
  $expected$
    values
    (
      9223372036854774001::bigint,
      'failed'::text,
      'worker_result_headers_invalid'::text
    ),
    (
      9223372036854774002::bigint,
      'failed'::text,
      'worker_result_headers_invalid'::text
    ),
    (
      9223372036854774003::bigint,
      'failed'::text,
      'worker_reported_failures'::text
    ),
    (9223372036854774004::bigint, 'succeeded'::text, null::text)
  $expected$,
  'the monitor requires bounded, internally consistent result headers'
);

select * from finish();

rollback;
