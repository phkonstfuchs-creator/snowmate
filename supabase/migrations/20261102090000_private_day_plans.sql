-- Private Pistl Go mountain-day plans. The session-derived RPCs are the only
-- client interface; plans never enter the public rides/carpools surfaces.
create table private.day_plans (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  city text not null check (city in ('innsbruck', 'salzburg')),
  resort text not null,
  plan_date date not null,
  meet_time time without time zone not null,
  transport text not null check (transport in ('own', 'offer', 'need')),
  meeting_text text not null,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint day_plans_resort_city check (
    (city = 'innsbruck' and resort in (
      'Stubai Glacier','Nordkette','Axamer Lizum','Schlick 2000','Kühtai','Glungezer',
      'Patscherkofel','Bergeralm','Rangger Köpfl','Hochoetz','Mutterer Alm',
      'Serlesbahnen Mieders','Sölden'))
    or (city = 'salzburg' and resort in (
      'Saalbach-Hinterglemm','Flachau','Kitzsteinhorn','Zell am See','Wagrain',
      'Bad Gastein','Hochkönig'))
  ),
  constraint day_plans_time_value check (meet_time >= time '00:00' and meet_time < time '24:00'),
  constraint day_plans_meeting_text_length check (char_length(meeting_text) between 2 and 120),
  constraint day_plans_text_safe check (
    resort !~ '[\x01-\x1f\x7f-\x9f‪-‮⁦-⁩]'
    and meeting_text !~ '[\x01-\x1f\x7f-\x9f‪-‮⁦-⁩]'
    and meeting_text = btrim(meeting_text)
  )
);
alter table private.day_plans enable row level security;
alter table private.day_plans force row level security;
revoke all on table private.day_plans from public, anon, authenticated, service_role;
create index day_plans_owner_date on private.day_plans(user_id, plan_date, meet_time);
create index day_plans_expiration on private.day_plans(expires_at);

-- This short-lived ledger contains only the owner and write time. It keeps
-- the rolling save limit auditable without preserving prior private fields.
create table private.day_plan_save_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  saved_at timestamptz not null default now()
);
alter table private.day_plan_save_log enable row level security;
alter table private.day_plan_save_log force row level security;
revoke all on table private.day_plan_save_log from public, anon, authenticated, service_role;
create index day_plan_save_log_owner_time on private.day_plan_save_log(user_id, saved_at);

-- Retain only identity metadata long enough to stop a delayed create retry
-- from undoing a deletion. No fields from the deleted plan are kept.
create table private.day_plan_tombstones (
  plan_id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null
);
alter table private.day_plan_tombstones enable row level security;
alter table private.day_plan_tombstones force row level security;
revoke all on table private.day_plan_tombstones from public, anon, authenticated, service_role;
create index day_plan_tombstones_owner_expiry on private.day_plan_tombstones(user_id, expires_at);

create function private.day_plan_json(p private.day_plans)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'id', p.id, 'version', p.version, 'city', p.city, 'resort', p.resort,
    'planDate', p.plan_date, 'meetTime', to_char(p.meet_time, 'HH24:MI'),
    'transport', p.transport, 'meetingText', p.meeting_text,
    'createdAt', p.created_at, 'updatedAt', p.updated_at, 'expiresAt', p.expires_at
  );
$$;
revoke all on function private.day_plan_json(private.day_plans) from public, anon, authenticated;

create function private.valid_day_plan_input(p jsonb, p_now timestamptz default now())
returns boolean language plpgsql immutable security definer set search_path='' as $$
declare city_value text; resort_value text; date_value date; time_value time;
  point_value text; transport_value text;
