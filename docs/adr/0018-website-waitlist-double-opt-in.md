# 0018 Double opt-in for the website waitlist

- **Status:** Accepted (owner asked for it, 2026-10-05)
- **Date:** 2026-10-05
- **Spec:** `website/README.md` (Warteliste aktivieren)
- **Checks:** `supabase/tests/database/website_waitlist.test.sql`,
  `website/tests/waitlist-server.test.mjs`, `website/tests/landing.spec.mjs`

## Context

The waitlist on pistl.app stored any address typed into the form. Anyone
could sign up someone else, and an email to such an address would not be
covered by that person's consent. In Germany, consent to emails is
expected to be proven with a confirmation by the address owner.

## Options

1. Keep single opt-in and write to the list only after launch.
2. Double opt-in: store the signup as pending, email a link, count only
   confirmed addresses.
3. Confirm with the link alone (GET) instead of a button on the page.

## Decision

Option 2, with a button instead of option 3.

- The website server creates a random 256-bit token, stores only its
  SHA-256 digest through `pistl_request_waitlist`, and emails the link via
  Resend. The sender and the link's base address come from configuration,
  never from the request.
- The link opens `/warteliste/bestaetigen`; only the POST from its button
  confirms (`pistl_confirm_waitlist`). Mail scanners that open links do
  not confirm on someone's behalf. A link works once and for seven days.
- One email per address every five minutes; the existing five attempts an
  hour per visitor digest stay. When the email fails, the token is released
  so the next attempt can send at once, and the form says it failed.
- New, pending, already confirmed and "just sent" all get the same answer,
  so the form does not reveal who is on the list. The open form cannot
  change a confirmed signup.
- Unconfirmed signups are deleted after seven days.

## Consequences

- Resend becomes a processor for the website; the privacy policy names it.
  Two more server-only settings: `RESEND_API_KEY`, `WAITLIST_FROM_EMAIL`.
- Signups stored before this change are unconfirmed and are deleted by the
  seven-day clean-up; those people sign up again.
- Emails to the list may only use rows with `confirmed_at` set.
