import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile, writeFile } from "fs/promises";

// Better Auth is ESM; keep dependencies external to preserve their runtime imports.

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

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "esm",
    outfile: "dist/index.js",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    packages: "external",
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
