# Security audit — 7 October 2026

## Scope and conclusion

Repository: `phkonstfuchs-creator/snowmate`, base `1bbcf55`, branch
`codex/security-audit`. Reviewed the app, separate website, all migrations,
Edge push code, local Git history, workflows and dependency locks. Work was
isolated from unrelated changes in the primary checkout.

Public source is compatible with private user data when credentials stay
private and the server/database enforce access independently of the UI.
No confirmed production secret was found in the scanned source/history.
Several exploitable authorization and privacy gaps were reproduced and fixed
locally. This report is **not a certification of hosted configuration** and
does not mean these branch changes are already in production.

## Threat model

Protect profiles, minors, friendship edges, chats, meeting points, photos,
location announcements, tracking summaries and push endpoints against guests,
unrelated accounts, blocked/former friends, stale sessions and shared devices.
Treat file bytes, URLs, identifiers, form bodies and JWT claims as untrusted.
The UI is an explanation of authorization; the database decides the audience.
The service role belongs only in the website's private waitlist boundary and
Supabase Edge runtime, never in app browser code.

## Findings and repairs

| Priority | Reproduced finding | Repair and negative evidence |
|---|---|---|
| High | Authenticated JWTs could outlive revocation at Data API and Storage boundaries | Match `auth.sessions`; fail closed for absent/revoked session; restrictive Storage session/MFA policy. `session_revocation`, `storage_session_gate` |
| High | Storage audience access included old/orphan files in another account's permitted folder | Only the current avatar and photos attached to visible posts can be read. `security_hardening` |
| High | Authorized direct Storage uploads/downloads could bypass metadata removal and share originals with embedded location | Private HMAC certificates after server re-encoding; friend reads/new references require attestation; immutable object id/path/version also covers Storage's privileged upload completion. `media_attestation`, server upload tests; HTTP integration prepared for CI |
| High | Upload actions trusted client metadata stripping; malformed/header-only files passed the old boundary | Shared Sharp decoder, 16 MP bound, WebP re-encoding, EXIF removal, byte limits and pre-decode quota. Real JPEG/EXIF and truncated/oversized file tests |
| High | A shared browser could restore another account's GPS recording | Account-bound storage envelope, discard legacy/foreign data, stop watches on switch/logout. Tracking and logout tests |
| Medium | Another account could claim a known browser push endpoint | Conflict updates require the existing owner; session-bound opt-in; settings do not silently resubscribe. `security_hardening`, `push_session_binding` |
| Medium | Pending push could survive a block/logout; public dispatch revealed global activity counts and drained the global queue | Recheck blocks/recipient sessions; verified bearer; actor/session-scoped service-only dispatch, empty response, maximum 100 notices/1,000 device rows. `push_dispatch_scope`, Edge identity/handler tests |
| Medium | Auth deletion could strand Storage objects; failed list/remove operations were ignored | Check every cleanup result; RPC refuses while owned objects remain. Account-action and `account_storage_deletion` tests |
| Medium | Deleting the user who redeemed an invite made that invite usable again | `used_at` determines prior redemption. `invite_reuse_after_delete` |
| Medium | App private photos could remain in a browser cache after audience changes | No-store successful and failed media responses; production browser checks |
| Medium | Production app CSP allowed arbitrary inline scripts; session cookies were script-readable despite server-only auth | Fresh server nonce, dynamic documents, HttpOnly/Secure/Lax cookies; remove unused browser client. Production hydration and nonce injection tests |
| Medium | Auth/MFA error paths could throw or treat missing factors as success; reset cooldown response distinguished provider outcomes | Fail closed for user/factor lookup errors; generic reset response; hashed target quota; password change revokes other sessions. Auth/MFA negative tests |
| Low | Protocol-relative push targets were accepted | Same-origin path validation in SQL and worker. URL and worker tests |
| Low | Planning dates including year 9999 were accepted | Shared Vienna date validator and DB trigger: today through +365 days; old posts remain readable. Unit and `post_date_bounds` tests |

New migrations only: `20261021090000` (lift push), `20261022090000`
(security), `20261023090000` (sessions/Storage), `20261024090000`
(scoped dispatch), `20261025090000` (export device sessions),
`20261026090000` (media certificates/immutability). Previously applied
migrations are unchanged.

## Audit coverage

