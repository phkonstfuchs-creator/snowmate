begin;
create extension if not exists pgtap with schema extensions;
select plan(74);

select has_table('private','day_plans','private day plans are stored outside public tables');
select has_table('private','day_plan_tombstones','minimal deletion retry tombstones exist');
select has_function('public','save_day_plan',array['uuid','integer','jsonb'],'owner-only save RPC exists');
select has_function('public','delete_day_plan',array['uuid','integer'],'owner-only delete RPC exists');
select has_function('public','list_my_day_plans',array[]::text[],'owner-only list RPC exists');
select has_function('private','cleanup_day_plans',array['timestamp with time zone'],'private expiration cleanup exists');
select has_function('private','day_plan_expiry',array['date'],'Vienna plan expiry uses a shared private helper');
select ok(not has_table_privilege('authenticated','private.day_plans','SELECT'),'clients cannot directly read plans');
select ok(not has_table_privilege('authenticated','private.day_plans','INSERT'),'clients cannot directly create plans');
select ok(not has_table_privilege('authenticated','private.day_plan_tombstones','SELECT'),'clients cannot inspect deletion tombstones');
select ok(not has_table_privilege('authenticated','private.day_plan_tombstones','INSERT'),'clients cannot create deletion tombstones');
select ok(not has_function_privilege('authenticated','private.cleanup_day_plans(timestamptz)','EXECUTE'),'clients cannot run cleanup');
select ok(exists(select 1 from cron.job where jobname='pistl-day-plan-retention' and schedule='27 3 * * *' and active),'daily cleanup is scheduled');

insert into auth.users(id,email) values
 ('d1d1d1d1-0000-4000-8000-000000000001','plan-owner@example.com'),
 ('d1d1d1d1-0000-4000-8000-000000000002','plan-friend@example.com'),
 ('d1d1d1d1-0000-4000-8000-000000000003','plan-stranger@example.com'),
 ('d1d1d1d1-0000-4000-8000-000000000004','plan-cap@example.com'),
 ('d1d1d1d1-0000-4000-8000-000000000005','plan-rate@example.com'),
 ('d1d1d1d1-0000-4000-8000-000000000006','plan-mfa@example.com'),
 ('d1d1d1d1-0000-4000-8000-000000000007','plan-revoked@example.com'),
 ('d1d1d1d1-0000-4000-8000-000000000008','plan-dst@example.com');
insert into auth.sessions(id,user_id) select id,id from auth.users where id::text like 'd1d1d1d1-%';
insert into auth.mfa_factors(id,user_id,friendly_name,factor_type,status,created_at,updated_at)
values('d1d1d1d1-0000-4000-8000-000000000099','d1d1d1d1-0000-4000-8000-000000000006','Go test','totp','verified',now(),now());
update public.profiles set is_minor=true where id='d1d1d1d1-0000-4000-8000-000000000004';
insert into public.friendships(requester_id,addressee_id,status) values
 ('d1d1d1d1-0000-4000-8000-000000000001','d1d1d1d1-0000-4000-8000-000000000002','accepted');
insert into public.blocks(blocker_id,blocked_id) values
 ('d1d1d1d1-0000-4000-8000-000000000001','d1d1d1d1-0000-4000-8000-000000000002');

create temp table day_plan_fixture(plan jsonb) on commit drop;
insert into day_plan_fixture values(jsonb_build_object(
  'city','innsbruck','resort','Stubai Glacier',
  'planDate',to_char((now() at time zone 'Europe/Vienna')::date+1,'YYYY-MM-DD'),
  'meetTime','09:15','transport','need','meetingText','Innsbruck Hbf'));
grant select on day_plan_fixture to authenticated;

set local role anon;
select throws_ok($$select public.list_my_day_plans()$$,'42501',null,'anonymous users cannot list plans');
reset role;

