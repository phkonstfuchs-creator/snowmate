create table public.carpools (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  resort_id text not null references public.resorts (id),
  city text not null,
  direction text not null,
  departs_at timestamptz not null,
  seat_capacity smallint not null,
  audience text not null default 'friends',
  note text not null default '',
  status text not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint carpools_city_value check (city in ('innsbruck', 'salzburg')),
  constraint carpools_direction_value check (direction in ('driver', 'rider')),
  constraint carpools_seat_capacity_range check (seat_capacity between 1 and 8),
  constraint carpools_rider_capacity check (
    direction <> 'rider' or seat_capacity = 1
  ),
  constraint carpools_audience_value check (
    audience in ('friends', 'friends-of-friends')
  ),
  constraint carpools_note_safe check (
    char_length(note) <= 300
    and note !~ '[[:cntrl:]]'
    and note !~ U&'[\202A-\202E\2066-\2069]'
  ),
  constraint carpools_status_value check (
    status in ('scheduled', 'active', 'completed', 'cancelled')
  )
);

create index carpools_host_departs_at
  on public.carpools (host_id, departs_at desc);
create index carpools_city_departs_at
  on public.carpools (city, departs_at)
  where status in ('scheduled', 'active');
create index carpools_resort_departs_at
  on public.carpools (resort_id, departs_at)
  where status in ('scheduled', 'active');

create trigger carpools_set_updated_at
  before update on public.carpools
  for each row execute function private.set_updated_at();

create table private.carpool_details (
  carpool_id uuid primary key references public.carpools (id) on delete cascade,
  departure_point text not null,
  departure_latitude double precision,
  departure_longitude double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint carpool_details_departure_point_safe check (
    departure_point = btrim(departure_point)
    and char_length(departure_point) between 2 and 200
    and departure_point !~ '[[:cntrl:]]'
    and departure_point !~ U&'[\202A-\202E\2066-\2069]'
  ),
  constraint carpool_details_coordinates_complete check (
    (departure_latitude is null and departure_longitude is null)
    or (
      departure_latitude between -90 and 90
      and departure_longitude between -180 and 180
    )
  )
);

create trigger carpool_details_set_updated_at
  before update on private.carpool_details
  for each row execute function private.set_updated_at();

revoke all on table private.carpool_details from public, anon, authenticated;

