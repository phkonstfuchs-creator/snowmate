# 0029 Lift meetup estimates from static data and short-lived status

- **Status:** Proposed
- **Date:** 2026-10-06
- **Spec:** [lift meetup](../specs/lift-meetup.md)
- **Checks:** `supabase/tests/database/lift_meetups.test.sql`, `features/lift-meetup/*.test.ts(x)`

## Context

An announcement about taking a lift reveals where a rider is. Its arrival time also depends on lift travel and an unknown queue. A viewer may use their own location to choose a way to the meeting point.

## Options

1. Send both riders' coordinates to a routing service and use live queue data.
2. Store only a short-lived lift announcement, use attributed static lift data and a transparent queue heuristic, and calculate the viewer's suggestion locally.

## Decision

Use option 2. The database computes the arrival estimate from a trusted lift duration and a Vienna-time weekday/hour/weekend queue heuristic; the caller cannot supply an ETA. It stores the announcing rider, lift identifier, start, estimated arrival and expiry times. Security-definer functions with a fixed empty search path enforce the same age, friendship and two-way block rules as live location. The viewer's own position stays on their device. Lift stations and travel durations come from OpenStreetMap; where a duration is absent, a length and typical speed yield a visibly derived estimate. Queue time is a heuristic, not measured occupancy. A status ends on Stop or after 30 minutes.

## Consequences

- The estimate may be inaccurate, especially when a lift is closed or the queue changes. The UI labels it as an estimate.
- Reference lifts must be refreshed deliberately when OSM changes; no person's location is sent to OSM or a routing provider.
- Block and friendship changes take effect on the next read without waiting for expiry.
- A generic Web Push notice is queued for subscribed confirmed friends on start or replacement. It carries only the event kind, sender name, and map URL. Stop withdraws pending notices; dispatch checks the current status, age, friendship, block, and expiry again before sending.
- The map offers direct lift selection and a fixture-only demo, so the estimate can be tried without granting location access or creating an account.
