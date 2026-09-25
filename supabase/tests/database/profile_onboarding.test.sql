begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

insert into auth.users (id, email)
values ('44444444-4444-4444-8444-444444444444', 'onboarding@example.com');

set local role authenticated;
set local request.jwt.claim.sub = '44444444-4444-4444-8444-444444444444';

select is(
  (select onboarding_completed from public.profiles),
  false,
  'a new profile starts incomplete'
);

update public.profiles
set display_name = 'Half Done', city = 'salzburg';

select is(
  (select onboarding_completed from public.profiles),
  false,
  'a partially filled profile stays incomplete'
);

update public.profiles
set handle = 'half_done', ability_level = 'park';

select is(
  (select onboarding_completed from public.profiles),
  true,
  'filling every required field completes onboarding'
);

select throws_ok(
  $$update public.profiles set onboarding_completed = false$$,
  '42501',
  null,
  'clients still cannot write onboarding_completed directly'
);

update public.profiles
set handle = null;

select is(
  (select onboarding_completed from public.profiles),
  false,
  'clearing a required field marks onboarding incomplete again'
);

reset role;

select throws_ok(
  $$select private.derive_onboarding_completed()$$,
  '0A000',
  null,
  'the trigger function cannot be called directly'
);

select * from finish();

rollback;
