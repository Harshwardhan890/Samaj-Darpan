import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import compression from "compression";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { attachUser } from "./auth";
import { authRouter } from "./auth-routes";
import { projectRouter } from "./project-routes";
import { adminRouter } from "./admin-routes";
import { sourceStatuses, getDb, saveDb, writeNow } from "./db";
import { rateLimit } from "./rateLimit";
import { CONNECTORS } from "./dataSources";
import { upsertProjects } from "./upsert";
import { uid } from "./password";

const here = path.dirname(fileURLToPath(import.meta.url));
export const app = express();
const PORT = Number(process.env.PORT ?? 8787);

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(compression());
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
// Resolve the session cookie (or Supabase bearer token) for every request so
// route guards and `/auth/me` see the authenticated account.
app.use(attachUser);

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Permissions-Policy", "geolocation=(self), camera=(), microphone=()");
  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data: blob: https://images.unsplash.com https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com",
        "connect-src 'self' https://*.supabase.co",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; "),
    );
  }
  next();
});

app.use("/api", rateLimit({ windowMs: 60_000, max: 300, keyPrefix: "api" }));

// Seed on boot so an empty install works immediately.
getDb();

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    time: new Date().toISOString(),
    demoMode: process.env.DEMO_MODE !== "false",
    sources: sourceStatuses().map((s) => ({
      id: s.id,
      configured: s.configured,
      lastRunStatus: s.lastRunStatus,
    })),
  });
});

app.get("/api/sources", (req, res) => {
  res.json({
    sources: sourceStatuses(),
    note: "Sources without a documented public API are supported through the administrator import pipeline. Samaj Darpan does not scrape restricted portals.",
  });
});

app.use("/api/auth", authRouter);
app.use("/api", projectRouter);
app.use("/api/admin", adminRouter);

app.use("/api", (req, res) => {
  res.status(404).json({ error: "API route not found." });
});

// Serve the built SPA in production.
if (process.env.NODE_ENV === "production") {
  const dist = path.join(here, "..", "dist");
  if (fs.existsSync(dist)) {
    app.use(express.static(dist, { maxAge: "1h", index: false }));
    app.get(/.*/, (req, res) => {
      res.sendFile(path.join(dist, "index.html"));
    });
  } else {
    console.warn("[server] dist/ not found — run `npm run build` first.");
  }
}

app.use(
  (
    error: Error & { type?: string },
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    console.error("[server]", error.message);
    if (res.headersSent) return next(error);
    if (error.type === "entity.too.large") {
      res.status(413).json({ error: "Request is too large." });
      return;
    }
    res.status(500).json({ error: "Something went wrong on the server." });
  },
);

// Optional periodic refresh. Deliberately opt-in so a deployment never makes
// surprise requests to public government APIs.
if (process.env.ENABLE_AUTO_REFRESH === "true") {
  const run = async () => {
    for (const connector of CONNECTORS) {
      if (!connector.canFetch()) continue;
      try {
        const result = await connector.fetchProjects();
        upsertProjects(result.projects);
        getDb().sourceRuns.unshift({
          id: uid("run"),
          sourceId: connector.id,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          status: result.ok ? "success" : "failed",
          message: result.message,
          records: result.projects.length,
          actorId: "scheduler",
        });
        saveDb();
      } catch (error) {
        console.error(`[refresh] ${connector.id}`, error);
      }
    }
  };
  setTimeout(run, 15_000);
  setInterval(run, 6 * 3_600_000);
}

if (process.env.NODE_ENV !== "test") {
  const server = app.listen(PORT, (error?: Error) => {
    if (error) {
      console.error(`[server] Could not listen on port ${PORT}: ${error.message}`);
      process.exit(1);
    }
    console.log(`[server] Samaj Darpan API on http://localhost:${PORT}`);
  });

  function shutdown(signal: string) {
    console.log(`[server] ${signal} received, shutting down.`);
    writeNow();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000);
  }

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}
