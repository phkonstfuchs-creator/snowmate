-- Hosts can change time, meeting point, spots and note of their own ride.
-- Resort, day and visibility stay fixed: changing those would change who
-- the ride is for, so that is a new ride. Spots cannot drop below the
-- number of people already in.

create or replace function public.update_ride(
  target_ride uuid,
  new_meet_time time,
  new_meet_point text,
  new_total_spots smallint,
  new_caption text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  taken integer;
begin
  if me is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  perform 1 from public.rides r where r.id = target_ride and r.host_id = me for update;

  if not found then
    return 'not_found';
  end if;

  select count(*) into taken from public.ride_participants rp where rp.ride_id = target_ride;

  if new_total_spots < taken then
    return 'below_taken';
  end if;

  update public.rides r
  set
    meet_time = new_meet_time,
    meet_point = btrim(new_meet_point),
    total_spots = new_total_spots,
    caption = nullif(btrim(coalesce(new_caption, '')), '')
  where r.id = target_ride;

  return 'updated';
end;
$$;

revoke all on function public.update_ride(uuid, time, text, smallint, text) from public, anon;
grant execute on function public.update_ride(uuid, time, text, smallint, text) to authenticated;
