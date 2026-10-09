# Pistl

Pistl is a mobile-first coordination app for ski crews around Innsbruck and
Salzburg. The repository contains the interactive product prototype, the real
account/profile flow, and a locally implemented Supabase foundation for the
invite-only closed beta.

## Local development

Requirements:

- Node.js 24
- npm 11 or newer
- Google Chrome for the local Playwright project
- Docker Desktop for the local Supabase stack and database policy tests

```bash
nvm use
npm ci
npm run dev
```

The application is available at `http://localhost:3000`.

The repository is linked to the hosted `snowmate-dev` Supabase project locally.
That link and `.env.local` are ignored by Git. A fresh checkout needs the three
browser-safe values documented in `.env.example`; never add a secret or
service-role key.

For local database work:

```bash
npx supabase start
npx supabase db reset
npm run test:db
```

`supabase/config.toml` configures the local stack. Hosted Auth settings are
managed separately in the Supabase Dashboard and do not synchronize from that
file.

## Quality gates

```bash
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run test:db
npm run test:e2e
npm run build
npx -y deno@2.9.4 fmt --check supabase/functions
npx -y deno@2.9.4 check --config supabase/functions/deno.json \
  supabase/functions/process-account-deletions/index.ts
```

`npm run verify` runs lint, type checking, unit coverage, and the production
build. The mobile end-to-end suite is a separate gate because it starts a local
server and browser.

## Project structure

```text
app/
  (public)/       public flows without the authenticated app shell
  (account)/      authenticated setup without product navigation
  (app)/          product routes sharing navigation and app layout
components/       reusable UI and cross-feature presentation components
features/         feature-owned domain logic, UI, validation, and server access
hooks/            reusable client-side React hooks
lib/
  data/           prototype fixtures only
  supabase/       validated browser/server clients and session refresh
  types.ts        current cross-feature domain types
supabase/
  functions/      secret-protected provider deletion worker
  migrations/     reviewed, ordered database changes
  tests/database/ pgTAP policy and constraint tests
tests/
  unit/           domain and fixture invariant tests
  e2e/            mobile browser journeys
```

Route groups do not alter public URLs. For example,
`app/(app)/feed/page.tsx` still serves `/feed`.

## Architecture rules

- Route files compose features; reusable business rules live in `features/`.
- New data access must be server-side by default. Do not import private user
  data into broad client components.
- `lib/data/` is mock-only and must not become the production database layer.
- Authentication identity comes from the server session, never from a client
  supplied user ID.
- Adult friends-of-friends may discover rides and resort-level activity.
  Precise meeting points and live locations become visible only to confirmed
  friends or after the ride host accepts a participation request.
- Minor profiles, rides, locations, and direct messages use the narrower
  confirmed-friends audience.
- Supabase tables exposed through its API require Row Level Security and
  negative policy tests before real user data is connected.
- User input is validated at the server boundary and backed by database
  constraints.
- New production logic follows RED, GREEN, refactor and must keep the configured
  80% coverage thresholds green.

## Environment

Create `.env.local` from the documented names in `.env.example`. Only
browser-safe Supabase values use the `NEXT_PUBLIC_` prefix. Secret and
service-role keys must never be committed or exposed to client code.

## Current backend boundary

Email/password authentication, SSR cookies, protected routes, email
confirmation, logout, profile completion, explicit DTOs, and the private
RLS-backed profile shell are implemented; the account/profile foundation is
already applied to `snowmate-dev`.

