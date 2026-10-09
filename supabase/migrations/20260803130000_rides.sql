create table public.rides (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  resort_id text not null references public.resorts (id),
  ability_level text not null,
  starts_at timestamptz not null,
  capacity smallint not null,
  audience text not null default 'friends',
  caption text not null default '',
  status text not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rides_ability_level_value check (
    ability_level in ('chill', 'park', 'off-piste')
  ),
  constraint rides_capacity_range check (capacity between 2 and 12),
  constraint rides_audience_value check (
    audience in ('friends', 'friends-of-friends')
  ),
  constraint rides_caption_safe check (
    char_length(caption) <= 500
    and caption !~ '[[:cntrl:]]'
    and caption !~ U&'[\202A-\202E\2066-\2069]'
  ),
  constraint rides_status_value check (
    status in ('scheduled', 'active', 'completed', 'cancelled')
  )
);

create index rides_host_starts_at on public.rides (host_id, starts_at desc);
create index rides_resort_starts_at on public.rides (resort_id, starts_at);
create index rides_active_starts_at
  on public.rides (starts_at, resort_id)
  where status in ('scheduled', 'active');

create trigger rides_set_updated_at
  before update on public.rides
  for each row execute function private.set_updated_at();

create table private.ride_details (
  ride_id uuid primary key references public.rides (id) on delete cascade,
  meeting_point text not null,
  meeting_latitude double precision,
  meeting_longitude double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ride_details_meeting_point_safe check (
    meeting_point = btrim(meeting_point)
    and char_length(meeting_point) between 2 and 200
    and meeting_point !~ '[[:cntrl:]]'
    and meeting_point !~ U&'[\202A-\202E\2066-\2069]'
  ),
  constraint ride_details_coordinates_complete check (
    (meeting_latitude is null and meeting_longitude is null)
    or (
      meeting_latitude between -90 and 90
      and meeting_longitude between -180 and 180
    )
  )
);

create trigger ride_details_set_updated_at
  before update on private.ride_details
  for each row execute function private.set_updated_at();

revoke all on table private.ride_details from public, anon, authenticated;

