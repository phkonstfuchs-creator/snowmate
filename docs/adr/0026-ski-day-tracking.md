# 0026 Ski-day tracking: on-device track, server keeps only the summary

- **Status:** Accepted (owner asked for tracking, Etappe C, 2026-10-06)
- **Date:** 2026-10-06
- **Spec:** [ski-day-tracking](../specs/ski-day-tracking.md)
- **Checks:** `features/tracking/*.test.ts(x)`, `supabase/tests/database/ski_day_tracking.test.sql`

## Context

A GPS track of a ski day shows where someone was, minute by minute. Many
users are minors. Pistl is a web app, and browsers stop GPS when the
screen is off.

## Options

1. **Upload the full track:** richer replays and maps, but it stores
   detailed movement data of minors and adults on the server.
2. **Keep the track on the device and store only a summary:** less to
   show later, but no movement history on the server.

## Decision

Option 2.

- **Summary maths.** `features/tracking/tracker.ts` is a pure function
  over GPS fixes:
  - It drops inaccurate fixes (over 35 m) and jumps over 150 km/h.
  - A gap over 2 min adds no distance.
  - A segment climbing faster than 0.5 m/s is a lift and adds neither
    distance nor speed.
  - Runs use altitude hysteresis: a 30 m drop starts a run, a 30 m climb
    ends it, and a run counts at 50 m or more.
- **Running day.** It lives in a provider in the `(app)` layout, so it
  survives tab switches. It is mirrored to `localStorage` every 15 s, so
  it survives reloads, and that copy is deleted on finish. The screen is
  kept on with the Wake Lock API where available.
- **Server.**
  - The table is `ski_days`, with forced RLS and no table grants.
  - The functions are `save_ski_day`, `list_my_ski_days` and
    `delete_my_ski_day`.
  - Plausibility limits are checked in the app and in the database. A
    repeated save of the same start time is ignored. At most 5 days are
    saved per 24 h.
  - Days are visible to the owner only.
- **Resort.** The nearest one within 15 km of the track's middle,
  chosen on the device. The server accepts only known resort names.

## Consequences

- **Screen off:** nothing is recorded while the screen is off. The UI
  says so, and true background tracking would need a native app.
- **No replay:** there is no route replay or heatmap later. Rankings and
  badges (Etappe D) can use the summaries. Who sees them will be a new
  decision.
- **Data rights:** the export lists the days, and account deletion
  cascades.