The repository now also contains local, not-yet-deployed migrations and server
boundaries for invite/age/consent controls, friendships/blocks/crews,
rides/carpools, chat/moderation/appeals, foreground location, data export,
retention, and retryable account/provider deletion. The feed and carpool routes
now read authorized server DTOs and persist creation, participation requests,
host confirmations, withdrawals, and cancellations. Their creation forms use
the database resort catalog. Requests remain pending until explicitly accepted;
exact meeting/departure points follow the detail DTO permission. Crew, chat,
map, and other prototype surfaces still need their own migration from fixtures.
Pistl Go now adds private conditional interest to an existing ride: minimum total
group (including the prospective participant) and optionally a confirmed
carpool. Only confirmed crew members count toward the group; other conditional
interests do not. Transport must match the resort and local calendar day and
depart before the ride starts. Both a confirmed passenger seat in a driver offer
and an accepted driver for an own rider search qualify. Arrival/travel feasibility
is not calculated. Conditions are evaluated again on reads, explicit participation
requests, and host acceptance; no automatic request, membership, or seat booking
is created. Lost conditions are displayed without silently removing a confirmed
participant. The feature uses `20261009090500_ride_go_interests.sql`; wishes are
included in account export/deletion and cleaned up after expiry.
The personal Go overview on Today lists only the caller's currently authorized
upcoming wishes. Changed conditions on confirmed plans appear first, followed by
ready and still-open wishes. Every card explains the confirmed group and
transport state and links to an explicit next step; it neither requests nor
joins automatically. `20261009090800_own_ride_go_overview.sql` supplies the
bounded, own-only summary without exact locations or other people's wishes.
No social, minor,
chat, or location data may be used with external testers until a clean Supabase
reset, database lint, all pgTAP tests, hosted deployment, operational tests, and
the compliance launch gates pass.

Optional analytics is fail-closed: the private database flag and the explicit
browser build flag both default to disabled until provider erasure and legal
release gates have passed.

Local pgTAP verification requires Docker Desktop and the local Supabase
PostgreSQL stack. Compliance drafts and launch blockers live in
[`docs/compliance/`](docs/compliance/README.md).

After a local reset, apply the extension-owner operation before database tests:

```bash
docker exec -i supabase_db_snowmate-dev psql -U supabase_admin -d postgres \
  -v ON_ERROR_STOP=1 --single-transaction < supabase/operations/harden-pg-net.sql
```

Hosted execution requires the extension owner or a database administrator; see
[the operator instructions](docs/compliance/toms.md#pg_net-rechteentzug-durch-den-extension-eigentümer).
The local two-account browser test is enabled with `LOCAL_SUPABASE_E2E=1` and
requires the app's public Supabase URL/key to point to the same local stack.
`LOCAL_SUPABASE_WORKDIR` and `LOCAL_SUPABASE_DB_CONTAINER` select an isolated
stack; `PLAYWRIGHT_PORT` selects a separate app port. Fixture administrator keys
are obtained only by the Node test runner and never sent to the browser. Local
confirmation-email limits must cover the test accounts; CI adjusts only its
temporary local configuration. Existing development servers on the selected
port must use the same test environment, or use a free port.

See [the structural audit](docs/STRUCTURAL_AUDIT.md) for the findings, completed
work, and backend follow-up.

## Dependency security verification

`npm run audit:deps` checks production and full npm audit reports. Next.js,
Vitest, sharp and undici are updated to compatible patched releases. The only
reviewed exception is the development-only `braces` advisory
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm),
propagated through the Next.js ESLint glob dependency chain. No patched braces
release was available during the 2026-10-09 review. Repository-controlled lint
patterns are its input; it is not in the application runtime. The verifier
checks every affected lockfile node is development-only and allows only this
specific advisory until 2026-10-30. Production, critical, unknown, expired or
unavailable audit results fail verification. CI runs the same checks for the
application and website. This is an explicit temporary exception, not a clean
full dependency audit.

## Pistl branding

The product, application metadata, packages, and user-facing copy use Pistl. The canonical wordmark is `public/pistl-logo.png`. Existing infrastructure identifiers (Supabase project/container names, worker headers, Vault secrets, cron jobs, browser storage keys, and export format versions) retain their legacy names for compatibility. Historical migrations remain unchanged. Apply `20261009090400_pistl_brand.sql` to reserve the Pistl handle for new writes and refresh the chat fallback; existing handles are retained.
