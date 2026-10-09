create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;
revoke all on schema private from service_role;

create table private.beta_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  admitted_at timestamptz,
  admitted_user_id uuid,
  created_at timestamptz not null default statement_timestamp(),

  constraint beta_invites_email_normalized check (
    email = lower(btrim(email))
    and char_length(email) between 3 and 320
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  constraint beta_invites_token_hash_format check (
    token_hash ~ '^[0-9a-f]{64}$'
  ),
  constraint beta_invites_expiry_after_creation check (
    expires_at > created_at
  ),
  constraint beta_invites_admission_pair check (
    (admitted_at is null and admitted_user_id is null)
    or (admitted_at is not null and admitted_user_id is not null)
  )
);

create unique index beta_invites_admitted_user_unique
  on private.beta_invites (admitted_user_id)
  where admitted_user_id is not null;

create table private.signup_admissions (
  user_id uuid primary key,
  invite_id uuid not null unique references private.beta_invites (id),
  email text not null unique,
  birth_date date,
  terms_version text not null,
  privacy_version text not null,
  admitted_at timestamptz not null,
  completed_at timestamptz,

  constraint signup_admissions_email_normalized check (
    email = lower(btrim(email))
  ),
  constraint signup_admissions_terms_version_length check (
    char_length(terms_version) between 1 and 100
  ),
  constraint signup_admissions_privacy_version_length check (
    char_length(privacy_version) between 1 and 100
  ),
  constraint signup_admissions_completion_state check (
    (completed_at is null and birth_date is not null)
    or (completed_at is not null and birth_date is null)
  )
);

create table private.account_safety (
  user_id uuid primary key references auth.users (id) on delete cascade,
  invite_id uuid not null unique references private.beta_invites (id),
  birth_date date not null,
  is_minor boolean not null default true,
  age_basis text not null default 'self_declared',
  created_at timestamptz not null default statement_timestamp(),
  age_status_updated_at timestamptz not null default statement_timestamp(),

  constraint account_safety_age_basis_value check (
    age_basis in ('self_declared')
  )
);

create table private.consent_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  document_kind text not null,
  document_version text not null,
  accepted_at timestamptz not null,
  acceptance_source text not null default 'signup',

  constraint consent_ledger_document_kind_value check (
    document_kind in ('terms', 'privacy')
  ),
  constraint consent_ledger_document_version_length check (
    char_length(document_version) between 1 and 100
  ),
  constraint consent_ledger_acceptance_source_value check (
    acceptance_source in ('signup')
  ),
  constraint consent_ledger_unique_acceptance unique (
    user_id,
    document_kind,
    document_version
  )
);

comment on table private.beta_invites is
  'Hashed, single-use, email-bound invitations for the closed beta.';
comment on table private.signup_admissions is
  'Validated handoff from the Auth hook to the auth.users insert trigger.';
comment on table private.account_safety is
  'Private date of birth and server-derived age status; never sourced from JWT metadata.';
comment on table private.consent_ledger is
  'Append-only legal document acceptance ledger. Rows leave only with account deletion.';

alter table private.beta_invites enable row level security;
alter table private.beta_invites force row level security;
alter table private.signup_admissions enable row level security;
alter table private.signup_admissions force row level security;
alter table private.account_safety enable row level security;
alter table private.account_safety force row level security;
alter table private.consent_ledger enable row level security;
alter table private.consent_ledger force row level security;

revoke all on table private.beta_invites
  from public, anon, authenticated, service_role, supabase_auth_admin;
revoke all on table private.signup_admissions
  from public, anon, authenticated, service_role, supabase_auth_admin;
revoke all on table private.account_safety
  from public, anon, authenticated, service_role, supabase_auth_admin;
revoke all on table private.consent_ledger
  from public, anon, authenticated, service_role, supabase_auth_admin;
revoke all on sequence private.consent_ledger_id_seq
  from public, anon, authenticated, service_role, supabase_auth_admin;

create or replace function private.current_terms_version()
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select 'terms-beta-2026-08-03'::text;
$$;

create or replace function private.current_privacy_version()
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select 'privacy-beta-2026-08-03'::text;
$$;

create or replace function private.hash_beta_invite_token(p_token text)
returns text
language sql
immutable
strict
security invoker
set search_path = ''
as $$
  select pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(p_token, 'UTF8'), 'sha256'),
    'hex'
  );
$$;

