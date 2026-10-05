# 0019 Live location only from 16

- **Status:** Accepted (owner, 2026-10-05: "alles machen was du machen würdest")
- **Date:** 2026-10-05
- **Amends:** [0015](0015-live-location-for-confirmed-friends.md)
- **Spec:** [live-location](../specs/live-location.md)
- **Checks:** `supabase/tests/database/live_locations.test.sql`,
  `features/location/LocationPanel.test.tsx`, `features/location/*.test.ts`

## Context

Pistl is open from 14, the age of digital consent in Austria
([ADR 0012](0012-age-from-birth-date.md)). Live location rests on the
user's consent. The operator sits in Germany, where a child's own consent
counts only from 16 (Art. 8 GDPR), and a live position of a 14- or
15-year-old is the most sensitive data the app could hold.

## Options

1. Keep sharing open from 14 and ask younger users to talk to their
   parents (the previous text in the privacy policy).
2. Collect parental consent for 14- and 15-year-olds.
3. No sharing under 16; seeing confirmed friends stays possible.

## Decision

Option 3. The database decides (`private.may_share_location`):
from the 16th birthday by the self-declared birth date; without a birth
date only an account the operator marked as adult. `share_my_location`
answers `too_young` and removes any stored position, `list_friend_locations`
never shows a position of someone under 16, and the migration removes
existing ones. The map shows a note instead of the share button
(`can_share_my_location`).

## Consequences

- 14- and 15-year-olds cannot be found on the map by their friends; they
  can still see friends who share.
- Accounts without a birth date that are not marked adult cannot share
  until a birth date is set.
- Parental consent (option 2) can replace this later if needed.
