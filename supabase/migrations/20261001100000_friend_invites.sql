-- Single-use invite links. See docs/specs/invite-links.md and
-- docs/adr/0009-single-use-invite-links.md.

create table public.friend_invites (
  token text primary key,
  inviter_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  used_by uuid references public.profiles (id) on delete set null,
  used_at timestamptz,

  constraint friend_invites_token_format check (token ~ '^[0-9a-f]{32}$')
);

create index friend_invites_inviter_idx on public.friend_invites (inviter_id);

alter table public.friend_invites enable row level security;
alter table public.friend_invites force row level security;
revoke all on table public.friend_invites from public, anon, authenticated;

-- 122 random bits from a v4 uuid, as 32 hex characters.
create or replace function public.create_friend_invite()
returns table (status text, token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  new_token text := replace(gen_random_uuid()::text, '-', '');
  new_expiry timestamptz;
begin
  if me is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if not private.has_complete_profile(me) then
    return query select 'profile_incomplete'::text, null::text, null::timestamptz;
    return;
  end if;

  if (
    select count(*) from public.friend_invites fi
    where fi.inviter_id = me and fi.used_by is null and fi.expires_at > now()
  ) >= 10 then
    return query select 'too_many'::text, null::text, null::timestamptz;
    return;
  end if;

  insert into public.friend_invites (token, inviter_id)
  values (new_token, me)
  returning friend_invites.expires_at into new_expiry;

  return query select 'created'::text, new_token, new_expiry;
end;
$$;

create or replace function private.invite_status(invite public.friend_invites, viewer uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when invite.token is null then 'not_found'
    when invite.inviter_id = viewer then 'self'
    when private.is_blocked(viewer, invite.inviter_id) then 'not_found'
    when invite.used_by is not null then 'used'
    when invite.expires_at <= now() then 'expired'
    when private.are_friends(viewer, invite.inviter_id) then 'already_friends'
    else 'valid'
  end;
$$;

revoke all on function private.invite_status(public.friend_invites, uuid) from public, anon, authenticated;

-- What the invite page shows a signed-in visitor before they confirm.
-- Signed-out visitors get nothing: the inviter's name is not public.
create or replace function public.preview_friend_invite(invite_token text)
returns table (status text, inviter_display_name text, inviter_handle text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  invite public.friend_invites;
  result_status text;
begin
  if me is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select * into invite from public.friend_invites fi where fi.token = lower(btrim(invite_token));
  result_status := private.invite_status(invite, me);

  if result_status in ('not_found') then
    return query select result_status, null::text, null::text;
    return;
  end if;

  return query
  select result_status, p.display_name, p.handle
  from public.profiles p where p.id = invite.inviter_id;
end;
$$;

create or replace function public.accept_friend_invite(invite_token text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  invite public.friend_invites;
  result_status text;
begin
  if me is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if not private.has_complete_profile(me) then
    return 'profile_incomplete';
  end if;

  select * into invite from public.friend_invites fi
  where fi.token = lower(btrim(invite_token))
  for update;

  result_status := private.invite_status(invite, me);

  if result_status <> 'valid' then
    return result_status;
  end if;

  -- An open request in either direction becomes the friendship.
  delete from public.friendships f
  where least(f.requester_id, f.addressee_id) = least(me, invite.inviter_id)
    and greatest(f.requester_id, f.addressee_id) = greatest(me, invite.inviter_id);

  insert into public.friendships (requester_id, addressee_id, status, responded_at)
  values (invite.inviter_id, me, 'accepted', now());

  update public.friend_invites fi
  set used_by = me, used_at = now()
  where fi.token = invite.token;

  return 'accepted';
end;
$$;

revoke all on function public.create_friend_invite() from public, anon;
revoke all on function public.preview_friend_invite(text) from public, anon;
revoke all on function public.accept_friend_invite(text) from public, anon;
grant execute on function public.create_friend_invite() to authenticated;
grant execute on function public.preview_friend_invite(text) to authenticated;
grant execute on function public.accept_friend_invite(text) to authenticated;
