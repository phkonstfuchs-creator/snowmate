begin;

create extension if not exists pgtap with schema extensions;

select plan(46);

select has_table(
  'private',
  'beta_invites',
  'private beta invites table exists'
);

select has_table(
  'private',
  'signup_admissions',
  'private signup admissions table exists'
);

select has_table(
  'private',
  'account_safety',
  'private account safety table exists'
);

select has_table(
  'private',
  'consent_ledger',
  'private consent ledger table exists'
);

select has_function(
  'private',
  'before_user_created_hook',
  array['jsonb'],
  'the before-user-created Postgres hook exists'
);

select has_function(
  'private',
  'create_beta_invite',
  array['text', 'timestamp with time zone'],
  'operators have a dedicated random invite creator'
);

select ok(
  has_function_privilege(
    'supabase_auth_admin',
    'private.before_user_created_hook(jsonb)',
    'EXECUTE'
  ),
  'Supabase Auth can execute the signup hook'
);

select ok(
  not has_function_privilege(
    'anon',
    'private.before_user_created_hook(jsonb)',
    'EXECUTE'
  ),
  'anonymous clients cannot execute the signup hook'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'private.before_user_created_hook(jsonb)',
    'EXECUTE'
  ),
  'authenticated clients cannot execute the signup hook'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'private.create_beta_invite(text,timestamp with time zone)',
    'EXECUTE'
  ),
  'authenticated clients cannot create beta invites'
);

select ok(
  not has_function_privilege(
    'service_role',
    'private.create_beta_invite(text,timestamp with time zone)',
    'EXECUTE'
  ),
  'the browser-facing service role cannot create beta invites'
);

select ok(
  coalesce(
    (
      select proconfig @> array['search_path=""']
      from pg_proc
      where oid = 'private.before_user_created_hook(jsonb)'::regprocedure
    ),
    false
  ),
  'the signup hook has an empty search_path'
);

select ok(
  not has_table_privilege('anon', 'private.beta_invites', 'SELECT'),
  'anonymous clients cannot read beta invites'
);

select ok(
  not has_table_privilege('authenticated', 'private.account_safety', 'SELECT'),
  'authenticated clients cannot read account safety records'
);

select ok(
  not has_table_privilege('service_role', 'private.beta_invites', 'SELECT'),
  'the service role has no direct beta invite table access'
);

select matches(
  private.create_beta_invite(
    ' OPERATOR@example.com ',
    statement_timestamp() + interval '7 days'
  ),
  '^[0-9a-f]{64}$',
  'the operator invite creator returns a random URL-safe token once'
);

create function pg_temp.signup_event(
  p_user_id uuid,
  p_email text,
  p_invite_token text,
  p_birth_date text,
  p_terms_version text,
  p_privacy_version text,
  p_extra_metadata jsonb default '{}'::jsonb
)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'metadata', jsonb_build_object('name', 'before-user-created'),
    'user', jsonb_build_object(
      'id', p_user_id,
      'email', p_email,
      'user_metadata', jsonb_strip_nulls(
        jsonb_build_object(
          'invite_token', p_invite_token,
          'birth_date', p_birth_date,
          'terms_version', p_terms_version,
          'privacy_version', p_privacy_version
        )
      ) || p_extra_metadata
    )
  );
$$;

insert into private.beta_invites (
  id,
  email,
  token_hash,
  expires_at
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'minor@example.com',
    private.hash_beta_invite_token('minor-invite-token-00000000000001'),
    statement_timestamp() + interval '1 day'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'adult@example.com',
    private.hash_beta_invite_token('adult-invite-token-00000000000001'),
    statement_timestamp() + interval '1 day'
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'underage@example.com',
    private.hash_beta_invite_token('underage-invite-token-0000000001'),
    statement_timestamp() + interval '1 day'
  ),
  (
    '10000000-0000-4000-8000-000000000004',
    'email-bound@example.com',
    private.hash_beta_invite_token('email-bound-token-000000000000001'),
    statement_timestamp() + interval '1 day'
  ),
  (
    '10000000-0000-4000-8000-000000000005',
    'versions@example.com',
    private.hash_beta_invite_token('versions-token-00000000000000001'),
    statement_timestamp() + interval '1 day'
  );

select ok(
  private.before_user_created_hook(
    pg_temp.signup_event(
      '20000000-0000-4000-8000-000000000001',
      'minor@example.com',
      null,
      (current_date - interval '17 years')::date::text,
      'terms-beta-2026-08-03',
      'privacy-beta-2026-08-03'
    )
  ) ? 'error',
  'a direct signup without an invite is denied'
);

select results_eq(
  $$select count(*) from private.signup_admissions
    where user_id = '20000000-0000-4000-8000-000000000001'$$,
  array[0::bigint],
  'a denied direct signup creates no admission'
);

select throws_ok(
  $$
    insert into auth.users (id, email, raw_app_meta_data)
    values (
      '20000000-0000-4000-8000-000000000001',
      'minor@example.com',
      '{"provider":"email","providers":["email"]}'::jsonb
    )
  $$,
  '23514',
  'missing validated signup admission',
  'an email Auth insert cannot bypass a missing hook admission'
);

