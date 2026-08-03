create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  handle text,
  city text,
  ability_level text,
  avatar_path text,
  bio text,
  is_minor boolean not null default true,
  account_type text not null default 'standard',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_display_name_format check (
    display_name is null
    or (
      display_name = btrim(display_name)
      and char_length(display_name) between 2 and 50
    )
  ),
  constraint profiles_handle_format check (
    handle is null or handle ~ '^[a-z0-9_]{3,20}$'
  ),
  constraint profiles_city_value check (
    city is null or city in ('innsbruck', 'salzburg')
  ),
  constraint profiles_ability_level_value check (
    ability_level is null
    or ability_level in ('chill', 'park', 'off-piste')
  ),
  constraint profiles_avatar_path_format check (
    avatar_path is null
    or (
      char_length(avatar_path) <= 255
      and avatar_path like id::text || '/%'
      and avatar_path !~ '(\.\.|://|\\)'
    )
  ),
  constraint profiles_bio_length check (
    bio is null or char_length(bio) <= 300
  ),
  constraint profiles_account_type_value check (
    account_type in ('standard', 'verified', 'guide')
  ),
  constraint profiles_completed_fields check (
    not onboarding_completed
    or (
      display_name is not null
      and handle is not null
      and city is not null
      and ability_level is not null
    )
  )
);

create unique index profiles_handle_unique
  on public.profiles (handle)
  where handle is not null;

comment on table public.profiles is
  'Private account profile shell. Cross-user discovery is intentionally deferred.';
comment on column public.profiles.is_minor is
  'Server-controlled and safely true until a dedicated age verification flow changes it.';

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

revoke all on table public.profiles from public;
revoke all on table public.profiles from anon;
revoke all on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;
grant update (
  display_name,
  handle,
  city,
  ability_level,
  avatar_path,
  bio
) on table public.profiles to authenticated;

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = statement_timestamp();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public;
revoke all on function private.set_updated_at() from anon;
revoke all on function private.set_updated_at() from authenticated;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function private.set_updated_at();

create or replace function private.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function private.create_profile_for_auth_user() from public;
revoke all on function private.create_profile_for_auth_user() from anon;
revoke all on function private.create_profile_for_auth_user() from authenticated;

create trigger snowmate_create_profile_after_auth_user_insert
  after insert on auth.users
  for each row
  execute function private.create_profile_for_auth_user();

create or replace function private.backfill_profiles_for_auth_users()
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  inserted_count bigint;
begin
  insert into public.profiles (id)
  select id
  from auth.users
  on conflict (id) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function private.backfill_profiles_for_auth_users() from public;
revoke all on function private.backfill_profiles_for_auth_users() from anon;
revoke all on function private.backfill_profiles_for_auth_users() from authenticated;

select private.backfill_profiles_for_auth_users();
