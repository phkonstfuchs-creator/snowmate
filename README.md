# Snowmate

Snowmate is a mobile-first coordination app for ski crews around Innsbruck and
Salzburg. The repository contains the interactive product prototype and the
first Supabase account foundation.

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

Email/password authentication, SSR cookies, protected product routes, email
confirmation, logout, and the private RLS-backed profile shell are implemented;
the account-profile foundation is applied to `snowmate-dev`. The protected
profile-completion flow, explicit server DTO, real profile identity in the UI,
and its additive RPC/constraint migration are implemented and applied to the
hosted project. Local pgTAP verification still requires the local Supabase
PostgreSQL stack through Docker Desktop.

Rides, friendships, chats, consent, and location remain mock-only. Do not
connect real social, minor, or location data until their own normalized schema,
authorization rules, negative RLS tests, and server DTOs exist.

See [the structural audit](docs/STRUCTURAL_AUDIT.md) for the findings, completed
work, and backend follow-up.
