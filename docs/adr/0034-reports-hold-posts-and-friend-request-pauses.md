# 0034 Terms of use, held posts and pauses after declined requests

- **Status:** Proposed. The owner made the decisions on 2026-10-07; the
  wording of the terms awaits the owner's legal review.
- **Date:** 2026-10-07
- **Builds on:** [0006](0006-friend-requests-by-handle.md) (its open question
  on requests to minors), [0010](0010-blocking-hides-both-ways.md),
  [0012](0012-age-from-birth-date.md), [0031](0031-native-apps-with-capacitor.md)
- **Spec:** [report-and-block.md](../specs/report-and-block.md), team review
  in [docs/qa/TEAM_REVIEW.md](../qa/TEAM_REVIEW.md)
- **Checks:** `supabase/tests/database/review_safety.test.sql` (pgTAP, 36
  checks), `features/safety/*.test.*`, `features/chat/ChatThread.test.tsx`,
  `features/rides/FeedScreen.test.tsx`, `features/legal/LegalLinks.test.tsx`,
  `features/auth/actions.test.ts`, `features/crew/actions.test.ts`

## Context

The team review of 2026-10-07 found several gaps:

- App Store guideline 1.2 needs terms of use with zero tolerance that
  people accept. Pistl had none.
- Photos are not screened before friends see them.
- Group and ride chats had no way to report or block anyone.
- An adult could re-send friend requests to the same person, a minor
  included, without limit: a decline simply deleted the request.
- The sign-up promised parental consent for under-18s. Nothing backed
  that promise, and ADR 0012 had rejected a consent step.

The owner's direction: young people should be able to use the whole app
wherever the law and the App Store allow it. Safety is added where it is
needed, not as a general restriction.

## Options considered

1. **Age gate.** Block requests from adults to minors, and block minors
   from public events. Rejected by the owner: it cuts minors off from the
   crew-finding the app exists for.
2. **External image moderation.** Rejected by the owner: cost, and photos
   would go to a third party.
3. **Make reports and declines work harder** (chosen): a report hides the
   post and every chat participant can be reported; repeated declines
   pause the asker; terms with zero tolerance are accepted at sign-up.

## Decision

### Friend requests

- Only the addressee turning down a pending request counts as a decline.
  A withdrawal by the asker does not.
- After two declines from the same person, the asker waits before the
  next request: 7 days, then 14, then 28.
- After five declines the asker can no longer ask that person.
- The other direction is unaffected.
- `private.friend_request_declines` holds the counter. Only the database
  reads it; it goes with either account.

### Held posts

- A post someone reports is hidden for that person at once.
- It is hidden for everyone once two different people have reported it.
  It stays hidden while those reports are open. The operator brings it
  back by setting the reports to `reviewed`.
- The author keeps seeing the post.
- One report alone cannot take down someone else's post, so reporting is
  hard to use for bullying.
- `reports.post_id` records the post; `report_user` takes an optional
  `post`.

### Reporting in every chat

- In group and ride chats, everyone who writes can be reported or blocked
  from their name above the message.
- In a ride sheet, every rider can be reported, not only the host. The
  viewer's own row has no report button.

### Terms of use

- New page `/nutzungsbedingungen` in German and English, with zero
  tolerance for objectionable content and the 24-hour review promise.
- Sign-up needs a ticked box that links the terms and the privacy policy.
  The server checks the box again.
- The accepted version (`features/legal/terms.ts`) is stored in the
  account's sign-up metadata.
- Accounts created before this have accepted no terms. A future change
  of the terms must ask everyone again.

### Parental consent

- The sentence "Under 18? You need your parents' consent" is removed,
  because no mechanism stood behind it (ADR 0012).
- The minimum age stays at 14.
- **Open:** whether the operator in Germany may rely on the Austrian
  digital age of consent of 14. This needs the owner's legal review.

### Kept as accepted risks

- **Minors on adults' public events:** a minor may join an adult's
  public event and its ride chat. Everyone there can now be reported and
  blocked.
- **Handle check during sign-up:** stays open to signed-out visitors, so
  a handle's existence can be probed. The owner chose the easier sign-up
  over this risk.
- **Friends leaderboard:** stays on by default for minors. The copy now
  says friends see the season totals.

### Smaller fixes in the same migration

- The word filter removes invisible format characters and joins spaced
  single letters before it matches.
- `private.push_outbox` has RLS enabled.
- On the regional leaderboard, equal totals are no longer sorted by the
  names of hidden minors.

## Consequences

- The operator must check open reports daily. A held post stays hidden
  until someone reviews it, which keeps the 24-hour promise honest only
  if that check happens (owner action in `docs/APP_STORE.md`).
- Two friends acting together can hide a post until review. That is
  accepted: the author still sees it, and the reports are on record.
- The privacy policy lists the new data: the accepted terms version, the
  decline counter, and held posts.
- Avatars are not held on report. A block hides a picture both ways,
  and avatars of minors are friends-only.
