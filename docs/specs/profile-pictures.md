# Profile pictures

- **Status:** Agreed (owner, 2026-10-05: "Profilbilder", visibility "darf man selber festlegen")
- **Owner:** Philipp
- **Related:** [ADR 0022](../adr/0022-profile-pictures.md)

## Problem

Everyone shows up as initials. Friends want to recognise each other at a
glance.

## Included

- Upload, change and remove a picture in "Edit profile".
- Choose who sees it: friends only (default), or also friends of friends
  and people in the same ride.
- The picture replaces the initials everywhere the app shows the person,
  for viewers allowed to see it; everyone else keeps seeing initials.

## Not included

- Picture moderation beyond reporting a person; galleries; animated
  pictures.

## Constraints

- Minors: friends only, whatever they choose. Blocks hide it both ways.
- No location or camera data leaves the phone; only WebP/JPEG up to 512 KB.
- Pictures are never public URLs.

## Acceptance criteria

1. The owner and friends see the picture; strangers never; friends of
   friends and ride mates only with "contacts"; minors friends-only.
2. A block hides pictures both ways.
3. Only the owner can write their folder.
4. Only real WebP/JPEG bytes up to 512 KB are stored.
5. Deleting the account removes the picture files.

## Evidence

| Criterion | Shown by |
|---|---|
| 1–3 | `supabase/tests/database/profile_pictures.test.sql` |
| 4 | `features/profile/avatar-image.test.ts`, `features/profile/avatar-actions.test.ts` |
| 5 | `features/profile/account-rights.test.ts` |
