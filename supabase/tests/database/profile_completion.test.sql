begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

select has_function(
  'public',
  'complete_own_profile',
  array['text', 'text', 'text', 'text'],
  'the profile completion RPC exists with no user id parameter'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.complete_own_profile(text,text,text,text)',
    'EXECUTE'
  ),
  'authenticated users can execute profile completion'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.complete_own_profile(text,text,text,text)',
    'EXECUTE'
  ),
  'anonymous users cannot execute profile completion'
);

insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'completion-one@example.com'),
  ('22222222-2222-4222-8222-222222222222', 'completion-two@example.com'),
  ('33333333-3333-4333-8333-333333333333', 'completion-three@example.com');

delete from public.profiles
where id = '33333333-3333-4333-8333-333333333333';

set local role anon;

select throws_ok(
  $$
    select public.complete_own_profile(
      'Anonymous Rider',
      'anonymous_rider',
      'innsbruck',
      'chill'
    )
  $$,
  '42501',
  null,
  'anonymous profile completion fails at execution time'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select results_eq(
  $$
    select public.complete_own_profile(
      '  Rider One  ',
      '  RIDER_ONE  ',
      'innsbruck',
      'chill'
    )
  $$,
  array[true],
  'the RPC completes the authenticated profile'
);

select results_eq(
  $$
    select
      display_name,
      handle,
      city,
      ability_level,
      onboarding_completed
    from public.profiles
  $$,
  $$values ('Rider One', 'rider_one', 'innsbruck', 'chill', true)$$,
  'completion normalizes identity fields and marks the profile complete'
);

select results_eq(
  $$
    select public.complete_own_profile(
      'Rider One',
      'rider_one',
      'innsbruck',
      'chill'
    )
  $$,
  array[true],
  'repeating profile completion is idempotent'
);

set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';

select throws_ok(
  $$select public.complete_own_profile('Rider Two', 'rider_two', 'berlin', 'chill')$$,
  '23514',
  null,
  'an unsupported region rolls the entire completion back'
);

select results_eq(
  $$select onboarding_completed from public.profiles$$,
  array[false],
  'a failed RPC leaves the authenticated profile incomplete'
);

select throws_ok(
  $$select public.complete_own_profile(E'Rider\nTwo', 'rider_two', 'salzburg', 'park')$$,
  '23514',
  null,
  'control characters in display names are rejected'
);

select throws_ok(
  $$select public.complete_own_profile(U&'Rider\202ETwo', 'rider_two', 'salzburg', 'park')$$,
  '23514',
  null,
  'bidirectional display-name controls are rejected'
);

select throws_ok(
  $$select public.complete_own_profile('Rider Two', 'snowmate', 'salzburg', 'park')$$,
  '23514',
  null,
  'reserved handles are rejected'
);

select throws_ok(
  $$select public.complete_own_profile('Rider Two', 'rider_one', 'salzburg', 'park')$$,
  '23505',
  null,
  'an existing handle cannot be claimed by another account'
);

select lives_ok(
  $$
    update public.profiles
    set
      display_name = 'Rider Two',
      handle = 'rider_two',
      city = 'salzburg',
      ability_level = 'park'
  $$,
  'RLS still permits direct updates to the authenticated profile fields'
);

select results_eq(
  $$select onboarding_completed from public.profiles$$,
  array[true],
  'valid required fields make the workflow status complete'
);

set local request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';

select results_eq(
  $$
    select public.complete_own_profile(
      'Missing Profile',
      'missing_profile',
      'innsbruck',
      'off-piste'
    )
  $$,
  array[false],
  'the RPC reports a missing own profile instead of claiming success'
);

reset role;

select * from finish();

rollback;
