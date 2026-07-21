import { Pool } from "pg";
import { logger } from "./logger";

const isProd = process.env["NODE_ENV"] === "production";

export const pool = new Pool({
  connectionString: process.env["DATABASE_URL"],
  ssl: isProd ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

// CRITICAL: without this handler, any error on an idle pool client (e.g.
// Supabase dropping the connection) emits an unhandled 'error' event and
// crashes the Node.js process with exit code 1.
pool.on("error", (err) => {
  logger.error({ err }, "Idle PostgreSQL client error — connection removed from pool");
});
