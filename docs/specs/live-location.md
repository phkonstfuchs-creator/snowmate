# Live location

- **Status:** Agreed (owner asked for it on 2026-10-04); details Proposed
- **Related:** [ADR 0015](../adr/0015-live-location-for-confirmed-friends.md), [ADR 0019](../adr/0019-live-location-from-16.md), [ADR 0032](../adr/0032-crew-whereabouts-from-shared-positions.md) (amendment 2026-10-07, owner request), [SECURITY_AND_PRIVACY.md](../SECURITY_AND_PRIVACY.md#live-location)

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
- Amendment 2026-10-07: the map starts with "Your crew on the mountain".
  Each friend who shares gets a card with a guess of where they are (on
  a lift with minutes to the top, at a station, at a resort), the age of
  the position and an "estimate" label. The viewer's phone computes the
  guess from data it already has.
- Amendment 2026-10-07: in the store apps, a running share keeps sending
  with the phone locked and on every tab. It stops at the chosen end, on
  Stop or on sign-out, and resumes after an app restart while the end is
  still ahead. A denied or failed background permission is shown.

## Not included

- Background location outside a running share (or ski day), history,
  sharing with friends of friends or with a single chosen friend only.

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
6. Whereabouts: on a lift with minutes to the top, at a station, at a
   resort or away; old positions give no lift or station guess.
   `features/location/whereabouts.test.ts`, `CrewOnMap.test.tsx`
7. Background sharing runs only between Share and its end, Stop or
   sign-out, survives tab changes and restarts, and reports failures.
   `features/location/background-sharing.test.ts`,
   `useLiveLocation.native.test.ts`
