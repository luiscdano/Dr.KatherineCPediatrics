import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import config from "./config.mjs";
import logger from "./logger.mjs";
import { closePool, healthCheckDatabase } from "./db/client.mjs";
import { runMigrations } from "./db/migrator.mjs";
import {
  createAppointment,
  listAppointments,
  listTakenTimesByDate,
  updateAppointmentStatus
} from "./repositories/appointments-repository.mjs";
import { createContactMessage, listContactMessages } from "./repositories/contact-messages-repository.mjs";
import {
  createPreVisitAssessment,
  listPreVisitAssessments
} from "./repositories/pre-visit-assessments-repository.mjs";
import {
  createResourceDownloadEvent,
  listResourceDownloadEvents
} from "./repositories/resource-downloads-repository.mjs";
import {
  addTriageCaseResponse,
  createTriageCase,
  getTriageCaseById,
  listTriageCases,
  listTriageHistoryByGuardianPhone,
  updateTriageCaseStatus
} from "./repositories/triage-cases-repository.mjs";
import { listReminders } from "./repositories/whatsapp-reminders-repository.mjs";
import { getDashboardMetrics, getDashboardTimeSeries } from "./repositories/metrics-repository.mjs";
import {
  notifyAppointmentCreated,
  notifyContactMessageCreated,
  notifyPreVisitAssessmentCreated,
  notifyTriageCaseCreated
} from "./whatsapp-notifier.mjs";
import {
  cancelAppointmentReminders,
  processDueAppointmentReminders,
  scheduleAppointmentReminders,
  scheduleNoShowRecoveryReminder
} from "./services/appointment-reminders-service.mjs";
import { evaluateClinicalUrgency } from "./services/triage-evaluator.mjs";
import {
  ValidationError,
  normalizeText,
  validateAppointmentPayload,
  validateContactPayload,
  validateISODate,
  validatePreVisitPayload,
  validateResourceDownloadPayload,
  validateTriageCasePayload
} from "./validation.mjs";

const app = express();
const appointmentUpdatableStatuses = new Set(["pending", "confirmed", "completed", "cancelled", "no_show"]);
const triageUpdatableStatuses = new Set(["new", "in_review", "responded", "follow_up", "closed", "referred_er"]);
const triageResponseTemplates = new Set([
  "monitor_casa_12h",
  "agendar_mismo_dia",
  "ir_emergencias_ahora",
  "solicitar_estudios_previos",
  "seguimiento_24h"
]);
const revokedAdminSessions = new Map();
const processStartedAt = Date.now();
let lastAlertSentAt = 0;
let remindersTimer = null;
let reminderWorkerBusy = false;
const metricsState = {
  requests: {
    total: 0,
    byMethod: {},
    byStatusClass: {},
    errors5xx: 0
  },
  admin: {
    loginSuccess: 0,
    loginFailure: 0,
    ipDenied: 0,
    csrfDenied: 0
  },
  business: {
    appointmentsCreated: 0,
    contactsCreated: 0,
    preVisitsCreated: 0,
    triageCasesCreated: 0,
    resourceDownloadsCreated: 0,
    remindersSent: 0,
    remindersFailed: 0
  },
  alerts: {
    sent: 0,
    failed: 0
  }
};
let server;

const premiumResourceCatalog = {
  "fiebre-24h-kit": {
    title: "Kit Fiebre 24H",
    downloadUrl: "/assets/downloads/fiebre-24h-kit.txt"
  },
  "alimentacion-etapas-kit": {
    title: "Guía de Alimentación por Etapas",
    downloadUrl: "/assets/downloads/alimentacion-etapas-kit.txt"
  },
  "vacunas-checklist-kit": {
    title: "Checklist de Vacunación",
    downloadUrl: "/assets/downloads/vacunas-checklist-kit.txt"
  },
  "botiquin-hogar-kit": {
    title: "Botiquín Pediátrico en Casa",
    downloadUrl: "/assets/downloads/botiquin-hogar-kit.txt"
  }
};

app.disable("x-powered-by");
if (config.trustProxy) {
  app.set("trust proxy", 1);
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (config.corsOrigins.includes("*") || config.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-admin-key", "x-csrf-token", "x-ops-key"],
    credentials: true
  })
);

app.use(helmet());
app.use(express.json({ limit: config.maxBodySize }));

app.use((req, res, next) => {
  const startedAt = process.hrtime.bigint();
  metricsState.requests.total += 1;

  const normalizedMethod = String(req.method || "GET").toUpperCase();
  metricsState.requests.byMethod[normalizedMethod] = (metricsState.requests.byMethod[normalizedMethod] || 0) + 1;

  req.requestId = randomUUID();
  res.setHeader("x-request-id", req.requestId);

  res.on("finish", () => {
    const endedAt = process.hrtime.bigint();
    const durationMs = Number(endedAt - startedAt) / 1_000_000;
    const statusCode = Number(res.statusCode) || 0;
    const statusClass = statusCode >= 100 ? `${Math.floor(statusCode / 100)}xx` : "unknown";
    metricsState.requests.byStatusClass[statusClass] = (metricsState.requests.byStatusClass[statusClass] || 0) + 1;

    if (statusCode >= 500) {
      metricsState.requests.errors5xx += 1;
    }

    logger.info("http_request", {
      requestId: req.requestId,
      method: normalizedMethod,
      path: req.originalUrl || req.url,
      statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      ip: req.ip
    });
  });

  next();
});

