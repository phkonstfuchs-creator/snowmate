-- Age from a self-declared birth date (ADR 0012, spec age-from-birth-date).
--
-- * birth_date is set once by its owner through set_my_birth_date(); the
--   column is not in the update grant, so it cannot be changed afterwards
--   from a client. Corrections go through support.
-- * is_minor follows birth_date whenever birth_date changes. Without a
--   birth date it stays true, the safe default. The operator can still
--   set is_minor directly (e.g. after an ID check).
-- * Someone who turns 18 is switched by refresh_my_age(), which the app
--   calls on every signed-in page. Until then they are treated as a minor,
--   which only ever restricts.
-- * Under 14 is refused: the age of digital consent in Austria.
-- * Only the owner can read birth_date (profiles RLS); no function shares
--   it with anyone else. export_my_data() includes it.

alter table public.profiles add column birth_date date;

alter table public.profiles
  add constraint profiles_birth_date_range check (
    birth_date is null or birth_date >= date '1900-01-01'
  );

comment on column public.profiles.birth_date is
  'Self-declared, set once via set_my_birth_date(). Visible to the owner only.';

create or replace function private.is_adult_on(born date, on_day date)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select born is not null and born <= (on_day - interval '18 years')::date;
$$;

revoke all on function private.is_adult_on(date, date) from public, anon, authenticated;

create or replace function private.derive_is_minor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.birth_date is distinct from old.birth_date then
    new.is_minor = not private.is_adult_on(new.birth_date, private.local_today());
  end if;
  return new;
end;
$$;

revoke all on function private.derive_is_minor() from public, anon, authenticated;

create trigger profiles_derive_is_minor
  before insert or update of birth_date on public.profiles
  for each row
  execute function private.derive_is_minor();

-- Returns: set | already_set | too_young | invalid | unauthenticated
create or replace function public.set_my_birth_date(p_birth_date date)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  today date := private.local_today();
begin
  if me is null then
    return 'unauthenticated';
  end if;

  if p_birth_date is null
    or p_birth_date > today
    or p_birth_date < (today - interval '100 years')::date then
    return 'invalid';
  end if;

  if p_birth_date > (today - interval '14 years')::date then
    return 'too_young';
  end if;

  update public.profiles
  set birth_date = p_birth_date
  where id = me and birth_date is null;

  if not found then
    return 'already_set';
  end if;

  return 'set';
end;
$$;

revoke all on function public.set_my_birth_date(date) from public, anon;
grant execute on function public.set_my_birth_date(date) to authenticated;

-- Flips the caller to adult once their 18th birthday has come. Never
-- flips anyone back to minor and never touches a row without a birth date.
create or replace function public.refresh_my_age()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
  set is_minor = false
  where id = auth.uid()
    and is_minor
    and private.is_adult_on(birth_date, private.local_today());
$$;

revoke all on function public.refresh_my_age() from public, anon;
grant execute on function public.refresh_my_age() to authenticated;
