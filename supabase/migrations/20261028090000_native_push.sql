-- Native push for the store apps (ADR 0025, ADR 0031). iOS hands the app
-- an APNs device token; it is stored like a web subscription: bound to the
-- session that registered it, never readable by clients, at most 10 per
-- account, gone when that session ends. The dispatcher now takes web and
-- native targets from the same outbox in one pass.

create table public.native_push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null,
  session_id uuid not null,
  created_at timestamptz not null default now(),

  -- APNs device tokens are hex; Android (FCM) is not supported yet.
  constraint native_push_tokens_platform check (platform = 'ios'),
  constraint native_push_tokens_token_shape check (token ~ '^[0-9a-f]{64,200}$')
);

create index native_push_tokens_user on public.native_push_tokens (user_id, created_at desc);
create index native_push_tokens_session on public.native_push_tokens (session_id);

alter table public.native_push_tokens enable row level security;
alter table public.native_push_tokens force row level security;
revoke all on table public.native_push_tokens from public, anon, authenticated;

create or replace function public.save_native_push_token(p_token text, p_platform text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  active_session uuid;
  saved_token text;
  normalized text := lower(p_token);
begin
  if me is null then return 'unauthenticated'; end if;
  active_session := private.active_request_session(me);
  if active_session is null then return 'invalid'; end if;

  begin
    insert into public.native_push_tokens as existing (token, user_id, platform, session_id)
    values (normalized, me, p_platform, active_session)
    on conflict (token) do update
      set user_id = excluded.user_id, platform = excluded.platform,
          session_id = excluded.session_id, created_at = now()
      -- Another account keeps a device only while its session is alive;
      -- after that sign-out or expiry, the next account may take it over.
      where existing.user_id = me
         or not exists (select 1 from auth.sessions old_session
                        where old_session.id = existing.session_id
                          and old_session.user_id = existing.user_id)
    returning token into saved_token;
  exception when check_violation or not_null_violation then
    return 'invalid';
  end;

  if saved_token is null then return 'invalid'; end if;
  delete from public.native_push_tokens n
  where n.user_id = me
    and n.token not in (
      select k.token from public.native_push_tokens k
      where k.user_id = me order by k.created_at desc limit 10
    );
  return 'saved';
end;
$$;
revoke all on function public.save_native_push_token(text, text) from public, anon;
grant execute on function public.save_native_push_token(text, text) to authenticated;

create or replace function public.delete_native_push_token(p_token text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with gone as (
    delete from public.native_push_tokens n
    where n.token = lower(p_token) and n.user_id = auth.uid()
    returning 1
  )
  select exists (select 1 from gone);
$$;
revoke all on function public.delete_native_push_token(text) from public, anon;
grant execute on function public.delete_native_push_token(text) to authenticated;

-- Settings show "on" only for this account's current session, never
-- because another account once registered the same phone.
create or replace function public.is_my_native_push_token(p_token text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.native_push_tokens n
    where n.token = lower(p_token) and n.user_id = auth.uid()
      and n.session_id = private.active_request_session(auth.uid())
  );
$$;
revoke all on function public.is_my_native_push_token(text) from public, anon;
grant execute on function public.is_my_native_push_token(text) to authenticated;

create or replace function public.push_forget_native_token(p_token text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.native_push_tokens n where n.token = lower(p_token);
$$;
revoke all on function public.push_forget_native_token(text) from public, anon, authenticated;
grant execute on function public.push_forget_native_token(text) to service_role;

-- The outbox now returns a channel per target. Changing a function's
-- result columns needs drop and create.
drop function public.push_take_session_outbox(uuid, uuid);
drop function public.push_take_outbox();
drop function private.take_push_outbox(uuid, uuid, boolean);

create function private.take_push_outbox(
  p_actor_id uuid, p_session_id uuid, p_scoped boolean
)
returns table (channel text, endpoint text, p256dh text, auth text, kind text, actor_name text, url text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_scoped then
    if p_actor_id is null or p_session_id is null
       or to_regclass('auth.sessions') is null then
      return;
    end if;
    if not exists (
      select 1 from auth.sessions source_session
      where source_session.id = p_session_id
        and source_session.user_id = p_actor_id
    ) then
      return;
    end if;
  end if;

  delete from private.push_outbox o
  where o.created_at < now() - interval '1 hour'
    and (not p_scoped or o.actor_id = p_actor_id);

  return query
  with taken as (
    delete from private.push_outbox o
    where o.id in (
      select q.id from private.push_outbox q
      where not p_scoped or q.actor_id = p_actor_id
      order by q.id limit 100 for update skip locked
    )
    returning o.recipient_id, o.actor_id, o.kind, o.url
  ),
  allowed as (
    select t.recipient_id, t.kind, t.url,
           coalesce(a.display_name, '@' || a.handle) as actor_name
    from taken t
    left join public.profiles a on a.id = t.actor_id
    where (t.actor_id is null or not private.is_blocked(t.recipient_id, t.actor_id))
      and (t.kind <> 'lift_meetup' or exists (
        select 1 from public.lift_meetups m
        where m.user_id = t.actor_id
          and m.expires_at > now()
          and private.may_share_location(m.user_id)
          and private.are_friends(t.recipient_id, m.user_id)
      ))
  ),
  targets as (
    select 'web'::text as channel, s.endpoint, s.p256dh, s.auth, al.kind, al.actor_name, al.url
    from allowed al
    join public.push_subscriptions s on s.user_id = al.recipient_id
    join auth.sessions recipient_session
      on recipient_session.id = s.session_id and recipient_session.user_id = s.user_id
    union all
    select n.platform, n.token, null::text, null::text, al.kind, al.actor_name, al.url
    from allowed al
    join public.native_push_tokens n on n.user_id = al.recipient_id
    join auth.sessions recipient_session
      on recipient_session.id = n.session_id and recipient_session.user_id = n.user_id
  )
  select * from targets
  limit 1000;
end;
$$;
revoke all on function private.take_push_outbox(uuid, uuid, boolean)
  from public, anon, authenticated;

create function public.push_take_outbox()
returns table (channel text, endpoint text, p256dh text, auth text, kind text, actor_name text, url text)
language sql
security definer
set search_path = ''
as $$
  select * from private.take_push_outbox(null, null, false);
$$;
revoke all on function public.push_take_outbox() from public, anon, authenticated;
grant execute on function public.push_take_outbox() to service_role;

create function public.push_take_session_outbox(p_actor_id uuid, p_session_id uuid)
returns table (channel text, endpoint text, p256dh text, auth text, kind text, actor_name text, url text)
language sql
security definer
set search_path = ''
as $$
  select * from private.take_push_outbox(p_actor_id, p_session_id, true);
$$;
revoke all on function public.push_take_session_outbox(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.push_take_session_outbox(uuid, uuid) to service_role;

-- The export lists native devices too (based on 20261026090000).
create or replace function public.export_my_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'exported_at', now(),
    'account', (
      select jsonb_build_object('id', u.id, 'email', u.email, 'created_at', u.created_at)
      from auth.users u where u.id = me
    ),
    'profile', (
      select to_jsonb(p) - 'id' from public.profiles p where p.id = me
    ),
    'lift_meetup', (
      select jsonb_build_object(
        'resort', m.resort, 'lift_id', m.lift_id,
        'started_at', m.started_at, 'arrival_at', m.arrival_at, 'expires_at', m.expires_at
      )
      from public.lift_meetups m where m.user_id = me
    ),
    'live_location', (
      select jsonb_build_object('lat', l.lat, 'lng', l.lng, 'accuracy_m', l.accuracy_m,
                                'updated_at', l.updated_at, 'expires_at', l.expires_at)
      from public.live_locations l where l.user_id = me
    ),
    'friendships', coalesce((
      select jsonb_agg(jsonb_build_object(
        'handle', other.handle,
        'status', f.status,
        'direction', case when f.requester_id = me then 'outgoing' else 'incoming' end,
        'created_at', f.created_at,
        'responded_at', f.responded_at
      ) order by f.created_at)
      from public.friendships f
      join public.profiles other
        on other.id = case when f.requester_id = me then f.addressee_id else f.requester_id end
      where me in (f.requester_id, f.addressee_id)
    ), '[]'::jsonb),
    'rides_hosted', coalesce((
      select jsonb_agg(to_jsonb(r) - 'host_id' order by r.ride_date)
      from public.rides r where r.host_id = me
    ), '[]'::jsonb),
    'rides_joined', coalesce((
      select jsonb_agg(jsonb_build_object(
        'ride_id', rp.ride_id,
        'resort', r.resort,
        'ride_date', r.ride_date,
        'status', rp.status,
        'joined_at', rp.joined_at
      ) order by rp.joined_at)
      from public.ride_participants rp
      join public.rides r on r.id = rp.ride_id
      where rp.user_id = me
    ), '[]'::jsonb),
    'carpools', coalesce((
      select jsonb_agg(to_jsonb(c) - 'author_id' order by c.ride_date)
      from public.carpools c where c.author_id = me
    ), '[]'::jsonb),
    'carpool_requests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'carpool_id', cr.carpool_id,
        'resort', c.resort,
        'ride_date', c.ride_date,
        'status', cr.status,
        'created_at', cr.created_at
      ) order by cr.created_at)
      from public.carpool_requests cr
      join public.carpools c on c.id = cr.carpool_id
      where cr.user_id = me
    ), '[]'::jsonb),
    'blocked', coalesce((
      select jsonb_agg(jsonb_build_object('handle', p.handle, 'since', b.created_at) order by b.created_at)
      from public.blocks b
      join public.profiles p on p.id = b.blocked_id
      where b.blocker_id = me
    ), '[]'::jsonb),
    'messages_sent', coalesce((
      select jsonb_agg(jsonb_build_object(
        'conversation_id', m.conversation_id,
        'kind', m.kind,
        'body', m.body,
        'lat', m.lat,
        'lng', m.lng,
        'created_at', m.created_at
      ) order by m.created_at)
      from public.messages m
      where m.sender_id = me
    ), '[]'::jsonb),
    'posts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'body', p.body,
        'resort', p.resort,
        'photo_path', p.photo_path,
        'created_at', p.created_at
      ) order by p.created_at)
      from public.posts p
      where p.author_id = me
    ), '[]'::jsonb),
    'ski_days', coalesce((
      select jsonb_agg(jsonb_build_object(
        'resort', d.resort,
        'started_at', d.started_at,
        'ended_at', d.ended_at,
        'distance_m', d.distance_m,
        'vertical_m', d.vertical_m,
        'max_speed_kmh', d.max_speed_kmh,
        'runs', d.runs
      ) order by d.started_at)
      from public.ski_days d
      where d.user_id = me
    ), '[]'::jsonb),
    'discovery_swipes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'handle', p.handle,
        'liked', s.liked,
        'created_at', s.created_at
      ) order by s.created_at)
      from public.swipes s
      join public.profiles p on p.id = s.target_id
      where s.swiper_id = me
    ), '[]'::jsonb),
    'push_subscriptions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'push_service', split_part(substr(s.endpoint, 9), '/', 1),
        'created_at', s.created_at,
        'session_id', s.session_id
      ) order by s.created_at)
      from public.push_subscriptions s
      where s.user_id = me
    ), '[]'::jsonb),
    'native_push_devices', coalesce((
      select jsonb_agg(jsonb_build_object(
        'platform', n.platform,
        'created_at', n.created_at,
        'session_id', n.session_id
      ) order by n.created_at)
      from public.native_push_tokens n
      where n.user_id = me
    ), '[]'::jsonb),
    'media_attestations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'object_id', a.object_id,
        'bucket_id', a.bucket_id,
        'path', a.name,
        'key_id', a.key_id,
        'issued_at', a.issued_at,
        'created_at', a.created_at
      ) order by a.created_at)
      from private.media_attestations a where a.owner_id = me
    ), '[]'::jsonb),
    'reports_filed', coalesce((
      select jsonb_agg(jsonb_build_object(
        'reported_handle', r.reported_handle,
        'reason', r.reason,
        'details', r.details,
        'created_at', r.created_at
      ) order by r.created_at)
      from public.reports r
      where r.reporter_id = me
    ), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;