app.use(
  "/api/",
  rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    handler(req, res) {
      res.status(429).json({
        ok: false,
        error: "Se superó el límite de solicitudes. Intenta nuevamente en unos segundos.",
        requestId: req.requestId
      });
    }
  })
);

const adminLoginRateLimiter = rateLimit({
  windowMs: config.adminLoginRateLimitWindowMs,
  max: config.adminLoginRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler(req, res) {
    res.status(429).json({
      ok: false,
      error: "Se alcanzó el límite de intentos de acceso. Intenta nuevamente más tarde.",
      requestId: req.requestId
    });
  }
});

function sendJson(res, statusCode, payload) {
  res.status(statusCode).json(payload);
}

function runBackgroundTask(taskPromise, label) {
  taskPromise.catch((error) => {
    logger.error("background_task_failed", {
      label,
      error: error?.message || "unknown error"
    });
  });
}

async function sendAlertIfNeeded(eventName, payload = {}) {
  if (!config.ops.alertWebhookUrl) {
    return;
  }

  const now = Date.now();
  if (now - lastAlertSentAt < config.ops.alertCooldownMs) {
    return;
  }

  lastAlertSentAt = now;
  try {
    const response = await fetch(config.ops.alertWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        source: "dr-katherine-api",
        event: eventName,
        timestamp: new Date().toISOString(),
        payload
      })
    });

    if (!response.ok) {
      metricsState.alerts.failed += 1;
      logger.error("alert_dispatch_failed", {
        eventName,
        status: response.status
      });
      return;
    }

    metricsState.alerts.sent += 1;
    logger.warn("alert_dispatched", {
      eventName
    });
  } catch (error) {
    metricsState.alerts.failed += 1;
    logger.error("alert_dispatch_error", {
      eventName,
      error: error?.message || "unknown error"
    });
  }
}

function isReminderWorkerEnabled() {
  return Boolean(config.whatsappAutomation.enabled && config.whatsappAutomation.remindersEnabled);
}

async function runReminderWorkerTick() {
  if (!isReminderWorkerEnabled() || reminderWorkerBusy) {
    return;
  }

  reminderWorkerBusy = true;
  try {
    const result = await processDueAppointmentReminders({
      logger,
      maxBatch: config.whatsappAutomation.reminderBatchSize
    });

    metricsState.business.remindersSent += Number(result.sent || 0);
    metricsState.business.remindersFailed += Number(result.failed || 0);

    if (Number(result.queued || 0) > 0) {
      logger.info("reminder_worker_tick", {
        queued: result.queued,
        sent: result.sent,
        failed: result.failed,
        skipped: result.skipped
      });
    }
  } catch (error) {
    logger.error("reminder_worker_tick_failed", {
      error: error?.message || "unknown error"
    });

    runBackgroundTask(
      sendAlertIfNeeded("reminder_worker_failed", {
        error: error?.message || "unknown error"
      }),
      "reminder_worker_failed_alert"
    );
  } finally {
    reminderWorkerBusy = false;
  }
}

function startReminderWorker() {
  if (!isReminderWorkerEnabled() || remindersTimer) {
    return;
  }

  const tickMs = Math.max(10_000, Number(config.whatsappAutomation.reminderTickMs || 30_000));
  remindersTimer = setInterval(() => {
    runBackgroundTask(runReminderWorkerTick(), "runReminderWorkerTick");
  }, tickMs);

  runBackgroundTask(runReminderWorkerTick(), "runReminderWorkerTick_initial");

  logger.info("reminder_worker_started", {
    tickMs,
    batchSize: config.whatsappAutomation.reminderBatchSize
  });
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function buildDefaultMetricsRange() {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 29);
  return {
    from: toIsoDate(start),
    to: toIsoDate(end)
  };
}

function parseMetricsRange(query) {
  const defaults = buildDefaultMetricsRange();
  const from = normalizeText(query.from) || defaults.from;
  const to = normalizeText(query.to) || defaults.to;
  const parsedFrom = validateISODate(from, "from");
  const parsedTo = validateISODate(to, "to");

  if (parsedFrom > parsedTo) {
    throw new ValidationError("El rango de fechas es inválido: 'from' no puede ser mayor que 'to'.");
  }

  return {
    from: parsedFrom,
    to: parsedTo
  };
}

