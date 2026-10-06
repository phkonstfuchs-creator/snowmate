# Leaderboards and stamps

- **Status:** Agreed (owner, 2026-10-05: leaderboard "beides", friends and region; region opt-in, minors anonymous; Etappe D confirmed 2026-10-06)
- **Owner:** Philipp
- **Related:** [ADR 0027](../adr/0027-leaderboards-and-stamps.md), builds on [ski-day tracking](ski-day-tracking.md)

## Problem

Tracked days give numbers, but no reason to come back and nothing to
compare with the crew.

## Included

- **Season leaderboard** in the profile, for the season from 1 September:
  - by vertical, kilometres, days or top speed
  - among friends, or for the region
  - the top five and your own place, the rest one tap away
- **Stamps:** 12 badges earned from your own days and rides, such as
  first day, 10,000 m, 80 km/h, three resorts or host of three rides.
  Tap a stamp to see what it takes.
- **Two settings:**
  - "Friends see my season", on by default
  - "Join the regional leaderboard", off by default

## Not included

- XP or levels, streaks, all-time boards, boards per resort, rewards, and
  showing stamps to others.

## Constraints

- **Friends board:** you, plus confirmed friends who did not switch it
  off. A block hides both ways.
- **Region board:** only people who opted in, in the caller's region.
  Under 18 they always appear anonymously, with no name, handle,
  picture or id. A block hides both ways.
- **Data:** only season totals leave the database, never single days
  or times. Clients still never read `ski_days`.
- **Fairness:** the plausibility limits of ski-day tracking keep obvious
  cheating out.

## Acceptance criteria

1. The friends board shows me and friends who show themselves, with
   this season's totals only.
2. The region board shows only opted-in riders of my region, without
   blocked people. Minors appear without anything identifying, except
   to themselves.
3. Someone who did not opt in can see the region board but is not on
   it. Leaving it takes effect at once.
4. Unknown scopes or metrics return nothing.
5. Stamps follow from the rules above. Settings change only the
   caller's own two columns.

## Evidence

| Criterion | Shown by |
|---|---|
| 1–4 | `supabase/tests/database/leaderboards.test.sql` |
| 2 (UI) | `features/gamification/leaderboard.test.ts`, `features/gamification/Leaderboard.test.tsx` |
| 5 | `features/gamification/badges.test.ts`, `features/gamification/actions.test.ts`, `features/gamification/LeaderboardSettings.test.tsx` |
