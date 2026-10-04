# 0016 Vector map, Frankfurt region and instant tab switches

- **Status:** Proposed
- **Date:** 2026-10-04
- **Spec:** [live-location](../specs/live-location.md)
- **Checks:** `components/map/map-style.test.ts`, `npm run build`
  (CSP and config), manual check on a phone

## Context

On the owner's phone the map did not load and every tap felt slow.
Three causes:

1. Leaflet drew raster tiles with a CSS filter over the whole tile pane,
   which is expensive on mobile Safari, and gave no fallback when tiles
   failed.
2. Vercel functions ran in the default US region while the database is
   in Frankfurt (eu-central-1). Every page render made several
   transatlantic round trips.
3. App screens had no loading state and the client cache kept dynamic
   pages for 0 s, so each tap waited for the full server render, even
   when going back to a tab seen a moment ago.

## Options

- Map: keep Leaflet and drop the filter; MapLibre GL with vector tiles
  from a keyless provider (OpenFreeMap); a commercial provider with an
  API key (Mapbox, MapTiler).
- Speed: move functions next to the database; cache data on the server
  (`use cache`); loading states plus a short client cache.

## Decision

- MapLibre GL with OpenFreeMap vector tiles (positron style, tinted to
  the paper palette in code). GPU rendering keeps pinch-zoom and panning
  smooth. If the style has not loaded after 7 s or fails, the map
  switches to CARTO raster tiles. No API key, no account, no secret.
- `vercel.json` pins functions to `fra1`, next to the database.
- `app/(app)/loading.tsx` (and one for the map) shows a skeleton the
  moment a tab is tapped. `experimental.staleTimes.dynamic = 30` keeps a
  visited tab for 30 s; every write refreshes or revalidates, which
  clears it.
- Server-side data caching was not chosen: the data is per viewer and
  visibility rules live in the database; caching it is a larger change.

## Consequences

- OpenFreeMap is a free community service without an SLA; CARTO is the
  fallback. A paid provider can replace the style URL later without code
  changes beyond `components/map/map-style.ts` and the CSP.
- The tile servers see IP and viewed map area (see
  SECURITY_AND_PRIVACY.md).
- Data from friends (rides, requests) can appear up to 30 s late on a tab
  you return to; reopening the app or any own action shows it at once.
- The map needs WebGL; devices without it get a message instead.
- MapLibre 6 loads its tile worker by URL. `scripts/copy-maplibre-worker.mjs`
  copies it to `public/vendor/maplibre/` before every dev and build run
  (not committed), so CSP stays `worker-src 'self' blob:`.
