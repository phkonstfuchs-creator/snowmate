begin;

create extension if not exists pgtap with schema extensions;

select plan(71);

select has_table('public', 'friendships', 'friendships table exists');
select has_table('public', 'blocks', 'blocks table exists');
select has_table('public', 'crews', 'crews table exists');
select has_table('private', 'command_rate_limits', 'command limits are stored privately');

select has_function(
  'private',
  'consume_command_rate_limit',
  array['uuid', 'text', 'integer', 'interval'],
  'commands share a server-side rate-limit boundary'
);
select has_function(
  'private',
  'lock_relationship_pair',
  array['uuid', 'uuid'],
  'relationship mutations share one canonical pair lock'
);

select has_function(
  'public',
  'request_friendship',
  array['uuid', 'uuid', 'text'],
  'friend requests use an authenticated RPC'
);
select has_function(
  'public',
  'respond_friendship',
  array['uuid', 'boolean', 'uuid'],
  'friend responses use an authenticated RPC'
);
select has_function(
  'public',
  'block_user',
  array['uuid', 'uuid'],
  'blocking uses an authenticated RPC'
);
select has_function(
  'public',
  'unblock_user',
  array['uuid', 'uuid'],
  'unblocking is an idempotent authenticated RPC'
);
select has_function(
  'public',
  'create_friend_invite',
  array[]::text[],
  'targeted friend invite generation exists'
);
select has_function(
  'public',
  'get_discovery_profiles',
  array[]::text[],
  'discovery is exposed through a minimal DTO RPC'
);
select has_function(
  'public',
  'get_friendships',
  array[]::text[],
  'friendships are exposed through a session-scoped DTO'
);
select has_function(
  'public',
  'get_blocked_profiles',
  array[]::text[],
  'the caller block list uses a private DTO boundary'
);
select has_function(
  'public',
  'get_crews',
  array[]::text[],
  'crew summaries use a DTO RPC'
);
select has_function(
  'public',
  'get_crew_members',
  array['uuid'],
  'crew rosters use a membership-checked DTO RPC'
);
select has_function(
  'public',
  'get_crew_invitations',
  array[]::text[],
  'incoming crew invitations use a DTO RPC'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.friendships'::regclass),
  'friendships has RLS enabled'
);
select ok(
  (select relforcerowsecurity from pg_class where oid = 'public.blocks'::regclass),
  'blocks forces RLS'
);
select ok(
  not has_table_privilege('anon', 'public.friendships', 'SELECT'),
  'anonymous users cannot read friendships'
);
select ok(
  not has_table_privilege('authenticated', 'public.friendships', 'INSERT'),
  'authenticated clients cannot insert friendships directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.friendships', 'SELECT'),
  'authenticated clients cannot bypass friendship DTOs'
);
select ok(
  not has_table_privilege('authenticated', 'public.crews', 'SELECT'),
  'authenticated clients cannot bypass crew DTOs'
);
select ok(
  not has_table_privilege('authenticated', 'private.command_rate_limits', 'SELECT'),
  'clients cannot inspect command rate-limit state'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'private.consume_command_rate_limit(uuid,text,integer,interval)',
    'EXECUTE'
  ),
  'clients cannot invoke the private limiter directly'
);

insert into auth.users (id, email)
values
  ('10000000-0000-4000-8000-000000000001', 'adult-a@example.com'),
  ('10000000-0000-4000-8000-000000000002', 'adult-b@example.com'),
  ('10000000-0000-4000-8000-000000000003', 'adult-c@example.com'),
  ('10000000-0000-4000-8000-000000000004', 'adult-d@example.com'),
  ('10000000-0000-4000-8000-000000000005', 'minor@example.com');

update public.profiles
set
  display_name = case id
    when '10000000-0000-4000-8000-000000000001' then 'Adult A'
    when '10000000-0000-4000-8000-000000000002' then 'Adult B'
    when '10000000-0000-4000-8000-000000000003' then 'Adult C'
    when '10000000-0000-4000-8000-000000000004' then 'Adult D'
    else 'Minor Rider'
  end,
  handle = case id
    when '10000000-0000-4000-8000-000000000001' then 'adult_a'
    when '10000000-0000-4000-8000-000000000002' then 'adult_b'
    when '10000000-0000-4000-8000-000000000003' then 'adult_c'
    when '10000000-0000-4000-8000-000000000004' then 'adult_d'
    else 'minor_rider'
  end,
  city = 'innsbruck',
  ability_level = 'chill',
  onboarding_completed = true,
  is_minor = id = '10000000-0000-4000-8000-000000000005'
