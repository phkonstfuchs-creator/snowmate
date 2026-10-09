create table private.runtime_feature_flags (
  feature_key text primary key,
  enabled boolean not null default false,
  updated_at timestamptz not null default statement_timestamp(),
  constraint runtime_feature_flags_known_key check (
    feature_key in ('analytics_collection')
  )
);

insert into private.runtime_feature_flags (feature_key, enabled)
values ('analytics_collection', false);

alter table private.runtime_feature_flags enable row level security;
alter table private.runtime_feature_flags force row level security;
revoke all on table private.runtime_feature_flags
  from public, anon, authenticated, service_role;

create table private.analytics_identities (
  user_id uuid primary key references auth.users (id) on delete cascade,
  analytics_id uuid not null unique default gen_random_uuid(),
  analytics_enabled boolean not null default true,
  created_at timestamptz not null default statement_timestamp(),
  granted_at timestamptz not null default statement_timestamp(),
  withdrawn_at timestamptz,
  updated_at timestamptz not null default statement_timestamp(),
  constraint analytics_identities_consent_state check (
    (analytics_enabled and withdrawn_at is null)
    or (not analytics_enabled and withdrawn_at is not null)
  )
);

create table private.analytics_consent_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  analytics_id uuid,
  decision text not null,
  document_version text not null default 'analytics-beta-2026-08-03',
  acceptance_source text not null default 'privacy_settings',
  idempotency_key uuid not null,
  recorded_at timestamptz not null default statement_timestamp(),
  constraint analytics_consent_events_decision_value check (
    decision in ('granted', 'denied', 'withdrawn')
  ),
  constraint analytics_consent_events_document_version_length check (
    char_length(document_version) between 1 and 100
  ),
  constraint analytics_consent_events_source_value check (
    acceptance_source in ('privacy_settings')
  ),
  unique (user_id, idempotency_key)
);

create index analytics_consent_events_user_recorded
  on private.analytics_consent_events (user_id, recorded_at, id);

alter table private.analytics_identities enable row level security;
alter table private.analytics_identities force row level security;
alter table private.analytics_consent_events enable row level security;
alter table private.analytics_consent_events force row level security;
revoke all on table private.analytics_identities
  from public, anon, authenticated, service_role;
revoke all on table private.analytics_consent_events
  from public, anon, authenticated, service_role;
revoke all on sequence private.analytics_consent_events_id_seq
  from public, anon, authenticated, service_role;

create or replace function private.enforce_analytics_consent_immutability()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and not exists (
    select 1 from auth.users where id = old.user_id
  ) then
    return old;
  end if;

  raise exception using
    errcode = '55000',
    message = 'analytics consent events are immutable';
end;
$$;

revoke all on function private.enforce_analytics_consent_immutability()
  from public, anon, authenticated, service_role;

create trigger analytics_consent_events_prevent_mutation
  before update or delete on private.analytics_consent_events
  for each row execute function private.enforce_analytics_consent_immutability();