create table public.carpool_members (
  carpool_id uuid not null references public.carpools (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (carpool_id, user_id)
);

create index carpool_members_user_id
  on public.carpool_members (user_id, carpool_id);

create table public.carpool_requests (
  id uuid primary key default gen_random_uuid(),
  carpool_id uuid not null references public.carpools (id) on delete cascade,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending',
  responded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint carpool_requests_status_value check (
    status in ('pending', 'accepted', 'declined', 'cancelled')
  ),
  constraint carpool_requests_response_complete check (
    (status = 'pending' and responded_by is null and responded_at is null)
    or (status = 'cancelled' and responded_by is null and responded_at is not null)
    or (
      status in ('accepted', 'declined')
      and responded_by is not null
      and responded_at is not null
    )
  ),
  unique (carpool_id, requester_id)
);

create index carpool_requests_carpool_status
  on public.carpool_requests (carpool_id, status, created_at);
create index carpool_requests_requester_status
  on public.carpool_requests (requester_id, status, created_at desc);

create trigger carpool_requests_set_updated_at
  before update on public.carpool_requests
  for each row execute function private.set_updated_at();

alter table public.carpools enable row level security;
alter table public.carpools force row level security;
alter table public.carpool_members enable row level security;
alter table public.carpool_members force row level security;
alter table public.carpool_requests enable row level security;
alter table public.carpool_requests force row level security;

revoke all on table public.carpools from public, anon, authenticated;
revoke all on table public.carpool_members from public, anon, authenticated;
revoke all on table public.carpool_requests from public, anon, authenticated;

create or replace function private.is_carpool_member(
  p_carpool_id uuid,
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
    from public.carpool_members as member
    join public.carpools as carpool on carpool.id = member.carpool_id
    where member.carpool_id = p_carpool_id
      and member.user_id = p_user_id
      and private.can_account_use_core(p_user_id)
      and private.can_account_use_core(carpool.host_id)
  );
$$;

create or replace function private.can_discover_carpool(
  p_viewer_id uuid,
  p_carpool_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.carpools as carpool
    where carpool.id = p_carpool_id
      and private.can_account_use_core(p_viewer_id)
      and private.can_account_use_core(carpool.host_id)
      and carpool.status in ('scheduled', 'active')
      and not private.is_blocked_between(p_viewer_id, carpool.host_id)
      and (
        p_viewer_id = carpool.host_id
        or private.is_carpool_member(carpool.id, p_viewer_id)
        or private.are_friends(p_viewer_id, carpool.host_id)
        or (
          carpool.audience = 'friends-of-friends'
          and not private.is_minor_account(p_viewer_id)
          and not private.is_minor_account(carpool.host_id)
          and private.are_friends_of_friends(p_viewer_id, carpool.host_id)
        )
      )
  );
$$;

create or replace function private.can_view_exact_carpool(
  p_viewer_id uuid,
  p_carpool_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.carpools as carpool
    where carpool.id = p_carpool_id
      and private.can_account_use_core(p_viewer_id)
      and private.can_account_use_core(carpool.host_id)
      and carpool.status in ('scheduled', 'active')
      and not private.is_blocked_between(p_viewer_id, carpool.host_id)
      and (
        p_viewer_id = carpool.host_id
        or private.are_friends(p_viewer_id, carpool.host_id)
        or (
          not private.is_minor_account(p_viewer_id)
          and not private.is_minor_account(carpool.host_id)
          and private.is_carpool_member(carpool.id, p_viewer_id)
        )
      )
  );
$$;

revoke all on function private.is_carpool_member(uuid, uuid)
  from public, anon, authenticated;
revoke all on function private.can_discover_carpool(uuid, uuid)
  from public, anon, authenticated;
revoke all on function private.can_view_exact_carpool(uuid, uuid)
  from public, anon, authenticated;

create policy "carpools_select_visible"
  on public.carpools
  for select
  to authenticated
  using (private.can_discover_carpool((select auth.uid()), id));

create policy "carpool_members_select_exact_audience"
  on public.carpool_members
  for select
  to authenticated
  using (private.can_view_exact_carpool((select auth.uid()), carpool_id));

create policy "carpool_requests_select_participating"
  on public.carpool_requests
  for select
  to authenticated
  using (
    requester_id = (select auth.uid())
    or exists (
      select 1
      from public.carpools
      where id = carpool_id and host_id = (select auth.uid())
    )
  );

create or replace function public.create_carpool(
  p_resort_id text,
  p_city text,
  p_role text,
  p_departs_at timestamptz,
  p_seat_capacity integer,
  p_audience text,
  p_note text,
  p_departure_point text,
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
  carpool_id uuid;
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
      'city', p_city,
      'role', p_role,
      'departs_at', p_departs_at,
      'seat_capacity', p_seat_capacity,
      'audience', p_audience,
      'note', btrim(p_note),
      'departure_point', btrim(p_departure_point)
    )
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      current_user_id::text || ':create_carpool:' || p_idempotency_key::text,
      0
    )
  );

  select receipt.resource_id, receipt.request_hash
  into carpool_id, v_stored_request_hash
  from private.command_receipts as receipt
  where receipt.user_id = current_user_id
    and receipt.command_name = 'create_carpool'
    and receipt.idempotency_key = p_idempotency_key;
  if found then
    if v_stored_request_hash is distinct from v_request_hash then
      raise exception using errcode = '22023', message = 'idempotency key payload mismatch';
    end if;
    return carpool_id;
  end if;

  perform private.consume_command_rate_limit(
    current_user_id, 'create_carpool', 10, interval '1 day'
  );

  if not exists (
    select 1
    from public.profiles
    where id = current_user_id and onboarding_completed
  ) then
    raise exception using errcode = '42501', message = 'completed profile required';
  end if;
  if not exists (
    select 1 from public.resorts where id = p_resort_id and is_active
  ) then
    raise exception using errcode = '23503', message = 'resort unavailable';
  end if;
  if p_departs_at <= now() or p_departs_at > now() + interval '90 days' then
    raise exception using errcode = '23514', message = 'departure date outside allowed range';
  end if;
  if private.is_minor_account(current_user_id)
    and p_audience <> 'friends'
  then
    raise exception using errcode = '23514', message = 'minor carpools are friends-only';
  end if;

  insert into public.carpools (
    host_id,
    resort_id,
    city,
    direction,
    departs_at,
    seat_capacity,
    audience,
    note
  ) values (
    current_user_id,
    p_resort_id,
    p_city,
    p_role,
    p_departs_at,
    p_seat_capacity,
    p_audience,
    btrim(p_note)
  ) returning id into carpool_id;

  insert into private.carpool_details (carpool_id, departure_point)
  values (carpool_id, btrim(p_departure_point));

  insert into private.command_receipts (
    user_id, command_name, idempotency_key, resource_id, request_hash
  ) values (
    current_user_id,
    'create_carpool',
    p_idempotency_key,
    carpool_id,
    v_request_hash
  );

  return carpool_id;