set local role authenticated;
set local request.jwt.claim.sub='d1d1d1d1-0000-4000-8000-000000000001';
set local request.jwt.claims='{"role":"authenticated","sub":"d1d1d1d1-0000-4000-8000-000000000001","session_id":"d1d1d1d1-0000-4000-8000-000000000001"}';
select is(public.save_day_plan('d1d1d1d1-0000-4000-8000-000000000011',0,(select plan from day_plan_fixture))->>'status','saved','an incomplete-profile owner can create a private plan');
select results_eq(
  $$select plan->>'meetTime',plan->>'meetingText',plan->>'version',(plan->>'expiresAt')::timestamptz
    from public.list_my_day_plans() envelope cross join lateral jsonb_array_elements(envelope->'plans') plan$$,
  $$select '09:15'::text,'Innsbruck Hbf'::text,'1'::text,
    (((now() at time zone 'Europe/Vienna')::date+3)::timestamp at time zone 'Europe/Vienna')::timestamptz$$,
  'RPC returns complete own DTO and end-of-day-plus-24-hour Vienna expiry');
select is(public.save_day_plan('d1d1d1d1-0000-4000-8000-000000000011',0,(select plan from day_plan_fixture))->>'status','saved','same-field retry succeeds despite a stale version');
reset role;
select is((select count(*)::int from private.day_plan_save_log where user_id=auth.uid()),1,'idempotent retry consumes no save quota');
set local role authenticated;
select is(public.save_day_plan('d1d1d1d1-0000-4000-8000-000000000011',0,
  jsonb_set((select plan from day_plan_fixture),'{meetingText}','"Changed point"'))->>'status','conflict','stale changed save returns conflict');
select is(public.save_day_plan('d1d1d1d1-0000-4000-8000-000000000011',1,
  jsonb_set((select plan from day_plan_fixture),'{meetingText}','"Changed point"'))->>'status','saved','current version can be edited');
select is(((public.list_my_day_plans()->'plans'->0)->>'version')::int,2,'a changed edit advances the version once');
select is(public.save_day_plan(gen_random_uuid(),0,
  jsonb_set((select plan from day_plan_fixture),'{city}','"salzburg"'))->>'status','invalid','resort from another city is rejected');
select is(public.save_day_plan(gen_random_uuid(),0,
  jsonb_set((select plan from day_plan_fixture),'{planDate}',to_jsonb(to_char((now() at time zone 'Europe/Vienna')::date-1,'YYYY-MM-DD'))))->>'status','invalid','past plan day is rejected');
select is(public.save_day_plan(gen_random_uuid(),0,
  jsonb_set((select plan from day_plan_fixture),'{planDate}',to_jsonb(to_char((now() at time zone 'Europe/Vienna')::date+366,'YYYY-MM-DD'))))->>'status','invalid','day 366 is rejected');
select is(public.save_day_plan(gen_random_uuid(),0,
  jsonb_set((select plan from day_plan_fixture),'{meetingText}',to_jsonb(E'Bad\x07point'::text)))->>'status','invalid','control characters are rejected');
select is(public.save_day_plan(gen_random_uuid(),0,
  jsonb_set((select plan from day_plan_fixture),'{meetingText}',to_jsonb('C1control'::text)))->>'status','invalid','C1 control characters are rejected');
select is(public.save_day_plan(gen_random_uuid(),0,
  jsonb_set((select plan from day_plan_fixture),'{meetingText}',to_jsonb('hidden‮text'::text)))->>'status','invalid','bidi controls are rejected');
select is(public.save_day_plan(gen_random_uuid(),0,
  jsonb_set((select plan from day_plan_fixture),'{meetingText}',to_jsonb(repeat('x',121))))->>'status','invalid','meeting text length is bounded');
select is(public.save_day_plan(gen_random_uuid(),0,
  jsonb_set((select plan from day_plan_fixture),'{meetTime}','null'::jsonb))->>'status','invalid','null meeting time is rejected');
select is(public.save_day_plan(gen_random_uuid(),0,
  jsonb_set((select plan from day_plan_fixture),'{meetingText}','42'::jsonb))->>'status','invalid','non-text meeting point is rejected');
select throws_ok($$select public.save_day_plan(gen_random_uuid(),0,
  jsonb_set((select plan from day_plan_fixture),'{meetingText}','"spast"'))$$,'PB001',null,'blocked meeting text is refused by the database filter');
