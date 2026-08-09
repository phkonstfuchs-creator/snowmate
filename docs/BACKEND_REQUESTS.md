# Backend requirements from the frontend track

Maintained by the frontend branch (`claude/frontend-beta`). Everything the
frontend needs but **must not change itself** lands here: files under
`supabase/`, auth logic, RLS, and existing DTO or server-action contracts.

Convention: every entry names the **need**, the **why**, and today's
**workaround** in the frontend. Resolved items move to *Done* rather than
being deleted, so the history stays readable.

Status: `OPEN` · `IN PROGRESS` · `DONE`

---

## 1. Feed, Map, Carpool, Crew and Events run on fixtures

**Status:** OPEN
**Affects:** new tables plus read access; today `lib/data/mock-data.ts`

Only sign-in, sign-up and sign-out actually talk to Supabase. Every content
screen renders static fixtures. Read access is needed for:

- **Rides** (`RidePost`): resort, meeting time, meeting point, riding style,
  total and taken spots, text, author, region, and `visibility`
- **Participation** in a ride (join / leave)
- **Public events**: same shape as a ride with `visibility = 'public'`,
  plus `title` — see item 3, which is a hard prerequisite
- **Resort status** (`ResortStatus`): riders now, snow depth, open lifts,
  altitude, snow conditions
- **Carpools** (`CarpoolPost`): driver or seeker, origin, destination, time,
  free seats
- **Crew**: friend list, open requests, accept / decline
- **Conversations** and messages
- **Profile numbers**: XP, level, days, resorts, streak, badges, regional
  season ranking

**Why:** without real data the app can be demonstrated but not used.

**Workaround today:** `lib/data/mock-data.ts`. The shapes in `lib/types.ts`
are already defined cleanly and can serve as a template for the schema.

**Please:** keep field names close to `lib/types.ts`, otherwise we need a
translation layer everywhere.

---

## 2. Friend-graph visibility is text, not enforcement

**Status:** OPEN
**Affects:** RLS rules

The crew screen promises: *"Friends of friends see rides at resort level.
The exact meeting point only becomes visible after you join."* Today that is
a claim in the UI and nothing else.

**Why:** location data of minors. The join must be enforced server-side, not
filtered in the client, otherwise the exact meeting point sits in the API
response regardless.

**Workaround today:** `features/rides/visibility.ts` models the rule as a
tested function and returns `meetPoint: null` while no join exists. That is
presentation, not enforcement — the fixtures still carry every field.

See item 3: for public events the same gap weighs considerably more, because
strangers are reading along.

---

## 3. Public events need server-side visibility

**Status:** OPEN — **highest priority of everything on this page**
**Affects:** schema for `rides`, RLS rules, read DTO

With the *Events* screen (`/events`) there is content visible **without any
friendship** for the first time. That removes the previous protective
assumption: until now every reader was at least a friend of a friend. On a
public event the whole world reads along.

### Field needed

```
rides.visibility  enum('friends','public')  not null  default 'friends'
```

`default 'friends'` is deliberate: forgetting the field yields the narrower
visibility, not the wider one.

### Rules to enforce

| # | Rule | Why |
|---|---|---|
| 1 | `meet_point` is **not delivered** while the requesting person has not joined | A client-side filter is not enough: the meeting point would still be in the API response and readable from the network console |
| 2 | With `visibility = 'public'`, friendship alone does **not** lift the lock — only joining does | Otherwise joining an event would mean nothing |
| 3 | `visibility = 'public'` is forbidden when the host is a minor | Minors must not broadcast to strangers. As a **check constraint or trigger**, not only as a policy |
| 4 | Joining is checked server-side against `total_spots` | Otherwise a concurrent request overbooks the event |
| 5 | An event hosted by a minor never appears in the public list, even if the flag was set wrongly | Second line of defence in case rule 3 was bypassed |

### Suggested read contract

Two separate views rather than one field that is sometimes populated and
sometimes not:

- `rides_public` — without `meet_point`, for the list
- `rides_joined` — with `meet_point`, only for participants who joined

That way the field cannot be shipped by accident in the first place.

**Why this is the most important item:** every other gap on this page is
about convenience or wording. This one is about the precise location of a
possibly underage person, exposed to strangers.

**Workaround today:** `features/rides/visibility.ts` with `toVisibleRide`,
`canPostPublicRide` and `isDiscoverablePublicRide`, covered by
`features/rides/visibility.test.ts`. The function strips `meetPoint` out of
the object by destructuring rather than merely hiding it — reliable inside
the prototype, worthless against a real server. On top of that the public
toggle in `PostRideModal` is disabled for minors, which is trivially
bypassed client-side.

**Non-negotiable:** before real user data is attached to `/events`, rules 1
to 3 must exist as negative pgTAP tests.

---

## 4. No access to the signed-in account's profile data

**Status:** OPEN

Onboarding collects region, riding style, display name and handle and stores
them in `localStorage` under `sm_onboarding_draft`. After sign-up the draft
is **never read back** — the answers are lost.

**Why:** the user enters data that disappears without trace. From their
point of view, that is a bug.

**Workaround today:** the `localStorage` entry is simply left behind.

**Needed:** a profile table plus a server action to adopt the draft once the
account is confirmed.

---

## 5. Payments for trips and carpool seats

**Status:** OPEN — not urgent, listed so the shape is known early

The business model (see `PRODUCT.md`) rests on transactions: 3% on the
volume of a university ski club trip, 0.99 € per matched carpool ride. None
of that exists. Before any of it is built, the following need decisions:

- Payment provider and whether Snowmate ever holds funds. Handling other
  people's money changes the regulatory picture substantially, and the
  operator is a minor running a sole proprietorship
- Refunds and cancellations for trips, which is the actual hard part
- Whether the trip organiser is a Snowmate account or a separate role

**Why it is here:** the frontend already names prices on the landing page
and in the profile. Those are labelled as a hypothesis everywhere. Nothing
in the UI must start suggesting a payment is possible before this is real.

---

## Done

### Server-side auth messages were German

**Resolved:** with the switch of the whole interface to English, the German
strings in `features/auth/actions.ts` and `features/auth/credentials.ts`
became the mismatch instead of the fix. They were translated back to
English. Text only — `AuthActionState` and `CredentialFieldErrors` keep
their signatures.

**Note for later:** if you ever want more than one language, fixed strings
are the wrong contract. An error code per case (`invalid_credentials`,
`email_taken`, …) would carry, and the frontend would translate.
