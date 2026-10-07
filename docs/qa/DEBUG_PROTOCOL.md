# Debugging protocol

Run this before a store release and after any large UI change. Each bug
found gets a test and a fix, or an entry under "Open" with a reason.

## 1. Automated checks

```bash
npm run lint && npm run typecheck && npm run test:coverage && npm run build
PGURL=postgresql://… scripts/test-db-local.sh   # pgTAP, see TESTING.md
npm audit --omit=dev && (cd native && npm audit) && (cd website && npm audit --omit=dev)
```

## 2. Runtime sweep (every screen, phone sizes)

```bash
npm run build && npx next start -p 3100 &
QA_BASE_URL=http://localhost:3100 node scripts/qa/sweep.mjs /tmp/qa-sweep
```

`scripts/qa/sweep.mjs` opens every public and demo route on iPhone SE,
13 and Pro Max widths, in German/light and English/dark. It records:

- console errors and warnings
- failed requests and 5xx responses
- horizontal scrolling
- tap targets under 44 px
- serious or critical axe violations

It also takes one screenshot per route. Map tile failures are expected
when the machine has no internet; everything else is a finding.

## 3. By hand, signed in (TestFlight build or app.pistl.app)

The sweep covers only what works without an account. With two test
accounts, check:

- [ ] Sign up → confirm → feed, as a new user with 0 friends: every empty state says what to do next
- [ ] Add friend by link and by @handle; accept on the other phone
- [ ] Post a ride, join it on the other phone; both see "dabei" after closing and reopening the app
- [ ] Chat both ways; a message sent in flight mode shows as not sent and is not lost silently
- [ ] Ski day: start, lock the phone for 5 min, finish, save, share as post
- [ ] Location sharing on one phone: the other sees the friend on the map
- [ ] Lift meetup: start on one phone, the other gets push and sees the estimate
- [ ] Push on and off; tapping a notice opens the right page
- [ ] Word filter: a slur in a post, chat, name or bio shows "please rephrase"
- [ ] Session expiry: sign out on the web, then act in the app; it asks to sign in again
- [ ] Denied location or push permission: the app explains and does not loop
- [ ] Long names and handles do not break cards; German and English both fit

## Findings 2026-10-07

| Severity | Where | Finding | Fix | Test |
|---|---|---|---|---|
| High | everywhere | No custom 404 or error page: a crash or wrong link showed the bare framework page | `app/not-found.tsx`, `app/error.tsx` with `StatusScreen` | `components/StatusScreen.test.tsx` |
| High | signup, profile | "Saison 25/26" was hard-coded; in October 2026 it is 26/27 | `lib/season.ts`, same 1 September start as the leaderboards | `lib/season.test.ts` |
| Medium | feed, map, carpool, events, profile | City and language switches were 38 px tall | `SegmentedControl` 44 px | sweep |
| Medium | login, legal pages, forgot password | Text links under 44 px tall | 44 px link areas | sweep |
| Medium | `/demo/crew`, `/demo/people`, demo profile blocks | Demo-only screens are English only | planned in the copy pass (Step 3) | — |
| Low | map | Tile attribution links are 13 px tall (MapLibre default) | kept: the attribution must stay visible and small | — |
| Info | all | 0 page errors, 0 horizontal scrolling, 0 serious axe violations on 15 routes × 3 sizes × 2 modes | — | sweep |

## Signed-in browser journeys (2026-10-07)

`tests/e2e/signed-in-journeys.spec.ts` automates seven browser journeys
from section 3: invite-link friendship, ride join/leave persistence,
bidirectional persistent chat, friends-only text posts (with stranger C),
word-filter rejection without saving, two-way blocking, and session
revocation on a second device with a copied session and independent cookies.
All contexts use iPhone 13 dimensions and German UI. Accounts are registered
through `supabase.auth.signUp`, confirmed with the local Mailpit code, and
signed into the app through its UI. There are no seeded accounts or
administrative keys. Worker accounts are reused within the file to respect
unchanged Auth limits; the logout journey gets its own account.

These journeys run only when `LOCAL_SUPABASE_E2E=1`. CI's existing
`integration` job already starts the stack, supplies the local public key
and Mailpit URL, builds the production app, and runs the complete E2E suite.
The remaining native/manual checks in section 3 (locked-phone tracking,
location, push, flight mode, permission prompts and layout) still require
separate verification; the seven tests do not replace those checks.

To run locally with Docker available, in a disposable local stack:

```bash
npm ci
npm run lint
npm run typecheck
npm run test:coverage
npm run build
npx supabase start
```

Supply `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
(or the local anonymous key), `NEXT_PUBLIC_SITE_URL` and `MAILPIT_URL`
from local configuration. Read only the public key and Mailpit/API fields
from `npx supabase status -o env`; never put a service-role key into the
app or tests. Use the same app origin for the site URL and Playwright
(e.g. `http://127.0.0.1:3103` below). For the full existing E2E suite, also
configure the local media attestation key as described in DEVELOPMENT.md
and the integration job. Then rebuild for the local stack and run:

```bash
npm run build
LOCAL_SUPABASE_E2E=1 PISTL_E2E_PRODUCTION=1 PISTL_E2E_PORT=3103 \
  node --env-file=.env.local node_modules/@playwright/test/cli.js test \
  tests/e2e/signed-in-journeys.spec.ts --workers=1
```

### Findings / verification

| Severity | Where | Finding | Fix | Test |
|---|---|---|---|---|
| Medium | session expiry / Server Actions | After logout on another device, the next write was rejected but shown as a generic network failure. The proxy's 307 forwarded the action POST to `/login`, whose response the action client could not consume | `lib/supabase/proxy.ts`: denied action POSTs use Next's 303 + `x-action-redirect` protocol without a Location header; ordinary redirects, Auth/MFA checks, session cookies and cache headers stay intact | Regression first failed in the browser; two new unit assertions failed before the fix. All eight proxy tests and the real-session logout journey pass after it |
| Info | signed-in browser journeys | Seven real-account journeys have reload and negative-access assertions; no account seed or administrative key | `tests/e2e/signed-in-fixtures.ts`, `tests/e2e/signed-in-journeys.spec.ts` | Full local production E2E suite: **17 passed**, including all seven new journeys, against Docker Desktop + local Supabase; no retries or skips |
| Info | verification gates | All required checks pass | Existing lint rules, test thresholds, policies and migrations are unchanged | Lint and typecheck exit 0; **140 test files / 855 tests passed**; coverage **85.88% statements / 83.02% branches / 83.27% functions / 88.27% lines**; production build exit 0; production dependency audit: 0 vulnerabilities. With `LOCAL_SUPABASE_E2E=0`, all seven new tests skip as required |

Remove the test-file argument to run the full E2E suite. The existing CI
`integration` job discovers these tests automatically; its result will be
reported on the PR, separately from the local results above.

No architectural decision was made. Existing tests, lint rules, policies and
applied migrations are unchanged.
