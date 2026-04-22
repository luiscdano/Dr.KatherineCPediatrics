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
