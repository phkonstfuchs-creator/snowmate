# Age from a birth date

- **Status:** Agreed (owner chose "birth date" and the minimum age of 14 on 2026-10-01)
- **Owner:** project owner
- **Related:** [SECURITY_AND_PRIVACY.md](../SECURITY_AND_PRIVACY.md#minors), [ADR 0012](../adr/0012-age-from-birth-date.md)

## Problem

`is_minor` defaulted to true for everyone with no way to change it, so
nobody could host a public event and the stricter minor rules applied to
adults too.

## Included

- On the Profile tab, a person enters their birth date once. Only they can
  see it; it is part of their data export.
- The database sets `is_minor` from it, using the Vienna day.
- Someone who turns 18 is switched on their next visit to the app.
- Under 14 is refused.

## Not included

- Proof of age (ID check) or parental consent. Someone can lie; the date
  is self-declared.
- Changing the date after saving. Corrections go through support (the
  operator edits the row in the Supabase dashboard).
- Asking for the birth date during onboarding.

## Constraints

- Identity from the session only; the column is not in the update grant.
- Without a birth date a person stays a minor.
- The operator can still set `is_minor` by hand.

## Acceptance criteria

1. An adult birth date clears `is_minor`; a 16-year-old's keeps it.
   `birth_date.test.sql`
2. The date can be set once; neither it nor `is_minor` can be written
   directly. `birth_date.test.sql`
3. Under 14 and future dates are refused and not stored. `birth_date.test.sql`
4. Nobody reads another person's birth date. `birth_date.test.sql`
5. After the 18th birthday, `refresh_my_age()` lifts the flag.
   `birth_date.test.sql`; the app calls it on every signed-in page
   (`features/profile/queries.test.ts`).
6. The Profile tab asks once and then shows the result.
   `features/profile/AgeSection.test.tsx`, `birth-date.test.ts`
