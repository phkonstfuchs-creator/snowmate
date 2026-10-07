# Pistl

Pistl is a mobile-first coordination app for ski crews around Innsbruck and
Salzburg. It answers one question: who is riding today, where, and can I join?

**[app.pistl.app](https://app.pistl.app)** — app
**[app.pistl.app/demo](https://app.pistl.app/demo)** —
clickable prototype with sample data
**[pistl.app](https://pistl.app)** — separate marketing website

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
| Map, live location, lift meetup | real friend data; attributed map/weather sources; lift ETA is an estimate |
| Direct and ride chats, ski-day posts/photos | real data with audience rules |
| Ski-day tracking, leaderboards and discovery | real data with privacy controls |
| Squads and sample XP interactions | prototype only (`/demo`) |

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

Needs `.env.local` from `.env.example` (browser-safe values; optional public push key). Details in
[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Documentation

| Read | For |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Responsibilities, data flow, enforced boundaries |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Setup, environment, database, commands |
| [docs/TESTING.md](docs/TESTING.md) | Test levels, required checks, coverage |
| [docs/SECURITY_AND_PRIVACY.md](docs/SECURITY_AND_PRIVACY.md) | Who sees what, minors, location, account rights |
| [docs/SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md) | Audit findings, verification evidence and remaining operational checks |
| [docs/AI_WORKFLOW.md](docs/AI_WORKFLOW.md) | Spec, implement, review; recording decisions |
| [docs/specs/](docs/specs/) | Agreed feature specifications |
| [docs/adr/](docs/adr/) | Architecture decisions and why |
| [PRODUCT.md](PRODUCT.md) | Users, purpose, business model, design principles |