| Area | Checked | Limits or follow-up |
|---|---|---|
| Git/secrets | Gitleaks 8.30.1; 139 scanned commits in all reachable local refs plus current tracked/untracked, non-ignored source. 22 history and 9 current detections all confirmed fixed test passwords/tokens | Ignored private credentials and unreachable/deleted remote refs are outside this evidence. No credential rotation was indicated by a confirmed leak |
| Public config | Reject privileged/malformed keys and URL credentials in public app configuration; no app service role | Private hosting environment values were not inspected |
| DB permissions | Effective catalogue: public tables FORCE RLS; no anon table grants; restricted profile/ride/carpool column grants; definer helpers empty search_path; queue RPCs service-only | Plain PostgreSQL tests are not a hosted Data API/Storage HTTP check |
| Identity/IDOR/minors | Server-session identity, friend/FoF/stranger/blocked audiences, age rules, direct/ride chat, discovery bands, anonymous minor leaderboards | Birth date remains self-declared; no identity verification is claimed |
| CSRF/redirects/XSS | Next Server Action origin checks; exact auth redirect paths; same-origin waitlist POST; React escaping/control-character validation; no user HTML execution | The static marketing website still needs inline Next hydration scripts; arbitrary user HTML must remain prohibited |
| Abuse/body limits | Auth attempt/target limits, PostgREST per-account guard, bounded image decode, 2 MB action bodies, waitlist actual-stream 2 KB cap and DB IP/email cooldown | App limits are per instance; CAPTCHA/global WAF quotas require operator setup |
| SSRF/network | Fixed weather/Wikimedia URLs, exact image host/path and disabled image redirects/local IP, trusted push endpoint allow-list | Provider/account/DNS settings are not verified by a URL allow-list |
| Account rights | Owner-only export, lift status included, checked Storage cleanup and cascades, session invalidation | Storage/Auth deletion spans two services; retries can follow partial image cleanup |
| CI/dependencies | Pinned Actions, read-only workflow permissions, no `pull_request_target`, existing test gates retained; add pinned checksum-verified secret scan and runtime audit gate; website added to Dependabot | GitHub branch protection is currently absent; admin API returned 403 for this connection |
| Agent configuration | AgentShield scan reviewed; lockfile integrity hashes were false positives; no tracked credential-bearing MCP configuration | Local user-wide agent/hosting secrets were not changed |
| Production HTTP | Read-only requests: app/website `/.env` and `/.git/config` return 404; baseline headers inspected | Four negative URLs do not prove every possible artifact is absent |
| Native/iOS | Current source is a web/PWA app; no Capacitor/WKWebView bridge/native credential store found | Wrapper-specific ATS, navigation allow-list, Keychain and App Store review become required if a wrapper is added |

### Dependency residual

Runtime `npm audit --omit=dev` reports **zero** findings for both app and
website at the audit time. The full app audit reports five high package nodes
for one unpatched development chain:
`eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces`.
`braces` 3.0.3 has no patched release in the registry at this check.
The offered automatic fix downgrades the framework lint configuration to
Next 14; it is not applied to this Next 16 app. This remains tracked rather
than hidden or worked around by disabling lint. The affected code is a build
tool, not an application request handler. See
[upstream advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).

### Media metadata boundary and review corrections

