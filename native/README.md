# Pistl store apps (iOS and Android)

A Capacitor shell that shows the deployed app at `https://app.pistl.app`
([ADR 0031](../docs/adr/0031-native-apps-with-capacitor.md)). The web code,
server and database stay in the main project; this folder holds only the
native wrappers. Release checklist: [docs/APP_STORE.md](../docs/APP_STORE.md).

## What is where

| Path | What |
|---|---|
| `capacitor.config.ts` | App id `app.pistl`, the allowed origins, the user-agent marker `PistlApp/`, splash, status bar, keyboard |
| `www/offline.html` | The only local page: shown when there is no connection |
| `ios/` | Xcode project (Swift Package Manager, no CocoaPods). `AppDelegate.swift` adds the swipe-back gesture |
| `android/` | Android Studio project |
| `scripts/make-assets.mjs` | Renders icons and splash screens from the wordmark |

Nothing secret belongs in this folder: everything here ships inside the
app download.

## Build on a Mac

Needs Xcode (App Store), Android Studio and Node 22.

```bash
cd native
npm ci
npx cap sync          # copies config and plugins into ios/ and android/
npx cap open ios      # opens Xcode
```

In Xcode:

1. Select the **App** target, then **Signing & Capabilities**, then pick
   your team. This needs the Apple Developer Program.
2. Pick your iPhone as the run target and press Run.
3. For TestFlight: **Product**, then **Archive**, then **Distribute App**.

Push needs the APNs key in the Supabase secrets (see
[DEVELOPMENT.md](../docs/DEVELOPMENT.md)). Builds started from Xcode talk
to Apple's sandbox: set `APNS_HOST=api.sandbox.push.apple.com` while
testing them, and remove it again before TestFlight.

Android: `npx cap open android`, wait for Gradle, then Run.

## After changing icons or the config

```bash
# from the repo root, after npm ci there
PLAYWRIGHT_CHROMIUM_PATH=/path/to/chromium node native/scripts/make-assets.mjs
cd native && npx cap sync
```

## Rules

- Web changes need no new app build: the apps load app.pistl.app.
  Native changes (plugins, permissions, icons) need a new store release.
- Every origin in `server.allowNavigation` gets the native bridge. Add only
  Pistl's own domains.
- New permissions need an honest usage string in `ios/App/App/Info.plist`
  and an update to the privacy labels in `docs/APP_STORE.md`.
