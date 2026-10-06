-- Season leaderboards (ADR 0027, spec leaderboards).
--
-- * Built only from saved ski-day summaries (ADR 0026) of the current
--   season (1 September, Vienna time, onwards).
-- * Friends: you and your confirmed friends, unless a friend switched
--   "show me to friends" off. A block hides both ways.
-- * Region: only people who opted in, in the caller's region. People
--   under 18 appear there without name, handle or id. A block hides both
--   ways.
-- * Clients still never read ski_days; this function returns totals.

alter table public.profiles
  add column leaderboard_friends boolean not null default true,
  add column leaderboard_region boolean not null default false;

grant update (leaderboard_friends, leaderboard_region) on table public.profiles to authenticated;

create or replace function private.season_start()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select make_timestamptz(
    (extract(year from now() at time zone 'Europe/Vienna')::int
      - case when extract(month from now() at time zone 'Europe/Vienna') < 9 then 1 else 0 end),
    9, 1, 0, 0, 0, 'Europe/Vienna');
$$;

revoke all on function private.season_start() from public, anon, authenticated;

create or replace function public.leaderboard(scope text, metric text)
returns table (
  rank integer,
  user_id uuid,
  display_name text,
  handle text,
  value numeric,
  is_me boolean,
  anonymous boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  my_city text;
begin
  if me is null or scope not in ('friends', 'region') or metric not in ('vertical', 'distance', 'days', 'speed') then
    return;
  end if;

  select p.city into my_city from public.profiles p where p.id = me;

  return query
  with members as (
    select p.id, p.display_name, p.handle, p.is_minor
    from public.profiles p
    where (
      scope = 'friends' and (
        p.id = me
        or (p.leaderboard_friends and private.are_friends(p.id, me) and not private.is_blocked(p.id, me))
      )
    ) or (
      scope = 'region' and my_city is not null and p.city = my_city and p.leaderboard_region
      and (p.id = me or not private.is_blocked(p.id, me))
    )
  ),
  totals as (
    select m.id, m.display_name, m.handle, m.is_minor,
      case metric
        when 'vertical' then sum(d.vertical_m)::numeric
        when 'distance' then sum(d.distance_m)::numeric
        when 'days' then count(*)::numeric
        else max(d.max_speed_kmh)
      end as total
    from members m
    join public.ski_days d on d.user_id = m.id and d.started_at >= private.season_start()
    group by m.id, m.display_name, m.handle, m.is_minor
  ),
  ranked as (
    select (rank() over (order by t.total desc))::int as position, t.*
    from totals t
  )
  select r.position,
    case when r.id = me or not (scope = 'region' and r.is_minor) then r.id end,
    case when r.id = me or not (scope = 'region' and r.is_minor) then r.display_name end,
    case when r.id = me or not (scope = 'region' and r.is_minor) then r.handle end,
    r.total,
    r.id = me,
    r.id <> me and scope = 'region' and r.is_minor
  from ranked r
  where r.position <= 20 or r.id = me
  order by r.position, r.display_name nulls last;
end;
$$;

revoke all on function public.leaderboard(text, text) from public, anon;
grant execute on function public.leaderboard(text, text) to authenticated;
