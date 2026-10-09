# 0041 Isolated mountain design preview and sourced pilot geometry

- **Status:** Accepted for Phase A preview (owner: “Let’s go”, 2026-10-09). Production navigation, native location and new plan storage remain proposed in the linked master plan.
- **Date:** 2026-10-09
- **Spec:** [Mountain rebuild plan](../specs/mountain-rebuild-plan.md)
- **Evidence:** [Pilot source audit](../qa/PILOT_MAP_DATA.md), `features/mountain-preview/*.test.tsx`, `features/mountain-preview/data/*.test.ts`, `tests/e2e/mountain-preview.spec.ts`.

## Context and options

The owner requested a major redesign, adolescent skier journeys, usable independent Go planning, prominent reunions, better ski maps, replay, offline areas and webcams. The accepted first stage is a clickable journey and real map-data experiment. Replacing signed-in screens immediately would imply new backend and native capabilities before their privacy/data contracts exist. A drawing alone would not test map selection or the planning journey.

## Decision

Expose an explicitly labeled, noindex German design preview at `/preview/mountain`, implemented only by `features/mountain-preview`. It never imports account queries/actions, requests GPS, sends invitations or changes a real sharing preference. Private preview day drafts remain in React memory for this page session; creating another draft preserves earlier drafts. Crew, RSVP, discovery, sharing controls and replay are marked examples/simulations. They are not signed-in feature screens and the temporary German copy does not replace the existing bilingual app dictionaries.

Keep MapLibre and its existing permitted tile hosts. Import a small source-backed OSM Nordkette extract outside runtime; bundle attributed GeoJSON with stable way ids, revision metadata and source tags. Reject malformed way geometry rather than bridging missing vertices. Reject empty/invalid imports and replace the snapshot atomically. Operational status and field-validated travel/queue times are absent, not inferred. A demo replay follows one OSM geometry excerpt using synthetic playback progress; it is not a user's GPS track. Official webcams open their operator pages; no camera media is mirrored or embedded.

## Consequences

The first design is immediately testable without extending any real audience or promising closed-page background location. Existing app and demo screens continue unchanged. A later production implementation must move accepted copy to i18n, connect session-bound contracts, preserve minor/block rules, use genuine timestamped own tracks and validate native background behavior. Offline map packages remain explicitly unavailable until provider rights and integrity/storage checks are complete. The pilot's 30 ways and five aerialway geometries do not prove six-facility coverage or completeness of whole pistes. This ADR supplements, without superseding, production ADRs 0039/0040.
