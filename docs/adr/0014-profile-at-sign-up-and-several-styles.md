# 0014 Profile at sign-up and several riding styles

- **Status:** Proposed
- **Date:** 2026-10-04
- **Spec:** [signup-with-profile](../specs/signup-with-profile.md)
- **Checks:** `supabase/tests/database/signup_profile.test.sql`,
  `features/auth/SignupFlow.test.tsx`, `features/auth/signup-profile.test.ts`

## Context

The owner wants all registration data entered while signing up, not
after the account exists, and several riding styles per person. Until
now onboarding answers waited in localStorage and were copied into the
profile after the first sign-in, which failed when the confirmation link
opened in another browser.

## Decision

- Sign-up sends name, handle, region, styles and birth date as Supabase
  user metadata. The profile trigger copies each value that passes the
  profile rules and skips what does not; privileged columns (`is_minor`,
  `account_type`, `onboarding_completed`) are never taken from metadata.
  The server action validates the same rules first and checks the handle
  (`handle_available`) so the person sees problems before the account is
  created.
- `profiles.riding_styles` (1–3 of chill/park/off-piste). `ability_level`
  stays as the first, primary style so rides, completion and older
  clients keep working; a trigger keeps the two in step.
- Birth date is required at sign-up (14+, see ADR 0012).

## Consequences

- `handle_available` lets anyone test whether a handle exists. Handles are
  the public way to add a friend, so this reveals nothing new; the app
  limits how often a visitor may ask.
- The old localStorage adoption stays for drafts from before this change.
