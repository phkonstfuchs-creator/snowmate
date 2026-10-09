# 0042 — Private day plans before publishing a ride

Date: 2026-10-09. Status: Accepted within the mountain rebuild stage.

## Context

Pistl Go needed an existing ride, leaving new riders without a useful action.
The mountain preview demonstrated standalone planning but kept no account data.
The owner asked to continue into real use while keeping meetups prominent.

## Decision

Store bounded private day plans separately from public/friends rides. The
session determines their owner, including at export. New riders can plan
without a complete profile or crew; existing publish/join rules still apply.
The feed shows the next meeting and offers an explicit ride-form prefill.
Transport is an intention, not a seat reservation or a new carpool.

Use stable client UUIDs and optimistic versions. Serialize writes per owner,
limit active plans to 20 and changed saves to 30 per rolling 24 hours, and
leave deletion available under the existing request guard. This deliberately
uses a save quota rather than counting deletes. An unchanged retry costs no
quota. Deleted ids retain only minimal retry-blocking metadata until the
later of the original expiry and 24 hours after deletion; no prior plan text
is retained. Account deletion cascades all new records.

## Consequences

Private planning is usable before any social publication. Reloads retain a
plan, stale edits fail visibly, and delayed retries cannot recreate a deleted
plan during its retention window. Explicit sharing remains the existing ride
workflow, with its style, capacity, audience and minor protections.
Native widgets, permanent friend location, terrain/data parity and offline
packages remain separate stages in the [master plan](../specs/mountain-rebuild-plan.md).
