begin;
create extension if not exists pgtap with schema extensions;
select plan(29);

insert into auth.users (id, email) values
  ('b0b0b0b0-0000-4000-8000-000000000001', 'attest-owner@example.com'),
  ('b0b0b0b0-0000-4000-8000-000000000002', 'attest-friend@example.com');
insert into auth.sessions (id, user_id)
select id, id from auth.users where id::text like 'b0b0b0b0-%';
update public.profiles set display_name = 'Media ' || right(id::text, 1),
  handle = 'media_' || right(id::text, 1), city = 'innsbruck',
  ability_level = 'chill', onboarding_completed = true
where id::text like 'b0b0b0b0-%';
insert into public.friendships (requester_id, addressee_id, status)
values ('b0b0b0b0-0000-4000-8000-000000000001',
        'b0b0b0b0-0000-4000-8000-000000000002', 'accepted');
insert into storage.objects (id, bucket_id, name) values
  ('b0b0b0b0-0000-4000-8000-000000000011', 'avatars',
   'b0b0b0b0-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111.webp'),
  ('b0b0b0b0-0000-4000-8000-000000000012', 'avatars',
   'b0b0b0b0-0000-4000-8000-000000000001/22222222-2222-4222-8222-222222222222.webp'),
  ('b0b0b0b0-0000-4000-8000-000000000013', 'post-photos',
   'b0b0b0b0-0000-4000-8000-000000000001/33333333-3333-4333-8333-333333333333.webp'),
  ('b0b0b0b0-0000-4000-8000-000000000014', 'post-photos',
   'b0b0b0b0-0000-4000-8000-000000000001/44444444-4444-4444-8444-444444444444.webp');

-- The privileged fixture signs only the two images whose bytes are assumed
-- to have been re-encoded; authenticated clients never see the secret.
create temp table pg_temp.signed_media as
select v.bucket, v.path, v.object_id, floor(extract(epoch from now()))::bigint as issued_at,
  encode(extensions.hmac(convert_to(concat_ws(E'\n', 'v1', 'v1',
    'b0b0b0b0-0000-4000-8000-000000000001', v.object_id::text,
    v.bucket, v.path, floor(extract(epoch from now()))::bigint::text), 'UTF8'),
    k.secret, 'sha256'), 'hex') as signature
from (values
  ('avatars', 'b0b0b0b0-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111.webp',
    'b0b0b0b0-0000-4000-8000-000000000011'::uuid),
  ('post-photos', 'b0b0b0b0-0000-4000-8000-000000000001/33333333-3333-4333-8333-333333333333.webp',
    'b0b0b0b0-0000-4000-8000-000000000013'::uuid)
) v(bucket, path, object_id)
cross join private.media_attestation_keys k where k.key_id = 'v1';
grant select on pg_temp.signed_media to authenticated;

set local role authenticated;
set local request.jwt.claim.sub = 'b0b0b0b0-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"role":"authenticated","session_id":"b0b0b0b0-0000-4000-8000-000000000001"}';
select throws_ok($$select secret from private.media_attestation_keys$$, '42501', null,
  'clients cannot read HMAC keys');
select throws_ok($$select * from private.media_attestations$$, '42501', null,
  'clients cannot read attestation records directly');
select is(public.create_post('raw upload', null,
  'b0b0b0b0-0000-4000-8000-000000000001/44444444-4444-4444-8444-444444444444.webp'),
  'invalid', 'directly uploaded raw post photo cannot be referenced');
select throws_ok($$update public.profiles set avatar_path =
  'b0b0b0b0-0000-4000-8000-000000000001/22222222-2222-4222-8222-222222222222.webp'
  where id = auth.uid()$$, '23514', null, 'raw avatar cannot become public');
select is(public.attest_my_media('avatars',
  'b0b0b0b0-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111.webp',
  'b0b0b0b0-0000-4000-8000-000000000011', (select issued_at from pg_temp.signed_media where bucket='avatars'),
  'v1', repeat('0', 64)), false, 'forged HMAC is refused');
