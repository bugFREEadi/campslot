# CampusSlot — implementation scope

27 October 2026. Started at 21:39 IST; deadline 23:59 IST.

## Product and acceptance checklist
A fictional campus lending desk with two student accounts and one administrator.
- [ ] Search/filter inventory and inspect equipment with interval availability.
- [ ] Reserve a quantity with server validation, durable confirmation, idempotency, and atomic conflict protection.
- [ ] Students see/cancel only their own upcoming reservations.
- [ ] Administrators issue, return, and inspect overdue loans with enforced transitions.
- [ ] Administrators add/edit/archive equipment and add/remove maintenance; conflicting maintenance is rejected explicitly.
- [ ] Accessible responsive interface with useful loading, empty, success and error states.
- [ ] Real authentication, private resources, CSRF protection, no plaintext passwords.
- [ ] Automated rule, concurrency and authorization tests; type check; production build; browser verification.
- [ ] Deployment with durable storage or documented external blocker; genuine commits and submission documentation.

## Architecture
TypeScript + React on the supplied Vinext/Cloudflare Worker runtime; SQLite locally and Cloudflare D1 when hosted. One application with JSON API and responsive frontend. Sites platform authentication remains the outer hosted boundary. Application demo account authentication uses bcrypt password verification and opaque server-side sessions to demonstrate independent student/admin roles. Demo credentials are explicitly public and have access to fictional records only. No self-registration or real personal data.

## Data model
Users (role, password hash), sessions (hashed token, expiry), equipment (quantity, category, location, active), reservations (owner, equipment, interval, quantity, state, idempotency key), maintenance (equipment, interval, reason), audit events. Foreign keys, CHECK constraints, unique idempotency keys and SQLite triggers protect invariants at the database boundary.

## Rules
All UI dates are Asia/Kolkata (IST); stored as UTC epoch milliseconds. Half-open intervals [start, end): adjacent reservations do not overlap. Maximum booking duration 7 days, horizon 90 days. Quantity consumes peak simultaneous capacity, not the sum of all reservations in a window. Reservations begin as RESERVED; student may cancel before start; admin may issue from 15 minutes before start until end, then return ISSUED. Terminal states CANCELLED and RETURNED cannot be reopened. Overdue is computed for ISSUED with end < now. Overdue units block new booking/issue until returned. A due booking is not a guarantee that a previous borrower returns on time.

Maintenance blocks all units in its interval and rejects any overlap with RESERVED/ISSUED records. Inventory reductions/archive reject outstanding reservations. SQLite triggers evaluate capacity within the same serialized write as insertion, protecting concurrent requests and direct database writes. Duplicate reserve requests use an owner-scoped idempotency key; reusing a key with different input is an error.

## Submission assumptions
No attached guideline document is visible; map submission to the user's message until supplied. Student name remains blank. Never submit the official form on the student's behalf. Sites begins private; evaluator access may require the owner's sharing action. GitHub CLI credentials are expired; connected GitHub identity differs from local Git identity, so do not publish to an inferred account without resolving that mismatch.

## Completion record

See SUBMISSION.md for the final mapped checklist and TESTING.md for executed evidence. The final application adds a portable Node/SQLite runtime alongside the Worker/D1 target. SQL files are the canonical schema. The intended GitHub repository was confirmed as https://github.com/anoushkawayangankar/campslot; publication requires authentication and task network permissions.
