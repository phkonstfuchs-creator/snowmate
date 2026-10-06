# Swipe to meet riders

- **Status:** Agreed (owner, 2026-10-05/06: swipe like Tinder, separated by age; under 18 friends of friends; a match makes friends)
- **Owner:** Philipp
- **Related:** [ADR 0028](../adr/0028-swipe-discovery.md)

## Problem

New riders only meet people they already know or whose handle they
have. There is no way to find someone to ride with.

## Included

- **"Meet riders"**, reached from the crew screen at `/people`:
  - one card at a time, showing name, picture, riding styles, bio and
    mutual friends
  - swipe right or tap ♥ to ride together, swipe left or tap ✕ to skip
  - report or block from the card
- **"Take part in swiping"** switch, off by default.
- **A match:** you are friends at once, with "Write a message" or keep
  swiping.

## Not included

- Search, filters, seeing who liked you, super likes, region or event
  discovery for minors.

## Constraints

- **Visibility:** only people who opted in see a deck or appear in one.
  It needs a birth date.
- **Age bands:** 14–15, 16–17 and adults never see each other.
- **Under 18:** friends of friends only. **Adults:** their region.
- **Hidden from the deck:** blocked people, friends and open requests.
  Skipped people come back after 30 days at the earliest.
- **Limits:** 100 swipes a day.

## Acceptance criteria

1. The adult deck holds only opted-in adults of the same region, without
   blocked people, friends or teens.
2. The teen deck holds only friends of friends in the same band. A teen
   cannot like strangers, another band or adults, and adults cannot like
   teens.
3. A mutual like makes a friendship. Likes are otherwise invisible.
4. Liked people leave the deck. Passed people return after 30 days.
5. Opting out removes you from decks at once. Without opting in, there
   is no deck and nobody can like you.
6. Swipes are in the export.

## Evidence

| Criterion | Shown by |
|---|---|
| 1–6 | `supabase/tests/database/discovery_swipe.test.sql` |
| UI and actions | `features/discovery/DiscoverScreen.test.tsx`, `features/discovery/actions.test.ts`, `features/discovery/discovery.test.ts` |
