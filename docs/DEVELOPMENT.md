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

Optional, for push notifications: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, the
public half of the VAPID key pair (see "Push notifications" below).

Never add a Supabase service-role key to the app. Photo uploads require the
limited server-only media signing key described below; it must never have a
`NEXT_PUBLIC_` prefix. `.env.local` and the Supabase project link are ignored by Git.

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

## Private media signing key

Migration `20261026090000_media_attestation.sql` creates a random 32-byte key
inside `private.media_attestation_keys`. The app uses the same key to certify
only freshly uploaded files after server decoding/re-encoding. The certificate
binds the owner, immutable Storage object id, bucket, path and issuance time;
it grants no access to anyone else's account. Missing/malformed keys refuse
photo uploads before decoding or writing; text-only posts and `/demo` work.

After applying the migration to the intended project, an administrator can
read its key in a **private Supabase SQL editor session**:

```sql
select key_id, encode(secret, 'base64') as signing_key
from private.media_attestation_keys where key_id = 'v1';
```

Copy that value directly to the app project's encrypted **server-only**
`MEDIA_ATTESTATION_KEY` environment variable and set
`MEDIA_ATTESTATION_KEY_ID=v1`. Match the environment to its database: a local
or preview project must never receive the production key. Do not paste the
SQL result into chat, CI logs, issues or tracked files. Local `.env.local` is
ignored; CI reads only its freshly generated local-stack key and masks it.
No deployed secret is needed to lint, typecheck, build or run unit/demo tests.

**Rollout:** back up first; apply migrations, provision the corresponding
server key, deploy Edge and app, then verify real Storage HTTP uploads and
overwrite denial with two test accounts. Existing images have no certificate
and become unreadable to friends; owners can still view/delete their files.
Use owner re-upload or an explicitly reviewed, bounded server sanitization
backfill into new paths. Do not certify legacy bytes without decoding them.
The metadata claim does not imply historical originals have already been
cleaned or removed. Keep this visible in the release review.

**Rotation:** create a new database key id (e.g. `v2`) with a generated secret,
provision it privately, and deploy the app with that id. After old instances
have stopped, replace the old secret with fresh random bytes to reject old
signatures; retain the key-id row for existing certificate references.
Deleted object certificates stay until account deletion to prevent UUID reuse
and are included in the owner's data export. Never rotate using a literal
secret in a migration. See [ADR 0030](adr/0030-session-and-media-security.md).

## Push notifications

Push notices are sent by the `push-dispatch` edge function (ADR 0025).
The private VAPID key lives only in the Supabase function secrets.

```bash
npx web-push generate-vapid-keys --json        # once; keep the private key to yourself
npx supabase secrets set VAPID_PUBLIC_KEY=… VAPID_PRIVATE_KEY=… VAPID_SUBJECT=mailto:…
npx supabase functions deploy push-dispatch    # verify_jwt is off in config.toml
```

Then set `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (the public key) in the app's
Vercel project and redeploy. Without it the switch stays hidden and the
app never calls the function.

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
