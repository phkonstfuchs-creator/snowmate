begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

-- me (1), friend (2), friend under 16 (3), stranger (4)
insert into auth.users (id, email)
select ('10ca7000-0000-4000-8000-00000000000' || n)::uuid, 'pin' || n || '@example.com'
from generate_series(1, 4) n;

update public.profiles
set display_name = 'Pin ' || right(id::text, 1), handle = 'pin_' || right(id::text, 1),
    city = 'innsbruck', ability_level = 'chill', birth_date = date '1995-03-01'
where id::text like '10ca7000-%';
update public.profiles set birth_date = (private.local_today() - interval '15 years')::date
where id = '10ca7000-0000-4000-8000-000000000003';

insert into public.friendships (requester_id, addressee_id, status) values
  ('10ca7000-0000-4000-8000-000000000001', '10ca7000-0000-4000-8000-000000000002', 'accepted'),
  ('10ca7000-0000-4000-8000-000000000003', '10ca7000-0000-4000-8000-000000000001', 'accepted');

create temp table ids (name text primary key, id uuid);
grant select, insert on ids to authenticated;

set local role authenticated;
set local request.jwt.claim.sub = '10ca7000-0000-4000-8000-000000000001';
insert into ids values ('direct', public.open_direct_chat('10ca7000-0000-4000-8000-000000000002'));
insert into ids values ('young', public.open_direct_chat('10ca7000-0000-4000-8000-000000000003'));

-- Sending.
select is(public.send_location_message((select id from ids where name = 'direct'), 47.2634567, 11.3943219), 'sent',
  'I can send my position to a friend');
select is(public.send_location_message((select id from ids where name = 'direct'), 91, 11), 'invalid', 'an impossible position is refused');
select is(public.send_location_message((select id from ids where name = 'direct'), null, 11), 'invalid', 'a missing coordinate is refused');
select is(public.send_message((select id from ids where name = 'direct'), 'text still works'), 'sent', 'text messages still work');

-- Reading.
set local request.jwt.claim.sub = '10ca7000-0000-4000-8000-000000000002';
select results_eq(
  $$select kind, lat, lng from public.list_messages((select id from ids where name = 'direct')) order by created_at, kind$$,
  $$values ('location'::text, 47.26346::double precision, 11.39432::double precision), ('text'::text, null::double precision, null::double precision)$$,
  'my friend sees the pin, rounded to about 1 m, and the text without one'
);

set local request.jwt.claim.sub = '10ca7000-0000-4000-8000-000000000004';
select is(public.send_location_message((select id from ids where name = 'direct'), 47, 11), 'forbidden', 'a stranger cannot send into the chat');
select is((select count(*)::int from public.list_messages((select id from ids where name = 'direct'))), 0, 'a stranger reads nothing');

-- Under 16.
set local request.jwt.claim.sub = '10ca7000-0000-4000-8000-000000000003';
select is(public.send_location_message((select id from ids where name = 'young'), 47, 11), 'too_young', 'someone under 16 cannot send a position');
select is(public.send_message((select id from ids where name = 'young'), 'Servus'), 'sent', 'but can still write');

-- After 24 hours the position is gone.
reset role;
update public.messages set created_at = now() - interval '25 hours'
where conversation_id = (select id from ids where name = 'direct') and kind = 'location';
set local role authenticated;
set local request.jwt.claim.sub = '10ca7000-0000-4000-8000-000000000002';
select results_eq(
  $$select lat is null, lng is null from public.list_messages((select id from ids where name = 'direct')) where kind = 'location'$$,
  $$values (true, true)$$,
  'a position older than 24 hours is not shown'
);
select is(public.send_location_message((select id from ids where name = 'direct'), 47.1, 11.2), 'sent', 'another pin');
reset role;
select is((select count(*)::int from public.messages where kind = 'location' and lat is not null
           and created_at < now() - interval '24 hours'), 0, 'positions older than 24 hours are deleted');

-- Export and shape.
set local role authenticated;
set local request.jwt.claim.sub = '10ca7000-0000-4000-8000-000000000001';
select is((select count(*)::int from jsonb_array_elements(public.export_my_data() -> 'messages_sent') e where e ->> 'kind' = 'location'), 1,
  'the export lists my location messages');
reset role;
select throws_ok(
  $$insert into public.messages (conversation_id, sender_id, body, lat, lng)
    values ((select id from ids where name = 'direct'), '10ca7000-0000-4000-8000-000000000001', 'x', 47, 11)$$,
  '23514', null, 'a text message cannot carry a position');

set local role anon;
select throws_ok($$select public.send_location_message(gen_random_uuid(), 47, 11)$$, '42501', null, 'anon cannot send a position');
select throws_ok($$select * from public.list_messages(gen_random_uuid())$$, '42501', null, 'anon cannot read messages');
reset role;

select * from finish();
rollback;
