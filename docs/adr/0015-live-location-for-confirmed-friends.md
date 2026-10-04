# 0015 Live location for confirmed friends

- **Status:** Proposed
- **Date:** 2026-10-04
- **Spec:** [live-location](../specs/live-location.md)
- **Checks:** `supabase/tests/database/live_locations.test.sql`,
  `features/location/*.test.ts(x)`

## Context

The owner wants the map to show one's own live position and the
positions of friends. Snowmate is used by minors; a live position is the
most sensitive data the app can hold. SECURITY_AND_PRIVACY.md required a
schema, audience rules and negative tests before any live location.

## Options

1. Continuous background tracking with history.
2. Opt-in, time-limited sharing of the latest position with confirmed
   friends only.

## Decision

Option 2. Own position is shown locally and never stored unless sharing
is on. Sharing lasts 1, 4 or 12 hours and ends by itself or on Stop. Only
the latest position is stored, rounded to about 10 m, no history. Only
confirmed friends see it (not friends of friends, not strangers, never
across a block), for minors and adults alike. Clients cannot touch the
table; four security-definer functions are the only access.

## Consequences

- A browser cannot report the position in the background, so friends see
  the last position from while the app was open; the UI says so and
  shows how old each position is. Background updates would need the
  native app wrapper.
- Account deletion, unfriending and blocking end visibility at once.
