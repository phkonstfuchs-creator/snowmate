create extension if not exists pgcrypto with schema extensions;

create table private.command_receipts (
  user_id uuid not null references auth.users (id) on delete cascade,
  command_name text not null,
  idempotency_key uuid not null,
  resource_id uuid,
  request_hash text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, command_name, idempotency_key),
  constraint command_receipts_request_hash_format check (
    request_hash ~ '^[0-9a-f]{64}$'
  )
);

revoke all on table private.command_receipts
  from public, anon, authenticated, service_role;

create table private.account_controls (
  user_id uuid primary key references auth.users (id) on delete cascade,
  account_status text not null default 'active',
  moderation_state text not null default 'clear',
  moderation_until timestamptz,
  updated_at timestamptz not null default now(),
  constraint account_controls_account_status_value check (
    account_status in ('active', 'deletion_pending', 'deleting')
  ),
  constraint account_controls_moderation_state_value check (
    moderation_state in ('clear', 'restricted', 'suspended', 'banned')
  ),
  constraint account_controls_moderation_expiry_state check (
    (moderation_state = 'clear' and moderation_until is null)
    or (moderation_state in ('restricted', 'suspended') and moderation_until is not null)
    or (moderation_state = 'banned' and moderation_until is null)
  )
);

alter table private.account_controls enable row level security;
alter table private.account_controls force row level security;
revoke all on table private.account_controls
  from public, anon, authenticated, service_role;

create or replace function private.can_account_use_core(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_user_id is not null
    and coalesce(
      (
        select
          control.account_status = 'active'
          and (
            control.moderation_state not in ('suspended', 'banned')
            or (
              control.moderation_until is not null
              and control.moderation_until <= statement_timestamp()
            )
          )
        from private.account_controls as control
        where control.user_id = p_user_id
      ),
      true
    );
$$;

create or replace function private.can_account_message(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.can_account_use_core(p_user_id)
    and coalesce(
      (
        select
          control.moderation_state = 'clear'
          or (
            control.moderation_until is not null
            and control.moderation_until <= statement_timestamp()
          )
        from private.account_controls as control
        where control.user_id = p_user_id
      ),
      true
    );
$$;

create or replace function private.command_request_hash(p_payload jsonb)
returns text
language sql
immutable
strict
security invoker
set search_path = ''
as $$
  select pg_catalog.encode(
    extensions.digest(
      pg_catalog.convert_to(p_payload::text, 'UTF8'),
      'sha256'
    ),
    'hex'
  );
$$;

create or replace function private.lock_relationship_pair(
  p_first_user_id uuid,
  p_second_user_id uuid
)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
begin
  if p_first_user_id is null
    or p_second_user_id is null
    or p_first_user_id = p_second_user_id
  then
    raise exception using
      errcode = '22023',
      message = 'two distinct relationship users are required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'snowmate:relationship:'
        || least(p_first_user_id, p_second_user_id)::text
        || ':'
        || greatest(p_first_user_id, p_second_user_id)::text,
      0
    )
  );
end;
$$;

