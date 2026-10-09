create extension if not exists supabase_vault with schema vault;
create extension if not exists pg_net with schema extensions;

revoke all on schema net from public, anon, authenticated, service_role;
revoke all on all tables in schema net
  from public, anon, authenticated, service_role;
revoke all on all sequences in schema net
  from public, anon, authenticated, service_role;
revoke all on all functions in schema net
  from public, anon, authenticated, service_role;
alter default privileges in schema net revoke all on tables from public;
alter default privileges in schema net revoke all on sequences from public;
alter default privileges in schema net revoke all on functions from public;

create table private.account_deletion_worker_runs (
  id bigint generated always as identity primary key,
  request_id bigint unique,
  status text not null,
  queued_at timestamptz not null default statement_timestamp(),
  checked_at timestamptz,
  http_status smallint,
  error_code text,
  constraint account_deletion_worker_runs_status_value check (
    status in ('queued', 'succeeded', 'failed', 'misconfigured')
  ),
  constraint account_deletion_worker_runs_state check (
    (status = 'queued' and request_id is not null and checked_at is null)
    or (status = 'succeeded' and request_id is not null and checked_at is not null)
    or (status = 'failed' and checked_at is not null)
    or (status = 'misconfigured' and request_id is null and checked_at is not null)
  ),
  constraint account_deletion_worker_runs_http_status check (
    http_status is null or http_status between 100 and 599
  ),
  constraint account_deletion_worker_runs_error_code_safe check (
    error_code is null or error_code ~ '^[a-z0-9_:-]{1,100}$'
  )
);

create index account_deletion_worker_runs_status_queued
  on private.account_deletion_worker_runs (status, queued_at desc);

alter table private.account_deletion_worker_runs enable row level security;
alter table private.account_deletion_worker_runs force row level security;
revoke all on table private.account_deletion_worker_runs
  from public, anon, authenticated, service_role;
revoke all on sequence private.account_deletion_worker_runs_id_seq
  from public, anon, authenticated, service_role;

create or replace function private.invoke_account_deletion_worker()
returns bigint
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_project_url text;
  v_publishable_key text;
  v_worker_secret text;
  v_request_id bigint;
begin
  select secret.decrypted_secret
  into v_project_url
  from vault.decrypted_secrets as secret
  where secret.name = 'snowmate_project_url';

  select secret.decrypted_secret
  into v_publishable_key
  from vault.decrypted_secrets as secret
  where secret.name = 'snowmate_publishable_key';

  select secret.decrypted_secret
  into v_worker_secret
  from vault.decrypted_secrets as secret
  where secret.name = 'snowmate_account_deletion_worker_secret';

  if v_project_url is null
    or v_publishable_key is null
    or v_worker_secret is null
  then
    insert into private.account_deletion_worker_runs (
      status,
      checked_at,
      error_code
    ) values (
      'misconfigured',
      statement_timestamp(),
      'worker_vault_configuration_missing'
    );
    raise warning 'account deletion worker Vault configuration is incomplete';
    return null;
  end if;

  select net.http_post(
    url := rtrim(v_project_url, '/')
      || '/functions/v1/process-account-deletions',
    headers := pg_catalog.jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', v_publishable_key,
      'x-snowmate-worker-secret', v_worker_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  )
  into v_request_id;

  insert into private.account_deletion_worker_runs (request_id, status)
  values (v_request_id, 'queued');

  return v_request_id;
exception
  when others then
    insert into private.account_deletion_worker_runs (
      status,
      checked_at,
      error_code
    ) values (
      'failed',
      statement_timestamp(),
      'worker_queue_failed'
    );
    raise warning 'account deletion worker request could not be queued';
    return null;
end;
$$;

create or replace function private.reconcile_account_deletion_worker_runs(
  p_now timestamptz default now()
)
returns bigint
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_response_count bigint := 0;
  v_missing_count bigint := 0;
  v_failed_count bigint := 0;
  v_overdue_jobs bigint := 0;
