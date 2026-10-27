# CampusSlot

**Campus equipment, reserved fairly.** A coursework application for students borrowing shared lab equipment and administrators operating the lending desk.

Students often discover that equipment is unavailable only after arriving at a lab. CampusSlot makes availability visible before booking, protects shared quantities from overbooking, and tracks each reservation through collection and return.

## What is implemented

- **Discover:** searchable, category-filtered equipment catalogue, collection locations, detailed descriptions, and availability for a selected IST interval.
- **Reserve:** quantity and interval validation, persistent confirmation, owner-scoped idempotency keys, database-enforced concurrent capacity protection.
- **Manage loans:** private student reservation history and eligible cancellation; administrator issue, return, overdue view and reservation audit history.
- **Manage inventory:** create/edit/archive equipment, change capacity, schedule/remove maintenance. Conflicting changes return explicit errors.
- **Authentication:** bcrypt password hashes; opaque, expiring server-side sessions; server-side roles and ownership checks; CSRF protections.
- Responsive interface with native accessible dialogs, keyboard focus, labeled inputs, loading/empty/error/success states, and reduced-motion support.

All seed users and equipment are **fictional**. Public demo credentials grant access only to this coursework dataset. This is not a production university identity system.

## Quick local setup

Requires **Node.js 24 or later**, npm, and Git. Run commands in this directory:

```sh
npm ci
npm run setup
npm start
```

Open **http://127.0.0.1:3000**. Use that exact origin unless you configure `APP_ORIGIN`. `setup` applies migrations, seeds fictional data without resetting existing records, and builds the frontend. `start` runs the real HTTP API and frontend with SQLite storage in `data/campusslot.sqlite`. Restarting the process does not erase data.

During development in a restricted environment, the dependencies were also successfully installed from the existing npm cache with `npm ci --offline --ignore-scripts`. A fresh machine normally needs registry access for `npm ci`.

### Demo access

All three accounts use password **`CampusDemo!2026`**.

| Role | Email | Display name |
| --- | --- | --- |
| Student | `asha@campus.demo` | Asha Rao |
| Student | `ravi@campus.demo` | Ravi Shah |
| Administrator | `admin@campus.demo` | Meera Patel |

The sign-in page provides account selectors. They fill the credentials; they do not bypass server authentication. No registration, password recovery, email delivery or real student records are included.

Six equipment types are seeded: camera kits (3), Arduino kits (8), projectors (2), microphones (4), VR headsets (2), tripods (6). No real personal data or real reservations are seeded. For an empty hosted database, use **First run? Initialize the demo** on the sign-in page. This endpoint creates only the fixed fictional dataset and refuses reinitialization once users exist.

## Stack and architecture

- TypeScript, React 19, hand-authored CSS, Lucide icons.
- Shared framework-independent JSON API and business services.
- SQLite with CHECK constraints, foreign keys, unique keys, and SQL triggers.
- Local runtime: Node's HTTP server and SQLite driver; esbuild frontend bundle.
- Hosted target: Vinext/Vite on Cloudflare Workers through Sites, with a persistent D1 binding.
- bcryptjs; Web Crypto random session tokens and SHA-256 token hashing.
- Node test runner, TypeScript strict checks, Playwright browser smoke script.

```text
React interface → JSON API → authentication / permissions → business services
                                                         ↓
                                      SQLite / D1 constraints + triggers
                                                         ↓
                                      reservations + atomic audit records
```

The API and SQL rules are identical in both runtimes. The local runner avoids requiring a Cloudflare account for evaluation. Hosted platform sign-in remains an additional outer access boundary; the fictional application accounts demonstrate student/admin permissions.

See [Architecture](docs/ARCHITECTURE.md), [API reference](docs/API.md), and [Viva preparation](docs/VIVA_PREP.md).

## Booking rules

- UI: **Asia/Kolkata (IST, UTC+05:30)**. Storage: UTC epoch milliseconds. Browser timezone does not change booking interpretation.
- Intervals are **[start, end)**. An ending reservation and a starting reservation at the same instant are adjacent, not overlapping.
- Start must be in the future, within 90 days; end must follow start. Maximum reservation length: 7 days. Maximum maintenance length: 30 days.
- Positive integral quantity, at most 100; available capacity is based on peak simultaneous usage throughout the requested interval.
- Students cancel their own RESERVED bookings only before start. Administrators can also cancel eligible bookings.
- Issue is permitted from 15 minutes before start until end, subject to actual capacity and maintenance. Early issue cannot displace an adjacent booking.
- Only ISSUED equipment can be returned. CANCELLED and RETURNED are terminal.
- Overdue means ISSUED with end in the past. For this small demo, any overdue loan blocks new reservations for that equipment type until returned.
- Maintenance blocks all units; conflicting reservations are not silently cancelled.
- Capacity reduction/archive is rejected while future reservations or issued loans exist. Increasing capacity is permitted.

