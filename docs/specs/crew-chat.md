# Crew chat

- **Status:** Agreed (owner approved the scope on 2026-10-05: "ja los")
- **Owner:** Philipp
- **Related:** [ADR 0017](../adr/0017-chat-for-friends-and-ride-crews.md),
  [report-and-block](report-and-block.md)

## Problem

Pistl coordinates ski days, but there is no way to talk inside the app.
People plan in WhatsApp groups instead, and the Crew tab has nothing to
write with.

## Included

- **Direct chat** between two confirmed friends, opened from a friend in
  the Crew tab.
- **Ride chat** for everyone in a ride: the host and every accepted
  rider, opened from the ride.
- The Crew tab lists the caller's chats, newest first, with the last
  message and an unread count; the Crew tab badge counts unread chats.
- A chat shows the latest 50 messages and refreshes every few seconds
  while open. Text only, up to 1000 characters.
- Report or block someone from a chat.

## Not included

- Images, voice, reactions, editing or deleting single messages.
- Push notifications (separate feature).
- Group chats outside a ride, chats with strangers or friends of friends.
- End-to-end encryption.

## Constraints

- Minors and adults alike: only confirmed friends (direct) or confirmed
  members of the same ride (ride chat) can read or write.
- A block in either direction ends a direct chat for both and hides the
  other person's messages in shared ride chats.
- Unfriending ends access to the direct chat; leaving or being removed
  from a ride ends access to its chat. Messages stay for the others.
- Clients cannot read or write the tables; security-definer functions are
  the only way in, with pgTAP tests for every audience rule.
- A person's sent messages are in the data export and are deleted with
  the account.
- At most 30 messages a minute per person.

## Acceptance criteria

1. Friends can open a direct chat, send and read messages; a stranger, a
   friend of a friend and a pending request cannot open, read or write it.
2. The host and accepted riders can use the ride chat; a pending rider,
   a non-member and a former rider cannot.
3. After a block or unfriending, neither side can read or write the
   direct chat; in a ride chat, messages from a blocked person are hidden.
4. Empty, too long or control-character messages are refused; the 31st
   message in a minute is refused.
5. The chat list shows each chat once with its last message and the
   number of unread messages; opening the chat clears them.
6. The data export contains the caller's sent messages; deleting the
   account removes them.

## Evidence

| Criterion | Shown by |
|---|---|
| 1–6 | `supabase/tests/database/messages.test.sql` |
| 4 | `features/chat/message.test.ts` |
| 1, 5 | `features/chat/*.test.ts(x)` |
