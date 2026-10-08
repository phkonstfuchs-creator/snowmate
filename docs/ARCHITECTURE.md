# Architecture

How Pistl is put together, who owns what, and which boundaries are
enforced. Decisions and their reasons live in [adr/](adr/); this page
describes the result.

## Shape of the system

```text
Browser ──► Next.js (app/ routes, server components, server actions)
                │
                ├─ features/<feature>/queries.ts   reads   ─┐
                ├─ features/<feature>/actions.ts   writes  ─┤─► Supabase Postgres
                └─ proxy.ts (session refresh)               │   (RLS + security-definer
                                                            │    functions, see below)
Browser ◄── feature screens (client components) ◄───────────┘
```

- **Next.js 16** with route groups: `app/(public)` for sign-in, sign-up and
  onboarding, `app/(app)` for the signed-in product, `app/demo` for the
  clickable prototype. Route groups do not change URLs.
- **Supabase** provides auth (email and password, SSR cookies via
  `@supabase/ssr`), Postgres and one edge function that sends push
  notices (ADR 0025). There is no other backend.
- Identity always comes from the server session, never from a client-supplied id.
  The proxy and protected layout verify `auth.getUser()`; SQL uses `auth.uid()`
  and rejects missing/revoked session ids. `getClaims()` in a data boundary
  is used only together with a database call that enforces that session guard.

## Responsibilities

| Place | Owns | Must not |
|---|---|---|
| `app/**/page.tsx`, `layout.tsx`, `route.ts` | Entry points: fetch with queries, pass data into a screen | Be imported by anything else |
| `app/demo/**` | Compose the same screens without `live` data, so they fall back to fixtures | Talk to Supabase |
| `features/<f>/*Screen.tsx`, sheets | Feature UI; client state | Query the database directly |
| `features/<f>/use*.ts` | Client hooks (e.g. `useRideBoard`: one code path for demo and live) | Be imported by rules or the server boundary |
| `features/<f>/queries.ts` | Server-side reads, shaping rows into UI types | Import fixtures, UI or hooks |
| `features/<f>/actions.ts`, `*-actions.ts` | Server actions: validate input, call the database, revalidate | Import fixtures, UI or hooks |
| `lib/native-app.ts` | Recognise the store apps by their user-agent marker, to hide web-only things | Grant or deny access (any client can send any user agent) |
| `lib/server-action.ts` | Shared plumbing for actions: `isUuid`, `rpcOutcome` (an allow-listed outcome or `"unavailable"`) | Be a `"use server"` module, take a user id as input |
| `features/<f>/*.ts` (everything else) | Business rules: validation (`*-input.ts`), mapping (`live-*.ts`), capacity, visibility | Import React, Next, Supabase, fixtures, hooks or UI |
| `components/` | Reusable presentation; receives data and callbacks as props | Own business rules, read fixtures |
| `components/ui/Sheet.tsx` | The bottom sheet for new sheets: overlay, exit motion, focus trap, Escape, scroll lock | Be copied as raw `sheet-panel` markup |
| `features/demo/` | UI that exists only in the prototype (sample profiles, chats) | Be used by signed-in routes |
| `lib/resorts.ts`, `lib/lifts.ts` | Attributed reference data: resorts and lifts covered, coordinates and durations | Carry sample conditions |
| `lib/data/` | Prototype fixtures only | Be read by signed-in routes or the server boundary |
| `lib/i18n/` | Locale choice, the en/de dictionaries, `getT()` (server) and `useT()` (client) | Hold business rules |
| `supabase/migrations/` | Schema, grants, RLS, security-definer functions | Be edited once applied; add a new migration instead |
| `supabase/functions/` | Edge functions that need the service role (only `push-dispatch`, ADR 0025); shared crypto and dispatch rules in `_shared/` are unit-tested | Return anyone's subscriptions or queue contents to clients |

## Session and browser boundary