create or replace function private.create_beta_invite(
  p_email text,
  p_expires_at timestamptz default statement_timestamp() + interval '7 days'
)
returns text
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_token text;
begin
  if
    p_expires_at <= statement_timestamp()
    or p_expires_at > statement_timestamp() + interval '30 days'
  then
    raise exception using
      errcode = '23514',
      message = 'invite expiry must be within the next 30 days';
  end if;

  v_token := pg_catalog.encode(extensions.gen_random_bytes(32), 'hex');

  insert into private.beta_invites (email, token_hash, expires_at)
  values (
    pg_catalog.lower(pg_catalog.btrim(p_email)),
    private.hash_beta_invite_token(v_token),
    p_expires_at
  );

  return v_token;
end;
$$;

create or replace function private.signup_rejection()
returns jsonb
language sql
immutable
security invoker
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'error',
    pg_catalog.jsonb_build_object(
      'http_code', 403,
      'message', 'Signup is not eligible for this closed beta.'
    )
  );
$$;

create or replace function private.is_minor_on(
  p_birth_date date,
  p_on_date date
)
returns boolean
language sql
immutable
strict
security invoker
set search_path = ''
as $$
  select p_birth_date > (p_on_date - interval '18 years')::date;
$$;

revoke all on function private.current_terms_version()
  from public, anon, authenticated, service_role, supabase_auth_admin;
revoke all on function private.current_privacy_version()
  from public, anon, authenticated, service_role, supabase_auth_admin;
revoke all on function private.hash_beta_invite_token(text)
  from public, anon, authenticated, service_role, supabase_auth_admin;
revoke all on function private.create_beta_invite(text, timestamptz)
  from public, anon, authenticated, service_role, supabase_auth_admin;
revoke all on function private.signup_rejection()
  from public, anon, authenticated, service_role, supabase_auth_admin;
revoke all on function private.is_minor_on(date, date)
  from public, anon, authenticated, service_role, supabase_auth_admin;

create or replace function private.before_user_created_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_email text;
  v_token text;
  v_birth_date_text text;
  v_birth_date date;
  v_terms_version text;
  v_privacy_version text;
  v_invite_id uuid;
  v_admitted_at timestamptz := statement_timestamp();
