-- RLS expressions run as the caller, so they need an executable predicate.
-- Expose only the current session's capability, never another account's state.
create or replace function private.can_current_account_use_core()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.can_account_use_core((select auth.uid()));
$$;

revoke all on function private.can_current_account_use_core()
  from public, anon, authenticated, service_role;
grant execute on function private.can_current_account_use_core()
  to authenticated;

alter policy "profiles_select_active_own" on public.profiles
  using (
    (select auth.uid()) = id
    and (select private.can_current_account_use_core())
  );
alter policy "profiles_update_active_own" on public.profiles
  using (
    (select auth.uid()) = id
    and (select private.can_current_account_use_core())
  )
  with check (
    (select auth.uid()) = id
    and (select private.can_current_account_use_core())
  );
