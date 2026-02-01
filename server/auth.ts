import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { users, type User } from "@shared/schema";
import { storage } from "./storage";
import { pool } from "./db";
import { compare } from "bcryptjs";

const PgSession = connectPgSimple(session);

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    store: new PgSession({
      pool,
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "replit_session_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      secure: app.get("env") === "production",
    },
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Incorrect username." });
        }

        const isValid = await compare(password, user.password);
        if (!isValid) {
          return done(null, false, { message: "Incorrect password." });
        }

        if (user.isBanned) {
          return done(null, false, { message: "Account is banned" });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    done(null, (user as User).id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);

      // If user no longer exists (deleted), invalidate session
      if (!user) {
        return done(null, false);
      }

      if (user.isBanned) {
        // If user is banned, invalidate session
        return done(null, false);
      }
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
}
