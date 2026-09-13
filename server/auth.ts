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

  const sessionStore = new PgSession({
    pool,
    createTableIfMissing: true,
  });

  // Prevent session store errors from crashing the server
  sessionStore.on('error', (err) => {
    console.error('SESSION STORE ERROR:', err);
  });

  const sessionSettings: session.SessionOptions = {
    store: sessionStore,
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      secure: process.env.NODE_ENV === "production",
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
        const user = await storage.getUserByUsernameWithPassword(username.trim().toLowerCase());
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


        // Sanitize the user object before passing it to done() to avoid leaking the password hash
        const { password: _password, ...safeUser } = user;
        return done(null, safeUser);
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
                const email = profile.emails?.[0]?.value;
                const googleId = profile.id;
                
                // 1. Check if user already linked this Google account
                let user = await storage.getUserByGoogleId(googleId);
                
                // 2. Check by email
                if (!user && email) {
                  user = await storage.getUserByEmail(email);
                }

                // 3. Check by username (email used as username)
                if (!user && email) {
                  user = await storage.getUserByUsername(email);
                }

                if (user) {
                  // Link googleId only if not already set (avoid unique constraint conflict)
                  if (!user.googleId) {
                    try {
                      user = await storage.updateUser(user.id, { googleId } as any);
                    } catch (updateErr) {
                      console.error("Failed to link googleId:", updateErr);
                      // Continue anyway — user exists, just couldn't link
                    }
                  }
                } else {
                  // 4. Create new user
                  const username = email || `google_${googleId}`;
                  const newUserData = {
                    username,
                    fullName: profile.displayName || "Google User",
                    email: email || null,
                    googleId,
                    profileImage: profile.photos?.[0]?.value || null,
                    role: "client" as const,
                    password: null as any
                  };
                  
                  try {
                    user = await storage.createUser(newUserData as any);
                  } catch (createErr: any) {
                    // If unique constraint error (race condition), try to find existing user
                    if (createErr?.code === "23505") {
                      if (email) {
                        user = await storage.getUserByEmail(email) || await storage.getUserByUsername(email);
                      }
                      if (!user) {
                        user = await storage.getUserByGoogleId(googleId);
                      }
                      if (!user) {
                        throw createErr;
                      }
                    } else {
                      throw createErr;
                    }
                  }
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

      done(null, user);
    } catch (err) {
      done(err);
    }
  });
}
