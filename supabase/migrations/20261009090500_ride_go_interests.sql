-- Conditional wishes never reserve capacity or create ride memberships.
create table private.ride_go_interests (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  minimum_group smallint not null check(minimum_group between 2 and 12),
  needs_carpool boolean not null,
  withdrawn_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  unique(ride_id,user_id)
);
alter table private.ride_go_interests enable row level security;
alter table private.ride_go_interests force row level security;
revoke all on private.ride_go_interests from public,anon,authenticated,service_role;
create index ride_go_interests_user on private.ride_go_interests(user_id);

create function private.ride_go_status(p_ride_id uuid,p_user_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
  with facts as (
    select interest.*, ride.starts_at, ride.status as ride_status,
      private.is_ride_member(ride.id,p_user_id) as member,
      (select count(*)::integer from public.ride_members m
        where m.ride_id=ride.id and private.can_account_use_core(m.user_id)
          and not private.is_blocked_between(p_user_id,m.user_id)) as confirmed_group,
      exists(select 1 from public.carpools c
        where c.status in ('scheduled','active')
          and ((c.direction='driver' and exists(select 1 from public.carpool_members m
            where m.carpool_id=c.id and m.user_id=p_user_id))
            or (c.direction='rider' and c.host_id=p_user_id and exists(select 1 from public.carpool_members m
              where m.carpool_id=c.id and private.can_account_use_core(m.user_id)
                and not private.is_blocked_between(p_user_id,m.user_id))))
          and c.resort_id=ride.resort_id
          and c.departs_at<=ride.starts_at
          and (c.departs_at at time zone 'Europe/Vienna')::date=(ride.starts_at at time zone 'Europe/Vienna')::date
          and private.can_discover_carpool(p_user_id,c.id)) as confirmed_carpool,
      exists(select 1 from public.ride_join_requests q
        where q.ride_id=ride.id and q.requester_id=p_user_id and q.status='pending') as requested
    from private.ride_go_interests interest join public.rides ride on ride.id=interest.ride_id
    where interest.ride_id=p_ride_id and interest.user_id=p_user_id
      and private.can_account_use_core(p_user_id)
      and (private.can_discover_ride(p_user_id,ride.id)
        or (ride.status='cancelled' and private.can_account_use_core(ride.host_id)
          and not private.is_blocked_between(p_user_id,ride.host_id)
          and (private.are_friends(p_user_id,ride.host_id) or private.is_ride_member(ride.id,p_user_id))))
  ), evaluation as (
    select *, confirmed_group + case when member then 0 else 1 end >= minimum_group as group_ready,
      (not needs_carpool or confirmed_carpool) as carpool_ready,
      (ride_status<>'scheduled' or starts_at<=statement_timestamp()) as expired
    from facts
  )
  select jsonb_build_object('id',id,'rideId',ride_id,'minimumGroup',minimum_group,
    'needsCarpool',needs_carpool,'confirmedGroup',confirmed_group,
    'hasConfirmedCarpool',confirmed_carpool,'groupReady',group_ready,'carpoolReady',carpool_ready,
    'ready',group_ready and carpool_ready and not expired and withdrawn_at is null,
    'status',case when withdrawn_at is not null then 'withdrawn' when expired then 'expired'
      when member then 'confirmed' when requested then 'requested'
      when group_ready and carpool_ready then 'ready' else 'interested' end)
  from evaluation;
$$;
revoke all on function private.ride_go_status(uuid,uuid) from public,anon,authenticated,service_role;

create function public.get_ride_go_status(p_ride_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
  select private.ride_go_status(p_ride_id,auth.uid());
$$;

create function private.command_ride_go_interest(
  p_ride_id uuid,p_minimum_group integer,p_needs_carpool boolean,p_withdraw boolean,p_idempotency_key uuid
) returns uuid language plpgsql volatile security definer set search_path='' as $$
declare
  v_user uuid:=auth.uid(); v_ride public.rides%rowtype; v_id uuid;
  v_command text:=case when p_withdraw then 'withdraw_ride_go_interest' else 'set_ride_go_interest' end;
  v_hash text; v_stored text;
begin
  if v_user is null then raise exception using errcode='42501',message='authentication required'; end if;
  if p_ride_id is null or p_idempotency_key is null or p_withdraw is null then
    raise exception using errcode='22004',message='ride and idempotency key are required'; end if;
  v_hash:=private.command_request_hash(jsonb_build_object('ride_id',p_ride_id,'minimum_group',p_minimum_group,'needs_carpool',p_needs_carpool));
  perform pg_advisory_xact_lock(hashtextextended(v_user::text||':'||v_command||':'||p_idempotency_key::text,0));
  select resource_id,request_hash into v_id,v_stored from private.command_receipts
    where user_id=v_user and command_name=v_command and idempotency_key=p_idempotency_key;
  if found then
    if v_stored is distinct from v_hash then raise exception using errcode='22023',message='idempotency key payload mismatch'; end if;
    return v_id;
  end if;
  perform private.consume_command_rate_limit(v_user,v_command,30,interval '1 hour');
  select * into v_ride from public.rides where id=p_ride_id for update;
  if not found or not private.can_discover_ride(v_user,p_ride_id) then
    raise exception using errcode='42501',message='ride unavailable'; end if;
  if p_withdraw then
    update private.ride_go_interests set withdrawn_at=statement_timestamp(),updated_at=statement_timestamp()
      where ride_id=p_ride_id and user_id=v_user returning id into v_id;
    if not found then raise exception using errcode='23514',message='interest unavailable'; end if;
    update public.ride_join_requests set status='cancelled',responded_by=null,responded_at=statement_timestamp()
      where ride_id=p_ride_id and requester_id=v_user and status='pending';
  else
    if v_ride.status<>'scheduled' or v_ride.starts_at<=statement_timestamp()
      or private.is_ride_member(p_ride_id,v_user) then
      raise exception using errcode='23514',message='interest unavailable'; end if;
    if p_minimum_group is null or p_minimum_group<2 or p_minimum_group>v_ride.capacity or p_needs_carpool is null then
      raise exception using errcode='23514',message='invalid go conditions'; end if;
    insert into private.ride_go_interests(ride_id,user_id,minimum_group,needs_carpool)
      values(p_ride_id,v_user,p_minimum_group,p_needs_carpool)
      on conflict(ride_id,user_id) do update set minimum_group=excluded.minimum_group,
        needs_carpool=excluded.needs_carpool,withdrawn_at=null,updated_at=statement_timestamp()
      returning id into v_id;
  end if;
  insert into private.command_receipts(user_id,command_name,idempotency_key,resource_id,request_hash)
    values(v_user,v_command,p_idempotency_key,v_id,v_hash);
  return v_id;
end;
$$;
revoke all on function private.command_ride_go_interest(uuid,integer,boolean,boolean,uuid) from public,anon,authenticated,service_role;

create function public.set_ride_go_interest(p_ride_id uuid,p_minimum_group integer,p_needs_carpool boolean,p_idempotency_key uuid)
returns uuid language sql volatile security definer set search_path='' as $$
 select private.command_ride_go_interest(p_ride_id,p_minimum_group,p_needs_carpool,false,p_idempotency_key);
$$;
create function public.withdraw_ride_go_interest(p_ride_id uuid,p_idempotency_key uuid)
returns uuid language sql volatile security definer set search_path='' as $$
 select private.command_ride_go_interest(p_ride_id,null,null,true,p_idempotency_key);
$$;

-- Check both explicit request and host acceptance. Lock offers then memberships,
-- in the same order as existing carpool commands, until the transaction ends.
create function private.enforce_ride_go_conditions()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_user uuid; v_status jsonb;
begin
  if tg_table_name='ride_join_requests' then
    if new.status<>'pending' then return new; end if;
    v_user:=new.requester_id;
  else
    if new.role='host' then return new; end if;
    v_user:=new.user_id;
  end if;
  if not exists(select 1 from private.ride_go_interests where ride_id=new.ride_id and user_id=v_user and withdrawn_at is null) then return new; end if;
  perform 1 from public.rides where id=new.ride_id for update;
  perform 1 from public.carpools c join public.rides r on r.id=new.ride_id
    where (c.direction='driver' or (c.direction='rider' and c.host_id=v_user))
      and c.resort_id=r.resort_id
      and c.departs_at<=r.starts_at
      and (c.departs_at at time zone 'Europe/Vienna')::date=(r.starts_at at time zone 'Europe/Vienna')::date
    order by c.id for update of c;
  perform 1 from public.carpool_members m join public.carpools c on c.id=m.carpool_id
    join public.rides r on r.id=new.ride_id
    where (m.user_id=v_user or (c.direction='rider' and c.host_id=v_user))
      and c.resort_id=r.resort_id
      and c.departs_at<=r.starts_at
      and (c.departs_at at time zone 'Europe/Vienna')::date=(r.starts_at at time zone 'Europe/Vienna')::date
    order by m.carpool_id for update of m;
  v_status:=private.ride_go_status(new.ride_id,v_user);
  if v_status is null or not coalesce((v_status->>'ready')::boolean,false) then
    raise exception using errcode='23514',message='go conditions not ready'; end if;
  return new;
end;
$$;
revoke all on function private.enforce_ride_go_conditions() from public,anon,authenticated,service_role;
create trigger ride_requests_go_conditions before insert or update on public.ride_join_requests
  for each row execute function private.enforce_ride_go_conditions();
create trigger ride_members_go_conditions before insert on public.ride_members
  for each row execute function private.enforce_ride_go_conditions();
revoke all on function public.get_ride_go_status(uuid) from public,anon;
revoke all on function public.set_ride_go_interest(uuid,integer,boolean,uuid) from public,anon;
revoke all on function public.withdraw_ride_go_interest(uuid,uuid) from public,anon;
grant execute on function public.get_ride_go_status(uuid),public.set_ride_go_interest(uuid,integer,boolean,uuid),public.withdraw_ride_go_interest(uuid,uuid) to authenticated;

-- Reuse the existing account export and retention boundaries.
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
    'ride_go_interests', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'ride_id', i.ride_id, 'minimum_group', i.minimum_group, 'needs_carpool', i.needs_carpool, 'withdrawn_at', i.withdrawn_at, 'created_at', i.created_at, 'updated_at', i.updated_at) order by i.created_at, i.id) from private.ride_go_interests i where i.user_id=p_user_id), '[]'::jsonb),
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


