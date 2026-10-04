# Security and privacy

Snowmate handles the location and plans of young people, some of them
under 18. The rules below are enforced in the database; the UI only
explains them. Every rule has negative pgTAP tests in
`supabase/tests/database/`.

## Who sees a ride

| Viewer | Friends ride, adult host | Friends ride, minor host | Public event (host is always adult) |
|---|---|---|---|
| Host | everything | everything | everything |
| Confirmed friend of the host | ride + meeting point, joins directly | ride + meeting point, joins directly | ride; meeting point only after joining |
| Friend of a friend | ride, no meeting point; **asks**, host lets in | nothing | ride; meeting point only after joining |
| Stranger | nothing | nothing | ride; meeting point only after joining |
| Accepted participant | everything, including who else is going | same | same |

- The participant list follows the meeting-point lock; outsiders get a count.
- A pending request takes no spot and unlocks nothing.
- A minor can never host a public event (trigger), and a public event whose
  host is flagged minor never reaches strangers (second line of defence).
- Capacity is checked under a row lock, so the last spot cannot be taken twice.

Source: `supabase/migrations/20260925100000_create_friendships_and_rides.sql`,
decision history in [STRUCTURAL_AUDIT.md](STRUCTURAL_AUDIT.md#visibility-decision)
and [BACKEND_REQUESTS.md](BACKEND_REQUESTS.md).

## Carpools

Stricter than rides, because it means getting into a car:

- No public carpools.
- Friends of friends see a post only when both sides are adults.
- The exact pickup spot goes to the author, confirmed friends and riders
  the author accepted.

See [ADR 0002](adr/0002-stricter-carpool-visibility.md).

## Friend graph

- Friend requests go by exact handle. There is no search over real
  accounts, so minors are not listed for strangers.
- Twenty unanswered outgoing requests stop further ones.
- Posting, joining and asking require a finished profile, so nobody meets
  an anonymous account. See [ADR 0005](adr/0005-require-finished-profile.md).

## Invite links

Single use, valid 7 days, at most 10 open per person. Signed-out visitors
see no name; signed-in visitors see who invited them and must confirm.
See [ADR 0009](adr/0009-single-use-invite-links.md).

## Blocking and reporting

- A block works both ways: neither person sees the other's rides or
  carpools, every friendship, request and participation between them ends,
  and triggers refuse new ones. The blocked person is not told; their
  requests answer as if the handle did not exist.
- Reports go to the operator only (no client can read them), at most 10 a
  day per person, and are reviewed in the Supabase dashboard for now.
- Entry points: ride and event sheets, carpool cards, every person on the
  Crew tab. Blocked people can be unblocked from the Profile tab.

See [ADR 0010](adr/0010-blocking-hides-both-ways.md).

## Minors

`profiles.is_minor` defaults to `true` and clients cannot write it. A
person sets their birth date once on the Profile tab
(`set_my_birth_date()`); the database derives `is_minor` from it and lifts
it after the 18th birthday (`refresh_my_age()`, called on every signed-in
page). Under 14 is refused. The birth date is self-declared, visible only
to its owner and included in the data export. Without one, the narrower
rules above apply. See [ADR 0012](adr/0012-age-from-birth-date.md).

## Live location

Opt-in, for 1, 4 or 12 hours, ends by itself or on Stop. Only confirmed
friends see it; friends of friends, strangers and blocked people never
do. Only the latest position is stored, rounded to about 10 m, no
history; it is part of the data export and goes with the account. A
browser only reports the position while the app is open. See
[ADR 0015](adr/0015-live-location-for-confirmed-friends.md).

## Sign-in and abuse limits

- Passwords: 12+ characters, upper and lower case, a digit; common
  passwords and the email's own name are refused.
- Two-factor sign-in with an authenticator app (Profile tab). With it on,
  a password-only session reaches nothing, enforced in the database
  (`public.check_request`, the PostgREST pre-request hook).
- Limits: sign-in 8 tries per account and visitor and 30 per visitor in 15
  minutes; sign-up, reset, handle checks and codes are limited too; every
  account at most 300 writes a minute in the database.
- Free text may not contain control characters or bidi overrides; React
  escapes all output, nothing renders user text as HTML.
- Confirmation and reset links only redirect to allow-listed app paths.

See [ADR 0013](adr/0013-request-guard-2fa-and-rate-limits.md).

## Account rights (GDPR)

- Art. 15 and 20: `/profile/export` downloads everything stored about the
  caller as JSON (`export_my_data()`).
- Art. 17: "Delete account" removes the auth user; everything else cascades
  (`delete_my_account()`).

## Secrets

Only the three browser-safe values in `.env.example` are used. No
service-role key exists in the app, in CI or in the repository. The
response headers (CSP, frame, referrer, permissions, HSTS) are set in
`next.config.ts` and checked by an e2e test.

## Not yet covered

Chats and squads have no backend.
Do not attach real data to them before they have their own schema,
audience rules and negative tests. Direct messages involving minors need a
product decision on consent and moderation first.