Direct owner Storage uploads remain possible, but raw objects cannot become
new avatar/post references or be downloaded by friends. The server certifies
only newly re-encoded files with a private HMAC and the exact immutable Storage
object id. Friend access still requires the current reference and audience.
Owners can view/delete their own files; historical originals are not asserted
to have been cleaned. Existing uncertified images become owner-only at rollout.
Key provisioning and rotation have one canonical runbook in
[DEVELOPMENT.md](DEVELOPMENT.md#private-media-signing-key).

Independent review found a NULL-signature rejection bug in the **new,
unreleased** attestation function; explicit NULL checks and negative pgTAP
closed it before commit. Source review also found that Storage tests user RLS
before uploading, then completes the object write under a privileged role.
A restrictive RLS UPDATE policy alone would leave an in-flight overwrite race.
A database trigger therefore freezes object id/bucket/path/version for every
role from the first upload, before as well as after certification; timestamp
updates remain allowed. The RPC locks the object while inserting its certificate.
Negative pgTAP tests cover privileged version updates on both raw and certified
objects. The inspected [official uploader source](https://github.com/supabase/storage/blob/master/src/storage/uploader.ts)
and [S3 adapter](https://github.com/supabase/storage/blob/master/src/storage/backend/s3/adapter.ts)
explain this path; the exact hosted image version is not verified by reviewing
upstream `master`. Actual HTTP upload and overwrite tests remain a rollout gate.

## Verification

Evidence is from the isolated worktree, not from an asserted production rollout.

- App lint, `tsc --noEmit -p tsconfig.typecheck.json`, production build:
  passed. **127 Vitest files / 798 tests** passed; statements 85.71%, branches
  83.04%, functions 83.83%, lines 88.00%. The existing 80% thresholds stay
  enforced, and three new security helpers were added to measured coverage.
- 36 local pgTAP files, **644 assertions**, plus a race of 12 riders for 3
  spaces: 3 joined, 9 full, 3 stored.
- **8 production Playwright tests passed**: supplied nonce cannot control CSP, inline scripts
  get the server nonce, demo and login hydrate, private photo failures are
  no-store. Lift sample flow also runs without account/GPS/push.
- Website lint, 19 Node tests and production build run locally.
- Deno 2.9.6 `deno check supabase/functions/push-dispatch/index.ts` succeeds.

The full Docker Supabase integration/auth lifecycle and actual Web Push
delivery are not replaced by the PostgreSQL shim or browser mock data.
CI retains those integration checks and adds a real two-account media HTTP
journey (raw upload denial, clean app upload, friend access and overwrite denial).
The disposable local media signing key is read from the test DB and masked;
production credentials are never needed by CI. Do not describe them as locally passed
when Docker/provider test credentials are unavailable.

## Required operational decisions

1. Review and apply the six new migrations; privately provision the matching
   server-only media key using DEVELOPMENT.md; deploy authenticated Edge
   dispatch, then app. Verify real Auth/Storage HTTP denial for a revoked session and MFA
   AAL1; opt in old push devices again; test actual delivery with two accounts.
2. Protect `main` with PRs and required `security`, `quality`, `website`,
   `integration` checks, including a required review appropriate for the team.
   Current GitHub read evidence says `protected: false` and no rulesets.
3. Verify admin MFA and least privilege for GitHub, Supabase, Vercel, Resend
   and DNS; enable secret push protection/private vulnerability reporting
   where available. Never paste private keys into an issue or audit report.
4. Verify hosted Auth CAPTCHA, email limits/SMTP/leaked-password protection,
   trusted proxy headers and exact production auth redirect URLs. Enable bot
   protection only with valid provider credentials and a tested user flow.
5. Decide on owner re-upload or a reviewed sanitization backfill for existing
   media before rollout: uncertified friend images become hidden. Inspect
   historical originals and verify private buckets and retention cleanup run.
6. Restore a backup into an isolated project, confirm retention/PITR plan,
   test account export/deletion, audit log access and operator response to
   reports. Verify DPA/regions, DNS ownership, TLS and SPF/DKIM/DMARC against
   actual accounts. Repository text is not proof of those settings.

## September HTML review applied to this stage

`snowmate-review.html` was an explicitly limited static review of a private
learning project on 19 September. Its five principles still apply: one home
per rule, agreed scope, ADRs, shared feature screens/domain logic, and checks
that reject boundary violations. Today this is public source handling real
data, so claims about private learning/demo-only state must be updated.

Existing `AGENTS.md` already links the canonical docs and preserves generated
Next guidance. This change updates stale scope text, consolidates image/date/
header rules, records a focused spec and Proposed ADR, and keeps existing
architecture/coverage gates. It does not manufacture a broad retrospective
spec for every screen or replace the feature structure wholesale. The owner
can accept the changes against evidence and separately authorize deployment.

## Risk-ranked handover

| Risk | Current state | Next action |
|---|---|---|
| Critical | No confirmed production credential leak/backdoor was found. The NULL proof bypass occurred in new unreleased code and is corrected | Do not claim the scan covers ignored secrets, unreachable history or private hosting values |
| High | Reproduced session/media/account-local privacy defects are patched on this branch; production has not been changed by the audit | Complete real Supabase HTTP integration and an approved database/key/Edge/app rollout; verify denied access with two accounts |
| Medium | Push consent/queue, logout/MFA failure paths, image caching, CSP and deletion/invite defects are patched locally | Test actual push delivery, blocking/logout and account export/deletion in the deployed test environment |
| Low | URL/date validation and duplicated image/date/header rules are corrected | Maintain existing checks and the documented boundaries |
| Open dependency | One upstream development-only advisory remains, reported as five high package nodes; runtime audits are clean | Track a compatible upstream patch; keep lint rules and framework version, avoid downgrading to hide it |
| Unverified operations | `main` is unprotected; admin MFA, hosted abuse limits, backups, provider contracts and deployed settings need operator evidence | Apply branch review/check requirements and verify the accounts/settings listed above |

The repository can remain public if private credentials remain private and
server/database authorization is enforced. Switching repository visibility
would not repair a deployed authorization flaw. The September HTML principles
are reflected in focused shared helpers, documented Proposed decisions and
existing enforced tests rather than a broad rewrite.
