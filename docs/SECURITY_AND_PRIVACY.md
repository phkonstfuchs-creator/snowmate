# Security and privacy

Pistl handles the location and plans of young people, some of them
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
- Swipe discovery (ADR 0028) is opt-in and needs a birth date. Age
  bands 14–15, 16–17 and adults never see each other. Under 18 the deck
  holds only friends of friends, so minors are never shown to strangers.
  Adults see opted-in adults of their region. Likes stay secret; a
  mutual like makes a friendship. Blocks, existing friendships and
  requests keep people out; a pass hides someone for 30 days; 100
  swipes a day.
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

## Profile pictures

Optional. The browser crops the picture to 512 px and re-encodes it.
The server independently decodes and re-encodes WebP/JPEG, dropping EXIF/GPS
metadata and refusing malformed files or more than 16 million decoded pixels.
The input and output are limited to 512 KB. Pictures sit in the
private `avatars` bucket, one folder per account, and only the owner
writes there.

Who sees a picture is checked by `can_see_avatar()` for every read: the
owner, confirmed friends, and, if the owner chose "contacts", friends of
friends and people in the same ride. Minors' pictures are friends-only
whatever they chose, and a block hides them both ways. The app serves
pictures from its own `/avatar/<id>` route, so browsers never get a
storage URL. Storage permits a friend to read only the owner's currently referenced,
server-attested immutable avatar, with the same audience, session and MFA
rules. Old orphaned and unattested paths are denied. Owners retain access to
their own files for cleanup; that does not make raw files shareable.
Private media responses use no-store. Deleting the account removes the files. See
[ADR 0022](adr/0022-profile-pictures.md).

## Ski-day posts

Short text, an optional photo and a resort. Only the author and confirmed
friends see a post. This applies to minors and adults alike, and a block
hides posts both ways (`private.can_see_posts_of`). Photos are shrunk and
re-encoded on the phone and independently decoded/re-encoded by the server,
dropping EXIF/GPS and bounding decoded pixels. Input and output are limited
to 1.5 MB. Photos are stored in the private
`post-photos` bucket and served only through `/post-photo/<id>` after
`post_photo_path_for()` allows it. Posting is limited to 10 a day. The
author can delete a post, and its photo goes with it. Other people's
posts can be reported through report and block. Posts are in the data
export, and account deletion removes the photos. Storage permits friends to read only server-attested immutable photos still
attached to visible posts. New avatar/post references require that certificate.
A private HMAC key certifies the exact owner/object-id/bucket/path/time tuple;
clients cannot forge certificates or overwrite certified files. Deleted object
ids cannot be reused. Existing unattested originals remain owner-only until
re-upload or reviewed sanitization; do not assume that old stored files are
metadata-free. Certificates are included in the owner export and deleted with
the account. See
[ADR 0024](adr/0024-ski-day-posts.md).

## Ski-day tracking

Started and finished by the person on the map. The GPS track stays on the
device: it is held in memory and, while recording, in this browser's
storage tied to the account id, and is deleted on finish or explicit logout.
Legacy or other-account recordings are discarded; switching accounts stops
the old GPS watch. Only the summary is saved, and only
the owner sees it: times, resort, distance, vertical, top speed and
runs. The app and the database refuse implausible values, and at most 5
days can be saved per 24 h. The export lists the days, and account
deletion removes them. See [ADR 0026](adr/0026-ski-day-tracking.md).

## Leaderboards

Only season totals leave the database, through `public.leaderboard()`:
vertical, kilometres, days or top speed. Single days and times never do.
The friends board shows the caller and confirmed friends who did not
switch "show me to friends" off; a block hides both ways. The regional
board is opt-in (off by default) and limited to the caller's region.
People under 18 appear there without name, handle, picture or id,
except to themselves. Stamps are computed on the owner's own data and
are not stored or shown to others. See
[ADR 0027](adr/0027-leaderboards-and-stamps.md).

## Push notifications