begin
  if event #>> '{metadata,name}' is distinct from 'before-user-created' then
    return private.signup_rejection();
  end if;

  begin
    v_user_id := (event #>> '{user,id}')::uuid;
  exception
    when invalid_text_representation then
      return private.signup_rejection();
  end;

  v_email := lower(btrim(event #>> '{user,email}'));
  v_token := event #>> '{user,user_metadata,invite_token}';
  v_birth_date_text := event #>> '{user,user_metadata,birth_date}';
  v_terms_version := event #>> '{user,user_metadata,terms_version}';
  v_privacy_version := event #>> '{user,user_metadata,privacy_version}';

  if
    v_user_id is null
    or v_email is null
    or v_token is null
    or char_length(v_token) not between 32 and 512
    or v_birth_date_text is null
    or v_birth_date_text !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    or v_terms_version is distinct from private.current_terms_version()
    or v_privacy_version is distinct from private.current_privacy_version()
  then
    return private.signup_rejection();
  end if;

  begin
    v_birth_date := v_birth_date_text::date;
  exception
    when datetime_field_overflow or invalid_datetime_format then
      return private.signup_rejection();
  end;

  if
    v_birth_date > (current_date - interval '16 years')::date
    or v_birth_date < (current_date - interval '120 years')::date
  then
    return private.signup_rejection();
  end if;

  select invites.id
  into v_invite_id
  from private.beta_invites as invites
  where invites.token_hash = private.hash_beta_invite_token(v_token)
    and invites.email = v_email
    and invites.admitted_at is null
    and invites.expires_at > v_admitted_at
  for update;

  if not found then
    return private.signup_rejection();
  end if;

  update private.beta_invites
  set
    admitted_at = v_admitted_at,
    admitted_user_id = v_user_id
  where id = v_invite_id
    and admitted_at is null;

  if not found then
    return private.signup_rejection();
  end if;

  insert into private.signup_admissions (
    user_id,
    invite_id,
    email,
    birth_date,
    terms_version,
    privacy_version,
    admitted_at
  )
  values (
    v_user_id,
    v_invite_id,
    v_email,
    v_birth_date,
    v_terms_version,
    v_privacy_version,
    v_admitted_at
  );

  return '{}'::jsonb;
exception
  when unique_violation then
    return private.signup_rejection();
end;
$$;

comment on function private.before_user_created_hook(jsonb) is
  'Allows Auth signup only after atomically validating and consuming an email-bound 16+ beta invite.';

revoke all on function private.before_user_created_hook(jsonb)
  from public, anon, authenticated, service_role;
grant usage on schema private to supabase_auth_admin;
grant execute on function private.before_user_created_hook(jsonb)
  to supabase_auth_admin;

create or replace function private.derive_account_age_status()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if
    new.birth_date > (current_date - interval '16 years')::date
    or new.birth_date < (current_date - interval '120 years')::date
  then
    raise exception using
      errcode = '23514',
      message = 'account does not satisfy the supported age range';
  end if;

  new.is_minor := private.is_minor_on(new.birth_date, current_date);
  new.age_status_updated_at := statement_timestamp();
  return new;
end;
$$;

revoke all on function private.derive_account_age_status()
  from public, anon, authenticated, service_role, supabase_auth_admin;

create trigger account_safety_derive_age_status
  before insert or update on private.account_safety
  for each row
  execute function private.derive_account_age_status();

create or replace function private.sync_profile_age_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set is_minor = new.is_minor
  where id = new.user_id;

  return new;
end;
$$;

revoke all on function private.sync_profile_age_status()
  from public, anon, authenticated, service_role, supabase_auth_admin;

create trigger account_safety_sync_profile_age_status
  after insert or update of is_minor on private.account_safety
  for each row
  execute function private.sync_profile_age_status();

create or replace function private.enforce_consent_ledger_immutability()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and not exists (
    select 1
    from auth.users
    where id = old.user_id
  ) then
    return old;
  end if;

  raise exception using
    errcode = '55000',
    message = 'consent ledger entries are immutable';
end;
$$;

revoke all on function private.enforce_consent_ledger_immutability()
  from public, anon, authenticated, service_role, supabase_auth_admin;

create trigger consent_ledger_prevent_mutation
  before update or delete on private.consent_ledger
  for each row
  execute function private.enforce_consent_ledger_immutability();

create or replace function private.sanitize_auth_user_metadata()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb) - array[
    'invite_token',
    'birth_date',
    'terms_version',
    'privacy_version',
    'is_minor',
    'account_type',
    'onboarding_completed',
    'role',
    'user_role'
  ];

  return new;
end;
$$;

revoke all on function private.sanitize_auth_user_metadata()
  from public, anon, authenticated, service_role, supabase_auth_admin;

create trigger snowmate_sanitize_auth_user_metadata
  before insert or update of raw_user_meta_data on auth.users
  for each row
  execute function private.sanitize_auth_user_metadata();

create or replace function private.finalize_signup_admission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admission private.signup_admissions%rowtype;
begin
  select admissions.*
  into v_admission
  from private.signup_admissions as admissions
  where admissions.user_id = new.id
    and admissions.email = lower(btrim(new.email))
    and admissions.completed_at is null
  for update;

  if not found then
    if
      new.email is not null
      and new.raw_app_meta_data ->> 'provider' = 'email'
    then
      raise exception using
        errcode = '23514',
        message = 'missing validated signup admission';
    end if;

    return new;
  end if;

  insert into private.account_safety (
    user_id,
    invite_id,
    birth_date,
    age_basis,
    created_at
  )
  values (
    new.id,
    v_admission.invite_id,
    v_admission.birth_date,
    'self_declared',
    v_admission.admitted_at
  );

  insert into private.consent_ledger (
    user_id,
    document_kind,
    document_version,
    accepted_at,
    acceptance_source
  )
  values
    (
      new.id,
      'terms',
      v_admission.terms_version,
      v_admission.admitted_at,
      'signup'
    ),
    (
      new.id,
      'privacy',
      v_admission.privacy_version,
      v_admission.admitted_at,
      'signup'
    );

  update private.signup_admissions
  set
    birth_date = null,
    completed_at = statement_timestamp()
  where user_id = new.id;

  return new;
end;
$$;

revoke all on function private.finalize_signup_admission()
  from public, anon, authenticated, service_role, supabase_auth_admin;

create trigger snowmate_finalize_signup_after_auth_user_insert
  after insert on auth.users
  for each row
  execute function private.finalize_signup_admission();