## Configuration

`.env.example` lists every standalone runtime setting; no private credentials are committed. `.env` is gitignored. The application does **not** use MongoDB, OAuth secrets, email, payments, or object storage.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | Standalone HTTP port |
| `HOST` | `127.0.0.1` | Listening address |
| `APP_ORIGIN` | Derived local URL | Exact browser origin used for CSRF validation; set to HTTPS public origin behind a proxy |
| `DATABASE_PATH` | `data/campusslot.sqlite` | Durable SQLite file; mount persistent disk in containers |
| `BASE_URL` | Script-specific local URL | Target for optional seed/browser scripts |

`npm start` / `scripts/serve-local.ts` validates these values and fails with a clear message if they are invalid. Example: copy `.env.example` to `.env`, edit it, then run `node --env-file=.env scripts/serve-local.ts`. Production HTTPS origins produce Secure cookies. Keep `.env` and database files untracked.

Hosted Sites uses `DB` from `.openai/hosting.json`. No external API key, payment service or paid resource is required by the application.

## Migrations and seeds

The canonical schema is versioned SQL under `drizzle/`, including a migration journal used by Sites. Migrations are schema-only. Append new migrations rather than editing applied files.

- Standalone: `npm run setup` migrates and seeds. `npm start` also applies pending migrations but does not silently seed. `schema_migrations` prevents replay. Data is preserved.
- Worker development: `npm run build:worker`, `npm run db:migrate`, `npm run dev`, then `npm run db:seed` in another terminal. Open the URL printed by Vite (normally port 5173).
- Worker production preview: `npm run start:worker` after building/migrating; use its printed URL.
- Standalone and Worker preview use separate local databases. Hosted D1 is a third, separate database.
- Back up a stopped standalone database, or use SQLite's backup API while running. Do not copy only the main database file while a WAL-mode process is writing.

## Verification

```sh
npm run typecheck
npm test
npm run build
# Equivalent combined command:
npm run check
```

**Recorded result:** 33 automated rule/API tests passed; strict type checking passed; both Worker and standalone production builds passed. The race test starts 12 independent SQLite writers against 2 units: 2 succeeded, 10 received capacity conflicts. Tests use real SQL databases, not mocked persistence.

For browser verification on a machine with browser/port permissions:

```sh
npx playwright-core install chromium
npm run test:browser
```

The browser script starts an isolated real server/database, exercises both roles, takes desktop/mobile screenshots, checks horizontal overflow, and records an unedited browser video under `artifacts/browser/`. It cleans up its temporary database. `HEADED=1 npm run test:browser` shows the browser. For a deployed demo, `BASE_URL=https://YOUR_VERIFIED_ORIGIN npm run test:browser` uses that deployment and leaves clearly labeled test history there; platform access may require a signed-in browser instead.

**Environment limits:** this workspace blocked local listening ports, Chromium startup and outbound Git DNS. Browser journeys/mobile appearance, actual HTTP serving, deployed migrations and deployed persistence have therefore **not yet been verified**. See [Testing](docs/TESTING.md) for evidence and exact outstanding checks. A successful build is not a verified deployment.

## Deployment and submission

A private Sites project has been registered; its ID is preserved in `.openai/hosting.json`. The source-upload attempt failed because the sandbox could not resolve the Sites Git host. No live deployment URL is claimed. See [Deployment](docs/DEPLOYMENT.md) for the prepared Sites and Docker paths.

Git commits are genuine local milestones. The destination repository is verified: https://github.com/anoushkawayangankar/campslot (currently empty; source push pending). The user confirmed this owner. Local CLI credentials are invalid and the connected integration cannot push there; authenticate as anoushkawayangankar before pushing.

- [3–5 minute demo script](docs/DEMO_SCRIPT.md)
- [Submission fields and acceptance checklist](docs/SUBMISSION.md)
- [Engineering explanation and viva questions](docs/VIVA_PREP.md)

**The project is not officially submitted until you complete the [official submission form](https://forms.gle/sBy4sfqyiRG2Zpom9).** Deadline: **27 October 2026, 11:59 PM IST**. The student name, repository URL, verified deployment/build link, and demo video link must be completed by the owner where marked pending.
# campslot
