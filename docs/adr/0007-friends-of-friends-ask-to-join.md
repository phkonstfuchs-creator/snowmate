# 0007 Friends of friends ask; the host lets them in

- **Status:** Accepted (2026-10-01)
- **Date:** 2026-09-27
- **Spec:** [ride-join-requests](../specs/ride-join-requests.md)

## Context

The July visibility decision says a friend of a friend receives the
meeting point only after the host accepts their participation. The first
implementation let them join directly.

## Decision

On friends rides, confirmed friends join directly; friends of friends
create a pending participation the host accepts or declines. Public events
keep the direct join (BACKEND_REQUESTS rule 1).

## Consequences

`ride_participants.status`, `respond_ride_request()`, a host view of
requests and a Today-tab badge. Hosts get one more thing to answer.
