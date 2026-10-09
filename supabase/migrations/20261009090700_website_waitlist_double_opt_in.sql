-- Separate website interest list; this never creates an account or beta admission.
create table private.pistl_website_waitlist (
  email text primary key,
  pending_early_access boolean not null default false,
  early_access boolean not null default false,
  early_access_consent_at timestamptz,
  consent_at timestamptz,
  consent_version text not null default 'waitlist-v1-2026-10-04',
  requested_at timestamptz not null default statement_timestamp(),
  confirmed_at timestamptz,
  token_hash text unique,
  token_expires_at timestamptz,
  last_sent_at timestamptz,
  constraint website_waitlist_email_safe check (
    email=lower(btrim(email)) and char_length(email) between 3 and 254
    and char_length(split_part(email,'@',1))<=64
    and email ~ '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'
    and email not like '.%' and email not like '%..%' and email not like '%.@%'
  ),
  constraint website_waitlist_token_safe check (
    (token_hash is null and token_expires_at is null)
    or (token_hash is not null and token_hash ~ '^[a-f0-9]{64}$' and token_expires_at is not null)
  ),
  constraint website_waitlist_consent_state check (
    (confirmed_at is null and consent_at is null and not early_access and early_access_consent_at is null)
    or (confirmed_at is not null and consent_at is not null
      and (early_access=(early_access_consent_at is not null)))
  )
);
create table private.pistl_website_rate_limits (
  rate_key text primary key check(rate_key ~ '^[a-f0-9]{64}$'),
  window_start timestamptz not null,
  attempts integer not null check(attempts between 1 and 1000000)
);
create index website_waitlist_pending_requested on private.pistl_website_waitlist(requested_at)
  where confirmed_at is null;
alter table private.pistl_website_waitlist enable row level security;
alter table private.pistl_website_waitlist force row level security;
alter table private.pistl_website_rate_limits enable row level security;
alter table private.pistl_website_rate_limits force row level security;
revoke all on private.pistl_website_waitlist,private.pistl_website_rate_limits
  from public,anon,authenticated,service_role;

create function private.cleanup_website_waitlist(p_now timestamptz default statement_timestamp())
returns void language plpgsql volatile security definer set search_path='' as $$
begin
  if p_now is null then raise exception using errcode='22004',message='cleanup timestamp required'; end if;
  delete from private.pistl_website_waitlist
    where confirmed_at is null and requested_at<=p_now-interval '7 days';
  update private.pistl_website_waitlist set token_hash=null,token_expires_at=null
    where confirmed_at is not null and token_expires_at<=p_now;
  delete from private.pistl_website_rate_limits where window_start<=p_now-interval '24 hours';
end;
$$;
revoke all on function private.cleanup_website_waitlist(timestamptz)
  from public,anon,authenticated,service_role;

create function public.pistl_request_waitlist(
  p_email text,p_early_access boolean,p_rate_key text,p_token_hash text
) returns text language plpgsql volatile security definer set search_path='' as $$
declare
  v_now timestamptz:=statement_timestamp();
  v_attempts integer;
  v_waiting private.pistl_website_waitlist%rowtype;
begin
  if p_email is null or p_email<>lower(btrim(p_email))
    or char_length(p_email) not between 3 and 254
    or char_length(split_part(p_email,'@',1))>64
    or p_email !~ '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'
    or p_email like '.%' or p_email like '%..%' or p_email like '%.@%'
    or p_early_access is null or p_rate_key is null or p_rate_key !~ '^[a-f0-9]{64}$'
    or p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception using errcode='22023',message='invalid waitlist input';
  end if;
  -- Every attempt consumes the same atomic bucket, including wait/confirmed.
  insert into private.pistl_website_rate_limits as bucket(rate_key,window_start,attempts)
    values(p_rate_key,v_now,1)
    on conflict(rate_key) do update set
      window_start=case when bucket.window_start<=v_now-interval '1 hour' then v_now else bucket.window_start end,
      attempts=case when bucket.window_start<=v_now-interval '1 hour' then 1 else least(bucket.attempts+1,1000000) end
    returning attempts into v_attempts;
  if v_attempts>5 then return 'rate_limited'; end if;
  perform pg_advisory_xact_lock(hashtextextended('website-waitlist:'||p_email,0));
  select * into v_waiting from private.pistl_website_waitlist where email=p_email for update;
  if found then
    if v_waiting.confirmed_at is not null then return 'confirmed'; end if;
    -- No new request can rewrite the preference bound to an already sent token.
    if v_waiting.last_sent_at>v_now-interval '5 minutes' then return 'wait'; end if;
    update private.pistl_website_waitlist set pending_early_access=p_early_access,
      requested_at=v_now,token_hash=p_token_hash,token_expires_at=v_now+interval '7 days',last_sent_at=v_now
      where email=p_email;
  else
    insert into private.pistl_website_waitlist(email,pending_early_access,requested_at,token_hash,token_expires_at,last_sent_at)
      values(p_email,p_early_access,v_now,p_token_hash,v_now+interval '7 days',v_now);
  end if;
  return 'send';
end;
$$;

create function public.pistl_confirm_waitlist(p_token_hash text)
returns text language plpgsql volatile security definer set search_path='' as $$
declare
  v_now timestamptz:=statement_timestamp();
  v_waiting private.pistl_website_waitlist%rowtype;
begin
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then return 'invalid'; end if;
  select * into v_waiting from private.pistl_website_waitlist where token_hash=p_token_hash for update;
  if not found or v_waiting.token_expires_at<=v_now then return 'invalid'; end if;
  if v_waiting.confirmed_at is not null then return 'confirmed'; end if;
  update private.pistl_website_waitlist set confirmed_at=v_now,consent_at=v_now,
    early_access=pending_early_access,
    early_access_consent_at=case when pending_early_access then v_now else null end
    where email=v_waiting.email;
  return 'confirmed';
end;
$$;

create function public.pistl_release_waitlist_token(p_token_hash text)
returns void language plpgsql volatile security definer set search_path='' as $$
begin
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then return; end if;
  -- Late mail failure must not release a newer token or confirmed consent.
  update private.pistl_website_waitlist set token_hash=null,token_expires_at=null,last_sent_at=null
    where token_hash=p_token_hash and confirmed_at is null;
end;
$$;
revoke all on function public.pistl_request_waitlist(text,boolean,text,text),
  public.pistl_confirm_waitlist(text),public.pistl_release_waitlist_token(text)
  from public,anon,authenticated;
grant execute on function public.pistl_request_waitlist(text,boolean,text,text),
  public.pistl_confirm_waitlist(text),public.pistl_release_waitlist_token(text) to service_role;

select cron.schedule('pistl-website-waitlist-retention','37 2 * * *',
  'select private.cleanup_website_waitlist(statement_timestamp())');
