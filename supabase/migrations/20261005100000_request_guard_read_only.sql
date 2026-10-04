-- Fix for the request guard (ADR 0013).
--
-- PostgREST runs STABLE and IMMUTABLE functions in a read-only
-- transaction, also when they are called with POST through /rpc. The
-- guard treated every POST as a write and tried to log it, so every
-- list_* call failed with "cannot execute DELETE in a read-only
-- transaction": rides, carpools, friend requests and counts did not load.
--
-- A read-only transaction cannot write anything, so it is not counted.
-- The two-factor check still runs for every request.

create or replace function public.check_request()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  writing boolean :=
    coalesce(current_setting('request.method', true), 'POST') not in ('GET', 'HEAD')
    and current_setting('transaction_read_only') = 'off';
  recent integer;
begin
  if me is null then
    return;
  end if;

  if coalesce(claims ->> 'aal', 'aal1') <> 'aal2' and private.has_verified_mfa(me) then
    raise sqlstate 'PGRST' using
      message = json_build_object('code', 'mfa_required', 'message', 'Two-factor verification required')::text,
      detail = json_build_object('status', 401, 'headers', json_build_object())::text;
  end if;

  if not writing then
    return;
  end if;

  select count(*) into recent
  from private.request_log l
  where l.user_id = me and l.requested_at > now() - interval '1 minute';

  if recent >= 300 then
    raise sqlstate 'PGRST' using
      message = json_build_object('code', 'rate_limited', 'message', 'Too many requests, slow down')::text,
      detail = json_build_object('status', 429, 'headers', json_build_object('Retry-After', '60'))::text;
  end if;

  delete from private.request_log l
  where l.user_id = me and l.requested_at < now() - interval '2 minutes';

  insert into private.request_log (user_id) values (me);
end;
$$;

revoke all on function public.check_request() from public;
grant execute on function public.check_request() to anon, authenticated;
