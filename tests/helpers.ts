import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import { sqliteAdapter } from "../lib/server/sqlite.ts";
import type { User } from "../lib/types.ts";
export const asha: User = {
  id: "student-asha",
  email: "asha@campus.demo",
  name: "Asha Rao",
  role: "student",
};
export const ravi: User = {
  id: "student-ravi",
  email: "ravi@campus.demo",
  name: "Ravi Shah",
  role: "student",
};
export const admin: User = {
  id: "admin-meera",
  email: "admin@campus.demo",
  name: "Meera Patel",
  role: "admin",
};
const hash = bcrypt.hashSync("CampusDemo!2026", 10);
export function fixture(
  path = ":memory:",
  beforeGuards?: (raw: DatabaseSync) => void,
) {
  const raw = new DatabaseSync(path);
  raw.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
  raw.exec(readFileSync("drizzle/0000_schema.sql", "utf8"));
  for (const u of [asha, ravi, admin])
    raw
      .prepare("INSERT INTO users VALUES(?,?,?,?,?)")
      .run(u.id, u.email, u.name, u.role, hash);
  raw
    .prepare("INSERT INTO equipment VALUES(?,?,?,?,?,?,?,?)")
    .run(
      "camera",
      "Camera",
      "Photography",
      "A fictional camera kit",
      "Media lab",
      2,
      1,
      Date.now(),
    );
  beforeGuards?.(raw);
  raw.exec(readFileSync("drizzle/0001_invariants.sql", "utf8"));
  raw.exec(readFileSync("drizzle/0002_pickup_and_numeric_guards.sql", "utf8"));
  raw.exec(readFileSync("drizzle/0003_inventory_identity.sql", "utf8"));
  return { raw, db: sqliteAdapter(raw) };
}
export function booking(extra: Record<string, unknown> = {}) {
  const start = Date.now() + 300000;
  return {
    equipmentId: "camera",
    startAt: start,
    endAt: start + 3600000,
    quantity: 1,
    purpose: "Course project",
    requestKey: crypto.randomUUID(),
    ...extra,
  };
}
