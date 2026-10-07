# 0031 Native iOS and Android apps: a Capacitor shell around app.pistl.app

- **Status:** Proposed
- **Date:** 2026-10-07
- **Checklist:** [APP_STORE.md](../APP_STORE.md)
- **Related:** [ADR 0025](0025-push-notifications.md) (push), [ADR 0026](0026-ski-day-tracking.md) (tracking), [ADR 0030](0030-session-and-media-security.md) (sessions, CSP)

## Context

Pistl is a Next.js web app and PWA. The owner wants it in the App Store
first and in the Play Store after that. Two things do not work well enough
on the web:

- Tracking a ski day needs GPS while the phone is locked. A web page loses
  location in the background.
- Web Push on iOS works only for a PWA added to the home screen.

Apple rejects apps that are "just a website" (guideline 4.2). It also
reviews user-generated content (1.2), account deletion (5.1.1(v)) and
purchases (3.1.1).

## Options

1. **Rewrite natively** (Swift/Kotlin or React Native). This means two new
   codebases and every rule duplicated outside the server boundary. It is
   too slow for one developer.
2. **Capacitor shell that loads the deployed app.** The WebView shows
   `https://app.pistl.app`. The server, session cookies, CSP and every
   security-definer function stay exactly as they are. Native plugins add
   the missing parts.
3. **Capacitor with a bundled static export.** Server actions, the proxy
   and server-rendered pages do not work in a static export, so the app
   would need to be rebuilt.

## Decision (proposed)

Option 2:

- **Shell.** The WebView loads only Pistl origins (`app.pistl.app`, and
  `pistl.app` for legal pages). Any other link opens in the system
  browser. There are no secrets in the native project. The session stays
  in the same HttpOnly cookies as on the web.
- **Native features.** These are also what keep the app clear of 4.2:
  - Background location for an active ski day only, with an honest usage
    string. The track still stays on the device; the server still gets
    only the summary.
  - Native push: APNs on iOS, FCM on Android. A second sender reads the
    existing `private.push_outbox`. The device token is stored like a web
    subscription: tied to the session and removed on sign-out.
  - Native share sheet and haptics.
- **Detection.** The app sends a fixed user-agent suffix, so the server
  can hide web-only things inside the native app: the PWA install hint,
  web push settings and the `/demo` Season Pass price.

## Consequences

- Each new device-token or native-location path needs its own spec, and
  pgTAP tests where it touches the database.
- Web and native release together, because the native app shows the
  deployed web app. A breaking server change reaches the apps at once.
- The Apple review checklist in [APP_STORE.md](../APP_STORE.md) must be
  green before the first submission.
