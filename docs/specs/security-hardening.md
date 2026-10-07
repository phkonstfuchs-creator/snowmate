# Security audit and focused hardening

- **Status:** Implemented; owner review and hosted rollout pending
- **Owner:** Philipp Fuchs
- **Related:** [audit](../SECURITY_AUDIT.md), [ADR 0030](../adr/0030-session-and-media-security.md), lift meetup spec

## Problem

Pistl now stores real social and location data. Its public source must remain
safe to inspect, and logout, blocking and account changes must also close
media and push access. The owner requested a repository audit and fixes,
including the two supplied security checklists and the September HTML review.

## Included

Review reachable Git history, code, dependencies, database permissions,
private storage, auth, client persistence, push and CI. Fix demonstrated
defects, consolidate shared image/date/header logic, preserve current feature
boundaries, and make lift meetup easy to discover and try with sample data.

## Scope and constraints

Use server session identity, fail closed and test denied access. Keep applied
migrations intact, existing checks and the measured 80% coverage thresholds.
Preserve unrelated primary-checkout work. Record hosted settings that cannot
be verified. Production credentials, repo visibility, branch protection and
production deployment require separate operational actions; no blanket
rewrite or claims of complete hosted security.

## Acceptance criteria and evidence

| Criterion | Evidence |
|---|---|
| Revoked/missing sessions and password-only MFA sessions cannot read private media or protected data | `session_revocation`, `storage_session_gate`, proxy/auth negative tests |
| A caller cannot claim another account's push endpoint or dispatch another actor's queue | `security_hardening`, `push_session_binding`, `push_dispatch_scope`, edge handler tests |
| Blocks, expired lift statuses and revoked recipient sessions suppress queued delivery | `lift_meetup_push`, push/session pgTAP |
| Orphaned photos stay private, account deletion checks Storage cleanup, used invites remain used after user deletion | `security_hardening`, `account_storage_deletion`, `invite_reuse_after_delete` |
| Image uploads are decoded with bounded pixels; only server-attested immutable media is shareable, including direct Storage access; login/account changes clear sensitive local state | `media_attestation`, image, tracking and logout tests |
| Production scripts use fresh server nonces; private photos use no-store | `security-boundaries.spec.ts` against `next start` |
| Dates outside the planning window fail at both boundaries | planning-date/unit and `post_date_bounds` pgTAP |
| Prominent lift action, generic friend push and account-free sample flow work | map/action tests, `demo-lift-meetup.spec.ts`, lift pgTAP |
| No confirmed production secrets in scanned code/history; CI repeats secret and runtime dependency checks | Gitleaks findings reviewed; pinned scanner and audit CI job |

Check totals, limitations and outstanding operator decisions live in the audit
report rather than being duplicated here. Unapproved decisions remain Proposed.
