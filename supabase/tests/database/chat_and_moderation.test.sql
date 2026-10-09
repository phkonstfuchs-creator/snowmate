begin;

create extension if not exists pgtap with schema extensions;

select plan(132);

select has_table('public', 'conversations', 'conversations table exists');
select has_table('public', 'conversation_members', 'conversation members are normalized');
select has_table('public', 'messages', 'messages table exists');
select has_table('public', 'report_reasons', 'report reasons table exists');
select has_table('public', 'reports', 'reports table exists');
select has_table('public', 'report_appeals', 'report appeals table exists');
select has_table('private', 'report_evidence', 'report evidence is private');
select has_table('private', 'moderation_operators', 'moderation operators are explicit');
select has_table('private', 'moderation_decisions', 'moderation decisions are private');
select has_table(
  'private',
  'account_moderation_sanctions',
  'overlapping account sanctions are tracked independently'
);
select has_table('private', 'account_controls', 'account enforcement is stored privately');
select has_table(
  'private',
  'ride_participation_history',
  'ride safety context survives active-membership removal'
);
select has_column(
  'private',
  'account_controls',
  'moderation_report_id',
  'account enforcement records the report that caused the active sanction'
);

select has_function(
  'public',
  'create_dm',
  array['uuid', 'uuid'],
  'direct messages require an idempotency key'
);
select has_function(
  'public',
  'get_conversations',
  array[]::text[],
  'conversation summaries use a DTO RPC'
);
select has_function(
  'public',
  'get_messages',
  array['uuid', 'timestamp with time zone', 'uuid', 'integer'],
  'message history uses a stable compound cursor DTO RPC'
);
select has_function(
  'public',
  'send_message',
  array['uuid', 'text', 'uuid'],
  'message sending requires an idempotency key'
);
select has_function(
  'public',
  'create_report',
  array['uuid', 'text', 'text', 'uuid', 'uuid', 'uuid'],
  'reports are created through an idempotent RPC'
);
select has_function(
  'public',
  'get_own_reports',
  array[]::text[],
  'reporters receive reports through a privacy-safe DTO'
);
select has_function(
  'public',
  'create_appeal',
  array['uuid', 'text', 'uuid'],
  'appeals are created through an idempotent RPC'
);
select has_function(
  'public',
  'get_moderation_queue',
  array['integer'],
  'the moderation queue uses an MFA-protected operator RPC'
);
select has_function(
  'public',
  'moderate_report',
  array['uuid', 'text', 'text', 'text', 'uuid'],
  'moderation derives the operator from the authenticated session'
);
select has_function(
  'public',
  'get_moderation_appeals',
  array['uuid'],
  'operators read appeals through an MFA-protected RPC'
);
select has_function(
  'public',
  'resolve_report_appeal',
  array['uuid', 'text', 'text', 'uuid'],
  'appeal decisions are session-bound and idempotent'
);
select has_function(
  'private',
  'cleanup_chat_and_moderation_data',
  array['timestamp with time zone'],
  'chat and moderation retention use one private cleanup function'
);
select has_function(
  'private',
  'was_ride_participant',
  array['uuid', 'uuid'],
  'safety reports use private historical ride participation'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.conversations'::regclass),
  'conversations have RLS enabled'
);
select ok(
  (select relforcerowsecurity from pg_class where oid = 'public.conversation_members'::regclass),
  'conversation members force RLS'
);
select ok(
  (select relforcerowsecurity from pg_class where oid = 'public.messages'::regclass),
  'messages force RLS'
);
select ok(
  (select relforcerowsecurity from pg_class where oid = 'public.reports'::regclass),
  'reports force RLS'
);
select ok(
  (select relforcerowsecurity from pg_class where oid = 'public.report_appeals'::regclass),
  'appeals force RLS'
);
select ok(
  not has_table_privilege('anon', 'public.conversations', 'SELECT'),
  'anonymous users cannot read conversations'
);
select ok(
  not has_table_privilege('authenticated', 'public.messages', 'SELECT'),
  'authenticated clients cannot bypass message DTOs'
);
select ok(
  not has_table_privilege('authenticated', 'public.messages', 'INSERT'),
  'authenticated clients cannot insert messages directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.reports', 'SELECT'),
  'authenticated clients cannot inspect raw reports'
);
select ok(
  has_table_privilege('authenticated', 'public.report_reasons', 'SELECT'),
  'authenticated clients can read the non-sensitive active reason catalogue'
);
select ok(
  has_function_privilege('authenticated', 'public.create_dm(uuid,uuid)', 'EXECUTE'),
  'authenticated users can call create_dm'
);
select ok(
  not has_function_privilege('anon', 'public.create_dm(uuid,uuid)', 'EXECUTE'),
  'anonymous users cannot call create_dm'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.send_message(uuid,text,uuid)',
    'EXECUTE'
  ),
  'authenticated users can call send_message'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.send_message(uuid,text,uuid)',
    'EXECUTE'
  ),
  'anonymous users cannot call send_message'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.create_report(uuid,text,text,uuid,uuid,uuid)',
    'EXECUTE'
  ),
  'authenticated users can create reports'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.moderate_report(uuid,text,text,text,uuid)',
    'EXECUTE'
  ),
  'authenticated operator sessions can reach the guarded moderation RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.moderate_report(uuid,text,text,text,uuid)',
    'EXECUTE'
  ),
  'anonymous users cannot reach moderation'
);
select ok(
  not has_function_privilege(
    'service_role',
    'public.moderate_report(uuid,text,text,text,uuid)',
    'EXECUTE'
  ),
  'the service role cannot bypass operator identity and MFA'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'private.moderation_operators',
    'SELECT'
  ),
  'clients cannot enumerate moderation operators'
);
select ok(
  not has_table_privilege('authenticated', 'private.report_evidence', 'SELECT'),
  'clients cannot read preserved report evidence directly'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'private.cleanup_chat_and_moderation_data(timestamp with time zone)',
    'EXECUTE'
  ),
  'clients cannot trigger retention jobs'
);
select ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'messages'
      and column_name in ('media_url', 'attachment_path', 'file_path')
  ),
  'messages have no media or attachment surface'
);

