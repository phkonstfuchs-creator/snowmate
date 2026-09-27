# 0008 Enforce architecture boundaries in lint

- **Status:** Proposed
- **Date:** 2026-09-27

## Context

The September architecture review found routes imported as components,
fixtures read in several layers, and capacity logic copied five times.
Written rules alone drift, especially with coding agents.

## Decision

`eslint.config.mjs` enforces the boundaries in
[ARCHITECTURE.md](../ARCHITECTURE.md#enforced-boundaries) with
`no-restricted-imports`; `tests/unit/architecture.test.ts` proves each rule
still rejects a deliberate violation.

## Consequences

New files are covered by naming convention (`queries.ts`, `actions.ts`,
`use*.ts`, everything else in `features/` is a rule module). Changing a rule
means changing the docs and an ADR, not adding `eslint-disable`.
