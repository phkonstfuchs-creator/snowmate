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
