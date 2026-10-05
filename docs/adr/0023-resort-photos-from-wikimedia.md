# 0023 Resort photos from Wikimedia, with automatic credits

- **Status:** Accepted (owner asked for resort photos, "alles copyright … richtig", 2026-10-05)
- **Date:** 2026-10-05
- **Checks:** `features/resorts/resort-photo.test.ts`, `features/resorts/MapScreen.test.tsx`

## Context

The first tester wanted photos of the resorts. The owner wants no
copyright risk. Photos from search engines or the resorts' own sites
need permission and are out.

## Options

1. Hand-picked photos with credits typed in. This needs network access
   from the development container, and typed credits can be wrong.
2. Licensed stock photos: a cost, and licence terms per use.
3. The lead image of each resort's German Wikipedia article, with
   licence, author and source read from Wikimedia's file metadata at
   runtime.

## Decision

Option 3.

- **Which photos:** only JPEG photos under CC0, CC BY, CC BY-SA or public
  domain, without restrictions. Logos and maps (SVG/PNG), GFDL-only,
  NC/ND and restricted files are dropped.
- **Credits:** author, licence (linked), source (linked) and "cropped"
  are shown under each photo, as the licences ask.
- **Delivery:** the server fetches the metadata, cached for a week.
  `next/image` fetches the pictures from `upload.wikimedia.org` (exactly
  that host and path) and serves them from Pistl. Browsers never contact
  Wikimedia, and the CSP stays `img-src 'self'`.
- **Fallback:** a missing article, an unsuitable image or a failure keeps
  the drawn illustration.

## Consequences

- Some lead images may be summer or village views. A curated file per
  resort can replace the article image later, still with metadata from
  Wikimedia.
- `/lizenzen` lists all third-party content with licences. The map's
  attribution now also names the terrain data sources.
