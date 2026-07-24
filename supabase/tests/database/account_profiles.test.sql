begin;

create extension if not exists pgtap with schema extensions;

select plan(29);

select has_table(
  'public',
  'profiles',
  'profiles table exists'
);

select col_is_pk(
  'public',
  'profiles',
  'id',
  'profiles.id is the primary key'
);

select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.profiles'::regclass
  ),
  'profiles has row level security enabled'
);

select ok(
  (
    select relforcerowsecurity
    from pg_class
    where oid = 'public.profiles'::regclass
  ),
  'profiles forces row level security'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'rider-one@example.com',
    '{
      "display_name": "Injected",
      "is_minor": false,
      "account_type": "guide",
      "onboarding_completed": true
    }'::jsonb
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'rider-two@example.com',
    '{}'::jsonb
  );

select results_eq(
  $$select count(*) from public.profiles$$,
  array[2::bigint],
  'the auth trigger creates one profile per user'
);

select results_eq(
  $$
    select
      display_name,
      is_minor,
      account_type,
      onboarding_completed
    from public.profiles
    where id = '11111111-1111-4111-8111-111111111111'
  $$,
  $$
    values (
      null::text,
      true,
      'standard'::text,
      false
    )
  $$,
  'the auth trigger ignores user-controlled signup metadata'
);

delete from auth.users
where id = '22222222-2222-4222-8222-222222222222';

select results_eq(
  $$select count(*) from public.profiles$$,
  array[1::bigint],
  'deleting an auth user cascades to the profile'
);

insert into auth.users (id, email)
values ('22222222-2222-4222-8222-222222222222', 'rider-two@example.com');

insert into auth.users (id, email)
values ('33333333-3333-4333-8333-333333333333', 'existing-rider@example.com');

delete from public.profiles
where id = '33333333-3333-4333-8333-333333333333';

select results_eq(
  $$select private.backfill_profiles_for_auth_users()$$,
  array[1::bigint],
  'the backfill creates a profile for a pre-existing auth user'
);

select results_eq(
  $$
    select count(*)
    from auth.users as users
    left join public.profiles as profiles on profiles.id = users.id
    where profiles.id is null
  $$,
  array[0::bigint],
  'every existing auth user has a profile after migration and backfill'
);

select ok(
  not has_table_privilege('anon', 'public.profiles', 'SELECT'),
  'anonymous users have no profile read grant'
);

select ok(
  has_table_privilege('authenticated', 'public.profiles', 'SELECT'),
  'authenticated users can read rows allowed by RLS'
);

select ok(
  has_column_privilege(
    'authenticated',
    'public.profiles',
    'display_name',
    'UPDATE'
  ),
  'authenticated users can update allowed profile fields'
);

select ok(
  not has_column_privilege(
    'authenticated',
    'public.profiles',
    'is_minor',
    'UPDATE'
  ),
  'clients cannot update is_minor'
);

update public.profiles
set handle = 'same_handle'
where id = '11111111-1111-4111-8111-111111111111';

select throws_ok(
  $$
    update public.profiles
    set handle = 'same_handle'
    where id = '22222222-2222-4222-8222-222222222222'
  $$,
  '23505',
  null,
  'duplicate handles are rejected'
);

update public.profiles
set handle = null
where id = '11111111-1111-4111-8111-111111111111';

select throws_ok(
  $$
    update public.profiles
    set handle = 'Invalid Handle'
    where id = '11111111-1111-4111-8111-111111111111'
  $$,
  '23514',
  null,
  'invalid handles are rejected'
);

set local role anon;

select throws_ok(
  $$select * from public.profiles$$,
  '42501',
  null,
  'anonymous profile reads fail at execution time'
);

reset role;

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select throws_ok(
  $$
    insert into public.profiles (id)
    values ('33333333-3333-4333-8333-333333333333')
  $$,
  '42501',
  null,
  'authenticated clients cannot insert profiles'
);

select throws_ok(
  $$
    delete from public.profiles
    where id = '11111111-1111-4111-8111-111111111111'
  $$,
  '42501',
  null,
  'authenticated clients cannot delete profiles'
);

select results_eq(
  $$select id from public.profiles order by id$$,
  array['11111111-1111-4111-8111-111111111111'::uuid],
  'a user can only select their own profile'
);

select lives_ok(
  $$
    update public.profiles
    set
      display_name = 'Rider One',
      handle = 'rider_one',
      city = 'innsbruck',
      ability_level = 'chill'
    where id = '11111111-1111-4111-8111-111111111111'
  $$,
  'a user can update their own allowed fields'
);

select results_eq(
  $$
    update public.profiles
    set display_name = 'Hacked'
    where id = '22222222-2222-4222-8222-222222222222'
    returning id
  $$,
  array[]::uuid[],
  'a user cannot update another profile'
);

select throws_ok(
  $$
    update public.profiles
    set is_minor = false
    where id = '11111111-1111-4111-8111-111111111111'
  $$,
  '42501',
  null,
  'clients cannot update is_minor'
);

select throws_ok(
  $$
    update public.profiles
    set account_type = 'verified'
    where id = '11111111-1111-4111-8111-111111111111'
  $$,
  '42501',
  null,
  'clients cannot update account_type'
);

select throws_ok(
  $$
    update public.profiles
    set onboarding_completed = true
    where id = '11111111-1111-4111-8111-111111111111'
  $$,
  '42501',
  null,
  'clients cannot update onboarding_completed'
);

select throws_ok(
  $$
    update public.profiles
    set id = '33333333-3333-4333-8333-333333333333'
    where id = '11111111-1111-4111-8111-111111111111'
  $$,
  '42501',
  null,
  'clients cannot update profile ids'
);

select throws_ok(
  $$
    update public.profiles
    set created_at = now()
    where id = '11111111-1111-4111-8111-111111111111'
  $$,
  '42501',
  null,
  'clients cannot update created_at'
);

select throws_ok(
  $$
    update public.profiles
    set updated_at = now()
    where id = '11111111-1111-4111-8111-111111111111'
  $$,
  '42501',
  null,
  'clients cannot update updated_at directly'
);

select throws_ok(
  $$select private.create_profile_for_auth_user()$$,
  '42501',
  null,
  'clients cannot invoke the private auth trigger function'
);

select throws_ok(
  $$select private.backfill_profiles_for_auth_users()$$,
  '42501',
  null,
  'clients cannot invoke the private profile backfill function'
);

reset role;

select * from finish();

rollback;
