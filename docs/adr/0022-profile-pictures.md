# 0022 Profile pictures in private storage, served by the app

- **Status:** Accepted (owner asked for pictures with a self-chosen audience, 2026-10-05)
- **Date:** 2026-10-05
- **Spec:** [profile-pictures](../specs/profile-pictures.md)
- **Checks:** `supabase/tests/database/profile_pictures.test.sql`,
  `features/profile/avatar-*.test.ts`, `features/profile/queries.test.ts`

## Context

Pictures are personal data, and Pistl is used by minors. Showing them must
follow the same audience rules as the rest of the profile.

## Options

1. A public bucket: simple, but anyone with the URL sees every picture.
2. A private bucket, and the browser gets signed storage URLs.
3. A private bucket, and the app serves pictures from its own route after
   the database allows it.

## Decision

Option 3.

- **Storage:** private bucket `avatars`. Each account writes only its
  own folder (storage policies).
- **Audience:** `can_see_avatar(owner)` decides who may see a picture.
  The storage read policy uses the same function, so the rule is
  enforced twice.
- **Serving:** `/avatar/<id>` asks `avatar_path_for()`, downloads the
  file with the viewer's session and returns it.
  - There is no third-party host in the CSP.
  - Picture URLs cannot be shared.
  - The response is cached privately for 2 minutes; "no picture" is not cached.
- **Upload:** the browser crops to 512 px and re-encodes the picture,
  which drops EXIF data. A server action checks the magic bytes and size,
  uploads, and deletes the previous file.
- **Display:** `Avatar` tries the picture for real account ids and keeps
  the initials when the route answers 404. This needs no extra data in
  the screens.

## Consequences

- Each avatar on screen is one small request to the app; browser caching
  keeps repeats cheap. A batch endpoint can come later if needed.
- Account deletion removes the files through the storage API before the
  account goes, because storage rows do not cascade.
- The local DB test harness gained a minimal `storage` schema; CI runs
  against real Supabase storage.
