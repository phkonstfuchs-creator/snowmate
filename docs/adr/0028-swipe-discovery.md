# 0028 Swipe discovery: opt-in, age bands, minors only among friends of friends

- **Status:** Accepted (owner, 2026-10-06: swipe "nach Alter getrennt"; under 18 "Freunde von Freunden"; a match makes friends)
- **Date:** 2026-10-06
- **Spec:** [discovery-swipe](../specs/discovery-swipe.md)
- **Checks:** `supabase/tests/database/discovery_swipe.test.sql`, `features/discovery/*.test.ts(x)`
- **Amends:** [ADR 0006](0006-friend-requests-by-handle.md). Handle-only requests and "no search over real accounts" stay. This ADR adds a narrow, opt-in way to meet people.

## Context

The owner wants a Tinder-like way to meet new riders. `PRODUCT.md` and
ADR 0006 rule out open stranger discovery for minors. Ages are
self-declared, so an adult can pose as a teenager.

## Options

1. **Open regional swiping for everyone, separated by age.** An adult
   who lies about their age reaches minors directly.
2. **Adults only.** Minors get nothing.
3. **Adults open in their region; under 18 only friends of friends.**
   Minors only meet people with whom they share a confirmed friend.

## Decision

Option 3, chosen by the owner.

- **Opt-in:** `profiles.discoverable` is off by default. Only people who
  switched it on can see a deck or appear in one. It needs a birth date
  and a finished profile.
- **Age bands:** 14–15, 16–17 and adult, from the birth date
  (`private.age_band`). People never see anyone outside their own band.
- **Under 18:** only friends of friends (`private.are_friends_of_friends`)
  in the same region and band.
- **Adults:** opted-in adults of their region.
- **Excluded from every deck:**
  - blocks in either direction
  - existing friendships or requests
  - people liked before
  - people passed in the last 30 days
- **Rules in one place:** `private.can_discover` holds the rules. Both
  `discovery_deck()` and `swipe()` check it, so a client cannot swipe
  outside its deck.
- **Matching:** likes are never shown. A mutual like inserts an accepted
  friendship, so the push "is now in your crew" and chat follow from the
  existing rules.
- **Limits:** at most 100 swipes a day.
- **Card contents:** name, picture (under the existing avatar rules),
  riding styles, bio and the number of mutual friends. There is no
  handle, age or exact data.

## Consequences

- An adult who claims to be 16 still only reaches teenagers who share a
  friend with them, a much smaller and socially checked circle. Reports
  and blocks work on every card.
- **Data rights:** swipes are personal data. They are in the export and
  cascade on account deletion.
- **Not covered:** anything wider for minors, such as region or events,
  would need a new decision.