insert into auth.users (id, email, raw_app_meta_data)
values
  ('50000000-0000-4000-8000-000000000001', 'friend-a@example.com', '{}'::jsonb),
  ('50000000-0000-4000-8000-000000000002', 'friend-b@example.com', '{}'::jsonb),
  ('50000000-0000-4000-8000-000000000003', 'ride-host@example.com', '{}'::jsonb),
  ('50000000-0000-4000-8000-000000000004', 'ride-member@example.com', '{}'::jsonb),
  ('50000000-0000-4000-8000-000000000005', 'operator@example.com', '{}'::jsonb);

update public.profiles
set
  display_name = case id
    when '50000000-0000-4000-8000-000000000001' then 'Friend A'
    when '50000000-0000-4000-8000-000000000002' then 'Friend B'
    when '50000000-0000-4000-8000-000000000003' then 'Ride Host'
    when '50000000-0000-4000-8000-000000000004' then 'Ride Member'
    else 'Moderator'
  end,
  handle = case id
    when '50000000-0000-4000-8000-000000000001' then 'chat_friend_a'
    when '50000000-0000-4000-8000-000000000002' then 'chat_friend_b'
    when '50000000-0000-4000-8000-000000000003' then 'chat_ride_host'
    when '50000000-0000-4000-8000-000000000004' then 'chat_ride_member'
    else 'chat_moderator'
  end,
  city = 'innsbruck',
  ability_level = 'chill',
  onboarding_completed = true,
  is_minor = false
where id in (
  '50000000-0000-4000-8000-000000000001'::uuid,
  '50000000-0000-4000-8000-000000000002'::uuid,
  '50000000-0000-4000-8000-000000000003'::uuid,
  '50000000-0000-4000-8000-000000000004'::uuid,
  '50000000-0000-4000-8000-000000000005'::uuid
);

insert into private.moderation_operators (user_id)
values ('50000000-0000-4000-8000-000000000005');

insert into public.friendships (
  user_low,
  user_high,
  requested_by,
  status,
  responded_at
)
values (
  '50000000-0000-4000-8000-000000000001',
  '50000000-0000-4000-8000-000000000002',
  '50000000-0000-4000-8000-000000000001',
  'accepted',
  statement_timestamp()
);

insert into public.rides (
  id,
  host_id,
  resort_id,
  ability_level,
  starts_at,
  capacity,
  audience,
  caption
)
values (
  '51000000-0000-4000-8000-000000000001',
  '50000000-0000-4000-8000-000000000003',
  'stubai-glacier',
  'chill',
  statement_timestamp() + interval '1 day',
  4,
  'friends',
  'Chat test ride'
);

insert into public.ride_members (ride_id, user_id, role)
values
  (
    '51000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000003',
    'host'
  ),
  (
    '51000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000001',
    'participant'
  ),
  (
    '51000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000004',
    'participant'
  );

create temporary table test_chat_state (
  key text primary key,
  value uuid not null
);
grant select, insert, update on table test_chat_state to authenticated, service_role;

insert into test_chat_state (key, value)
select 'ride_conversation', id
from public.conversations
where ride_id = '51000000-0000-4000-8000-000000000001';

set local role anon;

select throws_ok(
  $$select public.create_dm(
    '50000000-0000-4000-8000-000000000002',
    '50111111-0000-4000-8000-000000000001'
  )$$,
  '42501',
  null,
  'anonymous users cannot create a DM'
);

set local role authenticated;
set local request.jwt.claim.sub = '50000000-0000-4000-8000-000000000001';

select throws_ok(
  $$select public.create_dm(
    '50000000-0000-4000-8000-000000000003',
    '50111111-0000-4000-8000-000000000002'
  )$$,
  '42501',
  null,
  'unrelated users cannot create a DM'
);

insert into test_chat_state (key, value)
values (
  'dm_conversation',
  public.create_dm(
    '50000000-0000-4000-8000-000000000002',
    '50111111-0000-4000-8000-000000000003'
  )
);

