create table private.analytics_erasure_jobs (
  id uuid primary key default gen_random_uuid(),
  analytics_id uuid,
  status text not null default 'pending',
  requested_at timestamptz not null default statement_timestamp(),
  escalation_at timestamptz not null,
  hard_deadline_at timestamptz not null,
  next_attempt_at timestamptz not null default statement_timestamp(),
  last_attempt_at timestamptz,
  lease_token uuid,
  lease_expires_at timestamptz,
  attempt_count integer not null default 0,
  completed_at timestamptz,
  error_code text,
  constraint analytics_erasure_jobs_status_value check (
    status in ('pending', 'processing', 'failed', 'completed')
  ),
  constraint analytics_erasure_jobs_identity_state check (
    (status = 'completed' and analytics_id is null)
    or (status <> 'completed' and analytics_id is not null)
  ),
  constraint analytics_erasure_jobs_deadlines check (
    escalation_at = requested_at + interval '24 hours'
    and hard_deadline_at = requested_at + interval '7 days'
    and next_attempt_at >= requested_at
  ),
  constraint analytics_erasure_jobs_attempt_count check (
    attempt_count >= 0
  ),
  constraint analytics_erasure_jobs_lease_state check (
    (
      status = 'processing'
      and lease_token is not null
      and lease_expires_at is not null
      and last_attempt_at is not null
      and lease_expires_at > last_attempt_at
    )
    or (
      status <> 'processing'
      and lease_token is null
      and lease_expires_at is null
    )
  ),
  constraint analytics_erasure_jobs_completion_state check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed' and completed_at is null)
  ),
  constraint analytics_erasure_jobs_error_code_safe check (
    error_code is null or error_code ~ '^[a-z0-9_:-]{1,100}$'
  )
);

create unique index analytics_erasure_jobs_one_active_identity
  on private.analytics_erasure_jobs (analytics_id)
  where analytics_id is not null and status <> 'completed';
create index analytics_erasure_jobs_worker_queue
  on private.analytics_erasure_jobs (next_attempt_at, requested_at)
  where status in ('pending', 'processing', 'failed');
create index analytics_erasure_jobs_deadline
  on private.analytics_erasure_jobs (hard_deadline_at)
  where status <> 'completed';

alter table private.analytics_erasure_jobs enable row level security;
alter table private.analytics_erasure_jobs force row level security;
revoke all on table private.analytics_erasure_jobs
  from public, anon, authenticated, service_role;

create or replace function private.enqueue_analytics_erasure_on_withdrawal()
returns trigger
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_requested_at timestamptz := statement_timestamp();
begin
  if old.analytics_enabled and not new.analytics_enabled then
    insert into private.analytics_erasure_jobs (
      analytics_id,
      requested_at,
      escalation_at,
      hard_deadline_at,
      next_attempt_at
    ) values (
      old.analytics_id,
      v_requested_at,
      v_requested_at + interval '24 hours',
      v_requested_at + interval '7 days',
      v_requested_at
    )
    on conflict (analytics_id)
      where analytics_id is not null and status <> 'completed'
      do nothing;
  end if;

  return new;
end;
$$;

revoke all on function private.enqueue_analytics_erasure_on_withdrawal()
  from public, anon, authenticated, service_role;

create trigger analytics_identity_queue_withdrawal
  after update of analytics_enabled on private.analytics_identities
  for each row execute function private.enqueue_analytics_erasure_on_withdrawal();