create or replace function public.set_analytics_consent(
  p_enabled boolean,
  p_idempotency_key uuid
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_analytics_id uuid;
  v_request_hash text;
  v_stored_request_hash text;
  v_now timestamptz := statement_timestamp();
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_enabled is null or p_idempotency_key is null then
    raise exception using errcode = '22004', message = 'analytics consent fields are required';
  end if;
  if p_enabled and not exists (
    select 1
    from private.runtime_feature_flags as feature
    where feature.feature_key = 'analytics_collection'
      and feature.enabled
  ) then
    raise exception using errcode = '55000', message = 'analytics unavailable';
  end if;
  if p_enabled and not private.can_account_use_core(v_user_id) then
    raise exception using errcode = '42501', message = 'account unavailable';
  end if;

  v_request_hash := private.command_request_hash(
    pg_catalog.jsonb_build_object('enabled', p_enabled)
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'snowmate:analytics_identity:' || v_user_id::text,
      0
    )
  );

  select receipt.resource_id, receipt.request_hash
  into v_analytics_id, v_stored_request_hash
  from private.command_receipts as receipt
  where receipt.user_id = v_user_id
    and receipt.command_name = 'set_analytics_consent'
    and receipt.idempotency_key = p_idempotency_key;
  if found then
    if v_stored_request_hash is distinct from v_request_hash then
      raise exception using errcode = '22023', message = 'idempotency key payload mismatch';
    end if;
    return v_analytics_id;
  end if;

  perform private.consume_command_rate_limit(
    v_user_id, 'set_analytics_consent', 30, interval '1 day'
  );

  if p_enabled then
    insert into private.analytics_identities as existing_identity (
      user_id,
      analytics_enabled,
      granted_at,
      withdrawn_at,
      updated_at
    ) values (
      v_user_id,
      true,
      v_now,
      null,
      v_now
    )
    on conflict (user_id) do update
    set
      analytics_id = case
        when existing_identity.analytics_enabled
          then existing_identity.analytics_id
        else gen_random_uuid()
      end,
      analytics_enabled = true,
      granted_at = excluded.granted_at,
      withdrawn_at = null,
      updated_at = excluded.updated_at
    returning analytics_id into v_analytics_id;
  else
    update private.analytics_identities
    set
      analytics_enabled = false,
      withdrawn_at = v_now,
      updated_at = v_now
    where user_id = v_user_id
    returning analytics_id into v_analytics_id;
  end if;

  insert into private.analytics_consent_events (
    user_id,
    analytics_id,
    decision,
    idempotency_key,
    recorded_at
  ) values (
    v_user_id,
    v_analytics_id,
    case
      when p_enabled then 'granted'
      when v_analytics_id is null then 'denied'
      else 'withdrawn'
    end,
    p_idempotency_key,
    v_now
  );

  insert into private.command_receipts (
    user_id,
    command_name,
    idempotency_key,
    resource_id,
    request_hash
  ) values (
    v_user_id,
    'set_analytics_consent',
    p_idempotency_key,
    v_analytics_id,
    v_request_hash
  );

  return v_analytics_id;
end;
$$;

revoke all on function public.set_analytics_consent(boolean, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.set_analytics_consent(boolean, uuid)
  to authenticated;

comment on table private.analytics_identities is
  'Random analytics identifiers generated by the database and bound to one account; never accepted from clients.';
comment on table private.analytics_consent_events is
  'Append-only optional analytics grant and withdrawal ledger.';
comment on table private.runtime_feature_flags is
  'Private launch gates for sensitive capabilities; analytics remains disabled until provider erasure is verified.';

create table private.data_export_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'ready',
  payload jsonb not null,
  requested_at timestamptz not null default statement_timestamp(),
  expires_at timestamptz not null,
  downloaded_at timestamptz,
  constraint data_export_requests_status_value check (
    status in ('ready', 'expired')
  ),
  constraint data_export_requests_expiry check (
    expires_at > requested_at
    and expires_at <= requested_at + interval '24 hours'
  ),
  constraint data_export_requests_download_after_request check (
    downloaded_at is null or downloaded_at >= requested_at
  )
);

create index data_export_requests_expiry
  on private.data_export_requests (expires_at);
create index data_export_requests_user_requested
  on private.data_export_requests (user_id, requested_at desc);

alter table private.data_export_requests enable row level security;
alter table private.data_export_requests force row level security;
revoke all on table private.data_export_requests
  from public, anon, authenticated, service_role;