select is(jsonb_array_length(public.list_my_day_plans()->'plans'),1,'owner reads own plan despite no crew');
select ok(public.export_my_data()->'day_plans'->0 ? 'meetingText','own plan is included in account export');
select ok(not (public.export_my_data()->'day_plans'->0 ? 'user_id'),'export omits internal owner identifier');
select is(jsonb_array_length(public.export_my_data()->'day_plan_save_times'),2,'export includes own retained save timestamps');
select ok(not (public.export_my_data()->'day_plan_save_times'->0 ? 'id'),'save timestamp export omits internal sequence identifiers');
set local request.jwt.claims='{"role":"authenticated","sub":"d1d1d1d1-0000-4000-8000-000000000001"}';
select throws_ok($$select public.export_my_data()$$,'42501','not authenticated','export of plans requires an active session');
set local request.jwt.claims='{"role":"authenticated","sub":"d1d1d1d1-0000-4000-8000-000000000001","session_id":"d1d1d1d1-0000-4000-8000-000000000001"}';
select throws_ok($$select * from private.day_plans$$,'42501',null,'direct private table reads remain denied');
reset role;

set local role authenticated;
set local request.jwt.claim.sub='d1d1d1d1-0000-4000-8000-000000000002';
set local request.jwt.claims='{"role":"authenticated","sub":"d1d1d1d1-0000-4000-8000-000000000002","session_id":"d1d1d1d1-0000-4000-8000-000000000002"}';
select is(jsonb_array_length(public.list_my_day_plans()->'plans'),0,'friend and blocked user cannot read owner plans');
select is(jsonb_array_length(public.export_my_data()->'day_plans'),0,'another account export contains no owner plans');
select is(jsonb_array_length(public.export_my_data()->'day_plan_save_times'),0,'another account export contains no owner save timestamps');
reset role;

set local role authenticated;
set local request.jwt.claim.sub='d1d1d1d1-0000-4000-8000-000000000003';
set local request.jwt.claims='{"role":"authenticated","sub":"d1d1d1d1-0000-4000-8000-000000000003","session_id":"d1d1d1d1-0000-4000-8000-000000000003"}';
select is(jsonb_array_length(public.list_my_day_plans()->'plans'),0,'stranger cannot list or probe another owner plan');
select is(jsonb_array_length(public.export_my_data()->'day_plans'),0,'stranger export contains no owner plan');
reset role;

set local role authenticated;
set local request.jwt.claim.sub='d1d1d1d1-0000-4000-8000-000000000001';
set local request.jwt.claims='{"role":"authenticated","sub":"d1d1d1d1-0000-4000-8000-000000000001","session_id":"d1d1d1d1-0000-4000-8000-000000000001"}';
select is(public.delete_day_plan('d1d1d1d1-0000-4000-8000-000000000011',1),'conflict','delete refuses a stale version');
select is(public.delete_day_plan('d1d1d1d1-0000-4000-8000-000000000011',2),'deleted','delete accepts the current version');
select is(public.delete_day_plan('d1d1d1d1-0000-4000-8000-000000000011',2),'missing','repeated delete is successful and reveals no data');
select is(public.save_day_plan('d1d1d1d1-0000-4000-8000-000000000011',0,(select plan from day_plan_fixture))->>'status','conflict','delayed create retry cannot restore a deleted plan');
select ok(public.export_my_data()->'day_plan_tombstones'->0 ? 'id','export includes content-free deleted-plan identity metadata');
select ok(not (public.export_my_data()->'day_plan_tombstones'->0 ? 'meetingText'),'deletion tombstone retains no meeting history');
reset role;
update private.day_plan_tombstones set expires_at=now()-interval '1 second'
  where plan_id='d1d1d1d1-0000-4000-8000-000000000011';
