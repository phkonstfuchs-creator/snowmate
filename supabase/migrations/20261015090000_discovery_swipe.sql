-- Swipe to meet riders (ADR 0028, spec discovery-swipe).
--
-- * Opt-in: only people who switched "discoverable" on appear, and only
--   they can swipe.
-- * Separated by age: 14-15, 16-17 and adults never see each other.
-- * Under 18 the deck holds only friends of friends (a shared confirmed
--   friend); there is no open stranger discovery for minors (ADR 0006
--   stays in force for them). Adults see opted-in adults of their region.
-- * A like is never shown to anyone. When both like each other, they
--   become friends at once. Blocks, existing friendships and requests
--   keep people out of the deck; a pass hides someone for 30 days.

alter table public.profiles add column discoverable boolean not null default false;
grant update (discoverable) on table public.profiles to authenticated;

create table public.swipes (
  swiper_id uuid not null references public.profiles (id) on delete cascade,
  target_id uuid not null references public.profiles (id) on delete cascade,
  liked boolean not null,
  created_at timestamptz not null default now(),
  primary key (swiper_id, target_id),
  constraint swipes_not_self check (swiper_id <> target_id)
);

create index swipes_target on public.swipes (target_id, swiper_id) where liked;
create index swipes_swiper_time on public.swipes (swiper_id, created_at desc);

alter table public.swipes enable row level security;
alter table public.swipes force row level security;
revoke all on table public.swipes from public, anon, authenticated;

-- teen_young (14-15), teen (16-17), adult; null without a birth date.
create or replace function private.age_band(birth date)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when birth is null then null
    when extract(year from age(private.local_today(), birth)) < 16 then 'teen_young'
    when extract(year from age(private.local_today(), birth)) < 18 then 'teen'
    else 'adult'
  end;
$$;

-- Whether the viewer may see the target in their deck (or swipe on them).
create or replace function private.can_discover(viewer uuid, target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select viewer is not null and target is not null and viewer <> target and exists (
    select 1
    from public.profiles v
    join public.profiles t on t.id = target
    where v.id = viewer
      and v.discoverable and t.discoverable
      and v.onboarding_completed and t.onboarding_completed
      and v.city is not null and v.city = t.city
      and private.age_band(v.birth_date) is not null
      and private.age_band(v.birth_date) = private.age_band(t.birth_date)
      and (private.age_band(v.birth_date) = 'adult' or private.are_friends_of_friends(viewer, target))
      and not private.is_blocked(viewer, target)
      and not exists (
        select 1 from public.friendships f
        where (f.requester_id = viewer and f.addressee_id = target)
           or (f.requester_id = target and f.addressee_id = viewer)
      )
  );
$$;

revoke all on function private.age_band(date) from public, anon, authenticated;
revoke all on function private.can_discover(uuid, uuid) from public, anon, authenticated;

-- Up to 20 people to swipe on: shared friends first, then at random.
create or replace function public.discovery_deck()
returns table (
  user_id uuid,
  display_name text,
  ability_level text,
  riding_styles text[],
  bio text,
  mutual_friends integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.display_name, t.ability_level, t.riding_styles, t.bio,
    (select count(*)::int from private.friend_ids(auth.uid()) a join private.friend_ids(t.id) b on a = b)
  from public.profiles t
  where private.can_discover(auth.uid(), t.id)
    and not exists (
      select 1 from public.swipes s
      where s.swiper_id = auth.uid() and s.target_id = t.id
        and (s.liked or s.created_at > now() - interval '30 days')
    )
  order by 6 desc, random()
  limit 20;
$$;

-- Records a swipe. 'matched' when the other person liked the caller too:
-- they are friends from now on.
create or replace function public.swipe(target uuid, p_liked boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  recent integer;
begin
  if me is null then
    return 'unauthenticated';
  end if;
  if p_liked is null or not private.can_discover(me, target) then
    return 'invalid';
  end if;

  select count(*) into recent from public.swipes s where s.swiper_id = me and s.created_at > now() - interval '1 day';
  if recent >= 100 then
    return 'rate_limited';
  end if;

  insert into public.swipes (swiper_id, target_id, liked)
  values (me, target, p_liked)
  on conflict (swiper_id, target_id) do update set liked = excluded.liked, created_at = now();

  if p_liked and exists (
    select 1 from public.swipes s where s.swiper_id = target and s.target_id = me and s.liked
  ) then
    insert into public.friendships (requester_id, addressee_id, status, responded_at)
    values (target, me, 'accepted', now())
    on conflict do nothing;
    return 'matched';
  end if;

  return case when p_liked then 'liked' else 'passed' end;
end;
$$;

revoke all on function public.discovery_deck() from public, anon;
revoke all on function public.swipe(uuid, boolean) from public, anon;
grant execute on function public.discovery_deck() to authenticated;
grant execute on function public.swipe(uuid, boolean) to authenticated;

-- The data export lists the caller's swipes.
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
