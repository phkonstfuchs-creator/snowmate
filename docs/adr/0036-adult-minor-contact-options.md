# 0036 Adult-initiated contact with minors

- **Status:** Proposed; no implementation approved
- **Date:** 2026-10-08
- **Builds on:** [0034](0034-reports-hold-posts-and-friend-request-pauses.md), [0012](0012-age-from-birth-date.md), [0017](0017-chat-for-friends-and-ride-crews.md)
- **Review:** [TEAM_REVIEW.md](../qa/TEAM_REVIEW.md); simulated personas and judge recommendations are decision aids, not real-user or legal evidence
- **Checks:** Planned negative pgTAP and integration tests below; not implemented or run

## Context

The owner rejected an age gate in ADR 0034: minimum age remains 14 and public events remain open to minors. Requests by exact handle, confirmed friendship and public-event chats still provide contact routes between adults and minors. Decline pauses and reporting limit repetition but do not prevent first contact. The judge simulation recommends default denial with exceptions. This proposal preserves the owner's decision history and requires a new approval before any behaviour changes.

## Options considered

1. **Current rules:** exact-handle requests, decline pauses, reporting and blocking. Lowest friction and no new exception administration; unsolicited adult contact remains possible.
2. **Default denial of adult-initiated contact with narrow exceptions:** deny adult-initiated requests and direct messaging to minors, with explicitly defined, revocable exceptions. This addresses unsolicited contact without excluding minors from the product or events. Possible exceptions include an existing confirmed relationship or a minor-initiated request, but neither proves safety. Guardian or coach exceptions would need their own verification and moderation design.
3. **Full age separation:** forbid all adult/minor contact and minor participation in adult events. Stronger separation but excludes mixed-age crews and repeats the broad gate already rejected by the owner.

## Recommendation awaiting approval

Discuss option 2 alongside the separate public-event chat proposal. The owner must choose exceptions, their verification, who may revoke them and treatment of existing friendships/history. Do not grandfather every existing friendship without evaluating the bypass. Unknown age receives restrictive treatment. Birth dates are self-declared: this is a contact policy, not verified age assurance or a claim of legal compliance.

## Constraints and planned checks

Enforce approved rules at every security-definer request/chat read and write, and before notification delivery. Identity comes only from the server session. Group/event routes must not bypass direct-contact rules. Use a new migration; never change applied migrations. Planned pgTAP covers both contact directions, unknown age, forged actor IDs, birthday transitions, expired/revoked exceptions, two-way blocks and membership changes. Integration checks cover honest denial copy and no contact/push leakage.

## Consequences and owner decisions

Approval, legal review, moderator capacity and exception handling are prerequisites. Minimum age 14 is unchanged by this document. Until approval and separately verified implementation, current ADR 0034 behaviour remains in force.
