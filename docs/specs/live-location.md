# Live location

- **Status:** Agreed (owner asked for it on 2026-10-04); details Proposed
- **Related:** [ADR 0015](../adr/0015-live-location-for-confirmed-friends.md), [ADR 0019](../adr/0019-live-location-from-16.md), [SECURITY_AND_PRIVACY.md](../SECURITY_AND_PRIVACY.md#live-location)

## Problem

On the mountain, crews lose each other. The map only showed resorts.

## Included

- Map tab: a real map with my own position (blue dot with accuracy) after
  I tap "show my location".
- "Share" starts sharing for 1, 4 or 12 hours after an explanation of
  who sees it and for how long; "Stop" ends it at once.
- Friends who share appear on the map with their initials and name, and
  in a list with the age of their position; tapping one centres the map.

- Sharing starts at 16. Younger users see a note instead of the share
  button and still see their friends' positions.

## Not included

- Background tracking, history, sharing with friends of friends or with
  a single chosen friend only.

## Acceptance criteria

1. Nothing is stored before sharing starts. `useLiveLocation.test.ts`
2. Only confirmed friends see a position; friends of friends, pending
   requests, strangers and blocked people do not. `live_locations.test.sql`
3. Positions are rounded, expire, and stop on request. `live_locations.test.sql`
4. Invalid positions and durations are refused before and in the
   database. `features/location/actions.test.ts`, `live_locations.test.sql`
5. Nobody under 16 can share or be shown; without a birth date only an
   account marked adult can. `live_locations.test.sql`,
   `features/location/LocationPanel.test.tsx`
