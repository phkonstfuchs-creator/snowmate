# 0011 German and English by cookie, without locale routes

- **Status:** Proposed
- **Date:** 2026-10-01
- **Checks:** `lib/i18n/i18n.test.ts`, `npm run typecheck`

## Context

Snowmate launches in Tyrol and Salzburg. Most riders read German; guests
and seasonal workers read English. The app had English copy with a few
German strings mixed in.

## Options

1. Locale in the URL (`/de/feed`) with a routing library.
2. A cookie (`sm_locale`), falling back to `Accept-Language`, then English;
   a small in-house dictionary with typed keys.

## Decision

Option 2. The signed-in app is not indexed by search engines, so URLs per
language buy nothing, and a cookie keeps every existing route, redirect
and test unchanged. The switch lives on the Profile tab. Dictionaries are
plain objects: `de` is typed `Record<MessageKey, string>`, so a missing key
fails the typecheck, and a test checks that placeholders match.

Rule modules return keys rather than text, so they stay free of React and
Next; the server boundary translates them. Dates use `en-GB` and `de-AT`.

## Consequences

- The landing page and demo-only screens (chats, squads, people search,
  season pass) stay English until they get real data.
- Adding a third language means one more dictionary file and one entry in
  `LOCALES`.
- Delete confirmation accepts both "delete" and "löschen".
