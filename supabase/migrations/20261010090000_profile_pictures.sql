-- Profile pictures (ADR 0022, spec profile-pictures).
--
-- * Pictures live in a private storage bucket, one folder per account:
--   avatars/<user id>/<file>. Only the owner writes their folder.
-- * Who may see a picture is the owner's choice, checked in the
--   database for every read:
--     friends   confirmed friends only (default)
--     contacts  also friends of friends and people in the same ride
--   Minors' pictures are always friends-only, whatever they chose.
--   A block in either direction hides it. The owner always sees it.
-- * The app serves pictures through its own route after asking
--   avatar_path_for(); browsers never get a storage URL.

alter table public.profiles
  add column avatar_visibility text not null default 'friends',
  add constraint profiles_avatar_visibility_value check (avatar_visibility in ('friends', 'contacts'));

grant update (avatar_visibility) on table public.profiles to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 524288, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

-- Whether the caller may see the owner's picture.
create or replace function public.can_see_avatar(owner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and owner is not null and (
    owner = auth.uid()
    or (
      not private.is_blocked(owner, auth.uid())
      and (
        private.are_friends(owner, auth.uid())
        or exists (
          select 1 from public.profiles p
          where p.id = owner
            and p.avatar_visibility = 'contacts'
            and not p.is_minor
            and (
              private.are_friends_of_friends(owner, auth.uid())
              or exists (
                select 1
                from (
                  select r.id from public.rides r where r.host_id = owner
                  union
                  select rp.ride_id from public.ride_participants rp
                  where rp.user_id = owner and rp.status = 'accepted'
                ) mine
                where private.is_ride_member(mine.id, auth.uid())
              )
            )
        )
      )
    )
  );
$$;

-- The storage path of the owner's picture, or null when there is none
-- or the caller may not see it.
create or replace function public.avatar_path_for(owner uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.avatar_path
  from public.profiles p
  where p.id = owner and public.can_see_avatar(owner);
$$;

revoke all on function public.can_see_avatar(uuid) from public, anon;
revoke all on function public.avatar_path_for(uuid) from public, anon;
grant execute on function public.can_see_avatar(uuid) to authenticated;
grant execute on function public.avatar_path_for(uuid) to authenticated;

-- Storage access: read by the audience above, write only your own folder.
create policy "avatars_read_by_audience"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.can_see_avatar(((storage.foldername(name))[1])::uuid)
  );

create policy "avatars_insert_own"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars_update_own"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars_delete_own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
