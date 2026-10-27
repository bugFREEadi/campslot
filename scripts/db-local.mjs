import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import "./sites-env.mjs";
mkdirSync(".sites-runtime", { recursive: true });
const config = resolve(".sites-runtime/local-db.json");
writeFileSync(
  config,
  JSON.stringify({
    name: "campusslot-local",
    compatibility_date: "2026-05-15",
    d1_databases: [
      {
        binding: "DB",
        database_name: "site-creator-d1",
        database_id: "00000000-0000-4000-8000-000000000000",
        migrations_dir: resolve("drizzle"),
      },
    ],
  }),
);
const result = spawnSync(
  process.execPath,
  [
    "node_modules/wrangler/bin/wrangler.js",
    "d1",
    "migrations",
    "apply",
    "DB",
    "--local",
    "--config",
    config,
    "--persist-to",
    ".wrangler/state",
  ],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
