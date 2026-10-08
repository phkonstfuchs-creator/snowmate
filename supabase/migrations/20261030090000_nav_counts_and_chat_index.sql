-- Fewer and cheaper calls on every signed-in page (team review
-- 2026-10-07, finding #12; docs/qa/TEAM_REVIEW.md). Applied migrations
-- stay untouched; the functions below replace their earlier definitions
-- or are new. Behaviour is unchanged; pgTAP: nav_counts.test.sql.

-- ── 1. Indexes the hot paths were missing ───────────────────────────
-- Direct chats are found by either side; the pair's unique index only
-- leads with user_low.
create index conversations_user_high on public.conversations (user_high) where kind = 'direct';
-- Push dispatch takes and purges by actor.
create index push_outbox_actor on private.push_outbox (actor_id);

-- ── 2. My chats: read my own, not everyone's ────────────────────────
-- The old version ran can_use_conversation over every conversation in
-- the database. Now the candidates come from my memberships (indexed),
-- and the same audience check still decides.
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
  with candidates as (
    select c.id from public.conversations c
    where c.kind = 'direct' and c.user_low = auth.uid()
    union
    select c.id from public.conversations c
    where c.kind = 'direct' and c.user_high = auth.uid()
    union
    select c.id from public.conversations c
    join public.rides r on r.id = c.ride_id
    where c.kind = 'ride' and r.host_id = auth.uid()
    union
    select c.id from public.conversations c
    join public.ride_participants rp on rp.ride_id = c.ride_id
    where c.kind = 'ride' and rp.user_id = auth.uid() and rp.status = 'accepted'
  ),
  mine as (
    select c.*
    from public.conversations c
    join candidates k on k.id = c.id
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

revoke all on function public.list_my_conversations() from public, anon;
grant execute on function public.list_my_conversations() to authenticated;

-- ── 3. Every navigation badge in one read-only call ─────────────────
-- Replaces three calls per page (my_pending_counts, my_unread_chats,
-- refresh_my_age). Being stable, PostgREST runs it read-only, so the
-- write guard does not count it. age_outdated says when the rare write
-- refresh_my_age() is actually needed (the 18th birthday has passed).
-- The old functions stay for clients that still call them.
create or replace function public.my_nav_counts()
returns table (
  friend_requests integer,
  carpool_requests integer,
  ride_requests integer,
  unread_chats integer,
  age_outdated boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.friend_requests,
    p.carpool_requests,
    p.ride_requests,
    public.my_unread_chats(),
    coalesce((
      select me.is_minor and private.is_adult_on(me.birth_date, private.local_today())
      from public.profiles me where me.id = auth.uid()
    ), false)
  from public.my_pending_counts() p
  where auth.uid() is not null;
$$;

revoke all on function public.my_nav_counts() from public, anon;
grant execute on function public.my_nav_counts() to authenticated;
