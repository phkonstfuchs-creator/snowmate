-- Profile data at sign-up and several riding styles (ADR 0014).
--
-- * riding_styles holds one to three of chill / park / off-piste.
--   ability_level stays as the primary style (the first one), so rides,
--   completion and existing clients keep working; a trigger keeps the two
--   in step whichever one a client writes.
-- * Sign-up sends name, handle, region, styles and birth date as user
--   metadata. The profile trigger copies what passes the same rules the
--   profile form enforces and silently leaves out what does not (a taken
--   handle, an invalid value), so a bad field never blocks the account.
--   Metadata is client-supplied and therefore validated here, not trusted.

alter table public.profiles
  add column riding_styles text[] not null default '{}';

alter table public.profiles
  add constraint profiles_riding_styles_value check (
    riding_styles <@ array['chill', 'park', 'off-piste']::text[]
    and cardinality(riding_styles) <= 3
  );

update public.profiles
set riding_styles = array[ability_level]
where ability_level is not null and cardinality(riding_styles) = 0;

grant update (riding_styles) on table public.profiles to authenticated;

create or replace function private.sync_riding_styles()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Deduplicate, keep the order the person chose.
  new.riding_styles := coalesce((
    select array_agg(s order by first_pos)
    from (
      select s, min(pos) as first_pos
      from unnest(new.riding_styles) with ordinality as u(s, pos)
      group by s
    ) d
  ), '{}');

  if tg_op = 'UPDATE'
     and new.riding_styles is not distinct from old.riding_styles
     and new.ability_level is distinct from old.ability_level then
    -- An older client changed only the single style.
    new.riding_styles := case when new.ability_level is null then '{}' else array[new.ability_level] end;
  elsif cardinality(new.riding_styles) > 0 then
    new.ability_level := new.riding_styles[1];
  elsif new.ability_level is not null then
    new.riding_styles := array[new.ability_level];
  end if;

  return new;
end;
$$;

revoke all on function private.sync_riding_styles() from public, anon, authenticated;

-- Runs before the onboarding-completed trigger (alphabetical order of
-- trigger names), so a profile completed through riding_styles alone
-- counts as complete.
create trigger profiles_a_sync_riding_styles
  before insert or update of riding_styles, ability_level on public.profiles
  for each row
  execute function private.sync_riding_styles();

-- ── Profile from sign-up metadata ───────────────────────────────────

create or replace function private.apply_signup_metadata(account uuid, meta jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(meta ->> 'display_name', ''));
  v_handle text := lower(btrim(coalesce(meta ->> 'handle', '')));
  v_city text := meta ->> 'city';
  v_styles text[];
  v_birth date;
  today date := private.local_today();
begin
  if meta is null or jsonb_typeof(meta) <> 'object' then
    return;
  end if;

  if jsonb_typeof(meta -> 'riding_styles') = 'array' then
    select array_agg(s) into v_styles
    from (
      select s from jsonb_array_elements_text(meta -> 'riding_styles') as e(s)
      where s in ('chill', 'park', 'off-piste')
      limit 3
    ) x;
  end if;

  -- Each field on its own: one invalid value does not drop the others.
  if char_length(v_name) between 2 and 50 then
    begin
      update public.profiles set display_name = v_name where id = account;
    exception when check_violation then null;
    end;
  end if;

  if v_handle ~ '^[a-z0-9_]{3,20}$' then
    begin
      update public.profiles set handle = v_handle where id = account;
    exception when check_violation or unique_violation then null;
    end;
  end if;

  if v_city in ('innsbruck', 'salzburg') then
    update public.profiles set city = v_city where id = account;
  end if;

  if cardinality(v_styles) > 0 then
    update public.profiles set riding_styles = v_styles where id = account;
  end if;

  begin
    v_birth := (meta ->> 'birth_date')::date;
  exception when others then
    v_birth := null;
  end;

  -- Same rules as set_my_birth_date(): 14 or older, not in the future,
  -- at most 100 years back.
  if v_birth is not null
     and v_birth <= (today - interval '14 years')::date
     and v_birth >= (today - interval '100 years')::date then
    update public.profiles set birth_date = v_birth where id = account and birth_date is null;
  end if;
end;
$$;

revoke all on function private.apply_signup_metadata(uuid, jsonb) from public, anon, authenticated;

create or replace function private.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  -- Never let a profile detail stop the account from being created.
  begin
    perform private.apply_signup_metadata(new.id, new.raw_user_meta_data);
  exception when others then
    null;
  end;

  return new;
end;
$$;

-- Lets the sign-up form say "handle taken" before the account exists.
-- Handles are the public way to add a friend, so this reveals nothing a
-- friend request does not; the app limits how often a visitor may ask.
create or replace function public.handle_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select lower(btrim(candidate)) ~ '^[a-z0-9_]{3,20}$'
    and lower(btrim(candidate)) not in ('admin', 'support', 'snowmate')
    and not exists (
      select 1 from public.profiles p where p.handle = lower(btrim(candidate))
    );
$$;

revoke all on function public.handle_available(text) from public;
grant execute on function public.handle_available(text) to anon, authenticated;
