import { build } from "esbuild";
import { mkdirSync, writeFileSync, copyFileSync } from "node:fs";
mkdirSync("dist-local", { recursive: true });
await build({
  entryPoints: ["web/main.tsx"],
  bundle: true,
  minify: true,
  sourcemap: false,
  outdir: "dist-local",
  entryNames: "app",
  platform: "browser",
  format: "esm",
  target: "es2022",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
});
copyFileSync("public/favicon.svg", "dist-local/favicon.svg");
writeFileSync(
  "dist-local/index.html",
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Campus equipment reservations and lending"><title>CampusSlot · Campus equipment desk</title><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/app.css"></head><body><div id="root"><p style="padding:30px">Opening CampusSlot…</p></div><script type="module" src="/app.js"></script></body></html>',
);
console.log("Standalone production assets built in dist-local/.");
