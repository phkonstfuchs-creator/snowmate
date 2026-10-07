-- Security audit fixes: stale media paths, push endpoint ownership,
-- post-queue blocking and immediate Auth session revocation at the Data API.

-- A friend sees only the avatar currently named by the owner's profile.
-- The owner can still read a newly uploaded file before saving avatar_path.
drop policy "avatars_read_by_audience" on storage.objects;
create policy "avatars_read_by_audience"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'avatars'
    and case
      when (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then (storage.foldername(name))[1] = (select auth.uid())::text
        or public.avatar_path_for(((storage.foldername(name))[1])::uuid) = name
      else false
    end
  );

-- An owner's unsubmitted photo remains manageable by them, but a friend
-- cannot fetch an upload unless a currently visible post references it.
create or replace function public.can_see_post_photo(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (storage.foldername(object_name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then (storage.foldername(object_name))[1] = auth.uid()::text
      or exists (
        select 1 from public.posts p
        where p.photo_path = object_name
          and private.can_see_posts_of(p.author_id, auth.uid())
      )
    else false
  end;
$$;
revoke all on function public.can_see_post_photo(text) from public, anon;
grant execute on function public.can_see_post_photo(text) to authenticated;

-- An endpoint is a bearer capability for a browser device. A different
-- account cannot silently replace its owner or encryption keys.
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  saved_endpoint text;
begin
  if me is null then
    return 'unauthenticated';
  end if;

  begin
    insert into public.push_subscriptions as existing (endpoint, user_id, p256dh, auth)
    values (p_endpoint, me, p_p256dh, p_auth)
    on conflict (endpoint) do update
      set p256dh = excluded.p256dh, auth = excluded.auth, created_at = now()
      where existing.user_id = me
    returning endpoint into saved_endpoint;
  exception when check_violation or not_null_violation then
    return 'invalid';
  end;

  if saved_endpoint is null then
    return 'invalid';
  end if;

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

-- Recheck every queued notice at delivery, including messages and ride
-- events. A block after queueing must cancel the notice for either side.
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

-- A protocol-relative target could open an external site from a push. Every
-- queue writer currently uses a fixed path, and the constraint enforces it.
alter table private.push_outbox drop constraint push_outbox_url_shape;
alter table private.push_outbox add constraint push_outbox_url_shape
  check (url ~ '^/[A-Za-z0-9/_-]{0,120}$' and url !~ '^//');

-- Storage metadata does not cascade through auth.users. Refuse to erase an
-- account while any file remains in its folder; the server removes Storage
-- files through the Storage API first, then calls this RPC. This prevents a
-- direct RPC call or partial Storage failure from orphaning private blobs.
create or replace function public.delete_my_account()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if exists (
    select 1 from storage.objects o where o.name like me::text || '/%'
  ) then
    return false;
  end if;

  delete from auth.users u where u.id = me;
  return found;
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- used_by is nulled when the first guest deletes their account. used_at is
-- the durable evidence that an invite has already been consumed.
create or replace function private.invite_status(invite public.friend_invites, viewer uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when invite.token is null then 'not_found'
    when invite.inviter_id = viewer then 'self'
    when private.is_blocked(viewer, invite.inviter_id) then 'not_found'
    when invite.used_at is not null or invite.used_by is not null then 'used'
    when invite.expires_at <= now() then 'expired'
    when private.are_friends(viewer, invite.inviter_id) then 'already_friends'
    else 'valid'
  end;
$$;
revoke all on function private.invite_status(public.friend_invites, uuid) from public, anon, authenticated;

create or replace function public.create_friend_invite()
returns table (status text, token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  new_token text := replace(gen_random_uuid()::text, '-', '');
  new_expiry timestamptz;
begin
  if me is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if not private.has_complete_profile(me) then
    return query select 'profile_incomplete'::text, null::text, null::timestamptz;
    return;
  end if;

  if (
    select count(*) from public.friend_invites fi
    where fi.inviter_id = me and fi.used_at is null and fi.used_by is null and fi.expires_at > now()
  ) >= 10 then
    return query select 'too_many'::text, null::text, null::timestamptz;
    return;
  end if;

  insert into public.friend_invites (token, inviter_id)
  values (new_token, me)
  returning friend_invites.expires_at into new_expiry;

  return query select 'created'::text, new_token, new_expiry;
end;
$$;
revoke all on function public.create_friend_invite() from public, anon;
grant execute on function public.create_friend_invite() to authenticated;

-- Supabase access JWTs remain cryptographically valid until expiry after
-- sign-out. Auth puts session_id in every user access token and removes the
-- corresponding auth.sessions row on sign-out. Reject a revoked session in
-- the pre-request guard. A missing sessions table also fails closed.
create or replace function public.check_request()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  writing boolean :=
    coalesce(current_setting('request.method', true), 'POST') not in ('GET', 'HEAD')
    and current_setting('transaction_read_only') = 'off';
  session_text text;
  recent integer;
begin
  if me is null then
    return;
  end if;

  if claims ->> 'role' = 'authenticated' then
    session_text := claims ->> 'session_id';
    if to_regclass('auth.sessions') is null then
      raise sqlstate 'PGRST' using
        message = json_build_object('code', 'session_expired', 'message', 'Session expired')::text,
        detail = json_build_object('status', 401, 'headers', json_build_object())::text;
    end if;
    if session_text is null
       or session_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or not exists (
         select 1 from auth.sessions s
         where s.id = session_text::uuid and s.user_id = me
       ) then
      raise sqlstate 'PGRST' using
        message = json_build_object('code', 'session_expired', 'message', 'Session expired')::text,
        detail = json_build_object('status', 401, 'headers', json_build_object())::text;
    end if;
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
grant execute on function public.check_request() to anon, authenticated, service_role;

-- Constrain newly posted and explicitly rescheduled ride dates. Existing
-- posts age naturally and can still be updated in unrelated fields.
create or replace function private.check_post_ride_date()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.ride_date < private.local_today()
     or new.ride_date > private.local_today() + 365 then
    raise exception 'ride_date outside allowed window' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.check_post_ride_date() from public, anon, authenticated;
create trigger rides_date_window before insert or update of ride_date on public.rides
  for each row execute function private.check_post_ride_date();
create trigger carpools_date_window before insert or update of ride_date on public.carpools
  for each row execute function private.check_post_ride_date();
