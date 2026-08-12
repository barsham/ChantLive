import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { getSeoForPath } from "@shared/seo";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getRequestOrigin(req: express.Request): string {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const proto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  const protocol = proto ?? req.protocol;
  const forwardedHost = req.headers["x-forwarded-host"];
  const host = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost ?? req.headers.host;

  return `${protocol}://${host}`;
}

function renderSeoHtml(template: string, req: express.Request): string {
  const origin = getRequestOrigin(req);
  // Express 5 rewrites req.path while processing a wildcard middleware. Keep
  // the original route so deep links receive their own status/participant SEO.
  const requestPath = new URL(req.originalUrl, origin).pathname;
  const seo = getSeoForPath(requestPath, origin);
  const canonicalUrl = new URL(seo.canonicalPath, origin).toString();
  const imageUrl = new URL("/social-card.svg", origin).toString();
  const jsonLd = seo.jsonLd ? JSON.stringify(seo.jsonLd) : "";

  return template
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(seo.title)}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="description" content="${escapeHtml(seo.description)}" />`,
    )
    .replace(
      /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="robots" content="${escapeHtml(seo.robots)}" />`,
    )
    .replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
      `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,
    )
    .replace(
      /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:title" content="${escapeHtml(seo.title)}" />`,
    )
    .replace(
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:description" content="${escapeHtml(seo.description)}" />`,
    )
    .replace(
      /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`,
    )
    .replace(
      /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:image" content="${escapeHtml(imageUrl)}" />`,
    )
    .replace(
      /<meta\s+property="og:image:width"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:image:width" content="1200" />`,
    )
    .replace(
      /<meta\s+property="og:image:height"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:image:height" content="630" />`,
    )
    .replace(
      /<meta\s+property="og:image:alt"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:image:alt" content="${escapeHtml(`${seo.title} preview`)}" />`,
    )
    .replace(
      /<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:type" content="${escapeHtml(seo.ogType)}" />`,
    )
    .replace(
      /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:title" content="${escapeHtml(seo.title)}" />`,
    )
    .replace(
      /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:description" content="${escapeHtml(seo.description)}" />`,
    )
    .replace(
      /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />`,
    )
    .replace(
      /<meta\s+name="twitter:image:alt"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:image:alt" content="${escapeHtml(`${seo.title} preview`)}" />`,
    )
    .replace(
      /<script id="seo-json-ld" type="application\/ld\+json">[\s\S]*?<\/script>/i,
      `<script id="seo-json-ld" type="application/ld+json">${jsonLd}</script>`,
    );
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  const indexPath = path.resolve(distPath, "index.html");
  const indexTemplate = fs.readFileSync(indexPath, "utf8");

  app.use(express.static(distPath, { index: false }));

  // fall through to index.html if the file doesn't exist
  app.use("/{*path}", (req, res) => {
    if (path.extname(req.path)) {
      res.status(404).end();
      return;
    }

    res.type("html").send(renderSeoHtml(indexTemplate, req));
  });
}
