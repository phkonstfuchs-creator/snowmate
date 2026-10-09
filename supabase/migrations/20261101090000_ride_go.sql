-- Private conditional wishes on existing rides. They never reserve a spot,
-- join automatically, reveal another person's wishes or alter ride audiences.
create table private.ride_go_interests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  ride_id uuid not null references public.rides(id) on delete cascade,
  minimum_group integer not null check (minimum_group between 2 and 12),
  needs_carpool boolean not null,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,ride_id)
);
alter table private.ride_go_interests enable row level security;
alter table private.ride_go_interests force row level security;
revoke all on private.ride_go_interests from public,anon,authenticated;
create index ride_go_ride on private.ride_go_interests(ride_id);

create function private.require_go_session()
returns uuid language plpgsql stable security definer set search_path='' as $$
declare me uuid:=auth.uid();
begin
  if me is null or private.active_request_session(me) is null then
    raise exception 'not authenticated' using errcode='42501';
  end if;
  if coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'aal','aal1') <> 'aal2'
     and private.has_verified_mfa(me) then
    raise exception 'Two-factor verification required' using errcode='42501';
  end if;
  return me;
end;
$$;
revoke all on function private.require_go_session() from public,anon,authenticated;

-- Private helper accepts a subject only so a host's acceptance trigger can
-- recheck that subject. No client receives its execute privilege.
create function private.ride_go_status(subject uuid,target_ride uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  wish private.ride_go_interests;
  ride public.rides;
  crew integer;
  passenger boolean;
  participant text;
  group_ready boolean;
  carpool_ready boolean;
  state text;
begin
  select * into wish from private.ride_go_interests g where g.user_id=subject and g.ride_id=target_ride;
  if not found then return null; end if;
  select r.* into ride from public.rides r join public.profiles p on p.id=r.host_id
  where r.id=target_ride and private.can_see_ride(subject,r,p.is_minor);
  if not found then return null; end if;
  select rp.status into participant from public.ride_participants rp
  where rp.ride_id=target_ride and rp.user_id=subject;
  select 1+count(*)::integer into crew from public.ride_participants rp
  where rp.ride_id=target_ride and rp.status='accepted' and rp.user_id<>ride.host_id
    and not private.is_blocked(subject,rp.user_id);
  select exists (
    select 1 from public.carpools c
    join public.carpool_requests cr on cr.carpool_id=c.id and cr.status='accepted'
    where c.resort=ride.resort and c.ride_date=ride.ride_date
      and c.departure_time<=ride.meet_time
      and ((c.role='driver' and cr.user_id=subject) or (c.role='rider' and c.author_id=subject))
      and not private.is_blocked(c.author_id,cr.user_id)
      and private.has_complete_profile(c.author_id) and private.has_complete_profile(cr.user_id)
  ) into passenger;
  -- Host is already counted. Prospective self counts for readiness, never
  -- for the displayed number of confirmed people.
  group_ready:=crew+case when participant='accepted' or ride.host_id=subject then 0 else 1 end >=wish.minimum_group
    and wish.minimum_group<=ride.total_spots+1;
  carpool_ready:=not wish.needs_carpool or passenger;
  state:=case when wish.withdrawn_at is not null then 'withdrawn'
    when (ride.ride_date+ride.meet_time) at time zone 'Europe/Vienna'<=now() then 'expired'
    when participant='accepted' then 'confirmed'
    when participant='pending' then 'requested'
    when group_ready and carpool_ready then 'ready' else 'interested' end;
  return jsonb_build_object('id',wish.id,'rideId',ride.id,'minimumGroup',wish.minimum_group,
    'needsCarpool',wish.needs_carpool,'confirmedGroup',crew,'hasConfirmedCarpool',passenger,
    'groupReady',group_ready,'carpoolReady',carpool_ready,
    'ready',group_ready and carpool_ready and state not in ('expired','withdrawn'), 'status',state);
end;
$$;
revoke all on function private.ride_go_status(uuid,uuid) from public,anon,authenticated;

create function public.get_ride_go_status(target_ride uuid)
returns jsonb language sql stable security definer set search_path='' as $$
  select private.ride_go_status(private.require_go_session(),target_ride);
$$;
revoke all on function public.get_ride_go_status(uuid) from public,anon;
grant execute on function public.get_ride_go_status(uuid) to authenticated;

create function public.set_ride_go_interest(target_ride uuid,minimum_group integer,needs_carpool boolean)
returns text language plpgsql security definer set search_path='' as $$
declare me uuid:=private.require_go_session(); ride public.rides; participant text;
begin
  if not private.has_complete_profile(me) then return 'profile_incomplete'; end if;
  perform public.check_request();
  select r.* into ride from public.rides r join public.profiles p on p.id=r.host_id
  where r.id=target_ride and private.can_see_ride(me,r,p.is_minor) for update of r;
  if not found or ride.host_id=me then return 'not_found'; end if;
  if minimum_group is null or minimum_group<2 or minimum_group>least(12,ride.total_spots+1)
     or needs_carpool is null or (ride.ride_date+ride.meet_time) at time zone 'Europe/Vienna'<=now() then
    return 'invalid';
  end if;
  select status into participant from public.ride_participants where ride_id=target_ride and user_id=me;
  if participant='accepted' then return 'already_joined'; end if;
  if participant='pending' then return 'already_requested'; end if;
  insert into private.ride_go_interests(user_id,ride_id,minimum_group,needs_carpool)
  values(me,target_ride,minimum_group,needs_carpool)
  on conflict(user_id,ride_id) do update set minimum_group=excluded.minimum_group,
    needs_carpool=excluded.needs_carpool,withdrawn_at=null,updated_at=now();
  return 'saved';
end;
$$;
revoke all on function public.set_ride_go_interest(uuid,integer,boolean) from public,anon;
grant execute on function public.set_ride_go_interest(uuid,integer,boolean) to authenticated;

create function public.withdraw_ride_go_interest(target_ride uuid)
returns text language plpgsql security definer set search_path='' as $$
declare me uuid:=private.require_go_session(); changed uuid;
begin
  perform public.check_request();
  perform 1 from public.rides where id=target_ride for update;
  update private.ride_go_interests set withdrawn_at=coalesce(withdrawn_at,now()),updated_at=now()
    where user_id=me and ride_id=target_ride returning id into changed;
  if changed is null then return 'not_found'; end if;
  delete from public.ride_participants where user_id=me and ride_id=target_ride and status='pending';
  return 'withdrawn';
end;
$$;
revoke all on function public.withdraw_ride_go_interest(uuid) from public,anon;
grant execute on function public.withdraw_ride_go_interest(uuid) to authenticated;

create function public.list_my_ride_go_interests(p_limit integer default 20)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare me uuid:=private.require_go_session(); result jsonb;
begin
  if p_limit is null or p_limit<1 or p_limit>50 then raise exception 'invalid limit' using errcode='22023'; end if;
  with statuses as materialized (
    select r.id,r.resort,r.ride_date,r.meet_time,r.total_spots,private.ride_go_status(me,r.id) as go
    from private.ride_go_interests g join public.rides r on r.id=g.ride_id
    where g.user_id=me and g.withdrawn_at is null
      and (r.ride_date+r.meet_time) at time zone 'Europe/Vienna'>now()
  ), visible as (
    select *,case when go->>'status'='confirmed' and go->>'ready'='false' then 0
      when go->>'status'='ready' then 1 when go->>'status'='interested' then 2
      when go->>'status'='requested' then 3 else 4 end as priority
    from statuses where go is not null order by priority,ride_date,meet_time,id limit p_limit
  )
  select coalesce(jsonb_agg(jsonb_build_object('ride',jsonb_build_object('id',id,'resort',resort,
    'rideDate',ride_date,'meetTime',meet_time,'totalSpots',total_spots),'go',go)
    order by priority,ride_date,meet_time,id),'[]'::jsonb) into result from visible;
  return result;
end;
$$;
revoke all on function public.list_my_ride_go_interests(integer) from public,anon;
grant execute on function public.list_my_ride_go_interests(integer) to authenticated;

-- Keep the original join/respond functions and all their existing visibility,
-- capacity, block and push safeguards. Gate only transitions into participation.
create function private.enforce_ride_go_conditions()
returns trigger language plpgsql security definer set search_path='' as $$
declare target uuid; subject uuid; status jsonb;
begin
  target:=case when tg_op='DELETE' then old.ride_id else new.ride_id end;
  perform 1 from public.rides where id=target for update;
  if tg_op='DELETE' then return old; end if;
  if tg_op='UPDATE' and old.status='accepted' then return new; end if;
  subject:=new.user_id;
  if not exists(select 1 from private.ride_go_interests where user_id=subject and ride_id=target and withdrawn_at is null) then
    return new;
  end if;
  -- Lock accepted transport relationships before the fresh readiness query.
  -- Carpool delete/update/request removal cannot invalidate the seat between
  -- this check and membership insertion/host acceptance.
  perform 1 from public.carpools c where exists(
    select 1 from public.carpool_requests cr where cr.carpool_id=c.id and cr.status='accepted'
      and ((c.role='driver' and cr.user_id=subject) or (c.role='rider' and c.author_id=subject))
  ) order by c.id for update;
  perform 1 from public.carpool_requests cr where cr.status='accepted' and exists(
    select 1 from public.carpools c where c.id=cr.carpool_id
      and ((c.role='driver' and cr.user_id=subject) or (c.role='rider' and c.author_id=subject))
  ) order by cr.carpool_id,cr.user_id for update;
  status:=private.ride_go_status(subject,target);
  if status is null or (status->>'ready')::boolean is distinct from true then
    raise exception 'go_conditions_not_ready' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function private.enforce_ride_go_conditions() from public,anon,authenticated;
create trigger ride_go_membership_guard before insert or update or delete on public.ride_participants
for each row execute function private.enforce_ride_go_conditions();

-- Extend the latest export without removing any existing account fields.
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
    'ride_go_interests', coalesce((select jsonb_agg(to_jsonb(g) - 'user_id' order by g.created_at) from private.ride_go_interests g where g.user_id=me), '[]'::jsonb),
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
-- Run after the 24-hour expiry/withdrawal threshold, on the next daily job.
-- The testable clock is private and never exposed to application roles.
create function private.cleanup_ride_go_interests(p_now timestamptz default now())
returns integer language plpgsql security definer set search_path='' as $$
declare removed integer;
begin
  delete from private.ride_go_interests g using public.rides r
  where r.id=g.ride_id and (
    (r.ride_date+r.meet_time) at time zone 'Europe/Vienna' < p_now-interval '24 hours'
    or g.withdrawn_at < p_now-interval '24 hours'
  );
  get diagnostics removed=row_count;
  return removed;
end;
$$;
revoke all on function private.cleanup_ride_go_interests(timestamptz) from public,anon,authenticated,service_role;
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('pistl-ride-go-retention','17 3 * * *','select private.cleanup_ride_go_interests();');
