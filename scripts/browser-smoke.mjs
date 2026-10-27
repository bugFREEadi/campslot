// Full browser journeys against the real HTTP server. No network stubs or mock data APIs.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { openLocalStore } from "../lib/server/local-store.ts";
import { seedDemo } from "../lib/server/seed.ts";
const base = process.env.BASE_URL ?? "http://127.0.0.1:3107";
const artifacts = "artifacts/browser";
mkdirSync(artifacts, { recursive: true });
let server, browser, temp;
try {
  if (!process.env.BASE_URL) {
    temp = mkdtempSync(join(tmpdir(), "campusslot-browser-"));
    const file = join(temp, "demo.sqlite");
    const store = openLocalStore(file);
    await seedDemo(store.db);
    store.raw.close();
    server = spawn(process.execPath, ["scripts/serve-local.ts"], {
      env: {
        ...process.env,
        DATABASE_PATH: file,
        PORT: "3107",
        HOST: "127.0.0.1",
        APP_ORIGIN: base,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let logs = "";
    server.stdout.on("data", (d) => (logs += d));
    server.stderr.on("data", (d) => (logs += d));
    for (let i = 0; i < 80; i++) {
      if (server.exitCode !== null)
        throw new Error("Local server could not start: " + logs);
      try {
        if ((await fetch(base + "/api/health")).ok) break;
      } catch {}
      if (i === 79) throw new Error("Local server startup timeout: " + logs);
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  browser = await chromium.launch({ headless: !process.env.HEADED });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
    recordVideo: { dir: artifacts, size: { width: 1440, height: 1050 } },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  async function login(account) {
    await page.getByRole("button", { name: account, exact: true }).click();
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page
      .getByRole("heading", { name: "What will you make next?" })
      .waitFor();
  }
  async function book(purpose) {
    await page.getByRole("button", { name: "Discover", exact: true }).click();
    await page
      .getByRole("button", { name: "View Mirrorless camera kit", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Project or purpose").fill(purpose);
    await dialog.getByRole("button", { name: "Confirm reservation" }).click();
    await page
      .getByRole("heading", { name: "Your plans, reserved." })
      .waitFor();
  }
  await page.goto(base);
  await login("Asha · Student");
  await page.getByLabel("Search equipment").fill("camera");
  await page
    .getByRole("heading", { name: "Mirrorless camera kit", exact: true })
    .waitFor();
  await page.getByLabel("Search equipment").fill("");
  await page
    .getByRole("button", { name: "Check availability", exact: true })
    .click();
  await page.getByText("3 of 3 available", { exact: true }).waitFor();
  await page.screenshot({
    path: artifacts + "/desktop-discovery.png",
    fullPage: true,
  });
  await book("Browser QA — cancellation");
  await page.reload();
  await page
    .getByRole("button", { name: "My reservations", exact: true })
    .click();
  let card = page.locator(".reservation-card").first();
  await card.getByRole("button", { name: "Cancel", exact: true }).click();
  await card.getByText("CANCELLED", { exact: true }).waitFor();
  await book("Browser QA — issue and return");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await login("Meera · Admin");
  await page.getByRole("button", { name: "Lending desk", exact: true }).click();
  card = page.locator(".reservation-card").first();
  await card.getByRole("button", { name: "Issue equipment" }).click();
  await card.getByText("ISSUED", { exact: true }).waitFor();
  await card.getByRole("button", { name: "Record return" }).click();
  await card.getByText("RETURNED", { exact: true }).waitFor();
  await page.screenshot({
    path: artifacts + "/lending-desk.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Inventory", exact: true }).click();
  await page
    .getByRole("button", { name: "Add equipment", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  const name = "Browser QA projector " + Date.now();
  await dialog.getByLabel("Equipment name").fill(name);
  await dialog
    .getByLabel("Category", { exact: true })
    .selectOption("Presentation");
  await dialog.getByLabel("Total units").fill("2");
  await dialog.getByLabel("Collection location").fill("Fictional QA Lab");
  await dialog
    .getByLabel("Description & collection notes")
    .fill("Fictional automated-test equipment; archived after verification.");
  await dialog.getByRole("button", { name: "Save equipment" }).click();
  const row = page
    .locator(".inventory-row")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
  await row.getByRole("button", { name: "Maintenance" }).click();
  dialog = page.getByRole("dialog");
  const start = Date.now() + 86400000;
  const local = (ms) => new Date(ms + 19800000).toISOString().slice(0, 16);
  await dialog.getByLabel("From", { exact: false }).fill(local(start));
  await dialog
    .getByLabel("Until", { exact: false })
    .fill(local(start + 3600000));
  await dialog
    .getByLabel("Reason", { exact: true })
    .fill("Browser QA calibration");
  await dialog.getByRole("button", { name: "Schedule maintenance" }).click();
  await dialog.getByText("Browser QA calibration", { exact: true }).waitFor();
  await dialog.getByRole("button", { name: "Remove", exact: true }).click();
  await dialog.getByText("No upcoming maintenance.", { exact: true }).waitFor();
  await dialog.getByRole("button", { name: "Close dialog" }).click();
  await row.getByRole("button", { name: "Edit", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Total units").fill("1");
  await dialog
    .getByLabel("Available in the catalogue", { exact: false })
    .uncheck();
  await dialog.getByRole("button", { name: "Save equipment" }).click();
  await page.getByText("ARCHIVED", { exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Discover", exact: true }).click();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
    "Mobile layout must not overflow horizontally",
  );
  await page.screenshot({
    path: artifacts + "/mobile-discovery.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "View Arduino discovery kit", exact: true })
    .click();
  await page.screenshot({
    path: artifacts + "/mobile-details.png",
    fullPage: true,
  });
  assert.deepEqual(errors, [], "No uncaught browser errors");
  await context.close();
  console.log(
    "PASS: browser booking/reload/cancellation, issue/return, inventory/maintenance, mobile width and error checks. Screenshots and unedited video: " +
      artifacts,
  );
} finally {
  await browser?.close();
  if (server) {
    server.kill("SIGTERM");
    await new Promise((resolve) => {
      if (server.exitCode !== null) resolve();
      else {
        server.once("exit", resolve);
        setTimeout(resolve, 3000);
      }
    });
  }
  if (temp) rmSync(temp, { recursive: true, force: true });
}
