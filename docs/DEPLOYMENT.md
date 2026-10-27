# Deployment handoff

## Current state

The application is built and tested locally at the business/API layer. A **private, unpublished** Sites project was created:

```text
project_id: appgprj_6ae0cceaba90819190b1d81853564fd8
```

The ID is stored in `.openai/hosting.json`; reuse it. **Do not create another Site.** No source push or deployment has succeeded. The source helper failed with `Could not resolve host: git.chatgpt-team.site`. The workspace also denies listening ports and Chromium's macOS process service. A sandbox escalation request was automatically rejected.

There is **no verified live URL**. A platform-generated expected origin is not a deployment and must not be placed in the submission as a working application.

## Resume Sites publication

Required: enable task network access to the Sites source Git host and native upload paths. Local-server/browser permissions are needed for complete QA. The Sites connector itself is connected and has already registered the project; no paid service was provisioned.

1. Preserve the project ID and private audience in `.openai/hosting.json`.
2. Run `npm run check` in this checkout. Run `npm run test:browser` once browser/port permissions are enabled.
3. Use the installed Sites skill to obtain a fresh `create_source_repository_write_credential` for the existing ID. Short-lived credentials expire; never put them in Git, shell arguments, documentation or environment-example files.
4. Start the Sites `site-workflow.mjs` helper from this checkout with the same project ID. Supply the credential through hidden stdin. Use its supported build/package workflow and keep the returned exact commit/archive identity.
5. Save and privately deploy the matching archive through `save_version_and_deploy_private`. Poll only until terminal deployment status.
6. Open the returned **live** URL. Initialize fixed demo data once through the sign-in page. Migrations are applied by Sites from the SQL migration directory; records live in the bound D1 database.
7. Execute the deployed acceptance gate in `TESTING.md`, including a new reservation surviving reload and a later deployment/restart.
8. Record the literal verified URL, checks and timestamp in `SUBMISSION.md` and `TESTING.md`.

The Site remains owner-private. The owner must choose evaluator access in Sites sharing settings before submission. Do not claim a private owner-only URL is accessible to an evaluator. No audience was silently changed.

## Portable Docker deployment

`Dockerfile` and `compose.yaml` provide an alternative for an already-available container host or evaluator machine. They were prepared but could not be built here because Docker is unavailable.

```sh
docker compose up --build -d
```

Open `http://localhost:3000`, expand **First run? Initialize the demo**, and initialize once. The named volume `campusslot-data` stores SQLite, including WAL files, independently of the container. Rebuilding/restarting preserves this volume. Do not use `docker compose down -v` unless intentionally deleting all demo records.

For an existing HTTPS host:

- Mount durable storage at `/app/data`.
- Configure `APP_ORIGIN` to the exact public HTTPS origin so CSRF validation and Secure cookies agree with the browser.
- Run a single application instance per SQLite file on local persistent disk. Do not share SQLite via network filesystem or create independent disks behind a load balancer.
- Terminate TLS using the host's existing reverse proxy.
- Check `/api/health`, seed once, then verify application workflows and restart persistence.
- Keep a database backup and preserve the volume on upgrades.

Do not deploy this local SQLite runtime to an ephemeral serverless filesystem. Use the Worker/D1 build for Sites, or a durable container disk for the standalone runtime. No paid host has been purchased.

## GitHub publishing

The verified destination is **https://github.com/anoushkawayangankar/campslot**. It exists, is public, and was empty when checked. It is now configured as local remote `origin`. The connected GitHub account has no push permission. The user explicitly rejected that unrelated account; use **anoushkawayangankar**.

The local repository includes genuine milestone commits; nothing was backdated. In a normal network-enabled terminal, authenticate the correct owner and push:

```sh
cd /Users/anoushka/Desktop/Mern/campusslot
gh auth login --hostname github.com
gh auth status
# Confirm the displayed active account is anoushkawayangankar.
git push -u origin main
```

The repository already exists; do not create another one. Do not force-push. If the remote acquires content before this push, fetch and reconcile it without losing existing history.

Inspect the repository in a browser, confirm the README/code/commits and record its actual URL. The included GitHub Actions workflow then runs type checks, tests, both builds and the browser smoke script. Its status remains unknown until it runs.

## Exact unresolved dependencies

1. Task network/port/browser permissions for remote source synchronization and complete browser/deployment verification.
2. A working authenticated GitHub session for the confirmed owner, anoushkawayangankar.
3. Owner-selected evaluator access after deployment.
4. Student-recorded demo video and final form submission.

Application implementation, local migrations, seed data, automated database/API checks, build artifacts and submission documents do not require these permissions and have been completed independently.

## Direct Cloudflare deployment from your own Terminal

This alternative uses your own Cloudflare account, independently of the private Sites project. It exposes the fictional demo on a public workers.dev URL; anyone with access can use the published demo accounts. It has not been remotely verified. Remain on free resources and stop if prompted to purchase or upgrade a plan.

```sh
cd /Users/anoushka/Desktop/Mern/campusslot
npx wrangler login
npx wrangler d1 create campusslot-db
npm run build:worker
```

Copy `database_id` from the create result, replacing the placeholder in the next command:

```sh
node scripts/configure-cloudflare.mjs YOUR_DATABASE_ID
npx wrangler d1 migrations apply DB --remote --config dist/server/wrangler.public.json
npx wrangler deploy --config dist/server/wrangler.public.json
```

The database ID is an identifier, not an API token. Do not paste login tokens into chat. Keep the same database ID on subsequent deployments so records persist; do not create a fresh database for every release. The generated public config is overwritten by builds, so rerun the helper after each build.

Open the literal URL printed by Wrangler, initialize the fictional demo once on the sign-in page, and test login, reservation, reload, cancellation, issue/return and maintenance. Then redeploy using the same database and check the existing booking. Only after that should the URL be marked verified in SUBMISSION.md.

Cloudflare account limits still apply. In particular, bcrypt login and first-run hashing consume CPU; the free Worker's CPU budget may prevent those operations even if deployment succeeds. If you see a CPU-limit error, do not purchase an upgrade automatically or claim success: retain the error, use the persistent local build for evaluation, and resolve the hosting/runtime constraint before submitting a live link.

Official references: [D1 setup](https://developers.cloudflare.com/d1/get-started/), [Wrangler commands](https://developers.cloudflare.com/workers/wrangler/commands/).