create or replace function private.build_account_export(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'export_version', 'snowmate-json-v1',
    'generated_at', statement_timestamp(),
    'account', coalesce(
      (
        select pg_catalog.jsonb_build_object(
          'id', account.id,
          'email', account.email,
          'created_at', account.created_at,
          'last_sign_in_at', account.last_sign_in_at
        )
        from auth.users as account
        where account.id = p_user_id
      ),
      '{}'::jsonb
    ),
    'profile', coalesce(
      (
        select pg_catalog.jsonb_build_object(
          'display_name', profile.display_name,
          'handle', profile.handle,
          'city', profile.city,
          'ability_level', profile.ability_level,
          'avatar_path', profile.avatar_path,
          'bio', profile.bio,
          'is_minor', profile.is_minor,
          'account_type', profile.account_type,
          'onboarding_completed', profile.onboarding_completed,
          'created_at', profile.created_at,
          'updated_at', profile.updated_at
        )
        from public.profiles as profile
        where profile.id = p_user_id
      ),
      '{}'::jsonb
    ),
    'age_record', coalesce(
      (
        select pg_catalog.jsonb_build_object(
          'birth_date', safety.birth_date,
          'is_minor', safety.is_minor,
          'age_basis', safety.age_basis,
          'age_status_updated_at', safety.age_status_updated_at
        )
        from private.account_safety as safety
        where safety.user_id = p_user_id
      ),
      '{}'::jsonb
    ),
    'consents', coalesce(
      (
        select pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'document_kind', consent.document_kind,
            'document_version', consent.document_version,
            'accepted_at', consent.accepted_at,
            'acceptance_source', consent.acceptance_source
          ) order by consent.accepted_at, consent.id
        )
        from private.consent_ledger as consent
        where consent.user_id = p_user_id
      ),
      '[]'::jsonb
    ),
    'analytics', pg_catalog.jsonb_build_object(
      'identity', coalesce(
        (
          select pg_catalog.jsonb_build_object(
            'analytics_id', identity.analytics_id,
            'analytics_enabled', identity.analytics_enabled,
            'created_at', identity.created_at,
            'granted_at', identity.granted_at,
            'withdrawn_at', identity.withdrawn_at,
            'updated_at', identity.updated_at
          )
          from private.analytics_identities as identity
          where identity.user_id = p_user_id
        ),
        '{}'::jsonb
      ),
      'consent_events', coalesce(
        (
          select pg_catalog.jsonb_agg(
            pg_catalog.jsonb_build_object(
              'analytics_id', event.analytics_id,
              'decision', event.decision,
              'document_version', event.document_version,
              'acceptance_source', event.acceptance_source,
              'recorded_at', event.recorded_at
            ) order by event.recorded_at, event.id
          )
          from private.analytics_consent_events as event
          where event.user_id = p_user_id
        ),
        '[]'::jsonb
      )
    ),
    'friendships', coalesce(
      (
        select pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'id', friendship.id,
            'other_user_id', case
              when friendship.user_low = p_user_id then friendship.user_high
              else friendship.user_low
            end,
            'direction', case
              when friendship.requested_by = p_user_id then 'outgoing'
              else 'incoming'
            end,
            'status', friendship.status,
            'created_at', friendship.created_at,
            'responded_at', friendship.responded_at
          ) order by friendship.created_at, friendship.id
        )
        from public.friendships as friendship
        where p_user_id in (friendship.user_low, friendship.user_high)
      ),
      '[]'::jsonb
    ),
    'blocks_created', coalesce(
      (
        select pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'blocked_user_id', block.blocked_id,
            'created_at', block.created_at
          ) order by block.created_at, block.blocked_id
        )
        from public.blocks as block
        where block.blocker_id = p_user_id
      ),
      '[]'::jsonb
    ),
    'crew_memberships', coalesce(
      (
        select pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'crew_id', crew.id,
            'name', crew.name,
            'city', crew.city,
            'role', member.role,
            'joined_at', member.joined_at
          ) order by member.joined_at, crew.id
        )
        from public.crew_members as member
        join public.crews as crew on crew.id = member.crew_id
        where member.user_id = p_user_id
      ),
      '[]'::jsonb
    ),
    'hosted_rides', coalesce(
      (
        select pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'id', ride.id,
            'resort_id', ride.resort_id,
            'ability_level', ride.ability_level,
            'starts_at', ride.starts_at,
            'capacity', ride.capacity,
            'audience', ride.audience,
            'caption', ride.caption,
            'status', ride.status,
            'meeting_point', detail.meeting_point,
            'created_at', ride.created_at
          ) order by ride.created_at, ride.id
        )
        from public.rides as ride
        left join private.ride_details as detail on detail.ride_id = ride.id
        where ride.host_id = p_user_id
      ),
      '[]'::jsonb
    ),
    'ride_memberships', coalesce(
      (
        select pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'ride_id', member.ride_id,
            'role', member.role,
            'joined_at', member.joined_at
          ) order by member.joined_at, member.ride_id
        )
        from public.ride_members as member
        where member.user_id = p_user_id
      ),
      '[]'::jsonb
    ),
    'ride_requests', coalesce(
      (
        select pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'id', request.id,
            'ride_id', request.ride_id,
            'status', request.status,
            'created_at', request.created_at,
            'responded_at', request.responded_at
          ) order by request.created_at, request.id
        )
        from public.ride_join_requests as request
        where request.requester_id = p_user_id
      ),
      '[]'::jsonb
    ),
    'hosted_carpools', coalesce(
      (
        select pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'id', carpool.id,
            'resort_id', carpool.resort_id,
            'city', carpool.city,
            'direction', carpool.direction,
            'departs_at', carpool.departs_at,
            'seat_capacity', carpool.seat_capacity,
            'audience', carpool.audience,
            'note', carpool.note,
            'status', carpool.status,
            'departure_point', detail.departure_point,
            'created_at', carpool.created_at
          ) order by carpool.created_at, carpool.id
        )
        from public.carpools as carpool
        left join private.carpool_details as detail
          on detail.carpool_id = carpool.id
        where carpool.host_id = p_user_id
      ),
      '[]'::jsonb
    ),
    'carpool_memberships', coalesce(
      (
        select pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'carpool_id', member.carpool_id,
            'joined_at', member.joined_at
          ) order by member.joined_at, member.carpool_id
        )
        from public.carpool_members as member
        where member.user_id = p_user_id
      ),
      '[]'::jsonb
    ),
    'carpool_requests', coalesce(
      (
        select pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'id', request.id,
            'carpool_id', request.carpool_id,
            'status', request.status,
            'created_at', request.created_at,
            'responded_at', request.responded_at
          ) order by request.created_at, request.id
        )
        from public.carpool_requests as request
        where request.requester_id = p_user_id
      ),
      '[]'::jsonb
    ),
    'messages_sent', coalesce(
      (
        select pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'id', message.id,
            'conversation_id', message.conversation_id,
            'body', message.body,
            'created_at', message.created_at
          ) order by message.created_at, message.id
        )
        from public.messages as message
        where message.sender_id = p_user_id
      ),
      '[]'::jsonb
    ),
    'reports_submitted', coalesce(
      (
        select pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'id', report.id,
            'target_user_id', report.target_user_id,
            'reason_code', report.reason_code,
            'message_id', report.message_id,
            'ride_id', report.ride_id,
            'details', coalesce(evidence.details, ''),
            'status', report.status,
            'priority', report.priority,
            'severity', report.severity,
            'created_at', report.created_at,
            'target_response_at', report.target_response_at,
            'resolved_at', report.resolved_at
          ) order by report.created_at, report.id
        )
        from public.reports as report
        left join private.report_evidence as evidence
          on evidence.report_id = report.id
        where report.reporter_id = p_user_id
      ),
      '[]'::jsonb
    ),
    'appeals_submitted', coalesce(
      (
        select pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'id', appeal.id,
            'report_id', appeal.report_id,
            'body', appeal.body,
            'status', appeal.status,
            'created_at', appeal.created_at,
            'target_response_at', appeal.target_response_at,
            'resolved_at', appeal.resolved_at
          ) order by appeal.created_at, appeal.id
        )
        from public.report_appeals as appeal
        where appeal.appellant_id = p_user_id
      ),
      '[]'::jsonb
    ),
    'resort_presence', coalesce(
      (
        select pg_catalog.jsonb_build_object(
          'resort_id', presence.resort_id,
          'audience', presence.audience,
          'first_seen_at', presence.first_seen_at,
          'last_seen_at', presence.last_seen_at
        )
        from public.resort_presence as presence
        where presence.user_id = p_user_id
      ),
      '{}'::jsonb
    ),
    'location_sessions', coalesce(
      (
        select pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'id', session.id,
            'resort_id', session.resort_id,
            'audience', session.audience,
            'ride_id', session.ride_id,
            'foreground_only', session.foreground_only,
            'started_at', session.started_at,
            'expires_at', session.expires_at,
            'stopped_at', session.stopped_at,
            'last_heartbeat_at', session.last_heartbeat_at,
            'current_location', case
              when location.session_id is null then null
              else pg_catalog.jsonb_build_object(
                'latitude', location.latitude,
                'longitude', location.longitude,
                'accuracy_meters', location.accuracy_meters,
                'observed_at', location.observed_at
              )
            end
          ) order by session.started_at, session.id
        )
        from private.location_sessions as session
        left join private.live_locations as location
          on location.session_id = session.id
        where session.owner_id = p_user_id
      ),
      '[]'::jsonb
    )
  );
