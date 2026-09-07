import type { Express, Request, Response, RequestHandler } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { db } from "./db";
import { storage } from "./storage";
import { createAuth } from "./better-auth";
import { getPublicAppUrl, shouldSkipEmailVerification } from "./email";
import type { User as AppUser } from "@shared/schema";

const baseURL = getPublicAppUrl("/");
export const auth = createAuth(db, baseURL, process.env.BETTER_AUTH_SECRET || process.env.SESSION_SECRET || "");

declare global {
  namespace Express { interface Request { authUser?: AppUser; user?: AppUser } }
}

function safeUser(user: AppUser) {
  const { passwordHash, verificationToken, verificationTokenExpires, passwordResetToken, passwordResetExpires, ...safe } = user;
  return safe;
}

async function forward(authentication: typeof auth, req: Request, path: string, body?: unknown) {
  const headers = fromNodeHeaders(req.headers);
  headers.delete("content-length");
  headers.set("x-chantlive-client-ip", req.ip || req.socket.remoteAddress || "unknown");
  if (body !== undefined) headers.set("content-type", "application/json");
  // The stream has already been parsed by Express. Pass a fresh Fetch Request
  // through the public handler so Better Auth's origin and rate checks still run.
  return authentication.handler(new globalThis.Request(new URL(path, baseURL), {
    method: req.method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  }));
}

async function sendResponse(res: Response, response: globalThis.Response) {
  res.status(response.status);
  response.headers.forEach((value, key) => {
    if (key !== "set-cookie") res.setHeader(key, value);
  });
  const cookies = response.headers.getSetCookie();
  if (cookies.length) res.setHeader("set-cookie", cookies);
  res.send(await response.text());
}

type UserStorage = Pick<typeof storage, "getUser" | "getUserByEmail" | "touchUserActivity">;

export function setupAuth(app: Express, authentication = auth, userStorage: UserStorage = storage) {
  const forwardRequest = (req: Request, path: string, body?: unknown) => forward(authentication, req, path, body);
  app.get("/api/auth/me", createRequireAuth(authentication, userStorage), (req, res) => res.json(safeUser(req.authUser!)));

  app.post("/api/auth/register", async (req, res) => {
    const { name, email, password } = req.body ?? {};
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const normalizedName = typeof name === "string" ? name.trim() : "";
    if (!normalizedName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
      || typeof password !== "string" || password.length < 8 || password.length > 128) {
      return res.status(400).json({ message: "Enter your name, a valid email, and a password of 8–128 characters." });
    }
    // Repeat registration resends verification without replacing the account's password or name.
    const existing = await userStorage.getUserByEmail(normalizedEmail);
    const response = existing && !existing.emailVerified && !shouldSkipEmailVerification()
      ? await forwardRequest(req, "/api/auth/send-verification-email", { email: normalizedEmail, callbackURL: "/login?verified=true" })
      : await forwardRequest(req, "/api/auth/sign-up/email", { name: normalizedName, email: normalizedEmail, password, callbackURL: "/login?verified=true" });
    if (!response.ok) {
      if (response.status >= 500) return res.status(503).json({ message: "We couldn't send your verification email. Please try registering again shortly." });
      return sendResponse(res, response);
    }
    if (existing?.emailVerified) return res.status(400).json({ message: "An account with this email already exists. Please sign in." });
    return res.json(shouldSkipEmailVerification()
      ? { status: "ready_to_sign_in", message: "Your account is ready. You can sign in now." }
      : { status: "verification_email_sent", message: "Please check your inbox and spam folder for a verification link. If you already have a verified account, sign in." });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body ?? {};
    return sendResponse(res, await forwardRequest(req, "/api/auth/sign-in/email", {
      email: typeof email === "string" ? email.trim().toLowerCase() : "", password,
    }));
  });
  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body ?? {};
    return sendResponse(res, await forwardRequest(req, "/api/auth/request-password-reset", {
      email: typeof email === "string" ? email.trim().toLowerCase() : "", redirectTo: "/reset-password",
    }));
  });
  app.post("/api/auth/reset-password", async (req, res) => {
    return sendResponse(res, await forwardRequest(req, "/api/auth/reset-password", {
      token: req.body?.token, newPassword: req.body?.password ?? req.body?.newPassword,
    }));
  });
  // Legacy links were invalidated by migration; do not silently accept old tokens.
  app.get("/api/auth/verify", (_req, res) => res.redirect("/login?error=expired_token"));
  app.all("/api/auth/*splat", async (req, res) => {
    return sendResponse(res, await forwardRequest(req, req.originalUrl, ["GET", "HEAD"].includes(req.method) ? undefined : req.body));
  });
}

export function createRequireAuth(authentication = auth, userStorage: UserStorage = storage): RequestHandler {
  return async (req, res, next) => {
    const session = await authentication.api.getSession({ headers: fromNodeHeaders(req.headers) });
    const user = session ? await userStorage.getUser(session.user.id) : undefined;
    if (!user || (!user.emailVerified && !shouldSkipEmailVerification())) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    req.authUser = user;
    req.user = user;
    void userStorage.touchUserActivity(user.id).catch(() => console.error("Failed to update user activity"));
    next();
  };
}

export const requireAuth = createRequireAuth();

export const requireSuperAdmin: RequestHandler = (req, res, next) => {
  void Promise.resolve(requireAuth(req, res, (error?: unknown) => {
    if (error) return next(error);
    if (req.authUser?.role !== "super_admin") return res.status(403).json({ message: "Super admin access required" });
    next();
  })).catch(next);
};