select ok(
  (select value is not null from test_chat_state where key = 'dm_conversation'),
  'confirmed friends can create a DM'
);
select is(
  public.create_dm(
    '50000000-0000-4000-8000-000000000002',
    '50111111-0000-4000-8000-000000000004'
  ),
  (select value from test_chat_state where key = 'dm_conversation'),
  'a new command key still returns the canonical DM conversation'
);
select results_eq(
  $$select count(*) from public.get_conversations() where kind = 'dm'$$,
  array[1::bigint],
  'a friend sees exactly one canonical DM'
);
select results_eq(
  $$select title from public.get_conversations() where kind = 'dm'$$,
  array['Friend B'::text],
  'the DM DTO identifies only the current user counterpart'
);

select throws_ok(
  format(
    'select public.send_message(%L, %L, %L)',
    (select value from test_chat_state where key = 'dm_conversation'),
    '   ',
    '52000000-0000-4000-8000-000000000001'
  ),
  '23514',
  null,
  'blank messages are rejected'
);
select throws_ok(
  format(
    'select public.send_message(%L, %L, %L)',
    (select value from test_chat_state where key = 'dm_conversation'),
    U&'unsafe\202Etext',
    '52000000-0000-4000-8000-000000000002'
  ),
  '23514',
  null,
  'bidi override characters are rejected'
);
select throws_ok(
  format(
    'select public.send_message(%L, %L, %L)',
    (select value from test_chat_state where key = 'dm_conversation'),
    repeat('x', 1001),
    '52000000-0000-4000-8000-000000000003'
  ),
  '23514',
  null,
  'messages longer than 1000 characters are rejected'
);

insert into test_chat_state (key, value)
values (
  'friend_a_message',
  public.send_message(
    (select value from test_chat_state where key = 'dm_conversation'),
    '  Hello friend  ',
    '52000000-0000-4000-8000-000000000004'
  )
);

select is(
  public.send_message(
    (select value from test_chat_state where key = 'dm_conversation'),
    'Hello friend',
    '52000000-0000-4000-8000-000000000004'
  ),
  (select value from test_chat_state where key = 'friend_a_message'),
  'replaying a send command returns the original message'
);
select throws_ok(
  format(
    'select public.send_message(%L, %L, %L)',
    (select value from test_chat_state where key = 'dm_conversation'),
    'Different message under reused key',
    '52000000-0000-4000-8000-000000000004'
  ),
  '22023',
  null,
  'a send idempotency key cannot be reused for a different payload'
);
select results_eq(
  format(
    'select body from public.get_messages(%L, null, null, 50)',
    (select value from test_chat_state where key = 'dm_conversation')
  ),
  array['Hello friend'::text],
  'message DTOs return trimmed text'
);

set local request.jwt.claim.sub = '50000000-0000-4000-8000-000000000002';

select results_eq(
  $$select title from public.get_conversations() where kind = 'dm'$$,
  array['Friend A'::text],
  'the second friend sees the correct DM counterpart'
);

insert into test_chat_state (key, value)
values (
  'friend_b_message',
  public.send_message(
    (select value from test_chat_state where key = 'dm_conversation'),
    'Message to report',
    '52000000-0000-4000-8000-000000000005'
  )
);

select results_eq(
  format(
    'select sender_id from public.get_messages(%L, null, null, 50) where id = %L',
    (select value from test_chat_state where key = 'dm_conversation'),
    (select value from test_chat_state where key = 'friend_b_message')
  ),
  array['50000000-0000-4000-8000-000000000002'::uuid],
  'message DTOs preserve the authenticated sender identity'
);

reset role;
update public.messages
set created_at = '2026-08-03 12:00:00+00'::timestamptz
where id in (
  (select value from test_chat_state where key = 'friend_a_message'),
  (select value from test_chat_state where key = 'friend_b_message')
);
set local role authenticated;
set local request.jwt.claim.sub = '50000000-0000-4000-8000-000000000002';

select results_eq(
  format(
    'select id from public.get_messages(%L, null, null, 1)',
    (select value from test_chat_state where key = 'dm_conversation')
  ),
  format(
    'select value from test_chat_state where key in (%L, %L) order by value desc limit 1',
    'friend_a_message',
    'friend_b_message'
  ),
  'the first message page uses the UUID tie-breaker for equal timestamps'
);
select results_eq(
  format(
    'select id from public.get_messages(%L, %L, %L, 1)',
    (select value from test_chat_state where key = 'dm_conversation'),
    '2026-08-03 12:00:00+00'::timestamptz,
    (
      select value
      from test_chat_state
      where key in ('friend_a_message', 'friend_b_message')
      order by value desc limit 1
    )
  ),
  format(
    'select value from test_chat_state where key in (%L, %L) order by value asc limit 1',
    'friend_a_message',
    'friend_b_message'
  ),
  'the compound cursor does not skip a message with the same timestamp'
);

set local request.jwt.claim.sub = '50000000-0000-4000-8000-000000000003';