$$;

revoke all on function private.build_account_export(uuid)
  from public, anon, authenticated, service_role;

create or replace function public.request_export(p_idempotency_key uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_export_id uuid;
  v_request_hash text;
  v_stored_request_hash text;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_idempotency_key is null then
    raise exception using errcode = '22004', message = 'idempotency key required';
  end if;

  v_request_hash := private.command_request_hash(
    pg_catalog.jsonb_build_object('format', 'snowmate-json-v1')
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'snowmate:request_export:' || v_user_id::text || ':'
        || p_idempotency_key::text,
      0
    )
  );

  select receipt.resource_id, receipt.request_hash
  into v_export_id, v_stored_request_hash
  from private.command_receipts as receipt
  where receipt.user_id = v_user_id
    and receipt.command_name = 'request_export'
    and receipt.idempotency_key = p_idempotency_key;
  if found then
    if v_stored_request_hash is distinct from v_request_hash then
      raise exception using errcode = '22023', message = 'idempotency key payload mismatch';
    end if;
    return v_export_id;
  end if;

  perform private.consume_command_rate_limit(
    v_user_id, 'request_export', 2, interval '1 day'
  );

  if exists (
    select 1
    from private.account_controls as control
    where control.user_id = v_user_id
      and control.account_status <> 'active'
  ) then
    raise exception using errcode = '42501', message = 'account unavailable';
  end if;

  insert into private.data_export_requests (
    user_id,
    payload,
    expires_at
  ) values (
    v_user_id,
    private.build_account_export(v_user_id),
    statement_timestamp() + interval '24 hours'
  )
  returning id into v_export_id;

  insert into private.command_receipts (
    user_id,
    command_name,
    idempotency_key,
    resource_id,
    request_hash
  ) values (
    v_user_id,
    'request_export',
    p_idempotency_key,
    v_export_id,
    v_request_hash
  );

  return v_export_id;
