/**
 * Validates optional standalone-runtime environment variables.
 * Hosted Sites/Workers use D1 bindings from .openai/hosting.json — not these vars.
 */
export type LocalEnv = {
  port: number;
  host: string;
  origin: string;
  databasePath: string;
};

function fail(message: string): never {
  throw new Error(`CampusSlot configuration error: ${message}`);
}

export function resolveLocalEnv(
  env: Record<string, string | undefined> = process.env,
): LocalEnv {
  const portRaw = env.PORT ?? "3000";
  const port = Number(portRaw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    fail(
      `PORT must be an integer between 1 and 65535 (received ${JSON.stringify(portRaw)}).`,
    );
  }

  const host = (env.HOST ?? "127.0.0.1").trim();
  if (!host) fail("HOST must be a non-empty hostname or IP address.");

  const databasePath = (env.DATABASE_PATH ?? "data/campusslot.sqlite").trim();
  if (!databasePath) {
    fail(
      "DATABASE_PATH must point to a writable SQLite file path (for example data/campusslot.sqlite).",
    );
  }

  const defaultOrigin = `http://${host === "0.0.0.0" ? "localhost" : host}:${port}`;
  const origin = (env.APP_ORIGIN ?? defaultOrigin).trim().replace(/\/$/, "");
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    fail(
      `APP_ORIGIN must be an absolute URL such as http://127.0.0.1:3000 or https://example.com (received ${JSON.stringify(env.APP_ORIGIN)}).`,
    );
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    fail(`APP_ORIGIN must use http or https (received ${parsed.protocol}).`);
  }
  if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
    fail(
      "APP_ORIGIN must be origin-only (scheme + host + optional port), with no path, query, or fragment.",
    );
  }

  return { port, host, origin, databasePath };
}
