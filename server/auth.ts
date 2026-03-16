import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { storage } from "./storage";
import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendVerificationEmail } from "./email";

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

  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (clientID && clientSecret) {
    const protocol = process.env.REPLIT_DEV_DOMAIN ? "https" : "http";
    const host = process.env.REPLIT_DEV_DOMAIN || `localhost:${process.env.PORT || 5000}`;
    const callbackURL = `${protocol}://${host}/auth/google/callback`;

    passport.use(
      new GoogleStrategy(
        { clientID, clientSecret, callbackURL },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            let user = await storage.getUserByGoogleId(profile.id);

            if (!user) {
              const email = profile.emails?.[0]?.value;
              if (!email) {
                return done(new Error("Google account does not have an email address"), undefined);
              }
              const name = profile.displayName || email;
              const avatarUrl = profile.photos?.[0]?.value || null;

              const existingUser = await storage.getUserByEmail(email);
              if (existingUser) {
                await storage.updateUser(existingUser.id, {
                  googleId: profile.id,
                  avatarUrl,
                  emailVerified: true,
                });
                user = await storage.getUser(existingUser.id);
                return done(null, user!);
              }

              const userCount = await storage.getUserCount();
              const role = userCount === 0 ? "super_admin" : "admin";

              user = await storage.createUser({
                email,
                name,
                provider: "google",
                role,
                googleId: profile.id,
                avatarUrl,
              });
              await storage.updateUser(user.id, { emailVerified: true });
            }

            done(null, user);
          } catch (err) {
            done(err as Error, undefined);
          }
        }
      )
    );

    app.get(
      "/auth/google",
      passport.authenticate("google", { scope: ["profile", "email"] })
    );

    app.get(
      "/auth/google/callback",
      passport.authenticate("google", { failureRedirect: "/" }),
      (_req, res) => {
        res.redirect("/admin");
      }
    );
  } else {
    app.get("/auth/google", (_req, res) => {
      res.status(503).json({ message: "Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." });
    });
  }

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
        if (existing.provider === "google" && !existing.passwordHash) {
          return res.status(400).json({ message: "An account with this email already exists via Google sign-in. Please use Google to log in." });
        }
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
        provider: "email",
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
        if (user.provider === "google") {
          return res.status(401).json({ message: "This account uses Google sign-in. Please use Google to log in." });
        }
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
        const { passwordHash, verificationToken, verificationTokenExpires, ...safeUser } = user;
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
      const { passwordHash, verificationToken, verificationTokenExpires, ...safeUser } = user;
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
