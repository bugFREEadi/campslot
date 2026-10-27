import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { sqliteAdapter } from "./sqlite.ts";
export function openLocalStore(
  filename = process.env.DATABASE_PATH ?? "data/campusslot.sqlite",
) {
  const path = resolve(filename);
  mkdirSync(dirname(path), { recursive: true });
  const raw = new DatabaseSync(path);
  raw.exec(
    "PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;",
  );
  raw.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)",
  );
  for (const name of readdirSync("drizzle")
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    if (
      raw.prepare("SELECT name FROM schema_migrations WHERE name=?").get(name)
    )
      continue;
    raw.exec("BEGIN IMMEDIATE");
    try {
      raw.exec(readFileSync(resolve("drizzle", name), "utf8"));
      raw
        .prepare("INSERT INTO schema_migrations VALUES(?,?)")
        .run(name, Date.now());
      raw.exec("COMMIT");
    } catch (e) {
      raw.exec("ROLLBACK");
      raw.close();
      throw e;
    }
  }
  return { raw, db: sqliteAdapter(raw), path };
}
