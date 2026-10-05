-- Push notifications (ADR 0025, spec push-notifications).
--
-- * A device that turns notifications on stores its Web Push subscription
--   here. Only browser push services are accepted as endpoints, so the
--   sender can never be pointed at another host.
-- * Triggers queue a notice when someone writes to you, asks to be your
--   friend or accepts, or asks for, joins or is let into a ride. Only
--   people who could already reach you that way cause one; blocks stop
--   them. The notice holds no message text, only its kind, the sender
--   and the page to open.
-- * The push-dispatch edge function takes the queue with the service
--   role, encrypts each notice for the device and sends it. Clients never
--   see anyone's subscription or the queue.

create table public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),

  constraint push_subscriptions_endpoint_host check (
    char_length(endpoint) <= 1000
    and endpoint ~ '^https://(fcm\.googleapis\.com|web\.push\.apple\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+\.notify\.windows\.com)/[!-~]+$'
  ),
  -- An uncompressed P-256 key (65 bytes) and a 16-byte secret, base64url.
  constraint push_subscriptions_p256dh_shape check (p256dh ~ '^[A-Za-z0-9_-]{87}$'),
  constraint push_subscriptions_auth_shape check (auth ~ '^[A-Za-z0-9_-]{22}$')
);

create index push_subscriptions_user on public.push_subscriptions (user_id, created_at desc);

alter table public.push_subscriptions enable row level security;
alter table public.push_subscriptions force row level security;
revoke all on table public.push_subscriptions from public, anon, authenticated;

create table private.push_outbox (
  id bigint generated always as identity primary key,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete cascade,
  kind text not null,
  url text not null,
  created_at timestamptz not null default now(),

  constraint push_outbox_kind_value check (
    kind in ('message', 'friend_request', 'friend_accepted', 'ride_request', 'ride_joined', 'ride_accepted')
  ),
  constraint push_outbox_url_shape check (url ~ '^/[A-Za-z0-9/_-]{0,120}$')
);

create index push_outbox_recipient on private.push_outbox (recipient_id, url);

revoke all on table private.push_outbox from public, anon, authenticated;

-- ── Devices ─────────────────────────────────────────────────────────

-- Stores (or takes over) this device's subscription for the caller.
-- Keeps the 10 newest devices per person.
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    return 'unauthenticated';
  end if;

  begin
    insert into public.push_subscriptions (endpoint, user_id, p256dh, auth)
    values (p_endpoint, me, p_p256dh, p_auth)
    on conflict (endpoint) do update
      set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, created_at = now();
  exception when check_violation or not_null_violation then
    return 'invalid';
  end;

  delete from public.push_subscriptions s
  where s.user_id = me
    and s.endpoint not in (
      select k.endpoint from public.push_subscriptions k
      where k.user_id = me order by k.created_at desc limit 10
    );

  return 'saved';
end;
$$;

