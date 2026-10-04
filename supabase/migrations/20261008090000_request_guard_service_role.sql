-- Let the service role pass the request guard (ADR 0013).
--
-- PostgREST runs public.check_request() before every request, for every
-- role. Only anon and authenticated could execute it, so every request
-- made with the service role key failed with "permission denied for
-- function check_request" (42501, HTTP 403). The public website stores
-- waitlist sign-ups through pistl_join_waitlist with that key, so no
-- sign-up could be saved.
--
-- The service role carries no user id, so the guard returns straight
-- away for it; nothing else changes.

grant execute on function public.check_request() to service_role;
