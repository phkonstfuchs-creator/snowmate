create table public.resorts (
  id text primary key,
  name text not null unique,
  city text not null,
  timezone text not null default 'Europe/Vienna',
  center_latitude double precision not null,
  center_longitude double precision not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resorts_id_format check (id ~ '^[a-z0-9-]{2,64}$'),
  constraint resorts_city_value check (city in ('innsbruck', 'salzburg')),
  constraint resorts_latitude_range check (center_latitude between -90 and 90),
  constraint resorts_longitude_range check (center_longitude between -180 and 180),
  unique (id, city)
);

create index resorts_active_city on public.resorts (city, name) where is_active;

create trigger resorts_set_updated_at
  before update on public.resorts
  for each row execute function private.set_updated_at();

alter table public.resorts enable row level security;
alter table public.resorts force row level security;
revoke all on table public.resorts from public, anon, authenticated;
grant select on table public.resorts to authenticated;

create policy "resorts_select_active"
  on public.resorts
  for select
  to authenticated
  using (is_active);
