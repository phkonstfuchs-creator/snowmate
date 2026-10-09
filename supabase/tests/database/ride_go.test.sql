begin;
create extension if not exists pgtap with schema extensions;
select plan(47);
select has_function('public','set_ride_go_interest',array['uuid','integer','boolean'],'Go writes exist');
select has_function('public','get_ride_go_status',array['uuid'],'Go read exists');
select has_function('public','list_my_ride_go_interests',array['integer'],'own overview exists');
insert into auth.users(id,email) values
('b0b0b0b0-0000-4000-8000-000000000001','go-host@example.com'),
('b0b0b0b0-0000-4000-8000-000000000002','go-rider@example.com'),
('b0b0b0b0-0000-4000-8000-000000000003','go-friend@example.com'),
('b0b0b0b0-0000-4000-8000-000000000004','go-stranger@example.com');
update public.profiles set display_name='Go '||right(id::text,1),handle='go_'||right(id::text,1),city='innsbruck',ability_level='chill',is_minor=false,onboarding_completed=true where id::text like 'b0b0b0b0-%';
insert into auth.sessions(id,user_id) select id,id from auth.users where id::text like 'b0b0b0b0-%';
insert into public.friendships(requester_id,addressee_id,status) values
('b0b0b0b0-0000-4000-8000-000000000001','b0b0b0b0-0000-4000-8000-000000000003','accepted'),
('b0b0b0b0-0000-4000-8000-000000000002','b0b0b0b0-0000-4000-8000-000000000003','accepted');
insert into public.rides(id,host_id,resort,city,ability_level,ride_date,meet_time,meet_point,total_spots) values
('b0b0b0b0-0000-4000-8000-000000000010','b0b0b0b0-0000-4000-8000-000000000001','Nordkette','innsbruck','chill',current_date+2,'09:00','Private meet',2);
set local role authenticated;
set local request.jwt.claim.sub='b0b0b0b0-0000-4000-8000-000000000002';
set local request.jwt.claims='{"role":"authenticated","sub":"b0b0b0b0-0000-4000-8000-000000000002","session_id":"b0b0b0b0-0000-4000-8000-000000000002"}';
select is(public.get_ride_go_status('b0b0b0b0-0000-4000-8000-000000000010'),null::jsonb,'no wish is distinct from read failure');
select is(public.set_ride_go_interest('b0b0b0b0-0000-4000-8000-000000000010',4,false),'invalid','crew cap includes host');
select is(public.set_ride_go_interest('b0b0b0b0-0000-4000-8000-000000000010',3,true),'saved','visible ride wish saves');
select is((public.get_ride_go_status('b0b0b0b0-0000-4000-8000-000000000010')->>'confirmedGroup')::integer,1,'only host counts initially');
select is(public.get_ride_go_status('b0b0b0b0-0000-4000-8000-000000000010')->>'ready','false','wish itself joins nobody');
select throws_ok($$select public.join_ride('b0b0b0b0-0000-4000-8000-000000000010')$$,'23514','go_conditions_not_ready','fresh join blocks missing conditions');
select is(jsonb_array_length(public.list_my_ride_go_interests()),1,'own overview includes own wish');
select ok(not (public.list_my_ride_go_interests()::text like '%Private meet%'),'overview excludes meeting point');
reset role;
select ok(not has_table_privilege('authenticated','private.ride_go_interests','SELECT'),'no direct private reads');
insert into public.ride_participants(ride_id,user_id,status) values('b0b0b0b0-0000-4000-8000-000000000010','b0b0b0b0-0000-4000-8000-000000000003','accepted');
insert into public.carpools(id,author_id,role,resort,city,ride_date,departure_point,departure_time,seats) values('b0b0b0b0-0000-4000-8000-000000000020','b0b0b0b0-0000-4000-8000-000000000003','driver','Nordkette','innsbruck',current_date+2,'Private pickup','08:00',2);
insert into public.carpool_requests(carpool_id,user_id,status) values('b0b0b0b0-0000-4000-8000-000000000020','b0b0b0b0-0000-4000-8000-000000000002','pending');
set local role authenticated;
select is(public.get_ride_go_status('b0b0b0b0-0000-4000-8000-000000000010')->>'groupReady','true','prospective self avoids minimum deadlock');
select is(public.get_ride_go_status('b0b0b0b0-0000-4000-8000-000000000010')->>'carpoolReady','false','pending transport does not count');
reset role;
update public.carpool_requests set status='accepted' where carpool_id='b0b0b0b0-0000-4000-8000-000000000020';
set local role authenticated;
select is(public.get_ride_go_status('b0b0b0b0-0000-4000-8000-000000000010')->>'ready','true','confirmed seat and crew unlock manual action');
reset role;
update public.carpools set departure_time='10:00' where id='b0b0b0b0-0000-4000-8000-000000000020';
set local role authenticated;
select is(public.get_ride_go_status('b0b0b0b0-0000-4000-8000-000000000010')->>'carpoolReady','false','a seat departing after meeting is not usable');
reset role;
update public.carpools set departure_time='08:00',resort='Stubai' where id='b0b0b0b0-0000-4000-8000-000000000020';
set local role authenticated;
select is(public.get_ride_go_status('b0b0b0b0-0000-4000-8000-000000000010')->>'carpoolReady','false','another resort seat does not satisfy wish');
reset role;
update public.carpools set resort='Nordkette',ride_date=current_date+3 where id='b0b0b0b0-0000-4000-8000-000000000020';
set local role authenticated;
select is(public.get_ride_go_status('b0b0b0b0-0000-4000-8000-000000000010')->>'carpoolReady','false','another day seat does not satisfy wish');
reset role;
update public.carpools set ride_date=current_date+2 where id='b0b0b0b0-0000-4000-8000-000000000020';
set local role authenticated;
select is(public.join_ride('b0b0b0b0-0000-4000-8000-000000000010'),'requested','Go preserves main friend-of-friend approval');
select is(public.get_ride_go_status('b0b0b0b0-0000-4000-8000-000000000010')->>'status','requested','request is not confirmation');
reset role;
delete from public.carpool_requests where carpool_id='b0b0b0b0-0000-4000-8000-000000000020';
set local role authenticated;
set local request.jwt.claim.sub='b0b0b0b0-0000-4000-8000-000000000001';
set local request.jwt.claims='{"role":"authenticated","sub":"b0b0b0b0-0000-4000-8000-000000000001","session_id":"b0b0b0b0-0000-4000-8000-000000000001"}';
select throws_ok($$select public.respond_ride_request('b0b0b0b0-0000-4000-8000-000000000010','b0b0b0b0-0000-4000-8000-000000000002',true)$$,'23514','go_conditions_not_ready','host acceptance rechecks lost seat');
set local request.jwt.claim.sub='b0b0b0b0-0000-4000-8000-000000000002';
set local request.jwt.claims='{"role":"authenticated","sub":"b0b0b0b0-0000-4000-8000-000000000002","session_id":"b0b0b0b0-0000-4000-8000-000000000002"}';
select is(public.withdraw_ride_go_interest('b0b0b0b0-0000-4000-8000-000000000010'),'withdrawn','withdraw succeeds');
select is((select my_status from public.list_rides() where id='b0b0b0b0-0000-4000-8000-000000000010'),null::text,'withdraw cancels pending request');
select is(public.set_ride_go_interest('b0b0b0b0-0000-4000-8000-000000000010',2,false),'saved','withdrawn wish can be replaced');
select is(public.join_ride('b0b0b0b0-0000-4000-8000-000000000010'),'requested','explicit join only');
reset role;
update public.ride_participants set status='accepted' where ride_id='b0b0b0b0-0000-4000-8000-000000000010' and user_id='b0b0b0b0-0000-4000-8000-000000000002';
set local role authenticated;
reset role;
delete from public.ride_participants where ride_id='b0b0b0b0-0000-4000-8000-000000000010' and user_id='b0b0b0b0-0000-4000-8000-000000000003';
update private.ride_go_interests set minimum_group=3 where user_id='b0b0b0b0-0000-4000-8000-000000000002';
set local role authenticated;
select is(public.get_ride_go_status('b0b0b0b0-0000-4000-8000-000000000010')->>'status','confirmed','lost group keeps existing confirmation visible');
select is(public.get_ride_go_status('b0b0b0b0-0000-4000-8000-000000000010')->>'ready','false','lost group is flagged');
select is(public.set_ride_go_interest('b0b0b0b0-0000-4000-8000-000000000010',2,false),'already_joined','confirmed wish cannot be silently rewritten');
select is(public.withdraw_ride_go_interest('b0b0b0b0-0000-4000-8000-000000000010'),'withdrawn','confirmed wish withdrawal allowed');
select is((select my_status from public.list_rides() where id='b0b0b0b0-0000-4000-8000-000000000010'),'accepted','withdraw does not silently remove member');
select ok(public.export_my_data() ? 'ride_go_interests','export includes wishes');
select ok(public.export_my_data() ? 'native_push_devices','Go export preserves existing native push fields');
set local request.jwt.claim.sub='b0b0b0b0-0000-4000-8000-000000000004';
set local request.jwt.claims='{"role":"authenticated","sub":"b0b0b0b0-0000-4000-8000-000000000004","session_id":"b0b0b0b0-0000-4000-8000-000000000004"}';
select is(public.set_ride_go_interest('b0b0b0b0-0000-4000-8000-000000000010',2,false),'not_found','stranger cannot probe ride');
select is(jsonb_array_length(public.list_my_ride_go_interests()),0,'stranger cannot read other wishes');
select throws_ok($$select public.list_my_ride_go_interests(0)$$,'22023','invalid limit','zero overview limit rejected');
select throws_ok($$select public.list_my_ride_go_interests(51)$$,'22023','invalid limit','unbounded overview limit rejected');
select ok(not has_function_privilege('anon','public.get_ride_go_status(uuid)','EXECUTE'),'anonymous Go reads denied');
reset role;
select ok(not has_function_privilege('authenticated','private.ride_go_status(uuid,uuid)','EXECUTE'),'subject-taking helper inaccessible');
set local role authenticated;

