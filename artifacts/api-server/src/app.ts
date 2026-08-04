import express, { type Express } from "express";
import cors from "cors";
import compression from "compression";
import cookieSession from "cookie-session";
import pinoHttp from "pino-http";
import router from "./routes";
import adminRouter from "./routes/admin";
import mpesaRouter from "./routes/mpesa";
import { logger } from "./lib/logger";
import { pool } from "./lib/db";

export { pool };

const isProd = process.env["NODE_ENV"] === "production";

// ---------------------------------------------------------------------------
// Sessions — cookie-session stores { userId } / { adminId } directly inside a
// signed, tamper-proof cookie. No database read or write happens for auth.
// The admin and user frontends are separate custom domains from the API, so
// production must use SameSite=None with Secure for credentialed cross-origin
// requests. The API CORS allowlist still restricts which origins may use it.
// ---------------------------------------------------------------------------
const cookieSessionMiddleware = cookieSession({
  name: "session",
  secret: process.env["SESSION_SECRET"] ?? "maligain-secret-key-change-in-production",
  maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
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

// ALLOWED_ORIGINS — comma-separated list of frontend origins allowed to call
// the API with credentials (e.g. https://maligain.onrender.com,https://maligain-admin.onrender.com).
// Defaults to "*" in development and to the env var in production.
const rawOrigins = process.env["ALLOWED_ORIGINS"];
const allowedOrigins = rawOrigins
  ? rawOrigins.split(",").map((o) => o.trim()).filter(Boolean)
  : null;

app.use(
  cors({
    origin: allowedOrigins
      ? (origin, cb) => {
          // Allow server-to-server calls (no Origin header) and listed origins
          if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
          cb(new Error(`CORS: origin "${origin}" not allowed`));
        }
      : true,
    credentials: true,
  }),
);
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));


app.use(cookieSessionMiddleware);

app.use("/api", router);
app.use("/api/admin", adminRouter);
app.use("/callbackurl", mpesaRouter);


export default app;
