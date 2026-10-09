# Pistl Go: eigener privater Skitag

- **Status:** Agreed for the next implementation stage by the owner’s “Mach weiter”, 2026-10-09, following the mountain rebuild plan.
- **Related:** [Mountain rebuild plan](mountain-rebuild-plan.md), [existing Go wishes](pistl-go.md), ADR 0040/0041.

## Problem

A new rider cannot currently save a useful plan without an existing ride. The preview demonstrates the flow but loses it on reload. A person needs a private mountain day with an obvious next action.

## Included

Pistl Go retains its name and offers a private day planner from the signed-in Today feed: covered resort and region, Vienna calendar day, meeting time, transport intention (`own`, `offer`, `need`) and a plain-text meeting point. The owner can save, reload, edit and delete plans without friends, GPS or an existing ride. A prominent next-plan card opens the plan/meeting point. An explicit action pre-fills the existing ride publishing form; the person still reviews style, capacity and audience and explicitly publishes. Existing conditional Go wishes remain available separately in the same entry sheet.

## Constraints

Only the owner can read a plan, including through RPC, export and server rendering. No coordinates, friend ids, invitation, automatic ride, carpool or location action is introduced. Private planning follows the existing 365-day Vienna calendar window. Minors may plan; existing public-ride/minor/profile/capacity rules still govern publishing. Text is bounded and control/bidi characters are refused. The database uses current session/MFA guards and no direct client table grants. Account deletion cascades plans; export includes them. Plans expire at Vienna midnight two calendar days after their plan date (end of plan day plus 24 hours); expired rows are hidden immediately and purged by daily cleanup.

An owner has at most 20 unexpired plans. Save commands are limited to 30 successful changed plans per rolling 24 hours, with per-owner serialization; deletion remains available under the global write guard. A client-generated plan id makes creation retryable. Optimistic integer versions prevent overwriting an unseen edit. Retrying the same saved fields is successful without another version/quota change; stale different fields return a conflict. Deletion checks the version, and repeating an already completed deletion is successful. Session identity is never a command field.

Offline/failed writes retain form input and never show a successful save. A missing backend returns unavailable, not an empty list. Demo mode explains local simulated planning and makes no account requests. No ledger of old private meeting points or saved plan history is retained.

## Acceptance criteria and evidence

1. A new account creates a plan without a crew or ride; reload shows it, and its meeting point is reachable from Today.
2. Edit/delete, failed writes and concurrent stale edits behave as described; no duplicate on retry.
3. Confirmed friends, strangers, blocked users, anon, revoked sessions and insufficient MFA cannot read another account’s plans; no direct table grants.
4. Region/resort, dates, times, enums, text limits, active-plan cap and save quota are validated in app and database.
5. Explicit sharing opens a pre-filled existing ride form and does not publish until its existing submit action; existing Go wishes remain functional.
6. Export, deletion cascade, expiration and cleanup cover the new data. English/German copy stays in the dictionaries.
7. Unit/component, pgTAP and real-stack browser tests; lint, typecheck, >=80% coverage, build and security review before release.

Evidence links will be added with implementation.
