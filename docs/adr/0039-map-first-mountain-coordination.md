# ADR 0039: Map-first mountain coordination

Status: Proposed

## Context

The Map screen placed crew and lift panels above the map and hid ski-day and location controls below it. These are core coordination tasks and should remain visible together.

## Proposed decision

Make the rounded map the primary surface. Keep region selection and the eligible lift action on that surface. Place independent ski-day and location controls directly below it, followed by compact crew cards that focus the same map and a horizontal resort gallery.

Location sharing remains explicit and independently stoppable. Starting a ski day or selecting a lift never grants location-sharing consent. Keep manual lift selection available. Preserve server-session identity, existing protected RPC access, age eligibility and unavailable-data states.

Lift arrival remains a forecast. Even when elapsed time suggests arrival, the main crew status must say it is estimated. Old positions receive subdued markers and no station claim. The layout does not improve the underlying ETA model or introduce live queue data.

## Alternatives and consequences

Keeping the stacked panels preserves the current layout but pushes the map out of view. A full-screen map with every control floating over it offers more map area but crowds small screens and attribution. The proposed bounded map with nearby controls balances visibility, attribution and touch access; expanded details still require opening a panel.

No database migration or change to sharing policies is required. Validate small mobile screens, map attribution, manual selection, stop controls and failure states before release.
