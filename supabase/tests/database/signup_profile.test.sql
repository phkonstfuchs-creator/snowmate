begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

-- A complete sign-up fills the whole profile.
insert into auth.users (id, email, raw_user_meta_data)
values ('d0d0d0d0-0000-4000-8000-000000000001', 'full@example.com', jsonb_build_object(
  'display_name', '  Lena Moser ',
  'handle', 'Lena_M',
  'city', 'salzburg',
  'riding_styles', jsonb_build_array('park', 'chill', 'park', 'freestyle'),
  'birth_date', ((now() at time zone 'Europe/Vienna')::date - interval '16 years')::date
));

select results_eq(
  $$select display_name, handle, city, ability_level, riding_styles, onboarding_completed, is_minor
    from public.profiles where id = 'd0d0d0d0-0000-4000-8000-000000000001'$$,
  $$values ('Lena Moser'::text, 'lena_m'::text, 'salzburg'::text, 'park'::text,
            array['park','chill']::text[], true, true)$$,
  'sign-up metadata becomes a complete profile; unknown styles and duplicates are dropped'
);
select isnt((select birth_date from public.profiles where id = 'd0d0d0d0-0000-4000-8000-000000000001'),
  null, 'the birth date is stored');

-- A taken handle or bad values never block the account.
insert into auth.users (id, email, raw_user_meta_data)
values ('d0d0d0d0-0000-4000-8000-000000000002', 'clash@example.com', jsonb_build_object(
  'display_name', 'X',
  'handle', 'lena_m',
  'city', 'vienna',
  'riding_styles', 'park',
  'birth_date', 'not a date',
  'is_minor', false,
  'onboarding_completed', true
));

select results_eq(
  $$select display_name, handle, city, riding_styles, birth_date, onboarding_completed, is_minor
    from public.profiles where id = 'd0d0d0d0-0000-4000-8000-000000000002'$$,
  $$values (null::text, null::text, null::text, '{}'::text[], null::date, false, true)$$,
  'invalid metadata is left out and privileged fields are never taken from it'
);

-- Under 14 is not stored, an adult date clears is_minor.
insert into auth.users (id, email, raw_user_meta_data)
values
  ('d0d0d0d0-0000-4000-8000-000000000003', 'kid@example.com',
   jsonb_build_object('birth_date', ((now() at time zone 'Europe/Vienna')::date - interval '13 years')::date)),
  ('d0d0d0d0-0000-4000-8000-000000000004', 'adult@example.com',
   jsonb_build_object('birth_date', '1995-03-01'));

select is((select birth_date from public.profiles where id = 'd0d0d0d0-0000-4000-8000-000000000003'),
  null, 'an under-14 birth date from sign-up is not stored');
select is((select is_minor from public.profiles where id = 'd0d0d0d0-0000-4000-8000-000000000004'),
  false, 'an adult birth date from sign-up clears is_minor');

-- Metadata that is not an object, or reserved handles.
insert into auth.users (id, email, raw_user_meta_data)
values
  ('d0d0d0d0-0000-4000-8000-000000000005', 'array@example.com', '[1,2]'::jsonb),
  ('d0d0d0d0-0000-4000-8000-000000000006', 'reserved@example.com', '{"handle":"admin"}'::jsonb);
select is((select count(*)::int from public.profiles where id in
  ('d0d0d0d0-0000-4000-8000-000000000005', 'd0d0d0d0-0000-4000-8000-000000000006')), 2,
  'odd metadata still creates the account');
select is((select handle from public.profiles where id = 'd0d0d0d0-0000-4000-8000-000000000006'),
  null, 'a reserved handle is not taken from sign-up');

-- handle_available
set local role anon;
select is(public.handle_available('lena_m'), false, 'a taken handle is not available');
select is(public.handle_available('LENA_M '), false, 'case and spaces do not get around it');
select is(public.handle_available('admin'), false, 'reserved handles are not available');
select is(public.handle_available('pistl'), false, 'the app name is not available as a handle');
select is(public.handle_available('a!'), false, 'invalid handles are not available');
select is(public.handle_available('fresh_rider'), true, 'a free handle is available');
reset role;

-- Several riding styles from the profile form.
set local role authenticated;
set local request.jwt.claim.sub = 'd0d0d0d0-0000-4000-8000-000000000001';
update public.profiles set riding_styles = array['off-piste', 'chill'] where id = auth.uid();
select results_eq(
  $$select ability_level, riding_styles from public.profiles where id = auth.uid()$$,
  $$values ('off-piste'::text, array['off-piste','chill']::text[])$$,
  'the first style becomes the primary one'
);

-- An older client that only writes ability_level keeps both in step.
update public.profiles set ability_level = 'park' where id = auth.uid();
select results_eq(
  $$select ability_level, riding_styles from public.profiles where id = auth.uid()$$,
  $$values ('park'::text, array['park']::text[])$$,
  'writing only ability_level updates riding_styles'
);

select throws_ok(
  $$update public.profiles set riding_styles = array['ski-jumping'] where id = auth.uid()$$,
  '23514', null, 'unknown styles are refused'
);
update public.profiles set riding_styles = array['chill','park','off-piste','chill','park'] where id = auth.uid();
select is((select riding_styles from public.profiles where id = auth.uid()),
  array['chill','park','off-piste']::text[], 'repeated styles collapse to one each, in order');
reset role;

-- Existing single styles were carried over.
select is(
  (select count(*)::int from public.profiles where ability_level is not null and cardinality(riding_styles) = 0),
  0, 'every profile with a style has riding_styles'
);

select * from finish();
rollback;