select results_eq(
  $$select count(*) from public.get_conversations() where kind = 'ride'$$,
  array[1::bigint],
  'the ride host sees the normalized ride conversation'
);

set local request.jwt.claim.sub = '50000000-0000-4000-8000-000000000001';

select results_eq(
  $$select count(*) from public.get_conversations() where kind = 'ride'$$,
  array[1::bigint],
  'an accepted ride participant sees the ride conversation'
);
select lives_ok(
  format(
    'select public.send_message(%L, %L, %L)',
    (select value from test_chat_state where key = 'ride_conversation'),
    'Ride chat message',
    '52000000-0000-4000-8000-000000000006'
  ),
  'an accepted ride participant can send to the ride chat'
);

set local request.jwt.claim.sub = '50000000-0000-4000-8000-000000000002';

select throws_ok(
  format(
    'select * from public.get_messages(%L, null, null, 50)',
    (select value from test_chat_state where key = 'ride_conversation')
  ),
  '42501',
  null,
  'a non-participant cannot read a ride chat'
);

reset role;
delete from public.ride_members
where ride_id = '51000000-0000-4000-8000-000000000001'
  and user_id = '50000000-0000-4000-8000-000000000001';
set local role authenticated;
set local request.jwt.claim.sub = '50000000-0000-4000-8000-000000000001';

select throws_ok(
  format(
    'select * from public.get_messages(%L, null, null, 50)',
    (select value from test_chat_state where key = 'ride_conversation')
  ),
  '42501',
  null,
  'leaving a ride immediately revokes ride chat access'
);

set local request.jwt.claim.sub = '50000000-0000-4000-8000-000000000004';

select lives_ok(
  $$select public.block_user(
    '50000000-0000-4000-8000-000000000003',
    '52000000-0000-4000-8000-000000000007'
  )$$,
  'a ride participant can block the ride host'
);
select results_eq(
  $$select count(*) from public.get_conversations() where kind = 'ride'$$,
  array[0::bigint],
  'a block immediately removes the ride chat for the blocker'
);
select throws_ok(
  format(
    'select public.send_message(%L, %L, %L)',
    (select value from test_chat_state where key = 'ride_conversation'),
    'must not send',
    '52000000-0000-4000-8000-000000000008'
  ),
  '42501',
  null,
  'a blocked ride relationship cannot send messages'
);

set local request.jwt.claim.sub = '50000000-0000-4000-8000-000000000003';

select throws_ok(
  format(
    'select * from public.get_messages(%L, null, null, 50)',
    (select value from test_chat_state where key = 'ride_conversation')
  ),
  '42501',
  null,
  'ride chat access is revoked in both block directions'
);

set local request.jwt.claim.sub = '50000000-0000-4000-8000-000000000002';

select lives_ok(
  $$select public.block_user(
    '50000000-0000-4000-8000-000000000001',
    '52000000-0000-4000-8000-000000000009'
  )$$,
  'a DM participant can block the other friend'
);
select results_eq(
  $$select count(*) from public.get_conversations() where kind = 'dm'$$,
  array[0::bigint],
  'a block immediately removes DM access'
);

set local request.jwt.claim.sub = '50000000-0000-4000-8000-000000000001';

select throws_ok(
  format(
    'select * from public.get_messages(%L, null, null, 50)',
    (select value from test_chat_state where key = 'dm_conversation')
  ),
  '42501',
  null,
  'the blocked DM user cannot read historical messages'
);
select throws_ok(
  format(
    'select public.send_message(%L, %L, %L)',
    (select value from test_chat_state where key = 'dm_conversation'),
    'must not send',
    '52000000-0000-4000-8000-000000000010'
  ),
  '42501',
  null,
  'the blocked DM user cannot send messages'
);
select throws_ok(
  $$
    insert into public.messages (conversation_id, sender_id, body)
    values (
      (select value from test_chat_state where key = 'dm_conversation'),
      '50000000-0000-4000-8000-000000000001',
      'forged direct insert'
    )
  $$,
  '42501',
  null,
  'clients cannot forge messages with direct inserts'
);
select throws_ok(
  $$
    insert into public.conversations (kind, created_by)
    values ('dm', '50000000-0000-4000-8000-000000000001')
  $$,
  '42501',
  null,
  'clients cannot forge conversations with direct inserts'
);

select throws_ok(
  format(
    'select public.create_report(%L, %L, %L, %L, %L, %L)',
    '50000000-0000-4000-8000-000000000003',
    'harassment',
    'Wrong target for this message',
    (select value from test_chat_state where key = 'friend_b_message'),
    null,
    '53000000-0000-4000-8000-000000000001'
  ),
  '23514',
  null,
  'a message report cannot forge the target sender'
);
select throws_ok(
  format(
    'select public.create_report(%L, %L, %L, %L, %L, %L)',
    '50000000-0000-4000-8000-000000000002',
    'harassment',
    'Mismatched ride context',
    (select value from test_chat_state where key = 'friend_b_message'),
    '51000000-0000-4000-8000-000000000001',
    '53000000-0000-4000-8000-000000000002'
  ),
  '23514',
  null,
  'a message cannot be attached to an unrelated ride'
);

