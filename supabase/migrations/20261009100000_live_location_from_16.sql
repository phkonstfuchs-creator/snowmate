-- Live location only from 16 (ADR 0019, spec live-location).
--
-- Pistl is open from 14, the age of digital consent in Austria. A live
-- position is the most sensitive data the app holds, and in Germany,
-- where the operator sits, a child's own consent counts only from 16
-- (Art. 8 GDPR, no lower national age). So nobody under 16 shares a
-- position, wherever they live. Seeing confirmed friends' positions stays possible.
--
-- * Age comes from the self-declared birth date (ADR 0012). Without a
--   birth date, only an account the operator marked as adult may share.
-- * Positions already shared by someone under 16 are removed, and the
--   friends list never shows one.

create or replace function private.may_share_location(person uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = person
      and case
        when p.birth_date is not null then p.birth_date <= (private.local_today() - interval '16 years')::date
        else not p.is_minor
      end
  );
$$;

revoke all on function private.may_share_location(uuid) from public, anon, authenticated;

-- Returns: sharing | throttled | invalid | profile_incomplete | too_young | unauthenticated
create or replace function public.share_my_location(
  p_lat double precision,
  p_lng double precision,
  p_accuracy integer,
  p_minutes integer
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  existing public.live_locations;
  new_expiry timestamptz;
begin
  if me is null then
    return 'unauthenticated';
  end if;

  if not exists (select 1 from public.profiles p where p.id = me and p.onboarding_completed) then
    return 'profile_incomplete';
  end if;

  if not private.may_share_location(me) then
    delete from public.live_locations where user_id = me;
    return 'too_young';
  end if;

  if p_lat is null or p_lng is null
     or p_lat not between -90 and 90 or p_lng not between -180 and 180
     or (p_accuracy is not null and p_accuracy not between 0 and 100000)
     or (p_minutes is not null and p_minutes not between 5 and 720) then
    return 'invalid';
  end if;

  select * into existing from public.live_locations where user_id = me;

  if p_minutes is null then
    if existing.user_id is null or existing.expires_at <= now() then
      return 'invalid';
    end if;
    -- A refresh more often than every 10 s adds nothing.
    if existing.updated_at > now() - interval '10 seconds' then
      return 'throttled';
    end if;
    new_expiry := existing.expires_at;
  else
    new_expiry := now() + make_interval(mins => p_minutes);
  end if;

  insert into public.live_locations (user_id, lat, lng, accuracy_m, updated_at, expires_at)
  values (me, round(p_lat::numeric, 4)::double precision, round(p_lng::numeric, 4)::double precision,
          p_accuracy, now(), new_expiry)
  on conflict (user_id) do update
    set lat = excluded.lat,
        lng = excluded.lng,
        accuracy_m = excluded.accuracy_m,
        updated_at = excluded.updated_at,
        expires_at = excluded.expires_at;

  -- Housekeeping: nobody else's expired position is kept around either.
  delete from public.live_locations where expires_at <= now();

  return 'sharing';
end;
$$;

-- Whether the caller may share at all; the map shows a note instead of
-- the share button otherwise.
create or replace function public.can_share_my_location()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and private.may_share_location(auth.uid());
$$;

create or replace function public.list_friend_locations()
returns table (
  user_id uuid,
  display_name text,
  handle text,
  lat double precision,
  lng double precision,
  accuracy_m integer,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select l.user_id, p.display_name, p.handle, l.lat, l.lng, l.accuracy_m, l.updated_at
  from public.live_locations l
  join public.profiles p on p.id = l.user_id
  join public.friendships f
    on f.status = 'accepted'
   and ((f.requester_id = auth.uid() and f.addressee_id = l.user_id)
     or (f.addressee_id = auth.uid() and f.requester_id = l.user_id))
  where auth.uid() is not null
    and l.user_id <> auth.uid()
    and l.expires_at > now()
    and not private.is_blocked(auth.uid(), l.user_id)
    and private.may_share_location(l.user_id)
  order by l.updated_at desc;
$$;

revoke all on function public.can_share_my_location() from public, anon;
grant execute on function public.can_share_my_location() to authenticated;

delete from public.live_locations l where not private.may_share_location(l.user_id);
