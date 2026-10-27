# CampusSlot submission details

**Project Name:** CampusSlot — Campus Equipment Reservation and Lending

**Student Name:**

**Problem Statement:** Students need predictable access to limited campus equipment, while laboratory staff need to prevent conflicting bookings, account for maintenance, and track issued and overdue loans. Manual requests make availability difficult to see and can promise the same units to multiple students. CampusSlot provides time-based equipment discovery, quantity-aware reservations, protected student histories, and an administrator lending/inventory desk with database-enforced rules.

**GitHub Repository:** https://github.com/anoushkawayangankar/campslot — repository existence and owner verified; currently empty. Source push is **pending** working authentication and network permission. The connected GitHub integration has read access but no push permission; do not use the unrelated connected account.

**Deployed Application / Build:** **Pending deployment and live verification.** A private Sites project is registered; source synchronization is blocked by sandbox DNS/network restrictions. A working local production build is prepared in `dist-local/`, and the Worker deployment build is in `dist/`. Start the local application using the README. Do not submit an expected/unpublished origin as a live URL.

**Demo Video:** **Pending student recording and upload.** A timed 4 minute 30 second script is in `DEMO_SCRIPT.md`. No video URL or completed recording is claimed.

**Tech Stack:** TypeScript, React, CSS, Node.js HTTP/SQLite runtime, Cloudflare Worker/D1 hosted target through Sites/Vinext, SQL migrations/triggers, bcryptjs, Web Crypto, Vite/esbuild, Node test runner, Playwright verification script.

**Major Features:**

1. Search/filter equipment and inspect details and interval availability.
2. Reserve a quantity with server validation, durable idempotency and atomic database conflict protection.
3. Students view/cancel eligible own bookings; administrators issue, return and inspect overdue loans.
4. Administrators manage equipment/capacity/archive and maintenance, with explicit collision handling.
5. Hashed credentials, server-side sessions and role/ownership authorization.
6. Reservation audit history, fictional demo dataset and responsive UI implementation.

## Acceptance checklist

No attached guideline file was visible in the chat or workspace. This checklist maps to the detailed requirements in the user's project brief. It must be cross-checked against the actual attachment if one is supplied; the inaccessible form/attachment has not been invented or assumed.

| Requirement from provided brief | Status and evidence |
| --- | --- |
| Inspect workspace; preserve meaningful project | Done; workspace was empty; CampusSlot created in its own directory |
| Check deadline and realistic scope | Done; started 21:39 IST on 27 October, deadline 23:59 IST; four workflows only |
| Write scope/model/architecture first | Done; initial genuine commit contains `docs/SCOPE.md` |
| Discover equipment workflow | Implemented; catalogue/search/detail/availability API tests pass |
| Reserve equipment workflow | Implemented; success, invalid intervals, capacity, replay and privacy tests pass |
| Concurrent overbooking protection | Verified locally; 12 independent writers, capacity 2, exactly 2 successful writes |
| Student reservation management | Implemented; own-only access, eligible cancellation and persistence tests pass |
| Administrator lending workflow | Implemented; issue, return, overdue and invalid transition tests pass |
| Administrator inventory workflow | Implemented; create/edit/archive/capacity constraints tested |
| Maintenance affects availability | Implemented; blocking/adjacency/conflict/removal tested |
| Real frontend/backend/persistent data | Implemented; real API and file database; close/reopen persistence test passes |
| Authentication and role authorization | Implemented; bcrypt, hashed sessions, expiry/logout, server roles, ownership and CSRF tested |
| Invariants at server/database level | Implemented in services, CHECK/FK/unique constraints and triggers |
| Clear intervals/timezones/lifecycle rules | Documented in README and architecture; UTC storage, IST UI, half-open intervals |
| Duplicate/error/network handling | Reservation idempotency, safe repeated transitions, database errors and client network error states implemented |
| Responsive accessible interface | Implemented labels/focus/dialogs/mobile CSS/reduced motion; visual/browser QA pending permissions |
| Fictional demo accounts/equipment | Done; two students, one admin, six equipment groups; no real personal dataset |
| No secrets committed | Environment example and ignores included; only intentionally public fictional demo credentials |
| Relevant automated checks/build | 33 tests pass; strict typecheck and both production builds pass |
| Browser major workflows/mobile checks | Prepared script; blocked before page interaction by local-port/Chromium sandbox restrictions |
| Reproducible setup/migrations/seeds | Done and locally executed; `npm ci`, `npm run setup`; persistent SQLite |
| Deployment configuration | Prepared Sites/D1 manifest, Worker build, Dockerfile, persistent-volume compose file |
| Git repository and genuine commits | Local milestones committed; verified GitHub target set; push pending authentication/network |
| Hosted deployment and persistence verified | Pending; no successful deployment claimed |
| README | Done |
| Architecture documentation | Done |
| Actual testing record | Done; executed checks distinguished from blocked checks |
| 3–5 minute demo script | Done; narrated recording/upload remain student action |
| Viva preparation | Done; decisions, algorithm, security, limitations and questions explained |
| Submission details | Prepared; student name, source publication, live URL and video must be finalized |
| Official form submission | **Not submitted; student must perform final submission** |

## Final human actions

1. Connect GitHub as **anoushkawayangankar** or authenticate the local CLI with `gh auth login`; no password/token should be pasted into chat.
2. Enable the task's network/local-server/browser permissions so the agent can push to the verified repository, deploy, and run remaining live checks. If using a normal terminal instead, follow `DEPLOYMENT.md`.
3. Confirm evaluator access to the repository and eventual deployed application.
4. Run the project yourself, rehearse `DEMO_SCRIPT.md`, record a 3–5 minute narrated demo, upload it and verify viewing access.
5. Enter your student name and replace pending deployment/video fields with verified URLs. Update the GitHub field only after source files are visible there.
6. Review any additional official guideline attachment that was not supplied here.
7. Complete the official form by **27 October 2026, 11:59 PM IST**.

**Official form:** https://forms.gle/sBy4sfqyiRG2Zpom9

**The project is not officially submitted until you complete that form.** The form was not filled or submitted by the agent. Its exact current field structure could not be inspected through the available web/browser tools, so these details follow the requested submission fields rather than claiming a verified form schema.
