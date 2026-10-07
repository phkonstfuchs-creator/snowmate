# 0032 Crew whereabouts estimated from shared positions

- **Status:** Accepted (owner, 2026-10-07: estimate from data when a friend is at which lift, and show friends who share the map)
- **Date:** 2026-10-07
- **Builds on:** [ADR 0015](0015-live-location-for-confirmed-friends.md), [ADR 0029](0029-lift-meetup-estimates.md), [ADR 0031](0031-native-apps-with-capacitor.md)
- **Spec:** [live location](../specs/live-location.md) (amendment 2026-10-07)
- **Checks:** `features/location/whereabouts.test.ts`, `CrewOnMap.test.tsx`, `background-sharing.test.ts`, `useLiveLocation.native.test.ts`

## Context

Friends who share their location were hard to find. They showed as small
dots on a map centred on the region, and their position froze once their
phone was locked. To start the lift meetup (ADR 0029), a person has to
pick a lift by hand, and the result was not obvious to the people waiting.

## Decision

- The map starts with "Your crew on the mountain": every friend who
  shares, with a guess of where they are. The guess is one of: riding a
  lift with minutes to the top, at a valley or top station, at a resort,
  or away. It also shows how old the position is. A tap flies the map
  to that friend.
- The guess is computed on the viewer's phone from the position the
  friend already shares and the static OSM lift lines (`lib/lifts.ts`).
  A point within about 30 m of a lift line counts as riding it. The
  remaining time is the share of the line still ahead times the lift's
  duration, minus the age of the position. A position older than 15
  minutes gives no lift estimate.
- The UI marks the lift guess as an estimate. A rider skiing right under a
  lift can look like riding it.
- In the store apps, location sharing keeps sending while the phone is
  locked. It uses one native watcher at module level
  (`background-sharing.ts`), so leaving the Map tab does not stop it.
  While it runs, the page starts no browser watcher of its own. It stops
  at the chosen end, on Stop or on sign-out, resumes after a restart, and
  shows a denied or failed permission.
- A position older than 15 minutes gives no lift or station guess, only
  the resort.

## Consequences

- No new data, permissions or server endpoints. Who may see whom is
  unchanged (confirmed friends, from 16, blocks).
- Accuracy depends on how fresh and how accurate the friend's position is,
  and on the straight-line lift geometry.
- Background sharing uses more battery. It runs only for the duration the
  person chose (1, 4 or 12 hours) and shows the system location
  indicator.
