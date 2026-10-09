begin;
create extension if not exists pgtap with schema extensions;
select plan(14);
select has_function('public','get_own_ride_go_interests',array['integer'],'own wishes overview RPC exists');
select ok(not has_function_privilege('anon','public.get_own_ride_go_interests(integer)','EXECUTE'),'anonymous cannot enumerate wishes');
insert into auth.users(id,email) values
('29200000-0000-4000-8000-000000000001','overview-host@example.com'),
('29200000-0000-4000-8000-000000000002','overview-peer@example.com'),
('29200000-0000-4000-8000-000000000003','overview-outsider@example.com');
update public.profiles set display_name='Overview rider',handle='overview_'||right(id::text,1),city='innsbruck',ability_level='chill',onboarding_completed=true
where id::text like '29200000-%';
insert into public.friendships(user_low,user_high,requested_by,status,responded_at) values
('29200000-0000-4000-8000-000000000001','29200000-0000-4000-8000-000000000002','29200000-0000-4000-8000-000000000001','accepted',now());
insert into public.rides(id,host_id,resort_id,ability_level,starts_at,capacity)
select ('29300000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
  case when n=9 then '29200000-0000-4000-8000-000000000003'::uuid else '29200000-0000-4000-8000-000000000001'::uuid end,
  'stubai-glacier','chill',now()+interval '2 days'+(10-n)*interval '1 hour',4
from generate_series(1,9) as n;
insert into public.ride_members(ride_id,user_id,role)
select id,host_id,'host' from public.rides where id::text like '29300000-%';
insert into public.ride_members(ride_id,user_id,role) values
('29300000-0000-4000-8000-000000000001','29200000-0000-4000-8000-000000000002','participant'),
('29300000-0000-4000-8000-000000000005','29200000-0000-4000-8000-000000000002','participant');
insert into private.ride_go_interests(ride_id,user_id,minimum_group,needs_carpool,withdrawn_at)
select id,'29200000-0000-4000-8000-000000000002',2,
  right(id::text,1) in ('1','3'),case when right(id::text,1)='6' then now() else null end
from public.rides where id::text like '29300000-%';
insert into private.ride_go_interests(ride_id,user_id,minimum_group,needs_carpool)
values('29300000-0000-4000-8000-000000000002','29200000-0000-4000-8000-000000000003',2,false);
insert into public.ride_join_requests(ride_id,requester_id)
values('29300000-0000-4000-8000-000000000004','29200000-0000-4000-8000-000000000002');
update public.rides set starts_at=now()-interval '1 hour' where id='29300000-0000-4000-8000-000000000007';
update public.rides set status='cancelled' where id='29300000-0000-4000-8000-000000000008';
set local role authenticated;
set local request.jwt.claim.sub='29200000-0000-4000-8000-000000000002';
select is(jsonb_array_length(public.get_own_ride_go_interests()),5,'only own upcoming authorized nonwithdrawn wishes');
select is((select array_agg(item->'go'->>'status') from jsonb_array_elements(public.get_own_ride_go_interests()) item),array['confirmed','ready','interested','requested','confirmed'],'actionable missing condition has first priority');
select is(public.get_own_ride_go_interests(1)->0->'ride'->>'id','29300000-0000-4000-8000-000000000001','priority precedes chronological order');
select is(jsonb_array_length(public.get_own_ride_go_interests(2)),2,'caller limit applied after authorization and status evaluation');
select is((select array_agg(key order by key) from jsonb_object_keys(public.get_own_ride_go_interests(1)->0) key),array['go','ride'],'summary only exposes approved top-level contract');
select is((select array_agg(key order by key) from jsonb_object_keys(public.get_own_ride_go_interests(1)->0->'ride') key),array['capacity','id','resort','startsAt'],'no meeting point or member identity leaked');
select throws_ok('select public.get_own_ride_go_interests(0)','22023','invalid overview limit','zero limit rejected');
select throws_ok('select public.get_own_ride_go_interests(51)','22023','invalid overview limit','oversized limit rejected');
reset role;
delete from public.friendships where user_low='29200000-0000-4000-8000-000000000001' and user_high='29200000-0000-4000-8000-000000000002';
set local role authenticated;
select is(jsonb_array_length(public.get_own_ride_go_interests()),2,'revoked discovery removed while authorized memberships remain');
reset role;
insert into public.blocks(blocker_id,blocked_id) values('29200000-0000-4000-8000-000000000002','29200000-0000-4000-8000-000000000001');
set local role authenticated;
select is(public.get_own_ride_go_interests(),'[]'::jsonb,'block removes even existing member summaries');
set local request.jwt.claim.sub='29200000-0000-4000-8000-000000000001';
select is(public.get_own_ride_go_interests(),'[]'::jsonb,'host cannot enumerate participant wishes');
set local request.jwt.claim.sub='';
select throws_ok('select public.get_own_ride_go_interests()','42501','authentication required','overview requires verified user');
select * from finish();
rollback;
