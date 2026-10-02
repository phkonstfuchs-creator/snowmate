# Joining a friends ride as a friend of a friend

- **Status:** Implemented, awaiting acceptance
- **Owner:** project owner
- **Related:** [ADR 0007](../adr/0007-friends-of-friends-ask-to-join.md), [STRUCTURAL_AUDIT.md visibility decision](../STRUCTURAL_AUDIT.md#visibility-decision)

## Problem

A friend of a friend could join a friends ride directly and so received
the exact meeting point without the host ever agreeing. The recorded
visibility decision says the meeting point reaches a friend of a friend
only after the host accepts their participation.

## Included

- On a friends ride, a confirmed friend of the host still joins directly.
- A friend of a friend sends a request instead; the button shows "Asked".
- The host sees open requests on the ride and lets people in or declines.
- The Today tab shows how many requests wait for the host.
- The asker can withdraw a pending request.

## Not included

- Public events: joining stays direct (BACKEND_REQUESTS rule 1).
- Notifications outside the app.
- Minors' rides: friends of friends do not see them at all, so they cannot ask.

## Constraints

- Enforced in the database; the client only shows the state.
- A pending request takes no spot and unlocks neither the meeting point
  nor the participant list.
- Accepting checks capacity under the ride's row lock.

## Acceptance criteria

1. A confirmed friend who taps Join is in and sees the meeting point.
2. A friend of a friend who taps Join is not in, sees "Asked", no meeting
   point, and the spot count does not change.
3. Only the host sees who is asking.
4. The host can let a requester in; the requester then sees the meeting point.
5. Letting someone in beyond the spots is refused.
6. The host can decline; the requester can withdraw.
7. The Today tab badge counts open requests on the host's upcoming rides.

## Evidence

| Criterion | Shown by |
|---|---|
| 1, 2 | `supabase/tests/database/ride_requests.test.sql`: "a confirmed friend joins straight away", "a pending request neither unlocks …" |
| 3 | same file: "participants do not see who is asking", "the host sees both requests" |
| 4, 5 | same file: "the host lets a friend of a friend in", "accepting beyond the spots is refused", "once accepted, the meeting point unlocks" |
| 6 | `features/rides/FeedScreen.test.tsx`: "lets the host answer requests", "withdraws a pending request" |
| 7 | `ride_requests.test.sql`: "the host's badge counts open ride requests"; `components/BottomNav.test.tsx` |
