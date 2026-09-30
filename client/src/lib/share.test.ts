import assert from "node:assert/strict";
import test from "node:test";
import { shareWithVisibleFallback } from "./share";

const base = { title: "Join event", text: "Event details", url: "https://example.test/d/12345678", completeText: "Event details\nhttps://example.test/d/12345678" };

test("reports native share success", async () => {
  assert.equal(await shareWithVisibleFallback({ ...base, share: async () => {}, writeText: null }), "shared");
});

test("reports cancellation so the UI can expose the invitation", async () => {
  assert.equal(await shareWithVisibleFallback({ ...base, share: async () => { throw new DOMException("cancelled", "AbortError"); }, writeText: async () => {} }), "cancelled");
});

test("copies after a non-cancellation native share failure", async () => {
  let copied = "";
  const result = await shareWithVisibleFallback({ ...base, share: async () => { throw new Error("not supported"); }, writeText: async (text) => { copied = text; } });
  assert.equal(result, "copied");
  assert.equal(copied, base.completeText);
});

test("requests a manual fallback when native share and clipboard both fail", async () => {
  const result = await shareWithVisibleFallback({ ...base, share: async () => { throw new Error("not supported"); }, writeText: async () => { throw new Error("denied"); } });
  assert.equal(result, "manual");
});
