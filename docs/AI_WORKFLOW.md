# Working with coding agents

The developer sets direction; the agent implements inside an agreed scope
and hands back evidence. Changes to agreed scope or architecture go back to
the developer.

## 1. Agree on the spec

Before a feature is built, write a short spec in [specs/](specs/) from
[specs/TEMPLATE.md](specs/TEMPLATE.md): problem, what is included, what is
not, constraints, and acceptance criteria that can be observed. The
developer approves it. Small fixes do not need a spec; anything that
touches data, visibility, minors or payments does.

## 2. Implement and test

The agent makes routine choices within the spec and the rules in
[ARCHITECTURE.md](ARCHITECTURE.md) and [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md).
It runs the checks in [TESTING.md](TESTING.md) before handing over. It
never weakens a test, a lint rule or a database policy to make a change
pass; if a rule seems wrong, it says so.

## 3. Review the evidence

The developer accepts the work against the spec's acceptance criteria.
The spec links to the tests that show each criterion.

## Decisions

Before ending a session, record any key architectural decisions as ADRs in
[adr/](adr/) and link the relevant specification and checks. Keep
unapproved decisions marked Proposed. Preserve replaced decisions and link
their replacements. If no architectural decision was made, say so briefly
in the handoff.

A spec says **what** to build. An ADR says **why** a design was chosen.
