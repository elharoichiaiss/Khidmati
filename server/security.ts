import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

// Generate a strong session secret if not provided
function generateSessionSecret(): string {
  const crypto = require("crypto");
  return crypto.randomBytes(32).toString("hex");
}

export function validateSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret === "your-secret-key-1234") {
    console.warn("⚠️  WARNING: SESSION_SECRET is not set or using default value!");
    console.warn("⚠️  Generate a strong secret using:");
    console.warn("⚠️  node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"");
    console.warn("⚠️  Add it to your .env file as SESSION_SECRET=<generated_value>");

    // In development, generate a temporary one (not for production!)
    if (process.env.NODE_ENV !== "production") {
      const tempSecret = generateSessionSecret();
      console.warn(`⚠️  Using temporary secret: ${tempSecret.substring(0, 16)}...`);
      return tempSecret;
    }

    // In production, throw error
    throw new Error("SESSION_SECRET must be set in production!");
  }
  return secret;
}

// Rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { message: "Too many login attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || "unknown";
  },
});

// Rate limiter for general API endpoints
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { message: "Too many requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for file uploads
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 uploads per 15 minutes
  message: { message: "Too many file uploads. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Security headers middleware using Helmet
export function setupSecurityHeaders(app: express.Express) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://maps.googleapis.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: ["'self'", "https://maps.googleapis.com"],
        frameSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false, // Required for some frontend features
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  }));

  // Additional security headers
  app.use((req, res, next) => {
    // Prevent clickjacking
    res.setHeader("X-Frame-Options", "SAMEORIGIN");

    // Prevent MIME type sniffing
    res.setHeader("X-Content-Type-Options", "nosniff");

    // XSS Protection
    res.setHeader("X-XSS-Protection", "1; mode=block");

    // Referrer Policy
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

    // Permissions Policy
    res.setHeader(
      "Permissions-Policy",
      "geolocation=(self), microphone=(), camera=()"
    );

    next();
  });
}
