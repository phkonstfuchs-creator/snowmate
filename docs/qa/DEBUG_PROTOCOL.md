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
