import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { EmailDeliveryError, sendVerificationEmail, sendPasswordResetEmail, sendInviteEmail, shouldSkipEmailVerification, getPublicAppUrl } from "./email";

const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;

beforeEach(() => {
  for (const key of ["SENDGRID_API_KEY", "SENDGRID_FROM_EMAIL", "SENDGRID_FROM_NAME", "PUBLIC_BASE_URL", "DEV_SKIP_EMAIL_VERIFICATION", "NODE_ENV"]) delete process.env[key];
  globalThis.fetch = async () => { throw new Error("Unexpected network request"); };
});
afterEach(() => { process.env = { ...originalEnv }; globalThis.fetch = originalFetch; });

function configure() {
  process.env.SENDGRID_API_KEY = "test-only-key";
  process.env.SENDGRID_FROM_EMAIL = "noreply@example.com";
}
const verify = () => sendVerificationEmail("test@example.com", "Test", "https://example.com/verify?token=test");

test("verification bypass requires an explicit development opt-in", () => {
  assert.equal(shouldSkipEmailVerification(), false);
  process.env.NODE_ENV = "development";
  assert.equal(shouldSkipEmailVerification(), false);
  process.env.DEV_SKIP_EMAIL_VERIFICATION = "true";
  assert.equal(shouldSkipEmailVerification(), true);
  process.env.NODE_ENV = "production";
  assert.equal(shouldSkipEmailVerification(), false);
});

test("missing key or missing/invalid sender fails before contacting provider", async () => {
  await assert.rejects(verify(), EmailDeliveryError);
  process.env.SENDGRID_API_KEY = "test-only-key";
  await assert.rejects(verify(), EmailDeliveryError);
  process.env.SENDGRID_FROM_EMAIL = "ChantLive <test@example.com>";
  await assert.rejects(verify(), EmailDeliveryError);
});

test("verification uses SendGrid, plain text and escaped HTML with tracking disabled", async () => {
  configure();
  let requests = 0;
  globalThis.fetch = async (url, options) => {
    requests++;
    assert.equal(String(url), "https://api.sendgrid.com/v3/mail/send");
    assert.equal(options?.method, "POST");
    assert.equal(new Headers(options?.headers).get("Authorization"), "Bearer test-only-key");
    assert.ok(options?.signal);
    const body = JSON.parse(String(options?.body));
    assert.deepEqual(body.from, { email: "noreply@example.com", name: "ChantLive" });
    assert.deepEqual(body.personalizations, [{ to: [{ email: "test@example.com" }] }]);
    assert.equal(body.content[0].type, "text/plain");
    assert.ok(body.content[0].value.includes("https://example.com/verify?token=test&more=1"));
    assert.ok(body.content[1].value.includes("&lt;Test&gt;"));
    assert.ok(body.content[1].value.includes("token=test&amp;more=1"));
    assert.equal(body.tracking_settings.click_tracking.enable, false);
    assert.equal(body.tracking_settings.open_tracking.enable, false);
    return new Response(null, { status: 202 });
  };
  await sendVerificationEmail("test@example.com", "<Test>", "https://example.com/verify?token=test&more=1");
  assert.equal(requests, 1);
});

for (const status of [200, 400, 401, 403, 429, 500]) {
  test(`HTTP ${status} is not mistaken for an accepted send`, async () => {
    configure();
    globalThis.fetch = async () => new Response(null, { status });
    await assert.rejects(verify(), EmailDeliveryError);
  });
}

test("network failure produces a safe delivery error", async () => {
  configure();
  globalThis.fetch = async () => { throw new Error("sensitive provider details"); };
  await assert.rejects(verify(), (error: unknown) => error instanceof EmailDeliveryError && !error.message.includes("sensitive"));
});

test("password reset and invitation use the same SendGrid transport", async () => {
  configure();
  const subjects: string[] = [];
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(String(options?.body));
    subjects.push(body.subject);
    assert.equal(body.content.length, 2);
    return new Response(null, { status: 202 });
  };
  await sendPasswordResetEmail("test@example.com", "Test", "https://example.com/reset");
  await sendInviteEmail("test@example.com", "Test", "Admin", "Event", "https://example.com/event");
  assert.deepEqual(subjects, ["Reset your ChantLive password", 'You\'ve been invited to manage "Event" on ChantLive']);
});

test("production email links require an explicit HTTPS origin", () => {
  process.env.NODE_ENV = "production";
  assert.throws(() => getPublicAppUrl("/api/auth/verify?token=test"), EmailDeliveryError);
  for (const invalid of ["http://example.com", "https://user:pass@example.com", "https://example.com/path", "https://example.com?x=1"]) {
    process.env.PUBLIC_BASE_URL = invalid;
    assert.throws(() => getPublicAppUrl("/verify"), EmailDeliveryError);
  }
  process.env.PUBLIC_BASE_URL = "https://chantlive.online";
  assert.equal(getPublicAppUrl("/api/auth/verify?token=test"), "https://chantlive.online/api/auth/verify?token=test");
  assert.throws(() => getPublicAppUrl("https://other.example.com"), EmailDeliveryError);
});