select is(public.attest_my_media('avatars',
  'b0b0b0b0-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111.webp',
  'b0b0b0b0-0000-4000-8000-000000000011', (select issued_at from pg_temp.signed_media where bucket='avatars') - 400,
  'v1', (select signature from pg_temp.signed_media where bucket='avatars')), false,
  'expired issuance time is refused');
set local request.jwt.claims = '{"role":"authenticated","session_id":"b0b0b0b0-0000-4000-8000-000000000099"}';
select is(public.attest_my_media('avatars',
  'b0b0b0b0-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111.webp',
  'b0b0b0b0-0000-4000-8000-000000000011', (select issued_at from pg_temp.signed_media where bucket='avatars'),
  'v1', (select signature from pg_temp.signed_media where bucket='avatars')), false,
  'revoked source session cannot attest even with valid HMAC');
set local request.jwt.claims = '{"role":"authenticated"}';
select is(public.attest_my_media('avatars',
  'b0b0b0b0-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111.webp',
  'b0b0b0b0-0000-4000-8000-000000000011', (select issued_at from pg_temp.signed_media where bucket='avatars'),
  'v1', (select signature from pg_temp.signed_media where bucket='avatars')), false,
  'missing session claim cannot attest even with valid HMAC');
set local request.jwt.claims = '{"role":"authenticated","session_id":"b0b0b0b0-0000-4000-8000-000000000001"}';
select is(public.attest_my_media('avatars',
  'b0b0b0b0-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111.webp',
  'b0b0b0b0-0000-4000-8000-000000000011', (select issued_at from pg_temp.signed_media where bucket='avatars'),
  'v1', null), false, 'NULL signature cannot bypass verification');
select is(public.attest_my_media('avatars',
  'b0b0b0b0-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111.webp',
  'b0b0b0b0-0000-4000-8000-000000000011', (select issued_at from pg_temp.signed_media where bucket='avatars'),
  null, (select signature from pg_temp.signed_media where bucket='avatars')), false,
  'NULL key identifier is refused');
select is(public.attest_my_media('avatars',
  'b0b0b0b0-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111.webp',
  'b0b0b0b0-0000-4000-8000-000000000011', null,
  'v1', (select signature from pg_temp.signed_media where bucket='avatars')), false,
  'NULL issuance time is refused');
select is(public.attest_my_media(null,
  'b0b0b0b0-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111.webp',
  'b0b0b0b0-0000-4000-8000-000000000011', (select issued_at from pg_temp.signed_media where bucket='avatars'),
  'v1', (select signature from pg_temp.signed_media where bucket='avatars')), false,
  'NULL bucket is refused');
select is(public.attest_my_media('avatars',
  'b0b0b0b0-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111.webp',
  'b0b0b0b0-0000-4000-8000-000000000011', (select issued_at from pg_temp.signed_media where bucket='avatars'),
  'v1', (select signature from pg_temp.signed_media where bucket='avatars')), true,
  'valid owner HMAC attests current avatar object');
select is(public.attest_my_media('post-photos',
  'b0b0b0b0-0000-4000-8000-000000000001/33333333-3333-4333-8333-333333333333.webp',
  'b0b0b0b0-0000-4000-8000-000000000013', (select issued_at from pg_temp.signed_media where bucket='post-photos'),
  'v1', (select signature from pg_temp.signed_media where bucket='post-photos')), true,
  'valid owner HMAC attests current post photo');
select is(public.attest_my_media('avatars',
  'b0b0b0b0-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111.webp',
  'b0b0b0b0-0000-4000-8000-000000000011', (select issued_at from pg_temp.signed_media where bucket='avatars'),
  'v1', (select signature from pg_temp.signed_media where bucket='avatars')), false,
  'certificate for same object ID cannot be replayed');
reset role;

update public.profiles set avatar_path =
  'b0b0b0b0-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111.webp'
where id = 'b0b0b0b0-0000-4000-8000-000000000001';
set local role authenticated;
set local request.jwt.claim.sub = 'b0b0b0b0-0000-4000-8000-000000000001';
select is(public.create_post('safe upload', null,
  'b0b0b0b0-0000-4000-8000-000000000001/33333333-3333-4333-8333-333333333333.webp'),
  'created', 'attested photo may be posted');
reset role;

