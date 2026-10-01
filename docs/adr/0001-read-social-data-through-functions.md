# 0001 Read social data through security-definer functions

- **Status:** Accepted (2026-10-01)
- **Date:** 2026-09-25

## Context

Rides carry the exact meeting point, and some hosts are minors.
BACKEND_REQUESTS item 3 asked that the meeting point never leave the
database for someone who may not see it, and suggested two views
(`rides_public` without the field, `rides_joined` with it).

## Options

1. **Two views**, as suggested. Safe for the field, but the audience rule
   (friends, friends of friends, minors, public) would still need RLS on
   the base table plus joins in every view, and the client would merge two
   result sets.
2. **RLS on the tables, clients select directly.** Row visibility works,
   but RLS cannot hide a single column per row; the meeting point would be
   in the response for everyone who sees the row.
3. **Security-definer functions** (`list_rides()`, `list_carpools()`, …)
   with table grants revoked, returning the field as null when locked.

## Decision

Option 3. Clients have no select grant on `rides`, `ride_participants`,
`friendships`, `carpools`, `carpool_requests`. Each function applies the
audience per row and nulls what the caller may not see.

## Consequences

- One read path per feature, easy to test negatively in pgTAP.
- Functions run with owner rights, so every one sets `search_path = ''`,
  checks `auth.uid()`, and has explicit grants.
- Adding a column means changing the function's return type.