select ok(
  private.before_user_created_hook(
    pg_temp.signup_event(
      '20000000-0000-4000-8000-000000000002',
      'underage@example.com',
      'underage-invite-token-0000000001',
      (current_date - interval '15 years')::date::text,
      'terms-beta-2026-08-03',
      'privacy-beta-2026-08-03'
    )
  ) ? 'error',
  'an applicant under 16 is denied'
);

select results_eq(
  $$
    select admitted_at is null
    from private.beta_invites
    where id = '10000000-0000-4000-8000-000000000003'
  $$,
  array[true],
  'an underage attempt does not consume its invite'
);

select ok(
  private.before_user_created_hook(
    pg_temp.signup_event(
      '20000000-0000-4000-8000-000000000003',
      'wrong-email@example.com',
      'email-bound-token-000000000000001',
      (current_date - interval '20 years')::date::text,
      'terms-beta-2026-08-03',
      'privacy-beta-2026-08-03'
    )
  ) ? 'error',
  'an invite cannot be used with a different email address'
);

select results_eq(
  $$
    select admitted_at is null
    from private.beta_invites
    where id = '10000000-0000-4000-8000-000000000004'
  $$,
  array[true],
  'an email mismatch does not consume the invite'
);

select ok(
  private.before_user_created_hook(
    pg_temp.signup_event(
      '20000000-0000-4000-8000-000000000004',
      'versions@example.com',
      'versions-token-00000000000000001',
      (current_date - interval '20 years')::date::text,
      'outdated-terms',
      'privacy-beta-2026-08-03'
    )
  ) ? 'error',
  'outdated legal document acceptance is denied'
);

select results_eq(
  $$
    select admitted_at is null
    from private.beta_invites
    where id = '10000000-0000-4000-8000-000000000005'
  $$,
  array[true],
  'a legal version mismatch does not consume the invite'
);

select is(
  private.before_user_created_hook(
    pg_temp.signup_event(
      '30000000-0000-4000-8000-000000000001',
      ' MINOR@example.com ',
      'minor-invite-token-00000000000001',
      (current_date - interval '17 years')::date::text,
      'terms-beta-2026-08-03',
      'privacy-beta-2026-08-03',
      jsonb_build_object(
        'is_minor', false,
        'account_type', 'guide',
        'onboarding_completed', true,
        'role', 'admin'
      )
    )
  ),
  '{}'::jsonb,
  'a valid email-bound invite creates an admission'
);

select results_eq(
  $$
    select
      admissions.email,
      invites.admitted_user_id,
      invites.admitted_at is not null
    from private.signup_admissions as admissions
    join private.beta_invites as invites on invites.id = admissions.invite_id
    where admissions.user_id = '30000000-0000-4000-8000-000000000001'
  $$,
  $$
    values (
      'minor@example.com'::text,
      '30000000-0000-4000-8000-000000000001'::uuid,
      true
    )
  $$,
  'the admission normalizes email and atomically consumes the invite'
);

select ok(
  private.before_user_created_hook(
    pg_temp.signup_event(
      '30000000-0000-4000-8000-000000000099',
      'minor@example.com',
      'minor-invite-token-00000000000001',
      (current_date - interval '20 years')::date::text,
      'terms-beta-2026-08-03',
      'privacy-beta-2026-08-03'
    )
  ) ? 'error',
  'a consumed invite cannot be replayed'
);

select results_eq(
  $$
    select count(*)
    from private.signup_admissions
    where invite_id = '10000000-0000-4000-8000-000000000001'
  $$,
  array[1::bigint],
  'invite replay does not create another admission'
);

insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
values (
  '30000000-0000-4000-8000-000000000001',
  'minor@example.com',
  jsonb_build_object(
    'invite_token', 'minor-invite-token-00000000000001',
    'birth_date', (current_date - interval '40 years')::date::text,
    'terms_version', 'forged',
    'privacy_version', 'forged',
    'is_minor', false,
    'account_type', 'guide',
    'onboarding_completed', true,
    'role', 'admin',
    'display_preference', 'snow'
  ),
  '{"provider":"email","providers":["email"]}'::jsonb
);

select results_eq(
  $$
    select birth_date, is_minor
    from private.account_safety
    where user_id = '30000000-0000-4000-8000-000000000001'
  $$,
  $$values ((current_date - interval '17 years')::date, true)$$,
  'account safety uses the validated admission and derives minor status'
);

select results_eq(
  $$
    select is_minor, account_type, onboarding_completed
    from public.profiles
    where id = '30000000-0000-4000-8000-000000000001'
  $$,
  $$values (true, 'standard'::text, false)$$,
  'privileged user metadata cannot alter the profile truth'
);

select results_eq(
  $$
    select
      raw_user_meta_data ? 'display_preference',
      raw_user_meta_data ?| array[
        'invite_token',
        'birth_date',
        'terms_version',
        'privacy_version',
        'is_minor',
        'account_type',
        'onboarding_completed',
        'role',
        'user_role'
      ]
    from auth.users
    where id = '30000000-0000-4000-8000-000000000001'
  $$,
  $$values (true, false)$$,
  'signup secrets and privileged fields are scrubbed while benign metadata remains'
);

