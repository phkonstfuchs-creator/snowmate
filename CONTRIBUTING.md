# Contributing to Pistl

One page on how a change gets from idea to `main`. The details live in
`docs/`; this file only links them.

## Flow

1. **Branch** from `main`. `main` is protected: no direct pushes, no
   force pushes.
2. **Spec first** for anything touching data, visibility, minors, location
   or payments: write or update one in [docs/specs/](docs/specs/) and get
   it approved ([docs/AI_WORKFLOW.md](docs/AI_WORKFLOW.md)).
3. **Build** inside the boundaries in
   [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and the rules in
   [docs/SECURITY_AND_PRIVACY.md](docs/SECURITY_AND_PRIVACY.md).
4. **Check locally** (below), then open a **pull request**.
5. **Merge** only when the required checks are green: `quality`,
   `integration`, `website`, `security` and CodeQL.

## Local checks

```bash
npm run lint
npm run typecheck
npm run test:coverage
npm run build
```

When `supabase/` changes, also run the pgTAP suite
([docs/TESTING.md](docs/TESTING.md#database-tests-without-docker)). When
`website/` changes, run `npm run lint && npm test && npm run build` there.

## Rules that are easy to break

- Identity comes from the server session, never from a client-supplied id.
- Clients never read the social tables directly; go through the
  security-definer functions and add pgTAP tests for them.
- Migrations only append. An applied migration is never edited.
- Never weaken a test, lint rule or policy to make a change pass.
- No secrets in the repo, `.env` files in commits, issues or chats. Server
  secrets live in Vercel or Supabase only
  ([docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)).
- Architectural decisions get an ADR in [docs/adr/](docs/adr/), marked
  Proposed until approved.

## Security issues

Do not open a public issue. See [SECURITY.md](SECURITY.md).
