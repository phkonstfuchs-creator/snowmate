-- Waitlist of the public website (website/, see website/README.md).
--
-- Separate from the app's tables. Only the website's server, using the
-- service role, may call pistl_join_waitlist(); the tables are closed to
-- every client role. Rate limiting works on a pseudonymous HMAC of the
-- visitor IP; raw addresses are never stored.
create table public.pistl_website_waitlist (
  email text primary key check (email = lower(btrim(email)) and char_length(email) between 3 and 254),
  early_access boolean not null default false,
  early_access_consent_at timestamptz,
  consent_at timestamptz not null default now(),
  consent_version text not null default 'waitlist-v1-2026-10-04',
  created_at timestamptz not null default now()
);
create table public.pistl_website_rate_limits (
  rate_key text primary key check (rate_key ~ '^[a-f0-9]{64}$'),
  window_start timestamptz not null,
  attempts integer not null check (attempts > 0)
);

alter table public.pistl_website_waitlist enable row level security;
alter table public.pistl_website_waitlist force row level security;
alter table public.pistl_website_rate_limits enable row level security;
alter table public.pistl_website_rate_limits force row level security;
revoke all on public.pistl_website_waitlist from public, anon, authenticated;
revoke all on public.pistl_website_rate_limits from public, anon, authenticated;

create function public.pistl_join_waitlist(p_email text, p_early_access boolean, p_rate_key text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_count integer;
begin
  if p_email is null or p_email <> lower(btrim(p_email))
    or char_length(p_email) not between 3 and 254
    or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or p_early_access is null or p_rate_key is null
    or p_rate_key !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid input';
  end if;

  -- Atomic upsert serializes concurrent attempts for each pseudonymous IP digest.
  insert into public.pistl_website_rate_limits as limits (rate_key, window_start, attempts)
  values (p_rate_key, now(), 1)
  on conflict (rate_key) do update set
    window_start = case when limits.window_start <= now() - interval '1 hour' then now() else limits.window_start end,
    attempts = case when limits.window_start <= now() - interval '1 hour' then 1 else least(limits.attempts + 1, 1000000) end
  returning attempts into attempt_count;

  if attempt_count > 5 then return 'rate_limited'; end if;

  insert into public.pistl_website_waitlist as waiting (email, early_access, early_access_consent_at)
  values (p_email, p_early_access, case when p_early_access then now() else null end)
  on conflict (email) do update set
    early_access = waiting.early_access or excluded.early_access,
    early_access_consent_at = case
      when not waiting.early_access and excluded.early_access then now()
      else waiting.early_access_consent_at end;

  -- Bound retention of IP digests without storing raw network addresses.
  delete from public.pistl_website_rate_limits where window_start < now() - interval '24 hours';
  return 'accepted';
end;
$$;

revoke all on function public.pistl_join_waitlist(text, boolean, text) from public, anon, authenticated;
grant execute on function public.pistl_join_waitlist(text, boolean, text) to service_role;
