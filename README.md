# Snowmate

Snowmate is a mobile-first coordination app for ski crews around Innsbruck and
Salzburg. The current repository contains the interactive product prototype and
the engineering foundation for a later Supabase backend.

## Local development

Requirements:

- Node.js 24
- npm 11 or newer
- Google Chrome for the local Playwright project

```bash
nvm use
npm ci
npm run dev
```

The application is available at `http://localhost:3000`.

## Quality gates

```bash
npm run lint
npm run typecheck
npm run test
npm run test:coverage
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
  (app)/          product routes sharing navigation and app layout
components/       reusable UI and cross-feature presentation components
features/         feature-owned domain logic and, later, feature UI/data access
hooks/            reusable client-side React hooks
lib/
  data/           prototype fixtures only
  types.ts        current cross-feature domain types
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

## Current limitation

The repository still uses mock data and does not yet provide real
authentication, persistence, RLS, or server-side authorization. Do not connect
real profile, chat, minor, or location data until those controls are in place.

See [the structural audit](docs/STRUCTURAL_AUDIT.md) for the findings, completed
work, and backend follow-up.
