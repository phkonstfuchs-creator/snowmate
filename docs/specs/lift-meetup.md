# Lift meetup estimate

- **Status:** Agreed (scope supplied by the owner, 2026-10-06)
- **Owner:** Pistl product owner
- **Related:** [ADR 0028](../adr/0028-lift-meetup-estimates.md), [ADR 0015](../adr/0015-live-location-for-confirmed-friends.md), [ADR 0019](../adr/0019-live-location-from-16.md)

## Problem

Friends on the same mountain need a quick way to meet without exchanging repeated location messages.

## Included

- A rider can announce that they are taking a named lift now, then stop the announcement.
- Confirmed friends see an estimated arrival time and destination mountain station until the status expires after 30 minutes.
- When a viewer's own position is available on their device, the device suggests a lift and estimates their arrival at the meeting station with a short route hint.
- Estimates use static OpenStreetMap lift data and a clearly labeled waiting-time heuristic.

## Not included

- Live queue measurements, precise navigation, guaranteed arrival times, background location collection, or sharing the viewer's position with the server.
- Visibility to strangers, friends of friends, blocked accounts, or sharing by anyone under 16.

## Constraints

- The status reveals location and follows the same audience and age rules as live location. Database tables have forced RLS and no direct client grants; session-bound security-definer functions control access.
- Lift reference data must identify its OpenStreetMap source. Missing durations may be derived from mapped length and documented typical lift speed, clearly marked as estimates.
- No external AI or third-party location service receives a person's location.
- Copy exists in German and English and uses the app's design tokens.

## Acceptance criteria

1. A user aged at least 16 can start and stop one status for a known lift; invalid lift identifiers and younger users are rejected.
2. Only the rider and confirmed, unblocked friends can read an active status. Blocking, unfriending, stopping, and expiry remove visibility.
3. Friends see the station and an estimated arrival labeled as a *Schätzung* / *estimate*.
4. The viewer's lift suggestion is calculated on the device from their own position; that position is never sent to the lift-status server action.
5. The export includes the rider's stored lift status; the privacy and licence pages describe the feature and OSM attribution.

## Evidence

| Criterion | Shown by |
|---|---|
| 1–2, 5 | `supabase/tests/database/lift_meetups.test.sql` |
| 3–4 | `features/lift-meetup/*.test.ts(x)` and manual map check |
| 3 | `lib/i18n/i18n.test.ts` |