insert into test_chat_state (key, value)
values (
  'critical_report',
  public.create_report(
    '50000000-0000-4000-8000-000000000002',
    'child_safety',
    'Review this message urgently',
    (select value from test_chat_state where key = 'friend_b_message'),
    null,
    '53000000-0000-4000-8000-000000000003'
  )
);

select is(
  public.create_report(
    '50000000-0000-4000-8000-000000000002',
    'child_safety',
    'Review this message urgently',
    (select value from test_chat_state where key = 'friend_b_message'),
    null,
    '53000000-0000-4000-8000-000000000003'
  ),
  (select value from test_chat_state where key = 'critical_report'),
  'replaying a report command returns the original report'
);
select throws_ok(
  $$select public.create_report(
    '50000000-0000-4000-8000-000000000002',
    'child_safety',
    'Different report under reused key',
    (select value from test_chat_state where key = 'friend_b_message'),
    null,
    '53000000-0000-4000-8000-000000000003'
  )$$,
  '22023',
  null,
  'a report idempotency key cannot be reused for different evidence'
);
select results_eq(
  $$select priority from public.get_own_reports()$$,
  array['critical'::text],
  'the reporter sees their critical report through the DTO'
);
select results_eq(
  $$select count(*) from public.get_own_reports()$$,
  array[1::bigint],
  'report replay does not create duplicate reports'
);

reset role;

select results_eq(
  $query$
    select details, reported_message_body
    from private.report_evidence
    where report_id = (select value from test_chat_state where key = 'critical_report')
  $query$,
  $expected$
    values (
      'Review this message urgently'::text,
      'Message to report'::text
    )
  $expected$,
  'a report preserves only its submitted details and exact message snapshot'
);

set local role authenticated;
set local request.jwt.claim.sub = '50000000-0000-4000-8000-000000000001';

insert into test_chat_state (key, value)
values (
  'removal_report',
  public.create_report(
    '50000000-0000-4000-8000-000000000002',
    'harassment',
    'Remove the reported message after review',
    (select value from test_chat_state where key = 'friend_b_message'),
    null,
    '53000000-0000-4000-8000-000000000007'
  )
);

select ok(
  (
    select target_response_at <= created_at + interval '4 hours'
    from public.get_own_reports()
    where id = (select value from test_chat_state where key = 'critical_report')
  ),
  'critical reports carry a four-hour target'
);
select throws_ok(
  format(
    'select public.create_appeal(%L, %L, %L)',
    (select value from test_chat_state where key = 'critical_report'),
    'This report still needs review',
    '53000000-0000-4000-8000-000000000004'
  ),
  '23514',
  null,
  'an unresolved report cannot be appealed prematurely'
);

set local request.jwt.claim.sub = '50000000-0000-4000-8000-000000000002';

select results_eq(
  $$select count(*) from public.get_own_reports()$$,
  array[0::bigint],
  'a reported user cannot see reports made about them'
);
select throws_ok(
  $$select reporter_id from public.reports$$,
  '42501',
  null,
  'reported users cannot query reporter identity from base tables'
);

select throws_ok(
  $$select public.create_report(
    '50000000-0000-4000-8000-000000000003',
    'harassment',
    'I was not part of this ride',
    null,
    '51000000-0000-4000-8000-000000000001',
    '53000000-0000-4000-8000-000000000005'
  )$$,
  '42501',
  null,
  'an unrelated user cannot forge ride report context'
);

set local request.jwt.claim.sub = '50000000-0000-4000-8000-000000000004';

insert into test_chat_state (key, value)
values (
  'normal_report',
  public.create_report(
    '50000000-0000-4000-8000-000000000003',
    'harassment',
    'Safety report after the relationship was blocked',
    null,
    null,
    '53000000-0000-4000-8000-000000000006'
  )
);

select results_eq(
  $$select priority from public.get_own_reports()$$,
  array['normal'::text],
  'a user can still report an account after blocking ended shared access'
);
select ok(
  (
    select target_response_at <= created_at + interval '24 hours'
    from public.get_own_reports()
    where id = (select value from test_chat_state where key = 'normal_report')
  ),
  'normal reports carry a 24-hour target'
);
select throws_ok(
  $$
    insert into public.reports (
      reporter_id,
      target_user_id,
      reason_code,
      priority,
      severity,
      target_response_at
    ) values (
      '50000000-0000-4000-8000-000000000004',
      '50000000-0000-4000-8000-000000000003',
      'harassment',
      'normal',
      'high',
      statement_timestamp() + interval '24 hours'
    )
  $$,
  '42501',
  null,
  'clients cannot forge reports with direct inserts'
);

select throws_ok(
  format(
    'select public.moderate_report(%L, %L, %L, %L, %L)',
    (select value from test_chat_state where key = 'normal_report'),
    'dismissed',
    'no_action',
    'Ordinary users cannot decide reports',
    '54000000-0000-4000-8000-000000000001'
  ),
  '42501',
  null,
  'ordinary authenticated users cannot invoke operator moderation'
);

