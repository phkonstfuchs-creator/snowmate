-- Onboarding completes itself once the four required fields are filled.
-- Clients still cannot write onboarding_completed directly (the column
-- is not in the update grant); the trigger derives it from the row, so a
-- profile is "complete" exactly when the completed-fields constraint
-- would allow it.

create or replace function private.derive_onboarding_completed()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.onboarding_completed = (
    new.display_name is not null
    and new.handle is not null
    and new.city is not null
    and new.ability_level is not null
  );

  return new;
end;
$$;

revoke all on function private.derive_onboarding_completed() from public;
revoke all on function private.derive_onboarding_completed() from anon;
revoke all on function private.derive_onboarding_completed() from authenticated;

create trigger profiles_derive_onboarding_completed
  before insert or update on public.profiles
  for each row
  execute function private.derive_onboarding_completed();

update public.profiles
set onboarding_completed = onboarding_completed;
