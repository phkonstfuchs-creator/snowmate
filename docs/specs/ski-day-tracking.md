# Ski-day tracking

Follow-up owner direction, 2026-10-09: add a map mode for today's recorded route with own-avatar replay. The [mountain rebuild plan](mountain-rebuild-plan.md#kartenmodus-mein-tag) proposes timestamped private local retention after finishing; deletion-on-finish below remains the current implementation. No cloud track archive is introduced by this planning update.

- **Status:** Agreed (owner, 2026-10-05: "seine fahrten tracken können", Etappe C confirmed 2026-10-06)
- **Owner:** Philipp
- **Related:** [ADR 0026](../adr/0026-ski-day-tracking.md)

## Problem

Riders want to know what they did on a day: how far, how much vertical,
how fast and how many runs, and to look back over the season.

## Included

- **Start and finish on the map.** While a day runs:
  - the numbers update live and the track is drawn on the map
  - a small bar on the other tabs leads back to the map
- **Summary after finishing.** Time, km, vertical, top speed, runs, and
  the resort detected from the track. Then save it and optionally share
  it as a ski-day post with friends.
- **Profile:** season totals and the list of days, each deletable.

## Not included

- Recording with the screen off or the app closed. Browsers stop GPS
  there; that needs a native app.
- Showing days to friends, rankings and badges (Etappe D), importing GPX.

## Constraints

- **The GPS track never leaves the phone.** It stays in memory and in
  this browser's storage while recording, and is deleted on finish. Only
  the summary is stored.
- **Visibility:** only the owner sees saved days. Season totals can
  appear on leaderboards ([leaderboards](leaderboards.md)). This is the
  same for minors and adults.
- **Plausibility:** values no skier reaches are refused (over 150 km/h,
  250 km, 25,000 m vertical, 16 h, or a start more than 36 h ago), so
  later rankings are not trivially gamed. At most 5 days per 24 h.

## Acceptance criteria

1. Lift rides add no distance and no top speed. Runs and vertical come
   from descents of at least 50 m. Bad fixes and impossible jumps are
   ignored, and gaps (screen off) add no distance.
2. A running day survives switching tabs and reloading the page.
3. Only the summary reaches the server. The local track is deleted on
   finish.
4. Implausible summaries are refused by the app and by the database.
   Saving the same day twice stores it once.
5. Only the owner can read or delete their days. The export lists them.
6. An unsaved day is not thrown away without asking.

## Evidence

| Criterion | Shown by |
|---|---|
| 1 | `features/tracking/tracker.test.ts` |
| 2, 3, 6 | `features/tracking/TrackPanel.test.tsx` |
| 4 | `features/tracking/ski-day.test.ts`, `features/tracking/actions.test.ts`, `supabase/tests/database/ski_day_tracking.test.sql` |
| 5 | `supabase/tests/database/ski_day_tracking.test.sql` |