set local request.jwt.claim.sub = '50000000-0000-4000-8000-000000000005';
set local request.jwt.claims = '{"sub":"50000000-0000-4000-8000-000000000005","aal":"aal1"}';

select throws_ok(
  format(
    'select public.moderate_report(%L, %L, %L, %L, %L)',
    (select value from test_chat_state where key = 'critical_report'),
    'dismissed',
    'no_action',
    'MFA is required for moderation',
    '54000000-0000-4000-8000-000000000002'
  ),
  '42501',
  null,
  'an operator without an AAL2 session cannot moderate'
);

set local request.jwt.claims = '{"sub":"50000000-0000-4000-8000-000000000005","aal":"aal2"}';

select throws_ok(
  format(
    'select public.moderate_report(%L, %L, %L, %L, %L)',
    (select value from test_chat_state where key = 'normal_report'),
    'triaged',
    'account_suspended',
    'Enforcement cannot remain in a non-appealable triage state',
    '54000000-0000-4000-8000-000000000011'
  ),
  '23514',
  null,
  'an enforcement action cannot leave its report merely triaged'
);

select lives_ok(
  format(
    'select public.moderate_report(%L, %L, %L, %L, %L)',
    (select value from test_chat_state where key = 'critical_report'),
    'dismissed',
    'no_action',
    'Reviewed and no policy breach found',
    '54000000-0000-4000-8000-000000000002'
  ),
  'an explicit operator with MFA can record a moderation decision'
);
select throws_ok(
  format(
    'select public.moderate_report(%L, %L, %L, %L, %L)',
    (select value from test_chat_state where key = 'critical_report'),
    'dismissed',
    'no_action',
    'A changed decision under the same key',
    '54000000-0000-4000-8000-000000000002'
  ),
  '22023',
  null,
  'a moderation idempotency key cannot confirm a different decision'
);
select results_eq(
  $$select count(*) from public.get_moderation_queue(100) where status = 'open'$$,
  array[2::bigint],
  'the private moderation queue exposes the remaining open reports'
);
select lives_ok(
  format(
    'select public.moderate_report(%L, %L, %L, %L, %L)',
    (select value from test_chat_state where key = 'removal_report'),
    'actioned',
    'content_removed',
    'The reported message violates the community rules',
    '54000000-0000-4000-8000-000000000003'
  ),
  'content removal is executed by the moderation command'
);

reset role;

select results_eq(
  $$
    select count(*)
    from public.messages
    where id = (select value from test_chat_state where key = 'friend_b_message')
  $$,
  array[0::bigint],
  'content_removed physically removes the live chat message'
);

set local role authenticated;
set local request.jwt.claim.sub = '50000000-0000-4000-8000-000000000005';
set local request.jwt.claims = '{"sub":"50000000-0000-4000-8000-000000000005","aal":"aal2"}';

select lives_ok(
  format(
    'select public.moderate_report(%L, %L, %L, %L, %L)',
    (select value from test_chat_state where key = 'normal_report'),
    'actioned',
    'account_suspended',
    'Temporary suspension while the safety report is reviewed',
    '54000000-0000-4000-8000-000000000004'
  ),
  'account suspension is executed by the moderation command'
);

set local request.jwt.claim.sub = '50000000-0000-4000-8000-000000000003';
set local request.jwt.claims = '{"sub":"50000000-0000-4000-8000-000000000003","aal":"aal1"}';

select throws_ok(
  format(
    'select * from public.get_messages(%L, null, null, 50)',
    (select value from test_chat_state where key = 'ride_conversation')
  ),
  '42501',
  null,
  'a suspended account immediately loses core chat access'
);
select results_eq(
  $$
    select count(*)
    from public.get_ride_members('51000000-0000-4000-8000-000000000001')
  $$,
  array[0::bigint],
  'a suspended ride host immediately loses roster access'
);

reset role;

select results_eq(
  $$select status from public.rides where id = '51000000-0000-4000-8000-000000000001'$$,
  array['cancelled'::text],
  'suspending a host immediately cancels their scheduled ride'
);

set local role authenticated;
set local request.jwt.claim.sub = '50000000-0000-4000-8000-000000000004';
set local request.jwt.claims = '{"sub":"50000000-0000-4000-8000-000000000004","aal":"aal1"}';

select lives_ok(
  $$select public.create_report(
    '50000000-0000-4000-8000-000000000003',
    'harassment',
    'The cancelled ride still needs a safety report',
    null,
    '51000000-0000-4000-8000-000000000001',
    '53000000-0000-4000-8000-000000000009'
  )$$,
  'an active former participant can retain valid ride evidence after suspension enforcement'
);

set local request.jwt.claim.sub = '50000000-0000-4000-8000-000000000003';
set local request.jwt.claims = '{"sub":"50000000-0000-4000-8000-000000000003","aal":"aal1"}';

insert into test_chat_state (key, value)
values (
  'target_appeal',
  public.create_appeal(
    (select value from test_chat_state where key = 'normal_report'),
    'Please reconsider this temporary account suspension',
    '55000000-0000-4000-8000-000000000010'
  )
);

