# 0036 Adult-initiated contact with minors

- **Status:** Accepted by the owner on 2026-10-08 (option 2 with the parameters below); legal review pending
- **Date:** 2026-10-08
- **Builds on:** [0034](0034-reports-hold-posts-and-friend-request-pauses.md), [0012](0012-age-from-birth-date.md), [0017](0017-chat-for-friends-and-ride-crews.md)
- **Review:** [TEAM_REVIEW.md](../qa/TEAM_REVIEW.md); simulated personas and judge recommendations are decision aids, not real-user or legal evidence
- **Checks:** `supabase/tests/database/adult_minor_contact.test.sql` (pgTAP, 16 checks); migration `20261031090000_adults_cannot_ask_under_16.sql`

## Context

The owner rejected an age gate in ADR 0034: minimum age remains 14 and public events remain open to minors. Requests by exact handle, confirmed friendship and public-event chats still provide contact routes between adults and minors. Decline pauses and reporting limit repetition but do not prevent first contact. The judge simulation recommends default denial with exceptions. This proposal preserves the owner's decision history and requires a new approval before any behaviour changes.

## Options considered

1. **Current rules:** exact-handle requests, decline pauses, reporting and blocking. Lowest friction and no new exception administration; unsolicited adult contact remains possible.
2. **Default denial of adult-initiated contact with narrow exceptions:** deny adult-initiated requests and direct messaging to minors, with explicitly defined, revocable exceptions. This addresses unsolicited contact without excluding minors from the product or events. Possible exceptions include an existing confirmed relationship or a minor-initiated request, but neither proves safety. Guardian or coach exceptions would need their own verification and moderation design.
3. **Full age separation:** forbid all adult/minor contact and minor participation in adult events. Stronger separation but excludes mixed-age crews and repeats the broad gate already rejected by the owner.

## Recommendation (before the owner's decision)

Discuss option 2 alongside the separate public-event chat proposal. The owner must choose exceptions, their verification, who may revoke them and treatment of existing friendships/history. Do not grandfather every existing friendship without evaluating the bypass. Unknown age receives restrictive treatment. Birth dates are self-declared: this is a contact policy, not verified age assurance or a claim of legal compliance.

## Decision (owner, 2026-10-08)

Option 2, with these parameters:

- **Protected:** riders under 16, and accounts without a birth date (they already count as minors everywhere else; a birth date can be set once and never removed).
- **Rule:** an adult (18+) cannot send a protected rider a friend request. 16- and 17-year-olds are not adults and are not restricted.
- **Exception:** the protected rider may ask the adult; the adult may accept.
- **Existing friendships:** stay, without a notice. Pending requests from before the rule also stay.
- **Answer to the adult:** `not_found`, the same as an unknown or blocked handle, so a request cannot be used to find out who is young.

Not changed, because they need no change:

- Invite links: the younger rider redeems the link themselves, which counts as their own request.
- Discovery: it only pairs riders of the same age band.
- Direct chat: it needs an accepted friendship.

Out of scope here: public-event chats (ADR 0037).

## Constraints and checks

Enforce approved rules at every security-definer request/chat read and write, and before notification delivery. Identity comes only from the server session. Group/event routes must not bypass direct-contact rules. Use a new migration; never change applied migrations. pgTAP covers both directions, unknown age on both sides, 16- and 17-year-olds, existing friendships, the 16th birthday, blocks, the private helper and anonymous callers. A new friendship needs a request, so no push is sent for a refused one.

## Consequences and owner decisions

Minimum age 14 is unchanged. Legal review of adult–minor contact is still open. Adults who want to ride with a younger rider ask them to send the request; the copy for this is a possible follow-up.
