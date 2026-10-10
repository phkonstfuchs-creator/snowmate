# 0043 — Operator facilities separately from OSM ways

Date: 2026-10-10. Status: Accepted within the mountain rebuild stage.

## Context

The Nordkette map contains five passenger lift ways, whereas the operator
lists six facilities. An unnamed magic carpet does not establish the
identity of the operator's Zauberteppich. The Hungerburgbahn is outside
the original extract and uses `railway=funicular`, which the importer
previously ignored. OSM durations also differ from published operator
figures, and two operator pages disagree on the Hungerburgbahn duration.

## Decision

Keep a dated, curated facility inventory in `features/mountain-data`
separate from the dated OSM geometry snapshot. Stable facility ids carry
explicit matched, candidate or missing geometry. Only four associations
supported by source names/local names resolve from a way to a facility.
A candidate does not silently become a confirmed facility. If a subsequent
snapshot removes a referenced lift way, the facility becomes missing.

Show all six operator facilities in the normal map inventory. Missing
or unconfirmed entries open useful source-backed details without moving
the map or highlighting an unrelated way. The unnamed source way remains
available separately. Matched entries retain normal map selection.

Preserve source qualifiers: minimum Seegrubenbahn duration, approximate
Hafelekarbahn duration and conflicting Hungerburgbahn figures. Display
the published departure interval separately, only for the three named
transport sections. None of these records computes queue time, current
operating status, next departure or arrival ETA. Official links carry
the review date; published facts are not live measurements.

Extend both import paths to accept `railway=funicular` and expand the
Overpass query to the city approach. Preserve actual source tags and
reject incomplete geometry. This change itself does not refresh the
snapshot or add station evidence.

## Consequences

Missing facilities are discoverable rather than silently absent. The
facility count cannot be mistaken for a count of verified complete map
lines. The existing lift-meetup ids, database catalog and arrival model
remain separate; no applied migration or live-location contract changes.
Actual funicular geometry, station-node topology and measured durations
remain further work in the [master plan](../specs/mountain-rebuild-plan.md).

Evidence and source audit: [map specification](../specs/ski-map-and-conditions.md),
[pilot data audit](../qa/PILOT_MAP_DATA.md), facility/funicular tests,
map inventory/detail tests and `tests/e2e/piste-map.spec.ts`.
