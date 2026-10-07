# 0025 Push notifications: queued in the database, sent by an edge function

- **Status:** Accepted (owner asked for push notifications, 2026-10-05)
- **Date:** 2026-10-05
- **Security revision:** 2026-10-07 (authenticated dispatch and session-bound devices)
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

- **Triggers:** they fire on `messages`, `friendships`,
  `ride_participants` and lift meetups and call `private.queue_push`, which skips:
  - the actor
  - blocked pairs
  - people without a device
  - duplicates still waiting

  Errors are swallowed, so a notice never fails a write.
- **Queue:** `private.push_outbox` holds only the kind, the actor, the
  recipient and the page. The name is resolved when the notice is sent.
- **Sending:** the `push-dispatch` edge function calls
  `push_take_session_outbox()` with the verified user's id and signed JWT
  session id. The RPC is granted only to service_role; it checks the Auth
  session and takes only that actor's queued notices, with bounded batches.
  - The database rechecks current blocks before delivery. A lift notice also
    requires an active status, an eligible rider and a confirmed friendship.
  - It encrypts each notice with RFC 8291 aes128gcm and signs with VAPID
    (RFC 8292), using WebCrypto in its own code. That code is tested
    against the reference implementation and has no npm dependency.
  - It deletes devices the push service reports as gone (404/410).
- **Kick:** after a successful write, the app's server action gets the current
  user access token and calls the function with `after()`. This adds no push
  send latency for the user. The function verifies the bearer token through
  Supabase Auth before it touches the service-role queue. The signed JWT's
  `session_id` and Auth user id are then checked again in the database.
  Missing or invalid credentials get 401; successful requests get an empty
  204 response, with no global activity count.
  - The function runs with `verify_jwt = false` at the gateway because newer
    publishable-key and signing-key projects are verified in the handler.
    This setting does not make dispatch public.
  - Notices older than an hour are dropped, so a missed kick never
    delivers stale news.
- **Endpoint allow-list:** only endpoints of FCM, Apple, Mozilla and WNS
  are stored. This is checked in the DB and in the app, and it prevents
  SSRF through a crafted endpoint.
- **Text:** the service worker builds the sentence in the device
  language, from the kind and the name.
- **Device ownership:** a browser endpoint cannot be claimed by a different
  account. Settings show an existing subscription as on only when it belongs
  to the current session. Sign-out removes this browser's endpoint and
  unsubscribes it. Dispatch ignores devices whose Auth session is gone.

## Consequences

- **Setup by the operator:**
  - VAPID keys
  - function secrets
  - `supabase functions deploy push-dispatch`
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` in Vercel

  Until then the feature stays hidden.
- **iOS:** push works only for Pistl added to the home screen (iOS 16.4+).
- **Shared browsers:** an explicit sign-out disconnects this browser's push
  endpoint. If the browser misses the sign-out cleanup, a later account cannot
  silently take over the old endpoint; opening settings unsubscribes it.
- **Residual limit:** a stolen but unexpired user JWT can still call the
  function until Auth rejects that token. The database releases no notices
  once the corresponding session is gone. During an active session, the
  caller can dispatch only its own queued notices and receives no queue data
  or activity count. Operational abuse limits at the gateway remain useful.
- **Not yet covered:** carpools and posts.