revoke all on function private.can_account_use_core(uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.can_account_message(uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.command_request_hash(jsonb)
  from public, anon, authenticated, service_role;
revoke all on function private.lock_relationship_pair(uuid, uuid)
  from public, anon, authenticated, service_role;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_active_own"
  on public.profiles
  for select
  to authenticated
  using (
    (select auth.uid()) = id
    and private.can_account_use_core(id)
  );

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_active_own"
  on public.profiles
  for update
  to authenticated
  using (
    (select auth.uid()) = id
    and private.can_account_use_core(id)
  )
  with check (
    (select auth.uid()) = id
    and private.can_account_use_core(id)
  );

create table private.command_rate_limits (
  user_id uuid not null references auth.users (id) on delete cascade,
  command_name text not null,
  window_started_at timestamptz not null,
  request_count integer not null,
  primary key (user_id, command_name),
  constraint command_rate_limits_name_length check (
    char_length(command_name) between 1 and 100
  ),
  constraint command_rate_limits_count_positive check (request_count > 0)
);

alter table private.command_rate_limits enable row level security;
alter table private.command_rate_limits force row level security;
revoke all on table private.command_rate_limits from public, anon, authenticated;

create or replace function private.consume_command_rate_limit(
  p_user_id uuid,
  p_command_name text,
  p_max_requests integer,
  p_window interval
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := statement_timestamp();
  v_request_count integer;
begin
  if
    p_user_id is null
    or p_command_name is null
    or p_max_requests not between 1 and 10000
    or p_window <= interval '0 seconds'
    or p_window > interval '7 days'
  then
    raise exception using errcode = '22023', message = 'invalid rate limit configuration';
  end if;
  if
    not private.can_account_use_core(p_user_id)
    and p_command_name not in (
      'create_report',
      'create_appeal',
      'request_export',
      'request_account_deletion'
    )
  then
    raise exception using errcode = '42501', message = 'account unavailable';
  end if;

  insert into private.command_rate_limits (
    user_id,
    command_name,
    window_started_at,
    request_count
  ) values (
    p_user_id,
    p_command_name,
    v_now,
    1
  )
  on conflict (user_id, command_name) do update
  set
    window_started_at = case
      when private.command_rate_limits.window_started_at + p_window <= v_now
        then v_now
      else private.command_rate_limits.window_started_at
    end,
    request_count = case
      when private.command_rate_limits.window_started_at + p_window <= v_now
        then 1
      else private.command_rate_limits.request_count + 1
    end
  returning request_count into v_request_count;

  if v_request_count > p_max_requests then
    raise exception using errcode = 'P0001', message = 'rate limit exceeded';
  end if;
end;
$$;

revoke all on function private.consume_command_rate_limit(uuid, text, integer, interval)
  from public, anon, authenticated;

create table private.friend_invites (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references public.profiles (id) on delete cascade,
  token_hash bytea not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint friend_invites_expiry_after_creation check (expires_at > created_at),
  constraint friend_invites_usage_complete check (
    (used_at is null and used_by is null)
    or (used_at is not null and used_by is not null)
  )
);

create index friend_invites_active_by_inviter
  on private.friend_invites (inviter_id, expires_at)
  where used_at is null;

revoke all on table private.friend_invites from public, anon, authenticated;

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_low uuid not null references public.profiles (id) on delete cascade,
  user_high uuid not null references public.profiles (id) on delete cascade,
  requested_by uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint friendships_canonical_pair check (user_low < user_high),
  constraint friendships_requester_in_pair check (
    requested_by = user_low or requested_by = user_high
  ),
  constraint friendships_status_value check (
    status in ('pending', 'accepted', 'declined')
  ),
  constraint friendships_response_timestamp check (
    (status = 'pending' and responded_at is null)
    or (status <> 'pending' and responded_at is not null)
  ),
  unique (user_low, user_high)
);

create index friendships_user_low_status
  on public.friendships (user_low, status, user_high);
create index friendships_user_high_status
  on public.friendships (user_high, status, user_low);
create index friendships_requested_by_status
  on public.friendships (requested_by, status);

create trigger friendships_set_updated_at
  before update on public.friendships
  for each row execute function private.set_updated_at();

alter table public.friendships enable row level security;
alter table public.friendships force row level security;
revoke all on table public.friendships from public, anon, authenticated;
grant select on table public.friendships to authenticated;

create policy "friendships_select_participating"
  on public.friendships
  for select
  to authenticated
  using ((select auth.uid()) in (user_low, user_high));

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_not_self check (blocker_id <> blocked_id)
);

create index blocks_blocked_id on public.blocks (blocked_id, blocker_id);

alter table public.blocks enable row level security;
alter table public.blocks force row level security;
revoke all on table public.blocks from public, anon, authenticated;
grant select on table public.blocks to authenticated;

create policy "blocks_select_own"
  on public.blocks
  for select
  to authenticated
  using ((select auth.uid()) = blocker_id);

create table public.crews (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  city text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crews_name_format check (
    name = btrim(name)
    and char_length(name) between 2 and 40
    and name !~ '[[:cntrl:]]'
    and name !~ U&'[\202A-\202E\2066-\2069]'
  ),
  constraint crews_city_value check (city in ('innsbruck', 'salzburg'))
);

create index crews_owner_id on public.crews (owner_id, created_at desc);

create trigger crews_set_updated_at
  before update on public.crews
  for each row execute function private.set_updated_at();

create table public.crew_members (
  crew_id uuid not null references public.crews (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (crew_id, user_id),
  constraint crew_members_role_value check (role in ('owner', 'admin', 'member'))
);

create index crew_members_user_id on public.crew_members (user_id, crew_id);

create table public.crew_invitations (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references public.crews (id) on delete cascade,
  invited_by uuid not null references public.profiles (id) on delete cascade,
  invited_user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint crew_invitations_status_value check (
    status in ('pending', 'accepted', 'declined', 'cancelled')
  ),
  unique (crew_id, invited_user_id)
);

create index crew_invitations_invited_user_status
  on public.crew_invitations (invited_user_id, status, created_at desc);

alter table public.crews enable row level security;
alter table public.crews force row level security;
alter table public.crew_members enable row level security;
alter table public.crew_members force row level security;
alter table public.crew_invitations enable row level security;
alter table public.crew_invitations force row level security;

revoke all on table public.crews from public, anon, authenticated;
revoke all on table public.crew_members from public, anon, authenticated;
revoke all on table public.crew_invitations from public, anon, authenticated;
grant select on table public.crews to authenticated;
grant select on table public.crew_members to authenticated;
grant select on table public.crew_invitations to authenticated;

create or replace function private.is_blocked_between(
  p_first_user_id uuid,
  p_second_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.blocks
    where
      (blocker_id = p_first_user_id and blocked_id = p_second_user_id)
      or (blocker_id = p_second_user_id and blocked_id = p_first_user_id)
  );
$$;

create or replace function private.are_friends(
  p_first_user_id uuid,
  p_second_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.can_account_use_core(p_first_user_id)
    and private.can_account_use_core(p_second_user_id)
    and
    not private.is_blocked_between(p_first_user_id, p_second_user_id)
    and exists (
      select 1
      from public.friendships
      where user_low = least(p_first_user_id, p_second_user_id)
        and user_high = greatest(p_first_user_id, p_second_user_id)
        and status = 'accepted'
    );
$$;

create or replace function private.are_friends_of_friends(
  p_viewer_id uuid,
  p_owner_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_viewer_id <> p_owner_id
    and private.can_account_use_core(p_viewer_id)
    and private.can_account_use_core(p_owner_id)
    and not private.is_blocked_between(p_viewer_id, p_owner_id)
    and exists (
      select 1
      from public.friendships as first_hop
      cross join lateral (
        values (
          case
            when first_hop.user_low = p_viewer_id then first_hop.user_high
            else first_hop.user_low
          end
        )
      ) as mutual(user_id)
      where p_viewer_id in (first_hop.user_low, first_hop.user_high)
        and first_hop.status = 'accepted'
        and mutual.user_id not in (p_viewer_id, p_owner_id)
        and private.are_friends(p_viewer_id, mutual.user_id)
        and private.are_friends(mutual.user_id, p_owner_id)
    );
$$;

create or replace function private.is_minor_account(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select is_minor from public.profiles where id = p_user_id),
    true
  );
$$;

create or replace function private.is_crew_member(
  p_crew_id uuid,
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
    from public.crew_members
    where crew_id = p_crew_id
      and user_id = p_user_id
      and private.can_account_use_core(p_user_id)
  );
$$;

revoke all on function private.is_blocked_between(uuid, uuid) from public, anon, authenticated;
revoke all on function private.are_friends(uuid, uuid) from public, anon, authenticated;
revoke all on function private.are_friends_of_friends(uuid, uuid) from public, anon, authenticated;
revoke all on function private.is_minor_account(uuid) from public, anon, authenticated;
revoke all on function private.is_crew_member(uuid, uuid) from public, anon, authenticated;

create policy "crews_select_members"
  on public.crews
  for select
  to authenticated
  using (private.is_crew_member(id, (select auth.uid())));

create policy "crew_members_select_shared_crew"
  on public.crew_members
  for select
  to authenticated
  using (private.is_crew_member(crew_id, (select auth.uid())));

create policy "crew_invitations_select_participating"
  on public.crew_invitations
  for select
  to authenticated
  using (
    invited_by = (select auth.uid())
    or invited_user_id = (select auth.uid())
  );

create or replace function public.create_friend_invite()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  raw_token text;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = current_user_id and onboarding_completed
  ) then
    raise exception using errcode = '42501', message = 'completed profile required';
  end if;

  perform private.consume_command_rate_limit(
    current_user_id, 'create_friend_invite', 10, interval '1 hour'
  );

  raw_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into private.friend_invites (
    inviter_id,
    token_hash,
    expires_at
  ) values (
    current_user_id,
    extensions.digest(raw_token, 'sha256'),
    now() + interval '24 hours'
  );

  return raw_token;
end;
$$;

create or replace function public.request_friendship(
  p_target_id uuid,
  p_idempotency_key uuid,
  p_friend_invite_token text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  friendship_id uuid;
  requester_is_minor boolean;
  target_is_minor boolean;
  consumed_invites integer;
  request_hash text;
  stored_request_hash text;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_target_id is null or p_idempotency_key is null then
    raise exception using errcode = '22004', message = 'target and idempotency key are required';
  end if;
  if current_user_id = p_target_id then
    raise exception using errcode = '23514', message = 'cannot request yourself';
  end if;

  request_hash := private.command_request_hash(
    pg_catalog.jsonb_build_object(
      'target_id', p_target_id,
      'friend_invite_token', p_friend_invite_token
    )
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      current_user_id::text
        || ':request_friendship:'
        || p_idempotency_key::text,
      0
    )
  );

  select receipt.resource_id, receipt.request_hash
  into friendship_id, stored_request_hash
  from private.command_receipts as receipt
  where receipt.user_id = current_user_id
    and receipt.command_name = 'request_friendship'
    and receipt.idempotency_key = p_idempotency_key;
  if found then
    if stored_request_hash is distinct from request_hash then
      raise exception using
        errcode = '22023',
        message = 'idempotency key payload mismatch';
    end if;
    return friendship_id;
  end if;

  perform private.lock_relationship_pair(current_user_id, p_target_id);

  perform private.consume_command_rate_limit(
    current_user_id, 'request_friendship', 30, interval '1 hour'
  );

  if not exists (
    select 1 from public.profiles
    where id = current_user_id and onboarding_completed
  ) or not exists (
    select 1 from public.profiles
    where id = p_target_id and onboarding_completed
  ) then
    raise exception using errcode = '42501', message = 'completed profiles required';
  end if;

  if private.is_blocked_between(current_user_id, p_target_id) then
    raise exception using errcode = '42501', message = 'relationship unavailable';
  end if;

  requester_is_minor := private.is_minor_account(current_user_id);
  target_is_minor := private.is_minor_account(p_target_id);

  if requester_is_minor or target_is_minor then
    if p_friend_invite_token is null
      or p_friend_invite_token !~ '^[a-f0-9]{64}$'
    then
      raise exception using errcode = '42501', message = 'targeted invite required';
    end if;

    update private.friend_invites
    set used_at = now(), used_by = current_user_id
    where inviter_id = p_target_id
      and token_hash = extensions.digest(p_friend_invite_token, 'sha256')
      and used_at is null
      and expires_at > now();
    get diagnostics consumed_invites = row_count;

    if consumed_invites <> 1 then
      raise exception using errcode = '42501', message = 'targeted invite invalid';
    end if;
  end if;

  insert into public.friendships (
    user_low,
    user_high,
    requested_by,
    status,
    responded_at
  ) values (
    least(current_user_id, p_target_id),
    greatest(current_user_id, p_target_id),
    current_user_id,
    'pending',
    null
  )
  on conflict (user_low, user_high) do update
  set
    requested_by = excluded.requested_by,
    status = case
      when public.friendships.status = 'accepted' then 'accepted'
      else 'pending'
    end,
    responded_at = case
      when public.friendships.status = 'accepted'
        then public.friendships.responded_at
      else null
    end
  returning id into friendship_id;

  insert into private.command_receipts (
    user_id,
    command_name,
    idempotency_key,
    resource_id,
    request_hash
  ) values (
    current_user_id,
    'request_friendship',
    p_idempotency_key,
    friendship_id,
    request_hash
  );

  return friendship_id;
end;
$$;

create or replace function public.respond_friendship(
  p_friendship_id uuid,
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
  friendship_record public.friendships%rowtype;
  prior_resource_id uuid;
  request_hash text;
  stored_request_hash text;
  relationship_user_low uuid;
  relationship_user_high uuid;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_friendship_id is null or p_accept is null or p_idempotency_key is null then
    raise exception using errcode = '22004', message = 'response fields are required';
  end if;

  request_hash := private.command_request_hash(
    pg_catalog.jsonb_build_object(
      'friendship_id', p_friendship_id,
      'accept', p_accept
    )
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      current_user_id::text
        || ':respond_friendship:'
        || p_idempotency_key::text,
      0
    )
  );

  select receipt.resource_id, receipt.request_hash
  into prior_resource_id, stored_request_hash
  from private.command_receipts as receipt
  where receipt.user_id = current_user_id
    and receipt.command_name = 'respond_friendship'
    and receipt.idempotency_key = p_idempotency_key;
  if found then
    if stored_request_hash is distinct from request_hash then
      raise exception using
        errcode = '22023',
        message = 'idempotency key payload mismatch';
    end if;
    return prior_resource_id;
  end if;

  select friendship.user_low, friendship.user_high
  into relationship_user_low, relationship_user_high
  from public.friendships as friendship
  where friendship.id = p_friendship_id;

  if not found then
    raise exception using errcode = '42501', message = 'request cannot be answered';
  end if;

  perform private.lock_relationship_pair(
    relationship_user_low,
    relationship_user_high
  );

  perform private.consume_command_rate_limit(
    current_user_id, 'respond_friendship', 60, interval '1 hour'
  );

  select * into friendship_record
  from public.friendships
  where id = p_friendship_id
  for update;

  if not found
    or current_user_id not in (friendship_record.user_low, friendship_record.user_high)
    or current_user_id = friendship_record.requested_by
  then
    raise exception using errcode = '42501', message = 'request cannot be answered';
  end if;

  if friendship_record.status <> 'pending' then
    raise exception using errcode = '23514', message = 'request is no longer pending';
  end if;

  if p_accept and private.is_blocked_between(
    friendship_record.user_low,
    friendship_record.user_high
  ) then
    raise exception using errcode = '42501', message = 'relationship unavailable';
  end if;

  update public.friendships
  set
    status = case when p_accept then 'accepted' else 'declined' end,
    responded_at = now()
  where id = p_friendship_id;

  insert into private.command_receipts (
    user_id,
    command_name,
    idempotency_key,
    resource_id,
    request_hash
  ) values (
    current_user_id,
    'respond_friendship',
    p_idempotency_key,
    p_friendship_id,
    request_hash
  );

  return p_friendship_id;
end;
$$;

create or replace function public.block_user(
  p_target_id uuid,
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
  request_hash text;
  stored_request_hash text;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_target_id is null or p_idempotency_key is null then
    raise exception using errcode = '22004', message = 'target and idempotency key are required';
  end if;
  if current_user_id = p_target_id then
    raise exception using errcode = '23514', message = 'cannot block yourself';
  end if;

  request_hash := private.command_request_hash(
    pg_catalog.jsonb_build_object('target_id', p_target_id)
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      current_user_id::text || ':block_user:' || p_idempotency_key::text,
      0
    )
  );

  select receipt.resource_id, receipt.request_hash
  into prior_resource_id, stored_request_hash
  from private.command_receipts as receipt
  where receipt.user_id = current_user_id
    and receipt.command_name = 'block_user'
    and receipt.idempotency_key = p_idempotency_key;
  if found then
    if stored_request_hash is distinct from request_hash then
      raise exception using
        errcode = '22023',
        message = 'idempotency key payload mismatch';
    end if;
    return prior_resource_id;
  end if;

  perform private.lock_relationship_pair(current_user_id, p_target_id);

  perform private.consume_command_rate_limit(
    current_user_id, 'block_user', 30, interval '1 hour'
  );

  if not exists (select 1 from public.profiles where id = p_target_id) then
    raise exception using errcode = '23503', message = 'target does not exist';
  end if;

  insert into public.blocks (blocker_id, blocked_id)
  values (current_user_id, p_target_id)
  on conflict (blocker_id, blocked_id) do nothing;

  delete from public.friendships
  where user_low = least(current_user_id, p_target_id)
    and user_high = greatest(current_user_id, p_target_id);

  update public.crew_invitations
  set status = 'cancelled', responded_at = now()
  where status = 'pending'
    and (
      (invited_by = current_user_id and invited_user_id = p_target_id)
      or (invited_by = p_target_id and invited_user_id = current_user_id)
    );

  delete from public.crew_members as membership
  using public.crews as crew
  where membership.crew_id = crew.id
    and exists (
      select 1
      from public.crew_members as own_membership
      where own_membership.crew_id = crew.id
        and own_membership.user_id = current_user_id
    )
    and exists (
      select 1
      from public.crew_members as target_membership
      where target_membership.crew_id = crew.id
        and target_membership.user_id = p_target_id
    )
    and membership.user_id = case
      when crew.owner_id = current_user_id then p_target_id
      else current_user_id
    end;

  insert into private.command_receipts (
    user_id,
    command_name,
    idempotency_key,
    resource_id,
    request_hash
  ) values (
    current_user_id,
    'block_user',
    p_idempotency_key,
    p_target_id,
    request_hash
  );

  return p_target_id;
end;
$$;

create or replace function public.unblock_user(
  p_target_id uuid,
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
  request_hash text;
  stored_request_hash text;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_target_id is null or p_idempotency_key is null then
    raise exception using
      errcode = '22004',
      message = 'target and idempotency key are required';
  end if;

  request_hash := private.command_request_hash(
    pg_catalog.jsonb_build_object('target_id', p_target_id)
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      current_user_id::text || ':unblock_user:' || p_idempotency_key::text,
      0
    )
  );

  select receipt.resource_id, receipt.request_hash
  into prior_resource_id, stored_request_hash
  from private.command_receipts as receipt
  where receipt.user_id = current_user_id
    and receipt.command_name = 'unblock_user'
    and receipt.idempotency_key = p_idempotency_key;
  if found then
    if stored_request_hash is distinct from request_hash then
      raise exception using
        errcode = '22023',
        message = 'idempotency key payload mismatch';
    end if;
    return prior_resource_id;
  end if;

  perform private.lock_relationship_pair(current_user_id, p_target_id);

  perform private.consume_command_rate_limit(
    current_user_id, 'unblock_user', 30, interval '1 hour'
  );

  delete from public.blocks
  where blocker_id = current_user_id and blocked_id = p_target_id;

  insert into private.command_receipts (
    user_id,
    command_name,
    idempotency_key,
    resource_id,
    request_hash
  ) values (
    current_user_id,
    'unblock_user',
    p_idempotency_key,
    p_target_id,
    request_hash
  );

  return p_target_id;
end;
$$;

create or replace function public.get_discovery_profiles()
returns table (
  id uuid,
  display_name text,
  handle text,
  city text,
  ability_level text,
  avatar_path text,
  relationship text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    candidate.id,
    candidate.display_name,
    candidate.handle,
    candidate.city,
    candidate.ability_level,
    candidate.avatar_path,
    case
      when private.are_friends(auth.uid(), candidate.id) then 'friend'
      else 'friend-of-friend'
    end as relationship
  from public.profiles as candidate
  where auth.uid() is not null
    and private.can_account_use_core(auth.uid())
    and private.can_account_use_core(candidate.id)
    and candidate.id <> auth.uid()
    and candidate.onboarding_completed
    and not private.is_blocked_between(auth.uid(), candidate.id)
    and (
      private.are_friends(auth.uid(), candidate.id)
      or (
        not private.is_minor_account(auth.uid())
        and not candidate.is_minor
        and private.are_friends_of_friends(auth.uid(), candidate.id)
      )
    )
  order by candidate.display_name, candidate.id;
$$;

create or replace function public.get_friendships()
returns table (
  friendship_id uuid,
  other_user_id uuid,
  display_name text,
  handle text,
  city text,
  ability_level text,
  avatar_path text,
  status text,
  direction text,
  created_at timestamptz,
  responded_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    friendship.id,
    other_profile.id,
    other_profile.display_name,
    other_profile.handle,
    other_profile.city,
    other_profile.ability_level,
    other_profile.avatar_path,
    friendship.status,
    case
      when friendship.requested_by = auth.uid() then 'outgoing'
      else 'incoming'
    end,
    friendship.created_at,
    friendship.responded_at
  from public.friendships as friendship
  join public.profiles as other_profile
    on other_profile.id = case
      when friendship.user_low = auth.uid() then friendship.user_high
      else friendship.user_low
    end
  where auth.uid() is not null
    and private.can_account_use_core(auth.uid())
    and private.can_account_use_core(other_profile.id)
    and auth.uid() in (friendship.user_low, friendship.user_high)
    and not private.is_blocked_between(auth.uid(), other_profile.id)
  order by
    case when friendship.status = 'pending' then 0 else 1 end,
    other_profile.display_name,
    friendship.id;
$$;

create or replace function public.get_blocked_profiles()
returns table (
  id uuid,
  display_name text,
  handle text,
  avatar_path text,
  blocked_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    blocked_profile.id,
    blocked_profile.display_name,
    blocked_profile.handle,
    blocked_profile.avatar_path,
    block.created_at
  from public.blocks as block
  join public.profiles as blocked_profile on blocked_profile.id = block.blocked_id
  where auth.uid() is not null
    and private.can_account_use_core(auth.uid())
    and block.blocker_id = auth.uid()
  order by block.created_at desc, blocked_profile.id;
$$;

create or replace function public.get_crews()
returns table (
  id uuid,
  name text,
  city text,
  own_role text,
  member_count integer,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    crew.id,
    crew.name,
    crew.city,
    own_membership.role,
    (
      select count(*)::integer
      from public.crew_members as member
      where member.crew_id = crew.id
    ),
    crew.created_at
  from public.crews as crew
  join public.crew_members as own_membership
    on own_membership.crew_id = crew.id
   and own_membership.user_id = auth.uid()
  where auth.uid() is not null
    and private.can_account_use_core(auth.uid())
  order by crew.name, crew.id;
$$;

create or replace function public.get_crew_members(p_crew_id uuid)
returns table (
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
    member.user_id,
    profile.display_name,
    profile.handle,
    profile.avatar_path,
    member.role,
    member.joined_at
  from public.crew_members as member
  join public.profiles as profile on profile.id = member.user_id
  where p_crew_id is not null
    and member.crew_id = p_crew_id
    and private.is_crew_member(p_crew_id, auth.uid())
    and private.can_account_use_core(member.user_id)
    and not private.is_blocked_between(auth.uid(), member.user_id)
  order by
    case member.role when 'owner' then 0 when 'admin' then 1 else 2 end,
    profile.display_name,
    member.user_id;
$$;

create or replace function public.get_crew_invitations()
returns table (
  invitation_id uuid,
  crew_id uuid,
  crew_name text,
  invited_by_user_id uuid,
  invited_by_display_name text,
  status text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    invitation.id,
    crew.id,
    crew.name,
    inviter.id,
    inviter.display_name,
    invitation.status,
    invitation.created_at
  from public.crew_invitations as invitation
  join public.crews as crew on crew.id = invitation.crew_id
  join public.profiles as inviter on inviter.id = invitation.invited_by
  where auth.uid() is not null
    and private.can_account_use_core(auth.uid())
    and private.can_account_use_core(invitation.invited_by)
    and invitation.invited_user_id = auth.uid()
    and not private.is_blocked_between(auth.uid(), invitation.invited_by)
  order by
    case when invitation.status = 'pending' then 0 else 1 end,
    invitation.created_at desc,
    invitation.id;
$$;

create or replace function public.create_crew(
  p_name text,
  p_city text,
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
  crew_id uuid;
  request_hash text;
  stored_request_hash text;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_idempotency_key is null then
    raise exception using errcode = '22004', message = 'idempotency key required';
  end if;

  request_hash := private.command_request_hash(
    pg_catalog.jsonb_build_object(
      'name', btrim(p_name),
      'city', p_city
    )
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      current_user_id::text || ':create_crew:' || p_idempotency_key::text,
      0
    )
  );

  select receipt.resource_id, receipt.request_hash
  into crew_id, stored_request_hash
  from private.command_receipts as receipt
  where receipt.user_id = current_user_id
    and receipt.command_name = 'create_crew'
    and receipt.idempotency_key = p_idempotency_key;
  if found then
    if stored_request_hash is distinct from request_hash then
      raise exception using
        errcode = '22023',
        message = 'idempotency key payload mismatch';
    end if;
    return crew_id;
  end if;

  perform private.consume_command_rate_limit(
    current_user_id, 'create_crew', 10, interval '1 day'
  );

  insert into public.crews (owner_id, name, city)
  values (current_user_id, btrim(p_name), p_city)
  returning id into crew_id;

  insert into public.crew_members (crew_id, user_id, role)
  values (crew_id, current_user_id, 'owner');

  insert into private.command_receipts (
    user_id, command_name, idempotency_key, resource_id, request_hash
  ) values (
    current_user_id, 'create_crew', p_idempotency_key, crew_id, request_hash
  );

  return crew_id;
end;
$$;

create or replace function public.invite_crew_member(
  p_crew_id uuid,
  p_target_id uuid,
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
  invitation_id uuid;
  request_hash text;
  stored_request_hash text;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_crew_id is null or p_target_id is null or p_idempotency_key is null then
    raise exception using errcode = '22004', message = 'crew invite fields are required';
  end if;

  request_hash := private.command_request_hash(
    pg_catalog.jsonb_build_object(
      'crew_id', p_crew_id,
      'target_id', p_target_id
    )
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      current_user_id::text
        || ':invite_crew_member:'
        || p_idempotency_key::text,
      0
    )
  );

  select receipt.resource_id, receipt.request_hash
  into invitation_id, stored_request_hash
  from private.command_receipts as receipt
  where receipt.user_id = current_user_id
    and receipt.command_name = 'invite_crew_member'
    and receipt.idempotency_key = p_idempotency_key;
  if found then
    if stored_request_hash is distinct from request_hash then
      raise exception using
        errcode = '22023',
        message = 'idempotency key payload mismatch';
    end if;
    return invitation_id;
  end if;

  perform private.lock_relationship_pair(current_user_id, p_target_id);

  if not exists (
    select 1 from public.crew_members
    where crew_id = p_crew_id
      and user_id = current_user_id
      and role in ('owner', 'admin')
  ) then
    raise exception using errcode = '42501', message = 'crew admin required';
  end if;
  if not private.are_friends(current_user_id, p_target_id) then
    raise exception using errcode = '42501', message = 'crew invites require friendship';
  end if;

  perform private.consume_command_rate_limit(
    current_user_id, 'invite_crew_member', 30, interval '1 hour'
  );

  insert into public.crew_invitations (
    crew_id,
    invited_by,
    invited_user_id,
    status,
    responded_at
  ) values (
    p_crew_id,
    current_user_id,
    p_target_id,
    'pending',
    null
  )
  on conflict (crew_id, invited_user_id) do update
  set
    invited_by = excluded.invited_by,
    status = 'pending',
    responded_at = null,
    created_at = now()
  returning id into invitation_id;

  insert into private.command_receipts (
    user_id, command_name, idempotency_key, resource_id, request_hash
  ) values (
    current_user_id,
    'invite_crew_member',
    p_idempotency_key,
    invitation_id,
    request_hash
  );

  return invitation_id;
end;
$$;

create or replace function public.respond_crew_invitation(
  p_invitation_id uuid,
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
  invitation public.crew_invitations%rowtype;
  prior_resource_id uuid;
  request_hash text;
  stored_request_hash text;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_invitation_id is null or p_accept is null or p_idempotency_key is null then
    raise exception using errcode = '22004', message = 'crew response fields are required';
  end if;

  request_hash := private.command_request_hash(
    pg_catalog.jsonb_build_object(
      'invitation_id', p_invitation_id,
      'accept', p_accept
    )
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      current_user_id::text
        || ':respond_crew_invitation:'
        || p_idempotency_key::text,
      0
    )
  );

  select receipt.resource_id, receipt.request_hash
  into prior_resource_id, stored_request_hash
  from private.command_receipts as receipt
  where receipt.user_id = current_user_id
    and receipt.command_name = 'respond_crew_invitation'
    and receipt.idempotency_key = p_idempotency_key;
  if found then
    if stored_request_hash is distinct from request_hash then
      raise exception using
        errcode = '22023',
        message = 'idempotency key payload mismatch';
    end if;
    return prior_resource_id;
  end if;

  select * into invitation
  from public.crew_invitations
  where id = p_invitation_id;

  if not found
    or invitation.invited_user_id <> current_user_id
  then
    raise exception using errcode = '42501', message = 'invitation cannot be answered';
  end if;

  perform private.lock_relationship_pair(current_user_id, invitation.invited_by);

  perform private.consume_command_rate_limit(
    current_user_id, 'respond_crew_invitation', 60, interval '1 hour'
  );

  select * into invitation
  from public.crew_invitations
  where id = p_invitation_id
  for update;

  if not found
    or invitation.invited_user_id <> current_user_id
    or invitation.status <> 'pending'
  then
    raise exception using errcode = '42501', message = 'invitation cannot be answered';
  end if;
  if private.is_blocked_between(current_user_id, invitation.invited_by) then
    raise exception using errcode = '42501', message = 'relationship unavailable';
  end if;
  if p_accept and not private.are_friends(current_user_id, invitation.invited_by) then
    raise exception using errcode = '42501', message = 'crew invites require friendship';
  end if;

  update public.crew_invitations
  set
    status = case when p_accept then 'accepted' else 'declined' end,
    responded_at = now()
  where id = p_invitation_id;

  if p_accept then
    insert into public.crew_members (crew_id, user_id, role)
    values (invitation.crew_id, current_user_id, 'member')
    on conflict (crew_id, user_id) do nothing;
  end if;

  insert into private.command_receipts (
    user_id, command_name, idempotency_key, resource_id, request_hash
  ) values (
    current_user_id,
    'respond_crew_invitation',
    p_idempotency_key,
    p_invitation_id,
    request_hash
  );

  return p_invitation_id;
end;
$$;

revoke select on table public.friendships from authenticated;
revoke select on table public.blocks from authenticated;
revoke select on table public.crews from authenticated;
revoke select on table public.crew_members from authenticated;
revoke select on table public.crew_invitations from authenticated;

revoke all on function public.create_friend_invite() from public, anon;
revoke all on function public.request_friendship(uuid, uuid, text) from public, anon;
revoke all on function public.respond_friendship(uuid, boolean, uuid) from public, anon;
revoke all on function public.block_user(uuid, uuid) from public, anon;
revoke all on function public.unblock_user(uuid, uuid) from public, anon;
revoke all on function public.get_discovery_profiles() from public, anon;
revoke all on function public.get_friendships() from public, anon;
revoke all on function public.get_blocked_profiles() from public, anon;
revoke all on function public.get_crews() from public, anon;
revoke all on function public.get_crew_members(uuid) from public, anon;
revoke all on function public.get_crew_invitations() from public, anon;
revoke all on function public.create_crew(text, text, uuid) from public, anon;
revoke all on function public.invite_crew_member(uuid, uuid, uuid) from public, anon;
revoke all on function public.respond_crew_invitation(uuid, boolean, uuid) from public, anon;

grant execute on function public.create_friend_invite() to authenticated;
grant execute on function public.request_friendship(uuid, uuid, text) to authenticated;
grant execute on function public.respond_friendship(uuid, boolean, uuid) to authenticated;
grant execute on function public.block_user(uuid, uuid) to authenticated;
grant execute on function public.unblock_user(uuid, uuid) to authenticated;
grant execute on function public.get_discovery_profiles() to authenticated;
grant execute on function public.get_friendships() to authenticated;
grant execute on function public.get_blocked_profiles() to authenticated;
grant execute on function public.get_crews() to authenticated;
grant execute on function public.get_crew_members(uuid) to authenticated;
grant execute on function public.get_crew_invitations() to authenticated;
grant execute on function public.create_crew(text, text, uuid) to authenticated;
grant execute on function public.invite_crew_member(uuid, uuid, uuid) to authenticated;
grant execute on function public.respond_crew_invitation(uuid, boolean, uuid) to authenticated;
