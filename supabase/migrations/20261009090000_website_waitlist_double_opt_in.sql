-- Double opt-in for the website waitlist (ADR 0018).
--
-- A signup is stored as pending and the website emails a confirmation
-- link. Only a confirmed address is on the waitlist; unconfirmed signups
-- are deleted after seven days. The raw link token is never stored, only
-- its SHA-256 digest, so a database leak cannot confirm anyone.
--
-- Existing rows were stored without a confirmation and stay unconfirmed;
-- the seven-day clean-up removes them like any other unconfirmed signup.

alter table public.pistl_website_waitlist
  add column confirmed_at timestamptz,
  add column confirm_token_hash text check (confirm_token_hash ~ '^[a-f0-9]{64}$'),
  add column confirm_sent_at timestamptz;

create unique index pistl_website_waitlist_token_idx
  on public.pistl_website_waitlist (confirm_token_hash)
  where confirm_token_hash is not null;

drop function public.pistl_join_waitlist(text, boolean, text);

-- Returns 'send' (email the link for p_token_hash), 'wait' (a link went
-- out a moment ago), 'confirmed' (already on the list, nothing to send)
-- or 'rate_limited'. The website answers all but the last the same way,
-- so the form does not reveal who is on the list.
create function public.pistl_request_waitlist(
  p_email text,
  p_early_access boolean,
  p_rate_key text,
  p_token_hash text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_count integer;
  existing public.pistl_website_waitlist%rowtype;
begin
  if p_email is null or p_email <> lower(btrim(p_email))
    or char_length(p_email) not between 3 and 254
    or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or p_early_access is null
    or p_rate_key is null or p_rate_key !~ '^[a-f0-9]{64}$'
    or p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then
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

  -- Bounded retention: IP digests after a day, unconfirmed signups after a week.
  delete from public.pistl_website_rate_limits where window_start < now() - interval '24 hours';
  delete from public.pistl_website_waitlist
  where confirmed_at is null and coalesce(confirm_sent_at, created_at) < now() - interval '7 days';

  select * into existing from public.pistl_website_waitlist where email = p_email for update;

  if not found then
    insert into public.pistl_website_waitlist
      (email, early_access, early_access_consent_at, consent_version, confirm_token_hash, confirm_sent_at)
    values
      (p_email, p_early_access, case when p_early_access then now() end, 'waitlist-v2-2026-10-05', p_token_hash, now());
    return 'send';
  end if;

  -- Confirmed addresses are not changed from the open form; a stranger
  -- could otherwise alter someone else's choices.
  if existing.confirmed_at is not null then
    return 'confirmed';
  end if;

  -- One email per address every five minutes, whoever asks.
  if existing.confirm_sent_at > now() - interval '5 minutes' then
    return 'wait';
  end if;

  update public.pistl_website_waitlist set
    early_access = p_early_access,
    early_access_consent_at = case when p_early_access then now() end,
    consent_at = now(),
    consent_version = 'waitlist-v2-2026-10-05',
    confirm_token_hash = p_token_hash,
    confirm_sent_at = now()
  where email = p_email;
  return 'send';
end;
$$;

-- When the email could not be sent, the next attempt may send at once.
create function public.pistl_release_waitlist_token(p_token_hash text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.pistl_website_waitlist
  set confirm_token_hash = null, confirm_sent_at = null
  where confirm_token_hash = p_token_hash and confirmed_at is null;
$$;

-- Returns 'confirmed' or 'invalid' (unknown, used or older than seven days).
create function public.pistl_confirm_waitlist(p_token_hash text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then
    return 'invalid';
  end if;

  update public.pistl_website_waitlist
  set confirmed_at = now(), confirm_token_hash = null
  where confirm_token_hash = p_token_hash
    and confirmed_at is null
    and confirm_sent_at > now() - interval '7 days';

  return case when found then 'confirmed' else 'invalid' end;
end;
$$;

revoke all on function public.pistl_request_waitlist(text, boolean, text, text) from public, anon, authenticated;
revoke all on function public.pistl_release_waitlist_token(text) from public, anon, authenticated;
revoke all on function public.pistl_confirm_waitlist(text) from public, anon, authenticated;
grant execute on function public.pistl_request_waitlist(text, boolean, text, text) to service_role;
grant execute on function public.pistl_release_waitlist_token(text) to service_role;
grant execute on function public.pistl_confirm_waitlist(text) to service_role;
