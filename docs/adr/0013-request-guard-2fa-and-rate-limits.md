# 0013 Request guard, two-factor sign-in and rate limits

- **Status:** Proposed
- **Date:** 2026-10-04
- **Checks:** `supabase/tests/database/request_guard.test.sql`, `safe_text.test.sql`,
  `lib/rate-limit.test.ts`, `features/auth/actions.test.ts`,
  `features/profile/security-actions.test.ts`, `features/auth/route-access.test.ts`

## Context

The owner asked for login rate limiting, two-factor sign-in, a password
strength check and protection against broken access control. The app
talks to Supabase with the publishable key only; anything the app
enforces can be bypassed by calling the Supabase API directly with a
stolen session or password.

## Options

1. Enforce in the Next.js proxy and server actions only.
2. Enforce in the database as well, through PostgREST's `db_pre_request`
   hook, which runs before every Data API request.

## Decision

Option 2, layered:

- **Two-factor (TOTP)**: Supabase Auth MFA with an authenticator app,
  set up and turned off on the Profile tab (turning off needs a current
  code). After the password, an account with a verified factor gets an
  aal1 session; the proxy sends it to `/login/verify`, and
  `public.check_request()` refuses every Data API request from it until
  the session is aal2. A stolen password alone reaches nothing.
- **Rate limits**: `check_request()` caps writing requests at 300 a minute
  per account. Sign-in (8 per account and 30 per visitor in 15 minutes),
  sign-up, reset, handle checks and 2FA codes are limited in the app server
  (`lib/rate-limit.ts`), per instance: anonymous calls all reach Supabase
  from the app server's address, so a database IP limit would throttle
  everyone together.
- **Passwords**: 12+ characters with upper, lower and a digit; common
  passwords, digit-only, sequences, repeats and the email's own name are
  refused (`features/auth/password-strength.ts`). Supabase's leaked-password
  check needs a paid plan.
- **Free text**: control characters and bidi overrides are refused in
  every free-text column (`NOT VALID`, new writes only).
- **Headers**: geolocation allowed for the site itself (live map), HSTS
  with subdomains, COOP same-origin, no `X-Powered-By`.
- **Links**: `/auth/confirm` follows only an allow-listed `next`; on
  Vercel a copied `localhost` site URL is replaced by the production domain.

## Consequences

- A bug in `check_request()` would block the whole Data API; it is small,
  tested, and runs as security definer with a fixed search path.
  That risk happened once: PostgREST runs STABLE functions read-only even
  when called with POST, and the guard tried to log those calls, so every
  list failed in production. Fixed in
  `20261005100000_request_guard_read_only.sql`: only read-write
  transactions are counted. `request_guard.test.sql` and the E2E lifecycle
  test (every list page loads without an error) now cover it.
- The in-memory limits reset when an instance restarts and are per
  instance. Supabase Auth's own limits sit behind them.
- Recovery codes for a lost authenticator are not offered yet; support
  can remove the factor in the Supabase dashboard.
