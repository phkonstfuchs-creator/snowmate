# 0025 Push notifications: queued in the database, sent by an edge function

- **Status:** Accepted (owner asked for push notifications, 2026-10-05)
- **Date:** 2026-10-05
- **Spec:** [push-notifications](../specs/push-notifications.md)
- **Checks:** `supabase/tests/database/push_notifications.test.sql`,
  `supabase/functions/_shared/*.test.ts`, `features/notifications/*.test.ts(x)`,
  `lib/push/dispatch.test.ts`

## Context

Sending a notice means reading other people's push subscriptions. The
app deliberately holds no service-role key ([DEVELOPMENT](../DEVELOPMENT.md#environment),
website README). A notice must never break the write that caused it,
and must not widen who can reach whom.

## Options

1. **Service-role key in the app.** It breaks the "no secrets in the app"
   rule, and any server bug could then read everything.
2. **An RPC that returns recipients' subscriptions to the caller.** It
   leaks other people's push endpoints to every signed-in client.
3. **A queue filled by database triggers, sent by a Supabase edge
   function.** The function gets the service role from its own runtime.

## Decision

Option 3.

- **Triggers:** they fire on `messages`, `friendships` and
  `ride_participants` and call `private.queue_push`, which skips:
  - the actor
  - blocked pairs
  - people without a device
  - duplicates still waiting

  Errors are swallowed, so a notice never fails a write.
- **Queue:** `private.push_outbox` holds only the kind, the actor, the
  recipient and the page. The name is resolved when the notice is sent.
- **Sending:** the `push-dispatch` edge function calls `push_take_outbox()`,
  which is granted only to service_role.
  - It encrypts each notice with RFC 8291 aes128gcm and signs with VAPID
    (RFC 8292), using WebCrypto in its own code. That code is tested
    against the reference implementation and has no npm dependency.
  - It deletes devices the push service reports as gone (404/410).
- **Kick:** after a successful write, the app's server action calls the
  function with `after()`. This adds no latency for the user.
  - The function runs with `verify_jwt = false`. Anyone may call it,
    because a call can only send what is already queued.
  - Notices older than an hour are dropped, so a missed kick never
    delivers stale news.
- **Endpoint allow-list:** only endpoints of FCM, Apple, Mozilla and WNS
  are stored. This is checked in the DB and in the app, and it prevents
  SSRF through a crafted endpoint.
- **Text:** the service worker builds the sentence in the device
  language, from the kind and the name.

## Consequences

- **Setup by the operator:**
  - VAPID keys
  - function secrets
  - `supabase functions deploy push-dispatch`
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` in Vercel

  Until then the feature stays hidden.
- **iOS:** push works only for Pistl added to the home screen (iOS 16.4+).
- **Shared browsers:** signing out does not remove the device. The next
  account that opens settings on that browser takes the subscription
  over. Until then notices for the previous account can arrive; they show
  only a name and a kind.
- **Not yet covered:** carpools and posts.
