# 0040 Private Go wishes on existing rides

- **Status:** Accepted (owner authorized merge and production release in this chat, 2026-10-09)
- **Date:** 2026-10-09
- **Spec:** [Pistl Go](../specs/pistl-go.md)
- **Supersedes:** The unimplemented forecast-intent recommendation in [ADR 0038](0038-pistl-go-conditional-intents.md).
- **Checks:** Go DTO/query/action/component tests, ride action refusal tests, `supabase/tests/database/ride_go.test.sql`, `tests/e2e/pistl-go.spec.ts` and the existing full release checks.

## Decision

Attach an owner-private wish to an existing authorized ride. Use the actual confirmed group and an optional actual accepted carpool seat rather than forecasts. Saving a wish reserves nothing. Joining is an explicit existing ride action; a database trigger rechecks the private predicate under the ride's membership rules for pending and accepted participation, including host acceptance. There is no automatic join or notification. The personal feed overview opens the existing detail sheet, retaining current posts, chats, map and native functionality.

## Why

The merged `website-import` branch has a different application and migration history from the production `main` branch. Transplanting that branch would replace current production features. Adapting this approved feature additively to `main` preserves established data audiences, session guards, minor protections, translation dictionaries and native tracking.

The previously proposed weather-intent model remains unimplemented. The owner approved the concrete crew/seat feature already built and reviewed in PR 81 and subsequently authorized its production release. That approval does not authorize forecast guarantees or automatic commitment.

## Consequences

RPCs expose only the owner's preferences and safe visible ride summaries. New preferences are included in export, cascade on account deletion and are cleaned on the next daily batch after the 24-hour post-ride threshold. Missing data visibly disables a new join; it does not prevent leaving. A confirmed participant keeps their place when conditions change and gets a warning. DTOs reject leaked fields, duplicate or cross-ride summaries, unsupported group sizes and malformed results. A small group minimum does not shrink existing ride capacities of up to 50 non-host places. No tracking accuracy claims change.
