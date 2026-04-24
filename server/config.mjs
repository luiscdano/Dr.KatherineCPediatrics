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

function parseList(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toSameSite(value, fallback = "strict") {
  const normalized = String(value || "").trim().toLowerCase();
  if (["strict", "lax", "none"].includes(normalized)) {
    return normalized;
  }
  return fallback;
}

const config = {
  host: process.env.HOST || "0.0.0.0",
  port: toPositiveNumber(process.env.PORT, 8787),
  trustProxy: toBoolean(process.env.TRUST_PROXY, false),
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
  adminSessionCookieName: String(process.env.ADMIN_SESSION_COOKIE_NAME || "drk_admin_session").trim(),
  adminCsrfCookieName: String(process.env.ADMIN_CSRF_COOKIE_NAME || "drk_admin_csrf").trim(),
  adminCookieSecure: toBoolean(process.env.ADMIN_COOKIE_SECURE, false),
  adminCookieSameSite: toSameSite(process.env.ADMIN_COOKIE_SAMESITE, "strict"),
  adminCookieDomain: String(process.env.ADMIN_COOKIE_DOMAIN || "").trim(),
  adminCookiePath: String(process.env.ADMIN_COOKIE_PATH || "/api/v1/admin").trim(),
  adminEnforceCsrf: toBoolean(process.env.ADMIN_ENFORCE_CSRF, true),
  adminAllowedIps: parseList(process.env.ADMIN_ALLOWED_IPS),
  ops: {
    metricsEnabled: toBoolean(process.env.OPS_METRICS_ENABLED, true),
    metricsKey: String(process.env.OPS_METRICS_KEY || "").trim(),
    alertWebhookUrl: String(process.env.ALERT_WEBHOOK_URL || "").trim(),
    alertCooldownMs: toPositiveNumber(process.env.ALERT_COOLDOWN_MS, 300_000),
    logLevel: String(process.env.LOG_LEVEL || "info").trim().toLowerCase(),
    logDir: String(process.env.LOG_DIR || "server/logs").trim()
  },
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
    notifyParentOnAppointment: toBoolean(process.env.WHATSAPP_NOTIFY_PARENT_ON_APPOINTMENT, false),
    remindersEnabled: toBoolean(process.env.WHATSAPP_REMINDERS_ENABLED, true),
    reminderTickMs: toPositiveNumber(process.env.WHATSAPP_REMINDER_TICK_MS, 30_000),
    reminderBatchSize: toPositiveNumber(process.env.WHATSAPP_REMINDER_BATCH_SIZE, 20)
  }
};

export default config;