function parseCsvList(input) {
  const raw = normalizeText(input);
  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((item) => normalizeText(item).toLowerCase())
    .filter(Boolean);
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

function secureEqualText(left, right) {
  const leftBuffer = Buffer.from(String(left ?? ""), "utf8");
  const rightBuffer = Buffer.from(String(right ?? ""), "utf8");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function parseCookieHeader(cookieHeader) {
  const cookies = {};
  const raw = String(cookieHeader || "");
  if (!raw) {
    return cookies;
  }

  for (const segment of raw.split(";")) {
    const separatorIndex = segment.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = segment.slice(0, separatorIndex).trim();
    const value = segment.slice(separatorIndex + 1).trim();
    if (!key) {
      continue;
    }

    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
  }

  return cookies;
}

function getCookieValue(req, name) {
  const cookies = parseCookieHeader(req.get("cookie"));
  return String(cookies[name] || "").trim();
}

function buildSessionCookieOptions(maxAgeMs) {
  const options = {
    httpOnly: true,
    secure: config.adminCookieSecure,
    sameSite: config.adminCookieSameSite,
    path: config.adminCookiePath,
    maxAge: maxAgeMs
  };

  if (config.adminCookieDomain) {
    options.domain = config.adminCookieDomain;
  }

  return options;
}

function buildCsrfCookieOptions(maxAgeMs) {
  const options = {
    httpOnly: false,
    secure: config.adminCookieSecure,
    sameSite: config.adminCookieSameSite,
    path: config.adminCookiePath,
    maxAge: maxAgeMs
  };

  if (config.adminCookieDomain) {
    options.domain = config.adminCookieDomain;
  }

  return options;
}

function generateCsrfToken() {
  return randomBytes(32).toString("hex");
}

function getBearerToken(req) {
  const authHeader = normalizeText(req.get("authorization"));
  if (!authHeader) {
    return "";
  }

  const [scheme, ...parts] = authHeader.split(" ");
  if (String(scheme || "").toLowerCase() !== "bearer" || parts.length === 0) {
    return "";
  }

  return parts.join(" ").trim();
}

function cleanupRevokedAdminSessions() {
  const now = Date.now();
  for (const [sessionId, expiresAtMs] of revokedAdminSessions.entries()) {
    if (expiresAtMs <= now) {
      revokedAdminSessions.delete(sessionId);
    }
  }
}

function normalizeIp(ipValue) {
  const raw = String(ipValue || "").trim();
  if (!raw) {
    return "";
  }
  if (raw.startsWith("::ffff:")) {
    return raw.slice(7);
  }
  return raw;
}

function isValidIpv4(ipValue) {
  const chunks = ipValue.split(".");
  if (chunks.length !== 4) {
    return false;
  }

  return chunks.every((chunk) => {
    if (!/^\d+$/.test(chunk)) {
      return false;
    }
    const parsed = Number(chunk);
    return parsed >= 0 && parsed <= 255;
  });
}

function ipv4ToInt(ipValue) {
  if (!isValidIpv4(ipValue)) {
    return null;
  }

  return ipValue.split(".").reduce((acc, part) => ((acc << 8) + Number(part)) >>> 0, 0);
}

function matchesIpRule(ipValue, rule) {
  const normalizedIp = normalizeIp(ipValue);
  const normalizedRule = String(rule || "").trim();
  if (!normalizedRule) {
    return false;
  }

  if (!normalizedRule.includes("/")) {
    return normalizeIp(normalizedRule) === normalizedIp;
  }

  const [network, prefixText] = normalizedRule.split("/");
  const prefix = Number(prefixText);
  const ipInt = ipv4ToInt(normalizedIp);
  const networkInt = ipv4ToInt(network);
  if (ipInt == null || networkInt == null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    return false;
  }

  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return (ipInt & mask) === (networkInt & mask);
}

function getClientIp(req) {
  return normalizeIp(req.ip || req.socket?.remoteAddress || "");
}

function ensureAdminIpAccess(req, res, next) {
  if (!config.adminAllowedIps.length) {
    next();
    return;
  }

  const clientIp = getClientIp(req);
  const allowed = config.adminAllowedIps.some((rule) => matchesIpRule(clientIp, rule));
  if (allowed) {
    next();
    return;
  }

  metricsState.admin.ipDenied += 1;
  logger.warn("admin_ip_denied", {
    requestId: req.requestId,
    ip: clientIp
  });
  sendJson(res, 403, {
    ok: false,
    error: "Acceso restringido por política de red.",
    requestId: req.requestId
  });
}

function verifyAdminSessionToken(sessionToken) {
  const tokenPayload = jwt.verify(sessionToken, config.adminSessionSecret, {
    audience: "dr-katherine-admin",
    issuer: "dr-katherine-api"
  });

  if (!tokenPayload || typeof tokenPayload !== "object" || tokenPayload.scope !== "admin:metrics") {
    throw new Error("invalid token scope");
  }

  if (tokenPayload.jti && revokedAdminSessions.has(tokenPayload.jti)) {
    throw new Error("revoked token");
  }

  return tokenPayload;
}

function ensureAdminAccess(req, res, next) {
  cleanupRevokedAdminSessions();

  const bearerToken = getBearerToken(req);
  if (bearerToken) {
    if (!config.adminSessionSecret) {
      sendJson(res, 503, {
        ok: false,
        error: "ADMIN_SESSION_SECRET no está configurado en el servidor.",
        requestId: req.requestId
      });
      return;
    }

    try {
      const tokenPayload = verifyAdminSessionToken(bearerToken);

      req.adminAuth = {
        mode: "token",
        token: bearerToken,
        payload: tokenPayload
      };
      next();
      return;
    } catch (error) {
      sendJson(res, 401, {
        ok: false,
        error: "Token de sesión inválido o expirado.",
        requestId: req.requestId
      });
      return;
    }
  }

  const sessionCookieToken = getCookieValue(req, config.adminSessionCookieName);
  if (sessionCookieToken) {
    if (!config.adminSessionSecret) {
      sendJson(res, 503, {
        ok: false,
        error: "ADMIN_SESSION_SECRET no está configurado en el servidor.",
        requestId: req.requestId
      });
      return;
    }

    try {
      const tokenPayload = verifyAdminSessionToken(sessionCookieToken);
      req.adminAuth = {
        mode: "cookie",
        payload: tokenPayload
      };
      next();
      return;
    } catch {
      sendJson(res, 401, {
        ok: false,
        error: "Sesión inválida o expirada.",
        requestId: req.requestId
      });
      return;
    }
  }

  const providedAdminKey = normalizeText(req.get("x-admin-key"));
  if (providedAdminKey && config.adminApiKey && secureEqualText(providedAdminKey, config.adminApiKey)) {
    req.adminAuth = {
      mode: "api_key"
    };
    next();
    return;
  }

  if (!config.adminApiKey && !config.adminSessionSecret) {
    sendJson(res, 503, {
      ok: false,
      error: "No hay método de autenticación admin configurado en el servidor.",
      requestId: req.requestId
    });
    return;
  }

  sendJson(res, 401, {
    ok: false,
    error: "No autorizado.",
    requestId: req.requestId
  });
}

function ensureAdminCsrf(req, res, next) {
  if (!config.adminEnforceCsrf) {
    next();
    return;
  }

  if (req.adminAuth?.mode !== "cookie") {
    next();
    return;
  }

  const method = String(req.method || "GET").toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    next();
    return;
  }

  const csrfHeader = normalizeText(req.get("x-csrf-token"));
  const csrfCookie = getCookieValue(req, config.adminCsrfCookieName);
  if (!csrfHeader || !csrfCookie || !secureEqualText(csrfHeader, csrfCookie)) {
    metricsState.admin.csrfDenied += 1;
    logger.warn("admin_csrf_denied", {
      requestId: req.requestId,
      ip: getClientIp(req)
    });
    sendJson(res, 403, {
      ok: false,
      error: "Validación CSRF fallida.",
      requestId: req.requestId
    });
    return;
  }

  next();
}

function ensureOpsAccess(req, res, next) {
  if (!config.ops.metricsEnabled) {
    sendJson(res, 404, {
      ok: false,
      error: "Endpoint no disponible.",
      requestId: req.requestId
    });
    return;
  }

  if (!config.ops.metricsKey) {
    sendJson(res, 503, {
      ok: false,
      error: "OPS_METRICS_KEY no está configurado en el servidor.",
      requestId: req.requestId
    });
    return;
  }

  const providedKey = normalizeText(req.get("x-ops-key"));
  if (!providedKey || !secureEqualText(providedKey, config.ops.metricsKey)) {
    sendJson(res, 401, {
      ok: false,
      error: "No autorizado.",
      requestId: req.requestId
    });
    return;
  }

  next();
}

function buildOpsSnapshot() {
  const memory = process.memoryUsage();
  return {
    service: "dr-katherine-api",
    startedAt: new Date(processStartedAt).toISOString(),
    uptimeSeconds: Number((process.uptime() || 0).toFixed(2)),
    memory: {
      rssMb: Number((memory.rss / (1024 * 1024)).toFixed(2)),
      heapUsedMb: Number((memory.heapUsed / (1024 * 1024)).toFixed(2)),
      heapTotalMb: Number((memory.heapTotal / (1024 * 1024)).toFixed(2))
    },
    requests: metricsState.requests,
    admin: metricsState.admin,
    business: metricsState.business,
    alerts: metricsState.alerts,
    reminderWorker: {
      enabled: isReminderWorkerEnabled(),
      busy: reminderWorkerBusy,
      tickMs: config.whatsappAutomation.reminderTickMs,
      batchSize: config.whatsappAutomation.reminderBatchSize
    },
    timestamp: new Date().toISOString()
  };
}

app.get("/api/v1/health", async (_req, res, next) => {
  try {
    const database = await healthCheckDatabase();
    const ok = database.status === "up";

    sendJson(res, ok ? 200 : 503, {
      ok,
      data: {
        service: "dr-katherine-api",
        status: ok ? "up" : "degraded",
        database,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/ops/metrics", ensureOpsAccess, async (_req, res, next) => {
  try {
    sendJson(res, 200, {
      ok: true,
      data: buildOpsSnapshot()
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/appointments/taken", async (req, res, next) => {
  try {
    const date = validateISODate(req.query.date, "date");
    const timesTaken = await listTakenTimesByDate(date);

    sendJson(res, 200, {
      ok: true,
      data: {
        date,
        timesTaken
      }
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/v1/appointments", async (req, res, next) => {
  try {
    const payload = validateAppointmentPayload(req.body || {});
    if (payload.companyWebsite) {
      sendJson(res, 202, {
        ok: true,
        data: {
          accepted: true
        }
      });
      return;
    }

    const createdAppointment = await createAppointment({
      id: randomUUID(),
      date: payload.date,
      time: payload.time,
      patientName: payload.patientName,
      patientAge: payload.patientAge,
      parentName: payload.parentName,
      parentPhone: payload.parentPhone,
      reason: payload.reason,
      status: "pending",
      source: "website",
      createdAt: new Date().toISOString()
    });
    metricsState.business.appointmentsCreated += 1;

    runBackgroundTask(
      scheduleAppointmentReminders(createdAppointment),
      `scheduleAppointmentReminders requestId=${req.requestId}`
    );

    runBackgroundTask(
      notifyAppointmentCreated(createdAppointment),
      `notifyAppointmentCreated requestId=${req.requestId}`
    );

    sendJson(res, 201, {
      ok: true,
      data: {
        appointment: {
          id: createdAppointment.id,
          date: createdAppointment.date,
          time: createdAppointment.time,
          status: createdAppointment.status
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/v1/contact-messages", async (req, res, next) => {
  try {
    const payload = validateContactPayload(req.body || {});
    if (payload.companyName) {
      sendJson(res, 202, {
        ok: true,
        data: {
          accepted: true
        }
      });
      return;
    }

    const messageRecord = await createContactMessage({
      id: randomUUID(),
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      topic: payload.topic,
      message: payload.message,
      source: "website",
      createdAt: new Date().toISOString()
    });
    metricsState.business.contactsCreated += 1;

    runBackgroundTask(
      notifyContactMessageCreated(messageRecord),
      `notifyContactMessageCreated requestId=${req.requestId}`
    );

    sendJson(res, 201, {
      ok: true,
      data: {
        message: {
          id: messageRecord.id,
          topic: messageRecord.topic,
          createdAt: messageRecord.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/v1/pre-visit-assessments", async (req, res, next) => {
  try {
    const payload = validatePreVisitPayload(req.body || {});
    if (payload.companyWebsite) {
      sendJson(res, 202, {
        ok: true,
        data: {
          accepted: true
        }
      });
      return;
    }

    const triage = evaluateClinicalUrgency({
      patientAge: payload.patientAge,
      feverCelsius: payload.feverCelsius,
      painLevel: payload.painLevel,
      durationHours: payload.durationHours,
      warningSigns: []
    });

    const assessment = await createPreVisitAssessment({
      id: randomUUID(),
      patientName: payload.patientName,
      patientAge: payload.patientAge,
      guardianName: payload.guardianName,
      guardianPhone: payload.guardianPhone,
      primaryReason: payload.primaryReason,
      symptoms: payload.symptoms,
      feverCelsius: payload.feverCelsius,
      painLevel: payload.painLevel,
      durationHours: payload.durationHours,
      allergies: payload.allergies,
      medications: payload.medications,
      urgencyLevel: triage.urgencyLevel,
      triageSummary: triage.urgencyReason,
      recommendedChannel: triage.recommendedChannel,
      source: "website",
      createdAt: new Date().toISOString()
    });
    metricsState.business.preVisitsCreated += 1;

    runBackgroundTask(
      notifyPreVisitAssessmentCreated(assessment),
      `notifyPreVisitAssessmentCreated requestId=${req.requestId}`
    );

    sendJson(res, 201, {
      ok: true,
      data: {
        assessment: {
          id: assessment.id,
          urgencyLevel: assessment.urgencyLevel,
          recommendedChannel: assessment.recommendedChannel,
          triageSummary: assessment.triageSummary
        },
        advisory: triage.advisory
      }
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/v1/resource-downloads", async (req, res, next) => {
  try {
    const payload = validateResourceDownloadPayload(req.body || {});
    if (payload.companyWebsite) {
      sendJson(res, 202, {
        ok: true,
        data: {
          accepted: true
        }
      });
      return;
    }

    const catalog = premiumResourceCatalog[payload.resourceKey];
    if (!catalog) {
      throw new ValidationError("No se encontró el recurso solicitado.");
    }

    const event = await createResourceDownloadEvent({
      id: randomUUID(),
      resourceKey: payload.resourceKey,
      parentName: payload.parentName,
      parentEmail: payload.parentEmail,
      childAgeGroup: payload.childAgeGroup,
      consentGiven: payload.privacyConsent,
      source: "website",
      createdAt: new Date().toISOString()
    });
    metricsState.business.resourceDownloadsCreated += 1;

    sendJson(res, 201, {
      ok: true,
      data: {
        eventId: event.id,
        resource: {
          key: payload.resourceKey,
          title: catalog.title,
          downloadUrl: catalog.downloadUrl
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/v1/triage/cases", async (req, res, next) => {
  try {
    const payload = validateTriageCasePayload(req.body || {});
    if (payload.companyWebsite) {
      sendJson(res, 202, {
        ok: true,
        data: {
          accepted: true
        }
      });
      return;
    }

    const triage = evaluateClinicalUrgency({
      patientAge: payload.patientAge,
      feverCelsius: payload.feverCelsius,
      painLevel: payload.painLevel,
      durationHours: payload.durationHours,
      warningSigns: payload.warningSigns
    });

    const createdCase = await createTriageCase({
      id: randomUUID(),
      patientName: payload.patientName,
      patientAge: payload.patientAge,
      guardianName: payload.guardianName,
      guardianPhone: payload.guardianPhone,
      guardianEmail: payload.guardianEmail,
      title: payload.title,
      description: payload.description,
      feverCelsius: payload.feverCelsius,
      painLevel: payload.painLevel,
      durationHours: payload.durationHours,
      hasAllergies: payload.hasAllergies,
      allergyDetails: payload.allergyDetails,
      warningSigns: triage.normalizedWarningSigns,
      urgencyLevel: triage.urgencyLevel,
      urgencyScore: triage.urgencyScore,
      urgencyReason: triage.urgencyReason,
      status: triage.urgencyLevel === "critical" ? "referred_er" : "new",
      source: "website",
      assets: payload.photos.map((photo) => ({
        id: randomUUID(),
        originalName: photo.originalName,
        mimeType: photo.mimeType,
        fileSizeBytes: photo.fileSizeBytes,
        dataBase64: photo.dataBase64
      })),
      createdAt: new Date().toISOString()
    });
    metricsState.business.triageCasesCreated += 1;

    runBackgroundTask(
      notifyTriageCaseCreated(createdCase),
      `notifyTriageCaseCreated requestId=${req.requestId}`
    );

    if (createdCase.urgencyLevel === "critical") {
      runBackgroundTask(
        sendAlertIfNeeded("triage_case_critical", {
          caseId: createdCase.id,
          urgencyLevel: createdCase.urgencyLevel
        }),
        `sendAlertIfNeeded triage_case_critical requestId=${req.requestId}`
      );
    }

    sendJson(res, 201, {
      ok: true,
      data: {
        triageCase: {
          id: createdCase.id,
          urgencyLevel: createdCase.urgencyLevel,
          urgencyScore: createdCase.urgencyScore,
          urgencyReason: createdCase.urgencyReason,
          status: createdCase.status
        },
        recommendedChannel: triage.recommendedChannel,
        advisory: triage.advisory
      }
    });
  } catch (error) {
    next(error);
  }
});

app.use("/api/v1/admin", ensureAdminIpAccess);

app.post("/api/v1/admin/auth/login", adminLoginRateLimiter, async (req, res, next) => {
  try {
    if (!config.adminDashboardPassword || !config.adminSessionSecret) {
      sendJson(res, 503, {
        ok: false,
        error: "ADMIN_DASHBOARD_PASSWORD y ADMIN_SESSION_SECRET deben estar configurados.",
        requestId: req.requestId
      });
      return;
    }

    const password = normalizeText(req.body?.password);
    if (!password) {
      throw new ValidationError("Debes enviar la contraseña administrativa.");
    }

    if (!secureEqualText(password, config.adminDashboardPassword)) {
      metricsState.admin.loginFailure += 1;
      sendJson(res, 401, {
        ok: false,
        error: "Credenciales inválidas.",
        requestId: req.requestId
      });
      return;
    }

    const expiresInSeconds = Math.max(300, Math.round(config.adminSessionTtlMinutes * 60));
    const sessionJwtId = randomUUID();
    const token = jwt.sign(
      {
        scope: "admin:metrics"
      },
      config.adminSessionSecret,
      {
        audience: "dr-katherine-admin",
        issuer: "dr-katherine-api",
        subject: "admin-dashboard",
        jwtid: sessionJwtId,
        expiresIn: expiresInSeconds
      }
    );
    const csrfToken = generateCsrfToken();
    const maxAgeMs = expiresInSeconds * 1000;
    res.cookie(config.adminSessionCookieName, token, buildSessionCookieOptions(maxAgeMs));
    res.cookie(config.adminCsrfCookieName, csrfToken, buildCsrfCookieOptions(maxAgeMs));
    metricsState.admin.loginSuccess += 1;
    logger.info("admin_login_success", {
      requestId: req.requestId,
      ip: getClientIp(req)
    });

    sendJson(res, 200, {
      ok: true,
      data: {
        tokenType: "Bearer",
        token,
        expiresIn: expiresInSeconds,
        csrfToken
      }
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/admin/auth/me", ensureAdminAccess, async (req, res, next) => {
  try {
    const mode = req.adminAuth?.mode || "unknown";
    const tokenPayload = req.adminAuth?.payload || null;
    const csrfToken = mode === "cookie" ? getCookieValue(req, config.adminCsrfCookieName) : null;

    sendJson(res, 200, {
      ok: true,
      data: {
        authenticated: true,
        mode,
        expiresAt: tokenPayload?.exp ? new Date(tokenPayload.exp * 1000).toISOString() : null,
        csrfToken
      }
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/v1/admin/auth/logout", ensureAdminAccess, ensureAdminCsrf, async (req, res, next) => {
  try {
    if (req.adminAuth?.mode === "token" && req.adminAuth?.payload?.jti && req.adminAuth?.payload?.exp) {
      revokedAdminSessions.set(req.adminAuth.payload.jti, req.adminAuth.payload.exp * 1000);
    }
    if (req.adminAuth?.mode === "cookie" && req.adminAuth?.payload?.jti && req.adminAuth?.payload?.exp) {
      revokedAdminSessions.set(req.adminAuth.payload.jti, req.adminAuth.payload.exp * 1000);
    }

    res.clearCookie(config.adminSessionCookieName, buildSessionCookieOptions(0));
    res.clearCookie(config.adminCsrfCookieName, buildCsrfCookieOptions(0));

    sendJson(res, 200, {
      ok: true,
      data: {
        loggedOut: true
      }
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/admin/appointments", ensureAdminAccess, async (req, res, next) => {
  try {
    const status = normalizeText(req.query.status);
    const date = normalizeText(req.query.date);
    if (date) {
      validateISODate(date, "date");
    }

    const items = await listAppointments({
      status: status || undefined,
      date: date || undefined
    });

    sendJson(res, 200, {
      ok: true,
      data: {
        count: items.length,
        appointments: items
      }
    });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/v1/admin/appointments/:id/status", ensureAdminAccess, ensureAdminCsrf, async (req, res, next) => {
  try {
    const id = normalizeText(req.params.id);
    const status = normalizeText(req.body?.status).toLowerCase();
    if (!id) {
      throw new ValidationError("Debes indicar un id de cita válido.");
    }
    if (!appointmentUpdatableStatuses.has(status)) {
      throw new ValidationError("status no contiene un valor permitido.");
    }

    const updated = await updateAppointmentStatus(id, status);
    if (!updated) {
      const notFoundError = new Error("No se encontró la cita solicitada.");
      notFoundError.status = 404;
      throw notFoundError;
    }

    if (status === "cancelled" || status === "completed") {
      runBackgroundTask(
        cancelAppointmentReminders(updated.id),
        `cancelAppointmentReminders requestId=${req.requestId}`
      );
    }

    if (status === "no_show") {
      runBackgroundTask(
        scheduleNoShowRecoveryReminder(updated),
        `scheduleNoShowRecoveryReminder requestId=${req.requestId}`
      );
    }

    sendJson(res, 200, {
      ok: true,
      data: {
        appointment: updated
      }
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/admin/contact-messages", ensureAdminAccess, async (_req, res, next) => {
  try {
    const messages = await listContactMessages();
    sendJson(res, 200, {
      ok: true,
      data: {
        count: messages.length,
        messages
      }
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/admin/pre-visit-assessments", ensureAdminAccess, async (req, res, next) => {
  try {
    const urgencyLevel = normalizeText(req.query.urgencyLevel).toLowerCase();
    const guardianPhone = normalizeText(req.query.guardianPhone);
    const limit = Number(req.query.limit);

    const items = await listPreVisitAssessments({
      urgencyLevel: urgencyLevel || undefined,
      guardianPhone: guardianPhone || undefined,
      limit: Number.isFinite(limit) ? limit : undefined
    });

    sendJson(res, 200, {
      ok: true,
      data: {
        count: items.length,
        assessments: items
      }
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/admin/resource-downloads", ensureAdminAccess, async (req, res, next) => {
  try {
    const resourceKey = normalizeText(req.query.resourceKey).toLowerCase();
    const limit = Number(req.query.limit);
    const items = await listResourceDownloadEvents({
      resourceKey: resourceKey || undefined,
      limit: Number.isFinite(limit) ? limit : undefined
    });

    sendJson(res, 200, {
      ok: true,
      data: {
        count: items.length,
        events: items
      }
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/admin/triage/cases", ensureAdminAccess, async (req, res, next) => {
  try {
    const statusItems = parseCsvList(req.query.status);
    if (statusItems.length && statusItems.some((item) => !triageUpdatableStatuses.has(item))) {
      throw new ValidationError("status contiene un valor no permitido para triage.");
    }

    const urgencyLevel = normalizeText(req.query.urgencyLevel).toLowerCase();
    const guardianPhone = normalizeText(req.query.guardianPhone);
    const limit = Number(req.query.limit);

    const items = await listTriageCases({
      status: statusItems.length ? statusItems : undefined,
      urgencyLevel: urgencyLevel || undefined,
      guardianPhone: guardianPhone || undefined,
      limit: Number.isFinite(limit) ? limit : undefined
    });

    sendJson(res, 200, {
      ok: true,
      data: {
        count: items.length,
        triageCases: items
      }
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/admin/triage/cases/:id", ensureAdminAccess, async (req, res, next) => {
  try {
    const caseId = normalizeText(req.params.id);
    if (!caseId) {
      throw new ValidationError("Debes indicar un id de caso válido.");
    }

    const triageCase = await getTriageCaseById(caseId, { includeAssets: true, includeEvents: true });
    if (!triageCase) {
      const notFoundError = new Error("No se encontró el caso solicitado.");
      notFoundError.status = 404;
      throw notFoundError;
    }

    sendJson(res, 200, {
      ok: true,
      data: {
        triageCase: {
          ...triageCase,
          assets: (triageCase.assets || []).map((asset) => ({
            id: asset.id,
            originalName: asset.originalName,
            mimeType: asset.mimeType,
            fileSizeBytes: asset.fileSizeBytes,
            dataUri: `data:${asset.mimeType};base64,${asset.dataBase64}`,
            createdAt: asset.createdAt
          }))
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/v1/admin/triage/cases/:id/status", ensureAdminAccess, ensureAdminCsrf, async (req, res, next) => {
  try {
    const caseId = normalizeText(req.params.id);
    const status = normalizeText(req.body?.status).toLowerCase();
    if (!caseId) {
      throw new ValidationError("Debes indicar un id de caso válido.");
    }
    if (!triageUpdatableStatuses.has(status)) {
      throw new ValidationError("status no contiene un valor permitido para triage.");
    }

    const updated = await updateTriageCaseStatus(caseId, status, "admin");
    if (!updated) {
      const notFoundError = new Error("No se encontró el caso solicitado.");
      notFoundError.status = 404;
      throw notFoundError;
    }

    if (status === "referred_er") {
      runBackgroundTask(
        sendAlertIfNeeded("triage_case_referred_er", {
          caseId: updated.id,
          urgencyLevel: updated.urgencyLevel
        }),
        `triage_case_referred_er requestId=${req.requestId}`
      );
    }

    sendJson(res, 200, {
      ok: true,
      data: {
        triageCase: updated
      }
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/v1/admin/triage/cases/:id/respond", ensureAdminAccess, ensureAdminCsrf, async (req, res, next) => {
  try {
    const caseId = normalizeText(req.params.id);
    if (!caseId) {
      throw new ValidationError("Debes indicar un id de caso válido.");
    }

    const template = normalizeText(req.body?.template).toLowerCase();
    const note = normalizeText(req.body?.note);
    const nextStatus = normalizeText(req.body?.status).toLowerCase() || "responded";
    const followUpHoursRaw = req.body?.followUpHours;
    const followUpHours = Number(followUpHoursRaw);

    if (!template && !note) {
      throw new ValidationError("Debes incluir una plantilla o nota clínica para responder el caso.");
    }
    if (template && !triageResponseTemplates.has(template)) {
      throw new ValidationError("template contiene un valor no permitido.");
    }
    if (!triageUpdatableStatuses.has(nextStatus)) {
      throw new ValidationError("status no contiene un valor permitido para triage.");
    }

    let followUpAt = null;
    if (followUpHoursRaw != null && followUpHoursRaw !== "") {
      if (!Number.isInteger(followUpHours) || followUpHours < 0 || followUpHours > 168) {
        throw new ValidationError("followUpHours debe ser un entero entre 0 y 168.");
      }
      followUpAt = new Date(Date.now() + followUpHours * 60 * 60 * 1000).toISOString();
    }

    const updated = await addTriageCaseResponse(caseId, {
      template: template || "custom",
      note,
      followUpAt,
      status: nextStatus,
      actor: "admin"
    });

    if (!updated) {
      const notFoundError = new Error("No se encontró el caso solicitado.");
      notFoundError.status = 404;
      throw notFoundError;
    }

    sendJson(res, 200, {
      ok: true,
      data: {
        triageCase: updated
      }
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/admin/triage/patient-history", ensureAdminAccess, async (req, res, next) => {
  try {
    const guardianPhone = normalizeText(req.query.guardianPhone);
    if (!guardianPhone) {
      throw new ValidationError("Debes indicar guardianPhone para consultar historial.");
    }
    if (!/^[0-9+()\-\s]{7,20}$/.test(guardianPhone)) {
      throw new ValidationError("guardianPhone no tiene formato válido.");
    }

    const limit = Number(req.query.limit);
    const history = await listTriageHistoryByGuardianPhone(
      guardianPhone,
      Number.isFinite(limit) ? limit : undefined
    );

    sendJson(res, 200, {
      ok: true,
      data: {
        guardianPhone,
        count: history.length,
        cases: history
      }
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/admin/whatsapp-reminders", ensureAdminAccess, async (req, res, next) => {
  try {
    const status = normalizeText(req.query.status).toLowerCase();
    const appointmentId = normalizeText(req.query.appointmentId);
    const limit = Number(req.query.limit);

    const items = await listReminders({
      status: status || undefined,
      appointmentId: appointmentId || undefined,
      limit: Number.isFinite(limit) ? limit : undefined
    });

    sendJson(res, 200, {
      ok: true,
      data: {
        count: items.length,
        reminders: items
      }
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/admin/metrics", ensureAdminAccess, async (req, res, next) => {
  try {
    const range = parseMetricsRange(req.query || {});
    const metrics = await getDashboardMetrics(range);
    sendJson(res, 200, {
      ok: true,
      data: metrics
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/admin/metrics/timeseries", ensureAdminAccess, async (req, res, next) => {
  try {
    const range = parseMetricsRange(req.query || {});
    const series = await getDashboardTimeSeries(range);
    sendJson(res, 200, {
      ok: true,
      data: {
        range,
        series
      }
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/admin/metrics/export.csv", ensureAdminAccess, async (req, res, next) => {
  try {
    const range = parseMetricsRange(req.query || {});
    const series = await getDashboardTimeSeries(range);
    const headers = [
      "day",
      "appointments",
      "contacts",
      "confirmed",
      "cancelled",
      "no_show",
      "pre_visits",
      "triage_cases",
      "resource_downloads"
    ];
    const rows = [headers.join(",")];

    for (const item of series) {
      rows.push(
        [
          csvEscape(item.day),
          csvEscape(item.appointments),
          csvEscape(item.contacts),
          csvEscape(item.confirmed),
          csvEscape(item.cancelled),
          csvEscape(item.noShow),
          csvEscape(item.preVisits),
          csvEscape(item.triageCases),
          csvEscape(item.resourceDownloads)
        ].join(",")
      );
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="metrics-${range.from}_to_${range.to}.csv"`);
    res.status(200).send(rows.join("\n"));
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  logger.error("request_error", {
    requestId: req.requestId,
    path: req.originalUrl || req.url,
    method: req.method,
    status: Number(error?.status) || 500,
    error: error?.message || "unknown error"
  });

  if (error instanceof ValidationError) {
    sendJson(res, error.status || 400, {
      ok: false,
      error: error.message,
      details: error.details || undefined,
      requestId: req.requestId
    });
    return;
  }

  const status = Number(error.status) || 500;
  const message = status >= 500 ? "Error interno del servidor." : error.message || "Solicitud inválida.";
  if (status >= 500) {
    runBackgroundTask(
      sendAlertIfNeeded("api_error", {
        requestId: req.requestId,
        status,
        path: req.originalUrl || req.url
      }),
      `sendAlertIfNeeded requestId=${req.requestId}`
    );
  }

  sendJson(res, status, {
    ok: false,
    error: message,
    requestId: req.requestId
  });
});

async function startServer() {
  if (config.db.runMigrationsOnStart) {
    const result = await runMigrations();
    logger.info("db_migrations_complete", {
      total: result.totalFiles,
      newlyApplied: result.newlyApplied
    });
  }

  const dbStatus = await healthCheckDatabase();
  if (dbStatus.status !== "up") {
    await sendAlertIfNeeded("database_unavailable_on_startup", dbStatus);
    throw new Error(`Database unavailable: ${dbStatus.error || "unknown error"}`);
  }

  await new Promise((resolve) => {
    server = app.listen(config.port, config.host, resolve);
  });

  startReminderWorker();

  logger.info("api_started", {
    host: config.host,
    port: config.port,
    dbHost: config.db.host,
    dbPort: config.db.port,
    dbName: config.db.database,
    cors: config.corsOrigins
  });
}

async function shutdown(signal) {
  logger.info("api_shutdown_signal", {
    signal
  });

  if (remindersTimer) {
    clearInterval(remindersTimer);
    remindersTimer = null;
  }

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await closePool();
  process.exit(0);
}

process.on("SIGINT", () => {
  shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});

startServer().catch(async (error) => {
  logger.error("api_startup_failed", {
    error: error?.message || "unknown error"
  });
  await sendAlertIfNeeded("api_startup_failed", {
    error: error?.message || "unknown error"
  });
  await closePool();
  process.exit(1);
});