The application has no browser Supabase client. Auth cookies are HttpOnly,
Secure in production and SameSite=Lax. A fresh server nonce in `proxy.ts`
protects scripts; `lib/security-headers.ts` owns the policy. Document rendering
is dynamic so that a nonce is never shared through a static cache. Private
media responses are never cached. The server-only `lib/media-attestation.ts`
certifies newly sanitized immutable Storage objects with a limited private HMAC
key. Database policies require the certificate for friend reads and new media
references. Setup and rotation are in [DEVELOPMENT.md](DEVELOPMENT.md#private-media-signing-key). See [ADR 0030](adr/0030-session-and-media-security.md).

## Text and languages

Every user-facing string in the signed-in app, auth, onboarding, invites
and safety flows is a key in `lib/i18n/messages/en.ts`; `de.ts` must have
the same keys and placeholders (type plus `lib/i18n/i18n.test.ts`). Rule
modules return keys (counts as `"v.max|120"`), server actions translate
with `getT()`, screens with `useT()`. Never hard-code copy in a screen.
See [ADR 0011](adr/0011-cookie-based-i18n.md).

## Demo and live share one screen

Each feature screen takes an optional `live` prop. The signed-in route
passes data from `queries.ts`; the `/demo` route passes nothing and the
screen falls back to fixtures. Hooks such as `useRideBoard` hide the
difference, so the demo exercises the same UI and the same rules. See
[ADR 0003](adr/0003-demo-and-live-share-screens.md).

## Database access model

Clients never select from the social tables (`friendships`, `rides`,
`ride_participants`, `carpools`, `carpool_requests`). Their table grants
are revoked. Reads go through security-definer functions that apply the
audience rules row by row and null out fields the caller may not see:

| Function | Returns |
|---|---|
| `list_rides()` | Visible rides; `meet_point` and participants only for people allowed in |
| `list_carpools()` | Visible carpools; `departure_point` only for friends and confirmed riders |
| `list_my_friendships()` | The caller's own friend graph |
| `my_nav_counts()` | Every navigation badge (requests, unread chats) and whether the age flag needs a refresh, in one read-only call; replaces `my_pending_counts()` and `my_unread_chats()` in the app |
| `list_my_conversations()`, `list_messages()` | The caller's chats and their messages, members only ([ADR 0017](adr/0017-chat-for-friends-and-ride-crews.md)) |
| `export_my_data()` | Everything stored about the caller |

Writes that need a rule check are functions too (`join_ride`,
`respond_ride_request`, `update_ride`, `request_friendship`,
`request_carpool`, `delete_my_account`, …). Plain inserts of your own ride
or carpool use a column grant plus an RLS policy. The audience rules
themselves are in [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md); why
functions rather than views is [ADR 0001](adr/0001-read-social-data-through-functions.md).

Day boundaries follow Europe/Vienna, in SQL (`private.local_today()`) and
in the app (`toIsoDay`). See [ADR 0004](adr/0004-vienna-day-boundaries.md).

## Enforced boundaries

`eslint.config.mjs` turns the "Must not" column above into errors, and
`tests/unit/architecture.test.ts` checks that each rule still rejects a
deliberate violation:

| Rule | Where it applies | What it rejects |
|---|---|---|
| Routes are entry points | everywhere | imports from `@/app/…` |
| Real data stays separate from fixtures | `app/(app)/**`, queries, actions | `@/lib/data` |
| Components get data as props | `components/**` | `@/lib/data` |
| Business rules stay independent | `features/**/*.ts` except queries, actions, hooks | React, Next, Supabase, `@/components`, hooks, `*Screen`/`*Sheet`/`*Modal` |
| The server boundary returns data | queries, actions | React, `@/components`, hooks |
| Protected data has an audience | database | pgTAP tests in `supabase/tests/database/` |

If a rule blocks something that should be allowed, change the rule and
this page together, in the open, with an ADR. Do not add an inline
`eslint-disable` to get past it.

## Related

- [DEVELOPMENT.md](DEVELOPMENT.md): setup and commands
- [TESTING.md](TESTING.md): what is tested where
- [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md): audiences, minors, location
- [BACKEND_REQUESTS.md](BACKEND_REQUESTS.md): what the backend still owes the frontend
- [STRUCTURAL_AUDIT.md](STRUCTURAL_AUDIT.md): the July audit and the original visibility decision