select ok(
  (select value is not null from test_chat_state where key = 'target_appeal'),
  'a suspended account keeps access to its appeal channel'
);

set local request.jwt.claim.sub = '50000000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"sub":"50000000-0000-4000-8000-000000000001","aal":"aal1"}';

insert into test_chat_state (key, value)
values (
  'newer_sanction_report',
  public.create_report(
    '50000000-0000-4000-8000-000000000003',
    'harassment',
    'A separate report requires a newer moderation decision',
    null,
    null,
    '53000000-0000-4000-8000-000000000008'
  )
);

set local request.jwt.claim.sub = '50000000-0000-4000-8000-000000000005';
set local request.jwt.claims = '{"sub":"50000000-0000-4000-8000-000000000005","aal":"aal2"}';

select lives_ok(
  format(
    'select public.moderate_report(%L, %L, %L, %L, %L)',
    (select value from test_chat_state where key = 'newer_sanction_report'),
    'actioned',
    'account_banned',
    'A separate severe report requires a lasting account ban',
    '54000000-0000-4000-8000-000000000010'
  ),
  'a newer report can replace the active account sanction'
);

set local request.jwt.claim.sub = '50000000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"sub":"50000000-0000-4000-8000-000000000001","aal":"aal1"}';

insert into test_chat_state (key, value)
values (
  'weaker_sanction_report',
  public.create_report(
    '50000000-0000-4000-8000-000000000003',
    'spam',
    'A later lower-severity report must not weaken an existing ban',
    null,
    null,
    '53000000-0000-4000-8000-000000000010'
  )
);

set local request.jwt.claim.sub = '50000000-0000-4000-8000-000000000005';
set local request.jwt.claims = '{"sub":"50000000-0000-4000-8000-000000000005","aal":"aal2"}';

select lives_ok(
  format(
    'select public.moderate_report(%L, %L, %L, %L, %L)',
    (select value from test_chat_state where key = 'weaker_sanction_report'),
    'actioned',
    'account_restricted',
    'The lower-severity report receives only a temporary restriction',
    '54000000-0000-4000-8000-000000000012'
  ),
  'a lower-severity report can be decided without weakening stronger enforcement'
);

reset role;

select results_eq(
  $query$
    select moderation_state, moderation_report_id
    from private.account_controls
    where user_id = '50000000-0000-4000-8000-000000000003'
  $query$,
  $expected$
    values (
      'banned'::text,
      (select value from test_chat_state where key = 'newer_sanction_report')
    )
  $expected$,
  'a later restriction cannot downgrade an existing account ban'
);

update public.reports
set resolved_at = statement_timestamp() - interval '91 days'
where id = (select value from test_chat_state where key = 'weaker_sanction_report');

set local role authenticated;
set local request.jwt.claim.sub = '50000000-0000-4000-8000-000000000003';
set local request.jwt.claims = '{"sub":"50000000-0000-4000-8000-000000000003","aal":"aal1"}';

select throws_ok(
  $$select public.create_appeal(
    (select value from test_chat_state where key = 'weaker_sanction_report'),
    'This appeal arrives after its preserved evidence window',
    '55000000-0000-4000-8000-000000000012'
  )$$,
  '23514',
  null,
  'an appeal cannot be opened after its evidence retention window'
);

set local request.jwt.claim.sub = '50000000-0000-4000-8000-000000000005';
set local request.jwt.claims = '{"sub":"50000000-0000-4000-8000-000000000005","aal":"aal2"}';

insert into test_chat_state (key, value)
values (
  'target_appeal_decision',
  public.resolve_report_appeal(
    (select value from test_chat_state where key = 'target_appeal'),
    'upheld',
    'The temporary suspension from this report is reversed',
    '55000000-0000-4000-8000-000000000011'
  )
);

select is(
  public.resolve_report_appeal(
    (select value from test_chat_state where key = 'target_appeal'),
    'upheld',
    'The temporary suspension from this report is reversed',
    '55000000-0000-4000-8000-000000000011'
  ),
  (select value from test_chat_state where key = 'target_appeal_decision'),
  'replaying an appeal decision returns the original moderation decision'
);
select throws_ok(
  $$select public.resolve_report_appeal(
    (select value from test_chat_state where key = 'target_appeal'),
    'rejected',
    'A changed appeal result under the same command key',
    '55000000-0000-4000-8000-000000000011'
  )$$,
  '22023',
  null,
  'an appeal decision key cannot confirm a different outcome'
);

reset role;