create or replace function private.cleanup_expired_coordination_data(
  p_now timestamptz default now()
)
returns table (
  deleted_ride_details bigint,
  deleted_carpool_details bigint,
  deleted_pending_friendships bigint,
  deleted_pending_crew_invitations bigint,
  deleted_signup_admissions bigint,
  deleted_friend_invites bigint,
  deleted_command_receipts bigint,
  deleted_ride_participation_history bigint,
  deleted_beta_invites bigint,
  scrubbed_beta_invites bigint
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  ride_detail_count bigint;
  carpool_detail_count bigint;
  friendship_count bigint;
  crew_invitation_count bigint;
  signup_admission_count bigint;
  friend_invite_count bigint;
  command_receipt_count bigint;
  ride_participation_history_count bigint;
  beta_invite_count bigint;
  scrubbed_beta_invite_count bigint;
begin
  if p_now is null then
    raise exception using errcode = '22004', message = 'cleanup timestamp required';
  end if;

  delete from private.ride_go_interests as interest
  using public.rides as ride
  where interest.ride_id=ride.id and ride.starts_at<=p_now-interval '24 hours';

  delete from private.ride_details as detail
  using public.rides as ride
  where detail.ride_id = ride.id
    and ride.starts_at <= p_now - interval '24 hours'
    and not exists (
      select 1
      from public.reports as report
      where report.ride_id = ride.id
        and (
          report.resolved_at is null
          or report.resolved_at > p_now - interval '90 days'
          or exists (
            select 1
            from public.report_appeals as appeal
            where appeal.report_id = report.id
              and (
                appeal.status = 'pending'
                or appeal.resolved_at > p_now - interval '90 days'
              )
          )
        )
    );
  get diagnostics ride_detail_count = row_count;

  delete from private.carpool_details as detail
  using public.carpools as carpool
  where detail.carpool_id = carpool.id
    and carpool.departs_at <= p_now - interval '24 hours';
  get diagnostics carpool_detail_count = row_count;

  delete from public.friendships
  where status = 'pending'
    and created_at <= p_now - interval '30 days';
  get diagnostics friendship_count = row_count;

  delete from public.crew_invitations
  where status = 'pending'
    and created_at <= p_now - interval '30 days';
  get diagnostics crew_invitation_count = row_count;

  delete from private.signup_admissions
  where completed_at is not null
    and completed_at <= p_now - interval '24 hours';
  get diagnostics signup_admission_count = row_count;

  delete from private.friend_invites
  where (
    used_at is not null
    and used_at <= p_now - interval '30 days'
  ) or (
    used_at is null
    and expires_at <= p_now - interval '30 days'
  );
  get diagnostics friend_invite_count = row_count;

  delete from private.command_receipts
  where created_at <= p_now - interval '30 days';
  get diagnostics command_receipt_count = row_count;

  delete from private.ride_participation_history as participation
  using public.rides as ride
  where participation.ride_id = ride.id
    and ride.starts_at <= p_now - interval '12 months'
    and not exists (
      select 1
      from public.reports as report
      where report.ride_id = ride.id
        and (
          report.resolved_at is null
          or report.resolved_at > p_now - interval '90 days'
          or exists (
            select 1
            from public.report_appeals as appeal
            where appeal.report_id = report.id
              and (
                appeal.status = 'pending'
                or appeal.resolved_at > p_now - interval '90 days'
              )
          )
        )
    );
  get diagnostics ride_participation_history_count = row_count;

  delete from private.beta_invites
  where admitted_at is null
    and expires_at <= p_now - interval '30 days';
  get diagnostics beta_invite_count = row_count;

  update private.beta_invites as invite
  set
    email = 'deleted+' || replace(invite.id::text, '-', '') || '@invalid.local',
    token_hash = pg_catalog.encode(
      extensions.digest(
        pg_catalog.convert_to('retained-invite:' || invite.id::text, 'UTF8'),
        'sha256'
      ),
      'hex'
    )
  where invite.admitted_at is not null
    and invite.admitted_at <= p_now - interval '30 days'
    and invite.email not like 'deleted+%@invalid.local';
  get diagnostics scrubbed_beta_invite_count = row_count;

  return query select
    ride_detail_count,
    carpool_detail_count,
    friendship_count,
    crew_invitation_count,
    signup_admission_count,
    friend_invite_count,
    command_receipt_count,
    ride_participation_history_count,
    beta_invite_count,
    scrubbed_beta_invite_count;
end;
$$;

revoke all on function private.cleanup_expired_coordination_data(timestamptz)
  from public, anon, authenticated, service_role;

comment on function private.cleanup_expired_coordination_data(timestamptz) is
  'Deletes expired exact coordination and invite/request data; intended for monitored Cron jobs.';
