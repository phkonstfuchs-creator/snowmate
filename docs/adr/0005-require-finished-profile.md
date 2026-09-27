# 0005 Taking part requires a finished profile

- **Status:** Proposed
- **Date:** 2026-09-25

## Context

An account that signed up but never finished onboarding could post, join
and send friend requests, appearing to others as "Rider" without a handle.

## Decision

Posting (insert policies), joining, asking for a seat and friend requests
require `onboarding_completed`. Functions answer `profile_incomplete`; the
feed links to the profile.

## Consequences

One more step before first use; the onboarding draft is adopted
automatically after sign-up, so most people never see it.