where id in (
  '10000000-0000-4000-8000-000000000001'::uuid,
  '10000000-0000-4000-8000-000000000002'::uuid,
  '10000000-0000-4000-8000-000000000003'::uuid,
  '10000000-0000-4000-8000-000000000004'::uuid,
  '10000000-0000-4000-8000-000000000005'::uuid
);

select lives_ok(
  $$select private.consume_command_rate_limit(
    '10000000-0000-4000-8000-000000000004',
    'pgtap_probe',
    1,
    interval '1 hour'
  )$$,
  'the first command in a rate window is accepted'
);

select throws_ok(
  $$select private.consume_command_rate_limit(
    '10000000-0000-4000-8000-000000000004',
    'pgtap_probe',
    1,
    interval '1 hour'
  )$$,
  'P0001',
  'rate limit exceeded',
  'a command above its server-side limit is rejected'
);

create temporary table test_social_state (
  key text primary key,
  value text not null
);
grant select, insert, update on table test_social_state to authenticated;

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';

select lives_ok(
  $$select public.request_friendship(
    '10000000-0000-4000-8000-000000000002',
    'aaaaaaaa-0000-4000-8000-000000000001',
    null
  )$$,
  'adult A can request adult B'
);

select is(
  public.request_friendship(
    '10000000-0000-4000-8000-000000000002',
    'aaaaaaaa-0000-4000-8000-000000000001',
    null
  ),
  (
    select friendship_id
    from public.get_friendships()
    where other_user_id = '10000000-0000-4000-8000-000000000002'
  ),
  'replaying a request idempotency key returns the same friendship'
);

select throws_ok(
  $$select public.request_friendship(
    '10000000-0000-4000-8000-000000000003',
    'aaaaaaaa-0000-4000-8000-000000000001',
    null
  )$$,
  '22023',
  null,
  'a request key cannot be replayed for a different target'
);

select throws_ok(
  $$select public.respond_friendship(
    (select friendship_id from public.get_friendships() limit 1),
    true,
    'aaaaaaaa-0000-4000-8000-000000000002'
  )$$,
  '42501',
  null,
  'the requester cannot accept their own outgoing request'
);

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000002';

select lives_ok(
  $$select public.respond_friendship(
    (
      select friendship_id
      from public.get_friendships()
      where other_user_id = '10000000-0000-4000-8000-000000000001'
    ),
    true,
    'bbbbbbbb-0000-4000-8000-000000000001'
  )$$,
  'adult B can accept adult A'
);

select throws_ok(
  $$select public.respond_friendship(
    (
      select friendship_id
      from public.get_friendships()
      where other_user_id = '10000000-0000-4000-8000-000000000001'
    ),
    false,
    'bbbbbbbb-0000-4000-8000-000000000001'
  )$$,
  '22023',
  null,
  'a friendship response key cannot change the decision'
);

select results_eq(
  $$select relationship from public.get_discovery_profiles() where id = '10000000-0000-4000-8000-000000000001'$$,
  array['friend'::text],
  'accepted friends appear in discovery'
);

select lives_ok(
  $$select public.request_friendship(
    '10000000-0000-4000-8000-000000000003',
    'bbbbbbbb-0000-4000-8000-000000000002',
    null
  )$$,
  'adult B can request adult C'
);

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000003';

select lives_ok(
  $$select public.respond_friendship(
    (
      select friendship_id
      from public.get_friendships()
      where other_user_id = '10000000-0000-4000-8000-000000000002'
    ),
    true,
    'cccccccc-0000-4000-8000-000000000001'
  )$$,
  'adult C can accept adult B'
);

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000002';

insert into test_social_state (key, value)
values (
  'crew',
  public.create_crew(
    'Weekend Crew',
    'innsbruck',
    'bbbbbbbb-0000-4000-8000-000000000007'
  )::text
);

select ok(
  (select value::uuid is not null from test_social_state where key = 'crew'),
  'an authenticated user can create a crew'
);

select throws_ok(
  $$select public.create_crew(
    'Different Crew',
    'innsbruck',
    'bbbbbbbb-0000-4000-8000-000000000007'
  )$$,
  '22023',
  null,
  'a crew creation key cannot be replayed with a different normalized name'
);

insert into test_social_state (key, value)
values (
  'crew_invitation',
  public.invite_crew_member(
    (select value::uuid from test_social_state where key = 'crew'),
    '10000000-0000-4000-8000-000000000003',
    'bbbbbbbb-0000-4000-8000-000000000008'
  )::text
);

