# 0030 Session revocation, private media and browser scripts

- **Status:** Proposed
- **Date:** 2026-10-07
- **Spec:** [security-hardening](../specs/security-hardening.md)
- **Evidence:** [security audit](../SECURITY_AUDIT.md)
- **Revises:** session/media boundaries of ADRs 0013, 0022, 0024 and 0025

## Context

Pistl has moved beyond the September prototype review and handles real friend
and location data. A signed JWT can outlive logout. Storage does not use the
PostgREST pre-request hook, and a browser push endpoint can outlive its login.
Client image processing and a broad script CSP are insufficient security boundaries.

## Options considered

1. Keep relying on JWT expiry, browser image processing and inline script
   permission. This leaves revocation and metadata gaps.
2. Put a service-role key in the app and proxy every operation. This creates
   a larger privileged application boundary and conflicts with ADR 0001.
3. Enforce active Auth sessions in database/API and Storage boundaries,
   bind push consent to a session, bound server image processing, and use
   per-response script nonces. Certify sanitized immutable Storage objects with
   a narrow server-held HMAC key; reuse existing domain screens and RPCs.

## Decision

Choose option 3. The server verifies the Auth user; PostgREST and restrictive
Storage policies require an active matching `auth.sessions` row and the
existing MFA rules. Missing infrastructure/session claims deny access.
Server-only Auth cookies become HttpOnly/Secure/SameSite=Lax; the unused
browser Supabase client is removed.

Push consent belongs to a login session. Explicit logout removes the local
browser subscription; dispatch ignores revoked recipient sessions. The Edge
handler verifies its bearer, derives its identity from the verified token,
and uses a service-only RPC that rechecks its active session and takes only
its own actor events. Private queue data never enters client responses.

Image processing is shared by the server boundaries and discards metadata.
Direct authenticated Storage uploads would bypass the decoder, so filenames
and MIME types alone cannot prove sanitization. A database-generated, private
HMAC key is provisioned only to the app server. After a unique non-upsert upload,
it signs owner/object-id/bucket/path/time; an owner-only RPC verifies the signature
and creates a private certificate. Friends can read only certified current
objects allowed by the audience. New profile/post references require certificates.
Authenticated Storage updates are forbidden for these buckets. Deleted object
certificates remain until account deletion and forbid UUID reuse, so a replay
cannot certify replacement bytes. This limited key does not grant service-role
access. Account deletion refuses while owned objects remain; export includes
only the caller's technical certificate records, never signing keys.

`lib/security-headers.ts` is the application's single policy definition.
Next document renders are dynamic and nonce-bearing. Inline styles remain
allowed for existing styling/map APIs. The separate public website retains
its static policy; no user HTML is rendered there.

## Consequences

Auth verification adds a network check and dynamic documents cost more than
static pages. Media cannot use a browser cache across changing audiences.
Old devices with no session binding must opt in again. Historical media becomes
owner-only until re-upload or an explicitly reviewed sanitization backfill; this
can hide existing friend avatars and post pictures at rollout. Missing or mismatched
HMAC configuration refuses new photo uploads. Setup and key rotation belong in
DEVELOPMENT.md, not public variables or migrations containing secrets. Historical
originals still need operator cleanup; the app does not silently mutate them.
Storage deletion and account deletion span two services, so a failed final
delete can leave the account with already removed pictures; retry is safe.

Roll out new database migrations and provision the matching server-only media
key before the Edge function and app. The separate limited signing secret adds
an operator-managed boundary; a stolen key needs rotation and certificate review.
Keep the original accepted ADRs as decision history. Tests validate local
behaviour; hosted settings and actual push delivery need operational evidence.
