import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveLocalEnv } from "../lib/server/env.ts";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Worker } from "node:worker_threads";
import { fixture, booking, asha, ravi, admin } from "./helpers.ts";
import {
  reserve,
  availability,
  transition,
  getReservation,
  listReservations,
  saveEquipment,
  addMaintenance,
} from "../lib/server/service.ts";
import { interval, peakUsage } from "../lib/server/rules.ts";
import { sqliteAdapter } from "../lib/server/sqlite.ts";

test("interval validation rejects past, invalid, reversed, overlong and distant dates", () => {
  const now = Date.now();
  for (const [s, e] of [
    [now - 1, now + 1],
    [NaN, now + 1],
    [now + 10, now + 10],
    [now + 20, now + 10],
    [now + 1, now + 8 * 86400000],
    [now + 91 * 86400000, now + 92 * 86400000],
  ])
    assert.throws(() => interval(s, e, now));
  assert.deepEqual(interval(now + 1000, now + 2000, now), [
    now + 1000,
    now + 2000,
  ]);
});
test("sweep line uses peak rather than sum and treats adjacent endpoints as non-overlapping", () => {
  assert.equal(
    peakUsage(
      [
        { start_at: 10, end_at: 20, quantity: 2 },
        { start_at: 20, end_at: 30, quantity: 2 },
      ],
      10,
      30,
    ),
    2,
  );
  assert.equal(
    peakUsage(
      [
        { start_at: 10, end_at: 25, quantity: 2 },
        { start_at: 20, end_at: 30, quantity: 1 },
      ],
      10,
      30,
    ),
    3,
  );
});
test("reserve, confirm, list, cancel and recover availability", async () => {
  const { db, raw } = fixture();
  try {
    const input = booking({ quantity: 2 });
    const { reservation: r } = await reserve(db, asha, input);
    assert.equal(r.status, "RESERVED");
    assert.equal((await listReservations(db, asha)).length, 1);
    assert.equal(
      (
        await availability(
          db,
          "camera",
          input.startAt as number,
          input.endAt as number,
        )
      ).available,
      0,
    );
    assert.equal(
      (await transition(db, asha, r.id, "cancel")).status,
      "CANCELLED",
    );
    assert.equal(
      (
        await availability(
          db,
          "camera",
          input.startAt as number,
          input.endAt as number,
        )
      ).available,
      2,
    );
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM audit").get()?.n, 2);
  } finally {
    raw.close();
  }
});
test("issue, repeat issue, return, repeat return and reject reopening", async () => {
  const { db, raw } = fixture();
  try {
    const { reservation: r } = await reserve(db, asha, booking());
    assert.equal((await transition(db, admin, r.id, "issue")).status, "ISSUED");
    assert.equal((await transition(db, admin, r.id, "issue")).status, "ISSUED");
    await assert.rejects(transition(db, asha, r.id, "cancel"), { status: 409 });
    assert.equal(
      (await transition(db, admin, r.id, "return")).status,
      "RETURNED",
    );
    assert.equal(
      (await transition(db, admin, r.id, "return")).status,
      "RETURNED",
    );
    await assert.rejects(transition(db, admin, r.id, "issue"), { status: 409 });
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM audit").get()?.n, 3);
  } finally {
    raw.close();
  }
});
test("issue outside pickup window and return before issue are rejected", async () => {
  const { db, raw } = fixture();
  try {
    const { reservation: r } = await reserve(
      db,
      asha,
      booking({ startAt: Date.now() + 3600000, endAt: Date.now() + 7200000 }),
    );
    await assert.rejects(transition(db, admin, r.id, "issue"), { status: 409 });
    await assert.rejects(transition(db, admin, r.id, "return"), {
      status: 409,
    });
  } finally {
    raw.close();
  }
});
test("overlapping requests exceeding capacity fail, adjacent request succeeds", async () => {
  const { db, raw } = fixture();
  try {
    const b = booking({ quantity: 2 });
    await reserve(db, asha, b);
    await assert.rejects(
      reserve(db, ravi, { ...b, requestKey: crypto.randomUUID(), quantity: 1 }),
      { status: 409 },
    );
    const adjacent = await reserve(
      db,
      ravi,
      booking({
        startAt: b.endAt,
        endAt: (b.endAt as number) + 3600000,
        quantity: 2,
      }),
    );
    assert.equal(adjacent.reservation.quantity, 2);
  } finally {
    raw.close();
  }
});
test("reservation spanning sequential existing bookings consumes peak, not total", async () => {
  const { db, raw } = fixture();
  try {
    const s = Date.now() + 3600000;
    await reserve(db, asha, booking({ startAt: s, endAt: s + 3600000 }));
    await reserve(
      db,
      asha,
      booking({ startAt: s + 3600000, endAt: s + 7200000 }),
    );
    assert.equal(
      (await reserve(db, ravi, booking({ startAt: s, endAt: s + 7200000 })))
        .reservation.quantity,
      1,
    );
  } finally {
    raw.close();
  }
});
test("capacity check catches a peak beginning inside the requested interval", async () => {
  const { db, raw } = fixture();
  try {
    const s = Date.now() + 3600000;
    await reserve(
      db,
      asha,
      booking({ startAt: s + 1000, endAt: s + 3000, quantity: 2 }),
    );
    await assert.rejects(
      reserve(db, ravi, booking({ startAt: s, endAt: s + 5000 })),
      { status: 409 },
    );
  } finally {
    raw.close();
  }
});
test("idempotent duplicate returns same record; changed payload conflicts", async () => {
  const { db, raw } = fixture();
  try {
    const b = booking();
    const a = await reserve(db, asha, b),
      c = await reserve(db, asha, b);
    assert.equal(a.reservation.id, c.reservation.id);
    assert.equal(c.replayed, true);
    await assert.rejects(reserve(db, asha, { ...b, quantity: 2 }), {
      status: 409,
    });
    assert.equal((await listReservations(db, asha)).length, 1);
  } finally {
    raw.close();
  }
});
test("private resources are hidden from another student and admin-only operations denied", async () => {
  const { db, raw } = fixture();
  try {
    const { reservation: r } = await reserve(db, asha, booking());
    await assert.rejects(getReservation(db, ravi, r.id), { status: 404 });
    await assert.rejects(transition(db, ravi, r.id, "cancel"), { status: 404 });
    assert.deepEqual(await listReservations(db, ravi), []);
    await assert.rejects(transition(db, asha, r.id, "issue"), { status: 403 });
    await assert.rejects(saveEquipment(db, asha, {}), { status: 403 });
    await assert.rejects(addMaintenance(db, asha, "camera", {}), {
      status: 403,
    });
    await assert.rejects(reserve(db, admin, booking()), { status: 403 });
  } finally {
    raw.close();
  }
});
test("maintenance blocks all units, allows adjacency, and rejects reservation overlaps", async () => {
  const { db, raw } = fixture();
  try {
    const s = Date.now() + 3600000;
    await addMaintenance(db, admin, "camera", {
      startAt: s,
      endAt: s + 3600000,
      reason: "Calibration",
    });
    assert.equal(
      (await availability(db, "camera", s, s + 3600000)).available,
      0,
    );
    await assert.rejects(
      reserve(db, asha, booking({ startAt: s, endAt: s + 1000 })),
      { status: 409 },
    );
    await reserve(
      db,
      asha,
      booking({ startAt: s + 3600000, endAt: s + 7200000 }),
    );
    await assert.rejects(
      addMaintenance(db, admin, "camera", {
        startAt: s + 4000000,
        endAt: s + 5000000,
        reason: "Conflicting service",
      }),
      { status: 409 },
    );
    await assert.rejects(
      addMaintenance(db, admin, "camera", {
        startAt: s + 1000,
        endAt: s + 2000,
        reason: "Duplicate service",
      }),
      { status: 409 },
    );
  } finally {
    raw.close();
  }
});
test("inventory decrease/archive rejects outstanding bookings; increase works", async () => {
  const { db, raw } = fixture();
  try {
    const { reservation: r } = await reserve(db, asha, booking());
    const input = {
      name: "Camera",
      category: "Photography",
      description: "Camera kit",
      location: "Media lab",
      capacity: 1,
    };
    await assert.rejects(saveEquipment(db, admin, input, "camera"), {
      status: 409,
    });
    await assert.rejects(
      saveEquipment(
        db,
        admin,
        { ...input, capacity: 2, active: false },
        "camera",
      ),
      { status: 409 },
    );
    assert.equal(
      (await saveEquipment(db, admin, { ...input, capacity: 3 }, "camera"))
        .capacity,
      3,
    );
    await transition(db, asha, r.id, "cancel");
    await saveEquipment(db, admin, { ...input, active: false }, "camera");
    await assert.rejects(reserve(db, asha, booking()), { status: 409 });
  } finally {
    raw.close();
  }
});
test("missing equipment, invalid quantities and missing purpose are rejected", async () => {
  const { db, raw } = fixture();
  try {
    await assert.rejects(
      reserve(db, asha, booking({ equipmentId: "missing" })),
      { status: 404 },
    );
    for (const quantity of [0, -1, 1.5, 101, "1"])
      await assert.rejects(reserve(db, asha, booking({ quantity })), {
        status: 400,
      });
    await assert.rejects(reserve(db, asha, booking({ purpose: " " })), {
      status: 400,
    });
  } finally {
    raw.close();
  }
});
test("SQLite enforces capacity and immutable records even outside service code", async () => {
  const { db, raw } = fixture();
  try {
    const b = booking({ quantity: 2 });
    const { reservation: r } = await reserve(db, asha, b);
    assert.throws(
      () =>
        raw
          .prepare(
            "INSERT INTO reservations (id,user_id,equipment_id,start_at,end_at,quantity,status,purpose,request_key,created_at,updated_by) VALUES('direct','student-ravi','camera',?,?,1,'RESERVED','test','direct',?,'student-ravi')",
          )
          .run(b.startAt as number, b.endAt as number, Date.now()),
      /CAPACITY_CONFLICT/,
    );
    assert.throws(
      () =>
        raw.prepare("UPDATE reservations SET quantity=1 WHERE id=?").run(r.id),
      /STATE_CONFLICT/,
    );
    assert.throws(
      () =>
        raw
          .prepare("UPDATE reservations SET status='RETURNED' WHERE id=?")
          .run(r.id),
      /STATE_CONFLICT/,
    );
  } finally {
    raw.close();
  }
});
test("overdue loans block bookings and appear on the desk until returned", async () => {
  const now = Date.now();
  const { db, raw } = fixture(":memory:", (sql) =>
    sql
      .prepare(
        "INSERT INTO reservations VALUES ('late','student-asha','camera',?,?,1,'ISSUED','Historical test fixture','late',?,?,NULL,'admin-meera')",
      )
      .run(now - 7200000, now - 3600000, now - 7200000, now - 7100000),
  );
  try {
    assert.equal((await listReservations(db, admin))[0].overdue, true);
    await assert.rejects(reserve(db, ravi, booking()), { status: 409 });
    await assert.rejects(
      addMaintenance(db, admin, "camera", {
        startAt: now + 3600000,
        endAt: now + 7200000,
        reason: "service",
      }),
      { status: 409 },
    );
    await transition(db, admin, "late", "return");
    assert.equal(
      (await reserve(db, ravi, booking())).reservation.status,
      "RESERVED",
    );
  } finally {
    raw.close();
  }
});
test("cancellation after start and issue after end are denied by database and service", async () => {
  const now = Date.now();
  const { db, raw } = fixture(":memory:", (sql) =>
    sql
      .prepare(
        "INSERT INTO reservations VALUES ('old','student-asha','camera',?,?,1,'RESERVED','Historical fixture','old',?,NULL,NULL,'student-asha')",
      )
      .run(now - 7200000, now - 3600000, now - 7200000),
  );
  try {
    await assert.rejects(transition(db, asha, "old", "cancel"), {
      status: 409,
    });
    await assert.rejects(transition(db, admin, "old", "issue"), {
      status: 409,
    });
    assert.throws(
      () =>
        raw
          .prepare("UPDATE reservations SET status='CANCELLED' WHERE id='old'")
          .run(),
      /STATE_CONFLICT/,
    );
  } finally {
    raw.close();
  }
});
test("data survives closing/reopening the database connection", async () => {
  const dir = mkdtempSync(join(tmpdir(), "campusslot-persistence-"));
  const path = join(dir, "db.sqlite");
  const { db, raw } = fixture(path);
  try {
    const { reservation: r } = await reserve(db, asha, booking());
    raw.close();
    const reopened = new DatabaseSync(path);
    try {
      assert.equal(
        (await getReservation(sqliteAdapter(reopened), asha, r.id)).status,
        "RESERVED",
      );
    } finally {
      reopened.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("12 independent concurrent SQLite writers compete for 2 units: exactly 2 succeed", async () => {
  const dir = mkdtempSync(join(tmpdir(), "campusslot-race-"));
  const path = join(dir, "db.sqlite");
  const { raw } = fixture(path);
  raw.exec("PRAGMA journal_mode=WAL");
  raw.close();
  const s = Date.now() + 3600000;
  const code = `const {parentPort,workerData}=require('node:worker_threads');const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(workerData.path);db.exec('PRAGMA foreign_keys=ON;PRAGMA busy_timeout=10000');parentPort.postMessage('ready');parentPort.once('message',()=>{try{db.prepare("INSERT INTO reservations (id,user_id,equipment_id,start_at,end_at,quantity,status,purpose,request_key,created_at,updated_by) VALUES (?, 'student-asha','camera',?,?,1,'RESERVED','Race test',?,?,'student-asha')").run(workerData.id,workerData.s,workerData.s+3600000,workerData.id,Date.now());parentPort.postMessage('ok')}catch(e){parentPort.postMessage(e.message)}finally{db.close()}});`;
  try {
    const workers = Array.from(
      { length: 12 },
      (_, i) =>
        new Worker(code, {
          eval: true,
          workerData: { path, s, id: "race-" + i },
        }),
    );
    await Promise.all(
      workers.map(
        (w) =>
          new Promise<void>((resolve, reject) => {
            w.once("message", () => resolve());
            w.once("error", reject);
          }),
      ),
    );
    const promises = workers.map(
      (w) =>
        new Promise<string>((resolve, reject) => {
          w.once("message", resolve);
          w.once("error", reject);
        }),
    );
    workers.forEach((w) => w.postMessage("go"));
    const results = await Promise.all(promises);
    assert.equal(results.filter((r) => r === "ok").length, 2);
    assert.equal(
      results.filter((r) => r.includes("CAPACITY_CONFLICT")).length,
      10,
    );
    await Promise.all(workers.map((w) => w.terminate()));
    const check = new DatabaseSync(path);
    assert.equal(
      check.prepare("SELECT SUM(quantity) q FROM reservations").get()?.q,
      2,
    );
    check.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("early pickup cannot take capacity promised to an adjacent reservation", async () => {
  const { db, raw } = fixture();
  try {
    const now = Date.now();
    const previous = await reserve(
      db,
      asha,
      booking({ startAt: now + 60000, endAt: now + 300000, quantity: 2 }),
    );
    const next = await reserve(
      db,
      ravi,
      booking({ startAt: now + 300000, endAt: now + 3600000, quantity: 2 }),
    );
    await assert.rejects(transition(db, admin, next.reservation.id, "issue"), {
      status: 409,
    });
    await transition(db, asha, previous.reservation.id, "cancel");
    assert.equal(
      (await transition(db, admin, next.reservation.id, "issue")).status,
      "ISSUED",
    );
    assert.equal(
      (await availability(db, "camera", now + 60000, now + 120000)).available,
      0,
    );
    await assert.rejects(
      reserve(db, asha, booking({ startAt: now + 60000, endAt: now + 120000 })),
      { status: 409 },
    );
  } finally {
    raw.close();
  }
});
test("early pickup is blocked by maintenance ending at the planned start", async () => {
  const { db, raw } = fixture();
  try {
    const now = Date.now();
    await addMaintenance(db, admin, "camera", {
      startAt: now + 60000,
      endAt: now + 300000,
      reason: "Calibration",
    });
    const r = await reserve(
      db,
      asha,
      booking({ startAt: now + 300000, endAt: now + 3600000 }),
    );
    await assert.rejects(transition(db, admin, r.reservation.id, "issue"), {
      status: 409,
    });
  } finally {
    raw.close();
  }
});
test("database refuses fractional capacities and quantities", () => {
  const { raw } = fixture();
  try {
    assert.throws(
      () => raw.prepare("UPDATE equipment SET capacity=1.5").run(),
      /INVENTORY_CONFLICT/,
    );
    const now = Date.now();
    assert.throws(
      () =>
        raw
          .prepare(
            "INSERT INTO reservations (id,user_id,equipment_id,start_at,end_at,quantity,status,purpose,request_key,created_at,updated_by) VALUES ('fraction','student-asha','camera',?,?,1.5,'RESERVED','test','fraction',?,'student-asha')",
          )
          .run(now + 10000, now + 20000, now),
      /INVALID_INTERVAL/,
    );
  } finally {
    raw.close();
  }
});

test("repeated inventory creation conflicts without duplicates; new archived equipment stays archived", async () => {
  const { db, raw } = fixture();
  try {
    const input = {
      name: "Sensor kit",
      category: "Electronics",
      description: "Fictional kit",
      location: "Lab 1",
      capacity: 2,
      active: false,
    };
    assert.equal((await saveEquipment(db, admin, input)).active, 0);
    await assert.rejects(
      saveEquipment(db, admin, {
        ...input,
        name: "sensor KIT",
        location: "lab 1",
      }),
      { status: 409 },
    );
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM equipment").get()?.n, 2);
  } finally {
    raw.close();
  }
});
test("eight simultaneous identical booking submissions produce exactly one record", async () => {
  const { db, raw } = fixture();
  try {
    const b = booking({ quantity: 2 });
    const results = await Promise.all(
      Array.from({ length: 8 }, () => reserve(db, asha, b)),
    );
    assert.equal(new Set(results.map((r) => r.reservation.id)).size, 1);
    assert.equal(results.filter((r) => !r.replayed).length, 1);
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM audit").get()?.n, 1);
  } finally {
    raw.close();
  }
});
test("local env validation rejects invalid PORT, APP_ORIGIN, HOST and DATABASE_PATH", () => {
  const ok = resolveLocalEnv({
    PORT: "3000",
    HOST: "127.0.0.1",
    APP_ORIGIN: "http://127.0.0.1:3000",
    DATABASE_PATH: "data/campusslot.sqlite",
  });
  assert.equal(ok.port, 3000);
  assert.equal(ok.origin, "http://127.0.0.1:3000");
  assert.throws(() => resolveLocalEnv({ PORT: "nope" }), /PORT must be/);
  assert.throws(
    () => resolveLocalEnv({ APP_ORIGIN: "http://127.0.0.1:3000/admin" }),
    /origin-only/,
  );
  assert.throws(() => resolveLocalEnv({ HOST: "" }), /HOST must be/);
  assert.throws(
    () => resolveLocalEnv({ DATABASE_PATH: "  " }),
    /DATABASE_PATH/,
  );
});