select is(private.cleanup_day_plans(now()),0,'cleanup expires tombstones independently of active plan removals');
set local role authenticated;
set local request.jwt.claim.sub='d1d1d1d1-0000-4000-8000-000000000001';
set local request.jwt.claims='{"role":"authenticated","sub":"d1d1d1d1-0000-4000-8000-000000000001","session_id":"d1d1d1d1-0000-4000-8000-000000000001"}';
select is(public.save_day_plan('d1d1d1d1-0000-4000-8000-000000000011',0,(select plan from day_plan_fixture))->>'status','saved','expired tombstone no longer blocks stable id reuse');
reset role;

set local request.jwt.claim.sub='d1d1d1d1-0000-4000-8000-000000000005';
set local request.jwt.claims='{"role":"authenticated","sub":"d1d1d1d1-0000-4000-8000-000000000005","session_id":"d1d1d1d1-0000-4000-8000-000000000005"}';
do $$ declare i integer; outcome jsonb; current_plan jsonb; begin
  for i in 0..29 loop
    current_plan:=jsonb_build_object('city','innsbruck','resort','Stubai Glacier',
      'planDate',to_char((now() at time zone 'Europe/Vienna')::date+1,'YYYY-MM-DD'),
      'meetTime','09:15','transport','need','meetingText','Point '||lpad(i::text,2,'0'));
    outcome:=public.save_day_plan('d1d1d1d1-0000-4000-8000-000000000051',i,current_plan);
    if outcome->>'status'<>'saved' then raise exception 'save % failed: %',i,outcome; end if;
  end loop;
end $$;
select lives_ok($$select public.list_my_day_plans()$$,'thirty changed saves are accepted');
select is(public.save_day_plan('d1d1d1d1-0000-4000-8000-000000000051',30,
  jsonb_set((select plan from day_plan_fixture),'{meetingText}','"Point 31"'))->>'status','rate_limited','thirty-first changed save in rolling day is limited');
select is(public.save_day_plan('d1d1d1d1-0000-4000-8000-000000000051',0,
  jsonb_set((select plan from day_plan_fixture),'{meetingText}','"Point 29"'))->>'status','saved','same-field retry still succeeds at quota');
reset role;
select is((select count(*)::int from private.day_plan_save_log where user_id='d1d1d1d1-0000-4000-8000-000000000005'),30,'retry and rejected save leave durable audit count bounded at thirty');
set local role authenticated;
set local request.jwt.claim.sub='d1d1d1d1-0000-4000-8000-000000000005';
set local request.jwt.claims='{"role":"authenticated","sub":"d1d1d1d1-0000-4000-8000-000000000005","session_id":"d1d1d1d1-0000-4000-8000-000000000005"}';
select is(public.delete_day_plan('d1d1d1d1-0000-4000-8000-000000000051',30),'deleted','delete remains available at save quota');
reset role;

set local request.jwt.claim.sub='d1d1d1d1-0000-4000-8000-000000000004';
set local request.jwt.claims='{"role":"authenticated","sub":"d1d1d1d1-0000-4000-8000-000000000004","session_id":"d1d1d1d1-0000-4000-8000-000000000004"}';
do $$ declare i integer; outcome jsonb; begin
  for i in 1..20 loop
    outcome:=public.save_day_plan(('d1d1d1d1-0000-4000-8000-'||lpad((100+i)::text,12,'0'))::uuid,0,
      jsonb_build_object('city','innsbruck','resort','Stubai Glacier',
        'planDate',to_char((now() at time zone 'Europe/Vienna')::date+1,'YYYY-MM-DD'),
        'meetTime','09:15','transport','own','meetingText','Cap '||i));
    if outcome->>'status'<>'saved' then raise exception 'cap save % failed: %',i,outcome; end if;
  end loop;
end $$;
select is(jsonb_array_length(public.list_my_day_plans()->'plans'),20,'minor may save twenty plans without a completed profile');
select is(public.save_day_plan('d1d1d1d1-0000-4000-8000-000000000199',0,(select plan from day_plan_fixture))->>'status','limit','twenty-first unexpired plan is refused');
select is(public.delete_day_plan('d1d1d1d1-0000-4000-8000-000000000101',1),'deleted','deleting a minor-owned plan records a tombstone');
reset role;

