import { randomUUID } from "node:crypto";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import config from "./config.mjs";
import { closePool, healthCheckDatabase } from "./db/client.mjs";
import { runMigrations } from "./db/migrator.mjs";
import {
  createAppointment,
  listAppointments,
  listTakenTimesByDate,
  updateAppointmentStatus
} from "./repositories/appointments-repository.mjs";
import { createContactMessage, listContactMessages } from "./repositories/contact-messages-repository.mjs";
import { getDashboardMetrics, getDashboardTimeSeries } from "./repositories/metrics-repository.mjs";
import { notifyAppointmentCreated, notifyContactMessageCreated } from "./whatsapp-notifier.mjs";
import { ValidationError, normalizeText, validateAppointmentPayload, validateContactPayload, validateISODate } from "./validation.mjs";

const app = express();
const appointmentUpdatableStatuses = new Set(["pending", "confirmed", "completed", "cancelled", "no_show"]);
let server;

app.disable("x-powered-by");

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
    allowedHeaders: ["Content-Type", "x-admin-key"],
    credentials: false
  })
);

app.use(helmet());
app.use(express.json({ limit: config.maxBodySize }));

app.use((req, res, next) => {
  req.requestId = randomUUID();
  res.setHeader("x-request-id", req.requestId);
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

function sendJson(res, statusCode, payload) {
  res.status(statusCode).json(payload);
}

function runBackgroundTask(taskPromise, label) {
  taskPromise.catch((error) => {
    // eslint-disable-next-line no-console
    console.error(`[api] background task failed (${label})`, {
      message: error?.message || "unknown error"
    });
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

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

function ensureAdminKey(req, res, next) {
  if (!config.adminApiKey) {
    sendJson(res, 503, {
      ok: false,
      error: "ADMIN_API_KEY no está configurado en el servidor.",
      requestId: req.requestId
    });
    return;
  }

  const provided = normalizeText(req.get("x-admin-key"));
  if (!provided || provided !== config.adminApiKey) {
    sendJson(res, 401, {
      ok: false,
      error: "No autorizado.",
      requestId: req.requestId
    });
    return;
  }

  next();
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

app.get("/api/v1/admin/appointments", ensureAdminKey, async (req, res, next) => {
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

app.patch("/api/v1/admin/appointments/:id/status", ensureAdminKey, async (req, res, next) => {
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

app.get("/api/v1/admin/contact-messages", ensureAdminKey, async (_req, res, next) => {
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

app.get("/api/v1/admin/metrics", ensureAdminKey, async (req, res, next) => {
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

app.get("/api/v1/admin/metrics/timeseries", ensureAdminKey, async (req, res, next) => {
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

app.get("/api/v1/admin/metrics/export.csv", ensureAdminKey, async (req, res, next) => {
  try {
    const range = parseMetricsRange(req.query || {});
    const series = await getDashboardTimeSeries(range);
    const headers = ["day", "appointments", "contacts", "confirmed", "cancelled", "no_show"];
    const rows = [headers.join(",")];

    for (const item of series) {
      rows.push(
        [
          csvEscape(item.day),
          csvEscape(item.appointments),
          csvEscape(item.contacts),
          csvEscape(item.confirmed),
          csvEscape(item.cancelled),
          csvEscape(item.noShow)
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
  sendJson(res, status, {
    ok: false,
    error: message,
    requestId: req.requestId
  });
});

async function startServer() {
  if (config.db.runMigrationsOnStart) {
    const result = await runMigrations();
    // eslint-disable-next-line no-console
    console.log(`[api] db migrations complete | total=${result.totalFiles} newlyApplied=${result.newlyApplied}`);
  }

  const dbStatus = await healthCheckDatabase();
  if (dbStatus.status !== "up") {
    throw new Error(`Database unavailable: ${dbStatus.error || "unknown error"}`);
  }

  await new Promise((resolve) => {
    server = app.listen(config.port, config.host, resolve);
  });

  // eslint-disable-next-line no-console
  console.log(
    `[api] running on http://${config.host}:${config.port} | db=${config.db.host}:${config.db.port}/${config.db.database} | cors=${config.corsOrigins.join(",")}`
  );
}

async function shutdown(signal) {
  // eslint-disable-next-line no-console
  console.log(`[api] shutdown signal received: ${signal}`);

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
  // eslint-disable-next-line no-console
  console.error("[api] failed to initialize server", error);
  await closePool();
  process.exit(1);
});
