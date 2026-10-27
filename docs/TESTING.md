# Testing and verification record

Date: **27 October 2026 (IST)**. Results below describe checks actually executed in the workspace. Browser and deployment checks are separately marked blocked; they are not inferred from a successful build.

The final combined check also passed under the target **Node.js 24.20.0** runtime (in addition to the host's Node.js 26.7.0). Its actual captured output is in [verification.txt](verification.txt).

## Automated results

| Check | Result | Evidence |
| --- | --- | --- |
| Locked offline install | PASS | `npm ci --offline --ignore-scripts --cache /tmp/campusslot-npm` installed 198 packages |
| Business rules + API suite | PASS — 33 tests, 0 failures | `npm test`; `tests/business.test.ts` and `tests/api.test.ts` |
| Strict TypeScript | PASS | `npm run typecheck` |
| Worker production bundle | PASS | `npm run build:worker` / combined build |
| Standalone production bundle | PASS | `npm run build:local` / combined build |
| Local migrations + seed | PASS | `npm run setup`; creates/preserves `data/campusslot.sqlite` |
| Persistent connection restart | PASS | File database closed/reopened; same reservation returned |
| Independent concurrent writers | PASS | 12 separate worker-thread SQLite connections, capacity 2: exactly 2 successful writes, 10 `CAPACITY_CONFLICT` failures |
| Browser smoke script syntax | PASS | `node --check scripts/browser-smoke.mjs` |
| Real HTTP server startup | BLOCKED | Sandbox `listen EPERM` on `127.0.0.1:3000` |
| Worker/D1 local emulator migration | BLOCKED | Wrangler local runtime `listen EPERM` |
| Browser journeys + mobile appearance | BLOCKED | `npm run test:browser`: server port 3107 denied; separate Chromium launch failed with macOS bootstrap service permission denied |
| Browser video/screenshots | NOT PRODUCED | Browser could not launch; no capture is claimed |
| Sites source synchronization | BLOCKED | Source workflow: `Could not resolve host: git.chatgpt-team.site` |
| Hosted application, D1 persistence and hosted concurrency | NOT EXECUTED | No published version exists |
| Docker build | NOT EXECUTED | Docker is not installed in this workspace |
| GitHub Actions | NOT EXECUTED | Workflow is authored; repository push/authentication pending |
| Dependency online security audit | NOT EXECUTED | Registry network access unavailable; no claim of an audit pass |

The package installation issue was resolved from a local npm cache without enabling network access. Automatic sandbox escalation was rejected, so unavailable network/port/browser permissions were not bypassed.

## Meaningful test coverage

The suite uses Node's real SQLite engine and production SQL migrations. It calls the same business services and Request/Response API handler as the hosted application. It does not mock database results.

**Intervals and availability**

- Reject past/NaN/reversed/equal/overlong/too-distant intervals.
- Correct peak calculation for adjacent, overlapping and spanning bookings.
- Capacity checks at occupancy changes inside a requested interval.
- Insufficient capacity rejected; adjacent full-capacity booking accepted.
- Positive integral quantity and existing equipment required.
- Fractional quantity/capacity rejected by database triggers as well as server validation.

**Lifecycle and persistence**

- Reserve → confirmation → own listing → cancel → capacity restored.
- Reserve → issue → repeat issue → return → repeat return.
- Reject return before issue, reopening terminal states, early/out-of-window issue and late cancellation.
- Audit events written atomically and not duplicated by no-op retries.
- Exact repeated request returns same reservation; changed payload under same key returns conflict. Eight simultaneous identical requests produce one reservation and one audit event.
- Reservation survives closing and reopening its database file.
- Overdue historical fixture appears in admin results, blocks new bookings and is cleared by return.
- Early pickup cannot take capacity promised to an adjacent reservation.
- Early pickup is rejected while preceding maintenance still overlaps the actual issue interval.

**Inventory and maintenance**

- Add/edit inventory through the authenticated API; duplicate group creation is rejected.
- Capacity reduction/archive blocked with outstanding reservations; increase allowed.
- Archived equipment cannot be reserved.
- Maintenance blocks all units, rejects active booking overlap and duplicate overlap, permits adjacent booking.
- Removal restores bookability.
- Fixed demo seeding is repeat-safe and preserves records.

**Authentication, privacy and errors**

- bcrypt password hashes; generic invalid-login errors; account-based rate limiting.
- HttpOnly, SameSite and HTTPS Secure session cookies.
- Only token hashes stored; expired/forged sessions denied; logout revokes session.
- Second student's detail, audit and cancellation access denied (404).
- Student inventory/maintenance/issue actions denied (403).
- Foreign/missing Origin, missing custom header and non-JSON writes denied.
- Malformed/array/oversized JSON receives appropriate errors.
- SQL-injection strings are parameters, not executable SQL.
- Private responses are not cached. Database failures return retryable 503 without exposing raw errors.

## Concurrency method

The race test creates a temporary file-backed SQLite database in WAL mode, launches 12 independent connections, waits until all threads are ready, then releases them together. Each inserts one unit for the same interval. A 10-second busy timeout lets queued writers recheck committed state. The final stored sum must be 2. This proves the SQL trigger protects the actual database write, not just a preflight availability read or a JavaScript mutex.

It does **not** prove the hosted Worker/D1 environment has been exercised. Repeat against the deployed API once deployment is possible.

## Browser verification procedure

On a normal terminal with permission to listen locally and launch Chromium:

```sh
npm ci
npx playwright-core install chromium
npm run test:browser
```

The script builds the actual production frontend, creates a fresh temporary SQLite database, seeds it, starts the real server, and runs these actions:

1. Sign in as Asha; search and inspect availability.
2. Reserve a camera; reload; verify the booking still exists; cancel.
3. Reserve another camera; sign out; sign in as Meera.
4. Issue and return; inspect lifecycle state.
5. Add inventory, schedule/remove maintenance, edit capacity, archive.
6. Inspect 390×844 mobile layout for horizontal overflow and capture details.
7. Assert no uncaught browser errors; save desktop/mobile screenshots and an unedited video.

Output belongs in ignored `artifacts/browser/`. The automated video has no narration and does not replace the student demo presentation. The script is prepared but unverified here because launch was blocked before any page interaction.

Manual follow-up: inspect keyboard navigation, dialog focus/escape, error readability, narrow inputs, and status messages. Browser script overflow checks alone do not establish accessibility compliance.

## Deployed acceptance gate

Do not mark deployment complete until all of the following have been observed on the actual live origin:

- Sign in with each role; browse real seeded data.
- Reserve, reload, sign out/in and retrieve the same confirmation.
- Verify another student cannot access the booking.
- Cancel one booking and issue/return another.
- Add/remove maintenance and observe an actual booking conflict.
- Race competing requests for the last capacity; inspect final stored quantity.
- Redeploy/restart as appropriate and verify retained records in persistent D1/storage.
- Verify evaluator access in a separate authorized session.

Add timestamps, verified URL and observed results here when these checks become possible.
