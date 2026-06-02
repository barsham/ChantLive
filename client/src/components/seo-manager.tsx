import { useEffect } from "react";
import { useLocation } from "wouter";
import { getSeoForPath } from "@shared/seo";

function upsertMeta(
  selector: string,
  attributeName: "content" | "href",
  value: string,
) {
  const element = document.head.querySelector(selector);
  if (element instanceof HTMLMetaElement || element instanceof HTMLLinkElement) {
    element.setAttribute(attributeName, value);
  }
}

export function SeoManager() {
  const [location] = useLocation();

  useEffect(() => {
    const origin = window.location.origin;
    const seo = getSeoForPath(location, origin);
    const canonicalUrl = new URL(seo.canonicalPath, origin).toString();
    const imageUrl = new URL("/social-card.svg", origin).toString();

    document.title = seo.title;

    upsertMeta('meta[name="description"]', "content", seo.description);
    upsertMeta('meta[name="robots"]', "content", seo.robots);
    upsertMeta('meta[property="og:title"]', "content", seo.title);
    upsertMeta('meta[property="og:description"]', "content", seo.description);
    upsertMeta('meta[property="og:url"]', "content", canonicalUrl);
    upsertMeta('meta[property="og:image"]', "content", imageUrl);
    upsertMeta('meta[property="og:type"]', "content", seo.ogType);
    upsertMeta('meta[property="og:site_name"]', "content", "ChantLive");
    upsertMeta('meta[name="twitter:title"]', "content", seo.title);
    upsertMeta('meta[name="twitter:description"]', "content", seo.description);
    upsertMeta('meta[name="twitter:image"]', "content", imageUrl);
    upsertMeta('link[rel="canonical"]', "href", canonicalUrl);

    const jsonLdScript = document.getElementById("seo-json-ld");
    if (jsonLdScript) {
      jsonLdScript.textContent = seo.jsonLd ? JSON.stringify(seo.jsonLd) : "";
    }
  }, [location]);

  return null;
}