begin
  if jsonb_typeof(p) is distinct from 'object' then return false; end if;
  if (select count(*) from jsonb_object_keys(p)) <> 6
     or not (p ?& array['city','resort','planDate','meetTime','transport','meetingText'])
     or exists(select 1 from jsonb_each(p) entry where jsonb_typeof(entry.value) is distinct from 'string') then
    return false;
  end if;
  city_value:=p->>'city'; resort_value:=p->>'resort'; transport_value:=p->>'transport';
  point_value:=p->>'meetingText';
  if city_value is null or city_value not in ('innsbruck','salzburg')
     or transport_value is null or transport_value not in ('own','offer','need')
     or resort_value is null or char_length(resort_value) not between 1 and 60
     or point_value is null or char_length(point_value) not between 2 and 120
     or point_value <> btrim(point_value)
     or resort_value ~ '[\x01-\x1f\x7f-\x9f‪-‮⁦-⁩]'
     or point_value ~ '[\x01-\x1f\x7f-\x9f‪-‮⁦-⁩]'
     or p->>'meetTime' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
     or p->>'planDate' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then return false; end if;
  begin
    date_value := (p->>'planDate')::date;
    time_value := (p->>'meetTime')::time;
  exception when others then return false;
  end;
  if date_value < (p_now at time zone 'Europe/Vienna')::date
     or date_value > (p_now at time zone 'Europe/Vienna')::date + 365 then return false; end if;
  if city_value='innsbruck' and resort_value not in (
      'Stubai Glacier','Nordkette','Axamer Lizum','Schlick 2000','Kühtai','Glungezer',
      'Patscherkofel','Bergeralm','Rangger Köpfl','Hochoetz','Mutterer Alm',
      'Serlesbahnen Mieders','Sölden') then return false; end if;
  if city_value='salzburg' and resort_value not in (
      'Saalbach-Hinterglemm','Flachau','Kitzsteinhorn','Zell am See','Wagrain',
      'Bad Gastein','Hochkönig') then return false; end if;
  return true;
end;
$$;
revoke all on function private.valid_day_plan_input(jsonb,timestamptz) from public, anon, authenticated;

-- Treat the plan date as a Vienna calendar day. Adding two local dates before
-- converting midnight to timestamptz preserves the end-of-day-plus-24h rule
-- across both daylight-saving transitions.
create function private.day_plan_expiry(p_plan_date date)
returns timestamptz language sql immutable set search_path='' as $$
  select (p_plan_date+2)::timestamp at time zone 'Europe/Vienna';
$$;
revoke all on function private.day_plan_expiry(date) from public, anon, authenticated, service_role;