create table private.account_deletion_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  email text,
  avatar_path text,
  analytics_id uuid,
  status text not null default 'pending',
  storage_status text not null,
  database_status text not null default 'pending',
  brevo_status text not null,
  posthog_status text not null,
  requested_at timestamptz not null default statement_timestamp(),
  escalation_at timestamptz not null,
  hard_deadline_at timestamptz not null,
  next_attempt_at timestamptz not null default statement_timestamp(),
  last_attempt_at timestamptz,
  lease_token uuid,
  lease_expires_at timestamptz,
  attempt_count integer not null default 0,
  completed_at timestamptz,
  error_code text,
  constraint account_deletion_jobs_email_safe check (
    email is null
    or (
      email = lower(btrim(email))
      and char_length(email) between 3 and 320
    )
  ),
  constraint account_deletion_jobs_avatar_path_safe check (
    avatar_path is null
    or (
      char_length(avatar_path) <= 255
      and avatar_path !~ '(\.\.|://|\\)'
    )
  ),
  constraint account_deletion_jobs_status_value check (
    status in ('pending', 'processing', 'failed', 'completed')
  ),
  constraint account_deletion_jobs_step_status_values check (
    storage_status in ('pending', 'skipped', 'completed', 'failed')
    and database_status in ('pending', 'completed', 'failed')
    and brevo_status in ('pending', 'skipped', 'completed', 'failed')
    and posthog_status in ('pending', 'skipped', 'completed', 'failed')
  ),
  constraint account_deletion_jobs_deadlines check (
    escalation_at = requested_at + interval '24 hours'
    and hard_deadline_at = requested_at + interval '7 days'
    and next_attempt_at >= requested_at
  ),
  constraint account_deletion_jobs_attempt_count check (
    attempt_count >= 0
  ),
  constraint account_deletion_jobs_lease_state check (
    (
      status = 'processing'
      and lease_token is not null
      and lease_expires_at is not null
      and last_attempt_at is not null
      and lease_expires_at > last_attempt_at
    )
    or (
      status <> 'processing'
      and lease_token is null
      and lease_expires_at is null
    )
  ),
  constraint account_deletion_jobs_completion_state check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed' and completed_at is null)
  ),
  constraint account_deletion_jobs_error_code_safe check (
    error_code is null or error_code ~ '^[a-z0-9_:-]{1,100}$'
  )
);

create unique index account_deletion_jobs_one_active_user
  on private.account_deletion_jobs (user_id)
  where user_id is not null and status <> 'completed';
create index account_deletion_jobs_worker_queue
  on private.account_deletion_jobs (next_attempt_at, requested_at)
  where status in ('pending', 'processing', 'failed');
create index account_deletion_jobs_deadline
  on private.account_deletion_jobs (hard_deadline_at)
  where status <> 'completed';

alter table private.account_deletion_jobs enable row level security;
alter table private.account_deletion_jobs force row level security;
revoke all on table private.account_deletion_jobs
  from public, anon, authenticated, service_role;

create or replace function public.request_account_deletion(
  p_confirmation text,
  p_idempotency_key uuid
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_job_id uuid;
  v_email text;
  v_avatar_path text;
  v_analytics_id uuid;
  v_request_hash text;
  v_stored_request_hash text;
  v_requested_at timestamptz := statement_timestamp();
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_idempotency_key is null then
    raise exception using errcode = '22004', message = 'idempotency key required';
  end if;
  if p_confirmation is distinct from 'DELETE' then
    raise exception using errcode = '23514', message = 'deletion confirmation required';
  end if;

  v_request_hash := private.command_request_hash(
    pg_catalog.jsonb_build_object(
      'confirmation', p_confirmation
    )
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'snowmate:request_account_deletion:' || v_user_id::text,
      0
    )
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'snowmate:analytics_identity:' || v_user_id::text,
      0
    )
  );

  select receipt.resource_id, receipt.request_hash
  into v_job_id, v_stored_request_hash
  from private.command_receipts as receipt
  where receipt.user_id = v_user_id
    and receipt.command_name = 'request_account_deletion'
    and receipt.idempotency_key = p_idempotency_key;
  if found then
    if v_stored_request_hash is distinct from v_request_hash then
      raise exception using errcode = '22023', message = 'idempotency key payload mismatch';
    end if;
    return v_job_id;
  end if;

  if exists (
    select 1
    from private.account_deletion_jobs as job
    where job.user_id = v_user_id
      and job.status <> 'completed'
  ) then
    raise exception using errcode = '23514', message = 'account deletion already requested';
  end if;

  perform private.consume_command_rate_limit(
    v_user_id, 'request_account_deletion', 2, interval '1 day'
  );

  select lower(btrim(account.email))
  into v_email
  from auth.users as account
  where account.id = v_user_id
  for update;
  if not found then
    raise exception using errcode = '42501', message = 'account unavailable';
  end if;

  select profile.avatar_path
  into v_avatar_path
  from public.profiles as profile
  where profile.id = v_user_id;

  select identity.analytics_id
  into v_analytics_id
  from private.analytics_identities as identity
  where identity.user_id = v_user_id
    and identity.analytics_enabled;

  insert into private.account_deletion_jobs (
    user_id,
    email,
    avatar_path,
    analytics_id,
    storage_status,
    brevo_status,
    posthog_status,
    requested_at,
    escalation_at,
    hard_deadline_at,
    next_attempt_at
  ) values (
    v_user_id,
    v_email,
    v_avatar_path,
    v_analytics_id,
    case when v_avatar_path is null then 'skipped' else 'pending' end,
    case when v_email is null then 'skipped' else 'pending' end,
    case when v_analytics_id is null then 'skipped' else 'pending' end,
    v_requested_at,
    v_requested_at + interval '24 hours',
    v_requested_at + interval '7 days',
    v_requested_at
  )
  returning id into v_job_id;

  insert into private.account_controls as control (
    user_id,
    account_status,
    updated_at
  ) values (
    v_user_id,
    'deletion_pending',
    v_requested_at
  )
  on conflict (user_id) do update
  set
    account_status = 'deletion_pending',
    updated_at = excluded.updated_at;

  insert into private.command_receipts (
    user_id,
    command_name,
    idempotency_key,
    resource_id,
    request_hash
  ) values (
    v_user_id,
    'request_account_deletion',
    p_idempotency_key,
    v_job_id,
    v_request_hash
  );

  return v_job_id;
