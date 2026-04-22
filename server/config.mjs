import "dotenv/config";
import path from "node:path";

function toPositiveNumber(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function toBoolean(value, fallback = false) {
  if (value == null || value === "") {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return fallback;
}

function toDatabaseSsl(value) {
  if (value == null || value === "") {
    return false;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on", "require"].includes(normalized)) {
    return { rejectUnauthorized: false };
  }
  return false;
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
  adminApiKey: String(process.env.ADMIN_API_KEY || "").trim(),
  adminDashboardPassword: String(process.env.ADMIN_DASHBOARD_PASSWORD || process.env.ADMIN_API_KEY || "").trim(),
  adminSessionSecret: String(process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_API_KEY || "").trim(),
  adminSessionTtlMinutes: toPositiveNumber(process.env.ADMIN_SESSION_TTL_MINUTES, 480),
  adminLoginRateLimitWindowMs: toPositiveNumber(process.env.ADMIN_LOGIN_RATE_LIMIT_WINDOW_MS, 900_000),
  adminLoginRateLimitMax: toPositiveNumber(process.env.ADMIN_LOGIN_RATE_LIMIT_MAX, 10),
  db: {
    host: String(process.env.DB_HOST || "127.0.0.1").trim(),
    port: toPositiveNumber(process.env.DB_PORT, 55432),
    database: String(process.env.DB_NAME || "dr_katherine").trim(),
    user: String(process.env.DB_USER || "postgres").trim(),
    password: String(process.env.DB_PASSWORD || "").trim(),
    ssl: toDatabaseSsl(process.env.DB_SSL),
    runMigrationsOnStart: toBoolean(process.env.DB_RUN_MIGRATIONS_ON_START, true)
  },
  whatsappAutomation: {
    enabled: toBoolean(process.env.WHATSAPP_AUTOMATION_ENABLED, false),
    backendBaseUrl: String(process.env.WHATSAPP_BACKEND_BASE_URL || "http://localhost:3000").trim().replace(/\/+$/, ""),
    backendApiKey: String(process.env.WHATSAPP_BACKEND_API_KEY || "").trim(),
    clinicRecipient: String(process.env.WHATSAPP_CLINIC_RECIPIENT || "").trim(),
    requestTimeoutMs: toPositiveNumber(process.env.WHATSAPP_REQUEST_TIMEOUT_MS, 6000),
    notifyParentOnAppointment: toBoolean(process.env.WHATSAPP_NOTIFY_PARENT_ON_APPOINTMENT, false)
  }
};

export default config;
