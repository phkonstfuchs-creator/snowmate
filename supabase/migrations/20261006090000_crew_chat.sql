-- Chat for confirmed friends and ride crews (ADR 0017, spec crew-chat).
--
-- * Direct chat: exactly two confirmed friends. A block in either
--   direction or unfriending ends access for both.
-- * Ride chat: the host and every accepted rider of that ride. A pending
--   rider or someone who left has no access. Messages from a person the
--   viewer blocked (or who blocked the viewer) are hidden.
-- * Clients cannot touch the tables. The functions below are the only way
--   in, and each one checks membership again on every call.
-- * Text only, 1 to 1000 characters, no control characters except line
--   breaks, no bidi overrides; at most 30 messages a minute per person.

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  -- Direct: the two people, smaller id first, so a pair has one chat.
  user_low uuid references public.profiles (id) on delete cascade,
  user_high uuid references public.profiles (id) on delete cascade,
  -- Ride: the ride; the chat goes with it.
  ride_id uuid unique references public.rides (id) on delete cascade,
  created_at timestamptz not null default now(),

  constraint conversations_kind_value check (kind in ('direct', 'ride')),
  constraint conversations_shape check (
    (kind = 'direct' and user_low is not null and user_high is not null and user_low < user_high and ride_id is null)
    or (kind = 'ride' and ride_id is not null and user_low is null and user_high is null)
  ),
  constraint conversations_pair_unique unique (user_low, user_high)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),

  constraint messages_body_length check (char_length(body) between 1 and 1000 and btrim(body) <> ''),
  constraint messages_body_safe check (body !~ '[\x01-\x09\x0b\x0c\x0e-\x1f\x7f‪-‮⁦-⁩]')
);

create index messages_conversation_time on public.messages (conversation_id, created_at desc);
create index messages_sender_time on public.messages (sender_id, created_at desc);

