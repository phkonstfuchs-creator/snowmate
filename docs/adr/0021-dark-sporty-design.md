# 0021 Dark, sporty design

- **Status:** Accepted (owner chose "Modern & sportlich" on 2026-10-05; testers found the old look off-putting)
- **Date:** 2026-10-05
- **Replaces:** the "1970s alpine poster on paper" direction described in the
  old header of `app/globals.css`
- **Checks:** `npm run lint`, `npm run typecheck`, `npx vitest run`,
  screenshots of the demo screens at 390 px

## Context

Every feature worked, but testers did not like the cream, screen-print
look with hard black rules. The owner asked for a modern, sporty design
in the spirit of Strava or Slopes, with a dark mode.

## Options

1. Polish the paper look.
2. Rewrite every screen for a new design system.
3. Keep the token names and re-map them to a dark palette. Add a
   central shape layer for the inline borders the screens already use.

## Decision

Option 3.

- **Palette:** blue-black surfaces (`--paper-*`), light text (`--ink-*`),
  hot orange accent (`--rust`), ice blue for live (`--sky`), green and
  amber for success and reward. `--on-bright` is for text on bright fills.
- **Shape:** rounded cards (16–24 px), pill buttons and toggles, soft
  shadows instead of hard offsets, bold sans numbers instead of mono.
- **Shape layer:** a small block at the end of `globals.css` rounds
  blocks that carry a token border inline (`border: var(--rule-…)`). It
  turns accent buttons into pills, so screens did not need 130 edits.
  Top and bottom rules stay straight.
- **Components:** the resort scenes become gradient skies over layered
  ridges, and the map markers become round badges. Button, Input,
  SegmentedControl and Tag were updated directly.

## Consequences

- The token names (paper, ink, rust) no longer describe their colours;
  the header comment in `globals.css` explains the mapping. A rename can
  follow later.
- New screens should use radii and colours from the tokens, not new
  inline borders; the shape layer is a migration aid, not the pattern.
- The light piste map stays light for legibility of the piste colours.
