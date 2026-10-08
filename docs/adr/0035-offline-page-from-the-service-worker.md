# 0035 Offline page from the service worker

- **Status:** Proposed
- **Date:** 2026-10-08
- **Amends:** [0025](0025-push-notifications.md) ("No caching, no
  offline mode" in `public/sw.js`)
- **Spec:** usability protocol task 3 and the rule "bad signal: no dead
  end", in `docs/qa/USABILITY_PROTOCOL.md`; finding #7 of
  [TEAM_REVIEW.md](../qa/TEAM_REVIEW.md)
- **Checks:** `features/notifications/service-worker.test.ts`,
  `features/notifications/RegisterServiceWorker.test.tsx`

## Context

Without signal, switching tabs in the web app showed the browser's error
page ("No internet"). The tab bar disappeared, and the only way back was
the browser itself. The worker existed only for push and was registered
only when someone turned push on.

## Options considered

1. Cache signed-in pages and show the last state. Rejected: those pages
   hold private data and are `no-store` on purpose. A cache would keep
   them on shared devices after sign-out.
2. Cache a static offline page at install. Works, but needs a cache to
   keep and to clear.
3. **Chosen:** answer a failed page load with a page made by the worker
   itself, with no cache at all.

## Decision

- **Fallback:** The worker passes every page load (GET navigation) to the
  network. Only when that fails does it answer with a small page:
  - "Kein Netz" / "No signal", in the device's language
  - a link to try the same address again
  - the four tabs (Today, Map, Crew, Profile)
- **No caching:** Nothing is cached. The answer is `no-store`. Any
  request that is not a page load is left alone.
- **Registration:** Every signed-in browser registers `/sw.js`
  (`RegisterServiceWorker` in the app layout), not only browsers with
  push turned on.
- **Store apps:** They do not register it. Their shell has its own
  offline page (ADR 0031).

## Consequences

- Push behaviour is unchanged. The same worker still shows notices, and
  a new version takes over at once (`skipWaiting`, `clients.claim`).
- **Open:** "The last state stays visible with 'updated 3 min ago'" is
  still open. It would need a cache of private data, so it needs its own
  decision.
