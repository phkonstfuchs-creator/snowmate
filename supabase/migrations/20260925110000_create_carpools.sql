-- Carpool board on the same friend graph as rides, with a stricter rule
-- set, because this is about getting into a car with someone:
--
-- - no public carpools at all
-- - friends of friends see a post only when both sides are adults
-- - the exact departure point is visible to the author, confirmed
--   friends and people whose request the author accepted
-- - seats are counted under a row lock when the author accepts
--
-- As with rides, clients never read the tables; list_carpools() is the
-- only read path and every write besides posting is a function.

create table public.carpools (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  -- driver: offers seats; rider: looks for one
  role text not null,
  resort text not null,
  city text not null,
  ride_date date not null,
  departure_point text not null,
  departure_time time not null,
  -- driver: seats offered; rider: seats needed
  seats smallint not null,
  note text,
  created_at timestamptz not null default now(),

  constraint carpools_role_value check (role in ('driver', 'rider')),
  constraint carpools_resort_format check (
    resort = btrim(resort) and char_length(resort) between 2 and 60
  ),
  constraint carpools_city_value check (city in ('innsbruck', 'salzburg')),
  constraint carpools_departure_point_format check (
    departure_point = btrim(departure_point)
    and char_length(departure_point) between 2 and 120
  ),
  constraint carpools_seats_range check (seats between 1 and 8),
  constraint carpools_note_length check (note is null or char_length(note) <= 280)
);

create index carpools_author_idx on public.carpools (author_id);
create index carpools_date_idx on public.carpools (ride_date);

-- On a driver post a request asks for a seat; on a rider post it offers
-- a lift. Either way the author decides.
create table public.carpool_requests (
  carpool_id uuid not null references public.carpools (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),

  primary key (carpool_id, user_id),
  constraint carpool_requests_status_value check (status in ('pending', 'accepted'))
);

create index carpool_requests_user_idx on public.carpool_requests (user_id);

alter table public.carpools enable row level security;
alter table public.carpools force row level security;
alter table public.carpool_requests enable row level security;
alter table public.carpool_requests force row level security;

revoke all on table public.carpools from public, anon, authenticated;
revoke all on table public.carpool_requests from public, anon, authenticated;

grant insert (
  role,
  resort,
  city,
  ride_date,
  departure_point,
  departure_time,
  seats,
  note
) on table public.carpools to authenticated;

create policy "carpools_insert_as_self"
  on public.carpools
  for insert
  to authenticated
  with check ((select auth.uid()) = author_id);

create or replace function private.can_see_carpool(viewer uuid, pool public.carpools)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    viewer = pool.author_id
    or exists (
      select 1 from public.carpool_requests cr
      where cr.carpool_id = pool.id and cr.user_id = viewer
    )
    or private.are_friends(viewer, pool.author_id)
    or (
      private.are_friends_of_friends(viewer, pool.author_id)
      and not exists (
        select 1 from public.profiles p
        where p.id in (viewer, pool.author_id) and p.is_minor
      )
    );
$$;

create or replace function private.can_see_departure_point(viewer uuid, pool public.carpools)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    viewer = pool.author_id
    or private.are_friends(viewer, pool.author_id)
    or exists (
      select 1 from public.carpool_requests cr
      where cr.carpool_id = pool.id and cr.user_id = viewer and cr.status = 'accepted'
    );
$$;

revoke all on function private.can_see_carpool(uuid, public.carpools) from public, anon, authenticated;
revoke all on function private.can_see_departure_point(uuid, public.carpools) from public, anon, authenticated;

