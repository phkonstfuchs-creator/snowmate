create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  ride_id uuid unique references public.rides (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_kind_value check (kind in ('dm', 'ride')),
  constraint conversations_kind_target check (
    (kind = 'dm' and ride_id is null)
    or (kind = 'ride' and ride_id is not null)
  )
);

create index conversations_last_message_at
  on public.conversations (last_message_at desc nulls last, created_at desc);

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function private.set_updated_at();

create table private.dm_conversation_pairs (
  conversation_id uuid primary key
    references public.conversations (id) on delete cascade,
  user_low uuid not null references public.profiles (id) on delete cascade,
  user_high uuid not null references public.profiles (id) on delete cascade,
  constraint dm_conversation_pairs_canonical check (user_low < user_high),
  unique (user_low, user_high)
);

create table public.conversation_members (
  conversation_id uuid not null
    references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index conversation_members_user_id
  on public.conversation_members (user_id, conversation_id);

create table private.ride_participation_history (
  ride_id uuid not null references public.rides (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  first_joined_at timestamptz not null,
  last_left_at timestamptz,
  primary key (ride_id, user_id)
);

create index ride_participation_history_user_id
  on private.ride_participation_history (user_id, first_joined_at desc);

alter table private.ride_participation_history enable row level security;
alter table private.ride_participation_history force row level security;
revoke all on table private.ride_participation_history
  from public, anon, authenticated, service_role;

insert into private.ride_participation_history (
  ride_id,
  user_id,
  first_joined_at
)
select member.ride_id, member.user_id, member.joined_at
from public.ride_members as member
on conflict (ride_id, user_id) do nothing;

create or replace function private.capture_ride_participation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into private.ride_participation_history (
      ride_id,
      user_id,
      first_joined_at,
      last_left_at
    ) values (
      new.ride_id,
      new.user_id,
      new.joined_at,
      null
    )
    on conflict (ride_id, user_id) do update
    set
      first_joined_at = least(
        private.ride_participation_history.first_joined_at,
        excluded.first_joined_at
      ),
      last_left_at = null;

    return new;
  end if;

  update private.ride_participation_history
  set last_left_at = statement_timestamp()
  where ride_id = old.ride_id and user_id = old.user_id;

  return old;
end;
$$;

revoke all on function private.capture_ride_participation()
  from public, anon, authenticated, service_role;

create trigger ride_members_capture_participation
  after insert or delete on public.ride_members
  for each row execute function private.capture_ride_participation();

create or replace function private.was_ride_participant(
  p_ride_id uuid,
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
    from private.ride_participation_history as participation
    where participation.ride_id = p_ride_id
      and participation.user_id = p_user_id
  );
$$;

revoke all on function private.was_ride_participant(uuid, uuid)
  from public, anon, authenticated, service_role;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null
    references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint messages_body_safe check (
    body = btrim(body)
    and char_length(body) between 1 and 1000
    and body !~ '[[:cntrl:]]'
    and body !~ U&'[\202A-\202E\2066-\2069]'
  )
);

create index messages_conversation_cursor
  on public.messages (conversation_id, created_at desc, id desc);
create index messages_sender_rate_limit
  on public.messages (sender_id, created_at desc);

create table public.report_reasons (
  code text primary key,
  label text not null,
  severity text not null,
  priority text not null,
  response_hours smallint not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint report_reasons_code_format check (code ~ '^[a-z][a-z0-9_]{2,39}$'),
  constraint report_reasons_label_safe check (
    label = btrim(label)
    and char_length(label) between 2 and 80
    and label !~ '[[:cntrl:]]'
    and label !~ U&'[\202A-\202E\2066-\2069]'
  ),
  constraint report_reasons_severity_value check (
    severity in ('low', 'medium', 'high', 'critical')
  ),
  constraint report_reasons_priority_value check (
    priority in ('normal', 'critical')
  ),
  constraint report_reasons_response_target check (
    (priority = 'critical' and response_hours = 4)
    or (priority = 'normal' and response_hours = 24)
  )
);

insert into public.report_reasons (
  code,
  label,
  severity,
  priority,
  response_hours
)
values
  ('immediate_danger', 'Immediate danger', 'critical', 'critical', 4),
  ('child_safety', 'Child safety concern', 'critical', 'critical', 4),
  ('location_privacy', 'Location or privacy risk', 'high', 'critical', 4),
  ('harassment', 'Harassment or bullying', 'high', 'normal', 24),
  ('hate_or_abuse', 'Hate or abusive conduct', 'high', 'normal', 24),
  ('impersonation', 'Impersonation', 'medium', 'normal', 24),
  ('spam', 'Spam or unwanted contact', 'low', 'normal', 24),
  ('other', 'Other safety concern', 'medium', 'normal', 24);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users (id) on delete set null,
  target_user_id uuid references auth.users (id) on delete set null,
  reason_code text not null references public.report_reasons (code),
  message_id uuid references public.messages (id) on delete set null,
  ride_id uuid references public.rides (id) on delete set null,
  priority text not null,
  severity text not null,
  status text not null default 'open',
  target_response_at timestamptz not null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reports_not_self check (
    reporter_id is null
    or target_user_id is null
    or reporter_id <> target_user_id
  ),
  constraint reports_priority_value check (
    priority in ('normal', 'critical')
  ),
  constraint reports_severity_value check (
    severity in ('low', 'medium', 'high', 'critical')
  ),
  constraint reports_status_value check (
    status in ('open', 'triaged', 'actioned', 'dismissed', 'closed')
  ),
  constraint reports_resolution_state check (
    (status in ('open', 'triaged') and resolved_at is null)
    or (status in ('actioned', 'dismissed', 'closed') and resolved_at is not null)
  ),
  constraint reports_response_target_after_creation check (
    target_response_at > created_at
  )
);

create index reports_reporter_created_at
  on public.reports (reporter_id, created_at desc);
create index reports_moderation_queue
  on public.reports (priority, target_response_at, created_at)
  where status in ('open', 'triaged');
create index reports_target_user_id
  on public.reports (target_user_id, created_at desc);

create trigger reports_set_updated_at
  before update on public.reports
  for each row execute function private.set_updated_at();

alter table private.account_controls
  add column moderation_report_id uuid
    references public.reports (id) on delete set null;

alter table private.account_controls
  add constraint account_controls_clear_moderation_source check (
    moderation_state <> 'clear' or moderation_report_id is null
  );

