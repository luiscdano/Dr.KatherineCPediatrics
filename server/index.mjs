import { randomUUID } from "node:crypto";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import config from "./config.mjs";
import { readStore, updateStore } from "./store.mjs";
import { notifyAppointmentCreated, notifyContactMessageCreated } from "./whatsapp-notifier.mjs";
import { ValidationError, normalizeText, validateAppointmentPayload, validateContactPayload, validateISODate } from "./validation.mjs";

const app = express();
const appointmentBusyStatuses = new Set(["pending", "confirmed", "completed"]);
const appointmentUpdatableStatuses = new Set(["pending", "confirmed", "completed", "cancelled", "no_show"]);

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

app.get("/api/v1/health", (req, res) => {
  sendJson(res, 200, {
    ok: true,
    data: {
      service: "dr-katherine-api",
      status: "up",
      timestamp: new Date().toISOString()
    }
  });
});

app.get("/api/v1/appointments/taken", async (req, res, next) => {
  try {
    const date = validateISODate(req.query.date, "date");
    const store = await readStore();
    const timesTaken = [...new Set(
      store.appointments
        .filter((item) => item.date === date && appointmentBusyStatuses.has(String(item.status || "").trim()))
        .map((item) => item.time)
    )];

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

    let createdAppointment = null;
    await updateStore((store) => {
      const hasConflict = store.appointments.some(
        (item) =>
          item.date === payload.date &&
          item.time === payload.time &&
          appointmentBusyStatuses.has(String(item.status || "").trim())
      );

      if (hasConflict) {
        const conflictError = new Error("El horario seleccionado ya está ocupado.");
        conflictError.status = 409;
        throw conflictError;
      }

      createdAppointment = {
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
      };

      store.appointments.unshift(createdAppointment);
      return store;
    });

    if (createdAppointment) {
      runBackgroundTask(
        notifyAppointmentCreated(createdAppointment),
        `notifyAppointmentCreated requestId=${req.requestId}`
      );
    }

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

    const messageRecord = {
      id: randomUUID(),
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      topic: payload.topic,
      message: payload.message,
      source: "website",
      createdAt: new Date().toISOString()
    };

    await updateStore((store) => {
      store.contactMessages.unshift(messageRecord);
      return store;
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

    const store = await readStore();
    const items = store.appointments.filter((item) => {
      if (status && String(item.status || "").trim() !== status) {
        return false;
      }
      if (date && item.date !== date) {
        return false;
      }
      return true;
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

    let updated = null;
    await updateStore((store) => {
      const target = store.appointments.find((item) => item.id === id);
      if (!target) {
        const notFoundError = new Error("No se encontró la cita solicitada.");
        notFoundError.status = 404;
        throw notFoundError;
      }
      target.status = status;
      target.updatedAt = new Date().toISOString();
      updated = target;
      return store;
    });

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

app.get("/api/v1/admin/contact-messages", ensureAdminKey, async (req, res, next) => {
  try {
    const store = await readStore();
    sendJson(res, 200, {
      ok: true,
      data: {
        count: store.contactMessages.length,
        messages: store.contactMessages
      }
    });
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

readStore()
  .then(() => {
    app.listen(config.port, config.host, () => {
      // eslint-disable-next-line no-console
      console.log(
        `[api] running on http://${config.host}:${config.port} | data=${config.dataFile} | cors=${config.corsOrigins.join(",")}`
      );
    });
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("[api] failed to initialize data store", error);
    process.exit(1);
  });
