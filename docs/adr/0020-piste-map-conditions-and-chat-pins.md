# 0020 Piste map, open weather data and chat pins

- **Status:** Accepted (owner chose "Karte + Skigebiet-Daten" first, 2026-10-05)
- **Date:** 2026-10-05
- **Spec:** [ski-map-and-conditions](../specs/ski-map-and-conditions.md)
- **Checks:** `components/map/map-style.test.ts`, `features/conditions/conditions.test.ts`,
  `features/resorts/MapScreen.test.tsx`, `supabase/tests/database/chat_location.test.sql`,
  `features/chat/*.test.ts(x)`

## Context

The owner found the map useless: markers on a city map, no pistes. Live
resort data and exact meeting points were asked for.

## Options

1. Bundle piste data from OpenStreetMap (Overpass) at build time.
2. Raster piste overlay from OpenSnowMap plus open elevation tiles.
3. Paid resort-data APIs (lift status, snow reports).
4. Open-Meteo for snow and weather, fetched by the server and cached.

## Decision

Options 2 and 4.

- **Pistes and lifts:** the OpenSnowMap overlay (OpenStreetMap data)
  over the existing base map. Hill shading comes from AWS open elevation
  tiles (terrarium). Both are added after the style loads, so a failure
  leaves the base map working. The CSP allows exactly these hosts, and a
  test keeps the list in `map-style.ts` in step with `next.config.ts`.
- **Snow and weather:**
  - Open-Meteo, one request for all resorts at their top and valley
    height, cached for 30 minutes on the server.
  - No user data is sent.
  - Snow depth is labelled as an estimate.
  - Lift status is not shown, because there is no open source for it.
- **Chat pins:**
  - Pins are `messages` with `kind = 'location'`, sent through
    `send_location_message`, with the same audiences as chat (ADR 0017).
  - Only from 16, like live location (ADR 0019).
  - Coordinates are rounded to about 1 m, shown for 24 hours and then
    deleted.
  - `list_messages` gained `kind`, `lat` and `lng`.

## Consequences

- Open-Meteo's free API is for non-commercial use. Once Pistl earns
  money, it needs their paid plan (or another source); the provider sits
  behind `features/conditions/`.
- OpenSnowMap is a community service. If it becomes unreliable, option 1
  (self-hosted piste data) is the fallback.
- The dev container cannot reach these providers; tiles and weather are
  checked on a phone after deploy.
