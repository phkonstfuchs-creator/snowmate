# 0021 Calm design that matches the website

- **Status:** Accepted (owner, 2026-10-05); lines, shadows and label type
  partly replaced by [0033](0033-clean-surfaces-instead-of-frames.md) (Proposed)
- **Date:** 2026-10-05
- **Replaces:** the "1970s alpine poster on paper" direction described in the
  old header of `app/globals.css`
- **Checks:** `npm run lint`, `npm run typecheck`, `npx vitest run`,
  screenshots of the demo screens at 390 px

## Context

- Testers liked the features but not the cream screen-print look with
  hard black rules.
- A first redesign, dark and sporty (orange accent, pills, glows), was
  judged by the owner to be too busy, too colourful and too much at once.
- It also no longer matched the public website (pistl.app).

## Options

1. Polish the paper look.
2. Dark, sporty design (tried in this PR, rejected by the owner).
3. The website's style: light paper, dark pine ink, one green accent,
   thin lines, small radii, little decoration.

## Decision

Option 3. The token names (paper, ink, rust, …) are kept and re-mapped,
so every screen follows.

- **Palette:** from the website.
  - Background `#f6f7f4`; ink `#202d27`, muted `#59645e`.
  - Accent `#315842`, used sparingly.
  - Lines `#d4dbd3`; soft highlight areas `#e4ebdf`.
- **Type:** Hanken Grotesk for everything. Space Mono only for small
  labels, as on the website.
- **Shape:** 5–14 px radii; buttons as solid ink blocks, as on the
  website. No shadows except under sheets.
- **Less at once:**
  - Ride cards lose the large scene banner and lead with resort, time and
    style.
  - Event banners are smaller.
  - Riding-style tags and avatars use quiet neutrals instead of one
    colour each.
- **Shape layer:** a small block at the end of `globals.css` rounds
  blocks that carry a token border inline (`border: var(--rule-…)`), so
  the screens did not need 130 separate edits.

## Consequences

- Website and app now look like one product.
- The token names no longer describe their colours; the header comment in
  `globals.css` explains the mapping.
- New screens should use the tokens, not new inline borders or colours.
  The shape layer helps with the migration, but new code should not rely
  on it.
