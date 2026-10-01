# 0009 Single-use invite links

- **Status:** Proposed
- **Date:** 2026-10-01
- **Spec:** [invite-links](../specs/invite-links.md)

## Context

Adding friends by exact handle (ADR 0006) is safe but slow. Crews already
share things in group chats.

## Options

1. A permanent personal link (like a profile URL).
2. Single-use links that expire after 7 days.
3. Reusable links with a use count.

## Decision

Option 2. Each link befriends exactly one person, expires after 7 days,
and a person has at most 10 open links. Opening a link while signed in
shows the inviter and asks for confirmation; signed-out visitors see no
name.

## Consequences

A forwarded link reaches at most one stranger, and only within a week.
Inviting a whole group means one link per person, which is the price of
not having a permanent, forwardable door into someone's friend graph.
