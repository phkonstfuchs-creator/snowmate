-- Send an exact position in a chat (ADR 0020, spec ski-map-and-conditions).
--
-- * A location message is a pin in a chat the sender may use: friends
--   in a direct chat, members in a ride chat (ADR 0017).
-- * Only from 16, like live location (ADR 0019).
-- * The coordinates are readable for 24 hours, then removed from the
--   database; the message stays as "location (expired)".
-- * Rounded to about 1 m; the same rate limit as text messages.

alter table public.messages
  add column kind text not null default 'text',
  add column lat double precision,
  add column lng double precision,
  add constraint messages_kind check (kind in ('text', 'location')),
  add constraint messages_location_shape check (
    (kind = 'text' and lat is null and lng is null)
    or (kind = 'location'
        and (lat is null) = (lng is null)
        and (lat is null or (lat between -90 and 90 and lng between -180 and 180)))
  );

create index messages_location_expiry on public.messages (created_at) where kind = 'location' and lat is not null;

-- Returns: sent | forbidden | invalid | rate_limited | profile_incomplete | too_young
create or replace function public.send_location_message(conv uuid, p_lat double precision, p_lng double precision)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  recent integer;
begin
  if not private.can_use_conversation(conv, me) then
    return 'forbidden';
  end if;

  if not exists (select 1 from public.profiles p where p.id = me and p.onboarding_completed) then
    return 'profile_incomplete';
  end if;

  if not private.may_share_location(me) then
    return 'too_young';
  end if;

  if p_lat is null or p_lng is null
     or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    return 'invalid';
  end if;

  select count(*) into recent
  from public.messages m
  where m.sender_id = me and m.created_at > now() - interval '1 minute';
  if recent >= 30 then
    return 'rate_limited';
  end if;

  -- Housekeeping: positions older than a day are not kept.
  update public.messages set lat = null, lng = null
  where kind = 'location' and lat is not null and created_at <= now() - interval '24 hours';

  insert into public.messages (conversation_id, sender_id, body, kind, lat, lng)
  values (conv, me, '📍', 'location',
          round(p_lat::numeric, 5)::double precision, round(p_lng::numeric, 5)::double precision);

  insert into public.conversation_reads (conversation_id, user_id, last_read_at)
  values (conv, me, now())
  on conflict (conversation_id, user_id) do update set last_read_at = excluded.last_read_at;

  return 'sent';
end;
$$;

revoke all on function public.send_location_message(uuid, double precision, double precision) from public, anon;
grant execute on function public.send_location_message(uuid, double precision, double precision) to authenticated;

-- list_messages gains kind and position; the return type changes, so it
-- is dropped and created again with the same audience rules.
drop function public.list_messages(uuid, timestamptz);

create function public.list_messages(conv uuid, since timestamptz default null)
returns table (
  id uuid,
  sender_id uuid,
  sender_name text,
  sender_handle text,
  body text,
  created_at timestamptz,
  is_mine boolean,
  kind text,
  lat double precision,
  lng double precision
)
language sql
stable
security definer
set search_path = ''
as $$
  select x.id, x.sender_id, x.display_name, x.handle, x.body, x.created_at, x.sender_id = auth.uid(),
         x.kind, x.lat, x.lng
  from (
    select m.id, m.sender_id, p.display_name, p.handle, m.body, m.created_at, m.kind,
           case when m.created_at > now() - interval '24 hours' then m.lat end as lat,
           case when m.created_at > now() - interval '24 hours' then m.lng end as lng
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

revoke all on function public.list_messages(uuid, timestamptz) from public, anon;
grant execute on function public.list_messages(uuid, timestamptz) to authenticated;

-- The data export lists the kind and, while kept, the position.
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
