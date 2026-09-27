# Snowmate

Snowmate is a mobile-first coordination app for ski crews around Innsbruck and
Salzburg. It answers one question: who is riding today, where, and can I join?

**[snowmate-info.vercel.app](https://snowmate-info.vercel.app)** — build
status and reasoning
**[snowmate-info.vercel.app/demo](https://snowmate-info.vercel.app/demo)** —
clickable prototype, sample data, nothing is saved

Launching in German and English.

## Current scope

Next.js 16 on Supabase (auth and Postgres). Sign-up, email confirmation and
sessions run server-side.

| Area | State |
|---|---|
| Profile, onboarding adoption, data export, account deletion | real data |
| Feed, public events, joining and join requests | real data |
| Crew (friend requests by handle) | real data |
| Carpool board | real data |
| Map | real rider counts; snow, lifts and conditions have no source yet |
| Chats, squads, XP, badges, rankings | prototype only (`/demo`) |

`/demo` always runs on fixtures. What the backend still owes the frontend is
in [docs/BACKEND_REQUESTS.md](docs/BACKEND_REQUESTS.md).

## Architecture in one paragraph

Route files in `app/` fetch and compose; each feature in `features/<name>/`
owns its screen, its business rules, `queries.ts` (reads) and `actions.ts`
(writes). Clients never read the social tables directly: security-definer
functions apply who-sees-what in the database and return locked fields as
null. Demo and live share one screen per feature. The boundaries are enforced
by ESLint and tested.

## Start

```bash
nvm use
npm ci
npm run dev
```

Needs `.env.local` from `.env.example` (three browser-safe values). Details in
[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Documentation

| Read | For |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Responsibilities, data flow, enforced boundaries |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Setup, environment, database, commands |
| [docs/TESTING.md](docs/TESTING.md) | Test levels, required checks, coverage |
| [docs/SECURITY_AND_PRIVACY.md](docs/SECURITY_AND_PRIVACY.md) | Who sees what, minors, location, account rights |
| [docs/AI_WORKFLOW.md](docs/AI_WORKFLOW.md) | Spec, implement, review; recording decisions |
| [docs/specs/](docs/specs/) | Agreed feature specifications |
| [docs/adr/](docs/adr/) | Architecture decisions and why |
| [PRODUCT.md](PRODUCT.md) | Users, purpose, business model, design principles |