select ok(
  (select value::uuid is not null from test_social_state where key = 'crew_invitation'),
  'a crew owner can invite a confirmed friend'
);

select throws_ok(
  format(
    'select public.invite_crew_member(%L, %L, %L)',
    (select value from test_social_state where key = 'crew'),
    '10000000-0000-4000-8000-000000000001',
    'bbbbbbbb-0000-4000-8000-000000000008'
  ),
  '22023',
  null,
  'a crew invitation key cannot be replayed for a different friend'
);

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000003';

select results_eq(
  $$select crew_name from public.get_crew_invitations()$$,
  array['Weekend Crew'::text],
  'the invited user sees the incoming crew invitation'
);
select lives_ok(
  $$select public.respond_crew_invitation(
    (select value::uuid from test_social_state where key = 'crew_invitation'),
    true,
    'cccccccc-0000-4000-8000-000000000009'
  )$$,
  'the invited user can accept the crew invitation'
);
select throws_ok(
  $$select public.respond_crew_invitation(
    (select value::uuid from test_social_state where key = 'crew_invitation'),
    false,
    'cccccccc-0000-4000-8000-000000000009'
  )$$,
  '22023',
  null,
  'a crew response key cannot change the decision'
);
select results_eq(
  $$select name, own_role from public.get_crews()$$,
  $expected$ values ('Weekend Crew'::text, 'member'::text) $expected$,
  'accepted crews appear with the caller role'
);
select results_eq(
  format(
    'select count(*) from public.get_crew_members(%L)',
    (select value from test_social_state where key = 'crew')
  ),
  array[2::bigint],
  'crew rosters are visible to their members'
);

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';

select results_eq(
  $$
    select id, relationship
    from public.get_discovery_profiles()
    where id in (
      '10000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000003'
    )
    order by id
  $$,
  $$
    values
      ('10000000-0000-4000-8000-000000000002'::uuid, 'friend'::text),
      ('10000000-0000-4000-8000-000000000003'::uuid, 'friend-of-friend'::text)
  $$,
  'an adult sees friends and adult friends-of-friends with explicit relationship labels'
);

select results_eq(
  $$select id from public.profiles order by id$$,
  array['10000000-0000-4000-8000-000000000001'::uuid],
  'direct profile reads remain owner-only despite discovery'
);

reset role;

insert into private.account_controls (user_id, moderation_state, moderation_until)
values ('10000000-0000-4000-8000-000000000002', 'suspended', now() + interval '7 days')
on conflict (user_id) do update
set moderation_state = excluded.moderation_state, moderation_until = excluded.moderation_until;

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';

select results_eq(
  $$select count(*) from public.get_discovery_profiles() where id = '10000000-0000-4000-8000-000000000003'$$,
  array[0::bigint],
  'a suspended mutual friend cannot provide friend-of-friend visibility'
);

reset role;

update private.account_controls
set moderation_state = 'clear', moderation_until = null
where user_id = '10000000-0000-4000-8000-000000000002';

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';

select lives_ok(
  $$select public.request_friendship(
    '10000000-0000-4000-8000-000000000004',
    'aaaaaaaa-0000-4000-8000-000000000003',
    null
  )$$,
  'an adult can create a pending request'
);

select results_eq(
  $$select count(*) from public.get_discovery_profiles() where id = '10000000-0000-4000-8000-000000000004'$$,
  array[0::bigint],
  'pending relationships are not discoverable'
);

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000002';

select throws_ok(
  $$select public.request_friendship(
    '10000000-0000-4000-8000-000000000005',
    'bbbbbbbb-0000-4000-8000-000000000003',
    null
  )$$,
  '42501',
  null,
  'a minor cannot receive a request without their targeted invite'
);

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000005';

insert into test_social_state (key, value)
values ('minor_invite', public.create_friend_invite());

select ok(
  (select value ~ '^[a-f0-9]{64}$' from test_social_state where key = 'minor_invite'),
  'friend invite tokens are high-entropy opaque values'
);

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000002';

select lives_ok(
  format(
    'select public.request_friendship(%L, %L, %L)',
    '10000000-0000-4000-8000-000000000005',
    'bbbbbbbb-0000-4000-8000-000000000004',
    (select value from test_social_state where key = 'minor_invite')
  ),
  'a targeted invite permits a request to a minor'
);

