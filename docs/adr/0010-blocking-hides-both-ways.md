# 0010 Blocking hides both ways and ends every connection

- **Status:** Accepted (2026-10-01)
- **Date:** 2026-10-01
- **Spec:** [report-and-block](../specs/report-and-block.md)

## Context

The friend graph limits who meets whom, but within it a person still
needs a way out of contact with someone specific.

## Options

1. Mute: the blocker stops seeing the other person, nothing else changes.
2. Block both ways: neither sees the other's rides or carpools, every
   friendship, request and participation between them ends, and new ones
   are refused.

## Decision

Option 2, enforced in the visibility functions plus insert triggers on
every connection table. The blocked person is not told; their requests
answer as if the handle did not exist. Reports are write-only for
clients, kept when either account is deleted (with a handle snapshot) and
reviewed in the Supabase dashboard for now.

## Consequences

Both people may still appear together on a third person's ride; hiding
that would leak the block to the host. A moderation console is follow-up
work.