Opt-in per device, in the profile settings. The device's Web Push
subscription goes into `push_subscriptions`, which clients cannot read.
Only endpoints of the browser push services (Google, Apple, Mozilla,
Microsoft) are accepted, so the sender can never be pointed at another
host. Database triggers queue a notice when someone writes to you, asks
to be friends or accepts, or asks for, joins or lets you into a ride. A
block in either direction stops the notice. The notice carries only its
kind, the sender's display name and the page to open, never message
text. It is encrypted for the device (RFC 8291), so the push service
cannot read it.

A lift-meetup start or replacement queues a generic notice for subscribed
confirmed friends. It contains no lift, station, coordinates or ETA.
Stopping withdraws pending notices. Dispatch checks the current status,
age, friendship, two-way block and expiry again before sending.

The `push-dispatch` edge function verifies a user bearer token and uses a
service-only session-scoped RPC to take only that actor's queued notices.
The database rechecks the source session, recipient sessions and blocks.
The push service role stays inside Supabase; no Supabase service-role key
belongs in the app.
The response is empty and reveals no activity count. Notices
older than an hour are dropped. Devices the push service reports as gone
are deleted. Each person keeps at most 10 devices. Account deletion
cascades, and the export lists the devices. Devices are bound to the login
session that opted in. Logout removes this browser's subscription and ends
location announcements; revoked sessions receive no further queued push.
Existing unbound devices must opt in again. See
[ADR 0025](adr/0025-push-notifications.md).

## Live location

Opt-in, for 1, 4 or 12 hours, ends by itself or on Stop. Only confirmed
friends see it; friends of friends, strangers and blocked people never
do. Only the latest position is stored, rounded to about 10 m, no
history; it is part of the data export and goes with the account. A
browser only reports the position while the app is open. Sharing starts
at 16 (by birth date; without one, only an account marked adult); younger
users still see their friends' positions. See
[ADR 0015](adr/0015-live-location-for-confirmed-friends.md) and
[ADR 0019](adr/0019-live-location-from-16.md).

Map tiles come from OpenFreeMap (fallback: CARTO). Like any web map, the
tile server sees the visitor's IP address and which map area is loaded,
never the stored position or who is sharing. The browser fetches tiles
directly; the CSP allows only these hosts. Pistes and lifts come from
OpenSnowMap and hill shading from AWS open elevation tiles, on the same
terms. Snow and weather come from Open-Meteo, fetched by the server
without any user data. Resort photos come from Wikipedia/Wikimedia
Commons, fetched and resized by the server (next/image), so browsers
never contact Wikimedia; only freely licensed JPEGs are used, with the
author and licence from Wikimedia's metadata shown under each photo
(ADR 0023). All third-party data, pictures, fonts and software are
listed with their licences on `/lizenzen`. See
[ADR 0016](adr/0016-vector-map-and-faster-navigation.md) and
[ADR 0020](adr/0020-piste-map-conditions-and-chat-pins.md).

## Lift meetup status

Announcing “I'm taking this lift now” reveals the rider's approximate position.
Sharing starts at 16 under the same age check as live location. Only the
rider and confirmed friends can see the current lift, destination station and
estimated arrival; a block in either direction or unfriending hides it
immediately. A status ends on Stop or after 30 minutes. Expired rows are
purged on the next status read or start; without another request they remain
stored until account deletion, while never becoming visible again. The server
stores the lift identifier and timestamps, not a GPS track. A viewer's own
position is used only on their device to suggest a lift and is never sent with
the status request. Lift travel data is an attributed static OpenStreetMap
snapshot; waiting time is an explicitly labeled heuristic, not a measured
queue. The status is included in the owner's data export and deleted with the
account. See [ADR 0029](adr/0029-lift-meetup-estimates.md).

## Chat

