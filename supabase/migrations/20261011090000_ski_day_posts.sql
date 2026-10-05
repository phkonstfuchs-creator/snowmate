-- Ski-day posts (ADR 0024, spec ski-day-posts).
--
-- * A post is a short text, optionally a photo and a resort, shared with
--   the author's confirmed friends. No public posts, no strangers,
--   minors and adults alike. A block hides posts both ways.
-- * Clients cannot read or write the table; functions are the only way.
-- * Photos live in the private bucket post-photos, one folder per author;
--   the app serves them after post_photo_path_for() allows it.
-- * At most 10 posts a day per person.

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  resort text,
  photo_path text,
  created_at timestamptz not null default now(),

  constraint posts_body_length check (char_length(body) between 1 and 500 and btrim(body) <> ''),
  constraint posts_body_safe check (body !~ '[\x01-\x09\x0b\x0c\x0e-\x1f\x7f‪-‮⁦-⁩]'),
  constraint posts_resort_length check (resort is null or char_length(resort) between 2 and 60),
  constraint posts_photo_path_own check (
    photo_path is null or (photo_path like author_id::text || '/%' and photo_path !~ '(\.\.|://|\\)' and char_length(photo_path) <= 255)
  )
);

create index posts_author_time on public.posts (author_id, created_at desc);
create index posts_time on public.posts (created_at desc);

alter table public.posts enable row level security;
alter table public.posts force row level security;
revoke all on table public.posts from public, anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-photos', 'post-photos', false, 2097152, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

-- Who may see what an author posts: the author and confirmed friends,
-- never across a block.
create or replace function private.can_see_posts_of(author uuid, viewer uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select viewer is not null and author is not null and (
    author = viewer
    or (private.are_friends(author, viewer) and not private.is_blocked(author, viewer))
  );
$$;

revoke all on function private.can_see_posts_of(uuid, uuid) from public, anon, authenticated;

-- Returns: created | invalid | rate_limited | profile_incomplete | unauthenticated
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
  if me is null then
    return 'unauthenticated';
  end if;
  if not exists (select 1 from public.profiles p where p.id = me and p.onboarding_completed) then
    return 'profile_incomplete';
  end if;
  if char_length(clean) not between 1 and 500
     or clean ~ '[\x01-\x09\x0b\x0c\x0e-\x1f\x7f‪-‮⁦-⁩]'
     or (place is not null and char_length(place) not between 2 and 60)
     or (p_photo_path is not null and (p_photo_path not like me::text || '/%' or p_photo_path ~ '(\.\.|://|\\)' or char_length(p_photo_path) > 255)) then
    return 'invalid';
  end if;

  select count(*) into recent from public.posts where author_id = me and created_at > now() - interval '1 day';
  if recent >= 10 then
    return 'rate_limited';
  end if;

  insert into public.posts (author_id, body, resort, photo_path) values (me, clean, place, p_photo_path);
  return 'created';
end;
$$;

-- Deletes one of the caller's posts and returns its photo path (null if
-- none), so the app can remove the file too. Nothing for others' posts.
create or replace function public.delete_my_post(p_id uuid)
returns table (deleted boolean, photo_path text)
language sql
security definer
set search_path = ''
as $$
  with gone as (
    delete from public.posts p where p.id = p_id and p.author_id = auth.uid()
    returning p.photo_path
  )
  select exists (select 1 from gone), (select g.photo_path from gone g limit 1);
$$;

-- The caller's and their friends' posts, newest first, 30 at a time.
create or replace function public.list_post_feed(before timestamptz default null, only_mine boolean default false)
returns table (
  id uuid,
  author_id uuid,
  author_name text,
  author_handle text,
  body text,
  resort text,
  has_photo boolean,
  created_at timestamptz,
  is_mine boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.author_id, a.display_name, a.handle, p.body, p.resort, p.photo_path is not null, p.created_at,
         p.author_id = auth.uid()
  from public.posts p
  join public.profiles a on a.id = p.author_id
  where auth.uid() is not null
    and private.can_see_posts_of(p.author_id, auth.uid())
    and (not only_mine or p.author_id = auth.uid())
    and (before is null or p.created_at < before)
  order by p.created_at desc
  limit 30;
$$;

-- The photo path of a post the caller may see, else null.
create or replace function public.post_photo_path_for(p_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.photo_path from public.posts p
  where p.id = p_id and private.can_see_posts_of(p.author_id, auth.uid());
$$;

-- Storage read: the author and friends of the folder's owner.
create or replace function public.can_see_post_photo(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (storage.foldername(object_name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and private.can_see_posts_of(((storage.foldername(object_name))[1])::uuid, auth.uid());
$$;

revoke all on function public.create_post(text, text, text) from public, anon;
revoke all on function public.delete_my_post(uuid) from public, anon;
revoke all on function public.list_post_feed(timestamptz, boolean) from public, anon;
revoke all on function public.post_photo_path_for(uuid) from public, anon;
revoke all on function public.can_see_post_photo(text) from public, anon;
grant execute on function public.create_post(text, text, text) to authenticated;
grant execute on function public.delete_my_post(uuid) to authenticated;
grant execute on function public.list_post_feed(timestamptz, boolean) to authenticated;
grant execute on function public.post_photo_path_for(uuid) to authenticated;
grant execute on function public.can_see_post_photo(text) to authenticated;

create policy "post_photos_read_by_friends"
  on storage.objects for select to authenticated
  using (bucket_id = 'post-photos' and public.can_see_post_photo(name));

create policy "post_photos_insert_own"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'post-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "post_photos_delete_own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'post-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- The data export lists the caller's posts.
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
