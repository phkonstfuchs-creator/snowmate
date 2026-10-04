# 0017 Chat for confirmed friends and ride crews

- **Status:** Proposed
- **Date:** 2026-10-05
- **Spec:** [crew-chat](../specs/crew-chat.md)
- **Checks:** `supabase/tests/database/messages.test.sql`,
  `features/chat/*.test.ts(x)`

## Context

The owner asked for a way to write with friends inside the app. Pistl is
used by minors, so who can message whom matters more than features.

## Options

1. Open messaging: anyone can write to anyone by handle.
2. Direct chats only between confirmed friends, plus one chat per ride for
   its confirmed members.
3. Supabase Realtime on a messages table with row-level policies.
4. Security-definer functions only, the client polls every few seconds.

## Decision

Options 2 and 4.

- **Who can talk:**
  - A direct chat exists only for two confirmed friends and ends, for both
    people, with a block or unfriending.
  - A ride chat belongs to the host and the accepted riders.
  - A block hides that person's messages in shared ride chats.
- **How data flows:**
  - Three tables, all closed to clients: `conversations`, `messages` and
    `conversation_reads`.
  - Every function checks membership on every call, as with rides
    (ADR 0001).
- **Updates:** while a chat is open, the client polls `list_messages` with
  `since` every 4 s. That keeps the audience rules in one place and needs
  no Realtime policies.
- **Limits:** text only, 1 to 1000 characters, the same safe-text rules as
  other free text, and at most 30 messages a minute per person.

## Consequences

- Polling costs one small request per open chat every 4 s. Realtime can
  replace it later behind the same functions.
- No push notifications yet: a message is seen when the app is open
  (unread badge on the Crew tab).
- Messages are not end-to-end encrypted. They are stored like the rest of
  the data, are part of the export and go with the account.
- Unfriending or a block keeps the messages but closes the chat. Deleting
  the account removes the person's messages and their direct chats.