create table private.report_evidence (
  report_id uuid primary key references public.reports (id) on delete cascade,
  details text not null default '',
  reported_message_body text,
  reported_message_created_at timestamptz,
  captured_at timestamptz not null default now(),
  constraint report_evidence_details_safe check (
    details = btrim(details)
    and char_length(details) <= 2000
    and details !~ '[[:cntrl:]]'
    and details !~ U&'[\202A-\202E\2066-\2069]'
  ),
  constraint report_evidence_message_safe check (
    reported_message_body is null
    or (
      reported_message_body = btrim(reported_message_body)
      and char_length(reported_message_body) between 1 and 1000
      and reported_message_body !~ '[[:cntrl:]]'
      and reported_message_body !~ U&'[\202A-\202E\2066-\2069]'
    )
  ),
  constraint report_evidence_message_complete check (
    (reported_message_body is null and reported_message_created_at is null)
    or (
      reported_message_body is not null
      and reported_message_created_at is not null
    )
  )
);

create table public.report_appeals (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  appellant_id uuid references auth.users (id) on delete set null,
  body text,
  status text not null default 'pending',
  target_response_at timestamptz not null,
  resolved_at timestamptz,
  content_purged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint report_appeals_body_safe check (
    body is null
    or (
      body = btrim(body)
      and char_length(body) between 10 and 2000
      and body !~ '[[:cntrl:]]'
      and body !~ U&'[\202A-\202E\2066-\2069]'
    )
  ),
  constraint report_appeals_status_value check (
    status in ('pending', 'upheld', 'rejected')
  ),
  constraint report_appeals_resolution_state check (
    (status = 'pending' and resolved_at is null)
    or (status <> 'pending' and resolved_at is not null)
  ),
  constraint report_appeals_response_target_after_creation check (
    target_response_at > created_at
  ),
  constraint report_appeals_content_state check (
    (body is not null and content_purged_at is null)
    or (body is null and content_purged_at is not null)
  ),
  unique (report_id, appellant_id)
);

create index report_appeals_queue
  on public.report_appeals (target_response_at, created_at)
  where status = 'pending';

create trigger report_appeals_set_updated_at
  before update on public.report_appeals
  for each row execute function private.set_updated_at();

create table private.moderation_operators (
  user_id uuid primary key references auth.users (id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  disabled_at timestamptz,
  constraint moderation_operators_active_state check (
    (is_active and disabled_at is null)
    or (not is_active and disabled_at is not null)
  )
);

create table private.moderation_decisions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  appeal_id uuid references public.report_appeals (id) on delete cascade,
  operator_id uuid references auth.users (id) on delete set null,
  previous_status text not null,
  next_status text not null,
  action text not null,
  reason text not null,
  idempotency_key uuid not null,
  request_hash text not null,
  created_at timestamptz not null default now(),
  constraint moderation_decisions_report_status_values check (
    previous_status in ('open', 'triaged', 'actioned', 'dismissed', 'closed')
    and next_status in ('open', 'triaged', 'actioned', 'dismissed', 'closed')
  ),
  constraint moderation_decisions_action_value check (
    action in (
      'no_action',
      'escalated',
      'content_removed',
      'warning',
      'account_restricted',
      'account_suspended',
      'account_banned',
      'appeal_upheld',
      'appeal_rejected'
    )
  ),
  constraint moderation_decisions_reason_safe check (
    reason = btrim(reason)
    and char_length(reason) between 5 and 2000
    and reason !~ '[[:cntrl:]]'
    and reason !~ U&'[\202A-\202E\2066-\2069]'
  ),
  constraint moderation_decisions_request_hash_format check (
    request_hash ~ '^[0-9a-f]{64}$'
  ),
  unique (operator_id, idempotency_key)
);

create index moderation_decisions_report_created_at
  on private.moderation_decisions (report_id, created_at desc);

create table private.account_moderation_sanctions (
  id uuid primary key default gen_random_uuid(),
  source_report_id uuid unique
    references public.reports (id) on delete set null,
  source_decision_id uuid unique
    references private.moderation_decisions (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,
  moderation_state text not null,
  moderation_until timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_moderation_sanctions_state_value check (
    moderation_state in ('restricted', 'suspended', 'banned')
  ),
  constraint account_moderation_sanctions_expiry_state check (
    (moderation_state in ('restricted', 'suspended') and moderation_until is not null)
    or (moderation_state = 'banned' and moderation_until is null)
  )
);

create index account_moderation_sanctions_active_user
  on private.account_moderation_sanctions (user_id, moderation_state, moderation_until)
  where is_active;

create trigger account_moderation_sanctions_set_updated_at
  before update on private.account_moderation_sanctions
  for each row execute function private.set_updated_at();

create or replace function private.refresh_account_moderation_control(
  p_user_id uuid
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  active_sanction private.account_moderation_sanctions%rowtype;
begin
  if p_user_id is null then
    raise exception using errcode = '22004', message = 'user required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'snowmate:moderation_subject:' || p_user_id::text,
      0
    )
  );

  select sanction.*
  into active_sanction
  from private.account_moderation_sanctions as sanction
  where sanction.user_id = p_user_id
    and sanction.is_active
    and (
      sanction.moderation_until is null
      or sanction.moderation_until > statement_timestamp()
    )
  order by
    case sanction.moderation_state
      when 'banned' then 3
      when 'suspended' then 2
      else 1
    end desc,
    sanction.moderation_until desc nulls first,
    sanction.created_at desc,
    sanction.id desc
  limit 1;

  if found then
    insert into private.account_controls (
      user_id,
      moderation_state,
      moderation_until,
      moderation_report_id,
      updated_at
    ) values (
      p_user_id,
      active_sanction.moderation_state,
      active_sanction.moderation_until,
      active_sanction.source_report_id,
      statement_timestamp()
    )
    on conflict (user_id) do update
    set
      moderation_state = excluded.moderation_state,
      moderation_until = excluded.moderation_until,
      moderation_report_id = excluded.moderation_report_id,
      updated_at = excluded.updated_at
    where (
      private.account_controls.moderation_state,
      private.account_controls.moderation_until,
      private.account_controls.moderation_report_id
    ) is distinct from (
      excluded.moderation_state,
      excluded.moderation_until,
      excluded.moderation_report_id
    );
  else
    insert into private.account_controls (
      user_id,
      moderation_state,
      moderation_until,
      moderation_report_id,
      updated_at
    ) values (
      p_user_id,
      'clear',
      null,
      null,
      statement_timestamp()
    )
    on conflict (user_id) do update
    set
      moderation_state = excluded.moderation_state,
      moderation_until = excluded.moderation_until,
      moderation_report_id = excluded.moderation_report_id,
      updated_at = excluded.updated_at
    where (
      private.account_controls.moderation_state,
      private.account_controls.moderation_until,
      private.account_controls.moderation_report_id
    ) is distinct from ('clear', null::timestamptz, null::uuid);
  end if;
end;
$$;

revoke all on function private.refresh_account_moderation_control(uuid)
  from public, anon, authenticated, service_role;

