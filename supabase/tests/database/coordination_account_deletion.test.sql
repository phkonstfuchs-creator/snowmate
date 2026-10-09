begin;
create extension if not exists pgtap with schema extensions;
select plan(4);
insert into auth.users(id,email) values
('29100000-0000-4000-8000-000000000001','delete-coordination-host@example.com'),
('29100000-0000-4000-8000-000000000002','delete-coordination-peer@example.com');
update public.profiles set display_name='Deletion rider',handle='delgo_'||right(id::text,1),city='innsbruck',ability_level='chill',onboarding_completed=true
where id::text like '29100000-%';
insert into public.friendships(user_low,user_high,requested_by,status,responded_at) values
('29100000-0000-4000-8000-000000000001','29100000-0000-4000-8000-000000000002','29100000-0000-4000-8000-000000000001','accepted',now());
create temporary table delete_coordination_state(key text primary key,value uuid);
grant all on delete_coordination_state to authenticated;
set local role authenticated;
set local request.jwt.claim.sub='29100000-0000-4000-8000-000000000001';
insert into delete_coordination_state values('ride',public.create_ride('stubai-glacier','chill',now()+interval '2 days',3,'friends','Deletion test','Station',gen_random_uuid()));
insert into delete_coordination_state values('carpool',public.create_carpool('stubai-glacier','innsbruck','driver',now()+interval '2 days',2,'friends','Deletion test','Station',gen_random_uuid()));
set local request.jwt.claim.sub='29100000-0000-4000-8000-000000000002';
insert into delete_coordination_state values('riderequest',public.request_ride((select value from delete_coordination_state where key='ride'),gen_random_uuid()));
insert into delete_coordination_state values('carpoolrequest',public.request_carpool((select value from delete_coordination_state where key='carpool'),gen_random_uuid()));
set local request.jwt.claim.sub='29100000-0000-4000-8000-000000000001';
select public.respond_ride_request((select value from delete_coordination_state where key='riderequest'),true,gen_random_uuid());
select public.respond_carpool_request((select value from delete_coordination_state where key='carpoolrequest'),true,gen_random_uuid());
reset role;
select lives_ok($$delete from auth.users where id='29100000-0000-4000-8000-000000000001'$$,'accepted coordination never prevents deleting host account');
select is((select count(*) from public.rides where id=(select value from delete_coordination_state where key='ride')),0::bigint,'host ride cascades');
select is((select count(*) from public.carpools where id=(select value from delete_coordination_state where key='carpool')),0::bigint,'host carpool cascades');
select is((select count(*) from public.profiles where id='29100000-0000-4000-8000-000000000002'),1::bigint,'participant account remains');
select * from finish();
rollback;