reset role;
insert into auth.mfa_factors(id,user_id,friendly_name,factor_type,status,created_at,updated_at)
values(gen_random_uuid(),'b0b0b0b0-0000-4000-8000-000000000004','Go test','totp','verified',now(),now());
set local role authenticated;
select throws_ok($$select public.list_my_ride_go_interests()$$,'42501','Two-factor verification required','Go reads require verified second factor');
set local request.jwt.claims='{"role":"authenticated","sub":"b0b0b0b0-0000-4000-8000-000000000004","session_id":"b0b0b0b0-0000-4000-8000-000000000004","aal":"aal2"}';
select is(jsonb_array_length(public.list_my_ride_go_interests()),0,'valid second factor permits own reads');
reset role;
delete from auth.sessions where id='b0b0b0b0-0000-4000-8000-000000000004';
set local role authenticated;
select throws_ok($$select public.get_ride_go_status('b0b0b0b0-0000-4000-8000-000000000010')$$,'42501','not authenticated','revoked session denied even for empty status');
set local request.jwt.claims='{"role":"authenticated","sub":"b0b0b0b0-0000-4000-8000-000000000004"}';
select throws_ok($$select public.list_my_ride_go_interests()$$,'42501','not authenticated','missing active session rejected');
reset role;
select has_function('private','cleanup_ride_go_interests',array['timestamp with time zone'],'private retention function exists');
select ok(not has_function_privilege('authenticated','private.cleanup_ride_go_interests(timestamptz)','EXECUTE'),'clients cannot run global cleanup');
select ok(exists(select 1 from cron.job where jobname='pistl-ride-go-retention' and schedule='17 3 * * *' and active),'automatic daily retention scheduled');
insert into public.rides(id,host_id,resort,city,ability_level,ride_date,meet_time,meet_point,total_spots)
values('b0b0b0b0-0000-4000-8000-000000000011','b0b0b0b0-0000-4000-8000-000000000001','Nordkette','innsbruck','chill',current_date+8,'09:00','Future meet',2);
update private.ride_go_interests set withdrawn_at=null where ride_id='b0b0b0b0-0000-4000-8000-000000000010';
insert into private.ride_go_interests(user_id,ride_id,minimum_group,needs_carpool,withdrawn_at) values
('b0b0b0b0-0000-4000-8000-000000000002','b0b0b0b0-0000-4000-8000-000000000011',2,false,null),
('b0b0b0b0-0000-4000-8000-000000000003','b0b0b0b0-0000-4000-8000-000000000011',2,false,now()-interval '2 days');
select private.cleanup_ride_go_interests(now()+interval '4 days');
select is((select count(*) from private.ride_go_interests where ride_id='b0b0b0b0-0000-4000-8000-000000000010'),0::bigint,'expired wish removed after 24h threshold');
select is((select count(*) from private.ride_go_interests where ride_id='b0b0b0b0-0000-4000-8000-000000000011'),1::bigint,'withdrawn old wish removed while active future wish survives');
select * from finish();
rollback;
