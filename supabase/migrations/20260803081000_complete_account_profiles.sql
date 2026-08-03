select private.backfill_profiles_for_auth_users();

alter table public.profiles
  add constraint profiles_display_name_safe check (
    display_name is null
    or (
      display_name !~ '[[:cntrl:]]'
      and display_name !~ U&'[\202A-\202E\2066-\2069]'
    )
  );

alter table public.profiles
  add constraint profiles_handle_not_reserved check (
    handle is null
    or handle not in ('admin', 'support', 'snowmate')
  );

create or replace function private.mark_profile_complete_when_ready()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if
    new.display_name is not null
    and new.handle is not null
    and new.city is not null
    and new.ability_level is not null
  then
    new.onboarding_completed = true;
  end if;

  return new;
end;
$$;

revoke all on function private.mark_profile_complete_when_ready() from public;
revoke all on function private.mark_profile_complete_when_ready() from anon;
revoke all on function private.mark_profile_complete_when_ready() from authenticated;

create trigger profiles_mark_complete_when_ready
  before update on public.profiles
  for each row
  execute function private.mark_profile_complete_when_ready();

create or replace function public.complete_own_profile(
  p_display_name text,
  p_handle text,
  p_city text,
  p_ability_level text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  updated_rows integer;
begin
  if
    p_display_name is null
    or p_handle is null
    or p_city is null
    or p_ability_level is null
  then
    raise exception using
      errcode = '23514',
      message = 'profile completion fields must not be null';
  end if;

  update public.profiles
  set
    display_name = btrim(p_display_name),
    handle = lower(btrim(p_handle)),
    city = p_city,
    ability_level = p_ability_level
  where id = (select auth.uid());

  get diagnostics updated_rows = row_count;
  return updated_rows = 1;
end;
$$;

comment on function public.complete_own_profile(text, text, text, text) is
  'Atomically completes only the authenticated account profile under RLS.';

revoke all on function public.complete_own_profile(text, text, text, text) from public;
revoke all on function public.complete_own_profile(text, text, text, text) from anon;
grant execute on function public.complete_own_profile(text, text, text, text) to authenticated;