set local role authenticated;
set local request.jwt.claim.sub = 'b0b0b0b0-0000-4000-8000-000000000002';
set local request.jwt.claims = '{"role":"authenticated","session_id":"b0b0b0b0-0000-4000-8000-000000000002"}';
select is(public.attest_my_media('avatars',
  'b0b0b0b0-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111.webp',
  'b0b0b0b0-0000-4000-8000-000000000011', (select issued_at from pg_temp.signed_media where bucket='avatars'),
  'v1', (select signature from pg_temp.signed_media where bucket='avatars')), false,
  'another account cannot attest owner media even with its signature');
select is((select count(*)::int from storage.objects where bucket_id='avatars'
  and name like 'b0b0b0b0-0000-4000-8000-000000000001/%'), 1,
  'friend reads only attested current avatar');
select is((select count(*)::int from storage.objects where bucket_id='post-photos'
  and name like 'b0b0b0b0-0000-4000-8000-000000000001/%'), 1,
  'friend reads only attested attached post photo');
select is(jsonb_array_length(public.export_my_data() -> 'media_attestations'), 0,
  'friend export cannot see owner certificates');
reset role;

set local role authenticated;
set local request.jwt.claim.sub = 'b0b0b0b0-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"role":"authenticated","session_id":"b0b0b0b0-0000-4000-8000-000000000001"}';
update storage.objects set name =
  'b0b0b0b0-0000-4000-8000-000000000001/55555555-5555-4555-8555-555555555555.webp'
where id = 'b0b0b0b0-0000-4000-8000-000000000011';
reset role;
select is((select count(*)::int from storage.objects where id =
  'b0b0b0b0-0000-4000-8000-000000000011' and name like '%/5555%'), 0,
  'attested avatar Storage object cannot be updated');
select throws_ok($$update storage.objects set version = 'raw-upload-version'
  where id = 'b0b0b0b0-0000-4000-8000-000000000011'$$, '23514', null,
  'privileged Storage upsert cannot change attested object version');
select throws_ok($$update storage.objects set version = 'raw-upload-version'
  where id = 'b0b0b0b0-0000-4000-8000-000000000012'$$, '23514', null,
  'unattested media version is immutable before certification too');
select lives_ok($$update storage.objects set last_accessed_at = now()
  where id = 'b0b0b0b0-0000-4000-8000-000000000011'$$,
  'read-related access timestamp remains mutable');
set local storage.allow_delete_query = 'true';
delete from storage.objects where id = 'b0b0b0b0-0000-4000-8000-000000000011';
set local storage.allow_delete_query = 'false';
select throws_ok($$insert into storage.objects (id, bucket_id, name) values
  ('b0b0b0b0-0000-4000-8000-000000000011', 'avatars',
   'b0b0b0b0-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111.webp')$$,
  '23514', null, 'deleted attested object ID cannot be reused');
insert into storage.objects (id, bucket_id, name) values
  ('b0b0b0b0-0000-4000-8000-000000000015', 'avatars',
   'b0b0b0b0-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111.webp');
set local role authenticated;
set local request.jwt.claim.sub = 'b0b0b0b0-0000-4000-8000-000000000002';
set local request.jwt.claims = '{"role":"authenticated","session_id":"b0b0b0b0-0000-4000-8000-000000000002"}';
select is((select count(*)::int from storage.objects where id =
  'b0b0b0b0-0000-4000-8000-000000000015'), 0,
  'new object at old certified path is not certified');
reset role;
set local role anon;
select throws_ok($$select public.attest_my_media('avatars', 'x', null, null, 'v1', null)$$,
  '42501', null, 'anonymous caller cannot execute attestation RPC');
reset role;
set local request.jwt.claim.sub = 'b0b0b0b0-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"role":"authenticated","session_id":"b0b0b0b0-0000-4000-8000-000000000001"}';
select is(jsonb_array_length((select public.export_my_data() from (select
  set_config('request.jwt.claim.sub', 'b0b0b0b0-0000-4000-8000-000000000001', true)) x)
  -> 'media_attestations'), 2, 'owner export includes both own certificates');
select ok(not ((public.export_my_data() -> 'media_attestations' -> 0) ? 'secret'),
  'owner export contains certificate metadata but never signing secret');

select * from finish();
rollback;
