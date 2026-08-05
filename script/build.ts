import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile, writeFile } from "fs/promises";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

// Keep packages that load runtime assets from their own directories external.
// `connect-pg-simple` reads `table.sql` via `__dirname`, which breaks when bundled
// into `dist/index.cjs` on platforms like Render.

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const builtIndex = await readFile("dist/public/index.html", "utf-8");
  const referencedAssets = [...builtIndex.matchAll(/(?:src|href)="(\/[^"?#]+)(?:[?#][^"]*)?"/g)]
    .map((match) => match[1])
    .filter((asset) => asset.startsWith("/assets/") || ["/favicon.svg", "/favicon.png", "/site.webmanifest"].includes(asset));
  const shellAssets = [...new Set(["/", ...referencedAssets])];
  const serviceWorker = `const CACHE_NAME = ${JSON.stringify(`chantlive-shell-${pkg.version}`)};
const SHELL_ASSETS = ${JSON.stringify(shellAssets)};

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((names) => Promise.all(names.filter((name) => name.startsWith("chantlive-shell-") && name !== CACHE_NAME).map((name) => caches.delete(name)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/socket.io/") || url.pathname.startsWith("/auth/")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/")).then((response) => response || new Response("ChantLive is unavailable offline on this device.", { status: 503, headers: { "Content-Type": "text/plain" } })));
    return;
  }

  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
    return response;
  })));
});
`;
  await writeFile("dist/public/sw.js", serviceWorker, "utf-8");

  console.log("building server...");
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
