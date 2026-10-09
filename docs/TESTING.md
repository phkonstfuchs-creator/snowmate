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

## Concurrency

`day_plans.test.sql` checks private Go planning with active session/MFA,
owner-only reads and export, bounded input, save/active-plan quotas, CAS,
idempotent retries, deletion replay protection, Vienna DST expiry and cleanup.
`private-day-plans.spec.ts` exercises save/reload/edit/delete and deliberate
ride-form prefill against real isolated accounts; `demo-day-plans.spec.ts`
checks the temporary public demo, narrow/short screens and Axe WCAG AA.

pgTAP runs inside one rolled-back transaction, so it cannot race two
sessions. `scripts/test-join-race.sh` commits a ride with three spots
and lets twelve riders call `join_ride()` at the same moment, each in its
own session; exactly three may get in. It runs in CI after the pgTAP
suite and at the end of `scripts/test-db-local.sh`.

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


## Major dependency compatibility review (2026-10-07)

Reviewed root Dependabot [#3](https://github.com/phkonstfuchs-creator/snowmate/pull/3)
(TypeScript 6.0.3 -> 7.0.2) and
[#14](https://github.com/phkonstfuchs-creator/snowmate/pull/14)
(ESLint 9.39.5 -> 10.8.1) independently against `main` at `3442f4b`,
after `git pull --ff-only origin main`. Environment: Node 24.16.0,
npm 11.13.0, macOS. Both candidate upgrades changed `package.json` and
`package-lock.json` for their test run; both were reverted afterward.
Neither direct major upgrade is currently supported by the complete toolchain.

| Root check | TypeScript 7.0.2, ESLint 9.39.5 | ESLint 10.8.1, TypeScript 6.0.3 |
|---|---|---|
| `npm run lint` | Exit 2: typescript-eslint rejects TS 7.0 | Exit 0 |
| `npm run typecheck` | Exit 0 | Exit 0 |
| `npm run test:coverage` | Exit 1: 10 architecture tests fail; 820 pass | Exit 0: 134 files, 830 tests pass |
| `npm run build` | Exit 0 | Exit 0 |

The builds used CI's public placeholder Supabase URL/key and site URL,
not production credentials. No tests, lint rules, coverage thresholds,
policies or migrations were changed.

### TypeScript blocker and retry requirements

The installed `eslint-config-next@16.4.0` imports `typescript-eslint@8.66.0`,
which requires TypeScript `>=4.8.4 <6.1.0` and explicitly throws:

```text
typescript-eslint does not support TS 7.0.
```

All ten failures are in `tests/unit/architecture.test.ts`, whose ESLint
API calls cannot load the configuration. Next.js 16.4.0 itself supports
TypeScript 7 CLI checking: route type generation, the explicit typecheck
and the production build all passed. The blocker is the linter's need
for the JavaScript compiler API, absent in TypeScript 7.0.

For a direct upgrade, wait for a TypeScript release with a compiler API
(the TypeScript team targets 7.1) **and** a typescript-eslint release
explicitly supporting that API, consumed by eslint-config-next. TypeScript
7.1 alone is not evidence of compatibility; rerun the full check matrix.
There is no confirmed released version combination for this direct bump.

Microsoft documents a separate side-by-side TS 7 compiler / TS 6 API
installation through npm aliases. That is a different toolchain setup,
not the direct replacement proposed by #3; it was not adopted or validated
in this review. See the
[TypeScript 7 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0)
and [typescript-eslint tracking issue](https://github.com/typescript-eslint/typescript-eslint/issues/10940).

### ESLint blocker and retry requirements

All four checks pass with ESLint 10.8.1, including the architecture
negative tests. Coverage: statements 85.70%, branches 83.05%, functions
83.21%, lines 88.16%. However, eslint-config-next 16.4.0 includes these
plugins with incompatible published peer ranges:

| Plugin | Installed version | Supported ESLint majors |
|---|---|---|
| `eslint-plugin-import` | 2.32.0 | Up to 9 |
| `eslint-plugin-jsx-a11y` | 6.10.2 | Up to 9 |
| `eslint-plugin-react` | 7.37.5 | Up to 9 |

These are also the latest published plugin versions at review time.
Normal `npm ci` exits 0 but prints `ERESOLVE overriding peer dependency`
warnings for all three plugins. `npm ls eslint --all` reports
`ELSPROBLEMS` and an invalid dependency graph. An additional diagnostic
`npm ci --strict-peer-deps` exits 1:

```text
npm error code ERESOLVE
npm error peer eslint@"^2 || ^3 || ^4 || ^5 || ^6 || ^7.2.0 || ^8 || ^9" from eslint-plugin-import@2.32.0
```

Retry when all three plugins publish versions supporting ESLint 10 and
eslint-config-next consumes those versions. eslint-config-next 16.4.0's
own `eslint >=9.0.0` peer range is insufficient; its transitive plugins
must also support 10. No confirmed released plugin/Next-config combination
was available. The
[ESLint 10 migration guide](https://eslint.org/docs/latest/use/migrate-to-10.0.0)
was checked; no application/configuration edit can repair third-party
peer declarations. No force flags, peer overrides or rule removals were
committed.

### Other projects and Dependabot status

`website/` and `native/` have separate manifests and lockfiles, are not
npm workspaces, and are excluded from the root TypeScript/lint projects.
The candidate diffs touched only root manifests. Website remains on
ESLint 9.39.5 / eslint-config-next 16.3.8 with no direct TypeScript dependency;
native remains on its own TypeScript 5.9.3. Neither project is affected,
so no website/native dependency changes or platform builds were needed.

No Dependabot upgrade is completed by this review. #3 remains open and
blocked. #14 was already closed without merging on 2026-10-07 when its
metadata was inspected. Do not close #3 as successfully upgraded.

After restoring the root manifests and reinstalling with `npm ci`, all
four required checks passed again (134 test files, 830 tests; the same
coverage percentages as above). `npm audit --omit=dev --audit-level=moderate`
also exited 0 with `found 0 vulnerabilities`. The final branch changes
only this documentation; both root manifests match the reviewed main.

No architectural decision was made.