Direct chats only between confirmed friends; ride chats only for the host
and accepted riders. A block or unfriending closes a direct chat for both,
and a block hides that person's messages in shared ride chats. Text up to
1000 characters, 30 messages a minute. A position can be sent as a pin
from 16 (like live location); its coordinates are readable for 24 hours
and then deleted. Messages are not end-to-end
encrypted; they are in the export and go with the account. See
[ADR 0017](adr/0017-chat-for-friends-and-ride-crews.md).

## Sign-in and abuse limits

- Passwords: 12+ characters, upper and lower case, a digit; common
  passwords and the email's own name are refused.
- Two-factor sign-in with an authenticator app (Profile tab). With it on,
  a password-only session reaches nothing, enforced in the database
  (`public.check_request`, the PostgREST pre-request hook).
- The proxy and protected layout verify the current Auth user. The database
  rejects missing/revoked sessions. Restrictive Storage RLS repeats session
  and MFA checks because Storage bypasses the PostgREST hook.
- Changing a password revokes other Auth sessions. Reset and resend email
  targets also have hashed per-instance quotas and generic reset responses.
- Limits: sign-in 8 tries per account and visitor and 30 per visitor in 15
  minutes; sign-up, reset, handle checks and codes are limited too; every
  account at most 300 writes a minute in the database.
- Free text may not contain control characters or bidi overrides; React
  escapes all output, nothing renders user text as HTML.
- Confirmation and reset links only redirect to allow-listed app paths.
- Sign-up is confirmed with the emailed code (or its link). Codes are
  limited to 8 tries per address and 20 per visitor in 15 minutes.
- Media uploads are limited per account before image decoding. Ride and
  carpool planning dates must be from today through 365 days ahead.

These in-memory app limits are per server instance. They supplement Supabase
limits; distributed bot protection still requires hosted rate limits/CAPTCHA.

See [ADR 0013](adr/0013-request-guard-2fa-and-rate-limits.md).

## Imprint and privacy policy

`/impressum` (§ 5 DDG) and `/datenschutz` (Art. 13 GDPR) are public pages;
operator data lives in `features/legal/operator.ts`. The privacy policy
must change with every new kind of data, processor or audience rule.

## Account rights (GDPR)

- Art. 15 and 20: `/profile/export` downloads everything stored about the
  caller as JSON (`export_my_data()`).
- Art. 17: "Delete account" removes the auth user; everything else cascades
  (`delete_my_account()`). The application checks Storage list/remove errors
  first; the RPC refuses deletion while owned media remains, so retry cannot
  silently strand orphaned files.

## Secrets

The app uses browser-safe values in `.env.example`, including the optional
public VAPID key. Configuration rejects service-role/secret keys in public
Supabase variables. Photo uploads additionally use a limited server-only
`MEDIA_ATTESTATION_KEY` generated in a private database table and provisioned
out-of-band. This key can certify sanitized media but cannot read user data;
its exposure would require rotation and review of media certificates. It must
never enter public variables, preview projects using a different database or
Git. Setup and rotation live in [DEVELOPMENT.md](DEVELOPMENT.md#private-media-signing-key).
The separate website's waitlist has server-only
Supabase/Resend credentials; they must never use a NEXT_PUBLIC name or enter
Git. CI uses a local test stack and placeholders, never production secrets.

Response headers (CSP, frame, referrer, permissions, HSTS) live in
`lib/security-headers.ts`. The proxy creates a fresh script nonce per request;
Next document rendering is dynamic. Production scripts require the nonce,
inline styles remain permitted for existing CSS/map APIs. Auth cookies are
HttpOnly, Secure in production and SameSite=Lax. Browser tests check the
built production app as well as the development server.

## Audit and operations

[SECURITY_AUDIT.md](SECURITY_AUDIT.md) records reviewed findings, tests and
remaining operational work. Source visibility is not an access control:
private data is protected by sessions, grants, RLS and audience functions.
No confirmed production credential was found in the scanned tracked source
or reachable history. This does not verify the operator's private credentials,
dashboard MFA, backup restoration, deployed schema or provider contracts.

Squads remain a prototype. Real social features require their own audience
rules and denied-access tests before receiving real data.
