# Ski-day posts and your rides in the profile

- **Status:** Agreed (owner, 2026-10-05: "Deine Rides im Profil … Skitag-Posts: Foto und kurzer Text, nur für Freunde sichtbar. Löschen kannst du deine eigenen, melden die von anderen. Unter 18 gelten dieselben Regeln.")
- **Owner:** Philipp
- **Related:** [ADR 0024](../adr/0024-ski-day-posts.md)

## Problem

After a day on the hill there is nowhere to share it with the crew, and
the profile does not show which rides you have coming up or have done.

## Included

- **Your rides in the profile:** upcoming and recent past rides, whether
  you host them or joined them.
- **Ski-day posts:** a short text (up to 500 characters), optionally one
  photo and a resort.
  - Shown in the feed under "From your crew" and in your own profile.
  - Only you and your confirmed friends see a post.
  - You can delete your own posts (the photo goes with it).
  - You can report or block the author of someone else's post.

## Not included

- Likes, comments, public or region-wide posts, several photos, video.

## Constraints

- **Same rules for minors and adults:** friends only, never friends of
  friends or strangers.
- **Blocks:** a block hides posts both ways.
- **Photo handling:** the phone shrinks the photo to 1600 px and
  re-encodes it, which drops EXIF/GPS. The server takes only WebP/JPEG
  bytes up to 1.5 MB.
- **Storage:** photos sit in a private bucket and are served only through
  the app after the database allows it.
- **Rate limit:** at most 10 posts per day per person.

## Acceptance criteria

1. The author and confirmed friends see a post. Friends of friends,
   strangers and blocked people never do, for minors and adults alike.
2. Only the author can delete a post. Only the author's own folder can
   hold its photo.
3. Text is length- and character-checked, and posting is rate-limited.
4. Only real WebP/JPEG bytes are stored. A photo whose post is refused is
   removed again.
5. Deleting a post or the account removes the photos. Posts are part of
   the data export.
6. The profile lists upcoming and past rides, both hosted and joined.

## Evidence

| Criterion | Shown by |
|---|---|
| 1–3, export | `supabase/tests/database/ski_day_posts.test.sql` |
| 4 | `features/posts/actions.test.ts`, `features/posts/post.test.ts` |
| 5 | `features/posts/actions.test.ts`, `features/profile/account-rights.test.ts` |
| 6 | `features/rides/my-rides.test.ts` |
| UI | `features/posts/PostList.test.tsx`, `features/posts/queries.test.ts` |
