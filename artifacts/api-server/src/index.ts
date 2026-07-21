import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Safety net: log unhandled rejections/exceptions instead of crashing.
// Individual routes already have try/catch; this catches anything that slips through.
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection — server continuing");
});

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception — server continuing");
});

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
