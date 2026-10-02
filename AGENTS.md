<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Snowmate: read before you change anything

| Task | Read first |
|---|---|
| Any code change | `docs/ARCHITECTURE.md` (where things go, enforced boundaries) |
| Anything touching data, visibility, minors, location | `docs/SECURITY_AND_PRIVACY.md` |
| Database or migrations | `docs/ARCHITECTURE.md#database-access-model`, `docs/DEVELOPMENT.md#database` |
| Tests and handover checks | `docs/TESTING.md` |
| A new feature | `docs/AI_WORKFLOW.md`, then write or find its spec in `docs/specs/` |
| Product copy or UX | `PRODUCT.md` |

Rules that are easy to break:

- Identity comes from the server session, never from a client-supplied id.
- Clients never read `rides`, `friendships`, `carpools` or their join tables
  directly; add to the security-definer functions and their pgTAP tests.
- Applied migrations are never edited; add a new one.
- Never weaken a test, lint rule or policy to make a change pass. If a rule
  looks wrong, say so.
- Before ending a session, record any key architectural decisions as ADRs
  in `docs/adr/` and link the relevant specification and checks. Keep
  unapproved decisions marked Proposed. Preserve replaced decisions and link
  their replacements. If no architectural decision was made, say so briefly
  in the handoff.
