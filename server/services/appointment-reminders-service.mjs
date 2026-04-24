import { randomUUID } from "node:crypto";
import {
  cancelPendingRemindersByAppointment,
  listDueReminders,
  updateReminderDeliveryState,
  upsertAppointmentReminder
} from "../repositories/whatsapp-reminders-repository.mjs";
import { sendWhatsAppAutomationMessage } from "../whatsapp-notifier.mjs";

const reminderTypePriority = {
  confirmation: 1,
  reminder_24h: 2,
  reminder_2h: 3,
  no_show_recovery: 4
};

function normalizePhone(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  let normalized = raw.replace(/[^\d+]/g, "");
  if (normalized.startsWith("00")) {
    normalized = `+${normalized.slice(2)}`;
  }

  if (normalized.startsWith("+")) {
    return `+${normalized.slice(1).replace(/\D/g, "")}`;
  }

  return normalized.replace(/\D/g, "");
}

function toDateTime(dateValue, timeValue, fallbackMinutes = 0) {
  if (!dateValue || !timeValue) {
    return new Date(Date.now() + fallbackMinutes * 60_000);
  }

  const base = new Date(`${dateValue}T${timeValue}:00`);
  if (Number.isNaN(base.getTime())) {
    return new Date(Date.now() + fallbackMinutes * 60_000);
  }
  return base;
}

function formatReminderMessage(reminderType, appointment) {
  const patient = String(appointment.patientName || "paciente").trim();
  const date = String(appointment.date || "").trim();
  const time = String(appointment.time || "").trim();

  if (reminderType === "confirmation") {
    return [
      "Dr. Katherine C Pediatrics",
      `Recibimos la solicitud de cita para ${patient}.`,
      `Fecha: ${date} | Hora: ${time}.`,
      "Te estaremos confirmando por esta misma vía."
    ].join("\n");
  }

  if (reminderType === "reminder_24h") {
    return [
      "Recordatorio de cita pediátrica",
      `Paciente: ${patient}`,
      `Mañana: ${date} a las ${time}`,
      "Si necesitas reprogramar, responde a este mensaje o contáctanos por WhatsApp."
    ].join("\n");
  }

  if (reminderType === "reminder_2h") {
    return [
      "Recordatorio cercano de cita",
      `Paciente: ${patient}`,
      `Hoy a las ${time}`,
      "Te esperamos en el consultorio."
    ].join("\n");
  }

  return [
    "Seguimiento de cita no asistida",
    `Notamos que no fue posible completar la cita de ${patient}.`,
    "Si deseas, podemos ayudarte a reagendar en un horario conveniente."
  ].join("\n");
}

function buildDefaultReminderPlan(appointment) {
  const appointmentAt = toDateTime(appointment.date, appointment.time, 10);
  const now = Date.now();

  const entries = [
    {
      reminderType: "confirmation",
      scheduledFor: new Date(now + 60_000)
    },
    {
      reminderType: "reminder_24h",
      scheduledFor: new Date(appointmentAt.getTime() - 24 * 60 * 60 * 1000)
    },
    {
      reminderType: "reminder_2h",
      scheduledFor: new Date(appointmentAt.getTime() - 2 * 60 * 60 * 1000)
    }
  ];

  return entries.filter((entry) => entry.scheduledFor.getTime() >= now - 5 * 60 * 1000);
}

export async function scheduleAppointmentReminders(appointment) {
  const targetPhone = normalizePhone(appointment.parentPhone);
  if (!targetPhone) {
    return [];
  }

  const schedule = buildDefaultReminderPlan(appointment);
  const created = [];

  for (const item of schedule) {
    const reminder = await upsertAppointmentReminder({
      id: randomUUID(),
      appointmentId: appointment.id,
      targetPhone,
      reminderType: item.reminderType,
      scheduledFor: item.scheduledFor.toISOString(),
      status: "pending",
      payload: {
        date: appointment.date,
        time: appointment.time,
        patientName: appointment.patientName
      },
      createdAt: new Date().toISOString()
    });

    created.push(reminder);
  }

  return created;
}

export async function scheduleNoShowRecoveryReminder(appointment) {
  const targetPhone = normalizePhone(appointment.parentPhone);
  if (!targetPhone) {
    return null;
  }

  return upsertAppointmentReminder({
    id: randomUUID(),
    appointmentId: appointment.id,
    targetPhone,
    reminderType: "no_show_recovery",
    scheduledFor: new Date(Date.now() + 5 * 60_000).toISOString(),
    status: "pending",
    payload: {
      date: appointment.date,
      time: appointment.time,
      patientName: appointment.patientName
    },
    createdAt: new Date().toISOString()
  });
}

export async function cancelAppointmentReminders(appointmentId) {
  await cancelPendingRemindersByAppointment(appointmentId);
}

export async function processDueAppointmentReminders({ logger, maxBatch = 20 } = {}) {
  const jobs = await listDueReminders(maxBatch);
  if (!jobs.length) {
    return {
      queued: 0,
      sent: 0,
      failed: 0,
      skipped: 0
    };
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  jobs.sort((a, b) => {
    const left = reminderTypePriority[a.reminder.reminderType] || 99;
    const right = reminderTypePriority[b.reminder.reminderType] || 99;
    return left - right;
  });

  for (const job of jobs) {
    const reminder = job.reminder;
    const appointment = job.appointment;

    if (["cancelled", "completed"].includes(String(appointment.status || "").toLowerCase())) {
      await updateReminderDeliveryState(reminder.id, {
        status: "skipped",
        attemptIncrement: 0,
        lastError: "appointment_not_pending"
      });
      skipped += 1;
      continue;
    }

    const message = formatReminderMessage(reminder.reminderType, appointment);

    try {
      await sendWhatsAppAutomationMessage(reminder.targetPhone, message, `reminder_${reminder.reminderType}`);
      await updateReminderDeliveryState(reminder.id, {
        status: "sent",
        attemptIncrement: 1,
        lastError: null
      });
      sent += 1;
    } catch (error) {
      const attempts = Number(reminder.attempts || 0) + 1;
      const status = attempts >= 3 ? "failed" : "pending";
      await updateReminderDeliveryState(reminder.id, {
        status,
        attemptIncrement: 1,
        lastError: error?.message || "send_error"
      });
      failed += 1;
      if (logger) {
        logger.error("whatsapp_reminder_failed", {
          reminderId: reminder.id,
          reminderType: reminder.reminderType,
          error: error?.message || "unknown error"
        });
      }
    }
  }

  return {
    queued: jobs.length,
    sent,
    failed,
    skipped
  };
}
