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

## Selectable Nordkette map — 2026-10-10

The production map and demo now use the same bundled, source-backed
Nordkette geometry as the design experiment. The map's **Pistes & lifts**
action opens a searchable inventory: five mapped lift lines and 25 mapped
piste sections. Repeated winter names keep their separate section identities.
Selecting a line on the map or a list row opens its difficulty, source
snapshot and OSM revision; closing the details keeps the selected line
highlighted. The inventory remains usable if map tiles or WebGL are unavailable.

This is partial coverage, as documented in the [pilot data audit](../qa/PILOT_MAP_DATA.md).
It does not meet the full resort-inventory gate. Unknown operating status
and queues stay unavailable. Numeric OSM lift durations are rounded and
explicitly unverified; they are not arrival predictions. Official Nordkette
operating-status and webcam links are available in the details, without
loading or mirroring external media.

The source data and conversion live in `features/mountain-data`. Existing
preview imports use compatibility wrappers; there is only one raw snapshot.
Public geometry selection never starts tracking, location sharing or a
lift-meetup. No source-way ID is treated as a verified meetup lift ID.

Evidence: shared catalog and converter tests, `components/map/SkiMap.test.tsx`,
`features/resorts/MountainFeature*.test.tsx`, `MapScreen.test.tsx` and
`tests/e2e/piste-map.spec.ts` cover source identity, selection, source failure,
localized inventory/details, region boundaries, 320/390px and accessibility.

## Nordkette facility inventory and published times — 2026-10-10

The normal map inventory lists the six facilities on the operator's dated
inventory even when geometry is missing. Four name/local-name associations
resolve to existing source ways; Hungerburgbahn is missing and the unnamed
magic carpet is an unconfirmed Zauberteppich candidate. Candidate/missing
entries open details and operator links without inventing a map focus.
The unnamed OSM lift remains separately selectable. Piste fragment counts
remain separate from operator facility counts.

Published operator durations retain their meaning: Seegrubenbahn minimum
6.5 minutes; Hafelekarbahn approximately four minutes (source says just
under four); Hungerburgbahn six versus eight minutes on two operator pages,
therefore unresolved. The first three transport sections have a published
15-minute departure interval, with continuous operation possible at high
demand. Chairlifts/carpet have no inferred interval or operator duration.
OSM estimates, queue time and operational status remain distinct. Review
date is 10 October; the unchanged geometry snapshot remains 9 October.

Both import paths accept `railway=funicular`; the Overpass query now covers
the city approach. No successful refresh was available in this slice, so
the 30-way snapshot is unchanged. No station positions or meetup ids are
derived from this inventory. [ADR 0043](../adr/0043-source-backed-mountain-facilities.md)
records the boundary. Tests must cover six discoverable facilities,
missing/candidate details, no invented focus, source-qualified times,
search/filter behaviour and 320/390px accessibility.

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
