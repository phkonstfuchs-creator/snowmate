-- A server that has decoded and re-encoded an image certifies its immutable
-- Storage object ID. The HMAC key is generated inside the database and must
-- be provisioned out-of-band to the server-only signer before rollout.
create extension if not exists pgcrypto with schema extensions;

create table private.media_attestation_keys (
  key_id text primary key,
  secret bytea not null default extensions.gen_random_bytes(32),
  constraint media_attestation_key_size check (octet_length(secret) = 32)
);
alter table private.media_attestation_keys enable row level security;
alter table private.media_attestation_keys force row level security;
create policy media_attestation_keys_admin on private.media_attestation_keys
  for all to postgres using (true) with check (true);
revoke all on table private.media_attestation_keys from public, anon, authenticated;
insert into private.media_attestation_keys (key_id) values ('v1');

create table private.media_attestations (
  object_id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  bucket_id text not null check (bucket_id in ('avatars', 'post-photos')),
  name text not null,
  key_id text not null references private.media_attestation_keys(key_id),
  issued_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index media_attestations_owner on private.media_attestations(owner_id, created_at);
alter table private.media_attestations enable row level security;
alter table private.media_attestations force row level security;
create policy media_attestations_admin on private.media_attestations
  for all to postgres using (true) with check (true);
revoke all on table private.media_attestations from public, anon, authenticated;

create or replace function public.is_attested_media(p_object_id uuid, p_bucket text, p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.media_attestations a
    where a.object_id = p_object_id and a.bucket_id = p_bucket and a.name = p_path
  );
$$;
revoke all on function public.is_attested_media(uuid,text,text) from public, anon;
grant execute on function public.is_attested_media(uuid,text,text) to authenticated;

create or replace function private.is_attested_path(p_owner uuid, p_bucket text, p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from storage.objects o
    join private.media_attestations a on a.object_id = o.id
    where o.bucket_id = p_bucket and o.name = p_path
      and a.bucket_id = o.bucket_id and a.name = o.name
      and a.owner_id = p_owner
  );
$$;
revoke all on function private.is_attested_path(uuid,text,text)
  from public, anon, authenticated;

create or replace function public.attest_my_media(
  p_bucket text, p_path text, p_object_id uuid, p_issued_at bigint,
  p_key_id text, p_signature text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  signing_secret bytea;
  canonical text;
  expected bytea;
  provided bytea;
  difference integer := 0;
  byte_index integer;
  epoch_now bigint := floor(extract(epoch from now()))::bigint;
begin
  if me is null then return false; end if;
  if not public.storage_request_authorized() then return false; end if;
  if p_bucket is null or p_path is null
     or p_object_id is null or p_key_id is null or p_issued_at is null
     or p_signature is null or p_bucket not in ('avatars', 'post-photos')
     or p_signature !~ '^[0-9a-f]{64}$'
     or p_path !~ ('^' || me::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$')
     or p_issued_at not between epoch_now - 300 and epoch_now + 300 then
    return false;
  end if;

  select k.secret into signing_secret
  from private.media_attestation_keys k where k.key_id = p_key_id;
  if signing_secret is null then return false; end if;

  canonical := concat_ws(E'\n', 'v1', p_key_id, me::text, p_object_id::text,
    p_bucket, p_path, p_issued_at::text);
  expected := extensions.hmac(convert_to(canonical, 'UTF8'),
    signing_secret, 'sha256');
  provided := decode(p_signature, 'hex');
  for byte_index in 0..31 loop
    difference := difference | (get_byte(expected, byte_index) # get_byte(provided, byte_index));
  end loop;
  if difference <> 0 then return false; end if;

  -- Serialize with Storage's completeUpload transaction before recording
  -- proof. Its later privileged upsert is guarded by the UPDATE trigger.
  perform 1 from storage.objects o
  where o.id = p_object_id and o.bucket_id = p_bucket and o.name = p_path
  for update;
  if not found then return false; end if;

  insert into private.media_attestations
    (object_id, owner_id, bucket_id, name, key_id, issued_at)
  values (p_object_id, me, p_bucket, p_path, p_key_id,
    to_timestamp(p_issued_at))
  on conflict (object_id) do nothing;
  return found;
end;
$$;
revoke all on function public.attest_my_media(text,text,uuid,bigint,text,text)
  from public, anon;
grant execute on function public.attest_my_media(text,text,uuid,bigint,text,text)
  to authenticated;

-- An old certificate remains after deletion. Reusing its UUID therefore
-- cannot make new bytes inherit proof of sanitization.
create or replace function private.reject_reused_media_object_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.bucket_id in ('avatars', 'post-photos') and exists (
    select 1 from private.media_attestations a where a.object_id = new.id
  ) then
    raise exception 'attested Storage object ID cannot be reused' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.reject_reused_media_object_id()
  from public, anon, authenticated;
create trigger reject_reused_media_object_id before insert on storage.objects
  for each row execute function private.reject_reused_media_object_id();

-- Supabase Storage tests RLS before upload, then completes an upsert using
-- an internal superuser. Freeze identity and content version from the first
-- upload, even before certification, so a parallel raw upsert cannot win
-- between safe upload and attestation. A trigger covers privileged writes.
create or replace function private.reject_media_identity_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (old.bucket_id in ('avatars', 'post-photos')
      or new.bucket_id in ('avatars', 'post-photos'))
     and (new.id is distinct from old.id
       or new.bucket_id is distinct from old.bucket_id
       or new.name is distinct from old.name
       or new.version is distinct from old.version) then
    raise exception 'media Storage identity and version are immutable' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.reject_media_identity_change()
  from public, anon, authenticated;
create trigger reject_media_identity_change before update on storage.objects
  for each row execute function private.reject_media_identity_change();

-- Storage overwrites would invalidate a certificate's meaning.
create policy private_media_no_update on storage.objects as restrictive
  for update to authenticated
  using (bucket_id not in ('avatars', 'post-photos'))
  with check (bucket_id not in ('avatars', 'post-photos'));

drop policy "avatars_read_by_audience" on storage.objects;
create policy "avatars_read_by_audience" on storage.objects for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (public.is_attested_media(id, bucket_id, name)
        and public.avatar_path_for(((storage.foldername(name))[1])::uuid) = name)
    )
  );

drop policy "post_photos_read_by_friends" on storage.objects;
create policy "post_photos_read_by_friends" on storage.objects for select to authenticated
  using (
    bucket_id = 'post-photos'
    and ((storage.foldername(name))[1] = auth.uid()::text
      or (public.is_attested_media(id, bucket_id, name)
        and public.can_see_post_photo(name)))
  );

-- Existing references may remain for the owner, but a new avatar reference
-- must identify the currently stored and certified object.
create or replace function private.check_new_avatar_attestation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.avatar_path is not null
     and new.avatar_path is distinct from old.avatar_path
     and not private.is_attested_path(new.id, 'avatars', new.avatar_path) then
    raise exception 'avatar requires media attestation' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.check_new_avatar_attestation()
  from public, anon, authenticated;
create trigger check_new_avatar_attestation
  before update of avatar_path on public.profiles
  for each row execute function private.check_new_avatar_attestation();

create or replace function public.create_post(p_body text, p_resort text, p_photo_path text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  clean text := btrim(coalesce(p_body, ''), E' \n\r');
  place text := nullif(btrim(coalesce(p_resort, '')), '');
  recent integer;
begin
  if me is null then return 'unauthenticated'; end if;
  if not exists (select 1 from public.profiles p where p.id = me and p.onboarding_completed) then
    return 'profile_incomplete';
  end if;
  if char_length(clean) not between 1 and 500
     or clean ~ '[\x01-\x09\x0b\x0c\x0e-\x1f\x7f‪-‮⁦-⁩]'
     or (place is not null and char_length(place) not between 2 and 60)
     or (p_photo_path is not null and (p_photo_path not like me::text || '/%'
       or p_photo_path ~ '(\.\.|://|\\)' or char_length(p_photo_path) > 255)) then
    return 'invalid';
  end if;
  if p_photo_path is not null
     and not private.is_attested_path(me, 'post-photos', p_photo_path) then
    return 'invalid';
  end if;
  select count(*) into recent from public.posts
  where author_id = me and created_at > now() - interval '1 day';
  if recent >= 10 then return 'rate_limited'; end if;
  insert into public.posts (author_id, body, resort, photo_path)
  values (me, clean, place, p_photo_path);
  return 'created';
end;
$$;
revoke all on function public.create_post(text,text,text) from public, anon;
grant execute on function public.create_post(text,text,text) to authenticated;

-- Certificates are personal data; never export signing keys.
create or replace function public.export_my_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'exported_at', now(),
    'account', (
      select jsonb_build_object('id', u.id, 'email', u.email, 'created_at', u.created_at)
      from auth.users u where u.id = me
    ),
    'profile', (
      select to_jsonb(p) - 'id' from public.profiles p where p.id = me
    ),
    'lift_meetup', (
      select jsonb_build_object(
        'resort', m.resort, 'lift_id', m.lift_id,
        'started_at', m.started_at, 'arrival_at', m.arrival_at, 'expires_at', m.expires_at
      )
      from public.lift_meetups m where m.user_id = me
    ),
    'live_location', (
      select jsonb_build_object('lat', l.lat, 'lng', l.lng, 'accuracy_m', l.accuracy_m,
                                'updated_at', l.updated_at, 'expires_at', l.expires_at)
      from public.live_locations l where l.user_id = me
    ),
    'friendships', coalesce((
      select jsonb_agg(jsonb_build_object(
        'handle', other.handle,
        'status', f.status,
        'direction', case when f.requester_id = me then 'outgoing' else 'incoming' end,
        'created_at', f.created_at,
        'responded_at', f.responded_at
      ) order by f.created_at)
      from public.friendships f
      join public.profiles other
        on other.id = case when f.requester_id = me then f.addressee_id else f.requester_id end
      where me in (f.requester_id, f.addressee_id)
    ), '[]'::jsonb),
    'rides_hosted', coalesce((
      select jsonb_agg(to_jsonb(r) - 'host_id' order by r.ride_date)
      from public.rides r where r.host_id = me
    ), '[]'::jsonb),
    'rides_joined', coalesce((
      select jsonb_agg(jsonb_build_object(
        'ride_id', rp.ride_id,
        'resort', r.resort,
        'ride_date', r.ride_date,
        'status', rp.status,
        'joined_at', rp.joined_at
      ) order by rp.joined_at)
      from public.ride_participants rp
      join public.rides r on r.id = rp.ride_id
      where rp.user_id = me
    ), '[]'::jsonb),
    'carpools', coalesce((
      select jsonb_agg(to_jsonb(c) - 'author_id' order by c.ride_date)
      from public.carpools c where c.author_id = me
    ), '[]'::jsonb),
    'carpool_requests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'carpool_id', cr.carpool_id,
        'resort', c.resort,
        'ride_date', c.ride_date,
        'status', cr.status,
        'created_at', cr.created_at
      ) order by cr.created_at)
      from public.carpool_requests cr
      join public.carpools c on c.id = cr.carpool_id
      where cr.user_id = me
    ), '[]'::jsonb),
    'blocked', coalesce((
      select jsonb_agg(jsonb_build_object('handle', p.handle, 'since', b.created_at) order by b.created_at)
      from public.blocks b
      join public.profiles p on p.id = b.blocked_id
      where b.blocker_id = me
    ), '[]'::jsonb),
    'messages_sent', coalesce((
      select jsonb_agg(jsonb_build_object(
        'conversation_id', m.conversation_id,
        'kind', m.kind,
        'body', m.body,
        'lat', m.lat,
        'lng', m.lng,
        'created_at', m.created_at
      ) order by m.created_at)
      from public.messages m
      where m.sender_id = me
    ), '[]'::jsonb),
    'posts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'body', p.body,
        'resort', p.resort,
        'photo_path', p.photo_path,
        'created_at', p.created_at
      ) order by p.created_at)
      from public.posts p
      where p.author_id = me
    ), '[]'::jsonb),
    'ski_days', coalesce((
      select jsonb_agg(jsonb_build_object(
        'resort', d.resort,
        'started_at', d.started_at,
        'ended_at', d.ended_at,
        'distance_m', d.distance_m,
        'vertical_m', d.vertical_m,
        'max_speed_kmh', d.max_speed_kmh,
        'runs', d.runs
      ) order by d.started_at)
      from public.ski_days d
      where d.user_id = me
    ), '[]'::jsonb),
    'discovery_swipes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'handle', p.handle,
        'liked', s.liked,
        'created_at', s.created_at
      ) order by s.created_at)
      from public.swipes s
      join public.profiles p on p.id = s.target_id
      where s.swiper_id = me
    ), '[]'::jsonb),
    'push_subscriptions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'push_service', split_part(substr(s.endpoint, 9), '/', 1),
        'created_at', s.created_at,
        'session_id', s.session_id
      ) order by s.created_at)
      from public.push_subscriptions s
      where s.user_id = me
    ), '[]'::jsonb),
    'media_attestations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'object_id', a.object_id,
        'bucket_id', a.bucket_id,
        'path', a.name,
        'key_id', a.key_id,
        'issued_at', a.issued_at,
        'created_at', a.created_at
      ) order by a.created_at)
      from private.media_attestations a where a.owner_id = me
    ), '[]'::jsonb),
    'reports_filed', coalesce((
      select jsonb_agg(jsonb_build_object(
        'reported_handle', r.reported_handle,
        'reason', r.reason,
        'details', r.details,
        'created_at', r.created_at
      ) order by r.created_at)
      from public.reports r
      where r.reporter_id = me
    ), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;