end;
$$;

create or replace function public.get_account_deletion_status()
returns table (
  id uuid,
  status text,
  storage_status text,
  database_status text,
  brevo_status text,
  posthog_status text,
  requested_at timestamptz,
  escalation_at timestamptz,
  hard_deadline_at timestamptz,
  completed_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    job.id,
    job.status,
    job.storage_status,
    job.database_status,
    job.brevo_status,
    job.posthog_status,
    job.requested_at,
    job.escalation_at,
    job.hard_deadline_at,
    job.completed_at
  from private.account_deletion_jobs as job
  where auth.uid() is not null
    and job.user_id = auth.uid()
  order by job.requested_at desc, job.id
  limit 1;
$$;

create or replace function public.claim_account_deletion_jobs(
  p_limit integer default 10
)
returns table (
  id uuid,
  user_id uuid,
  email text,
  avatar_path text,
  analytics_id uuid,
  storage_status text,
  database_status text,
  brevo_status text,
  posthog_status text,
  attempt_count integer,
  hard_deadline_at timestamptz,
  lease_token uuid
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if p_limit is null or p_limit not between 1 and 50 then
    raise exception using errcode = '22023', message = 'invalid worker batch size';
  end if;

  return query
  with candidates as (
    select job.id
    from private.account_deletion_jobs as job
    where (
        job.status in ('pending', 'failed')
        or (
          job.status = 'processing'
          and job.lease_expires_at <= statement_timestamp()
        )
      )
      and job.next_attempt_at <= statement_timestamp()
    order by job.hard_deadline_at, job.requested_at
    for update skip locked
    limit p_limit
  )
  update private.account_deletion_jobs as job
  set
    status = 'processing',
    last_attempt_at = statement_timestamp(),
    lease_token = gen_random_uuid(),
    lease_expires_at = statement_timestamp() + interval '5 minutes',
    attempt_count = job.attempt_count + 1,
    error_code = null
  from candidates
  where job.id = candidates.id
  returning
    job.id,
    job.user_id,
    job.email,
    job.avatar_path,
    job.analytics_id,
    job.storage_status,
    job.database_status,
    job.brevo_status,
    job.posthog_status,
    job.attempt_count,
    job.hard_deadline_at,
    job.lease_token;
end;
$$;

create or replace function public.complete_account_deletion_job(
  p_job_id uuid,
  p_lease_token uuid,
  p_storage_status text,
  p_database_status text,
  p_brevo_status text,
  p_posthog_status text,
  p_error_code text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_job private.account_deletion_jobs%rowtype;
  v_completed boolean;
  v_failed boolean;
  v_retry_minutes integer;
begin
  if p_job_id is null or p_lease_token is null then
    raise exception using errcode = '22004', message = 'deletion job and lease required';
  end if;
  if p_storage_status not in ('pending', 'skipped', 'completed', 'failed')
    or p_database_status not in ('pending', 'completed', 'failed')
    or p_brevo_status not in ('pending', 'skipped', 'completed', 'failed')
    or p_posthog_status not in ('pending', 'skipped', 'completed', 'failed')
  then
    raise exception using errcode = '23514', message = 'invalid deletion step status';
  end if;
  if p_error_code is not null
    and p_error_code !~ '^[a-z0-9_:-]{1,100}$'
  then
    raise exception using errcode = '23514', message = 'invalid deletion error code';
  end if;

  select job.* into v_job
  from private.account_deletion_jobs as job
  where job.id = p_job_id
  for update;
  if not found or v_job.status <> 'processing' then
    raise exception using errcode = '23514', message = 'deletion job is not processing';
  end if;
  if v_job.lease_token is distinct from p_lease_token
    or v_job.lease_expires_at <= statement_timestamp()
  then
    raise exception using errcode = '23514', message = 'deletion job lease invalid';
  end if;

  if p_database_status = 'completed'
    and v_job.user_id is not null
    and exists (select 1 from auth.users where id = v_job.user_id)
  then
    raise exception using
      errcode = '23514',
      message = 'database deletion cannot complete while the auth user exists';
  end if;

  v_failed := 'failed' in (
    p_storage_status,
    p_database_status,
    p_brevo_status,
    p_posthog_status
  );
  v_completed := p_database_status = 'completed'
    and p_storage_status in ('skipped', 'completed')
    and p_brevo_status in ('skipped', 'completed')
    and p_posthog_status in ('skipped', 'completed');
  v_retry_minutes := case
    when v_job.hard_deadline_at <= statement_timestamp() then 5
    else least(360, greatest(5, v_job.attempt_count * 5))
  end;

  update private.account_deletion_jobs
  set
    storage_status = p_storage_status,
    database_status = p_database_status,
    brevo_status = p_brevo_status,
    posthog_status = p_posthog_status,
    status = case
      when v_completed then 'completed'
      when v_failed then 'failed'
      else 'pending'
    end,
    completed_at = case
      when v_completed then statement_timestamp()
      else null
    end,
    next_attempt_at = case
      when v_completed then next_attempt_at
      else statement_timestamp() + (v_retry_minutes * interval '1 minute')
    end,
    lease_token = null,
    lease_expires_at = null,
    error_code = case when v_completed then null else p_error_code end,
    email = case
      when p_brevo_status in ('skipped', 'completed') then null
      else email
    end,
    avatar_path = case
      when p_storage_status in ('skipped', 'completed') then null
      else avatar_path
    end,
    analytics_id = case
      when p_posthog_status in ('skipped', 'completed') then null
      else analytics_id
    end
  where id = p_job_id;

  return p_job_id;
end;
$$;

create or replace function public.claim_analytics_erasure_jobs(
  p_limit integer default 2
)
returns table (
  id uuid,
  analytics_id uuid,
  attempt_count integer,
  hard_deadline_at timestamptz,
  lease_token uuid
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if p_limit is null or p_limit not between 1 and 20 then
    raise exception using errcode = '22023', message = 'invalid worker batch size';
  end if;

  return query
  with candidates as (
    select job.id
    from private.analytics_erasure_jobs as job
    where (
        job.status in ('pending', 'failed')
        or (
          job.status = 'processing'
          and job.lease_expires_at <= statement_timestamp()
        )
      )
      and job.next_attempt_at <= statement_timestamp()
    order by job.hard_deadline_at, job.requested_at
    for update skip locked
    limit p_limit
  )
  update private.analytics_erasure_jobs as job
  set
    status = 'processing',
    last_attempt_at = statement_timestamp(),
    lease_token = gen_random_uuid(),
    lease_expires_at = statement_timestamp() + interval '5 minutes',
    attempt_count = job.attempt_count + 1,
    error_code = null
  from candidates as candidate
  where job.id = candidate.id
  returning
    job.id,
    job.analytics_id,
    job.attempt_count,
    job.hard_deadline_at,
    job.lease_token;
end;
$$;

create or replace function public.complete_analytics_erasure_job(
  p_job_id uuid,
  p_lease_token uuid,
  p_status text,
  p_error_code text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_job private.analytics_erasure_jobs%rowtype;
  v_retry_minutes integer;
begin
  if p_job_id is null or p_lease_token is null then
    raise exception using errcode = '22004', message = 'erasure job and lease required';
  end if;
  if p_status is null or p_status not in ('completed', 'failed') then
    raise exception using errcode = '23514', message = 'invalid erasure status';
  end if;
  if (p_status = 'completed' and p_error_code is not null)
    or (p_status = 'failed' and p_error_code is null)
    or (
      p_error_code is not null
      and p_error_code !~ '^[a-z0-9_:-]{1,100}$'
    )
  then
    raise exception using errcode = '23514', message = 'invalid erasure error code';
  end if;

  select job.* into v_job
  from private.analytics_erasure_jobs as job
  where job.id = p_job_id
  for update;
  if not found or v_job.status <> 'processing' then
    raise exception using errcode = '23514', message = 'erasure job is not processing';
  end if;
  if v_job.lease_token is distinct from p_lease_token
    or v_job.lease_expires_at <= statement_timestamp()
  then
    raise exception using errcode = '23514', message = 'erasure job lease invalid';
  end if;

  v_retry_minutes := case
    when v_job.hard_deadline_at <= statement_timestamp() then 5
    else least(360, greatest(5, v_job.attempt_count * 5))
  end;

  update private.analytics_erasure_jobs
  set
    analytics_id = case when p_status = 'completed' then null else analytics_id end,
    status = p_status,
    completed_at = case
      when p_status = 'completed' then statement_timestamp()
      else null
    end,
    next_attempt_at = case
      when p_status = 'completed' then next_attempt_at
      else statement_timestamp() + (v_retry_minutes * interval '1 minute')
    end,
    lease_token = null,
    lease_expires_at = null,
    error_code = p_error_code
  where id = p_job_id;

  return p_job_id;
end;
$$;

create or replace function private.cleanup_account_deletion_jobs(
  p_now timestamptz default now()
)
returns bigint
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_deleted_count bigint;
begin
  if p_now is null then
    raise exception using errcode = '22004', message = 'cleanup timestamp required';
  end if;

  delete from private.account_deletion_jobs
  where status = 'completed'
    and completed_at <= p_now - interval '12 months';
  get diagnostics v_deleted_count = row_count;

  with deleted_analytics_jobs as (
    delete from private.analytics_erasure_jobs
    where status = 'completed'
      and completed_at <= p_now - interval '12 months'
    returning 1
  )
  select v_deleted_count + count(*) into v_deleted_count
  from deleted_analytics_jobs;

  return v_deleted_count;
end;
$$;

revoke all on function public.request_account_deletion(text, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.get_account_deletion_status()
  from public, anon, authenticated, service_role;
revoke all on function public.claim_account_deletion_jobs(integer)
  from public, anon, authenticated, service_role;
revoke all on function public.complete_account_deletion_job(
  uuid, uuid, text, text, text, text, text
) from public, anon, authenticated, service_role;
revoke all on function public.claim_analytics_erasure_jobs(integer)
  from public, anon, authenticated, service_role;
revoke all on function public.complete_analytics_erasure_job(uuid, uuid, text, text)
  from public, anon, authenticated, service_role;
revoke all on function private.cleanup_account_deletion_jobs(timestamptz)
  from public, anon, authenticated, service_role;

grant execute on function public.request_account_deletion(text, uuid)
  to authenticated;
grant execute on function public.get_account_deletion_status()
  to authenticated;
grant execute on function public.claim_account_deletion_jobs(integer)
  to service_role;
grant execute on function public.complete_account_deletion_job(
  uuid, uuid, text, text, text, text, text
) to service_role;
grant execute on function public.claim_analytics_erasure_jobs(integer)
  to service_role;
grant execute on function public.complete_analytics_erasure_job(uuid, uuid, text, text)
  to service_role;

comment on table private.account_deletion_jobs is
  'Retryable account deletion queue; direct identifiers are cleared as soon as every deletion step completes.';
comment on table private.analytics_erasure_jobs is
  'Retryable PostHog erasure queue created when optional analytics consent is withdrawn.';
comment on function public.claim_account_deletion_jobs(integer) is
  'Server-only worker claim for Storage API, Auth Admin, Brevo, and optional PostHog deletion.';