create or replace function private.sync_account_moderation_control()
returns trigger
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  affected_user_id uuid := coalesce(new.user_id, old.user_id);
begin
  if exists (select 1 from auth.users where id = affected_user_id) then
    perform private.refresh_account_moderation_control(affected_user_id);
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke all on function private.sync_account_moderation_control()
  from public, anon, authenticated, service_role;

create trigger account_moderation_sanctions_sync_control
  after insert or update or delete on private.account_moderation_sanctions
  for each row execute function private.sync_account_moderation_control();

create or replace function private.can_account_use_core(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_user_id is not null
    and not exists (
      select 1
      from private.account_controls as control
      where control.user_id = p_user_id
        and (
          control.account_status <> 'active'
          or (
            control.moderation_state in ('suspended', 'banned')
            and (
              control.moderation_until is null
              or control.moderation_until > statement_timestamp()
            )
          )
        )
    )
    and not exists (
      select 1
      from private.account_moderation_sanctions as sanction
      where sanction.user_id = p_user_id
        and sanction.is_active
        and sanction.moderation_state in ('suspended', 'banned')
        and (
          sanction.moderation_until is null
          or sanction.moderation_until > statement_timestamp()
        )
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
    and not exists (
      select 1
      from private.account_controls as control
      where control.user_id = p_user_id
        and control.moderation_state <> 'clear'
        and (
          control.moderation_until is null
          or control.moderation_until > statement_timestamp()
        )
    )
    and not exists (
      select 1
      from private.account_moderation_sanctions as sanction
      where sanction.user_id = p_user_id
        and sanction.is_active
        and (
          sanction.moderation_until is null
          or sanction.moderation_until > statement_timestamp()
        )
    );
$$;

alter table public.conversations enable row level security;
alter table public.conversations force row level security;
alter table private.dm_conversation_pairs enable row level security;
alter table private.dm_conversation_pairs force row level security;
alter table public.conversation_members enable row level security;
alter table public.conversation_members force row level security;
alter table public.messages enable row level security;
alter table public.messages force row level security;
alter table public.report_reasons enable row level security;
alter table public.report_reasons force row level security;
alter table public.reports enable row level security;
alter table public.reports force row level security;
alter table private.report_evidence enable row level security;
alter table private.report_evidence force row level security;
alter table public.report_appeals enable row level security;
alter table public.report_appeals force row level security;
alter table private.moderation_operators enable row level security;
alter table private.moderation_operators force row level security;
alter table private.moderation_decisions enable row level security;
alter table private.moderation_decisions force row level security;
alter table private.account_moderation_sanctions enable row level security;
alter table private.account_moderation_sanctions force row level security;

revoke all on table public.conversations from public, anon, authenticated;
revoke all on table private.dm_conversation_pairs from public, anon, authenticated;
revoke all on table public.conversation_members from public, anon, authenticated;
revoke all on table public.messages from public, anon, authenticated;
revoke all on table public.report_reasons from public, anon, authenticated;
revoke all on table public.reports from public, anon, authenticated;
revoke all on table private.report_evidence
  from public, anon, authenticated, service_role;
revoke all on table public.report_appeals from public, anon, authenticated;
revoke all on table private.moderation_operators
  from public, anon, authenticated, service_role;
revoke all on table private.moderation_decisions
  from public, anon, authenticated, service_role;
revoke all on table private.account_moderation_sanctions
  from public, anon, authenticated, service_role;

grant select on table public.report_reasons to authenticated;

create policy "report_reasons_select_active"
  on public.report_reasons
  for select
  to authenticated
  using (is_active);

create or replace function private.can_access_conversation(
  p_user_id uuid,
  p_conversation_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_user_id is not null
    and private.can_account_use_core(p_user_id)
    and exists (
      select 1
      from public.conversations as conversation
      join public.conversation_members as own_membership
        on own_membership.conversation_id = conversation.id
       and own_membership.user_id = p_user_id
      where conversation.id = p_conversation_id
        and (
          (
            conversation.kind = 'dm'
            and exists (
              select 1
              from private.dm_conversation_pairs as pair
              where pair.conversation_id = conversation.id
                and p_user_id in (pair.user_low, pair.user_high)
                and private.are_friends(
                  p_user_id,
                  case
                    when pair.user_low = p_user_id then pair.user_high
                    else pair.user_low
                  end
                )
            )
          )
          or (
            conversation.kind = 'ride'
            and private.is_ride_member(conversation.ride_id, p_user_id)
            and not exists (
              select 1
              from public.ride_members as other_member
              where other_member.ride_id = conversation.ride_id
                and other_member.user_id <> p_user_id
                and private.is_blocked_between(
                  p_user_id,
                  other_member.user_id
                )
            )
          )
        )
    );
$$;

create or replace function private.can_send_conversation_message(
  p_user_id uuid,
  p_conversation_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.can_account_message(p_user_id)
    and private.can_access_conversation(p_user_id, p_conversation_id)
    and exists (
      select 1
      from public.conversations as conversation
      left join public.rides as ride on ride.id = conversation.ride_id
      where conversation.id = p_conversation_id
        and (
          conversation.kind = 'dm'
          or ride.status in ('scheduled', 'active')
        )
    );
$$;

revoke all on function private.can_access_conversation(uuid, uuid)
  from public, anon, authenticated;
revoke all on function private.can_send_conversation_message(uuid, uuid)
  from public, anon, authenticated;

create policy "conversations_select_authorized"
  on public.conversations
  for select
  to authenticated
  using (private.can_access_conversation((select auth.uid()), id));

create policy "conversation_members_select_authorized"
  on public.conversation_members
  for select
  to authenticated
  using (
    private.can_access_conversation(
      (select auth.uid()),
      conversation_id
    )
  );

create policy "messages_select_authorized"
  on public.messages
  for select
  to authenticated
  using (
    private.can_access_conversation(
      (select auth.uid()),
      conversation_id
    )
  );

create policy "reports_select_reporter"
  on public.reports
  for select
  to authenticated
  using (reporter_id = (select auth.uid()));

create policy "report_appeals_select_appellant"
  on public.report_appeals
  for select
  to authenticated
  using (appellant_id = (select auth.uid()));

create or replace function private.sync_ride_conversation_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conversation_id uuid;
  v_ride_host_id uuid;
begin
  if tg_op = 'INSERT' then
    select host_id into v_ride_host_id
    from public.rides
    where id = new.ride_id;

    insert into public.conversations (kind, ride_id, created_by)
    values ('ride', new.ride_id, v_ride_host_id)
    on conflict (ride_id) do nothing;

    select id into v_conversation_id
    from public.conversations
    where ride_id = new.ride_id;

    insert into public.conversation_members (conversation_id, user_id)
    values (v_conversation_id, new.user_id)
    on conflict (conversation_id, user_id) do nothing;

    return new;
  end if;

  select id into v_conversation_id
  from public.conversations
  where ride_id = old.ride_id;

  if v_conversation_id is not null then
    delete from public.conversation_members as member
    where member.conversation_id = v_conversation_id
      and member.user_id = old.user_id;
  end if;

  return old;
end;
$$;

revoke all on function private.sync_ride_conversation_member()
  from public, anon, authenticated;

create trigger ride_members_sync_conversation
  after insert or delete on public.ride_members
  for each row execute function private.sync_ride_conversation_member();

insert into public.conversations (kind, ride_id, created_by)
select 'ride', ride.id, ride.host_id
from public.rides as ride
on conflict (ride_id) do nothing;

insert into public.conversation_members (conversation_id, user_id, joined_at)
select conversation.id, member.user_id, member.joined_at
from public.ride_members as member
join public.conversations as conversation on conversation.ride_id = member.ride_id
on conflict (conversation_id, user_id) do nothing;

create or replace function public.create_dm(
  p_target_user_id uuid,
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
  user_low_id uuid;
  user_high_id uuid;
  conversation_id uuid;
  request_hash text;
  stored_request_hash text;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_target_user_id is null or p_idempotency_key is null then
    raise exception using
      errcode = '22004',
      message = 'target user and idempotency key are required';
  end if;
  if current_user_id = p_target_user_id then
    raise exception using errcode = '23514', message = 'cannot message yourself';
  end if;

  user_low_id := least(current_user_id, p_target_user_id);
  user_high_id := greatest(current_user_id, p_target_user_id);
  request_hash := private.command_request_hash(
    pg_catalog.jsonb_build_object('target_user_id', p_target_user_id)
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      current_user_id::text || ':create_dm:' || p_idempotency_key::text,
      0
    )
  );

  perform private.lock_relationship_pair(current_user_id, p_target_user_id);

  select resource_id, command_receipts.request_hash
  into conversation_id, stored_request_hash
  from private.command_receipts
  where user_id = current_user_id
    and command_name = 'create_dm'
    and idempotency_key = p_idempotency_key;
  if found then
    if stored_request_hash is distinct from request_hash then
      raise exception using errcode = '22023', message = 'idempotency key payload mismatch';
    end if;
    return conversation_id;
  end if;

  perform private.consume_command_rate_limit(
    current_user_id, 'create_dm', 20, interval '1 day'
  );

  if not exists (
    select 1
    from public.profiles
    where id = p_target_user_id and onboarding_completed
  ) then
    raise exception using errcode = '23503', message = 'target user unavailable';
  end if;
  if not private.are_friends(current_user_id, p_target_user_id) then
    raise exception using errcode = '42501', message = 'confirmed friendship required';
  end if;

  select pair.conversation_id into conversation_id
  from private.dm_conversation_pairs as pair
  where pair.user_low = user_low_id and pair.user_high = user_high_id;

  if found then
    insert into private.command_receipts (
      user_id,
      command_name,
      idempotency_key,
      resource_id,
      request_hash
    ) values (
      current_user_id,
      'create_dm',
      p_idempotency_key,
      conversation_id,
      request_hash
    );

    return conversation_id;
  end if;

  insert into public.conversations (kind, created_by)
  values ('dm', current_user_id)
  returning id into conversation_id;

  insert into private.dm_conversation_pairs (
    conversation_id,
    user_low,
    user_high
  ) values (
    conversation_id,
    user_low_id,
    user_high_id
  );

  insert into public.conversation_members (conversation_id, user_id)
  values
    (conversation_id, user_low_id),
    (conversation_id, user_high_id);

  insert into private.command_receipts (
    user_id,
    command_name,
    idempotency_key,
    resource_id,
    request_hash
  ) values (
    current_user_id,
    'create_dm',
    p_idempotency_key,
    conversation_id,
    request_hash
  );

  return conversation_id;
end;
$$;

create or replace function public.get_conversations()
returns table (
  id uuid,
  kind text,
  ride_id uuid,
  title text,
  counterpart_user_id uuid,
  counterpart_handle text,
  counterpart_avatar_path text,
  last_message_preview text,
  last_message_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    conversation.id,
    conversation.kind,
    conversation.ride_id,
    case
      when conversation.kind = 'dm'
        then coalesce(counterpart.display_name, counterpart.handle, 'Snowmate user')
      else coalesce(resort.name, 'Ride chat')
    end,
    counterpart.id,
    counterpart.handle,
    counterpart.avatar_path,
    latest_message.body,
    latest_message.created_at,
    conversation.created_at
  from public.conversations as conversation
  join public.conversation_members as own_membership
    on own_membership.conversation_id = conversation.id
   and own_membership.user_id = auth.uid()
  left join private.dm_conversation_pairs as pair
    on pair.conversation_id = conversation.id
  left join public.profiles as counterpart
    on counterpart.id = case
      when pair.user_low = auth.uid() then pair.user_high
      when pair.user_high = auth.uid() then pair.user_low
      else null
    end
  left join public.rides as ride on ride.id = conversation.ride_id
  left join public.resorts as resort on resort.id = ride.resort_id
  left join lateral (
    select message.body, message.created_at
    from public.messages as message
    where message.conversation_id = conversation.id
    order by message.created_at desc, message.id desc
    limit 1
  ) as latest_message on true
  where auth.uid() is not null
    and private.can_access_conversation(auth.uid(), conversation.id)
  order by
    coalesce(latest_message.created_at, conversation.created_at) desc,
    conversation.id;
$$;

create or replace function public.get_messages(
  p_conversation_id uuid,
  p_before timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 50
)
returns table (
  id uuid,
  sender_id uuid,
  sender_display_name text,
  sender_avatar_path text,
  body text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_conversation_id is null
    or not private.can_access_conversation(current_user_id, p_conversation_id)
  then
    raise exception using errcode = '42501', message = 'conversation unavailable';
  end if;
  if (p_before is null) <> (p_before_id is null) then
    raise exception using
      errcode = '22023',
      message = 'message cursor timestamp and id must be provided together';
  end if;

  return query
  select
    message.id,
    message.sender_id,
    sender.display_name,
    sender.avatar_path,
    message.body,
    message.created_at
  from public.messages as message
  join public.profiles as sender on sender.id = message.sender_id
  where message.conversation_id = p_conversation_id
    and (
      p_before is null
      or (message.created_at, message.id) < (p_before, p_before_id)
    )
  order by message.created_at desc, message.id desc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
end;
$$;

create or replace function public.send_message(
  p_conversation_id uuid,
  p_body text,
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
  clean_body text := btrim(coalesce(p_body, ''));
  message_id uuid;
  request_hash text;
  stored_request_hash text;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_conversation_id is null or p_idempotency_key is null then
    raise exception using
      errcode = '22004',
      message = 'conversation and idempotency key are required';
  end if;

  request_hash := private.command_request_hash(
    pg_catalog.jsonb_build_object(
      'conversation_id', p_conversation_id,
      'body', clean_body
    )
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'snowmate:send_message:' || current_user_id::text || ':'
        || p_idempotency_key::text,
      0
    )
  );

  select resource_id, command_receipts.request_hash
  into message_id, stored_request_hash
  from private.command_receipts
  where user_id = current_user_id
    and command_name = 'send_message'
    and idempotency_key = p_idempotency_key;
  if found then
    if stored_request_hash is distinct from request_hash then
      raise exception using errcode = '22023', message = 'idempotency key payload mismatch';
    end if;
    return message_id;
  end if;

  perform private.consume_command_rate_limit(
    current_user_id, 'send_message', 30, interval '1 minute'
  );

  if char_length(clean_body) not between 1 and 1000
    or clean_body ~ '[[:cntrl:]]'
    or clean_body ~ U&'[\202A-\202E\2066-\2069]'
  then
    raise exception using errcode = '23514', message = 'message text is invalid';
  end if;
  if not private.can_send_conversation_message(
    current_user_id,
    p_conversation_id
  ) then
    raise exception using errcode = '42501', message = 'conversation unavailable';
  end if;
  insert into public.messages (conversation_id, sender_id, body)
  values (p_conversation_id, current_user_id, clean_body)
  returning id into message_id;

  update public.conversations
  set last_message_at = statement_timestamp()
  where id = p_conversation_id;

  insert into private.command_receipts (
    user_id,
    command_name,
    idempotency_key,
    resource_id,
    request_hash
  ) values (
    current_user_id,
    'send_message',
    p_idempotency_key,
    message_id,
    request_hash
  );

  return message_id;
end;
$$;

create or replace function public.create_report(
  p_target_user_id uuid,
  p_reason_code text,
  p_details text,
  p_message_id uuid,
  p_ride_id uuid,
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
  clean_details text := btrim(coalesce(p_details, ''));
  reason_record public.report_reasons%rowtype;
  message_sender_id uuid;
  message_conversation_id uuid;
  message_ride_id uuid;
  reported_message_body text;
  reported_message_created_at timestamptz;
  effective_ride_id uuid := p_ride_id;
  report_id uuid;
  request_hash text;
  stored_request_hash text;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_target_user_id is null
    or p_reason_code is null
    or p_idempotency_key is null
  then
    raise exception using
      errcode = '22004',
      message = 'target, reason and idempotency key are required';
  end if;
  if current_user_id = p_target_user_id then
    raise exception using errcode = '23514', message = 'cannot report yourself';
  end if;

  request_hash := private.command_request_hash(
    pg_catalog.jsonb_build_object(
      'target_user_id', p_target_user_id,
      'reason_code', p_reason_code,
      'details', clean_details,
      'message_id', p_message_id,
      'ride_id', p_ride_id
    )
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'snowmate:create_report:' || current_user_id::text || ':'
        || p_idempotency_key::text,
      0
    )
  );

  select resource_id, command_receipts.request_hash
  into report_id, stored_request_hash
  from private.command_receipts
  where user_id = current_user_id
    and command_name = 'create_report'
    and idempotency_key = p_idempotency_key;
  if found then
    if stored_request_hash is distinct from request_hash then
      raise exception using errcode = '22023', message = 'idempotency key payload mismatch';
    end if;
    return report_id;
  end if;

  perform private.consume_command_rate_limit(
    current_user_id, 'create_report', 20, interval '1 day'
  );

  if not exists (select 1 from public.profiles where id = p_target_user_id) then
    raise exception using errcode = '23503', message = 'target user unavailable';
  end if;
  if char_length(clean_details) > 2000
    or clean_details ~ '[[:cntrl:]]'
    or clean_details ~ U&'[\202A-\202E\2066-\2069]'
  then
    raise exception using errcode = '23514', message = 'report details are invalid';
  end if;

  select * into reason_record
  from public.report_reasons
  where code = p_reason_code and is_active;
  if not found then
    raise exception using errcode = '23503', message = 'report reason unavailable';
  end if;

  if p_message_id is not null then
    select
      message.sender_id,
      message.conversation_id,
      conversation.ride_id,
      message.body,
      message.created_at
    into
      message_sender_id,
      message_conversation_id,
      message_ride_id,
      reported_message_body,
      reported_message_created_at
    from public.messages as message
    join public.conversations as conversation
      on conversation.id = message.conversation_id
    where message.id = p_message_id;

    if not found then
      raise exception using errcode = '23503', message = 'message unavailable';
    end if;
    if message_sender_id <> p_target_user_id then
      raise exception using errcode = '23514', message = 'message target mismatch';
    end if;
    if not exists (
      select 1
      from public.conversation_members
      where conversation_id = message_conversation_id
        and user_id = current_user_id
    ) and not (
      message_ride_id is not null
      and private.was_ride_participant(message_ride_id, current_user_id)
    ) then
      raise exception using errcode = '42501', message = 'message context unavailable';
    end if;
    if message_ride_id is null and p_ride_id is not null then
      raise exception using errcode = '23514', message = 'ride context mismatch';
    end if;
    if message_ride_id is not null
      and p_ride_id is not null
      and message_ride_id <> p_ride_id
    then
      raise exception using errcode = '23514', message = 'ride context mismatch';
    end if;

    effective_ride_id := coalesce(message_ride_id, p_ride_id);
  end if;

  if effective_ride_id is not null then
    if not private.was_ride_participant(effective_ride_id, current_user_id) then
      raise exception using errcode = '42501', message = 'ride context unavailable';
    end if;
    if not private.was_ride_participant(effective_ride_id, p_target_user_id) then
      raise exception using errcode = '23514', message = 'ride target mismatch';
    end if;
  end if;

  insert into public.reports (
    reporter_id,
    target_user_id,
    reason_code,
    message_id,
    ride_id,
    priority,
    severity,
    target_response_at
  ) values (
    current_user_id,
    p_target_user_id,
    reason_record.code,
    p_message_id,
    effective_ride_id,
    reason_record.priority,
    reason_record.severity,
    statement_timestamp()
      + make_interval(hours => reason_record.response_hours)
  )
  returning id into report_id;

  insert into private.report_evidence (
    report_id,
    details,
    reported_message_body,
    reported_message_created_at
  ) values (
    report_id,
    clean_details,
    reported_message_body,
    reported_message_created_at
  );

  insert into private.command_receipts (
    user_id,
    command_name,
    idempotency_key,
    resource_id,
    request_hash
  ) values (
    current_user_id,
    'create_report',
    p_idempotency_key,
    report_id,
    request_hash
  );

  return report_id;
end;
$$;

create or replace function public.get_own_reports()
returns table (
  id uuid,
  target_user_id uuid,
  reason_code text,
  message_id uuid,
  ride_id uuid,
  details text,
  status text,
  priority text,
  severity text,
  created_at timestamptz,
  target_response_at timestamptz,
  resolved_at timestamptz,
  appeal_status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    report.id,
    report.target_user_id,
    report.reason_code,
    report.message_id,
    report.ride_id,
    coalesce(evidence.details, ''),
    report.status,
    report.priority,
    report.severity,
    report.created_at,
    report.target_response_at,
    report.resolved_at,
    appeal.status
  from public.reports as report
  left join private.report_evidence as evidence on evidence.report_id = report.id
  left join lateral (
    select report_appeal.status
    from public.report_appeals as report_appeal
    where report_appeal.report_id = report.id
      and report_appeal.appellant_id = auth.uid()
    order by report_appeal.created_at desc
    limit 1
  ) as appeal on true
  where auth.uid() is not null
    and report.reporter_id = auth.uid()
  order by report.created_at desc, report.id;
$$;

create or replace function public.create_appeal(
  p_report_id uuid,
  p_body text,
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
  clean_body text := btrim(coalesce(p_body, ''));
  report_record public.reports%rowtype;
  appeal_id uuid;
  is_reporter boolean;
  is_actioned_target boolean;
  request_hash text;
  stored_request_hash text;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_report_id is null or p_idempotency_key is null then
    raise exception using
      errcode = '22004',
      message = 'report and idempotency key are required';
  end if;

  request_hash := private.command_request_hash(
    pg_catalog.jsonb_build_object(
      'report_id', p_report_id,
      'body', clean_body
    )
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'snowmate:create_appeal:' || current_user_id::text || ':'
        || p_idempotency_key::text,
      0
    )
  );

  select resource_id, command_receipts.request_hash
  into appeal_id, stored_request_hash
  from private.command_receipts
  where user_id = current_user_id
    and command_name = 'create_appeal'
    and idempotency_key = p_idempotency_key;
  if found then
    if stored_request_hash is distinct from request_hash then
      raise exception using errcode = '22023', message = 'idempotency key payload mismatch';
    end if;
    return appeal_id;
  end if;

  perform private.consume_command_rate_limit(
    current_user_id, 'create_appeal', 5, interval '1 day'
  );

  if char_length(clean_body) not between 10 and 2000
    or clean_body ~ '[[:cntrl:]]'
    or clean_body ~ U&'[\202A-\202E\2066-\2069]'
  then
    raise exception using errcode = '23514', message = 'appeal text is invalid';
  end if;

  select * into report_record
  from public.reports
  where id = p_report_id
  for update;
  if not found then
    raise exception using errcode = '23503', message = 'report unavailable';
  end if;
  if report_record.resolved_at is not null
    and report_record.resolved_at
      <= statement_timestamp() - interval '90 days'
  then
    raise exception using errcode = '23514', message = 'appeal window expired';
  end if;

  is_reporter := report_record.reporter_id = current_user_id
    and report_record.status in ('dismissed', 'closed');
  is_actioned_target := report_record.target_user_id = current_user_id
    and report_record.status in ('actioned', 'closed')
    and exists (
      select 1
      from private.moderation_decisions as decision
      where decision.report_id = report_record.id
        and decision.action in (
          'content_removed',
          'warning',
          'account_restricted',
          'account_suspended',
          'account_banned'
        )
    );

  if not is_reporter and not is_actioned_target then
    raise exception using errcode = '23514', message = 'report is not appealable';
  end if;
  if exists (
    select 1
    from public.report_appeals
    where report_id = p_report_id and appellant_id = current_user_id
  ) then
    raise exception using errcode = '23514', message = 'appeal already exists';
  end if;

  insert into public.report_appeals (
    report_id,
    appellant_id,
    body,
    target_response_at
  ) values (
    p_report_id,
    current_user_id,
    clean_body,
    statement_timestamp() + interval '7 days'
  )
  returning id into appeal_id;

  insert into private.command_receipts (
    user_id,
    command_name,
    idempotency_key,
    resource_id,
    request_hash
  ) values (
    current_user_id,
    'create_appeal',
    p_idempotency_key,
    appeal_id,
    request_hash
  );

  return appeal_id;
end;
$$;

create or replace function private.is_moderation_operator(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_user_id is not null
    and private.can_account_use_core(p_user_id)
    and coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
    and exists (
      select 1
      from private.moderation_operators as moderator
      where moderator.user_id = p_user_id
        and moderator.is_active
    );
$$;

revoke all on function private.is_moderation_operator(uuid)
  from public, anon, authenticated, service_role;

create or replace function public.get_moderation_queue(
  p_limit integer default 100
)
returns table (
  id uuid,
  reporter_id uuid,
  target_user_id uuid,
  reason_code text,
  message_id uuid,
  ride_id uuid,
  details text,
  reported_message_body text,
  status text,
  priority text,
  severity text,
  created_at timestamptz,
  target_response_at timestamptz,
  pending_appeals integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_moderation_operator(auth.uid()) then
    raise exception using
      errcode = '42501',
      message = 'active moderation operator with MFA required';
  end if;

  return query
  select
    report.id,
    report.reporter_id,
    report.target_user_id,
    report.reason_code,
    report.message_id,
    report.ride_id,
    coalesce(evidence.details, ''),
    evidence.reported_message_body,
    report.status,
    report.priority,
    report.severity,
    report.created_at,
    report.target_response_at,
    (
      select count(*)::integer
      from public.report_appeals as appeal
      where appeal.report_id = report.id and appeal.status = 'pending'
    )
  from public.reports as report
  left join private.report_evidence as evidence on evidence.report_id = report.id
  where report.status in ('open', 'triaged')
    or exists (
      select 1
      from public.report_appeals as appeal
      where appeal.report_id = report.id and appeal.status = 'pending'
    )
  order by
    case when report.priority = 'critical' then 0 else 1 end,
    report.target_response_at,
    report.created_at
  limit greatest(1, least(coalesce(p_limit, 100), 500));
end;
$$;

create or replace function public.get_moderation_appeals(p_report_id uuid)
returns table (
  id uuid,
  report_id uuid,
  appellant_id uuid,
  body text,
  status text,
  target_response_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_moderation_operator(auth.uid()) then
    raise exception using
      errcode = '42501',
      message = 'active moderation operator with MFA required';
  end if;
  if p_report_id is null then
    raise exception using errcode = '22004', message = 'report required';
  end if;

  return query
  select
    appeal.id,
    appeal.report_id,
    appeal.appellant_id,
    appeal.body,
    appeal.status,
    appeal.target_response_at,
    appeal.resolved_at,
    appeal.created_at
  from public.report_appeals as appeal
  where appeal.report_id = p_report_id
  order by appeal.created_at, appeal.id;
end;
$$;

create or replace function public.moderate_report(
  p_report_id uuid,
  p_new_status text,
  p_action text,
  p_reason text,
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
  clean_reason text := btrim(coalesce(p_reason, ''));
  report_record public.reports%rowtype;
  decision_id uuid;
  request_hash text;
  stored_request_hash text;
begin
  if p_report_id is null
    or p_idempotency_key is null
  then
    raise exception using
      errcode = '22004',
      message = 'report and idempotency key are required';
  end if;
  if not private.is_moderation_operator(current_user_id) then
    raise exception using
      errcode = '42501',
      message = 'active moderation operator with MFA required';
  end if;
  if p_new_status not in ('triaged', 'actioned', 'dismissed', 'closed') then
    raise exception using errcode = '23514', message = 'invalid moderation status';
  end if;
  if p_action not in (
    'no_action',
    'escalated',
    'content_removed',
    'warning',
    'account_restricted',
    'account_suspended',
    'account_banned'
  ) then
    raise exception using errcode = '23514', message = 'invalid moderation action';
  end if;
  if char_length(clean_reason) not between 5 and 2000
    or clean_reason ~ '[[:cntrl:]]'
    or clean_reason ~ U&'[\202A-\202E\2066-\2069]'
  then
    raise exception using errcode = '23514', message = 'moderation reason is invalid';
  end if;
  if (p_new_status = 'triaged' and p_action <> 'escalated')
    or (
      p_new_status = 'actioned'
      and p_action not in (
        'content_removed',
        'warning',
        'account_restricted',
        'account_suspended',
        'account_banned'
      )
    )
    or (p_new_status in ('dismissed', 'closed') and p_action <> 'no_action')
  then
    raise exception using
      errcode = '23514',
      message = 'moderation status and action do not match';
  end if;

  request_hash := private.command_request_hash(
    pg_catalog.jsonb_build_object(
      'report_id', p_report_id,
      'new_status', p_new_status,
      'action', p_action,
      'reason', clean_reason
    )
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'snowmate:moderation_decision:' || current_user_id::text || ':'
        || p_idempotency_key::text,
      0
    )
  );

  select decision.id, decision.request_hash
  into decision_id, stored_request_hash
  from private.moderation_decisions as decision
  where decision.operator_id = current_user_id
    and decision.idempotency_key = p_idempotency_key;
  if found then
    if stored_request_hash is distinct from request_hash then
      raise exception using errcode = '22023', message = 'idempotency key payload mismatch';
    end if;
    return decision_id;
  end if;

  perform private.consume_command_rate_limit(
    current_user_id, 'moderate_report', 100, interval '1 hour'
  );

  select * into report_record
  from public.reports
  where id = p_report_id
  for update;
  if not found then
    raise exception using errcode = '23503', message = 'report unavailable';
  end if;
  if report_record.status = 'closed' then
    raise exception using errcode = '23514', message = 'closed report cannot transition';
  end if;
  if report_record.status in ('actioned', 'dismissed')
    and p_new_status <> 'closed'
  then
    raise exception using errcode = '23514', message = 'resolved report can only be closed';
  end if;
  if p_action = 'content_removed' and report_record.message_id is null then
    raise exception using errcode = '23514', message = 'content removal requires a live message';
  end if;
  if p_action in ('account_restricted', 'account_suspended', 'account_banned')
    and report_record.target_user_id is null
  then
    raise exception using errcode = '23514', message = 'account action requires a target';
  end if;

  insert into private.moderation_decisions (
    report_id,
    operator_id,
    previous_status,
    next_status,
    action,
    reason,
    idempotency_key,
    request_hash
  ) values (
    report_record.id,
    current_user_id,
    report_record.status,
    p_new_status,
    p_action,
    clean_reason,
    p_idempotency_key,
    request_hash
  )
  returning id into decision_id;

  if p_action = 'content_removed' then
    delete from public.messages where id = report_record.message_id;
  end if;

  if p_action in ('account_restricted', 'account_suspended', 'account_banned') then
    insert into private.account_moderation_sanctions (
      source_report_id,
      source_decision_id,
      user_id,
      moderation_state,
      moderation_until,
      updated_at
    ) values (
      report_record.id,
      decision_id,
      report_record.target_user_id,
      case p_action
        when 'account_restricted' then 'restricted'
        when 'account_suspended' then 'suspended'
        else 'banned'
      end,
      case p_action
        when 'account_restricted' then statement_timestamp() + interval '24 hours'
        when 'account_suspended' then statement_timestamp() + interval '7 days'
        else null
      end,
      statement_timestamp()
    )
    on conflict (source_report_id) do update
    set
      moderation_state = excluded.moderation_state,
      moderation_until = excluded.moderation_until,
      source_decision_id = excluded.source_decision_id,
      is_active = true,
      updated_at = excluded.updated_at;
  end if;

  update public.reports
  set
    status = p_new_status,
    resolved_at = case
      when p_new_status in ('actioned', 'dismissed', 'closed')
        then statement_timestamp()
      else null
    end
  where id = p_report_id;

  return decision_id;
end;
$$;

create or replace function public.resolve_report_appeal(
  p_appeal_id uuid,
  p_outcome text,
  p_reason text,
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
  clean_reason text := btrim(coalesce(p_reason, ''));
  appeal_record public.report_appeals%rowtype;
  report_record public.reports%rowtype;
  decision_id uuid;
  request_hash text;
  stored_request_hash text;
  next_report_status text;
begin
  if not private.is_moderation_operator(current_user_id) then
    raise exception using
      errcode = '42501',
      message = 'active moderation operator with MFA required';
  end if;
  if p_appeal_id is null or p_idempotency_key is null then
    raise exception using errcode = '22004', message = 'appeal and idempotency key are required';
  end if;
  if p_outcome not in ('upheld', 'rejected') then
    raise exception using errcode = '23514', message = 'invalid appeal outcome';
  end if;
  if char_length(clean_reason) not between 5 and 2000
    or clean_reason ~ '[[:cntrl:]]'
    or clean_reason ~ U&'[\202A-\202E\2066-\2069]'
  then
    raise exception using errcode = '23514', message = 'appeal reason is invalid';
  end if;

  request_hash := private.command_request_hash(
    pg_catalog.jsonb_build_object(
      'appeal_id', p_appeal_id,
      'outcome', p_outcome,
      'reason', clean_reason
    )
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'snowmate:moderation_decision:' || current_user_id::text || ':'
        || p_idempotency_key::text,
      0
    )
  );

  select decision.id, decision.request_hash
  into decision_id, stored_request_hash
  from private.moderation_decisions as decision
  where decision.operator_id = current_user_id
    and decision.idempotency_key = p_idempotency_key;
  if found then
    if stored_request_hash is distinct from request_hash then
      raise exception using errcode = '22023', message = 'idempotency key payload mismatch';
    end if;
    return decision_id;
  end if;

  perform private.consume_command_rate_limit(
    current_user_id, 'resolve_report_appeal', 100, interval '1 hour'
  );

  select appeal.* into appeal_record
  from public.report_appeals as appeal
  where appeal.id = p_appeal_id
  for update;
  if not found or appeal_record.status <> 'pending' then
    raise exception using errcode = '23514', message = 'appeal is not pending';
  end if;

  select report.* into report_record
  from public.reports as report
  where report.id = appeal_record.report_id
  for update;
  if not found then
    raise exception using errcode = '23503', message = 'report unavailable';
  end if;

  next_report_status := case when p_outcome = 'upheld' then 'triaged' else 'closed' end;

  update public.report_appeals
  set status = p_outcome, resolved_at = statement_timestamp()
  where id = p_appeal_id;

  update public.reports
  set
    status = next_report_status,
    resolved_at = case
      when next_report_status = 'triaged' then null
      else statement_timestamp()
    end
  where id = report_record.id;

  if p_outcome = 'upheld'
    and appeal_record.appellant_id = report_record.target_user_id
  then
    update private.account_moderation_sanctions
    set is_active = false
    where source_report_id = report_record.id
      and user_id = report_record.target_user_id;
  end if;

  insert into private.moderation_decisions (
    report_id,
    appeal_id,
    operator_id,
    previous_status,
    next_status,
    action,
    reason,
    idempotency_key,
    request_hash
  ) values (
    report_record.id,
    appeal_record.id,
    current_user_id,
    report_record.status,
    next_report_status,
    case when p_outcome = 'upheld' then 'appeal_upheld' else 'appeal_rejected' end,
    clean_reason,
    p_idempotency_key,
    request_hash
  )
  returning id into decision_id;

  return decision_id;
end;
$$;

create or replace function private.cleanup_chat_and_moderation_data(
  p_now timestamptz default now()
)
returns table (
  deleted_ride_conversations bigint,
  deleted_dm_conversations bigint,
  deleted_report_evidence bigint,
  purged_appeal_contents bigint,
  deleted_report_records bigint
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  ride_conversation_count bigint;
  dm_conversation_count bigint;
  report_evidence_count bigint;
  appeal_content_count bigint;
  report_record_count bigint;
begin
  if p_now is null then
    raise exception using errcode = '22004', message = 'cleanup timestamp required';
  end if;

  delete from public.conversations as conversation
  using public.rides as ride
  where conversation.kind = 'ride'
    and conversation.ride_id = ride.id
    and ride.starts_at <= p_now - interval '90 days';
  get diagnostics ride_conversation_count = row_count;

  delete from public.conversations as conversation
  where conversation.kind = 'dm'
    and coalesce(conversation.last_message_at, conversation.created_at)
      <= p_now - interval '12 months';
  get diagnostics dm_conversation_count = row_count;

  with expired_reports as materialized (
    select report.id
    from public.reports as report
    where report.resolved_at is not null
      and report.resolved_at <= p_now - interval '90 days'
      and not exists (
        select 1
        from public.report_appeals as appeal
        where appeal.report_id = report.id
          and (
            appeal.status = 'pending'
            or appeal.resolved_at > p_now - interval '90 days'
          )
      )
    for update of report skip locked
  )
  delete from private.report_evidence as evidence
  using expired_reports as expired
  where evidence.report_id = expired.id;
  get diagnostics report_evidence_count = row_count;

  update public.report_appeals as appeal
  set
    body = null,
    content_purged_at = p_now
  where appeal.body is not null
    and appeal.status <> 'pending'
    and appeal.resolved_at is not null
    and appeal.resolved_at <= p_now - interval '90 days';
  get diagnostics appeal_content_count = row_count;

  delete from public.reports as report
  where report.resolved_at is not null
    and report.resolved_at <= p_now - interval '12 months'
    and not exists (
      select 1
      from public.report_appeals as appeal
      where appeal.report_id = report.id
        and (
          appeal.status = 'pending'
          or appeal.resolved_at > p_now - interval '12 months'
        )
    );
  get diagnostics report_record_count = row_count;

  return query select
    ride_conversation_count,
    dm_conversation_count,
    report_evidence_count,
    appeal_content_count,
    report_record_count;
end;
$$;

revoke all on function private.cleanup_chat_and_moderation_data(timestamptz)
  from public, anon, authenticated, service_role;

comment on function private.cleanup_chat_and_moderation_data(timestamptz) is
  'Deletes expired chat and moderation content; intended for a monitored daily Cron job.';

revoke all on function public.create_dm(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.get_conversations()
  from public, anon, authenticated;
revoke all on function public.get_messages(uuid, timestamptz, uuid, integer)
  from public, anon, authenticated;
revoke all on function public.send_message(uuid, text, uuid)
  from public, anon, authenticated;
revoke all on function public.create_report(uuid, text, text, uuid, uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.get_own_reports()
  from public, anon, authenticated;
revoke all on function public.create_appeal(uuid, text, uuid)
  from public, anon, authenticated;

grant execute on function public.create_dm(uuid, uuid) to authenticated;
grant execute on function public.get_conversations() to authenticated;
grant execute on function public.get_messages(uuid, timestamptz, uuid, integer)
  to authenticated;
grant execute on function public.send_message(uuid, text, uuid) to authenticated;
grant execute on function public.create_report(uuid, text, text, uuid, uuid, uuid)
  to authenticated;
grant execute on function public.get_own_reports() to authenticated;
grant execute on function public.create_appeal(uuid, text, uuid) to authenticated;

revoke all on function public.get_moderation_queue(integer)
  from public, anon, authenticated, service_role;
revoke all on function public.moderate_report(uuid, text, text, text, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.get_moderation_appeals(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.resolve_report_appeal(uuid, text, text, uuid)
  from public, anon, authenticated, service_role;

grant execute on function public.get_moderation_queue(integer)
  to authenticated;
grant execute on function public.moderate_report(uuid, text, text, text, uuid)
  to authenticated;
grant execute on function public.get_moderation_appeals(uuid)
  to authenticated;
grant execute on function public.resolve_report_appeal(uuid, text, text, uuid)
  to authenticated;
