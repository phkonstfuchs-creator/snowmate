-- Adults cannot start contact with riders under 16 (ADR 0036, owner
-- decisions 2026-10-08). Applied migrations stay untouched; this replaces
-- request_friendship with the same body plus one check.
--
-- Decisions:
-- * Protected: under 16, and anyone without a birth date (who already
--   counts as a minor everywhere else).
-- * An adult (18+) cannot send them a friend request. 16- and 17-year-olds
--   are not adults and are not affected.
-- * The younger person may ask the adult; accepting stays possible.
-- * Existing friendships and pending requests stay as they are.
-- Invite links and discovery need no change: an invite is redeemed by the
-- younger person themselves, and discovery only pairs the same age band.
-- pgTAP: adult_minor_contact.test.sql.

create or replace function private.adult_may_not_ask(requester uuid, target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles r
    join public.profiles t on t.id = target
    where r.id = requester
      and private.age_band(r.birth_date) = 'adult'
      and coalesce(private.age_band(t.birth_date), 'unknown') in ('teen_young', 'unknown')
  );
$$;

revoke all on function private.adult_may_not_ask(uuid, uuid) from public, anon, authenticated;

create or replace function public.request_friendship(target_handle text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  target uuid;
  existing public.friendships;
  declined private.friend_request_declines;
begin
  if me is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if not private.has_complete_profile(me) then
    return 'profile_incomplete';
  end if;

  -- A cap on unanswered requests keeps this from being used to probe
  -- handles or to spray requests at people, minors included.
  if (
    select count(*) from public.friendships f
    where f.requester_id = me and f.status = 'pending'
  ) >= 20 then
    return 'too_many_pending';
  end if;

  select p.id into target
  from public.profiles p
  where p.handle = lower(btrim(target_handle, ' @'))
    and p.onboarding_completed;

  if target is null then
    return 'not_found';
  end if;

  if target = me then
    return 'self';
  end if;

  -- A block in either direction looks like an unknown handle: the
  -- blocked person learns nothing.
  if private.is_blocked(me, target) then
    return 'not_found';
  end if;

  select * into existing
  from public.friendships f
  where least(f.requester_id, f.addressee_id) = least(me, target)
    and greatest(f.requester_id, f.addressee_id) = greatest(me, target);

  if found then
    if existing.status = 'accepted' then
      return 'already_friends';
    end if;

    if existing.addressee_id = me then
      update public.friendships
      set status = 'accepted', responded_at = now()
      where requester_id = existing.requester_id
        and addressee_id = existing.addressee_id;
      return 'accepted';
    end if;

    return 'already_requested';
  end if;

  -- Adults never start contact with someone under 16 (or of unknown
  -- age). The answer looks like an unknown handle, so a request cannot
  -- be used to find out who is young. The younger person can still ask
  -- the adult, which the accept branch above handles.
  if private.adult_may_not_ask(me, target) then
    return 'not_found';
  end if;

  select * into declined
  from private.friend_request_declines d
  where d.requester_id = me and d.addressee_id = target;

  if found then
    if declined.declines >= 5 then
      return 'declined_often';
    end if;
    if declined.declines >= 2
       and declined.last_declined_at > now() - interval '7 days' * power(2, declined.declines - 2) then
      return 'cooling_down';
    end if;
  end if;

  insert into public.friendships (requester_id, addressee_id)
  values (me, target);

  return 'requested';
end;
$$;

revoke all on function public.request_friendship(text) from public, anon;
grant execute on function public.request_friendship(text) to authenticated;
