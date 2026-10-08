# Handoff: team review, phases 3 and 4 (2026-10-08)

This is for the next agent. Read `AGENTS.md` and `docs/qa/TEAM_REVIEW.md` first.
**Delete `docs/qa/handoff/` before PR 2 is merged.**

## State

| PR | Status |
|---|---|
| 1 [phkonstfuchs-creator/snowmate#74](https://github.com/phkonstfuchs-creator/snowmate/pull/74) | merged |
| 2 [phkonstfuchs-creator/snowmate#75](https://github.com/phkonstfuchs-creator/snowmate/pull/75) | open on `claude/compassionate-volta-pykjtw`; Greptile fixes pushed in `fix(ux): push ask waits…` |
| 3 (scale, #6 and #12) | not pushed: `docs/qa/handoff/pr3-scale.patch` |

## PR 2: what is left

1. **Checks on the fix commit.** Lint and typecheck pass on the changed folders, and the changed tests pass. The full `npm run test:coverage`, `npm run build` and the QA sweep have **not** been run on it.
2. **Greptile threads on #75:**
   - Fixed in the push, so reply and resolve:
     - push ask behind the ride sheet
     - event joins without a push ask
     - demo match cannot chat
     - old demo messages read as "just now"
   - "Demo dates still mismatch" (`useRideBoard.ts:108`): not fixed, on purpose. The demo layout reads `headers()`, so it renders per request, and `toIsoDay` uses a fixed time zone. A mismatch can only happen in the seconds around Vienna midnight, and React re-renders on the client. Reply with that reasoning and leave the decision to the owner.
   - There may be new notifications or reviews since; check the PR.
3. Merge when CI and Greptile are green (squash, like #74).

## PR 3: how to land it

After PR 2 is merged:

```bash
git fetch origin main && git checkout -B claude/compassionate-volta-pykjtw origin/main
git am docs/qa/handoff/pr3-scale.patch   # resolve docs/qa/TEAM_REVIEW.md if needed
```

Checks that passed on 2026-10-08:
- lint, typecheck, `test:coverage` (886 tests), build
- pgTAP: all files, including the new `nav_counts.test.sql` (14 checks)
- sweep: nothing new

Then open a PR and merge when it is green. Not done: rerunning the checks after the rebase.

PR 3 contains:
- the migration `20261030090000_nav_counts_and_chat_index.sql`
- `getNavCounts()` in the layout
- `RefreshOnResume` set to 5 minutes

No ADR is needed: behaviour is unchanged.

## Phase 4: persona retest

Raw notes are in `phase4-persona-notes.md` (Haiku agents on `/demo`; simulated, not real testers). Add the before/after table below to `TEAM_REVIEW.md`:

| Persona | Grade before → after | Tomorrow? | Main remaining stuck point |
|---|---|---|---|
| Jonas | 4 → 5 | yes, barely | Invite loop in the demo; offline tab switch in the demo (no service worker there) |
| Lena | 6 → 7 | yes | Invite page shows no inviter; terms box cleared after an error |
| Marco | 5 → 6 | probably | iOS push needs the home screen; no inviter name |
| Sophie | 4 → 5 | yes (feed) | Legal pages and map attribution in German under English; no dark mode |
| Tim | 6 → 6 | no (demo) | No ski day or push in the demo; no character counter |
| Mother | 3 → 5 | would look, not allow | 14-year-olds on adults' events (owner decision); report entry not visible in the demo |

Taps against target:
- unchanged and met: task 3 (0 taps), task 4 (1 tap)
- improved: task 5, chat (4 → 3 taps)
- not testable in the demo: tasks 6 and 8; by the code, ski day is 3–4 taps and push 2 taps
- improved: who is out today, which was "174" before

Found by several testers:
1. The terms checkbox is cleared after a sign-up error. It is a 24 px box, and the label is the real target (`features/legal/LegalLinks.tsx`, `SignupFlow`).
2. In the demo crew, "share your invite link" leads to Discover, which has no link (`features/crew/CrewScreen.tsx:127`).
3. The lift meetup sample says "about 0 m" (`meetup.routeHint`).
4. Demo fixtures are English on German screens (`lib/data/mock-data.ts`).
5. On iOS Safari, push needs the home screen; the post-join sheet is then a dead end (`PushSettings.tsx`).
6. The grey "Dabei" button looks disabled.

## Owner actions (unchanged)

- Legal review of the terms
- Check open reports daily
- `db push` of both migrations
- ADRs 0034 and 0035 stay **Proposed**
