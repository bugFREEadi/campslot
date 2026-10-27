# API reference

Base path `/api`. Request/response bodies are JSON. All endpoints except health, sign-in, current-session lookup and fixed one-time demo setup require an authenticated session cookie.

Mutations require:

```http
Content-Type: application/json
Origin: <exact application origin>
X-CampusSlot-Request: 1
```

| Method / path | Purpose | Authorization |
| --- | --- | --- |
| `GET /health` | Database connectivity | Public; no records disclosed |
| `POST /demo/setup` | One-time fixed fictional dataset | Empty database only; hosted private access applies |
| `POST /auth/login` | `{email,password}` → user + HttpOnly cookie | Public, rate-limited |
| `GET /auth/me` | Current user or `null` | Public |
| `POST /auth/logout` | Delete current session | Signed in |
| `GET /equipment?q=&category=` | Catalogue search | Both roles; student catalogue excludes archived |
| `GET /equipment/:id` | Details and upcoming maintenance | Both roles |
| `GET /equipment/:id/availability?start=&end=` | Available quantity for UTC epoch-ms interval | Both roles |
| `POST /equipment` | Create inventory group | Admin |
| `PATCH /equipment/:id` | Edit fields/capacity/archive flag | Admin |
| `POST /equipment/:id/maintenance` | Add full-capacity block | Admin |
| `DELETE /maintenance/:id` | Remove block | Admin |
| `GET /reservations` | Latest 500 visible records | Student own; admin all |
| `POST /reservations` | Book equipment | Student |
| `GET /reservations/:id` | Detail and audit events | Owner or admin |
| `PATCH /reservations/:id` | `{action:"cancel"|"issue"|"return"}` | Role/state rules apply |

Reservation request:

```json
{
  "equipmentId": "eq-camera",
  "startAt": 1793203200000,
  "endAt": 1793206800000,
  "quantity": 1,
  "purpose": "Course project photography",
  "requestKey": "a-new-random-uuid-for-this-intent"
}
```

The example timestamps are illustrative. Generate future timestamps when testing. Successful new reservations return 201 with `{reservation,replayed:false}`. Exact retries return 200 with the same record and `replayed:true`. Keep the same key while retrying an uncertain result; change it when changing the booking intent.

Equipment request:

```json
{
  "name": "Demonstration sensor kit",
  "category": "Electronics",
  "description": "Fictional lab kit with cable and sensors.",
  "location": "Lab A-203",
  "capacity": 4,
  "active": true
}
```

Maintenance request: `{startAt,endAt,reason}`. Quantity is not accepted: maintenance blocks the equipment type's entire capacity.

Errors return `{"error":"Human-readable explanation."}` with 400 for invalid data, 401 for missing/invalid session, 403 for forbidden actions or CSRF failure, 404 for missing/inaccessible resources, 409 for lifecycle/capacity/maintenance conflicts, 413 for oversized data, 415 for unsupported content type, 429 for login throttling, and 503 for a transient database failure. Browser-network errors are displayed by the frontend. Private API responses use `Cache-Control: no-store`.
