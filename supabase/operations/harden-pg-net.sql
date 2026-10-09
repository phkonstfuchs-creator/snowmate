-- pg_net can be installed by supabase_admin, while migrations run as postgres.
-- REVOKE by a role without ownership/grant option silently leaves client access.
-- Apply this operation as the pg_net owner (supabase_admin on hosted Supabase).
-- Fail closed instead of reporting a successful but ineffective operation.
do $$
declare
  net_owner name;
begin
  select pg_catalog.pg_get_userbyid(nspowner)
  into net_owner
  from pg_catalog.pg_namespace
  where nspname = 'net';

  if net_owner is null then
    raise exception 'pg_net schema is missing';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_roles
    where rolname = current_user and rolsuper
  ) and not pg_catalog.pg_has_role(current_user, net_owner, 'USAGE') then
    raise exception using
      errcode = '42501',
      message = 'pg_net hardening requires its schema owner or an administrator';
  end if;
end;
$$;

revoke all on schema net from public, anon, authenticated, service_role;
revoke all on all tables in schema net
  from public, anon, authenticated, service_role;
revoke all on all sequences in schema net
  from public, anon, authenticated, service_role;
revoke all on all functions in schema net
  from public, anon, authenticated, service_role;

-- Keep privileged scheduled workers operating through owner-controlled functions.
grant usage on schema net to postgres;
grant execute on all functions in schema net to postgres;
-- The migration administrator maintains extension fixtures and worker responses.
grant select, insert on net._http_response to postgres;

-- Revoke defaults of the actual extension owner, rather than only the runner.
do $$
declare
  net_owner name;
begin
  select pg_catalog.pg_get_userbyid(nspowner)
  into net_owner from pg_catalog.pg_namespace where nspname = 'net';
  execute format(
    'alter default privileges for role %I in schema net revoke all on tables from public, anon, authenticated, service_role',
    net_owner
  );
  execute format(
    'alter default privileges for role %I in schema net revoke all on sequences from public, anon, authenticated, service_role',
    net_owner
  );
  execute format(
    'alter default privileges for role %I in schema net revoke all on functions from public, anon, authenticated, service_role',
    net_owner
  );
end;
$$;

-- Verify effective privileges: warnings from an ineffective REVOKE are unsafe.
do $$
declare
  client_role name;
begin
  foreach client_role in array array['anon', 'authenticated', 'service_role']::name[] loop
    if pg_catalog.has_schema_privilege(client_role, 'net', 'USAGE')
      or exists (
        select 1 from pg_catalog.pg_class as object
        join pg_catalog.pg_namespace as namespace on namespace.oid = object.relnamespace
        where namespace.nspname = 'net'
          and object.relkind in ('r', 'p', 'v', 'm', 'f')
          and pg_catalog.has_table_privilege(client_role, object.oid, 'SELECT')
      )
      or exists (
        select 1 from pg_catalog.pg_proc as object
        join pg_catalog.pg_namespace as namespace on namespace.oid = object.pronamespace
        where namespace.nspname = 'net'
          and pg_catalog.has_function_privilege(client_role, object.oid, 'EXECUTE')
      )
    then
      raise exception using
        errcode = '42501',
        message = 'pg_net hardening left client privileges; apply as extension owner';
    end if;
  end loop;
end;
$$;
