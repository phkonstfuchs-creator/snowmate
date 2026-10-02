# Testing

## Levels

| Level | Tool | Lives in | Covers |
|---|---|---|---|
| Rules and mapping | Vitest | `features/**/*.test.ts`, `lib/*.test.ts` | Validation, visibility, capacity, row mapping |
| Server boundary | Vitest with a mocked Supabase client | `features/**/{queries,actions}.test.ts` | What is sent to the database, how answers map to messages, failure paths |
| Screens | Vitest + Testing Library | `features/**/*.test.tsx`, `components/**/*.test.tsx` | Live and demo behaviour, accessibility names |
| Architecture | Vitest + ESLint API | `tests/unit/architecture.test.ts` | Each boundary rule still rejects a deliberate violation |
| Database | pgTAP | `supabase/tests/database/*.test.sql` | Grants, RLS, audience rules, capacity, negative cases |
| Journeys | Playwright (mobile Chrome) | `tests/e2e/` | Onboarding, sign-up to sign-out against a real local stack |

## Required before handing over a change

```bash
npm run lint
npm run typecheck
npm run test:coverage
npm run build
```

Plus the database tests whenever `supabase/` changes, and the e2e suite
when a journey changes. CI runs all of them on pull requests and `main`
(`.github/workflows/ci.yml`).

## Database tests without Docker

`scripts/test-db-local.sh` runs every migration and pgTAP file against a
plain local Postgres with the `pgtap` extension, using a small stand-in for
Supabase's roles and `auth` schema (`scripts/db-test-shim.sql`):

```bash
PGURL=postgresql://postgres@localhost:5432/postgres scripts/test-db-local.sh
```

It is a fast local check, not a replacement for `npm run test:db` in CI.

## What coverage means here

`vitest.config.mts` enforces 80% on `features/**` and a short list of
`lib/` and `app/` files, not on the whole application. The legacy
prototype components are only partly measured. Add files to the measured
set as they move into features; never remove files to keep the number
green.

## Rules for tests

- Security-relevant behaviour gets a negative test: who must not see or do
  something, not only who may.
- A failing test is never a flake until proven otherwise. Do not skip,
  disable or weaken a test or a lint rule to make a change pass.
- New logic follows red, green, refactor.
