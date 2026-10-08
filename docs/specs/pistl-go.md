# Pistl Go: conditional ride wishes

- **Status:** Draft; awaiting owner approval before implementation
- **Owner:** Product owner
- **Related:** ADR 0038; ADRs 0036/0037 remain unapproved

## Problem

A skier wants to tell the crew they would go to a resort on a given day if conditions fit, without presenting that wish as a confirmed ride or occupied place.

## Included (proposed MVP)

A person saves an intent with resort, Vienna calendar date, deadline and explicitly chosen conditions. Proposed audience is the owner and confirmed friends under existing visibility/block rules. The interface distinguishes waiting, conditions met, confirmation required, confirmed, cancelled and expired. A fresh qualifying forecast offers explicit confirmation; confirming goes through the existing authorized ride creation/join path. An intent does not reserve capacity. The person can cancel at any time before confirmation; an actual ride then uses its own cancellation rules.

## Not included

Automatic commitment/publication, public stranger matching, new minor permissions, background GPS, payments, bookings and forecast guarantees.

## Constraints

Define condition fields, units, source/model, forecast issue time and freshness before approval. Missing, stale or invalid forecasts produce no activation. Display forecast uncertainty and last evaluation time. Server evaluation is deterministic and idempotent; retries and concurrent confirmation cannot duplicate rides or notifications. Recheck expiry/cancellation, capacity, membership, blocks and current session authorization at confirmation. Store only necessary preferences with a retention period chosen by the owner. Intent access uses security-definer RPCs and session identity, never caller-supplied actor IDs or direct client table reads. New migration only. Notifications require opt-in and current session/block checks and expose no sensitive conditions.

## Acceptance criteria (planned)

1. A saved wish clearly says it is neither a booking nor a confirmed ride.
2. Evaluation uses the specified Vienna day, units and fresh forecast; unknown/stale data leaves the intent waiting without notification.
3. Qualifying conditions require explicit confirmation; no ride or capacity claim appears beforehand.
4. Repeated evaluation and concurrent confirmation cause at most one authorized activation/notice.
5. Cancelling or expiry prevents later activation, including queued retries.
6. A stranger, blocked account or forged actor cannot read, modify or activate the intent. Existing minor visibility rules remain enforced.
7. Disabled/revoked notification consent/session prevents delivery; forecast failure has an honest user-visible status.
8. Full checks and pgTAP pass without weakened policies before release; only the owner performs db push.

## Evidence (planned, not yet run)

| Criteria | Evidence to add after approval |
|---|---|
| 1, 3, 7 | Component/integration tests and mobile flow review |
| 2, 4, 5 | Unit/integration boundary, stale-source, retry and concurrency tests |
| 4, 5, 6, 7 | Negative pgTAP authorization, cancellation and notification tests |
| 8 | lint, typecheck, coverage, build, sweep, local PostgreSQL 16 pgTAP and CI |

## Owner decisions required

Choose exact conditions (snowfall versus snow depth, wind or other metrics), source/freshness, confirmation model, audience and minor treatment, expiry/retention, notification cadence, cost budget and operational responsibility. Any automatic activation, broader audience or stranger communication needs separately approved scope. Until approval this remains a specification only.