select is(private.day_plan_expiry(date '2026-10-24'),'2026-10-25 23:00:00+00'::timestamptz,
  'autumn expiry is Vienna midnight after the DST transition');
select is(private.day_plan_expiry(date '2027-03-27'),'2027-03-28 22:00:00+00'::timestamptz,
  'spring expiry is Vienna midnight after the DST transition');
set local role authenticated;
set local request.jwt.claim.sub='d1d1d1d1-0000-4000-8000-000000000008';
set local request.jwt.claims='{"role":"authenticated","sub":"d1d1d1d1-0000-4000-8000-000000000008","session_id":"d1d1d1d1-0000-4000-8000-000000000008"}';
select is(public.save_day_plan('d1d1d1d1-0000-4000-8000-000000000081',0,jsonb_build_object(
  'city','innsbruck','resort','Stubai Glacier',
  'planDate',to_char((now() at time zone 'Europe/Vienna')::date+1,'YYYY-MM-DD'),'meetTime','09:15',
  'transport','own','meetingText','DST plan'))->>'status','saved','a dynamic upcoming plan saves');
select is(((public.list_my_day_plans()->'plans'->0)->>'expiresAt')::timestamptz,
  private.day_plan_expiry((now() at time zone 'Europe/Vienna')::date+1),'save RPC uses the same expiry helper');
reset role;
update private.day_plans set expires_at=now()-interval '1 second' where id='d1d1d1d1-0000-4000-8000-000000000081';
set local role authenticated;
select is(jsonb_array_length(public.list_my_day_plans()->'plans'),0,'expired plans disappear before cleanup runs');
reset role;
update private.day_plan_save_log set saved_at=now()-interval '25 hours'
  where user_id='d1d1d1d1-0000-4000-8000-000000000008';
select is(private.cleanup_day_plans(now()),1,'daily cleanup purges expired private plan');
select is((select count(*)::int from private.day_plan_save_log where user_id='d1d1d1d1-0000-4000-8000-000000000008'),0,'cleanup also removes old bounded quota metadata');

set local role authenticated;
set local request.jwt.claim.sub='d1d1d1d1-0000-4000-8000-000000000006';
set local request.jwt.claims='{"role":"authenticated","sub":"d1d1d1d1-0000-4000-8000-000000000006","session_id":"d1d1d1d1-0000-4000-8000-000000000006","aal":"aal1"}';
select throws_ok($$select public.list_my_day_plans()$$,'42501','Two-factor verification required','verified MFA requires aal2');
select throws_ok($$select public.export_my_data()$$,'42501','Two-factor verification required','export of plans also requires aal2');
set local request.jwt.claims='{"role":"authenticated","sub":"d1d1d1d1-0000-4000-8000-000000000006","session_id":"d1d1d1d1-0000-4000-8000-000000000006","aal":"aal2"}';
select is(jsonb_array_length(public.list_my_day_plans()->'plans'),0,'valid second factor permits own plan reads');
select is(jsonb_array_length(public.export_my_data()->'day_plans'),0,'valid second factor permits plan export');
reset role;
delete from auth.sessions where id='d1d1d1d1-0000-4000-8000-000000000007';
set local role authenticated;
set local request.jwt.claim.sub='d1d1d1d1-0000-4000-8000-000000000007';
set local request.jwt.claims='{"role":"authenticated","sub":"d1d1d1d1-0000-4000-8000-000000000007","session_id":"d1d1d1d1-0000-4000-8000-000000000007"}';
select throws_ok($$select public.list_my_day_plans()$$,'42501','not authenticated','revoked auth session cannot list plans');
select throws_ok($$select public.export_my_data()$$,'42501','not authenticated','revoked auth session cannot export plans');
reset role;
delete from auth.users where id='d1d1d1d1-0000-4000-8000-000000000004';
select is((select count(*)::int from private.day_plans where user_id='d1d1d1d1-0000-4000-8000-000000000004'),0,'account deletion cascades private plans');
select is((select count(*)::int from private.day_plan_tombstones where user_id='d1d1d1d1-0000-4000-8000-000000000004'),0,'account deletion cascades private tombstones');

select * from finish();
rollback;
