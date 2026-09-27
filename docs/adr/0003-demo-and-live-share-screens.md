# 0003 Demo and live share one screen per feature

- **Status:** Proposed
- **Date:** 2026-09-25

## Context

`/demo` is the public clickable prototype on fixtures; the signed-in app
needs the same screens on real data. Earlier, demo routes imported app
page files, and screens read fixtures directly.

## Options

1. Two copies of each screen.
2. One screen with an optional `live` prop; without it, the screen falls
   back to fixtures through a hook (`useRideBoard`).

## Decision

Option 2. Routes compose: `app/(app)/x/page.tsx` fetches and passes
`live`, `app/demo/x/page.tsx` passes nothing.

## Consequences

The demo exercises the real UI and the same rules. Screens still import
fixtures for the fallback, which is why the fixture ban in lint applies to
routes and the server boundary, not to screens.
