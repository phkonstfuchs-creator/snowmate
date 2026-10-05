# Ski map, resort conditions and location pins

- **Status:** Agreed (owner, 2026-10-05: map and resort data first, modern design)
- **Owner:** Philipp
- **Related:** [ADR 0020](../adr/0020-piste-map-conditions-and-chat-pins.md),
  [live-location](live-location.md), [crew-chat](crew-chat.md)

## Problem

The map showed resort markers on a plain city map: no pistes, no lifts,
no terrain, and conditions only as sample values. Friends could not send
each other an exact meeting point.

## Included

- The map draws pistes (coloured by difficulty) and lifts, with hill
  shading. Opening a resort flies the map there.
- Each resort shows live snow and weather: new snow over 48 hours, snow
  depth (model estimate), temperature at top and valley, wind, and a
  three-day outlook with expected snow. The list shows a one-line summary,
  the header the resort with the most new snow.
- In a chat, "Send my location" sends the current position as a pin. The
  pin opens the Pistl map at that point with the sender's name.

## Not included

- Open lifts and slope status (no open source; the sheet says so).
- Tracking ski days, gamification, swiping for new people, the new design
  (later phases).

## Constraints

- No user data goes to the weather provider; tiles are fetched by the
  browser like the base map.
- Pins follow chat audiences (ADR 0017) and the age rule for location
  (ADR 0019): from 16. Coordinates are readable for 24 hours, then deleted.
- If a provider fails, the rest of the map and app keeps working.

## Acceptance criteria

1. The map loads pistes and terrain only from hosts the CSP allows.
2. Conditions are parsed per resort; a malformed answer gives "not
   available" for that resort, never invented values.
3. The resort sheet shows snow, temperatures, wind, outlook and the source.
4. Friends in a direct chat and ride members can send and see pins; a
   stranger cannot; someone under 16 cannot send one.
5. Pins older than 24 hours show no coordinates and are deleted.
6. The export lists location messages.

## Evidence

| Criterion | Shown by |
|---|---|
| 1 | `components/map/map-style.test.ts` |
| 2 | `features/conditions/conditions.test.ts` |
| 3 | `features/resorts/MapScreen.test.tsx` |
| 4–6 | `supabase/tests/database/chat_location.test.sql`, `features/chat/*.test.ts(x)` |
| Tiles and weather on a phone | manual check after deploy (the dev container has no network to the providers) |