select results_eq(
  $query$
    select moderation_state, moderation_report_id
    from private.account_controls
    where user_id = '50000000-0000-4000-8000-000000000003'
  $query$,
  $expected$
    values (
      'banned'::text,
      (select value from test_chat_state where key = 'newer_sanction_report')
    )
  $expected$,
  'upholding an older appeal does not clear a newer unrelated sanction'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '50000000-0000-4000-8000-000000000001';

insert into test_chat_state (key, value)
values (
  'appeal',
  public.create_appeal(
    (select value from test_chat_state where key = 'critical_report'),
    'Please reconsider this moderation result',
    '55000000-0000-4000-8000-000000000001'
  )
);

select ok(
  (select value is not null from test_chat_state where key = 'appeal'),
  'the reporter can appeal a dismissed report'
);
select is(
  public.create_appeal(
    (select value from test_chat_state where key = 'critical_report'),
    'Please reconsider this moderation result',
    '55000000-0000-4000-8000-000000000001'
  ),
  (select value from test_chat_state where key = 'appeal'),
  'replaying an appeal command returns the original appeal'
);
select throws_ok(
  $$select public.create_appeal(
    (select value from test_chat_state where key = 'critical_report'),
    'A different appeal under the same command key',
    '55000000-0000-4000-8000-000000000001'
  )$$,
  '22023',
  null,
  'an appeal idempotency key cannot be reused for different text'
);
select results_eq(
  $$select appeal_status from public.get_own_reports() where id = (select value from test_chat_state where key = 'critical_report')$$,
  array['pending'::text],
  'the report DTO exposes the reporter own pending appeal state'
);
select ok(
  pg_get_function_result(
    'public.get_own_reports()'::regprocedure
  ) !~ 'reporter_id',
  'the report DTO never returns reporter identity as a field'
);

reset role;

delete from private.report_evidence
where report_id = (select value from test_chat_state where key = 'critical_report');

set local role authenticated;
set local request.jwt.claim.sub = '50000000-0000-4000-8000-000000000005';
set local request.jwt.claims = '{"sub":"50000000-0000-4000-8000-000000000005","aal":"aal2"}';

select results_eq(
  $$
    select body, status
    from public.get_moderation_appeals(
      (select value from test_chat_state where key = 'critical_report')
    )
  $$,
  $expected$ values ('Please reconsider this moderation result'::text, 'pending'::text) $expected$,
  'an operator can read a pending appeal after report evidence expired'
);
select results_eq(
  $$
    select pending_appeals
    from public.get_moderation_queue(100)
    where id = (select value from test_chat_state where key = 'critical_report')
  $$,
  array[1],
  'a report remains in the moderation queue when only appeal content remains'
);
select lives_ok(
  $$select public.resolve_report_appeal(
    (select value from test_chat_state where key = 'appeal'),
    'rejected',
    'The original moderation outcome remains supported',
    '55000000-0000-4000-8000-000000000002'
  )$$,
  'an MFA operator can resolve an appeal through the guarded RPC'
);
select results_eq(
  $$
    select status
    from public.get_moderation_appeals(
      (select value from test_chat_state where key = 'critical_report')
    )
  $$,
  array['rejected'::text],
  'the appeal DTO reflects the recorded operator decision'
);

reset role;

insert into private.report_evidence (report_id, details)
values (
  (select value from test_chat_state where key = 'critical_report'),
  'Retention test evidence'
);

update public.report_appeals
set resolved_at = now() - interval '91 days'
where report_id = (select value from test_chat_state where key = 'critical_report');

update public.reports
set resolved_at = now() - interval '91 days'
where id = (select value from test_chat_state where key = 'critical_report');

update public.conversations
set
  created_at = now() - interval '13 months',
  last_message_at = now() - interval '13 months'
where id = (select value from test_chat_state where key = 'dm_conversation');

update public.rides
set starts_at = now() - interval '91 days'
where id = '51000000-0000-4000-8000-000000000001';

create temporary table test_retention_result as
select * from private.cleanup_chat_and_moderation_data(now());

select is(
  (select deleted_ride_conversations from test_retention_result),
  1::bigint,
  'ride conversations are deleted 90 days after the ride'
);
select is(
  (select deleted_dm_conversations from test_retention_result),
  1::bigint,
  'inactive DMs are deleted after 12 months'
);
select is(
  (select deleted_report_evidence from test_retention_result),
  2::bigint,
  'resolved report content is deleted after 90 days'
);
select is(
  (select purged_appeal_contents from test_retention_result),
  1::bigint,
  'resolved appeal text is purged after 90 days'
);
select is(
  (select deleted_report_records from test_retention_result),
  0::bigint,
  'report decision metadata remains for 12 months'
);
select results_eq(
  $query$
    select count(*)
    from public.reports
    where id = (select value from test_chat_state where key = 'critical_report')
  $query$,
  array[1::bigint],
  'the report record remains after its content is purged'
);

-- Report metadata survives while a newer appeal decision still requires it.
update public.report_appeals
set resolved_at = now() - interval '13 months'
where report_id = (select value from test_chat_state where key = 'critical_report');

update public.reports
set resolved_at = now() - interval '13 months'
where id = (select value from test_chat_state where key = 'critical_report');

select is(
  (
    select deleted_report_records
    from private.cleanup_chat_and_moderation_data(now())
  ),
  1::bigint,
  'resolved moderation metadata is deleted after 12 months'
);
select results_eq(
  $query$
    select count(*)
    from public.reports
    where id = (select value from test_chat_state where key = 'critical_report')
  $query$,
  array[0::bigint],
  'expired report records are physically removed'
);

select * from finish();

rollback;
