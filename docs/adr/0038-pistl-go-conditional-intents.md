# 0038 Pistl Go conditional ride intents

- **Status:** Superseded by [ADR 0040](0040-private-go-wishes-on-existing-rides.md); this forecast proposal was never implemented
- **Date:** 2026-10-08
- **Spec:** [pistl-go.md](../specs/pistl-go.md)
- **Builds on:** [0004](0004-vienna-day-boundaries.md), [0001](0001-read-social-data-through-functions.md)
- **Checks:** Spec lists planned evidence; no feature checks have run

## Context and options

People want to coordinate a mountain day before they know whether conditions justify going. Options are manual ordinary rides, automatic ride publication when a predicate is satisfied, or private conditional intents with explicit confirmation.

## Recommendation awaiting approval

Use conditional intent followed by explicit confirmation. A forecast matching a preference should not reserve a place, commit another person or publish a ride automatically. Start with existing friends and no expansion of visibility or minor-contact permissions. Automatic activation is a separate owner decision.

## Consequences

The spec must be approved before implementation. Conditions need an authoritative source, freshness policy, timezone and deterministic evaluation; stale or unavailable forecasts cause no activation. New data is session-owned and exposed only through tested security-definer functions. Costs, notifications and moderation capacity need owner review. No implementation or database deployment is authorized by this ADR.
