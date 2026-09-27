-- Account rights (GDPR art. 15, 17 and 20) and the counts behind the
-- navigation badges.

-- Deleting the auth user cascades through profiles to rides, carpools,
-- friendships, participations and requests. Only ever the caller.
create or replace function public.delete_my_account()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  delete from auth.users u where u.id = me;
  return found;
end;
$$;

-- Everything stored about the caller, in one machine-readable document.
-- Other people appear only as far as the caller already sees them.
create or replace function public.export_my_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'exported_at', now(),
    'account', (
      select jsonb_build_object('id', u.id, 'email', u.email, 'created_at', u.created_at)
      from auth.users u where u.id = me
    ),
    'profile', (
      select to_jsonb(p) - 'id' from public.profiles p where p.id = me
    ),
    'friendships', coalesce((
      select jsonb_agg(jsonb_build_object(
        'handle', other.handle,
        'status', f.status,
        'direction', case when f.requester_id = me then 'outgoing' else 'incoming' end,
        'created_at', f.created_at,
        'responded_at', f.responded_at
      ) order by f.created_at)
      from public.friendships f
      join public.profiles other
        on other.id = case when f.requester_id = me then f.addressee_id else f.requester_id end
      where me in (f.requester_id, f.addressee_id)
    ), '[]'::jsonb),
    'rides_hosted', coalesce((
      select jsonb_agg(to_jsonb(r) - 'host_id' order by r.ride_date)
      from public.rides r where r.host_id = me
    ), '[]'::jsonb),
    'rides_joined', coalesce((
      select jsonb_agg(jsonb_build_object(
        'ride_id', rp.ride_id,
        'resort', r.resort,
        'ride_date', r.ride_date,
        'status', rp.status,
        'joined_at', rp.joined_at
      ) order by rp.joined_at)
      from public.ride_participants rp
      join public.rides r on r.id = rp.ride_id
      where rp.user_id = me
    ), '[]'::jsonb),
    'carpools', coalesce((
      select jsonb_agg(to_jsonb(c) - 'author_id' order by c.ride_date)
      from public.carpools c where c.author_id = me
    ), '[]'::jsonb),
    'carpool_requests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'carpool_id', cr.carpool_id,
        'resort', c.resort,
        'ride_date', c.ride_date,
        'status', cr.status,
        'created_at', cr.created_at
      ) order by cr.created_at)
      from public.carpool_requests cr
      join public.carpools c on c.id = cr.carpool_id
      where cr.user_id = me
    ), '[]'::jsonb)
  );
end;
$$;

-- What is waiting for the caller: friend requests to answer and requests
-- to join their own upcoming rides and carpools.
create or replace function public.my_pending_counts()
returns table (friend_requests integer, carpool_requests integer, ride_requests integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (
      select count(*)::integer from public.friendships f
      where f.addressee_id = auth.uid() and f.status = 'pending'
    ),
    (
      select count(*)::integer
      from public.carpool_requests cr
      join public.carpools c on c.id = cr.carpool_id
      where c.author_id = auth.uid()
        and cr.status = 'pending'
        and c.ride_date >= private.local_today()
    ),
    (
      select count(*)::integer
      from public.ride_participants rp
      join public.rides r on r.id = rp.ride_id
      where r.host_id = auth.uid()
        and rp.status = 'pending'
        and r.ride_date >= private.local_today()
    );
$$;

revoke all on function public.delete_my_account() from public, anon;
revoke all on function public.export_my_data() from public, anon;
revoke all on function public.my_pending_counts() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.export_my_data() to authenticated;
grant execute on function public.my_pending_counts() to authenticated;
