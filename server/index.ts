import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { setupSecurityHeaders, validateSessionSecret, authLimiter, apiLimiter, uploadLimiter } from "./security";
import { setupVite } from "./vite";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

const sessionSecret = validateSessionSecret();

setupSecurityHeaders(app);

app.use("/api/login", authLimiter);
app.use("/api/register", authLimiter);
app.use("/api/auth", authLimiter);
app.use("/api/admin/login", authLimiter);
app.use("/api/upload", uploadLimiter);
app.use("/api/uploads", uploadLimiter);

app.use("/api", apiLimiter);

app.use(
  express.json({
    limit: "5mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    // DGSSI 7.4.1: Show generic error message for 500 in production to avoid leaking details
    const message = (process.env.NODE_ENV === "production" && status === 500)
      ? "An unexpected error occurred. Please try again later."
      : (err.message || "Internal Server Error");

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // Fallback for unhandled API routes: Prevent Vite/static server from serving index.html for missing APIs
  app.use("/api", (req, res) => {
    res.status(404).json({ message: "المسار غير موجود (API endpoint not found)" });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    console.log("Environment check:", {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT, // Use process.env.PORT directly here
    });
    serveStatic(app);
  } else {
    await setupVite(server, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  const host = "0.0.0.0";
  server.listen(
    {
      port,
      host,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();

