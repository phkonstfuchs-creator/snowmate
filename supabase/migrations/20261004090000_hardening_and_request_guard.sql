-- Security hardening (ADR 0013).
--
-- 1. A guard that runs before every Data API request (PostgREST
--    db_pre_request):
--    * Two-factor: an account with a verified TOTP factor must present an
--      aal2 session. A stolen password alone then reaches nothing, even
--      when someone calls the API directly instead of using the app.
--    * Rate limit: at most 300 writing requests a minute per signed-in
--      account. Reads (GET) run in read-only transactions and are not
--      counted. Anonymous requests are not counted here: they all arrive
--      from the app server, so an IP limit would throttle everyone at
--      once. The app limits sign-in and sign-up per visitor instead.
-- 2. Free text may not carry control characters or bidi overrides, which
--    can disguise text. NOT VALID: existing rows are left alone, every new
--    write is checked.
-- 3. A Supabase-created event trigger function was executable by anyone.

-- ── 1. Request guard ────────────────────────────────────────────────

create table private.request_log (
  user_id uuid not null,
  requested_at timestamptz not null default now()
);

create index request_log_user_time on private.request_log (user_id, requested_at);

alter table private.request_log enable row level security;
alter table private.request_log force row level security;
revoke all on table private.request_log from public, anon, authenticated;

create or replace function private.has_verified_mfa(account uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  -- auth.mfa_factors exists on every Supabase project; the guard keeps
  -- plain Postgres test databases working.
  if to_regclass('auth.mfa_factors') is null then
    return false;
  end if;

  return exists (
    select 1 from auth.mfa_factors f
    where f.user_id = account and f.status::text = 'verified'
  );
end;
$$;

revoke all on function private.has_verified_mfa(uuid) from public, anon, authenticated;

create or replace function public.check_request()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  writing boolean := coalesce(current_setting('request.method', true), 'POST') not in ('GET', 'HEAD');
  recent integer;
begin
  if me is null then
    return;
  end if;

  if coalesce(claims ->> 'aal', 'aal1') <> 'aal2' and private.has_verified_mfa(me) then
    raise sqlstate 'PGRST' using
      message = json_build_object('code', 'mfa_required', 'message', 'Two-factor verification required')::text,
      detail = json_build_object('status', 401, 'headers', json_build_object())::text;
  end if;

  if not writing then
    return;
  end if;

  select count(*) into recent
  from private.request_log l
  where l.user_id = me and l.requested_at > now() - interval '1 minute';

  if recent >= 300 then
    raise sqlstate 'PGRST' using
      message = json_build_object('code', 'rate_limited', 'message', 'Too many requests, slow down')::text,
      detail = json_build_object('status', 429, 'headers', json_build_object('Retry-After', '60'))::text;
  end if;

  delete from private.request_log l
  where l.user_id = me and l.requested_at < now() - interval '2 minutes';

  insert into private.request_log (user_id) values (me);
end;
$$;

revoke all on function public.check_request() from public;
grant execute on function public.check_request() to anon, authenticated;

do $$
begin
  if exists (select from pg_roles where rolname = 'authenticator') then
    alter role authenticator set pgrst.db_pre_request = 'public.check_request';
    notify pgrst, 'reload config';
  end if;
end;
$$;

-- ── 2. Safe free text ───────────────────────────────────────────────
-- Newlines and tabs stay allowed in longer texts; everything else below
-- 0x20, DEL and the bidi override/isolate characters do not.

alter table public.profiles
  add constraint profiles_bio_safe check (
    bio is null or bio !~ '[\x01-\x08\x0b\x0c\x0e-\x1f\x7f‪-‮⁦-⁩]'
  ) not valid;

alter table public.rides
  add constraint rides_text_safe check (
    resort !~ '[\x01-\x1f\x7f‪-‮⁦-⁩]'
    and meet_point !~ '[\x01-\x1f\x7f‪-‮⁦-⁩]'
    and (title is null or title !~ '[\x01-\x1f\x7f‪-‮⁦-⁩]')
    and (caption is null or caption !~ '[\x01-\x08\x0b\x0c\x0e-\x1f\x7f‪-‮⁦-⁩]')
  ) not valid;

alter table public.carpools
  add constraint carpools_text_safe check (
    resort !~ '[\x01-\x1f\x7f‪-‮⁦-⁩]'
    and departure_point !~ '[\x01-\x1f\x7f‪-‮⁦-⁩]'
    and (note is null or note !~ '[\x01-\x08\x0b\x0c\x0e-\x1f\x7f‪-‮⁦-⁩]')
  ) not valid;

alter table public.reports
  add constraint reports_details_safe check (
    details is null or details !~ '[\x01-\x08\x0b\x0c\x0e-\x1f\x7f‪-‮⁦-⁩]'
  ) not valid;

-- ── 3. Supabase helper exposed to the API ───────────────────────────

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;
