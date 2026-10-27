# CampusSlot viva preparation

## A clear 45-second explanation

“CampusSlot is a campus equipment reservation and lending system. Students discover equipment, check availability and reserve a quantity for a time interval. Lab administrators manage equipment, maintenance, collection and returns. The central engineering problem is sharing limited capacity correctly: overlapping bookings and simultaneous requests must not overbook the inventory. I use database constraints and atomic triggers, rather than trusting a frontend availability check. The application also enforces ownership and a reservation state machine on the server. Local storage is persistent SQLite; the prepared hosted target uses D1.”

Say “prepared hosted target” until deployment is actually verified. Explain the implementation in your own words; do not claim to have personally authored work you cannot explain.

## How to trace one booking

1. `app/campus-app.tsx`: the details dialog collects IST start/end, quantity and purpose. A stable request key represents one booking intent.
2. `POST /api/reservations` enters `lib/server/api.ts`. Origin/JSON/custom-header checks protect mutations; the session determines the user.
3. `lib/server/service.ts` requires a student role, validates fields and dates, then checks whether the request key already succeeded.
4. An INSERT reaches the SQL triggers in `drizzle/`. They reject inactive equipment, maintenance, overdue blocks, illegal numeric data or capacity excess.
5. The database commits the reservation and audit entry together. A failed trigger aborts the statement.
6. The API returns the durable reservation ID; the UI switches to reservation history with a confirmation. Refresh retrieves the same database record.

## Questions evaluators are likely to ask

### Why this project?

It has four connected workflows with a real shared-resource constraint. It is more than CRUD because booking availability depends on time, quantity, state, maintenance and concurrent requests. The inventory and lending desk affect what students can reserve.

### Why SQLite? Why not MongoDB?

The domain has strongly related entities and transactional invariants. SQL constraints and triggers can enforce capacity at the write boundary. SQLite gives a reproducible, account-free local setup; D1 provides a compatible hosted database. A larger deployment could use PostgreSQL and serialize mutations with per-equipment locks. The folder name does not impose a MERN-stack requirement in the provided instructions.

### How exactly is availability calculated?

Use a sweep line. Add quantity at each clipped start and subtract it at each end. Process end events first at the same timestamp, because intervals are half-open. Track the maximum running total and subtract it from capacity. Show a worked example: two sequential two-unit bookings do not consume four simultaneous units.

### What happens if two people click Reserve at once?

Both can see an advisory “one available.” The authoritative trigger runs inside each serialized database write. The first may commit; the next sees the committed reservation and aborts if capacity is exceeded. No JavaScript-only mutex is needed. The race test uses twelve separate database connections, not twelve calls to a mocked function.

### Is the same algorithm run on the client and server?

The browser displays availability returned by the server. The server uses a sweep line for the view. SQL independently checks occupancy at every relevant start event during INSERT/issue. Their implementations are different because their jobs are different: one explains availability, the other guarantees the write invariant. Tests exercise edge cases against both.

### Why is checking at start times sufficient?

Occupancy only increases at a start event; end events decrease it. If capacity is valid at the candidate start and every relevant existing start inside the candidate interval, it cannot first become excessive between those points.

### Can adjacent reservations coexist?

Yes. `[10:00,11:00)` and `[11:00,12:00)` do not overlap. End events precede start events at 11:00. Real-world turnaround/inspection time is not included; adding a fixed buffer would be a clear future policy change.

### What if a user submits twice or loses the response?

The UI disables the button while submitting, but that is not sufficient. A unique owner-scoped request key is stored with the reservation. Retrying the identical intent returns the existing ID. A changed payload using the same key is rejected. Retrying a completed issue/return/cancel is a no-op if it already reached that target state.

### What are the valid states?

`RESERVED → CANCELLED`, `RESERVED → ISSUED`, `ISSUED → RETURNED`. Cancelled/returned are terminal. Overdue is computed from ISSUED plus a past end time. A missed reservation is displayed as expired; it is not silently converted to another state.

### Why allow collection 15 minutes early? Is it safe?