select throws_ok(
  format(
    'select public.request_friendship(%L, %L, %L)',
    '10000000-0000-4000-8000-000000000005',
    'bbbbbbbb-0000-4000-8000-000000000005',
    (select value from test_social_state where key = 'minor_invite')
  ),
  '42501',
  null,
  'a consumed minor invite cannot be replayed with a new command key'
);

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000005';

select lives_ok(
  $$select public.respond_friendship(
    (
      select friendship_id
      from public.get_friendships()
      where other_user_id = '10000000-0000-4000-8000-000000000002'
    ),
    true,
    'eeeeeeee-0000-4000-8000-000000000001'
  )$$,
  'the minor can accept the targeted request'
);

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000003';

select results_eq(
  $$select count(*) from public.get_discovery_profiles() where id = '10000000-0000-4000-8000-000000000005'$$,
  array[0::bigint],
  'an adult friend-of-friend cannot discover a minor'
);

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000005';

select results_eq(
  $$select count(*) from public.get_discovery_profiles() where id = '10000000-0000-4000-8000-000000000001'$$,
  array[0::bigint],
  'a minor cannot discover an adult friend-of-friend'
);

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000003';

select lives_ok(
  $$select public.block_user(
    '10000000-0000-4000-8000-000000000001',
    'cccccccc-0000-4000-8000-000000000002'
  )$$,
  'blocking succeeds immediately'
);

select throws_ok(
  $$select public.block_user(
    '10000000-0000-4000-8000-000000000004',
    'cccccccc-0000-4000-8000-000000000002'
  )$$,
  '22023',
  null,
  'a block key cannot be replayed for a different target'
);

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';

select results_eq(
  $$select count(*) from public.get_discovery_profiles() where id = '10000000-0000-4000-8000-000000000003'$$,
  array[0::bigint],
  'a block removes friend-of-friend discovery in both directions'
);

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000002';

select lives_ok(
  $$select public.block_user(
    '10000000-0000-4000-8000-000000000001',
    'bbbbbbbb-0000-4000-8000-000000000006'
  )$$,
  'a friend can block an accepted friend'
);

select results_eq(
  $$
    select count(*)
    from public.get_friendships()
    where other_user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  array[0::bigint],
  'blocking removes the accepted friendship'
);
select results_eq(
  $$select id from public.get_blocked_profiles()$$,
  array['10000000-0000-4000-8000-000000000001'::uuid],
  'the blocker can review their own block list through a DTO'
);
select is(
  public.unblock_user(
    '10000000-0000-4000-8000-000000000001',
    'bbbbbbbb-0000-4000-8000-000000000010'
  ),
  '10000000-0000-4000-8000-000000000001'::uuid,
  'the blocker can remove their own block'
);
select is(
  public.unblock_user(
    '10000000-0000-4000-8000-000000000001',
    'bbbbbbbb-0000-4000-8000-000000000010'
  ),
  '10000000-0000-4000-8000-000000000001'::uuid,
  'unblocking replays safely with the same command key'
);
select throws_ok(
  $$select public.unblock_user(
    '10000000-0000-4000-8000-000000000004',
    'bbbbbbbb-0000-4000-8000-000000000010'
  )$$,
  '22023',
  null,
  'an unblock key cannot be replayed for a different target'
);
select results_eq(
  $$select count(*) from public.get_blocked_profiles()$$,
  array[0::bigint],
  'the unblocked profile leaves the caller block DTO'
);

select throws_ok(
  $$
    insert into public.friendships (
      user_low,
      user_high,
      requested_by,
      status
    ) values (
      '10000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000004',
      '10000000-0000-4000-8000-000000000002',
      'accepted'
    )
  $$,
  '42501',
  null,
  'clients cannot forge accepted friendships'
);

reset role;

insert into private.account_controls (user_id, moderation_state, moderation_until)
values ('10000000-0000-4000-8000-000000000002', 'suspended', now() + interval '7 days')
on conflict (user_id) do update
set moderation_state = excluded.moderation_state, moderation_until = excluded.moderation_until;

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000002';

select results_eq(
  $$select count(*) from public.profiles$$,
  array[0::bigint],
  'a suspended account cannot read its profile through the base-table policy'
);
select results_eq(
  $$select count(*) from public.get_friendships()$$,
  array[0::bigint],
  'a suspended account cannot read its friendship graph'
);
select results_eq(
  $$select count(*) from public.get_crews()$$,
  array[0::bigint],
  'a suspended account cannot read its crews'
);

reset role;

select * from finish();

rollback;
