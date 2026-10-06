# 0006 Friend requests by exact handle, capped

- **Status:** Accepted (2026-10-01); amended by [ADR 0028](0028-swipe-discovery.md): opt-in swipe discovery for adults in their region and, under 18, among friends of friends. Search over real accounts stays excluded.
- **Date:** 2026-09-25

## Context

The product is built on the friend graph and must avoid open stranger
discovery for minors. The prototype's people search runs on fixtures.

## Options

1. Search over real accounts.
2. Exact handle only, no search.
3. Invite links.

## Decision

Option 2 now, with a cap of twenty unanswered outgoing requests against
probing and spam. Signed-in `/people` redirects to `/crew`.

## Consequences

Adding friends needs the handle from outside the app. Open question for
the owner: should requests to minors be restricted further (for example
only from friends of friends)? Invite links (option 3) are a candidate
follow-up.
