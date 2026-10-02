# Development

## Requirements

- Node.js 24 (`.nvmrc`), npm 11 or newer
- Google Chrome for the local Playwright project
- Docker Desktop for the local Supabase stack, or a plain Postgres with
  `pgtap` for database tests without Docker (see [TESTING.md](TESTING.md))

## Start

```bash
nvm use
npm ci
npm run dev
```

The app runs at `http://localhost:3000`. `/demo` works without any backend.

## Environment

Create `.env.local` from `.env.example`. It needs three browser-safe values:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | The Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | The publishable (anon) key |
| `NEXT_PUBLIC_SITE_URL` | Where the app runs, for email links |

Never add a secret or service-role key; nothing in the app needs one.
`.env.local` and the Supabase project link are ignored by Git.

## Database

The repository is linked locally to the hosted `snowmate-dev` project.

```bash
npx supabase start       # local stack in Docker
npx supabase db reset    # apply migrations + seed locally
npm run test:db          # pgTAP tests
npx supabase db push     # apply new migrations to the linked project
```

Migrations are append-only once applied to a hosted project: fix a
mistake with a new migration. `supabase/config.toml` configures the local
stack only; hosted Auth settings are managed in the Supabase Dashboard.

## Commands

| Command | Does |
|---|---|
| `npm run dev` | Development server |
| `npm run lint` | ESLint, including the architecture rules |
| `npm run typecheck` | Route types + `tsc` |
| `npm run test` / `test:coverage` | Vitest unit and component tests |
| `npm run test:db` | pgTAP tests against the local Supabase stack |
| `npm run test:e2e` | Playwright, mobile Chrome |
| `npm run build` | Production build (Webpack) |
| `npm run verify` | lint + typecheck + coverage + build |

## Where things go

See [ARCHITECTURE.md](ARCHITECTURE.md#responsibilities). In short: a new
feature gets `features/<name>/` with its screen, rules, `queries.ts` and
`actions.ts`; the route file in `app/(app)/` only fetches and composes; the
`/demo` route composes the same screen without `live` data.
