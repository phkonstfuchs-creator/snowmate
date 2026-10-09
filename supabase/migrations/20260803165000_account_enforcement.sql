create or replace function private.enforce_account_control_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := statement_timestamp();
  v_must_revoke boolean;
begin
  v_must_revoke := new.account_status <> 'active'
    or (
      new.moderation_state in ('suspended', 'banned')
      and (
        new.moderation_until is null
        or new.moderation_until > v_now
      )
    );

  if not v_must_revoke then
    return new;
  end if;

  delete from private.live_locations as location
  using private.location_sessions as session
  where location.session_id = session.id
    and session.owner_id = new.user_id;

  update private.location_sessions
  set stopped_at = coalesce(stopped_at, v_now)
  where owner_id = new.user_id
    and stopped_at is null;

  delete from public.resort_presence
  where user_id = new.user_id;

  update public.rides
  set status = 'cancelled'
  where host_id = new.user_id
    and status in ('scheduled', 'active');

  update public.ride_join_requests as request
  set
    status = 'cancelled',
    responded_by = null,
    responded_at = v_now
  where request.status in ('pending', 'accepted')
    and (
      request.requester_id = new.user_id
      or exists (
        select 1
        from public.rides as ride
        where ride.id = request.ride_id
          and ride.host_id = new.user_id
      )
    );

  delete from public.ride_members as member
  using public.rides as ride
  where member.ride_id = ride.id
    and member.user_id = new.user_id
    and ride.host_id <> new.user_id;

  delete from private.ride_details as detail
  using public.rides as ride
  where detail.ride_id = ride.id
    and ride.host_id = new.user_id
    and ride.status = 'cancelled'
    and not exists (
      select 1
      from public.reports as report
      where report.ride_id = ride.id
        and (
          report.resolved_at is null
          or report.resolved_at > v_now - interval '90 days'
          or exists (
            select 1
            from public.report_appeals as appeal
            where appeal.report_id = report.id
              and (
                appeal.status = 'pending'
                or appeal.resolved_at > v_now - interval '90 days'
              )
          )
        )
    );

  update public.carpools
  set status = 'cancelled'
  where host_id = new.user_id
    and status in ('scheduled', 'active');

  update public.carpool_requests as request
  set
    status = 'cancelled',
    responded_by = null,
    responded_at = v_now
  where request.status in ('pending', 'accepted')
    and (
      request.requester_id = new.user_id
      or exists (
        select 1
        from public.carpools as carpool
        where carpool.id = request.carpool_id
          and carpool.host_id = new.user_id
      )
    );

  delete from public.carpool_members as member
  using public.carpools as carpool
  where member.carpool_id = carpool.id
    and member.user_id = new.user_id
    and carpool.host_id <> new.user_id;

  delete from private.carpool_details as detail
  using public.carpools as carpool
  where detail.carpool_id = carpool.id
    and carpool.host_id = new.user_id
    and carpool.status = 'cancelled';

  update public.crew_invitations
  set status = 'cancelled', responded_at = v_now
  where status = 'pending'
    and (
      invited_by = new.user_id
      or invited_user_id = new.user_id
    );

  delete from public.crew_members as member
  using public.crews as crew
  where member.crew_id = crew.id
    and member.user_id = new.user_id
    and crew.owner_id <> new.user_id;

  return new;
end;
$$;

revoke all on function private.enforce_account_control_change()
  from public, anon, authenticated, service_role;

create trigger account_controls_enforce_restrictions
  after insert or update of account_status, moderation_state, moderation_until
  on private.account_controls
  for each row
  execute function private.enforce_account_control_change();

comment on function private.enforce_account_control_change() is
  'Immediately revokes live coordination state when an account is suspended, banned, or queued for deletion.';