begin
  if p_now is null then
    raise exception using errcode = '22004', message = 'monitor timestamp required';
  end if;

  with raw_responses as (
    select
      response.id,
      response.status_code,
      response.timed_out,
      response.error_msg,
      response.headers ->> 'x-snowmate-claimed-jobs' as claimed_header,
      response.headers ->> 'x-snowmate-completed-jobs' as completed_header,
      response.headers ->> 'x-snowmate-failed-jobs' as failed_header
    from net._http_response as response
  ),
  responses as (
    select
      response.id,
      response.status_code,
      response.timed_out,
      response.error_msg,
      case
        when response.claimed_header ~ '^[0-2]$'
          and response.completed_header ~ '^[0-2]$'
          and response.failed_header ~ '^[0-2]$'
        then response.claimed_header::integer
          = response.completed_header::integer
            + response.failed_header::integer
        else false
      end as headers_valid,
      case
        when response.failed_header ~ '^[0-2]$'
        then response.failed_header::integer
        else null
      end as failed_jobs
    from raw_responses as response
  )
  update private.account_deletion_worker_runs as run
  set
    status = case
      when response.status_code between 200 and 299
        and not coalesce(response.timed_out, false)
        and response.error_msg is null
        and response.headers_valid
        and response.failed_jobs = 0
      then 'succeeded'
      else 'failed'
    end,
    checked_at = p_now,
    http_status = response.status_code,
    error_code = case
      when coalesce(response.timed_out, false) then 'worker_http_timeout'
      when response.error_msg is not null then 'worker_http_error'
      when response.status_code is null then 'worker_http_error'
      when response.status_code not between 200 and 299
        then 'worker_http_' || response.status_code::text
      when not response.headers_valid then 'worker_result_headers_invalid'
      when response.failed_jobs > 0 then 'worker_reported_failures'
      else null
    end
  from responses as response
  where run.status = 'queued' and run.request_id = response.id;
  get diagnostics v_response_count = row_count;

  update private.account_deletion_worker_runs as run
  set
    status = 'failed',
    checked_at = p_now,
    error_code = 'worker_response_missing'
  where run.status = 'queued'
    and run.queued_at <= p_now - interval '3 minutes'
    and not exists (
      select 1 from net._http_response as response
      where response.id = run.request_id
    );
  get diagnostics v_missing_count = row_count;

  select count(*) into v_failed_count
  from private.account_deletion_worker_runs as run
  where run.checked_at = p_now and run.status in ('failed', 'misconfigured');

  select
    (
      select count(*)
      from private.account_deletion_jobs as job
      where job.status <> 'completed' and job.hard_deadline_at <= p_now
    ) + (
      select count(*)
      from private.analytics_erasure_jobs as job
      where job.status <> 'completed' and job.hard_deadline_at <= p_now
    )
  into v_overdue_jobs;

  if v_failed_count > 0 or v_overdue_jobs > 0 then
    raise warning
      'account deletion monitor: % worker failures, % overdue jobs',
      v_failed_count,
      v_overdue_jobs;
  end if;

  delete from private.account_deletion_worker_runs
  where status <> 'queued' and checked_at <= p_now - interval '90 days';

  return v_response_count + v_missing_count;
end;
$$;

revoke all on function private.invoke_account_deletion_worker()
  from public, anon, authenticated, service_role;
revoke all on function private.reconcile_account_deletion_worker_runs(timestamptz)
  from public, anon, authenticated, service_role;

select cron.schedule(
  'snowmate-account-deletion-worker',
  '*/5 * * * *',
  'select private.invoke_account_deletion_worker()'
);

select cron.schedule(
  'snowmate-account-deletion-worker-monitor',
  '*/5 * * * *',
  'select private.reconcile_account_deletion_worker_runs(statement_timestamp())'
);

comment on function private.invoke_account_deletion_worker() is
  'Invokes the account deletion Edge Function only after all required Vault secrets are configured.';
comment on function private.reconcile_account_deletion_worker_runs(timestamptz) is
  'Records pg_net outcomes without response bodies and warns about worker failures or overdue deletion jobs.';