create or replace function public.list_carpools(include_past boolean default false)
returns table (
  id uuid,
  author_id uuid,
  author_display_name text,
  author_handle text,
  role text,
  resort text,
  city text,
  ride_date date,
  departure_point text,
  departure_point_locked boolean,
  departure_time time,
  seats smallint,
  seats_taken integer,
  note text,
  created_at timestamptz,
  is_author boolean,
  my_request text,
  requests jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  viewer uuid := auth.uid();
begin
  if viewer is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  return query
  select
    c.id,
    c.author_id,
    p.display_name,
    p.handle,
    c.role,
    c.resort,
    c.city,
    c.ride_date,
    case when unlocked.ok then c.departure_point end,
    not unlocked.ok,
    c.departure_time,
    c.seats,
    (
      select count(*)::integer from public.carpool_requests cr
      where cr.carpool_id = c.id and cr.status = 'accepted'
    ),
    c.note,
    c.created_at,
    c.author_id = viewer,
    (
      select cr.status from public.carpool_requests cr
      where cr.carpool_id = c.id and cr.user_id = viewer
    ),
    -- Only the author sees who asked.
    case when c.author_id = viewer then coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'user_id', rp.id,
          'display_name', rp.display_name,
          'handle', rp.handle,
          'status', cr.status
        )
        order by cr.created_at
      )
      from public.carpool_requests cr
      join public.profiles rp on rp.id = cr.user_id
      where cr.carpool_id = c.id
    ), '[]'::jsonb) else '[]'::jsonb end
  from public.carpools c
  join public.profiles p on p.id = c.author_id
  cross join lateral (
    select private.can_see_departure_point(viewer, c) as ok
  ) unlocked
  where (include_past or c.ride_date >= private.local_today())
    and private.can_see_carpool(viewer, c)
  order by c.ride_date, c.departure_time;
end;
$$;

create or replace function public.request_carpool(target_carpool uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := auth.uid();
  pool public.carpools;
begin
  if viewer is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select * into pool from public.carpools c where c.id = target_carpool;

  if not found or not private.can_see_carpool(viewer, pool) then
    return 'not_found';
  end if;

  if pool.author_id = viewer then
    return 'own';
  end if;

  if pool.ride_date < private.local_today() then
    return 'past';
  end if;

  insert into public.carpool_requests (carpool_id, user_id)
  values (target_carpool, viewer)
  on conflict do nothing;

  return case when found then 'requested' else 'already_requested' end;
end;
$$;

create or replace function public.withdraw_carpool_request(target_carpool uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  delete from public.carpool_requests cr
  where cr.carpool_id = target_carpool and cr.user_id = auth.uid();

  return found;
end;
$$;

-- The author accepts or declines a request. Accepting on a driver post
-- takes a seat, checked under a row lock.
create or replace function public.respond_carpool_request(
  target_carpool uuid,
  requester uuid,
  accept boolean
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := auth.uid();
  pool public.carpools;
  taken integer;
begin
  if viewer is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select * into pool from public.carpools c
  where c.id = target_carpool and c.author_id = viewer
  for update;

  if not found then
    return 'not_found';
  end if;

  if not accept then
    delete from public.carpool_requests cr
    where cr.carpool_id = target_carpool and cr.user_id = requester;
    return case when found then 'declined' else 'not_found' end;
  end if;

  if pool.role = 'driver' then
    select count(*) into taken from public.carpool_requests cr
    where cr.carpool_id = target_carpool and cr.status = 'accepted';

    if taken >= pool.seats then
      return 'full';
    end if;
  end if;

  update public.carpool_requests cr
  set status = 'accepted'
  where cr.carpool_id = target_carpool and cr.user_id = requester and cr.status = 'pending';

  return case when found then 'accepted' else 'not_found' end;
end;
$$;

create or replace function public.cancel_carpool(target_carpool uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  delete from public.carpools c
  where c.id = target_carpool and c.author_id = auth.uid();

  return found;
end;
$$;

revoke all on function public.list_carpools(boolean) from public, anon;
revoke all on function public.request_carpool(uuid) from public, anon;
revoke all on function public.withdraw_carpool_request(uuid) from public, anon;
revoke all on function public.respond_carpool_request(uuid, uuid, boolean) from public, anon;
revoke all on function public.cancel_carpool(uuid) from public, anon;
grant execute on function public.list_carpools(boolean) to authenticated;
grant execute on function public.request_carpool(uuid) to authenticated;
grant execute on function public.withdraw_carpool_request(uuid) to authenticated;
grant execute on function public.respond_carpool_request(uuid, uuid, boolean) to authenticated;
grant execute on function public.cancel_carpool(uuid) to authenticated;
