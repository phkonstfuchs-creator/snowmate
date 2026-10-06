# 0027 Leaderboards from season totals; region opt-in, minors anonymous

- **Status:** Accepted (owner chose friends and region boards, region opt-in, minors anonymous, 2026-10-05)
- **Date:** 2026-10-06
- **Spec:** [leaderboards](../specs/leaderboards.md)
- **Checks:** `supabase/tests/database/leaderboards.test.sql`, `features/gamification/*.test.ts(x)`
- **Builds on:** [ADR 0026](0026-ski-day-tracking.md), which keeps saved days owner-only. This ADR adds the first way others see anything derived from them.

## Context

Rankings need other people's numbers. Ski days were private, and many
users are minors. A regional board makes adults' names visible to
strangers in their region.

## Decision

- **One function.** `public.leaderboard(scope, metric)` is a security
  definer that returns ranked season totals: rank, name, handle, value,
  `is_me` and `anonymous`. It never returns single days or times.
- **Friends scope.**
  - It includes the caller, plus confirmed friends whose
    `leaderboard_friends` is true (the default) and who are not blocked
    either way.
  - Friends already see each other's names, so the default is on, and
    anyone can switch it off.
- **Region scope.**
  - It includes riders with `leaderboard_region` true (default off) in
    the caller's `city`, not blocked either way.
  - Minors are returned with null id, name and handle, except to
    themselves.
  - Opting in is a deliberate choice, and the settings text says who
    will see what.
- **Size.** Each board returns the top 20 plus the caller's own row.
- **Season.** The season starts on 1 September, Europe/Vienna time
  (`private.season_start()`).
- **Settings storage.** The two settings are profile columns with column
  update grants, like `avatar_visibility`. The app reads them separately
  and fails closed, so a deploy before the migration only hides the
  feature.
- **Stamps.** They are computed in the app from the owner's own days and
  rides. Nothing is stored, and nobody else sees them.

## Consequences

- Totals of a friend who keeps the default become visible to their
  friends. The privacy policy and the settings say so.
- An all-time board, boards per resort, or showing stamps to others
  would each need a new decision.
- Totals are only as honest as the plausibility limits (ADR 0026).
  Server-verified tracks would need more data on the server.
