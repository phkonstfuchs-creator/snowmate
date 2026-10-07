-- Location-revealing lift meetups notify only current confirmed friends.
-- The database queues a generic kind; neither lift nor coordinates leave in
-- the push payload. Recheck visibility at dispatch because it can change
-- between queueing and sending.

alter table private.push_outbox drop constraint push_outbox_kind_value;
alter table private.push_outbox add constraint push_outbox_kind_value check (
  kind in ('message', 'friend_request', 'friend_accepted', 'ride_request',
           'ride_joined', 'ride_accepted', 'lift_meetup')
);

create or replace function private.push_on_lift_meetup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  friend uuid;
  rider uuid := case when tg_op = 'DELETE' then old.user_id else new.user_id end;
begin
  -- A second start replaces pending notices; Stop retracts them entirely.
  delete from private.push_outbox o where o.actor_id = rider and o.kind = 'lift_meetup';

  if tg_op = 'DELETE' then
    return null;
  end if;

  -- The status is sensitive. Never queue for an ineligible rider, even if a
  -- privileged writer inserted a row outside start_my_lift_meetup().
  if new.expires_at <= now() or not private.may_share_location(rider) then
    return null;
  end if;

  begin
    for friend in
      select f.id from private.friend_ids(rider) as f(id)
      where not private.is_blocked(rider, f.id)
    loop
      perform private.queue_push(friend, rider, 'lift_meetup', '/map');
    end loop;
  exception when others then
    -- A notice must never prevent starting a meetup.
    null;
  end;
  return null;
end;
$$;

revoke all on function private.push_on_lift_meetup() from public, anon, authenticated;

create trigger push_on_lift_meetup
  after insert or update of started_at or delete on public.lift_meetups
  for each row execute function private.push_on_lift_meetup();

-- Replacement of the existing sender RPC, based on
-- 20261012090000_push_notifications.sql. All existing notice kinds keep
-- their behaviour. Lift notices are delivered only while the current
-- status is visible to the recipient.
create or replace function public.push_take_outbox()
returns table (endpoint text, p256dh text, auth text, kind text, actor_name text, url text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from private.push_outbox o where o.created_at < now() - interval '1 hour';

  return query
  with taken as (
    delete from private.push_outbox o
    where o.id in (select q.id from private.push_outbox q order by q.id limit 200 for update skip locked)
    returning o.recipient_id, o.actor_id, o.kind, o.url
  )
  select s.endpoint, s.p256dh, s.auth, t.kind,
         coalesce(a.display_name, '@' || a.handle),
         t.url
  from taken t
  join public.push_subscriptions s on s.user_id = t.recipient_id
  left join public.profiles a on a.id = t.actor_id
  where t.kind <> 'lift_meetup' or exists (
    select 1 from public.lift_meetups m
    where m.user_id = t.actor_id
      and m.expires_at > now()
      and private.may_share_location(m.user_id)
      and private.are_friends(t.recipient_id, m.user_id)
      and not private.is_blocked(t.recipient_id, m.user_id)
  );
end;
$$;

revoke all on function public.push_take_outbox() from public, anon, authenticated;
grant execute on function public.push_take_outbox() to service_role;
