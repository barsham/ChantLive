import assert from "node:assert/strict";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import bcrypt from "bcryptjs";
import express from "express";
import { eq } from "drizzle-orm";
import { betterAuthMigration } from "./auth-migration";
import { createAuth } from "./better-auth";
import * as schema from "@shared/schema";

test("migrates accounts and exercises Better Auth verification, sessions and recovery", async () => {
  process.env.NODE_ENV = "test";
  process.env.PUBLIC_BASE_URL = "https://chantlive.example";
  process.env.SENDGRID_API_KEY = "test-key";
  process.env.SENDGRID_FROM_EMAIL = "test@chantlive.example";
  const client = new PGlite();
  const originalFetch = globalThis.fetch;
  let deliveryFails = false;
  const messages: any[] = [];
  globalThis.fetch = async (_url, init) => {
    messages.push(JSON.parse(String(init?.body)));
    return new Response(null, { status: deliveryFails ? 500 : 202 });
  };
  try {
    await client.exec(`CREATE TABLE users (
      id varchar(255) PRIMARY KEY, email text NOT NULL UNIQUE, name text NOT NULL,
      role text NOT NULL DEFAULT 'admin', avatar_url text, password_hash text,
      email_verified boolean NOT NULL DEFAULT false, verification_token text,
      verification_token_expires timestamp, password_reset_token text,
      password_reset_expires timestamp, last_activity_at timestamp,
      created_at timestamp NOT NULL DEFAULT now()
    );`);
    const legacyHash = await bcrypt.hash("old-password", 4);
    await client.query("INSERT INTO users (id,email,name,role,password_hash,email_verified) VALUES ($1,$2,$3,$4,$5,true)",
      ["legacy-user", "legacy@example.com", "Legacy", "super_admin", legacyHash]);
    await client.exec(betterAuthMigration);
    await client.exec(betterAuthMigration);
    const auth = createAuth(drizzle(client, { schema }), "https://chantlive.example", "test-secret-that-is-long-enough-for-better-auth");
    let requestNumber = 0;
    const request = (path: string, body?: unknown, cookie?: string, origin = "https://chantlive.example") => auth.handler(new Request(`https://chantlive.example/api/auth${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { origin, "content-type": "application/json", "x-chantlive-client-ip": `192.0.2.${++requestNumber}`, ...(cookie ? { cookie } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }));
    const cookies = (response: Response) => response.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
    let response = await request("/sign-in/email", { email: "legacy@example.com", password: "old-password" });
    assert.equal(response.status, 200, await response.clone().text());
    const legacyCookie = cookies(response);
    assert.ok(legacyCookie.includes("__Secure-"));
    assert.ok(response.headers.get("set-cookie")?.includes("HttpOnly"));
    let data = await (await request("/get-session", undefined, legacyCookie)).json();
    assert.equal(data.user.id, "legacy-user");
    assert.equal(data.user.role, "super_admin");
    assert.equal(data.user.passwordHash, undefined);
    assert.equal((await request("/sign-in/email", { email: "legacy@example.com", password: "bad-password" })).status, 401);
    assert.equal((await request("/sign-out", {}, legacyCookie, "https://evil.example")).status, 403);

    response = await request("/sign-up/email", { email: "new@example.com", password: "new-password", name: "New", role: "super_admin", callbackURL: "/login?verified=true" });
    assert.equal(response.status, 200, await response.clone().text());
    assert.equal((await response.json()).user.role, "admin");
    assert.equal((await request("/sign-in/email", { email: "new@example.com", password: "new-password" })).status, 403);
    const verificationURL = messages.at(-1).content[0].value.match(/https:\/\/\S+/)[0];
    response = await auth.handler(new Request(verificationURL));
    assert.equal(response.status, 302, await response.clone().text());
    assert.match(response.headers.get("location")!, /login\?verified=true/);
    response = await request("/sign-in/email", { email: "new@example.com", password: "new-password" });
    assert.equal(response.status, 200);
    const newCookie = cookies(response);
    await request("/sign-out", {}, newCookie);
    assert.equal(await (await request("/get-session", undefined, newCookie)).json(), null);

    response = await request("/request-password-reset", { email: "legacy@example.com", redirectTo: "/reset-password" });
    assert.equal(response.status, 200);
    const resetURL = messages.at(-1).content[0].value.match(/https:\/\/\S+/)[0];
    const redirect = await auth.handler(new Request(resetURL));
    const token = new URL(redirect.headers.get("location")!).searchParams.get("token");
    response = await request("/reset-password", { token, newPassword: "changed-password" });
    assert.equal(response.status, 200, await response.clone().text());
    assert.equal(await (await request("/get-session", undefined, legacyCookie)).json(), null);
    assert.equal((await request("/reset-password", { token, newPassword: "changed-again" })).status, 400);
    await client.exec(betterAuthMigration);
    assert.equal((await request("/sign-in/email", { email: "legacy@example.com", password: "old-password" })).status, 401);
    assert.equal((await request("/sign-in/email", { email: "legacy@example.com", password: "changed-password" })).status, 200);

    deliveryFails = true;
    response = await request("/sign-up/email", { email: "delivery@example.com", password: "new-password", name: "Delivery" });
    assert.ok(response.status >= 500, await response.clone().text());
    assert.equal((await request("/sign-in/email", { email: "delivery@example.com", password: "new-password" })).status, 403);
    deliveryFails = false;
    response = await request("/send-verification-email", { email: "delivery@example.com", callbackURL: "/login?verified=true" });
    assert.equal(response.status, 200);

    // Exercise the real Express compatibility routes without touching a live database.
    process.env.DATABASE_URL = "postgres://test:test@127.0.0.1:1/unused";
    process.env.BETTER_AUTH_SECRET = "test-secret-that-is-long-enough-for-better-auth";
    const { setupAuth } = await import("./auth");
    const database = drizzle(client, { schema });
    const app = express();
    app.use(express.json());
    setupAuth(app, auth, {
      getUser: async id => (await database.select().from(schema.users).where(eq(schema.users.id, id)))[0],
      getUserByEmail: async email => (await database.select().from(schema.users).where(eq(schema.users.email, email)))[0],
      touchUserActivity: async () => {},
    });
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>(resolve => server.on("listening", resolve));
    const port = (server.address() as { port: number }).port;
    const http = (path: string, body?: unknown, cookie?: string, origin = "https://chantlive.example") => originalFetch(`http://127.0.0.1:${port}/api/auth${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { origin, "content-type": "application/json", ...(cookie ? { cookie } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    try {
      assert.equal((await http("/me")).status, 401);
      response = await http("/login", { email: " LEGACY@EXAMPLE.COM ", password: "changed-password" });
      assert.equal(response.status, 200, await response.clone().text());
      const cookie = cookies(response);
      data = await (await http("/me", undefined, cookie)).json();
      assert.equal(data.role, "super_admin");
      assert.equal(data.passwordHash, undefined);
      await database.update(schema.users).set({ role: "admin" }).where(eq(schema.users.id, "legacy-user"));
      assert.equal((await (await http("/me", undefined, cookie)).json()).role, "admin");
      assert.equal((await http("/sign-out", {}, cookie, "https://evil.example")).status, 403);
      assert.equal((await http("/sign-out", {}, cookie)).status, 200);
      assert.equal((await http("/me", undefined, cookie)).status, 401);
      deliveryFails = true;
      response = await http("/register", { email: "retry@example.com", name: "Retry", password: "retry-password" });
      assert.equal(response.status, 503, await response.clone().text());
      deliveryFails = false;
      response = await http("/register", { email: "retry@example.com", name: "Changed", password: "different-password" });
      assert.equal(response.status, 200, await response.clone().text());
      assert.equal((await response.json()).status, "verification_email_sent");
      assert.equal((await database.select().from(schema.users).where(eq(schema.users.email, "retry@example.com")))[0].name, "Retry");
      response = await http("/login", { email: "retry@example.com", password: "retry-password" });
      assert.equal(response.status, 403);
      assert.equal((await response.json()).code, "EMAIL_NOT_VERIFIED");
      response = await http("/resend-verification", { email: "retry@example.com" });
      assert.equal(response.status, 200, await response.clone().text());
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal((await response.json()).status, "verification_email_sent");
      response = await http("/resend-verification", { email: "missing@example.com" });
      assert.equal(response.status, 200, await response.clone().text());
      assert.equal((await response.json()).status, "verification_email_sent");
      assert.equal((await http("/resend-verification", { email: "not-an-email" })).status, 400);
      assert.equal((await http("/resend-verification", { email: `${"a".repeat(245)}@example.com` })).status, 400);
      const verifyURL = messages.at(-1).content[0].value.match(/https:\/\/\S+/)[0];
      await auth.handler(new Request(verifyURL));
      assert.equal((await http("/login", { email: "retry@example.com", password: "retry-password" })).status, 200);
      response = await http("/forgot-password", { email: "retry@example.com" });
      assert.equal(response.status, 200);
      const resetLink = messages.at(-1).content[0].value.match(/https:\/\/\S+/)[0];
      const resetRedirect = await auth.handler(new Request(resetLink));
      const resetToken = new URL(resetRedirect.headers.get("location")!).searchParams.get("token");
      assert.equal((await http("/reset-password", { token: resetToken, password: "replacement-password" })).status, 200);
    } finally {
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  } finally {
    globalThis.fetch = originalFetch;
    await client.close();
  }
});