create function public.save_day_plan(target_id uuid, expected_version integer, plan jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=private.require_go_session(); existing private.day_plans; saved private.day_plans;
  current_count integer; recent_count integer; is_existing boolean:=false; expires timestamptz;
begin
  perform public.check_request();
  if target_id is null or expected_version is null or expected_version < 0
     or not private.valid_day_plan_input(plan,now()) then
    return jsonb_build_object('status','invalid');
  end if;

  -- One serialized writer per owner covers quota, active-plan cap, and CAS.
  perform pg_advisory_xact_lock(hashtextextended('private-day-plans:'||me::text,0));
  select * into existing from private.day_plans d where d.id=target_id for update;
  is_existing:=found;
  if found and existing.user_id<>me then return jsonb_build_object('status','conflict'); end if;
  if found and existing.expires_at<=now() then return jsonb_build_object('status','conflict'); end if;

  if is_existing and existing.city=plan->>'city' and existing.resort=plan->>'resort'
     and existing.plan_date=(plan->>'planDate')::date
     and existing.meet_time=(plan->>'meetTime')::time
     and existing.transport=plan->>'transport' and existing.meeting_text=plan->>'meetingText' then
    return jsonb_build_object('status','saved','plan',private.day_plan_json(existing));
  end if;
  if (is_existing and existing.version<>expected_version) or (not is_existing and expected_version<>0) then
    return jsonb_build_object('status','conflict');
  end if;
  if not is_existing and exists(select 1 from private.day_plan_tombstones t
      where t.plan_id=target_id and t.expires_at>now()) then
    return jsonb_build_object('status','conflict');
  end if;
  delete from private.day_plan_tombstones t where t.plan_id=target_id and t.expires_at<=now();

  select count(*) into current_count from private.day_plans d
    where d.user_id=me and d.expires_at>now();
  if not is_existing and current_count>=20 then return jsonb_build_object('status','limit'); end if;

  delete from private.day_plan_save_log l where l.user_id=me and l.saved_at<=now()-interval '24 hours';
  select count(*) into recent_count from private.day_plan_save_log l
    where l.user_id=me and l.saved_at>now()-interval '24 hours';
  if recent_count>=30 then return jsonb_build_object('status','rate_limited'); end if;

  expires:=private.day_plan_expiry((plan->>'planDate')::date);
  if is_existing then
    update private.day_plans d set city=plan->>'city',resort=plan->>'resort',
      plan_date=(plan->>'planDate')::date,meet_time=(plan->>'meetTime')::time,
      transport=plan->>'transport',meeting_text=plan->>'meetingText',
      version=d.version+1,updated_at=now(),expires_at=expires
    where d.id=target_id returning * into saved;
  else
    insert into private.day_plans(id,user_id,city,resort,plan_date,meet_time,transport,meeting_text,expires_at)
    values(target_id,me,plan->>'city',plan->>'resort',(plan->>'planDate')::date,
      (plan->>'meetTime')::time,plan->>'transport',plan->>'meetingText',expires)
    returning * into saved;
  end if;
  insert into private.day_plan_save_log(user_id) values(me);
  return jsonb_build_object('status','saved','plan',private.day_plan_json(saved));
end;
$$;
revoke all on function public.save_day_plan(uuid,integer,jsonb) from public, anon;
grant execute on function public.save_day_plan(uuid,integer,jsonb) to authenticated;

create function public.delete_day_plan(target_id uuid, expected_version integer)
returns text language plpgsql security definer set search_path='' as $$
declare me uuid:=private.require_go_session(); existing private.day_plans;
begin
  perform public.check_request();
  if target_id is null or expected_version is null or expected_version < 0 then return 'invalid'; end if;
  perform pg_advisory_xact_lock(hashtextextended('private-day-plans:'||me::text,0));
  select * into existing from private.day_plans d where d.id=target_id and d.user_id=me for update;
  if not found then return 'missing'; end if;
  if existing.version<>expected_version then return 'conflict'; end if;
  delete from private.day_plans d where d.id=target_id and d.user_id=me;
  insert into private.day_plan_tombstones(plan_id,user_id,expires_at)
    values(target_id,me,greatest(existing.expires_at,now()+interval '24 hours'))
    on conflict(plan_id) do update set user_id=excluded.user_id,expires_at=excluded.expires_at;
  return 'deleted';
end;
$$;
revoke all on function public.delete_day_plan(uuid,integer) from public, anon;
grant execute on function public.delete_day_plan(uuid,integer) to authenticated;

create function public.list_my_day_plans()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare me uuid:=private.require_go_session(); result jsonb;
begin
  select coalesce(jsonb_agg(private.day_plan_json(d) order by d.plan_date,d.meet_time,d.id),'[]'::jsonb)
    into result from private.day_plans d where d.user_id=me and d.expires_at>now();
  return jsonb_build_object('status','ok','plans',result);
end;
$$;
revoke all on function public.list_my_day_plans() from public, anon;
grant execute on function public.list_my_day_plans() to authenticated;

create function private.cleanup_day_plans(p_now timestamptz default now())
returns integer language plpgsql security definer set search_path='' as $$
declare removed integer;
begin
  delete from private.day_plans d where d.expires_at<=p_now;
  get diagnostics removed=row_count;
  delete from private.day_plan_save_log l where l.saved_at<=p_now-interval '24 hours';
  delete from private.day_plan_tombstones t where t.expires_at<=p_now;
  return removed;
end;
$$;
revoke all on function private.cleanup_day_plans(timestamptz) from public, anon, authenticated, service_role;

create trigger day_plans_blocked_terms
before insert or update of meeting_text on private.day_plans
for each row execute function private.refuse_blocked_terms('meeting_text');

-- Preserve the complete current export and append the owner’s private plans.
alter function public.export_my_data() rename to export_my_data_before_day_plans;
revoke all on function public.export_my_data_before_day_plans() from public, anon, authenticated;
create function public.export_my_data()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare me uuid:=private.require_go_session(); base_export jsonb;
begin
  base_export:=public.export_my_data_before_day_plans();
  return base_export || jsonb_build_object(
    'day_plans', coalesce((
      select jsonb_agg(private.day_plan_json(d) order by d.plan_date,d.meet_time,d.id)
      from private.day_plans d where d.user_id=me
    ),'[]'::jsonb),
    'day_plan_tombstones', coalesce((
      select jsonb_agg(jsonb_build_object('id',t.plan_id,'expiresAt',t.expires_at) order by t.expires_at,t.plan_id)
      from private.day_plan_tombstones t where t.user_id=me
    ),'[]'::jsonb),
    'day_plan_save_times', coalesce((
      select jsonb_agg(jsonb_build_object('savedAt',l.saved_at) order by l.saved_at)
      from private.day_plan_save_log l where l.user_id=me
    ),'[]'::jsonb)
  );
end;
$$;
revoke all on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('pistl-day-plan-retention','27 3 * * *','select private.cleanup_day_plans();');
