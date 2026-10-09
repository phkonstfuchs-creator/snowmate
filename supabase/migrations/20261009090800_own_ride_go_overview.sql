-- Summarize only the caller's own wishes. No broader recipient scope or exact
-- location/seat/member data is introduced by this read-only overview.
create function public.get_own_ride_go_interests(p_limit integer default 20)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  v_user uuid:=auth.uid();
  v_result jsonb;
begin
  if v_user is null then
    raise exception using errcode='42501',message='authentication required';
  end if;
  if p_limit is null or p_limit<1 or p_limit>50 then
    raise exception using errcode='22023',message='invalid overview limit';
  end if;
  with evaluated as materialized (
    select ride.id,ride.resort_id,resort.name as resort_name,ride.starts_at,ride.capacity,
      private.ride_go_status(ride.id,v_user) as go_status
    from private.ride_go_interests interest
    join public.rides ride on ride.id=interest.ride_id
    join public.resorts resort on resort.id=ride.resort_id
    where interest.user_id=v_user and interest.withdrawn_at is null
      and ride.status='scheduled' and ride.starts_at>statement_timestamp()
  ), authorized as (
    select *,case
      when go_status->>'status'='confirmed' and not (go_status->>'ready')::boolean then 0
      when go_status->>'status'='ready' then 1
      when go_status->>'status'='interested' then 2
      when go_status->>'status'='requested' then 3
      else 4 end as priority
    from evaluated
    where go_status is not null and go_status->>'status' in ('interested','ready','requested','confirmed')
  ), bounded as (
    select * from authorized order by priority,starts_at,id limit p_limit
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'ride',jsonb_build_object('id',id,'resort',jsonb_build_object('id',resort_id,'name',resort_name),
      'startsAt',starts_at,'capacity',capacity),
    'go',go_status
  ) order by priority,starts_at,id),'[]'::jsonb) into v_result from bounded;
  return v_result;
end;
$$;
revoke all on function public.get_own_ride_go_interests(integer) from public,anon;
grant execute on function public.get_own_ride_go_interests(integer) to authenticated;
