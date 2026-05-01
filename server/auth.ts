import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { users, type User } from "@shared/schema";
import { storage } from "./storage";
import { pool } from "./db";
import { compare } from "bcryptjs";
import { validateSessionSecret } from "./security";

const PgSession = connectPgSimple(session);

export function setupAuth(app: Express) {
  const sessionSecret = validateSessionSecret();

  const sessionSettings: session.SessionOptions = {
    store: new PgSession({
      pool,
      createTableIfMissing: true,
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      secure: app.get("env") === "production",
      httpOnly: true,
      sameSite: "lax",
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
        const user = await storage.getUserByUsername(username.trim().toLowerCase());
        if (!user) {
          return done(null, false, { message: "Incorrect username." });
        }

        if (!user.password) {
          return done(null, false, { message: "Please sign in with Google." });
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

  // Google OAuth Strategy
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (googleClientId && googleClientSecret) {
    // Dynamic import for ESM compatibility with esbuild
    import("passport-google-oauth20")
      .then(({ Strategy: GoogleStrategy }) => {
        passport.use(
          new GoogleStrategy(
            {
              clientID: googleClientId,
              clientSecret: googleClientSecret,
              callbackURL: "/api/auth/google/callback",
              passReqToCallback: true,
            },
            async (req: any, accessToken: string, refreshToken: string, profile: any, done: any) => {
              try {
                // 1. Check if user exists by googleId
                const usersList = await storage.getAllUsers();
                let user = usersList.find(u => u.googleId === profile.id);

                if (!user) {
                  // 2. Check if user exists by email
                  const email = profile.emails?.[0]?.value;
                  if (email) {
                    user = usersList.find(u => u.email === email || u.username === email);
                  }

                  if (user) {
                    // Link googleId to existing user
                    user = await storage.updateUser(user.id, { googleId: profile.id } as any);
                  } else {
                    // 3. Create new user
                    const username = email || `google_${profile.id}`;
                    const newUserData = {
                      username: username,
                      fullName: profile.displayName || "Google User",
                      email: email || null,
                      googleId: profile.id,
                      profileImage: profile.photos?.[0]?.value || null,
                      role: "client" as const,
                      password: null as any
                    };
                    
                    user = await storage.createUser(newUserData as any);
                  }
                }

                if (user.isBanned) {
                  return done(null, false, { message: "Account is banned" });
                }

                return done(null, user);
              } catch (err) {
                console.error("Google Auth Error:", err);
                return done(err);
              }
            }
          )
        );
      })
      .catch((err) => {
        console.error("Failed to load passport-google-oauth20:", err);
      });
  }

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