create or replace function public.delete_push_subscription(p_endpoint text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with gone as (
    delete from public.push_subscriptions s
    where s.endpoint = p_endpoint and s.user_id = auth.uid()
    returning 1
  )
  select exists (select 1 from gone);
$$;

revoke all on function public.save_push_subscription(text, text, text) from public, anon;
revoke all on function public.delete_push_subscription(text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;
grant execute on function public.delete_push_subscription(text) to authenticated;

-- ── Queue ───────────────────────────────────────────────────────────

-- Queues one notice unless the recipient has no device, is the actor,
-- has blocked (or is blocked by) the actor, or already has the same
-- notice waiting.
create or replace function private.queue_push(recipient uuid, actor uuid, notice text, target text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if recipient is null or recipient = actor
     or (actor is not null and private.is_blocked(recipient, actor))
     or not exists (select 1 from public.push_subscriptions s where s.user_id = recipient)
     or exists (select 1 from private.push_outbox o where o.recipient_id = recipient and o.url = target and o.kind = notice) then
    return;
  end if;
  insert into private.push_outbox (recipient_id, actor_id, kind, url) values (recipient, actor, notice, target);
end;
$$;

revoke all on function private.queue_push(uuid, uuid, text, text) from public, anon, authenticated;

-- A notice must never cost the write that caused it.
create or replace function private.push_on_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  chat public.conversations%rowtype;
  member uuid;
begin
  begin
    select * into chat from public.conversations c where c.id = new.conversation_id;
    for member in
      select unnest(array[chat.user_low, chat.user_high]) where chat.kind = 'direct'
      union
      select r.host_id from public.rides r where chat.kind = 'ride' and r.id = chat.ride_id
      union
      select rp.user_id from public.ride_participants rp
      where chat.kind = 'ride' and rp.ride_id = chat.ride_id and rp.status = 'accepted'
    loop
      if member is not null and member <> new.sender_id and private.can_use_conversation(chat.id, member) then
        perform private.queue_push(member, new.sender_id, 'message', '/crew/chat/' || chat.id::text);
      end if;
    end loop;
  exception when others then
    null;
  end;
  return null;
end;
$$;

create or replace function private.push_on_friendship()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    if tg_op = 'INSERT' and new.status = 'pending' then
      perform private.queue_push(new.addressee_id, new.requester_id, 'friend_request', '/crew');
    elsif new.status = 'accepted' and (tg_op = 'INSERT' or old.status = 'pending') then
      -- Whoever did not accept (or redeem the invite) hears about it.
      if auth.uid() is distinct from new.requester_id then
        perform private.queue_push(new.requester_id, new.addressee_id, 'friend_accepted', '/crew');
      end if;
      if auth.uid() is distinct from new.addressee_id then
        perform private.queue_push(new.addressee_id, new.requester_id, 'friend_accepted', '/crew');
      end if;
    end if;
  exception when others then
    null;
  end;
  return null;
end;
$$;

create or replace function private.push_on_ride_participant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  host uuid;
begin
  begin
    select r.host_id into host from public.rides r where r.id = new.ride_id;
    if tg_op = 'INSERT' and new.status = 'pending' then
      perform private.queue_push(host, new.user_id, 'ride_request', '/feed');
    elsif tg_op = 'INSERT' and new.status = 'accepted' then
      perform private.queue_push(host, new.user_id, 'ride_joined', '/feed');
    elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'accepted' then
      perform private.queue_push(new.user_id, host, 'ride_accepted', '/feed');
    end if;
  exception when others then
    null;
  end;
  return null;
end;
$$;

revoke all on function private.push_on_message() from public, anon, authenticated;
revoke all on function private.push_on_friendship() from public, anon, authenticated;
revoke all on function private.push_on_ride_participant() from public, anon, authenticated;

create trigger push_on_message
  after insert on public.messages
  for each row execute function private.push_on_message();

create trigger push_on_friendship
  after insert or update of status on public.friendships
  for each row execute function private.push_on_friendship();

create trigger push_on_ride_participant
  after insert or update of status on public.ride_participants
  for each row execute function private.push_on_ride_participant();

-- ── Sending (service role only) ─────────────────────────────────────

-- Takes up to 200 waiting notices with every device of each recipient.
-- Notices older than an hour are dropped unsent: by then they are noise.
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
         coalesce(a.display_name, '@' || a.handle),
         t.url
  from taken t
  join public.push_subscriptions s on s.user_id = t.recipient_id
  left join public.profiles a on a.id = t.actor_id;
end;
$$;

-- A push service said the device is gone (404/410).
create or replace function public.push_forget_subscription(p_endpoint text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_subscriptions s where s.endpoint = p_endpoint;
$$;

revoke all on function public.push_take_outbox() from public, anon, authenticated;
revoke all on function public.push_forget_subscription(text) from public, anon, authenticated;
grant execute on function public.push_take_outbox() to service_role;
grant execute on function public.push_forget_subscription(text) to service_role;

-- The data export lists the caller's devices (push service and date).
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
    'push_subscriptions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'push_service', split_part(substr(s.endpoint, 9), '/', 1),
        'created_at', s.created_at
      ) order by s.created_at)
      from public.push_subscriptions s
      where s.user_id = me
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
