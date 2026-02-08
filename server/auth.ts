import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { storage } from "./storage";
import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";

export function setupAuth(app: Express) {
  const PgSession = connectPgSimple(session);

  app.use(
    session({
      store: new PgSession({
        pool,
        tableName: "session",
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "chantlive-secret-key",
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
    const callbackURL = "/auth/google/callback";

    passport.use(
      new GoogleStrategy(
        { clientID, clientSecret, callbackURL },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            let user = await storage.getUserByGoogleId(profile.id);

            if (!user) {
              const email = profile.emails?.[0]?.value || "";
              const name = profile.displayName || email;
              const avatarUrl = profile.photos?.[0]?.value || null;

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

  app.get("/auth/logout", (req, res) => {
    req.logout(() => {
      res.redirect("/");
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      res.json(req.user);
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
