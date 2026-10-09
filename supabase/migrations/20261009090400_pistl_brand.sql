-- Preserve historical migrations and existing infrastructure contracts.
-- Existing handles are retained; new writes cannot impersonate the Pistl brand.
alter table public.profiles
  drop constraint profiles_handle_not_reserved;
alter table public.profiles
  add constraint profiles_handle_not_reserved check (
    handle is null
    or handle not in ('admin', 'support', 'snowmate', 'pistl')
  ) not valid;

-- Refresh only the visible fallback text, keeping signatures and permissions.
do $$
declare
  definition text;
begin
  for definition in
    select pg_catalog.pg_get_functiondef(p.oid)
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private')
      and p.prokind = 'f'
      and p.prosrc like '%Snowmate user%'
  loop
    execute replace(definition, 'Snowmate user', 'Pistl user');
  end loop;
end;
$$;
