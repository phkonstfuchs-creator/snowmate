# Push notifications

- **Status:** Agreed (owner, 2026-10-05: "füge push notis ein")
- **Owner:** Philipp
- **Related:** [ADR 0025](../adr/0025-push-notifications.md)

## Problem

People only find out about a message, a friend request or a ride join
when they open Pistl.

## Included

- A per-device switch in the profile settings, off by default.
- Notices for:
  - a new chat message (direct or ride chat)
  - a friend request, and a request that was accepted (including invites)
  - for hosts: someone asks to join or joins your ride
  - for riders: the host let you into the ride
- Tapping a notice opens the right page (chat, crew, feed).
- On iPhone, a hint that push needs Pistl on the home screen (iOS 16.4+).

## Not included

- Per-category settings, quiet hours, email notices, carpool notices,
  notices for posts.

## Constraints

- **Same audience as today:** only people who could already reach you
  that way cause a notice. A block in either direction stops it.
- **Minimal content:** no message text, only who and what. The payload is
  end-to-end encrypted to the device.
- **No secrets in the app:** the service role and the private VAPID key
  stay in Supabase.
- **Safe endpoints:** the server only ever sends to browser push services.

## Acceptance criteria

1. Nothing is stored or sent until the person switches push on. Switching
   off removes the device.
2. Clients cannot read subscriptions or the queue, nor take it.
3. Only push-service endpoints with well-formed keys are stored; at most
   10 devices per person.
4. A message, friend request or accept, and ride request, join or accept
   queue one notice for each other person concerned. Nothing is queued
   for the actor, for someone without a device, or between blocked
   people. Repeats wait as one notice.
5. A queued notice is sent encrypted (RFC 8291) with VAPID (RFC 8292).
   It contains the kind, the name and the page, nothing else.
6. Devices reported gone (404/410) are deleted. Notices older than an
   hour are dropped.
7. The export lists the devices; account deletion removes them.

## Evidence

| Criterion | Shown by |
|---|---|
| 1 | `features/notifications/PushSettings.test.tsx`, `features/notifications/actions.test.ts` |
| 2–4, 7 | `supabase/tests/database/push_notifications.test.sql` |
| 3 | `features/notifications/push-subscription.test.ts` |
| 5 | `supabase/functions/_shared/web-push.test.ts`, `supabase/functions/_shared/push-notice.test.ts` |
| 6 | `supabase/functions/_shared/push-notice.test.ts`, migration `push_take_outbox` |
| Dispatch after writes | `lib/push/dispatch.test.ts` |
