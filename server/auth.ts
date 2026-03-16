import passport from "passport";
import { storage } from "./storage";
import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendVerificationEmail, sendPasswordResetEmail } from "./email";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function setupAuth(app: Express) {
  const PgSession = connectPgSimple(session);
  const sessionSecret = process.env.SESSION_SECRET;

  if (!sessionSecret) {
    throw new Error("SESSION_SECRET must be set");
  }

  app.use(
    session({
      store: new PgSession({
        pool,
        tableName: "session",
        createTableIfMissing: true,
      }),
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        secure: false,
        httpOnly: true,
        sameSite: "lax",
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || null);
    } catch (err) {
      done(err, null);
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({ message: "Name, email, and password are required." });
      }

      const trimmedName = typeof name === "string" ? name.trim() : "";
      const trimmedEmail = typeof email === "string" ? email.toLowerCase().trim() : "";

      if (!trimmedEmail || !trimmedEmail.includes("@")) {
        return res.status(400).json({ message: "Please enter a valid email address." });
      }

      if (!trimmedName || trimmedName.length < 1) {
        return res.status(400).json({ message: "Please enter your name." });
      }

      if (typeof password !== "string" || password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters." });
      }

      const existing = await storage.getUserByEmail(trimmedEmail);
      if (existing) {
        if (!existing.emailVerified) {
          const rawToken = crypto.randomBytes(32).toString("hex");
          const hashedToken = hashToken(rawToken);
          const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
          const passwordHash = await bcrypt.hash(password, 12);
          await storage.updateUser(existing.id, {
            verificationToken: hashedToken,
            verificationTokenExpires: expires,
            passwordHash,
            name: trimmedName,
          });

          const protocol = req.headers["x-forwarded-proto"] || req.protocol;
          const host = req.headers["x-forwarded-host"] || req.headers.host;
          const verificationUrl = `${protocol}://${host}/api/auth/verify?token=${rawToken}`;

          await sendVerificationEmail(trimmedEmail, trimmedName, verificationUrl);

          return res.json({ message: "A new verification email has been sent. Please check your inbox." });
        }
        return res.status(400).json({ message: "An account with this email already exists. Please sign in." });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const rawToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = hashToken(rawToken);
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const userCount = await storage.getUserCount();
      const role = userCount === 0 ? "super_admin" : "admin";

      const user = await storage.createUser({
        email: trimmedEmail,
        name: trimmedName,
        role,
      });

      await storage.updateUser(user.id, {
        passwordHash,
        verificationToken: hashedToken,
        verificationTokenExpires: expires,
      });

      const protocol = req.headers["x-forwarded-proto"] || req.protocol;
      const host = req.headers["x-forwarded-host"] || req.headers.host;
      const verificationUrl = `${protocol}://${host}/api/auth/verify?token=${rawToken}`;

      await sendVerificationEmail(trimmedEmail, trimmedName, verificationUrl);

      res.json({ message: "Registration successful! Please check your email to verify your account." });
    } catch (err) {
      console.error("Registration error:", err);
      res.status(500).json({ message: "Registration failed. Please try again." });
    }
  });

  app.get("/api/auth/verify", async (req, res) => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== "string") {
        return res.redirect("/login?error=invalid_token");
      }

      const hashedToken = hashToken(token);
      const user = await storage.getUserByVerificationToken(hashedToken);
      if (!user) {
        return res.redirect("/login?error=invalid_token");
      }

      if (user.verificationTokenExpires && new Date() > user.verificationTokenExpires) {
        return res.redirect("/login?error=expired_token");
      }

      await storage.updateUser(user.id, {
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpires: null,
      });

      req.login(user, (err) => {
        if (err) {
          return res.redirect("/login?verified=true");
        }
        res.redirect("/admin?verified=true");
      });
    } catch (err) {
      console.error("Verification error:", err);
      res.redirect("/login?error=verification_failed");
    }
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      const trimmedEmail = typeof email === "string" ? email.toLowerCase().trim() : "";

      if (!trimmedEmail || !trimmedEmail.includes("@")) {
        return res.status(400).json({ message: "Please enter a valid email address." });
      }

      const user = await storage.getUserByEmail(trimmedEmail);
      if (user && user.emailVerified) {
        const rawToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = hashToken(rawToken);
        const expires = new Date(Date.now() + 60 * 60 * 1000);

        await storage.updateUser(user.id, {
          passwordResetToken: hashedToken,
          passwordResetExpires: expires,
        });

        const protocol = req.headers["x-forwarded-proto"] || req.protocol;
        const host = req.headers["x-forwarded-host"] || req.headers.host;
        const resetUrl = `${protocol}://${host}/reset-password?token=${rawToken}`;
        await sendPasswordResetEmail(trimmedEmail, user.name, resetUrl);
      }

      res.json({ message: "If that email exists, a reset link has been sent." });
    } catch (err) {
      console.error("Forgot password error:", err);
      res.status(500).json({ message: "Failed to process forgot password request." });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ message: "Invalid reset token." });
      }

      if (typeof password !== "string" || password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters." });
      }

      const hashedToken = hashToken(token);
      const targetUser = await storage.getUserByPasswordResetToken(hashedToken);

      if (!targetUser || !targetUser.passwordResetExpires || new Date() > targetUser.passwordResetExpires) {
        return res.status(400).json({ message: "Reset link is invalid or expired." });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      await storage.updateUser(targetUser.id, {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      });

      res.json({ message: "Password reset successfully. You can now sign in." });
    } catch (err) {
      console.error("Reset password error:", err);
      res.status(500).json({ message: "Failed to reset password." });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required." });
      }

      const user = await storage.getUserByEmail(
        typeof email === "string" ? email.toLowerCase().trim() : ""
      );
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password." });
      }

      if (!user.passwordHash) {
        return res.status(401).json({ message: "Invalid email or password." });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password." });
      }

      if (!user.emailVerified) {
        return res.status(403).json({ message: "Please verify your email before signing in. Check your inbox for the verification link." });
      }

      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed. Please try again." });
        }
        const { passwordHash, verificationToken, verificationTokenExpires, passwordResetToken, passwordResetExpires, ...safeUser } = user;
        res.json(safeUser);
      });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ message: "Login failed. Please try again." });
    }
  });

  app.get("/auth/logout", (req, res) => {
    req.logout(() => {
      res.redirect("/");
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      const user = req.user as any;
      const { passwordHash, verificationToken, verificationTokenExpires, passwordResetToken, passwordResetExpires, ...safeUser } = user;
      res.json(safeUser);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });
}

export const requireAuth: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    next();
  } else {
    res.status(401).json({ message: "Authentication required" });
  }
};

export const requireSuperAdmin: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    const user = req.user as any;
    if (user.role === "super_admin") {
      next();
    } else {
      res.status(403).json({ message: "Super admin access required" });
    }
  } else {
    res.status(401).json({ message: "Authentication required" });
  }
};
