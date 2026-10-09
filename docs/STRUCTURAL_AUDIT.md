# Structural Audit

Date: 2026-07-23
Last updated: 2026-08-03

## Scope

The audit covered every tracked project file, the full dependency tree,
Next.js configuration, TypeScript and ESLint gates, production build output,
mock-data integrity, Git history secret markers, mobile route behavior, and the
future Supabase boundary.

Generated output (`.next`, coverage, test artifacts), installed dependencies,
and ignored local Vercel/Claude metadata were classified separately from owned
source code.

## Baseline findings

### High priority

1. The friend-graph and minor-safety rules exist only in product copy. Feed,
   map, profiles, and messaging do not currently enforce them.
2. There is no authenticated server/data boundary. Product routes are broad
   Client Components importing all mock users, relationships, and messages.
3. Ride and carpool capacity is represented by both counters and member arrays.
   These redundant values can drift and require transactional database logic.
4. Core actions are prototypes: onboarding data, ride posts, carpool posts, and
   messages are not persisted.
5. The repository had no tests or CI, and lint failed with nine errors.
6. Next.js 16.2.10 had current high-severity advisories.

### Medium priority

1. Public onboarding and product routes shared one root app shell. The bottom
   navigation was merely covered by a high-z-index onboarding overlay.
2. Leaflet loaded through racing dynamic imports, used six `any` escapes, and
   interpolated future external data into an HTML string.
3. Several required fixture references used non-null assertions and could turn
   incomplete data into runtime crashes.
4. Pinch zoom was disabled globally, sheets lacked consistent dialog semantics,
   and multiple icon buttons had no accessible name.
5. `lib/data.ts` mixed seven domains under an ambiguous production-looking name.
6. Unused Create Next App assets and `react-leaflet` remained in the repository.

### Backend blockers

The current array-heavy model is not the target database schema. The Supabase
phase needs normalized tables for profiles, friendships, crews, rides,
memberships, carpools, conversations, messages, blocks, reports, and consent.
All exposed tables need explicit RLS policies and indexes on policy columns.

### Visibility decision

Decision recorded on 2026-07-24:

- Adult friends-of-friends may discover ride posts and resort-level presence.
- Precise meeting points and live locations are visible to confirmed friends
  and accepted ride participants. A friend-of-friend must not receive either
  before the ride host accepts the participation request.
- Minor profiles, rides, locations, and direct messages use the narrower
  confirmed-friends audience.
- Unrelated users do not receive ride or location discovery data.

The backend must enforce these audiences in queries and RLS policies rather
than relying on client-side filtering.

## Improvements completed

- Added `(public)` and `(app)` route groups with a dedicated product layout.
- Removed the global navigation from onboarding and restored browser zoom.
- Added Vitest, Testing Library, V8 coverage, Playwright, and mobile E2E tests.
- Added fixture invariant tests that found and fixed a ride-count mismatch and
  an incorrectly ordered leaderboard.
- Extracted immutable ride participation logic into `features/rides/`.
- Added stricter TypeScript checks, including unchecked index access and unused
  symbol failures.
- Rebuilt Leaflet loading with typed refs, deterministic initialization,
  explicit error UI, DOM `textContent` rather than interpolated HTML, and an
  injection regression test.
- Added a restrictive response CSP, transport/browser security headers, and a
  safe Supabase env template.
- Added SHA-pinned GitHub Actions CI, Dependabot, Node 24 pinning, and
  contributor scripts.
- Bundled the application fonts locally so clean builds have no external font
  download dependency.
- Updated Next.js to 16.2.11 and removed unused dependencies and starter assets.
- Kept Turbopack for development, but selected Next.js' supported Webpack
  production builder after clean Turbopack builds reproducibly stalled on the
  audited macOS/Node 24 toolchain.

## Verification

The required gates are:

```text
lint -> typecheck -> unit/coverage -> Deno check -> build
Supabase reset -> database lint -> pgTAP -> mobile E2E -> secret scan
```

Coverage is initially enforced on new domain logic and the changed shared
control. The measured surface must expand as legacy prototype UI is converted
into feature modules; it must not be reduced to keep the percentage green.

## Deferred in the original audit

- Supabase packages, schema, migrations, auth clients, and `proxy.ts`
- RLS policies, realtime channel authorization, and negative policy tests
- Server Components and server DTOs for each product route
- A shared focus-trapping Sheet/Dialog primitive
- Persisted timestamps and timezone-aware display values
- Conversation selection by conversation ID instead of only user ID
- Validated server commands for posting, joining, messaging, and onboarding

This list records the July baseline. As of 2026-08-03, Supabase SSR/Auth,
normalized migrations, forced RLS, relationship-aware RPCs, server DTO/DAL
boundaries, rides/carpools, chat/moderation, foreground location, consent,
export, retention, and account/provider deletion exist locally with pgTAP or
TypeScript tests. The shared focus-trapping dialog primitive and the remaining
prototype UI conversion are still frontend work.

The new backend is not beta-approved merely because the files exist. The full
migration reset, database lint, pgTAP matrix, hosted deployment, Vault/Edge
Function configuration, observed provider-deletion run, external alerts,
restore test, and legal/DPIA approvals remain mandatory gates.

## Residual dependency risk

As of 2026-08-03, `next@16.2.12` is the latest stable release. npm still reports
high advisories for Next's pinned `postcss@8.4.31` and optional `sharp@0.34.5`.
The current prototype does not process attacker-supplied CSS or images, reducing
present exploitability, but the advisories remain open. No forced downgrade,
pre-release framework, or unsupported dependency override was introduced.
Recheck when the next stable Next.js patch is available.

## Account foundation follow-up

Status updated on 2026-08-03:

