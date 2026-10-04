# Sign-up with the full profile

- **Status:** Agreed (owner asked for it on 2026-10-04)
- **Related:** [ADR 0014](../adr/0014-profile-at-sign-up-and-several-styles.md)

## Included

- Onboarding asks region, one to three riding styles, name, handle (with a
  live availability check), birth date, then email and password, and
  creates the account with all of it at once.
- Profile editing allows several riding styles.
- The email is confirmed with a code typed into the app
  (`/signup/verify`, owner asked for it on 2026-10-05); the link in the
  same email still works. The address waits in an httpOnly cookie for an
  hour, never in the URL. A new address and one that already has an
  account see the same screen.

## Acceptance criteria

1. After confirming the email, the profile is complete without another
   step. `signup_profile.test.sql`, `tests/e2e/auth-lifecycle.spec.ts`
2. A taken handle, an under-14 birth date or a missing style is reported
   before the account is created. `features/auth/actions.test.ts`
3. Metadata can never set `is_minor`, `account_type` or
   `onboarding_completed`. `signup_profile.test.sql`, `account_profiles.test.sql`
4. The code signs the person in; a wrong code says so without more; eight
   wrong codes per address in 15 minutes stop further tries.
   `features/auth/actions.test.ts`, `tests/e2e/auth-lifecycle.spec.ts`
