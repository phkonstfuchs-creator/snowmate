# Architecture decision records

Why the system is shaped the way it is. One file per decision, numbered,
never deleted: a replaced decision is marked Superseded and links its
replacement.

Status is **Proposed** until the owner approves it, then **Accepted**.

| # | Decision | Status |
|---|---|---|
| [0001](0001-read-social-data-through-functions.md) | Read social data through security-definer functions | Accepted |
| [0002](0002-stricter-carpool-visibility.md) | Carpools are stricter than rides | Accepted |
| [0003](0003-demo-and-live-share-screens.md) | Demo and live share one screen per feature | Accepted |
| [0004](0004-vienna-day-boundaries.md) | Day boundaries follow Europe/Vienna | Accepted |
| [0005](0005-require-finished-profile.md) | Taking part requires a finished profile | Accepted |
| [0006](0006-friend-requests-by-handle.md) | Friend requests by exact handle, capped | Accepted |
| [0007](0007-friends-of-friends-ask-to-join.md) | Friends of friends ask; the host lets them in | Accepted |
| [0008](0008-enforce-boundaries-in-lint.md) | Enforce architecture boundaries in lint | Accepted |
| [0009](0009-single-use-invite-links.md) | Single-use invite links | Accepted |
| [0010](0010-blocking-hides-both-ways.md) | Blocking hides both ways and ends every connection | Accepted |
| [0011](0011-cookie-based-i18n.md) | German and English by cookie, without locale routes | Accepted |
| [0012](0012-age-from-birth-date.md) | Age from a self-declared birth date | Accepted |
| [0013](0013-request-guard-2fa-and-rate-limits.md) | Request guard, two-factor sign-in and rate limits | Accepted |
| [0014](0014-profile-at-sign-up-and-several-styles.md) | Profile at sign-up and several riding styles | Accepted |
| [0015](0015-live-location-for-confirmed-friends.md) | Live location for confirmed friends | Accepted |
| [0016](0016-vector-map-and-faster-navigation.md) | Vector map, Frankfurt region and instant tab switches | Accepted |
| [0017](0017-chat-for-friends-and-ride-crews.md) | Chat for confirmed friends and ride crews | Accepted |
| [0018](0018-website-waitlist-double-opt-in.md) | Double opt-in for the website waitlist | Accepted |
| [0019](0019-live-location-from-16.md) | Live location only from 16 | Accepted |
| [0020](0020-piste-map-conditions-and-chat-pins.md) | Piste map, open weather data and chat pins | Accepted |
| [0021](0021-calm-design-matching-the-website.md) | Calm design that matches the website | Accepted |
| [0022](0022-profile-pictures.md) | Profile pictures in private storage, served by the app | Accepted |
| [0023](0023-resort-photos-from-wikimedia.md) | Resort photos from Wikimedia, with automatic credits | Accepted |
| [0024](0024-ski-day-posts.md) | Ski-day posts: friends only, private photos served by the app | Accepted |
| [0025](0025-push-notifications.md) | Push notifications: queued in the database, sent by an edge function | Accepted |

Template: context, options considered, decision, consequences, status.