create table public.ride_members (
  ride_id uuid not null references public.rides (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'participant',
  joined_at timestamptz not null default now(),
  primary key (ride_id, user_id),
  constraint ride_members_role_value check (role in ('host', 'participant'))
);

create index ride_members_user_id on public.ride_members (user_id, ride_id);

create table public.ride_join_requests (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides (id) on delete cascade,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending',
  responded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint ride_join_requests_status_value check (
    status in ('pending', 'accepted', 'declined', 'cancelled')
  ),
  constraint ride_join_requests_response_complete check (
    (status = 'pending' and responded_by is null and responded_at is null)
    or (status = 'cancelled' and responded_by is null and responded_at is not null)
    or (status in ('accepted', 'declined') and responded_by is not null and responded_at is not null)
  ),
  unique (ride_id, requester_id)
);

create index ride_join_requests_ride_status
  on public.ride_join_requests (ride_id, status, created_at);
create index ride_join_requests_requester_status
  on public.ride_join_requests (requester_id, status, created_at desc);

create trigger ride_join_requests_set_updated_at
  before update on public.ride_join_requests
  for each row execute function private.set_updated_at();

alter table public.rides enable row level security;
alter table public.rides force row level security;
alter table public.ride_members enable row level security;
alter table public.ride_members force row level security;
alter table public.ride_join_requests enable row level security;
alter table public.ride_join_requests force row level security;

revoke all on table public.rides from public, anon, authenticated;
revoke all on table public.ride_members from public, anon, authenticated;
revoke all on table public.ride_join_requests from public, anon, authenticated;

create or replace function private.is_ride_member(
  p_ride_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.ride_members as member
    join public.rides as ride on ride.id = member.ride_id
    where member.ride_id = p_ride_id
      and member.user_id = p_user_id
      and private.can_account_use_core(p_user_id)
      and private.can_account_use_core(ride.host_id)
  );
$$;

create or replace function private.can_discover_ride(
  p_viewer_id uuid,
  p_ride_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.rides as ride
    where ride.id = p_ride_id
      and private.can_account_use_core(p_viewer_id)
      and private.can_account_use_core(ride.host_id)
      and ride.status in ('scheduled', 'active')
      and not private.is_blocked_between(p_viewer_id, ride.host_id)
      and (
        p_viewer_id = ride.host_id
        or private.is_ride_member(ride.id, p_viewer_id)
        or private.are_friends(p_viewer_id, ride.host_id)
        or (
          ride.audience = 'friends-of-friends'
          and not private.is_minor_account(p_viewer_id)
          and not private.is_minor_account(ride.host_id)
          and private.are_friends_of_friends(p_viewer_id, ride.host_id)
        )
      )
  );
$$;

create or replace function private.can_view_exact_ride(
  p_viewer_id uuid,
  p_ride_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.rides as ride
    where ride.id = p_ride_id
      and private.can_account_use_core(p_viewer_id)
      and private.can_account_use_core(ride.host_id)
      and ride.status in ('scheduled', 'active')
      and not private.is_blocked_between(p_viewer_id, ride.host_id)
      and (
        p_viewer_id = ride.host_id
        or private.are_friends(p_viewer_id, ride.host_id)
        or (
          not private.is_minor_account(p_viewer_id)
          and not private.is_minor_account(ride.host_id)
          and private.is_ride_member(ride.id, p_viewer_id)
        )
      )
  );
$$;

revoke all on function private.is_ride_member(uuid, uuid) from public, anon, authenticated;
revoke all on function private.can_discover_ride(uuid, uuid) from public, anon, authenticated;
revoke all on function private.can_view_exact_ride(uuid, uuid) from public, anon, authenticated;

create policy "rides_select_visible"
  on public.rides
  for select
  to authenticated
  using (private.can_discover_ride((select auth.uid()), id));

create policy "ride_members_select_exact_audience"
  on public.ride_members
  for select
  to authenticated
  using (private.can_view_exact_ride((select auth.uid()), ride_id));

create policy "ride_requests_select_participating"
  on public.ride_join_requests
  for select
  to authenticated
  using (
    requester_id = (select auth.uid())
    or exists (
      select 1
      from public.rides
      where id = ride_id and host_id = (select auth.uid())
    )
  );

create or replace function public.create_ride(
  p_resort_id text,
  p_ability_level text,
  p_starts_at timestamptz,
  p_capacity integer,
  p_audience text,
  p_caption text,
  p_meeting_point text,
  p_idempotency_key uuid
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  ride_id uuid;
  v_request_hash text;
  v_stored_request_hash text;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_idempotency_key is null then
    raise exception using errcode = '22004', message = 'idempotency key required';
  end if;

  v_request_hash := private.command_request_hash(
    pg_catalog.jsonb_build_object(
      'resort_id', p_resort_id,
      'ability_level', p_ability_level,
      'starts_at', p_starts_at,
      'capacity', p_capacity,
      'audience', p_audience,
      'caption', btrim(p_caption),
      'meeting_point', btrim(p_meeting_point)
    )
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      current_user_id::text || ':create_ride:' || p_idempotency_key::text,
      0
    )
  );

  select receipt.resource_id, receipt.request_hash
  into ride_id, v_stored_request_hash
  from private.command_receipts as receipt
  where receipt.user_id = current_user_id
    and receipt.command_name = 'create_ride'
    and receipt.idempotency_key = p_idempotency_key;
  if found then
    if v_stored_request_hash is distinct from v_request_hash then
      raise exception using errcode = '22023', message = 'idempotency key payload mismatch';
    end if;
    return ride_id;
  end if;

  perform private.consume_command_rate_limit(
    current_user_id, 'create_ride', 10, interval '1 day'
  );

  if not exists (
    select 1 from public.profiles
    where id = current_user_id and onboarding_completed
  ) then
    raise exception using errcode = '42501', message = 'completed profile required';
  end if;
  if not exists (
    select 1 from public.resorts where id = p_resort_id and is_active
  ) then
    raise exception using errcode = '23503', message = 'resort unavailable';
  end if;
  if p_starts_at <= now() or p_starts_at > now() + interval '90 days' then
    raise exception using errcode = '23514', message = 'ride date outside allowed range';
  end if;
  if private.is_minor_account(current_user_id)
    and p_audience <> 'friends'
  then
    raise exception using errcode = '23514', message = 'minor rides are friends-only';
  end if;

  insert into public.rides (
    host_id,
    resort_id,
    ability_level,
    starts_at,
    capacity,
    audience,
    caption
  ) values (
    current_user_id,
    p_resort_id,
    p_ability_level,
    p_starts_at,
    p_capacity,
    p_audience,
    btrim(p_caption)
  ) returning id into ride_id;

  insert into private.ride_details (ride_id, meeting_point)
  values (ride_id, btrim(p_meeting_point));

  insert into public.ride_members (ride_id, user_id, role)
  values (ride_id, current_user_id, 'host');

  insert into private.command_receipts (
    user_id, command_name, idempotency_key, resource_id, request_hash
  ) values (
    current_user_id, 'create_ride', p_idempotency_key, ride_id, v_request_hash
  );

  return ride_id;
end;
$$;

create or replace function public.get_ride_feed(
  p_city text,
  p_limit integer default 50
)
returns table (
  id uuid,
  host_id uuid,
  host_display_name text,
  host_handle text,
  host_avatar_path text,
  resort_id text,
  resort_name text,
  city text,
  ability_level text,
  starts_at timestamptz,
  capacity integer,
  taken_spots integer,
  audience text,
  caption text,
  status text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    ride.id,
    ride.host_id,
    host.display_name,
    host.handle,
    host.avatar_path,
    resort.id,
    resort.name,
    resort.city,
    ride.ability_level,
    ride.starts_at,
    ride.capacity::integer,
    (
      select count(*)::integer
      from public.ride_members
      where ride_id = ride.id
    ),
    ride.audience,
    ride.caption,
    ride.status,
    ride.created_at
  from public.rides as ride
  join public.resorts as resort on resort.id = ride.resort_id
  join public.profiles as host on host.id = ride.host_id
  where auth.uid() is not null
    and resort.city = p_city
    and private.can_discover_ride(auth.uid(), ride.id)
    and (
      (ride.status = 'scheduled' and ride.starts_at > statement_timestamp())
      or ride.status = 'active'
    )
  order by ride.starts_at, ride.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

create or replace function public.get_ride_detail(p_ride_id uuid)
returns table (
  id uuid,
  host_id uuid,
  host_display_name text,
  host_handle text,
  host_avatar_path text,
  resort_id text,
  resort_name text,
  city text,
  ability_level text,
  starts_at timestamptz,
  capacity integer,
  taken_spots integer,
  audience text,
  caption text,
  status text,
  created_at timestamptz,
  meeting_point text,
  can_view_exact boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    ride.id,
    ride.host_id,
    host.display_name,
    host.handle,
    host.avatar_path,
    resort.id,
    resort.name,
    resort.city,
    ride.ability_level,
    ride.starts_at,
    ride.capacity::integer,
    (
      select count(*)::integer
      from public.ride_members
      where ride_id = ride.id
    ),
    ride.audience,
    ride.caption,
    ride.status,
    ride.created_at,
    case
      when detail.ride_id is not null
        and private.can_view_exact_ride(auth.uid(), ride.id)
        then detail.meeting_point
      else null
    end,
    detail.ride_id is not null
      and private.can_view_exact_ride(auth.uid(), ride.id)
  from public.rides as ride
  join public.resorts as resort on resort.id = ride.resort_id
  join public.profiles as host on host.id = ride.host_id
  left join private.ride_details as detail on detail.ride_id = ride.id
  where ride.id = p_ride_id
    and auth.uid() is not null
    and private.can_discover_ride(auth.uid(), ride.id);
$$;

create or replace function public.get_ride_members(p_ride_id uuid)
returns table (
  ride_id uuid,
  user_id uuid,
  display_name text,
  handle text,
  avatar_path text,
  role text,
  joined_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    member.ride_id,
    member.user_id,
    profile.display_name,
    profile.handle,
    profile.avatar_path,
    member.role,
    member.joined_at
  from public.ride_members as member
  join public.rides as ride on ride.id = member.ride_id
  join public.profiles as profile on profile.id = member.user_id
  where member.ride_id = p_ride_id
    and auth.uid() is not null
    and private.can_account_use_core(auth.uid())
    and private.can_account_use_core(member.user_id)
    and not private.is_blocked_between(auth.uid(), ride.host_id)
    and not private.is_blocked_between(auth.uid(), member.user_id)
    and (
      auth.uid() = ride.host_id
      or private.is_ride_member(p_ride_id, auth.uid())
    )
  order by
    case when member.role = 'host' then 0 else 1 end,
    member.joined_at,
    member.user_id;
$$;

create or replace function public.get_ride_requests(p_ride_id uuid)
returns table (
  id uuid,
  ride_id uuid,
  requester_id uuid,
  requester_display_name text,
  requester_handle text,
  requester_avatar_path text,
  status text,
  created_at timestamptz,
  responded_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    request.id,
    request.ride_id,
    request.requester_id,
    requester.display_name,
    requester.handle,
    requester.avatar_path,
    request.status,
    request.created_at,
    request.responded_at
  from public.ride_join_requests as request
  join public.rides as ride on ride.id = request.ride_id
  join public.profiles as requester on requester.id = request.requester_id
  where request.ride_id = p_ride_id
    and auth.uid() is not null
    and private.can_account_use_core(auth.uid())
    and private.can_account_use_core(request.requester_id)
    and private.can_account_use_core(ride.host_id)
    and not private.is_blocked_between(auth.uid(), ride.host_id)
    and not private.is_blocked_between(auth.uid(), request.requester_id)
    and (
      auth.uid() = ride.host_id
      or auth.uid() = request.requester_id
    )
  order by request.created_at, request.id;
$$;

create or replace function public.request_ride(
  p_ride_id uuid,
  p_idempotency_key uuid
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  ride_record public.rides%rowtype;
  request_id uuid;
  member_count integer;
  v_request_hash text;
  v_stored_request_hash text;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_ride_id is null or p_idempotency_key is null then
    raise exception using errcode = '22004', message = 'ride and idempotency key are required';
  end if;

  v_request_hash := private.command_request_hash(
    pg_catalog.jsonb_build_object('ride_id', p_ride_id)
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      current_user_id::text || ':request_ride:' || p_idempotency_key::text,
      0
    )
  );

  select receipt.resource_id, receipt.request_hash
  into request_id, v_stored_request_hash
  from private.command_receipts as receipt
  where receipt.user_id = current_user_id
    and receipt.command_name = 'request_ride'
    and receipt.idempotency_key = p_idempotency_key;
  if found then
    if v_stored_request_hash is distinct from v_request_hash then
      raise exception using errcode = '22023', message = 'idempotency key payload mismatch';
    end if;
    return request_id;
  end if;

  perform private.consume_command_rate_limit(
    current_user_id, 'request_ride', 30, interval '1 hour'
  );

  select * into ride_record from public.rides where id = p_ride_id for update;
  if
    not found
    or ride_record.status <> 'scheduled'
    or ride_record.starts_at <= statement_timestamp()
    or not private.can_discover_ride(current_user_id, p_ride_id)
  then
    raise exception using errcode = '42501', message = 'ride unavailable';
  end if;
  if ride_record.host_id = current_user_id
    or private.is_ride_member(p_ride_id, current_user_id)
  then
    raise exception using errcode = '23514', message = 'already participating';
  end if;

  select count(*)::integer into member_count
  from public.ride_members where ride_id = p_ride_id;
  if member_count >= ride_record.capacity then
    raise exception using errcode = '23514', message = 'ride is full';
  end if;

  insert into public.ride_join_requests (
    ride_id,
    requester_id,
    status,
    responded_by,
    responded_at
  ) values (
    p_ride_id,
    current_user_id,
    'pending',
    null,
    null
  )
  on conflict (ride_id, requester_id) do update
  set status = 'pending', responded_by = null, responded_at = null
  returning id into request_id;

  insert into private.command_receipts (
    user_id, command_name, idempotency_key, resource_id, request_hash
  ) values (
    current_user_id, 'request_ride', p_idempotency_key, request_id, v_request_hash
  );

  return request_id;
end;
$$;

create or replace function public.respond_ride_request(
  p_request_id uuid,
  p_accept boolean,
  p_idempotency_key uuid
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  request_record public.ride_join_requests%rowtype;
  ride_record public.rides%rowtype;
  member_count integer;
  prior_resource_id uuid;
  v_request_hash text;
  v_stored_request_hash text;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_request_id is null or p_accept is null or p_idempotency_key is null then
    raise exception using errcode = '22004', message = 'response fields are required';
  end if;

  v_request_hash := private.command_request_hash(
    pg_catalog.jsonb_build_object(
      'request_id', p_request_id,
      'accept', p_accept
    )
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      current_user_id::text || ':respond_ride_request:' || p_idempotency_key::text,
      0
    )
  );

  select receipt.resource_id, receipt.request_hash
  into prior_resource_id, v_stored_request_hash
  from private.command_receipts as receipt
  where receipt.user_id = current_user_id
    and receipt.command_name = 'respond_ride_request'
    and receipt.idempotency_key = p_idempotency_key;
  if found then
    if v_stored_request_hash is distinct from v_request_hash then
      raise exception using errcode = '22023', message = 'idempotency key payload mismatch';
    end if;
    return prior_resource_id;
  end if;

  perform private.consume_command_rate_limit(
    current_user_id, 'respond_ride_request', 60, interval '1 hour'
  );

  select * into request_record
  from public.ride_join_requests
  where id = p_request_id
  for update;
  if not found or request_record.status <> 'pending' then
    raise exception using errcode = '23514', message = 'request is not pending';
  end if;

  select * into ride_record
  from public.rides
  where id = request_record.ride_id
  for update;
  if ride_record.host_id <> current_user_id then
    raise exception using errcode = '42501', message = 'only the host can respond';
  end if;
  if p_accept and (
    ride_record.status <> 'scheduled'
    or ride_record.starts_at <= statement_timestamp()
  ) then
    raise exception using errcode = '23514', message = 'ride can no longer accept participants';
  end if;
  if private.is_blocked_between(current_user_id, request_record.requester_id) then
    raise exception using errcode = '42501', message = 'relationship unavailable';
  end if;
  if (
    private.is_minor_account(current_user_id)
    or private.is_minor_account(request_record.requester_id)
  ) and not private.are_friends(current_user_id, request_record.requester_id) then
    raise exception using errcode = '42501', message = 'minor rides require friendship';
  end if;

  if p_accept then
    select count(*)::integer into member_count
    from public.ride_members where ride_id = ride_record.id;
    if member_count >= ride_record.capacity then
      raise exception using errcode = '23514', message = 'ride is full';
    end if;

    insert into public.ride_members (ride_id, user_id, role)
    values (ride_record.id, request_record.requester_id, 'participant')
    on conflict (ride_id, user_id) do nothing;
  end if;

  update public.ride_join_requests
  set
    status = case when p_accept then 'accepted' else 'declined' end,
    responded_by = current_user_id,
    responded_at = now()
  where id = p_request_id;

  insert into private.command_receipts (
    user_id, command_name, idempotency_key, resource_id, request_hash
  ) values (
    current_user_id,
    'respond_ride_request',
    p_idempotency_key,
    p_request_id,
    v_request_hash
  );

  return p_request_id;
end;
$$;

create or replace function public.leave_ride(
  p_ride_id uuid,
  p_idempotency_key uuid
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  prior_resource_id uuid;
  v_request_hash text;
  v_stored_request_hash text;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_ride_id is null or p_idempotency_key is null then
    raise exception using errcode = '22004', message = 'ride and idempotency key are required';
  end if;

  v_request_hash := private.command_request_hash(
    pg_catalog.jsonb_build_object('ride_id', p_ride_id)
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      current_user_id::text || ':leave_ride:' || p_idempotency_key::text,
      0
    )
  );

  select receipt.resource_id, receipt.request_hash
  into prior_resource_id, v_stored_request_hash
  from private.command_receipts as receipt
  where receipt.user_id = current_user_id
    and receipt.command_name = 'leave_ride'
    and receipt.idempotency_key = p_idempotency_key;
  if found then
    if v_stored_request_hash is distinct from v_request_hash then
      raise exception using errcode = '22023', message = 'idempotency key payload mismatch';
    end if;
    return prior_resource_id;
  end if;

  perform private.consume_command_rate_limit(
    current_user_id, 'leave_ride', 30, interval '1 hour'
  );
  if exists (
    select 1 from public.rides
    where id = p_ride_id and host_id = current_user_id
  ) then
    raise exception using errcode = '23514', message = 'hosts must cancel the ride';
  end if;
  if not exists (
    select 1
    from public.ride_members
    where ride_id = p_ride_id and user_id = current_user_id
  ) and not exists (
    select 1
    from public.ride_join_requests
    where ride_id = p_ride_id
      and requester_id = current_user_id
      and status in ('pending', 'accepted')
  ) then
    raise exception using errcode = '42501', message = 'ride participation unavailable';
  end if;

  delete from public.ride_members
  where ride_id = p_ride_id and user_id = current_user_id;

  update public.ride_join_requests
  set status = 'cancelled', responded_by = null, responded_at = now()
  where ride_id = p_ride_id
    and requester_id = current_user_id
    and status in ('pending', 'accepted');

  insert into private.command_receipts (
    user_id, command_name, idempotency_key, resource_id, request_hash
  ) values (
    current_user_id, 'leave_ride', p_idempotency_key, p_ride_id, v_request_hash
  );

  return p_ride_id;
end;
$$;

create or replace function public.cancel_ride(
  p_ride_id uuid,
  p_idempotency_key uuid
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  ride_status text;
  prior_resource_id uuid;
  v_request_hash text;
  v_stored_request_hash text;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_ride_id is null or p_idempotency_key is null then
    raise exception using errcode = '22004', message = 'ride and idempotency key are required';
  end if;

  v_request_hash := private.command_request_hash(
    pg_catalog.jsonb_build_object('ride_id', p_ride_id)
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      current_user_id::text || ':cancel_ride:' || p_idempotency_key::text,
      0
    )
  );

  select receipt.resource_id, receipt.request_hash
  into prior_resource_id, v_stored_request_hash
  from private.command_receipts as receipt
  where receipt.user_id = current_user_id
    and receipt.command_name = 'cancel_ride'
    and receipt.idempotency_key = p_idempotency_key;
  if found then
    if v_stored_request_hash is distinct from v_request_hash then
      raise exception using errcode = '22023', message = 'idempotency key payload mismatch';
    end if;
    return prior_resource_id;
  end if;

  perform private.consume_command_rate_limit(
    current_user_id, 'cancel_ride', 20, interval '1 day'
  );

  select status into ride_status
  from public.rides
  where id = p_ride_id and host_id = current_user_id
  for update;
  if not found then
    raise exception using errcode = '42501', message = 'ride unavailable';
  end if;
  if ride_status = 'completed' then
    raise exception using errcode = '23514', message = 'completed ride cannot be cancelled';
  end if;

  update public.rides
  set status = 'cancelled'
  where id = p_ride_id and status in ('scheduled', 'active');

  update public.ride_join_requests
  set status = 'cancelled', responded_by = null, responded_at = now()
  where ride_id = p_ride_id and status = 'pending';

  delete from private.ride_details where ride_id = p_ride_id;

  insert into private.command_receipts (
    user_id, command_name, idempotency_key, resource_id, request_hash
  ) values (
    current_user_id, 'cancel_ride', p_idempotency_key, p_ride_id, v_request_hash
  );

  return p_ride_id;
end;
$$;

revoke all on function public.create_ride(text, text, timestamptz, integer, text, text, text, uuid) from public, anon;
revoke all on function public.get_ride_feed(text, integer) from public, anon;
revoke all on function public.get_ride_detail(uuid) from public, anon;
revoke all on function public.get_ride_members(uuid) from public, anon;
revoke all on function public.get_ride_requests(uuid) from public, anon;
revoke all on function public.request_ride(uuid, uuid) from public, anon;
revoke all on function public.respond_ride_request(uuid, boolean, uuid) from public, anon;
revoke all on function public.leave_ride(uuid, uuid) from public, anon;
revoke all on function public.cancel_ride(uuid, uuid) from public, anon;

grant execute on function public.create_ride(text, text, timestamptz, integer, text, text, text, uuid) to authenticated;
grant execute on function public.get_ride_feed(text, integer) to authenticated;
grant execute on function public.get_ride_detail(uuid) to authenticated;
grant execute on function public.get_ride_members(uuid) to authenticated;
grant execute on function public.get_ride_requests(uuid) to authenticated;
grant execute on function public.request_ride(uuid, uuid) to authenticated;
grant execute on function public.respond_ride_request(uuid, boolean, uuid) to authenticated;
grant execute on function public.leave_ride(uuid, uuid) to authenticated;
grant execute on function public.cancel_ride(uuid, uuid) to authenticated;
