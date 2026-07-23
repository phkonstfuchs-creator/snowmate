# Structural Audit

Date: 2026-07-23

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

The unresolved product rule is whether adult ride/location discovery includes
friends-of-friends or only confirmed friends. Minor visibility and direct
messaging should default to the narrower confirmed relationship.

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

The required local gates are:

```text
lint -> typecheck -> unit/coverage -> build -> mobile E2E
```

Coverage is initially enforced on new domain logic and the changed shared
control. The measured surface must expand as legacy prototype UI is converted
into feature modules; it must not be reduced to keep the percentage green.

## Deliberately deferred

- Supabase packages, schema, migrations, auth clients, and `proxy.ts`
- RLS policies, realtime channel authorization, and negative policy tests
- Server Components and server DTOs for each product route
- A shared focus-trapping Sheet/Dialog primitive
- Persisted timestamps and timezone-aware display values
- Conversation selection by conversation ID instead of only user ID
- Validated server commands for posting, joining, messaging, and onboarding

These require the visibility decision or belong to the backend implementation,
not to a structural cleanup of the mock prototype.

## Residual dependency risk

At audit time, `next@16.2.11` is the latest stable release. npm still reports
high advisories for Next's pinned `postcss@8.4.31` and optional `sharp@0.34.5`.
The current prototype does not process attacker-supplied CSS or images, reducing
present exploitability, but the advisories remain open. No forced downgrade,
pre-release framework, or unsupported dependency override was introduced.
Recheck when the next stable Next.js patch is available.
