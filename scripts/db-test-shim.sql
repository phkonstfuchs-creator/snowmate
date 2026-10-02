-- Minimal stand-in for the parts of Supabase the migrations and pgTAP
-- tests rely on: the API roles, auth.users and auth.uid(). Used by
-- scripts/test-db-local.sh when Docker (and so `supabase start`) is not
-- available. It is not a replacement for `npm run test:db` in CI.

do $$ begin
  if not exists (select from pg_roles where rolname='anon') then create role anon nologin noinherit; end if;
  if not exists (select from pg_roles where rolname='authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select from pg_roles where rolname='service_role') then create role service_role nologin noinherit bypassrls; end if;
end $$;
create schema extensions;
grant usage on schema extensions to anon, authenticated, service_role;
create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(coalesce(current_setting('request.jwt.claim.sub', true),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')), '')::uuid
$$;
grant execute on function auth.uid() to anon, authenticated, service_role;
alter database :"dbname" set search_path = "$user", public, extensions;
