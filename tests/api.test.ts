import { test } from "node:test";
import assert from "node:assert/strict";
import { handleApi } from "../lib/server/api.ts";
import { fixture, booking } from "./helpers.ts";
import type { Database } from "../lib/server/database.ts";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { sqliteAdapter } from "../lib/server/sqlite.ts";
const origin = "http://localhost:5173";
function req(
  path: string,
  method = "GET",
  body?: unknown,
  cookie = "",
  extra: Record<string, string> = {},
) {
  return new Request(origin + "/api/" + path, {
    method,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      "X-CampusSlot-Request": "1",
      Cookie: cookie,
      ...extra,
    },
    ...(body === undefined
      ? {}
      : { body: typeof body === "string" ? body : JSON.stringify(body) }),
  });
}
async function signIn(db: Database, email = "asha@campus.demo") {
  const response = await handleApi(
    req("auth/login", "POST", { email, password: "CampusDemo!2026" }),
    db,
  );
  assert.equal(response.status, 200);
  return response.headers.get("set-cookie")!;
}
test("sign in sets HttpOnly/SameSite cookie, stores only hashed session token, and logout revokes it", async () => {
  const { db, raw } = fixture();
  try {
    const cookie = await signIn(db);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Strict/);
    const token = cookie.split(";")[0].split("=")[1];
    assert.notEqual(
      raw.prepare("SELECT token_hash FROM sessions").get()?.token_hash,
      token,
    );
    assert.equal(
      (
        (await handleApi(req("auth/me", "GET", undefined, cookie), db).then(
          (r) => r.json(),
        )) as { user: { email: string } }
      ).user.email,
      "asha@campus.demo",
    );
    assert.equal(
      (await handleApi(req("auth/logout", "POST", {}, cookie), db)).status,
      200,
    );
    assert.equal(
      (await handleApi(req("reservations", "GET", undefined, cookie), db))
        .status,
      401,
    );
  } finally {
    raw.close();
  }
});
test("invalid passwords and unknown accounts get identical errors; brute-force attempts are limited", async () => {
  const { db, raw } = fixture();
  try {
    const a = await handleApi(
        req("auth/login", "POST", {
          email: "asha@campus.demo",
          password: "wrong",
        }),
        db,
      ),
      b = await handleApi(
        req("auth/login", "POST", {
          email: "missing@campus.demo",
          password: "wrong",
        }),
        db,
      );
    assert.equal(a.status, 401);
    assert.deepEqual(await a.json(), await b.json());
    raw.prepare("UPDATE login_attempts SET count=20").run();
    assert.equal(
      (
        await handleApi(
          req("auth/login", "POST", {
            email: "asha@campus.demo",
            password: "wrong",
          }),
          db,
        )
      ).status,
      429,
    );
    assert.match(
      String(
        raw
          .prepare("SELECT password_hash FROM users WHERE id='student-asha'")
          .get()?.password_hash,
      ),
      /^\$2[aby]\$/,
    );
  } finally {
    raw.close();
  }
});
test("HTTPS cookies are Secure and expired or forged sessions are unauthenticated", async () => {
  const { db, raw } = fixture();
  try {
    const request = new Request("https://campus.test/api/auth/login", {
      method: "POST",
      headers: {
        Origin: "https://campus.test",
        "Content-Type": "application/json",
        "X-CampusSlot-Request": "1",
      },
      body: JSON.stringify({
        email: "asha@campus.demo",
        password: "CampusDemo!2026",
      }),
    });
    const response = await handleApi(request, db);
    assert.match(response.headers.get("set-cookie")!, /Secure/);
    const cookie = response.headers.get("set-cookie")!;
    raw.prepare("UPDATE sessions SET expires_at=0").run();
    assert.equal(
      (await handleApi(req("reservations", "GET", undefined, cookie), db))
        .status,
      401,
    );
    assert.equal(
      (
        await handleApi(
          req(
            "reservations",
            "GET",
            undefined,
            "campusslot_session=" + "a".repeat(64),
          ),
          db,
        )
      ).status,
      401,
    );
  } finally {
    raw.close();
  }
});
test("CSRF rejects foreign or missing origins and missing custom headers", async () => {
  const { db, raw } = fixture();
  try {
    const cases: Record<string, string>[] = [
      { Origin: "https://evil.example" },
      { Origin: "" },
      { "X-CampusSlot-Request": "" },
    ];
    for (const extra of cases)
      assert.equal(
        (await handleApi(req("auth/login", "POST", {}, "", extra), db)).status,
        403,
      );
    assert.equal(
      (
        await handleApi(
          req("auth/login", "POST", {}, "", { "Content-Type": "text/plain" }),
          db,
        )
      ).status,
      415,
    );
  } finally {
    raw.close();
  }
});
test("malformed JSON, array body, overlarge body and unknown route return useful statuses", async () => {
  const { db, raw } = fixture();
  try {
    assert.equal(
      (await handleApi(req("auth/login", "POST", "{"), db)).status,
      400,
    );
    assert.equal(
      (await handleApi(req("auth/login", "POST", []), db)).status,
      400,
    );
    assert.equal(
      (await handleApi(req("auth/login", "POST", "x".repeat(16001)), db))
        .status,
      413,
    );
    const cookie = await signIn(db);
    assert.equal(
      (await handleApi(req("unknown", "GET", undefined, cookie), db)).status,
      404,
    );
  } finally {
    raw.close();
  }
});
test("full API journey: search, detail, availability, book, reload, cancel; second student cannot see it", async () => {
  const { db, raw } = fixture();
  try {
    const cookie = await signIn(db);
    const inventory = await handleApi(
      req("equipment?q=Camera&category=Photography", "GET", undefined, cookie),
      db,
    );
    assert.equal(inventory.status, 200);
    assert.equal(
      ((await inventory.json()) as { equipment: unknown[] }).equipment.length,
      1,
    );
    assert.equal(
      (await handleApi(req("equipment/camera", "GET", undefined, cookie), db))
        .status,
      200,
    );
    const b = booking();
    const a = await handleApi(
      req(
        `equipment/camera/availability?start=${b.startAt}&end=${b.endAt}`,
        "GET",
        undefined,
        cookie,
      ),
      db,
    );
    assert.equal(((await a.json()) as { available: number }).available, 2);
    const create = await handleApi(req("reservations", "POST", b, cookie), db);
    assert.equal(create.status, 201);
    const { reservation: r } = (await create.json()) as {
      reservation: { id: string };
    };
    assert.equal(
      (await handleApi(req("reservations", "POST", b, cookie), db)).status,
      200,
    );
    const reloaded = await handleApi(
      req(`reservations/${r.id}`, "GET", undefined, cookie),
      db,
    );
    assert.equal(reloaded.status, 200);
    assert.equal(reloaded.headers.get("cache-control"), "no-store");
    const other = await signIn(db, "ravi@campus.demo");
    assert.equal(
      (
        await handleApi(
          req(`reservations/${r.id}`, "GET", undefined, other),
          db,
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await handleApi(
          req(`reservations/${r.id}`, "PATCH", { action: "cancel" }, other),
          db,
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await handleApi(
          req(`reservations/${r.id}`, "PATCH", { action: "issue" }, cookie),
          db,
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await handleApi(
          req(`reservations/${r.id}`, "PATCH", { action: "cancel" }, cookie),
          db,
        )
      ).status,
      200,
    );
  } finally {
    raw.close();
  }
});
test("full administrator API journey: add, edit, maintenance blocks student, remove, issue, return", async () => {
  const { db, raw } = fixture();
  try {
    const admin = await signIn(db, "admin@campus.demo"),
      student = await signIn(db);
    const equipment = {
      name: "Test projector",
      category: "Presentation",
      location: "Room 1",
      description: "Test fixture",
      capacity: 1,
    };
    assert.equal(
      (await handleApi(req("equipment", "POST", equipment, student), db))
        .status,
      403,
    );
    const added = await handleApi(
      req("equipment", "POST", equipment, admin),
      db,
    );
    assert.equal(added.status, 201);
    const { equipment: e } = (await added.json()) as {
      equipment: { id: string };
    };
    assert.equal(
      (
        await handleApi(
          req(
            "equipment/" + e.id,
            "PATCH",
            { ...equipment, capacity: 2 },
            admin,
          ),
          db,
        )
      ).status,
      200,
    );
    const b = booking({ equipmentId: e.id });
    const maintenance = await handleApi(
      req(
        `equipment/${e.id}/maintenance`,
        "POST",
        { startAt: b.startAt, endAt: b.endAt, reason: "Servicing" },
        admin,
      ),
      db,
    );
    assert.equal(maintenance.status, 201);
    const { maintenance: m } = (await maintenance.json()) as {
      maintenance: { id: string };
    };
    assert.equal(
      (await handleApi(req("reservations", "POST", b, student), db)).status,
      409,
    );
    assert.equal(
      (await handleApi(req("maintenance/" + m.id, "DELETE", {}, student), db))
        .status,
      403,
    );
    assert.equal(
      (await handleApi(req("maintenance/" + m.id, "DELETE", {}, admin), db))
        .status,
      200,
    );
    const booked = await handleApi(req("reservations", "POST", b, student), db);
    const { reservation: r } = (await booked.json()) as {
      reservation: { id: string };
    };
    assert.equal(
      (
        await handleApi(
          req("reservations/" + r.id, "PATCH", { action: "issue" }, admin),
          db,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await handleApi(
          req("reservations/" + r.id, "PATCH", { action: "return" }, admin),
          db,
        )
      ).status,
      200,
    );
    const detail = await handleApi(
      req("reservations/" + r.id, "GET", undefined, admin),
      db,
    );
    assert.equal(
      ((await detail.json()) as { events: unknown[] }).events.length,
      3,
    );
  } finally {
    raw.close();
  }
});
test("seed is explicit, repeat-safe and never resets existing data", async () => {
  const raw = new DatabaseSync(":memory:");
  raw.exec("PRAGMA foreign_keys=ON");
  raw.exec(readFileSync("drizzle/0000_schema.sql", "utf8"));
  raw.exec(readFileSync("drizzle/0001_invariants.sql", "utf8"));
  raw.exec(readFileSync("drizzle/0002_pickup_and_numeric_guards.sql", "utf8"));
  const db = sqliteAdapter(raw);
  try {
    assert.equal(
      (await handleApi(req("demo/setup", "POST", {}), db)).status,
      201,
    );
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM equipment").get()?.n, 6);
    assert.equal(
      (await handleApi(req("demo/setup", "POST", {}), db)).status,
      409,
    );
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM users").get()?.n, 3);
  } finally {
    raw.close();
  }
});
test("SQL injection in search/login is treated as data", async () => {
  const { db, raw } = fixture();
  try {
    const cookie = await signIn(db);
    const response = await handleApi(
      req(
        "equipment?q=" + encodeURIComponent("'; DROP TABLE users; --"),
        "GET",
        undefined,
        cookie,
      ),
      db,
    );
    assert.equal(response.status, 200);
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM users").get()?.n, 3);
    assert.equal(
      (
        await handleApi(
          req("auth/login", "POST", {
            email: "' OR 1=1 --",
            password: "wrong",
          }),
          db,
        )
      ).status,
      401,
    );
  } finally {
    raw.close();
  }
});

test("database/network failures become a retryable response without exposing raw errors", async (t) => {
  t.mock.method(console, "error", () => {});
  const broken = {
    prepare() {
      throw new Error("Internal connection detail must not reach the client");
    },
    async batch() {
      return [];
    },
  } as Database;
  const result = await handleApi(req("health"), broken);
  assert.equal(result.status, 503);
  const body = (await result.json()) as { error: string };
  assert.match(body.error, /temporarily unavailable/);
  assert.doesNotMatch(body.error, /Internal connection/);
});
