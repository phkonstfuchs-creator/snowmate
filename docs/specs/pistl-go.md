# Pistl Go: private wishes on existing rides

- **Status:** Approved for implementation and production release by the owner in this chat (2026-10-09: merge, then release).
- **Owner:** Product owner
- **Related:** [ADR 0040](../adr/0040-private-go-wishes-on-existing-rides.md), superseding the scope proposed in ADR 0038.

- **Follow-up direction, 2026-10-09:** Keep the visible name Pistl Go and add useful day planning without an existing ride. The [mountain rebuild plan](mountain-rebuild-plan.md) proposes this extension; this document preserves the currently implemented private-wish contract.

## Problem

A person wants to join an existing visible ride only when enough people are confirmed and, optionally, their own carpool seat is confirmed. A wish must never be represented as a booking or reserve capacity.

## Included

The person saves a private wish on an existing ride, specifying a minimum group of 2–12 including themselves and an optional confirmed carpool requirement. Only the owner reads the wish. The existing ride, friendship, minor, block, session and capacity rules still apply. The group predicate includes the prospective participant; displayed counts list the host and actually accepted participants. A driver-authored offer only counts for its driver, and a rider's seat only counts once accepted on an uncancelled same-resort, same-Vienna-day carpool departing no later than the ride.

The Today feed always shows a prominent Pistl Go entry below its header, including when no wish exists. It opens a chooser of visible future rides with room; selecting one opens the existing detail with the wish form before the hero. An empty chooser offers posting a ride, finding a crew and browsing events. Unavailable data offers retry and does not present candidates. Demo mode explains the feature without saving a wish.

The feed shows the owner's upcoming plans, prioritizing confirmed participation with changed conditions, ready wishes, waiting wishes, requests and other confirmed participation. Opening a plan opens the existing ride detail sheet. Read errors visibly block new joining until retried; leaving and withdrawing existing participation remains available. The standard join action is always manual and the database checks conditions again on the new pending/accepted participation. It also checks again when the host accepts a request. A later condition loss warns the confirmed participant without automatically removing them.

## Not included

Forecast or weather predicates, new rides created from wishes, automatic joins, public wishes, extra notifications, wider audiences, booking, payment or changes to native tracking.

## Constraints

Identity comes from the current server/database session, never client actor ids. Reads and commands use security-definer RPCs, no direct client table reads. New private preferences belong in export and cascade on account deletion. Withdrawal cancels the owner's pending ride request without cancelling confirmed participation. Inactive wishes no longer gate normal joining. Existing Vue-independent React live/demo screens, English/German dictionaries, native shells and all current product features remain intact.

Inactive, cancelled or past rides have no actionable plan. Inactive wishes are removed after a 24-hour post-ride threshold by the next daily cleanup batch; reads and writes also clean eligible rows. No forecast quality or tracking accuracy claim is made.

## Acceptance criteria and evidence

1. Saving is private and reserves no place: `features/go/GoInterest.test.tsx`, `supabase/tests/database/ride_go.test.sql`.
2. Missing group or confirmed seat blocks new joining, including fresh server-side checks: database tests and `features/rides/actions.test.ts`.
3. The owner explicitly joins or withdraws; withdrawn wishes unlock normal joining: component tests and `tests/e2e/pistl-go.spec.ts`.
4. The own overview preserves real status and privacy without fixtures: `features/go/go-status.test.ts`, `queries.test.ts`, `GoOverview.test.tsx`.
5. Later condition loss warns while preserving membership: component/database/browser tests.
6. Existing demo, posts, chats, native tracking and translations retain their checks. Required lint, typecheck, coverage, build, database and browser checks are run before release; results recorded in the release handoff.

7. Go and lift entries remain visible at 320 and 390 px without scrolling; selecting a future ride exposes its wish form immediately: `tests/e2e/coordination-entry.spec.ts`, `features/go/GoStartSheet.test.tsx`, `features/go/go-candidates.test.ts`, `features/rides/FeedScreen.test.tsx`.
