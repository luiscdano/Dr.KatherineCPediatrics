import path from "node:path";

function toPositiveNumber(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function parseOrigins(value) {
  if (!value) {
    return ["http://localhost:8080"];
  }

  return String(value)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const config = {
  host: process.env.HOST || "0.0.0.0",
  port: toPositiveNumber(process.env.PORT, 8787),
  dataFile: path.resolve(process.cwd(), process.env.DATA_FILE || "server/data/submissions.json"),
  corsOrigins: parseOrigins(process.env.CORS_ORIGIN),
  maxBodySize: process.env.MAX_BODY_SIZE || "100kb",
  rateLimitWindowMs: toPositiveNumber(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
  rateLimitMax: toPositiveNumber(process.env.RATE_LIMIT_MAX, 60),
  adminApiKey: String(process.env.ADMIN_API_KEY || "").trim()
};

export default config;
