# Invite links

- **Status:** Agreed (owner asked for invite links on 2026-10-01)
- **Owner:** project owner
- **Related:** [ADR 0006](../adr/0006-friend-requests-by-handle.md), [ADR 0009](../adr/0009-single-use-invite-links.md)

## Problem

Adding a friend needs their exact handle, which people rarely know. Crews
already talk in WhatsApp groups; a link they can drop there is the natural
way in.

## Included

- On the Crew tab, "Invite link" creates a personal link and offers to
  share or copy it.
- Opening the link while signed in shows who invited you and asks you to
  confirm; confirming makes you friends right away.
- Opening it while signed out explains the invite and leads to sign-up or
  sign-in; after that the app brings you back to the confirmation.

## Not included

- Links that add someone to a group or a ride.
- Showing the inviter's name to people who are not signed in.

## Constraints

- One link, one friendship: a link stops working once used, and after 7 days.
- At most 10 open links per person.
- Both sides need a finished profile; blocked pairs cannot connect.
- The token is random and unguessable; the database never lists invites to
  anyone but their creator.

## Acceptance criteria

1. A signed-in user with a finished profile can create a link.
2. Another signed-in user who confirms the link becomes their friend.
3. A used or expired link no longer works, and says so.
4. Your own link does not befriend you.
5. A signed-out visitor sees no name, and after signing in is brought back
   to the confirmation.
6. An eleventh open link is refused.

## Evidence

| Criterion | Shown by |
|---|---|
| 1, 2, 3, 4, 6 | `supabase/tests/database/friend_invites.test.sql` |
| 5 | `features/crew/InviteScreen.test.tsx`, `features/crew/PendingInviteSync.test.tsx` |
