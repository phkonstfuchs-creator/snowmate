# 0024 Ski-day posts: friends only, private photos served by the app

- **Status:** Accepted (owner asked for friends-only posts with photo, same rules under 18, 2026-10-05)
- **Date:** 2026-10-05
- **Spec:** [ski-day-posts](../specs/ski-day-posts.md)
- **Checks:** `supabase/tests/database/ski_day_posts.test.sql`,
  `features/posts/*.test.ts(x)`, `features/profile/account-rights.test.ts`

## Context

Posts carry photos and free text from minors and adults. They must not
become a public channel or a way for strangers to reach anyone.

## Decision

- **Table:** `public.posts`, with forced RLS and no table grants.
  Clients use only security-definer functions: `create_post`,
  `delete_my_post`, `list_post_feed` and `post_photo_path_for`.
- **Audience:** a single rule, `private.can_see_posts_of(author, viewer)`,
  which allows the author and confirmed friends and excludes blocks.
  There is deliberately no "contacts" option and no age split: everyone
  gets the narrowest audience.
- **Photos:** a private `post-photos` bucket with one folder per account,
  following the [ADR 0022](0022-profile-pictures.md) pattern.
  - The storage read policy calls `can_see_post_photo()`, so the rule is
    enforced in storage too.
  - `/post-photo/<id>` serves the file and is cached privately for 1 hour.
  - The server action uploads first and then creates the post. If the
    database refuses the post, it removes the file.
- **Moderation:** reporting reuses report-and-block against the author
  ([report-and-block spec](../specs/report-and-block.md)). There is no
  separate per-post report yet.
- **Server action body limit:** raised to 2 MB, so a 1.5 MB photo fits.

## Consequences

- An unfriend or block takes effect immediately for the feed. A photo the
  browser already cached can stay visible to that person for up to an hour.
- Account deletion removes the post photos through the storage API
  (storage rows do not cascade).
- Posts are in `export_my_data`.