end;
$$;

create or replace function public.get_carpool_feed(
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
  role text,
  departs_at timestamptz,
  seat_capacity integer,
  available_seats integer,
  audience text,
  note text,
  status text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    carpool.id,
    carpool.host_id,
    host.display_name,
    host.handle,
    host.avatar_path,
    resort.id,
    resort.name,
    carpool.city,
    carpool.direction,
    carpool.departs_at,
    carpool.seat_capacity::integer,
    greatest(
      carpool.seat_capacity::integer - (
        select count(*)::integer
        from public.carpool_members
        where carpool_id = carpool.id
      ),
      0
    ),
    carpool.audience,
    carpool.note,
    carpool.status,
    carpool.created_at
  from public.carpools as carpool
  join public.resorts as resort on resort.id = carpool.resort_id
  join public.profiles as host on host.id = carpool.host_id
  where auth.uid() is not null
    and carpool.city = p_city
    and private.can_discover_carpool(auth.uid(), carpool.id)
    and (
      (carpool.status = 'scheduled' and carpool.departs_at > statement_timestamp())
      or carpool.status = 'active'
    )
  order by carpool.departs_at, carpool.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

create or replace function public.get_carpool_detail(p_carpool_id uuid)
returns table (
  id uuid,
  host_id uuid,
  host_display_name text,
  host_handle text,
  host_avatar_path text,
  resort_id text,
  resort_name text,
  city text,
  role text,
  departs_at timestamptz,
  seat_capacity integer,
  available_seats integer,
  audience text,
  note text,
  status text,
  created_at timestamptz,
  departure_point text,
  can_view_exact boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    carpool.id,
    carpool.host_id,
    host.display_name,
    host.handle,
    host.avatar_path,
    resort.id,
    resort.name,
    carpool.city,
    carpool.direction,
    carpool.departs_at,
    carpool.seat_capacity::integer,
    greatest(
      carpool.seat_capacity::integer - (
        select count(*)::integer
        from public.carpool_members
        where carpool_id = carpool.id
      ),
      0
    ),
    carpool.audience,
    carpool.note,
    carpool.status,
    carpool.created_at,
    case
      when detail.carpool_id is not null
        and private.can_view_exact_carpool(auth.uid(), carpool.id)
        then detail.departure_point
      else null
    end,
    detail.carpool_id is not null
      and private.can_view_exact_carpool(auth.uid(), carpool.id)
  from public.carpools as carpool
  join public.resorts as resort on resort.id = carpool.resort_id
  join public.profiles as host on host.id = carpool.host_id
  left join private.carpool_details as detail on detail.carpool_id = carpool.id
  where carpool.id = p_carpool_id
    and auth.uid() is not null
    and private.can_discover_carpool(auth.uid(), carpool.id);
$$;

create or replace function public.get_carpool_members(p_carpool_id uuid)
returns table (
  carpool_id uuid,
  user_id uuid,
  display_name text,
  handle text,
  avatar_path text,
  joined_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    member.carpool_id,
    member.user_id,
    profile.display_name,
    profile.handle,
    profile.avatar_path,
    member.joined_at
  from public.carpool_members as member
  join public.carpools as carpool on carpool.id = member.carpool_id
  join public.profiles as profile on profile.id = member.user_id
  where member.carpool_id = p_carpool_id
    and auth.uid() is not null
    and private.can_account_use_core(auth.uid())
    and private.can_account_use_core(member.user_id)
    and not private.is_blocked_between(auth.uid(), carpool.host_id)
    and not private.is_blocked_between(auth.uid(), member.user_id)
    and (
      auth.uid() = carpool.host_id
      or private.is_carpool_member(p_carpool_id, auth.uid())
    )
  order by member.joined_at, member.user_id;
$$;

create or replace function public.get_carpool_requests(p_carpool_id uuid)
returns table (
  id uuid,
  carpool_id uuid,
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
    request.carpool_id,
    request.requester_id,
    requester.display_name,
    requester.handle,
    requester.avatar_path,
    request.status,
    request.created_at,
    request.responded_at
  from public.carpool_requests as request
  join public.carpools as carpool on carpool.id = request.carpool_id
  join public.profiles as requester on requester.id = request.requester_id
  where request.carpool_id = p_carpool_id
    and auth.uid() is not null
    and private.can_account_use_core(auth.uid())
    and private.can_account_use_core(request.requester_id)
    and private.can_account_use_core(carpool.host_id)
    and not private.is_blocked_between(auth.uid(), carpool.host_id)
    and not private.is_blocked_between(auth.uid(), request.requester_id)
    and (
      auth.uid() = carpool.host_id
      or auth.uid() = request.requester_id
    )
  order by request.created_at, request.id;
$$;

create or replace function public.request_carpool(
  p_carpool_id uuid,
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
  carpool_record public.carpools%rowtype;
  request_id uuid;
  member_count integer;
  v_request_hash text;
  v_stored_request_hash text;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_carpool_id is null or p_idempotency_key is null then
    raise exception using errcode = '22004', message = 'carpool and idempotency key are required';
  end if;

  v_request_hash := private.command_request_hash(
    pg_catalog.jsonb_build_object('carpool_id', p_carpool_id)
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      current_user_id::text || ':request_carpool:' || p_idempotency_key::text,
      0
    )
  );

  select receipt.resource_id, receipt.request_hash
  into request_id, v_stored_request_hash
  from private.command_receipts as receipt
  where receipt.user_id = current_user_id
    and receipt.command_name = 'request_carpool'
    and receipt.idempotency_key = p_idempotency_key;
  if found then
    if v_stored_request_hash is distinct from v_request_hash then
      raise exception using errcode = '22023', message = 'idempotency key payload mismatch';
    end if;
    return request_id;
  end if;

  perform private.consume_command_rate_limit(
    current_user_id, 'request_carpool', 30, interval '1 hour'
  );

  select * into carpool_record
  from public.carpools
  where id = p_carpool_id
  for update;
  if
    not found
    or carpool_record.status <> 'scheduled'
    or carpool_record.departs_at <= statement_timestamp()
    or not private.can_discover_carpool(current_user_id, p_carpool_id)
  then
    raise exception using errcode = '42501', message = 'carpool unavailable';
  end if;
  if carpool_record.host_id = current_user_id
    or private.is_carpool_member(p_carpool_id, current_user_id)
  then
    raise exception using errcode = '23514', message = 'already participating';
  end if;

  select count(*)::integer into member_count
  from public.carpool_members
  where carpool_id = p_carpool_id;
  if member_count >= carpool_record.seat_capacity then
    raise exception using errcode = '23514', message = 'carpool is full';
  end if;

  insert into public.carpool_requests (
    carpool_id,
    requester_id,
    status,
    responded_by,
    responded_at
  ) values (
    p_carpool_id,
    current_user_id,
    'pending',
    null,
    null
  )
  on conflict (carpool_id, requester_id) do update
  set status = 'pending', responded_by = null, responded_at = null
  returning id into request_id;

  insert into private.command_receipts (
    user_id, command_name, idempotency_key, resource_id, request_hash
  ) values (
    current_user_id,
    'request_carpool',
    p_idempotency_key,
    request_id,
    v_request_hash
  );

  return request_id;
end;
$$;

create or replace function public.respond_carpool_request(
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
  request_record public.carpool_requests%rowtype;
  carpool_record public.carpools%rowtype;
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
      current_user_id::text || ':respond_carpool_request:' || p_idempotency_key::text,
      0
    )
  );

  select receipt.resource_id, receipt.request_hash
  into prior_resource_id, v_stored_request_hash
  from private.command_receipts as receipt
  where receipt.user_id = current_user_id
    and receipt.command_name = 'respond_carpool_request'
    and receipt.idempotency_key = p_idempotency_key;
  if found then
    if v_stored_request_hash is distinct from v_request_hash then
      raise exception using errcode = '22023', message = 'idempotency key payload mismatch';
    end if;
    return prior_resource_id;
  end if;

  perform private.consume_command_rate_limit(
    current_user_id, 'respond_carpool_request', 60, interval '1 hour'
  );

  select * into request_record
  from public.carpool_requests
  where id = p_request_id
  for update;
  if not found or request_record.status <> 'pending' then
    raise exception using errcode = '23514', message = 'request is not pending';
  end if;

  select * into carpool_record
  from public.carpools
  where id = request_record.carpool_id
  for update;
  if carpool_record.host_id <> current_user_id then
    raise exception using errcode = '42501', message = 'only the host can respond';
  end if;
  if p_accept and (
    carpool_record.status <> 'scheduled'
    or carpool_record.departs_at <= statement_timestamp()
  ) then
    raise exception using errcode = '23514', message = 'carpool can no longer accept participants';
  end if;
  if private.is_blocked_between(current_user_id, request_record.requester_id) then
    raise exception using errcode = '42501', message = 'relationship unavailable';
  end if;
  if (
    private.is_minor_account(current_user_id)
    or private.is_minor_account(request_record.requester_id)
  ) and not private.are_friends(current_user_id, request_record.requester_id) then
    raise exception using errcode = '42501', message = 'minor carpools require friendship';
  end if;

  if p_accept then
    select count(*)::integer into member_count
    from public.carpool_members
    where carpool_id = carpool_record.id;
    if member_count >= carpool_record.seat_capacity then
      raise exception using errcode = '23514', message = 'carpool is full';
    end if;

    insert into public.carpool_members (carpool_id, user_id)
    values (carpool_record.id, request_record.requester_id)
    on conflict (carpool_id, user_id) do nothing;
  end if;

  update public.carpool_requests
  set
    status = case when p_accept then 'accepted' else 'declined' end,
    responded_by = current_user_id,
    responded_at = now()
  where id = p_request_id;

  insert into private.command_receipts (
    user_id, command_name, idempotency_key, resource_id, request_hash
  ) values (
    current_user_id,
    'respond_carpool_request',
    p_idempotency_key,
    p_request_id,
    v_request_hash
  );

  return p_request_id;
end;
$$;

create or replace function public.leave_carpool(
  p_carpool_id uuid,
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
  if p_carpool_id is null or p_idempotency_key is null then
    raise exception using errcode = '22004', message = 'carpool and idempotency key are required';
  end if;

  v_request_hash := private.command_request_hash(
    pg_catalog.jsonb_build_object('carpool_id', p_carpool_id)
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      current_user_id::text || ':leave_carpool:' || p_idempotency_key::text,
      0
    )
  );

  select receipt.resource_id, receipt.request_hash
  into prior_resource_id, v_stored_request_hash
  from private.command_receipts as receipt
  where receipt.user_id = current_user_id
    and receipt.command_name = 'leave_carpool'
    and receipt.idempotency_key = p_idempotency_key;
  if found then
    if v_stored_request_hash is distinct from v_request_hash then
      raise exception using errcode = '22023', message = 'idempotency key payload mismatch';
    end if;
    return prior_resource_id;
  end if;

  perform private.consume_command_rate_limit(
    current_user_id, 'leave_carpool', 30, interval '1 hour'
  );
  if exists (
    select 1 from public.carpools
    where id = p_carpool_id and host_id = current_user_id
  ) then
    raise exception using errcode = '23514', message = 'hosts must cancel the carpool';
  end if;
  if not exists (
    select 1
    from public.carpool_members
    where carpool_id = p_carpool_id and user_id = current_user_id
  ) and not exists (
    select 1
    from public.carpool_requests
    where carpool_id = p_carpool_id
      and requester_id = current_user_id
      and status in ('pending', 'accepted')
  ) then
    raise exception using errcode = '42501', message = 'carpool participation unavailable';
  end if;

  delete from public.carpool_members
  where carpool_id = p_carpool_id and user_id = current_user_id;

  update public.carpool_requests
  set status = 'cancelled', responded_by = null, responded_at = now()
  where carpool_id = p_carpool_id
    and requester_id = current_user_id
    and status in ('pending', 'accepted');

  insert into private.command_receipts (
    user_id, command_name, idempotency_key, resource_id, request_hash
  ) values (
    current_user_id,
    'leave_carpool',
    p_idempotency_key,
    p_carpool_id,
    v_request_hash
  );

  return p_carpool_id;
end;
$$;

create or replace function public.cancel_carpool(
  p_carpool_id uuid,
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
  carpool_status text;
  prior_resource_id uuid;
  v_request_hash text;
  v_stored_request_hash text;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_carpool_id is null or p_idempotency_key is null then
    raise exception using errcode = '22004', message = 'carpool and idempotency key are required';
  end if;

  v_request_hash := private.command_request_hash(
    pg_catalog.jsonb_build_object('carpool_id', p_carpool_id)
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      current_user_id::text || ':cancel_carpool:' || p_idempotency_key::text,
      0
    )
  );

  select receipt.resource_id, receipt.request_hash
  into prior_resource_id, v_stored_request_hash
  from private.command_receipts as receipt
  where receipt.user_id = current_user_id
    and receipt.command_name = 'cancel_carpool'
    and receipt.idempotency_key = p_idempotency_key;
  if found then
    if v_stored_request_hash is distinct from v_request_hash then
      raise exception using errcode = '22023', message = 'idempotency key payload mismatch';
    end if;
    return prior_resource_id;
  end if;

  perform private.consume_command_rate_limit(
    current_user_id, 'cancel_carpool', 20, interval '1 day'
  );

  select status into carpool_status
  from public.carpools
  where id = p_carpool_id and host_id = current_user_id
  for update;
  if not found then
    raise exception using errcode = '42501', message = 'carpool unavailable';
  end if;
  if carpool_status = 'completed' then
    raise exception using errcode = '23514', message = 'completed carpool cannot be cancelled';
  end if;

  update public.carpools
  set status = 'cancelled'
  where id = p_carpool_id and status in ('scheduled', 'active');

  update public.carpool_requests
  set status = 'cancelled', responded_by = null, responded_at = now()
  where carpool_id = p_carpool_id and status = 'pending';

  delete from private.carpool_details where carpool_id = p_carpool_id;

  insert into private.command_receipts (
    user_id, command_name, idempotency_key, resource_id, request_hash
  ) values (
    current_user_id,
    'cancel_carpool',
    p_idempotency_key,
    p_carpool_id,
    v_request_hash
  );

  return p_carpool_id;
end;
$$;

revoke all on function public.create_carpool(
  text, text, text, timestamptz, integer, text, text, text, uuid
) from public, anon;
revoke all on function public.get_carpool_feed(text, integer) from public, anon;
revoke all on function public.get_carpool_detail(uuid) from public, anon;
revoke all on function public.get_carpool_members(uuid) from public, anon;
revoke all on function public.get_carpool_requests(uuid) from public, anon;
revoke all on function public.request_carpool(uuid, uuid) from public, anon;
revoke all on function public.respond_carpool_request(uuid, boolean, uuid)
  from public, anon;
revoke all on function public.leave_carpool(uuid, uuid) from public, anon;
revoke all on function public.cancel_carpool(uuid, uuid) from public, anon;

grant execute on function public.create_carpool(
  text, text, text, timestamptz, integer, text, text, text, uuid
) to authenticated;
grant execute on function public.get_carpool_feed(text, integer) to authenticated;
grant execute on function public.get_carpool_detail(uuid) to authenticated;
grant execute on function public.get_carpool_members(uuid) to authenticated;
grant execute on function public.get_carpool_requests(uuid) to authenticated;
grant execute on function public.request_carpool(uuid, uuid) to authenticated;
grant execute on function public.respond_carpool_request(uuid, boolean, uuid)
  to authenticated;
grant execute on function public.leave_carpool(uuid, uuid) to authenticated;
grant execute on function public.cancel_carpool(uuid, uuid) to authenticated;

create or replace function private.revoke_blocked_participation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.ride_members as member
  using public.rides as ride
  where member.ride_id = ride.id
    and member.role <> 'host'
    and (
      (ride.host_id = new.blocker_id and member.user_id = new.blocked_id)
      or (ride.host_id = new.blocked_id and member.user_id = new.blocker_id)
    );

  update public.ride_join_requests as request
  set status = 'cancelled', responded_by = null, responded_at = now()
  from public.rides as ride
  where request.ride_id = ride.id
    and request.status in ('pending', 'accepted')
    and (
      (ride.host_id = new.blocker_id and request.requester_id = new.blocked_id)
      or (ride.host_id = new.blocked_id and request.requester_id = new.blocker_id)
    );

  delete from public.carpool_members as member
  using public.carpools as carpool
  where member.carpool_id = carpool.id
    and (
      (carpool.host_id = new.blocker_id and member.user_id = new.blocked_id)
      or (carpool.host_id = new.blocked_id and member.user_id = new.blocker_id)
    );

  update public.carpool_requests as request
  set status = 'cancelled', responded_by = null, responded_at = now()
  from public.carpools as carpool
  where request.carpool_id = carpool.id
    and request.status in ('pending', 'accepted')
    and (
      (carpool.host_id = new.blocker_id and request.requester_id = new.blocked_id)
      or (carpool.host_id = new.blocked_id and request.requester_id = new.blocker_id)
    );

  return new;
end;
$$;

revoke all on function private.revoke_blocked_participation()
  from public, anon, authenticated;

create trigger blocks_revoke_participation
  after insert on public.blocks
  for each row execute function private.revoke_blocked_participation();