update auth.users
set raw_user_meta_data = raw_user_meta_data || jsonb_build_object(
  'is_minor', false,
  'account_type', 'guide',
  'user_role', 'admin'
)
where id = '30000000-0000-4000-8000-000000000001';

select results_eq(
  $$
    select
      raw_user_meta_data ? 'display_preference',
      raw_user_meta_data ?| array['is_minor', 'account_type', 'user_role']
    from auth.users
    where id = '30000000-0000-4000-8000-000000000001'
  $$,
  $$values (true, false)$$,
  'reserved metadata is scrubbed again on later user metadata updates'
);

select results_eq(
  $$
    select document_kind, document_version
    from private.consent_ledger
    where user_id = '30000000-0000-4000-8000-000000000001'
    order by document_kind
  $$,
  $$
    values
      ('privacy'::text, 'privacy-beta-2026-08-03'::text),
      ('terms'::text, 'terms-beta-2026-08-03'::text)
  $$,
  'the validated Terms and Privacy versions are recorded'
);

select results_eq(
  $$
    select birth_date is null, completed_at is not null
    from private.signup_admissions
    where user_id = '30000000-0000-4000-8000-000000000001'
  $$,
  $$values (true, true)$$,
  'the completed admission no longer duplicates the birth date'
);

select throws_ok(
  $$
    update private.consent_ledger
    set document_version = 'tampered'
    where user_id = '30000000-0000-4000-8000-000000000001'
  $$,
  '55000',
  'consent ledger entries are immutable',
  'consent ledger entries cannot be updated'
);

select throws_ok(
  $$
    delete from private.consent_ledger
    where user_id = '30000000-0000-4000-8000-000000000001'
  $$,
  '55000',
  'consent ledger entries are immutable',
  'consent ledger entries cannot be deleted while the account exists'
);

select is(
  private.before_user_created_hook(
    pg_temp.signup_event(
      '30000000-0000-4000-8000-000000000002',
      'adult@example.com',
      'adult-invite-token-00000000000001',
      (current_date - interval '20 years')::date::text,
      'terms-beta-2026-08-03',
      'privacy-beta-2026-08-03',
      jsonb_build_object('is_minor', true)
    )
  ),
  '{}'::jsonb,
  'a valid adult admission is accepted'
);

insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
values (
  '30000000-0000-4000-8000-000000000002',
  'adult@example.com',
  jsonb_build_object('is_minor', true),
  '{"provider":"email","providers":["email"]}'::jsonb
);

select results_eq(
  $$
    select is_minor
    from public.profiles
    where id = '30000000-0000-4000-8000-000000000002'
  $$,
  array[false],
  'an adult profile is server-derived even when metadata claims minor status'
);

select results_eq(
  $$
    select is_minor
    from private.account_safety
    where user_id = '30000000-0000-4000-8000-000000000002'
  $$,
  array[false],
  'the private account safety record derives adult status'
);

update private.account_safety
set is_minor = false
where user_id = '30000000-0000-4000-8000-000000000001';

select results_eq(
  $$
    select safety.is_minor, profiles.is_minor
    from private.account_safety as safety
    join public.profiles as profiles on profiles.id = safety.user_id
    where safety.user_id = '30000000-0000-4000-8000-000000000001'
  $$,
  $$values (true, true)$$,
  'minor status is re-derived and synchronized on server-side updates'
);

insert into auth.users (id, email, raw_user_meta_data)
values (
  '40000000-0000-4000-8000-000000000001',
  'metadata-only@example.com',
  jsonb_build_object(
    'invite_token', 'minor-invite-token-00000000000001',
    'birth_date', (current_date - interval '30 years')::date::text,
    'is_minor', false,
    'account_type', 'guide'
  )
);

select results_eq(
  $$
    select count(*)
    from private.account_safety
    where user_id = '40000000-0000-4000-8000-000000000001'
  $$,
  array[0::bigint],
  'raw metadata without a hook admission cannot create account safety truth'
);

select results_eq(
  $$
    select is_minor, account_type
    from public.profiles
    where id = '40000000-0000-4000-8000-000000000001'
  $$,
  $$values (true, 'standard'::text)$$,
  'a metadata-only database insert retains fail-closed profile defaults'
);

select results_eq(
  $$
    select count(*)
    from private.consent_ledger
    where user_id = '40000000-0000-4000-8000-000000000001'
  $$,
  array[0::bigint],
  'raw metadata without an admission cannot forge consent records'
);

select ok(
  (
    select relrowsecurity and relforcerowsecurity
    from pg_class
    where oid = 'private.account_safety'::regclass
  ),
  'account safety enables and forces row level security'
);

select ok(
  (
    select relrowsecurity and relforcerowsecurity
    from pg_class
    where oid = 'private.consent_ledger'::regclass
  ),
  'the consent ledger enables and forces row level security'
);

select * from finish();

rollback;
