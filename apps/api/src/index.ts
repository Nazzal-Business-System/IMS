import "dotenv/config";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { createApp } from "./app.js";
import { prisma } from "./lib/prisma.js";
import {
  validateEnv,
  checkDatabaseConnection,
  logAuthDebugChecklist,
  isDatabaseReady,
} from "./lib/env.js";
import { parseCorsOrigins } from "./lib/cors.js";
import { errorHandler } from "./middleware/error-handler.js";
import { initSocketServer } from "./lib/socket.js";
import { getUploadsRoot } from "./lib/avatar-storage.js";

const app = express();
const port = parseInt(process.env.PORT ?? "4000", 10);
const host = process.env.HOST ?? "0.0.0.0";

// Render / reverse proxies
app.set("trust proxy", 1);

app.use(
  helmet({
    // Avatars are loaded cross-origin from the web app
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "ims-api" });
});

app.get("/ready", async (_req, res) => {
  const dbOk = await isDatabaseReady();
  if (!dbOk) {
    res.status(503).json({ status: "not_ready", service: "ims-api", database: false });
    return;
  }
  res.json({ status: "ready", service: "ims-api", database: true });
});

// Public avatar/static files (paths stored as /uploads/...). CORS for <img> from the web app.
app.use(
  "/uploads",
  cors({
    origin: parseCorsOrigins(process.env.CORS_ORIGIN),
    credentials: true,
  }),
  express.static(getUploadsRoot(), {
    maxAge: process.env.NODE_ENV === "production" ? "7d" : 0,
    fallthrough: true,
  })
);

app.use("/api", createApp());

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use(errorHandler);

async function start() {
  validateEnv();
  await checkDatabaseConnection();
  await logAuthDebugChecklist();

  const httpServer = createServer(app);
  initSocketServer(httpServer);

  httpServer.listen(port, host, () => {
    console.log(`IMS API listening on http://${host}:${port}`);
    console.log(`  health: /health`);
    console.log(`  ready:  /ready`);
  });

  let shuttingDown = false;

  async function shutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[ims-api] ${signal} received — shutting down`);

    const forceTimer = setTimeout(() => {
      console.error("[ims-api] Forced exit after shutdown timeout");
      process.exit(1);
    }, 10_000);
    forceTimer.unref?.();

    httpServer.close(async (err) => {
      try {
        await prisma.$disconnect();
      } catch {
        // ignore
      }
      clearTimeout(forceTimer);
      if (err) {
        console.error("[ims-api] Error during HTTP close:", err.message);
        process.exit(1);
      }
      console.log("[ims-api] Shutdown complete");
      process.exit(0);
    });
  }

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

start().catch((err) => {
  console.error("[ims-api] Startup failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
