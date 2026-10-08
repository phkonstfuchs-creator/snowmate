# 0037 Public events without automatic stranger chat

- **Status:** Proposed; no implementation approved
- **Date:** 2026-10-08
- **Builds on:** [0017](0017-chat-for-friends-and-ride-crews.md), [0034](0034-reports-hold-posts-and-friend-request-pauses.md)
- **Related:** [0036](0036-adult-minor-contact-options.md)
- **Checks:** Planned pgTAP and integration tests below; not implemented or run

## Context

Accepted public-event participants can access a ride chat with strangers, including adults and minors. Joining for mountain logistics should not automatically establish permission for stranger conversation. The owner has not approved changing this behaviour.

## Options considered

1. Keep the current shared ride chat with reporting and blocking. Simple coordination, but contact follows joining automatically.
2. Make public events logistical announcements from the host, with voluntary communication requiring a separate approved consent policy. Preserves coordination and removes automatic participant-to-participant contact.
3. Remove event messaging entirely and use editable event details. Smallest communication surface, but urgent changes are harder to communicate.

## Recommendation awaiting approval

Discuss option 2. Define whether host messages are moderated logistical announcements and whether participants may reply privately or publicly; neither reply permission is implied here. Stranger chat opt-in and any adult/minor exception require separate explicit approval. Friendship must not silently opt a minor into a mixed stranger group.

## Constraints and planned checks

Joining must not grant generic ride-chat authorization for public events. Hiding UI or creating a conversation lazily is insufficient: opening, listing and sending chat messages must enforce the policy in security-definer RPCs. Identity remains session-derived. Preserve meeting-point locking and review whether participant handles are needed beyond logistics. Define existing chat/history migration, membership removal, notification payloads and revocation before implementation. New migration only.

Planned pgTAP checks distinguish friends-only rides from public events; stranger/minor/adult, host, pending, accepted and former participant roles; direct RPC calls; forged actor IDs; blocks; notification rechecks; and old conversation IDs. Integration checks ensure joins communicate their permissions honestly and logistical updates remain usable.

## Consequences

Host announcements can still facilitate harmful contact and require reporting/moderation. The owner must approve the communication model and transition before implementation. Current chat behaviour remains until then.
