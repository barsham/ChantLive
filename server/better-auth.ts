import { betterAuth } from "better-auth";
import { AsyncLocalStorage } from "node:async_hooks";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import bcrypt from "bcryptjs";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { users, authSessions, authAccounts, authVerifications } from "@shared/schema";
import { shouldSkipEmailVerification, sendVerificationEmail, sendPasswordResetEmail } from "./email";

export async function verifyCompatiblePassword({ hash, password }: { hash: string; password: string }) {
  return /^\$2[aby]\$/.test(hash) ? bcrypt.compare(password, hash) : verifyPassword({ hash, password });
}

export function createAuth(database: Parameters<typeof drizzleAdapter>[0], baseURL: string, secret: string) {
  if (secret.length < 32) throw new Error("BETTER_AUTH_SECRET (or SESSION_SECRET) must contain at least 32 characters");
  const skipVerification = shouldSkipEmailVerification();
  // Better Auth can swallow failures in its background-or-awaited email helper.
  // Track delivery per request so a failed send never becomes a success response.
  const delivery = new AsyncLocalStorage<{ failed: boolean }>();
  async function deliver(send: () => Promise<void>) {
    try { await send(); } catch (error) {
      const state = delivery.getStore();
      if (state) state.failed = true;
      throw error;
    }
  }
  const instance = betterAuth({
    appName: "ChantLive",
    baseURL,
    secret,
    database: drizzleAdapter(database, {
      provider: "pg",
      schema: { user: users, session: authSessions, account: authAccounts, verification: authVerifications },
      transaction: true,
    }),
    user: {
      fields: { image: "avatarUrl" },
      additionalFields: { role: { type: "string", defaultValue: "admin", input: false } },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: !skipVerification,
      autoSignIn: false,
      minPasswordLength: 8,
      password: { hash: hashPassword, verify: verifyCompatiblePassword },
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => deliver(() => sendPasswordResetEmail(user.email, user.name, url)),
    },
    emailVerification: {
      sendOnSignUp: !skipVerification,
      autoSignInAfterVerification: false,
      expiresIn: 24 * 60 * 60,
      sendVerificationEmail: async ({ user, url }) => deliver(() => sendVerificationEmail(user.email, user.name, url)),
    },
    databaseHooks: {
      user: { create: { before: async (user) => ({ data: {
        ...user,
        emailVerified: skipVerification,
        role: user.email.toLowerCase() === process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase() ? "super_admin" : "admin",
      } }) } },
    },
    session: { expiresIn: 30 * 24 * 60 * 60, cookieCache: { enabled: false } },
    advanced: {
      useSecureCookies: new URL(baseURL).protocol === "https:",
      ipAddress: { ipAddressHeaders: ["x-chantlive-client-ip"] },
    },
    rateLimit: { enabled: true },
  });
  return {
    ...instance,
    handler: (request: Request) => delivery.run({ failed: false }, async () => {
      const response = await instance.handler(request);
      return delivery.getStore()?.failed
        ? Response.json({ message: "We couldn't send your email. Please try again shortly." }, { status: 503 })
        : response;
    }),
  };
}