-- When each member last read a chat, for unread counts.
create table public.conversation_reads (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

alter table public.conversations enable row level security;
alter table public.conversations force row level security;
alter table public.messages enable row level security;
alter table public.messages force row level security;
alter table public.conversation_reads enable row level security;
alter table public.conversation_reads force row level security;
revoke all on table public.conversations, public.messages, public.conversation_reads from public, anon, authenticated;

-- ── Who may use a chat ──────────────────────────────────────────────

create or replace function private.is_ride_member(target_ride uuid, viewer uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.rides r where r.id = target_ride and r.host_id = viewer)
    or exists (
      select 1 from public.ride_participants rp
      where rp.ride_id = target_ride and rp.user_id = viewer and rp.status = 'accepted'
    );
$$;

create or replace function private.can_use_conversation(conv uuid, viewer uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select viewer is not null and exists (
    select 1 from public.conversations c
    where c.id = conv
      and (
        (c.kind = 'direct'
          and viewer in (c.user_low, c.user_high)
          and private.are_friends(c.user_low, c.user_high)
          and not private.is_blocked(c.user_low, c.user_high))
        or (c.kind = 'ride' and private.is_ride_member(c.ride_id, viewer))
      )
  );
$$;

revoke all on function private.is_ride_member(uuid, uuid) from public, anon, authenticated;
revoke all on function private.can_use_conversation(uuid, uuid) from public, anon, authenticated;

-- ── Opening a chat ──────────────────────────────────────────────────

-- Returns the chat id, or null when the two are not friends (or blocked).
create or replace function public.open_direct_chat(other uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  low uuid;
  high uuid;
  conv uuid;
begin
  if me is null or other is null or other = me
     or not private.are_friends(me, other) or private.is_blocked(me, other) then
    return null;
  end if;

  low := least(me, other);
  high := greatest(me, other);

  insert into public.conversations (kind, user_low, user_high)
  values ('direct', low, high)
  on conflict (user_low, user_high) do nothing;

  select c.id into conv from public.conversations c where c.user_low = low and c.user_high = high;
  return conv;
end;
$$;

-- Returns the chat id, or null when the caller is not in the ride.
create or replace function public.open_ride_chat(target_ride uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  conv uuid;
begin
  if me is null or not private.is_ride_member(target_ride, me) then
    return null;
  end if;

  insert into public.conversations (kind, ride_id)
  values ('ride', target_ride)
  on conflict (ride_id) do nothing;

  select c.id into conv from public.conversations c where c.ride_id = target_ride;
  return conv;
end;
$$;

-- ── Writing ─────────────────────────────────────────────────────────

-- Returns: sent | forbidden | invalid | rate_limited | profile_incomplete
create or replace function public.send_message(conv uuid, message text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  clean text := btrim(coalesce(message, ''), E' \n\r');
  recent integer;
begin
  if not private.can_use_conversation(conv, me) then
    return 'forbidden';
  end if;

  if not exists (select 1 from public.profiles p where p.id = me and p.onboarding_completed) then
    return 'profile_incomplete';
  end if;

  if char_length(clean) not between 1 and 1000
     or clean ~ '[\x01-\x09\x0b\x0c\x0e-\x1f\x7f‪-‮⁦-⁩]' then
    return 'invalid';
  end if;

  select count(*) into recent
  from public.messages m
  where m.sender_id = me and m.created_at > now() - interval '1 minute';
  if recent >= 30 then
    return 'rate_limited';
  end if;

  insert into public.messages (conversation_id, sender_id, body) values (conv, me, clean);

  insert into public.conversation_reads (conversation_id, user_id, last_read_at)
  values (conv, me, now())
  on conflict (conversation_id, user_id) do update set last_read_at = excluded.last_read_at;

  return 'sent';
end;
$$;

create or replace function public.mark_conversation_read(conv uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if not private.can_use_conversation(conv, me) then
    return;
  end if;

  insert into public.conversation_reads (conversation_id, user_id, last_read_at)
  values (conv, me, now())
  on conflict (conversation_id, user_id) do update set last_read_at = excluded.last_read_at;
end;
$$;

-- ── Reading ─────────────────────────────────────────────────────────

-- The latest messages (oldest first), or messages after `since` when
-- polling. Nothing when the caller may not use the chat.
create or replace function public.list_messages(conv uuid, since timestamptz default null)
returns table (
  id uuid,
  sender_id uuid,
  sender_name text,
  sender_handle text,
  body text,
  created_at timestamptz,
  is_mine boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select x.id, x.sender_id, x.display_name, x.handle, x.body, x.created_at, x.sender_id = auth.uid()
  from (
    select m.id, m.sender_id, p.display_name, p.handle, m.body, m.created_at
    from public.messages m
    join public.profiles p on p.id = m.sender_id
    where m.conversation_id = conv
      and private.can_use_conversation(conv, auth.uid())
      and (since is null or m.created_at > since)
      and (m.sender_id = auth.uid() or not private.is_blocked(auth.uid(), m.sender_id))
    order by m.created_at desc
    limit 50
  ) x
  order by x.created_at asc;
$$;

-- The caller's chats with the last visible message and unread count.
create or replace function public.list_my_conversations()
returns table (
  conversation_id uuid,
  kind text,
  other_user_id uuid,
  other_name text,
  other_handle text,
  ride_id uuid,
  ride_resort text,
  ride_date date,
  last_body text,
  last_at timestamptz,
  last_is_mine boolean,
  unread integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select c.*
    from public.conversations c
    where private.can_use_conversation(c.id, auth.uid())
  )
  select
    c.id,
    c.kind,
    other.id,
    other.display_name,
    other.handle,
    c.ride_id,
    r.resort,
    r.ride_date,
    last.body,
    last.created_at,
    last.sender_id = auth.uid(),
    (
      select count(*)::integer
      from public.messages m
      where m.conversation_id = c.id
        and m.sender_id <> auth.uid()
        and not private.is_blocked(auth.uid(), m.sender_id)
        and m.created_at > coalesce(
          (select cr.last_read_at from public.conversation_reads cr
           where cr.conversation_id = c.id and cr.user_id = auth.uid()),
          '-infinity'::timestamptz)
    )
  from mine c
  left join public.profiles other
    on c.kind = 'direct'
   and other.id = case when c.user_low = auth.uid() then c.user_high else c.user_low end
  left join public.rides r on r.id = c.ride_id
  left join lateral (
    select m.body, m.created_at, m.sender_id
    from public.messages m
    where m.conversation_id = c.id
      and (m.sender_id = auth.uid() or not private.is_blocked(auth.uid(), m.sender_id))
    order by m.created_at desc
    limit 1
  ) last on true
  where last.created_at is not null or c.kind = 'ride'
  order by coalesce(last.created_at, c.created_at) desc;
$$;

-- Chats with unread messages, for the Crew tab badge.
create or replace function public.my_unread_chats()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.list_my_conversations() c where c.unread > 0;
$$;

revoke all on function public.open_direct_chat(uuid) from public, anon;
revoke all on function public.open_ride_chat(uuid) from public, anon;
revoke all on function public.send_message(uuid, text) from public, anon;
revoke all on function public.mark_conversation_read(uuid) from public, anon;
revoke all on function public.list_messages(uuid, timestamptz) from public, anon;
revoke all on function public.list_my_conversations() from public, anon;
revoke all on function public.my_unread_chats() from public, anon;
grant execute on function public.open_direct_chat(uuid) to authenticated;
grant execute on function public.open_ride_chat(uuid) to authenticated;
grant execute on function public.send_message(uuid, text) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.list_messages(uuid, timestamptz) to authenticated;
grant execute on function public.list_my_conversations() to authenticated;
grant execute on function public.my_unread_chats() to authenticated;

-- ── Data export includes sent messages ──────────────────────────────

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
        'body', m.body,
        'created_at', m.created_at
      ) order by m.created_at)
      from public.messages m
      where m.sender_id = me
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