end;
$$;

create or replace function public.get_export_requests()
returns table (
  id uuid,
  status text,
  requested_at timestamptz,
  expires_at timestamptz,
  downloaded_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    request.id,
    case
      when request.expires_at <= statement_timestamp() then 'expired'
      else request.status
    end,
    request.requested_at,
    request.expires_at,
    request.downloaded_at
  from private.data_export_requests as request
  where auth.uid() is not null
    and request.user_id = auth.uid()
  order by request.requested_at desc, request.id;
$$;

create or replace function public.download_account_export(p_export_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_payload jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_export_id is null then
    raise exception using errcode = '22004', message = 'export required';
  end if;

  update private.data_export_requests
  set downloaded_at = coalesce(downloaded_at, statement_timestamp())
  where id = p_export_id
    and user_id = v_user_id
    and status = 'ready'
    and expires_at > statement_timestamp()
  returning payload into v_payload;

  if not found then
    raise exception using errcode = '42501', message = 'export unavailable';
  end if;

  return v_payload;
end;
$$;

create or replace function private.cleanup_data_exports(
  p_now timestamptz default now()
)
returns bigint
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_deleted_count bigint;
begin
  if p_now is null then
    raise exception using errcode = '22004', message = 'cleanup timestamp required';
  end if;

  delete from private.command_receipts as receipt
  using private.data_export_requests as request
  where receipt.command_name = 'request_export'
    and receipt.resource_id = request.id
    and request.expires_at <= p_now;

  delete from private.data_export_requests
  where expires_at <= p_now;
  get diagnostics v_deleted_count = row_count;

  return v_deleted_count;
end;
$$;

revoke all on function public.request_export(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.get_export_requests()
  from public, anon, authenticated, service_role;
revoke all on function public.download_account_export(uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.cleanup_data_exports(timestamptz)
  from public, anon, authenticated, service_role;

grant execute on function public.request_export(uuid) to authenticated;
grant execute on function public.get_export_requests() to authenticated;
grant execute on function public.download_account_export(uuid) to authenticated;

comment on table private.data_export_requests is
  'Short-lived privacy-safe JSON snapshots for authenticated self-service export.';
comment on function private.cleanup_data_exports(timestamptz) is
  'Deletes export snapshots after at most 24 hours; intended for a monitored hourly job.';
