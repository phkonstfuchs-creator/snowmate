begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

insert into auth.users (id, email)
values ('a8a8a8a8-0000-4000-8000-0000000000dd', 'storage-delete@example.com');
insert into storage.objects (bucket_id, name)
values ('avatars', 'a8a8a8a8-0000-4000-8000-0000000000dd/orphan.webp');

set local role authenticated;
set local request.jwt.claim.sub = 'a8a8a8a8-0000-4000-8000-0000000000dd';
select is(public.delete_my_account(), false,
  'account deletion waits while an orphaned Storage file remains');
reset role;
select is((select count(*)::integer from auth.users
  where id = 'a8a8a8a8-0000-4000-8000-0000000000dd'), 1,
  'a failed Storage cleanup leaves the account available for retry');
delete from storage.objects where name = 'a8a8a8a8-0000-4000-8000-0000000000dd/orphan.webp';
set local role authenticated;
select is(public.delete_my_account(), true, 'account deletion succeeds after Storage cleanup');

select * from finish();
rollback;
