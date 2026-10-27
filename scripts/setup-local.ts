import { openLocalStore } from "../lib/server/local-store.ts";
import { seedDemo } from "../lib/server/seed.ts";
const store = openLocalStore();
try {
  await seedDemo(store.db);
  console.log(
    "Migrations applied; fictional demo seeded without resetting existing records.",
  );
  console.log("Database: " + store.path);
} finally {
  store.raw.close();
}
