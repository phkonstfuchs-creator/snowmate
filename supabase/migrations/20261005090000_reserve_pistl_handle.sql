-- The app is renamed to Pistl. "@pistl" is reserved like "@snowmate", so
-- nobody can pose as the official account.
--
-- NOT VALID: should someone already hold the handle, their row stays;
-- every new or changed handle is checked.

alter table public.profiles drop constraint profiles_handle_not_reserved;

alter table public.profiles
  add constraint profiles_handle_not_reserved check (
    handle is null
    or handle not in ('admin', 'support', 'snowmate', 'pistl')
  ) not valid;

create or replace function public.handle_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select lower(btrim(candidate)) ~ '^[a-z0-9_]{3,20}$'
    and lower(btrim(candidate)) not in ('admin', 'support', 'snowmate', 'pistl')
    and not exists (
      select 1 from public.profiles p where p.handle = lower(btrim(candidate))
    );
$$;

revoke all on function public.handle_available(text) from public;
grant execute on function public.handle_available(text) to anon, authenticated;
