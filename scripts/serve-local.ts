import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { handleApi } from "../lib/server/api.ts";
import { openLocalStore } from "../lib/server/local-store.ts";
import { resolveLocalEnv } from "../lib/server/env.ts";
const { port, host, origin, databasePath } = resolveLocalEnv();
if (!existsSync("dist-local/index.html"))
  throw new Error("Build the frontend first: npm run build:local");
const store = openLocalStore(databasePath);
const assets: Record<string, [string, string]> = {
  "/": ["dist-local/index.html", "text/html; charset=utf-8"],
  "/app.js": ["dist-local/app.js", "text/javascript; charset=utf-8"],
  "/app.css": ["dist-local/app.css", "text/css; charset=utf-8"],
  "/favicon.svg": ["dist-local/favicon.svg", "image/svg+xml"],
};
const server = createServer(async (incoming, outgoing) => {
  try {
    const path = new URL(incoming.url ?? "/", origin).pathname;
    outgoing.setHeader("X-Content-Type-Options", "nosniff");
    outgoing.setHeader("Referrer-Policy", "same-origin");
    outgoing.setHeader("X-Frame-Options", "DENY");
    if (path.startsWith("/api/")) {
      const chunks: Buffer[] = [];
      let bytes = 0;
      for await (const chunk of incoming) {
        bytes += chunk.length;
        if (bytes > 16000) {
          outgoing.writeHead(413, { "Content-Type": "application/json" });
          outgoing.end(JSON.stringify({ error: "Request is too large." }));
          return;
        }
        chunks.push(Buffer.from(chunk));
      }
      const headers = new Headers();
      for (const [key, value] of Object.entries(incoming.headers))
        if (value)
          headers.set(key, Array.isArray(value) ? value.join(",") : value);
      const method = incoming.method ?? "GET";
      const request = new Request(new URL(incoming.url ?? "/", origin), {
        method,
        headers,
        ...(["GET", "HEAD"].includes(method)
          ? {}
          : { body: Buffer.concat(chunks).toString("utf8") }),
      });
      const response = await handleApi(request, store.db);
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    if (!["GET", "HEAD"].includes(incoming.method ?? "")) {
      outgoing.writeHead(405);
      outgoing.end();
      return;
    }
    const asset = assets[path];
    if (!asset) {
      outgoing.writeHead(404);
      outgoing.end("Not found");
      return;
    }
    outgoing.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
    );
    outgoing.writeHead(200, {
      "Content-Type": asset[1],
      "Cache-Control": "no-cache",
    });
    outgoing.end(
      incoming.method === "HEAD" ? undefined : readFileSync(asset[0]),
    );
  } catch (e) {
    console.error(e instanceof Error ? e.message : "Request failed");
    if (!outgoing.headersSent)
      outgoing.writeHead(500, { "Content-Type": "application/json" });
    outgoing.end(
      JSON.stringify({ error: "Unexpected server error. Please retry." }),
    );
  }
});
server.on("error", (error: NodeJS.ErrnoException) => {
  console.error(
    `Cannot start CampusSlot (${error.code ?? "server error"}): ${error.message}. Check port permissions or choose another PORT.`,
  );
  store.raw.close();
  process.exit(1);
});
server.listen(port, host, () =>
  console.log(
    `CampusSlot running at ${origin}\nPersistent database: ${store.path}`,
  ),
);
function shutdown() {
  server.close(() => {
    store.raw.close();
    process.exit(0);
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
