# Report and block

- **Status:** Agreed (owner asked for it on 2026-10-01)
- **Owner:** project owner
- **Related:** [SECURITY_AND_PRIVACY.md](../SECURITY_AND_PRIVACY.md), [ADR 0010](../adr/0010-blocking-hides-both-ways.md)

## Problem

Snowmate brings young people, some under 18, together with people they
have not met. Without a way to block someone and to tell the operator
about them, a single bad actor stays in a person's feed and requests.

## Included

- From a ride, a carpool, a friend row or a request, "Report or block"
  opens a sheet for that person.
- **Block**: ends any friendship and open request between the two, removes
  each from the other's rides and carpools, and from then on neither sees
  the other's rides or carpools, and neither can send the other a request,
  invite or join.
- **Report**: a reason (unsafe behaviour, harassment, spam, fake profile,
  other) and optional details go to the operator. Reporting can block in
  the same step.
- Profile lists blocked people and lets you unblock.

## Not included

- An in-app moderation console; reports are reviewed in the Supabase
  dashboard for now.
- Telling the blocked person.

## Constraints

- Enforced in the database, in both directions.
- Reports are write-only for clients; nobody can read them through the API.
- At most 10 reports per person per day.

## Acceptance criteria

1. After A blocks B, B does not see A's rides or carpools and A does not
   see B's.
2. After a block, friendship, requests and participation between them are gone.
3. Neither can send the other a friend request, use the other's invite,
   join the other's ride or ask for a seat.
4. A report is stored with reporter, target and reason; no client can read
   reports.
5. Unblocking restores visibility but not the old friendship.
6. An eleventh report in a day is refused.

## Evidence

| Criterion | Shown by |
|---|---|
| 1 to 6 | `supabase/tests/database/report_block.test.sql` |
| UI | `features/safety/ReportBlockSheet.test.tsx` |
