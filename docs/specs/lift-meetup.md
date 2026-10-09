# Lift meetup estimate

- **Status:** Agreed (scope supplied by the owner, 2026-10-06)
- **Owner:** Pistl product owner
- **Related:** [ADR 0029](../adr/0029-lift-meetup-estimates.md), [ADR 0015](../adr/0015-live-location-for-confirmed-friends.md), [ADR 0019](../adr/0019-live-location-from-16.md)

## Problem

Friends on the same mountain need a quick way to meet without exchanging repeated location messages.

## Included

- A rider can announce that they are taking a named lift now, then stop the announcement.
- Confirmed friends see an estimated arrival time and destination mountain station until the status expires after 30 minutes.
- When a viewer's own position is available on their device, the device suggests a lift and estimates their arrival at the meeting station with a short route hint.
- Estimates use static OpenStreetMap lift data and a clearly labeled waiting-time heuristic.
- The map shows a direct lift-start control before the map. A local demo at `/demo/map` simulates Lena and a sample viewer position without an account, GPS, push, or persistence.
- Amendment 2026-10-07 (owner: "sehr wichtiges Feature", one tap, the
  rider sees their own forecast):
  - "Ich fahr jetzt Lift" is the big primary button on the map.
  - A fresh position (on the device, taken after the sheet opens) picks
    the lift: the valley station the rider stands at, or the nearest one
    within 400 m. Lift lines are not matched, because a meetup starts
    before boarding and lines converge at top stations. The rider
    confirms with one tap. Picking from lists stays
    one tap away and is the only path without a position. Without a
    position nothing can be started until a lift is visible.
  - Before and after starting, the rider sees "You'll be at the top,
    {station}, around {time}". It is the same estimate their crew gets.
    Checks: `features/lift-meetup/detect.test.ts`,
    `LiftStartSheet.test.tsx`.
- With push enabled, current confirmed friends receive a generic lift-meetup notice. The notice contains no lift, station, coordinates, or ETA.

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
6. Today offers a prominent Lift meetup entry directly below its header. For eligible live users it opens the existing map lift picker using a consumed `action=lift` query; opening never starts a meetup or location sharing. The map offers a direct lift picker and a discoverable demo. Starting or replacing a status queues push only for subscribed confirmed unblocked friends. Stopping removes pending notices, and dispatch checks visibility again.

## Evidence

| Criterion | Shown by |
|---|---|
| 1–2, 5 | `supabase/tests/database/lift_meetups.test.sql` |
| 3–4 | `features/lift-meetup/*.test.ts(x)` and manual map check |
| 3 | `lib/i18n/i18n.test.ts` |
| 6 | `tests/e2e/coordination-entry.spec.ts`, `features/resorts/map-entry.test.ts`, `features/resorts/MapScreen.test.tsx`, `features/demo/DemoLiftMeetupTryout.test.tsx`, `supabase/tests/database/lift_meetup_push.test.sql` |
