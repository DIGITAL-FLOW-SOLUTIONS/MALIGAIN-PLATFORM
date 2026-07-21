import express, { type Express } from "express";
import cors from "cors";
import compression from "compression";
import cookieSession from "cookie-session";
import pinoHttp from "pino-http";
import path from "path";
import router from "./routes";
import adminRouter from "./routes/admin";
import mpesaRouter from "./routes/mpesa";
import { logger } from "./lib/logger";
import { pool } from "./lib/db";

export { pool };

const isProd = process.env["NODE_ENV"] === "production";

// ---------------------------------------------------------------------------
// Sessions — cookie-session stores { userId } / { adminId } directly inside a
// signed, tamper-proof cookie.  No database read or write happens for auth.
// This eliminates ALL session-related Disk IO on Supabase.
// ---------------------------------------------------------------------------
const cookieSessionMiddleware = cookieSession({
  name: "session",
  secret: process.env["SESSION_SECRET"] ?? "maligain-secret-key-change-in-production",
  maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "strict" : "lax",
});

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------
const app: Express = express();

if (isProd) app.set("trust proxy", 1);

// Gzip all responses (60-70% bandwidth saving)
app.use(compression());

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// ---------------------------------------------------------------------------
// Static ASSET files — served before session middleware so JS/CSS bundles,
// images, fonts etc. bypass cookie parsing entirely (minor perf win).
// ---------------------------------------------------------------------------
if (isProd) {
  const repoRoot     = process.cwd();
  const adminDist    = path.resolve(repoRoot, "artifacts/admin/dist/public");
  const mulacentDist = path.resolve(repoRoot, "artifacts/mulacent/dist/public");

  const assetOpts = { maxAge: "1y", immutable: true } as const;
  const imageOpts = { maxAge: "7d" } as const;

  app.use("/admin/assets", express.static(path.join(adminDist,    "assets"), assetOpts));
  app.use("/assets",       express.static(path.join(mulacentDist, "assets"), assetOpts));
  app.use("/images",       express.static(path.join(mulacentDist, "images"), imageOpts));
  app.use("/admin/images", express.static(path.join(adminDist,    "images"), imageOpts));
}

app.use(cookieSessionMiddleware);

app.use("/api", router);
app.use("/api/admin", adminRouter);
app.use("/callbackurl", mpesaRouter);

// ---------------------------------------------------------------------------
// Static HTML + SPA fallback
// ---------------------------------------------------------------------------
if (isProd) {
  const repoRoot     = process.cwd();
  const adminDist    = path.resolve(repoRoot, "artifacts/admin/dist/public");
  const mulacentDist = path.resolve(repoRoot, "artifacts/mulacent/dist/public");

  app.use("/admin", express.static(adminDist));
  app.get("/admin/*path", (_req, res) => {
    res.sendFile(path.join(adminDist, "index.html"));
  });

  app.use("/", express.static(mulacentDist));
  app.get("/*path", (_req, res) => {
    res.sendFile(path.join(mulacentDist, "index.html"));
  });
}

export default app;