It makes a lab-desk demonstration and ordinary collection practical. Actual occupancy begins at the issue time. An additional SQL check prevents early pickup from taking capacity promised to an adjacent booking or overlapping maintenance. The desk also checks the quantity already physically issued.

### What if someone returns late?

Their reservation remains ISSUED and is labeled overdue. New reservations for that equipment type are blocked until return; this is deliberately conservative. Existing future bookings are not deleted, but issue still checks physical capacity. The tradeoff is lower utilization in exchange for predictable rules.

### How do you stop one student accessing another's booking?

The session is joined to the user table server-side. Student queries filter by that user ID. Detail, audit and mutation requests for another student's ID return 404. An administrator's role is verified server-side. Hiding a button is only presentation, not authorization.

### How are passwords and sessions stored?

bcryptjs hashes passwords with a salt and cost factor 10. The database never stores a plaintext password. A session uses a random 256-bit token in an HttpOnly/SameSite cookie; only its SHA-256 hash is stored. Sessions expire after eight hours and logout deletes the record. Secure is added for HTTPS. Public demo passwords are intentionally published because these accounts contain only fictional data.

### Why not use a JWT?

A server-side session is easy to revoke immediately on logout and keeps the role in the database. A JWT would introduce signing-key management and revocation complexity without helping this small application.

### How do you prevent CSRF and SQL injection?

Mutations require the exact application Origin, JSON and a custom request header; cookies are SameSite=Strict. No cross-origin CORS permission is offered. Every SQL input uses bound parameters. React escapes displayed data rather than inserting raw HTML.

### What happens when maintenance conflicts with a booking?

The database rejects it. The admin can choose another interval or explicitly cancel an eligible reservation. Already issued equipment must be returned. The app never silently cancels student work. Maintenance blocks the entire equipment group, not an arbitrary subset of units.

### Why not let administrators reduce capacity freely?

Reducing capacity could invalidate already accepted bookings. This version rejects reductions or archive while future reservations/issued loans exist. Increasing capacity is safe. A future system could provide an explicit rescheduling workflow, but silently violating promises is unacceptable.

### Does refreshing or restarting lose data?

No. The standalone runtime writes to a SQLite file outside the frontend build. Tests close and reopen the database to prove persistence. A Docker deployment mounts a persistent volume. Hosted D1 is designed as durable storage, but hosted persistence must still be verified after actual deployment.

### What is original, and what is reused?

The product rules, availability algorithm integration, SQL guards, role workflows, interface, tests and documentation were implemented for CampusSlot. React, bcryptjs, Lucide and the supplied Sites/Vinext hosting scaffold are standard dependencies. Reusing a framework is different from copying an existing application. Disclose assistance and dependency use according to your institution's rules.

### What did you actually test?

Thirty-three automated tests with real SQLite: business rules, complete Request/Response API journeys, authentication, ownership, CSRF, idempotency, state transitions, maintenance, persistence and independent-writer concurrency. Strict TypeScript and two production builds passed. Browser/HTTP/remote deployment checks were blocked by sandbox permissions and are explicitly documented; do not present them as passed.

### What would you improve next?

Institutional SSO, individually tagged physical units, maintenance on subsets of capacity, overdue escalation, accessible usability testing, pagination and broader deployment monitoring. None of those is represented as implemented now.

## Files to study before the viva

| File | Be able to explain |
| --- | --- |
| `lib/server/rules.ts` | Interval validation, sweep line, user-facing database errors |
| `lib/server/service.ts` | Authorization, idempotency, conditional transitions |
| `drizzle/0001_invariants.sql` | Atomic insertion/transition/maintenance guards |
| `drizzle/0002_pickup_and_numeric_guards.sql` | Actual early occupancy and numeric integrity |
| `lib/server/auth.ts` | Password verification, session hashing, cookies, CSRF |
| `tests/business.test.ts` | Why the concurrency and interval tests are meaningful |
| `tests/api.test.ts` | Request-level privacy and lifecycle tests |
| `docs/TESTING.md` | Honest boundary between executed and pending verification |

Before presenting, run the project yourself and perform all four workflows. Be ready to explain the code and the remaining deployment limitations rather than memorizing feature names.
