# 0012 Age from a self-declared birth date

- **Status:** Accepted (2026-10-01)
- **Date:** 2026-10-01
- **Spec:** [age-from-birth-date](../specs/age-from-birth-date.md)
- **Checks:** `supabase/tests/database/birth_date.test.sql`

## Context

All minor rules hang on `profiles.is_minor`, which had no way to become
false. Adults could not host public events.

## Options

1. Self-declared birth date, set once.
2. Birth date plus parental consent by email under a threshold.
3. ID verification through a paid provider.
4. Keep everyone a minor.

## Decision

Option 1, chosen by the owner. `birth_date` is written only through
`set_my_birth_date()`, once. A trigger derives `is_minor` when the date
changes; `refresh_my_age()` lifts the flag after the 18th birthday and is
called on every signed-in page, so no scheduler is needed. Without a date,
or whenever a refresh has not happened yet, a person is treated as a
minor, which only ever restricts. Under 14 (the age of digital consent in
Austria) is refused.

## Consequences

- Someone can lie about their age. Options 2 or 3 can be added later on
  top of the same column.
- `refresh_my_age()` lifts `is_minor` whenever the stored date is 18+, so
  forcing an adult back to minor by hand also needs the birth date cleared.
- Existing accounts stay minors until they add a date.
