-- Bind Web Push consent to an active Auth session. Existing subscriptions
-- intentionally have no session and cease receiving notifications.
alter table public.push_subscriptions add column session_id uuid;
create index push_subscriptions_session on public.push_subscriptions (session_id);

create or replace function private.active_request_session(request_user uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  candidate text := claims ->> 'session_id';
begin
  if request_user is null or claims ->> 'role' is distinct from 'authenticated'
     or candidate is null
     or candidate !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     or to_regclass('auth.sessions') is null then
    return null;
  end if;

  if exists (select 1 from auth.sessions s
             where s.id = candidate::uuid and s.user_id = request_user) then
    return candidate::uuid;
  end if;
  return null;
end;
$$;
revoke all on function private.active_request_session(uuid) from public, anon, authenticated;

create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  active_session uuid;
  saved_endpoint text;
begin
  if me is null then return 'unauthenticated'; end if;
  active_session := private.active_request_session(me);
  if active_session is null then return 'invalid'; end if;

  begin
    insert into public.push_subscriptions as existing
      (endpoint, user_id, p256dh, auth, session_id)
    values (p_endpoint, me, p_p256dh, p_auth, active_session)
    on conflict (endpoint) do update
      set p256dh = excluded.p256dh, auth = excluded.auth,
          session_id = excluded.session_id, created_at = now()
      where existing.user_id = me
    returning endpoint into saved_endpoint;
  exception when check_violation or not_null_violation then
    return 'invalid';
  end;

  if saved_endpoint is null then return 'invalid'; end if;
  delete from public.push_subscriptions s
  where s.user_id = me
    and s.endpoint not in (
      select k.endpoint from public.push_subscriptions k
      where k.user_id = me order by k.created_at desc limit 10
    );
  return 'saved';
end;
$$;
revoke all on function public.save_push_subscription(text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;

create or replace function public.is_my_push_subscription(p_endpoint text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.push_subscriptions s
    where s.endpoint = p_endpoint and s.user_id = auth.uid()
      and s.session_id = private.active_request_session(auth.uid())
  );
$$;
revoke all on function public.is_my_push_subscription(text) from public, anon;
grant execute on function public.is_my_push_subscription(text) to authenticated;

create or replace function public.push_take_outbox()
returns table (endpoint text, p256dh text, auth text, kind text, actor_name text, url text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from private.push_outbox o where o.created_at < now() - interval '1 hour';

  return query
  with taken as (
    delete from private.push_outbox o
    where o.id in (select q.id from private.push_outbox q order by q.id limit 200 for update skip locked)
    returning o.recipient_id, o.actor_id, o.kind, o.url
  )
  select s.endpoint, s.p256dh, s.auth, t.kind,
         coalesce(a.display_name, '@' || a.handle), t.url
  from taken t
  join public.push_subscriptions s on s.user_id = t.recipient_id
  join auth.sessions session on session.id = s.session_id and session.user_id = s.user_id
  left join public.profiles a on a.id = t.actor_id
  where (t.actor_id is null or not private.is_blocked(t.recipient_id, t.actor_id))
    and (t.kind <> 'lift_meetup' or exists (
      select 1 from public.lift_meetups m
      where m.user_id = t.actor_id
        and m.expires_at > now()
        and private.may_share_location(m.user_id)
        and private.are_friends(t.recipient_id, m.user_id)
    ));
end;
$$;
revoke all on function public.push_take_outbox() from public, anon, authenticated;
grant execute on function public.push_take_outbox() to service_role;

-- Storage requests bypass PostgREST's pre-request hook. Enforce the same
-- session revocation and MFA boundary in RLS for private media buckets.
create or replace function public.storage_request_authorized()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
begin
  if me is null then return false; end if;
  if private.has_verified_mfa(me)
     and coalesce(claims ->> 'aal', 'aal1') <> 'aal2' then
    return false;
  end if;
  return private.active_request_session(me) is not null;
end;
$$;
revoke all on function public.storage_request_authorized() from public, anon;
grant execute on function public.storage_request_authorized() to authenticated;

create policy "private_media_session_and_mfa"
  on storage.objects as restrictive for all to authenticated
  using (bucket_id not in ('avatars', 'post-photos')
    or public.storage_request_authorized())
  with check (bucket_id not in ('avatars', 'post-photos')
    or public.storage_request_authorized());
