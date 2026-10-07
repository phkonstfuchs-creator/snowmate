# 0033 Clean surfaces instead of frames

- **Status:** Proposed (owner direction 2026-10-07; awaits the owner's
  look at the screenshots in the PR)
- **Date:** 2026-10-07
- **Builds on:** [0021](0021-calm-design-matching-the-website.md). Its
  palette direction and token names stay; its "thin lines, no shadows,
  Space Mono labels" rules are replaced here.
- **Spec:** the usability pass in `docs/qa/USABILITY_PROTOCOL.md`
- **Checks:** `npm run lint`, `npm run typecheck`, `npx vitest run`
  (including the new panel tests in `features/resorts/MapScreen.test.tsx`
  and `features/profile/ProfileScreen.test.tsx`), the runtime sweep in
  `docs/qa/DEBUG_PROTOCOL.md`, screenshots of the demo screens at 390 px

## Context

- The owner: the app "looks bad and is not clean to use".
- The two biggest problems named were frames and boxes, and too much on
  one screen.
- The owner's direction: "Apple clean", keep the colours in principle;
  the palette may be refined.
- Every box drew a 1 px line around itself, often nested. Small labels
  were all-caps Space Mono. Map and Profile stacked four or five panels.

## Options

1. Keep the paper look and only space things out.
2. Rewrite each of about 90 framed boxes in its screen.
3. Change the tokens and one surface layer in `globals.css`, so every
   framed box becomes a card at once. Restructure only the two crowded
   screens.

## Decision

Option 3.

**Surfaces**
- Canvas `#f2f4f1`, cards `#ffffff`, one fill `#e9ede7` for inputs, chips
  and secondary buttons.
- The accent is a slightly fresher pine, `#2b6448`.
- A box with an inline `border: var(--rule-thin|thick)` or
  `1px solid var(--border-subtle)` gets three things:
  - a transparent border, so no layout moves
  - a soft shadow
  - an 18 px radius, unless it has its own
- Inside a card or a sheet, such a box is a flat fill instead of a
  second card.
- New code uses `.surface` and `.surface-fill` directly.

**Lines**
- Single hairlines (top or bottom) stay.
- The rule under screen headers is gone, as in iOS large titles.

**Type**
- Small labels are sentence case in Hanken Grotesk, 13 px semibold. No
  all-caps anywhere.
- Space Mono stays only for codes, handles and links.
- The region switch is an iOS-style segmented control.

**One accent**
- Black (ink) action buttons become the green accent.
- Icon buttons and small tags are round.

**One part at a time**
- *Map:* lift meetup first (unchanged, ADR 0029), then the map. Under
  the map, a switch between "Ski day" and "My location" replaces two
  stacked panels. It opens on location while sharing is on.
- *Profile:* a centred head (picture, name, handle) instead of a
  two-line poster name. A switch between Season, Rides and Posts shows
  one part at a time. An empty part suggests the next step.

## Consequences

- Fewer lines and less text per screen.
- Like 0021's shape layer, the surface layer depends on how the screens
  write their inline styles. Moving screens to `.surface` stays the goal.
- `features/profile/hero-name.ts` was removed with its test; nothing
  else used it.
- Contrast was re-checked: muted text (5.6:1) and placeholders (4.8:1)
  pass AA on canvas and fill, and white on the accent is 7:1.