- Added Supabase SSR clients, validated public environment configuration,
  session refresh through Next.js 16 `proxy.ts`, and a second authorization
  check in the authenticated app layout.
- Replaced the onboarding authentication bypass with real login, signup, email
  confirmation, and logout flows backed by server-side validation.
- Added a first migration for private profile shells with explicit grants,
  forced RLS, owner-only policies, server-controlled minor/account fields, and
  an `auth.users` trigger that copies no user-controlled metadata.
- Added unit, component, callback, proxy, mobile E2E, and pgTAP policy tests.
- The private profile-shell migration is applied to `snowmate-dev`.
- Added a protected `/complete-profile` route, server-side profile gate,
  explicit minimal DTO, shared Zod validation, and real name/handle rendering
  throughout the prototype-backed app views. Browser onboarding data is only a
  tab-scoped, untrusted prefill and is removed on completion, login, or logout.
- Added an additive profile-completion migration with stricter identity
  constraints, authenticated-only RPC execution, RLS-preserving own-row
  updates, and pgTAP attack cases. This second migration is applied to
  `snowmate-dev`; local and remote migration histories match, and the linked
  database linter reports no schema errors.
- Unit, component, type, lint, build, and mobile E2E checks pass. The database
  tests remain unexecuted until the local Supabase PostgreSQL stack is
  available.

This account follow-up was the first backend increment. Later local increments
now cover social discovery, rides, carpools, messages, moderation, consent,
location, export, retention, and deletion. None of those features is authorized
for external testers until its migrations and negative pgTAP cases pass in a
clean Supabase environment and the compliance gates in `docs/compliance/` are
formally closed.

## Persistent coordination increment — 2026-10-09

The feed and carpool surfaces now use authenticated server data instead of ride
and offer fixtures. Regional feeds, database resort selection, creation,
permission-aware details, pending requests, explicit host acceptance/rejection,
withdrawal, leaving and cancellation are connected to the existing RPC contracts.
Ride details link to destination-filtered carpools. Counts represent accepted
participants/seats; the former fabricated activity/date/XP indicators were removed
from the feed. Crew, chat and map presentation still need their own integration.

The new component/route regressions cover failure, privacy, identity, expiration,
capacity and idempotent retries. A local mobile browser test uses two actual
accounts to request and confirm both a ride and a seat, reload each account,
leave and cancel. Test administrator access is restricted to the explicitly
selected local stack. The existing auth browser test now provisions the required
beta invitation and submits age and consent fields.

Fresh database verification exposed pre-existing defects: own-profile policies
called a revoked private predicate, historical group messages became accessible
again after a block removed current membership, report deadline clocks differed,
and location functions used the SQL keyword CURRENT_TIME as a timestamp variable.
Additive migrations repair these behaviors without exposing private UUID-based
predicates. pg_net objects belong to a privileged extension owner; an explicit
owner-run operation now revokes and verifies client access. CI executes it after
reset; hosted application needs the corresponding owner/admin step described in
`docs/compliance/toms.md`.

SQL regression fixtures were corrected to scope changes to their own users,
use valid pgTAP expected queries, compare UUIDs with supported ordering, and
avoid assumptions about transaction timestamps or an empty development database.
Checks on the isolated local stack: all 628 database assertions passed and database
lint reported no schema errors. The complete component/unit suite passed 354
tests with 93.78% line and 82.19% branch coverage; all six mobile browser journeys,
TypeScript, ESLint and production build passed. Hosted migrations/deployment and
compliance release remain pending.
This increment does not implement ski tracking or the conditional Pistl Go planner.

## Pistl Go first increment — 2026-10-09

Ride detail now supports private conditional interest: a minimum group including
the prospective participant and optional confirmed transport. Readiness is
evaluated from actual confirmed members and matching confirmed carpools, with
explicit participation request and host acceptance still required. Open
interests never reserve capacity. Both driver offers and accepted drivers for
an own rider search count; a journey already underway remains valid. Changed
conditions are shown without silently ejecting confirmed participants.

The wish uses existing contact/minor/block policies, is included in export and
account deletion, and expires with the ride. The existing daily retention job
removes it 24 hours after the planned start. Migration905 implements this step;
migration906 fixes responder foreign-key deletion that previously prevented a
host account from being deleted after accepting a ride/carpool request.

Validated on a fresh isolated local stack: 668 database assertions and SQL lint
passed; 371 unit/component tests passed with 93.87% line and 83.18% branch coverage.
All seven mobile browser journeys passed, including a multi-account Go flow.
TypeScript, ESLint, production build and diff whitespace checks passed. These
checks do not establish hosted deployment. Free time windows, multiple desired
resorts, collective proposal generation and native ski tracking remain separate
follow-up work.

## Pre-push completion — 2026-10-09

The marketing website's double opt-in API initially referenced three missing
RPCs. Migration907 now supplies service-only request, confirm and token-release
commands with private email/token-hash storage, cooldown, rate limiting and
expiry cleanup; 31 pgTAP assertions validate this contract. Confirmation emails
now state the selected Early Access scope explicitly. Website release settings
remain draft/unconfigured; no real email dispatch or hosted migration was run.

Compatible dependency updates include Next.js16.4, Vitest4.1.11, sharp0.35.5 and
undici7.30. Production audits have no findings. The single unfixed development
braces advisory is covered by the explicit, tested exception documented in the
README, expiring after2026-10-30. CI verifies the app and website, including
website browser journeys. The final local app suite passes376 tests with93.89%
line/83.72% branch coverage; all699 database assertions and seven app browser
journeys pass. Website20 unit tests and15 browser journeys, both builds, lint,
types, Edge Function checks and the security review pass.
