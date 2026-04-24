import config from "./config.mjs";

export function isWhatsAppAutomationConfigured() {
  const automation = config.whatsappAutomation;
  return (
    automation.enabled &&
    Boolean(automation.backendBaseUrl) &&
    Boolean(automation.backendApiKey) &&
    Boolean(automation.clinicRecipient)
  );
}

function normalizePhone(value) {
  const input = String(value || "").trim();
  if (!input) {
    return "";
  }

  let normalized = input.replace(/[^\d+]/g, "");
  if (normalized.startsWith("00")) {
    normalized = `+${normalized.slice(2)}`;
  }
  if (!normalized.startsWith("+")) {
    normalized = normalized.replace(/\D/g, "");
  } else {
    normalized = `+${normalized.slice(1).replace(/\D/g, "")}`;
  }
  return normalized;
}

function truncate(value, maxLength = 220) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 3)}...`;
}

function topicToLabel(topic) {
  const normalized = String(topic || "").trim().toLowerCase();
  const labels = {
    agenda: "Agenda",
    servicios: "Servicios",
    seguimiento: "Seguimiento",
    otro: "Otro"
  };
  return labels[normalized] || "Otro";
}

export async function sendWhatsAppAutomationMessage(to, message, contextLabel = "generic") {
  const timeout = Number(config.whatsappAutomation.requestTimeoutMs) || 6000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const endpoint = `${config.whatsappAutomation.backendBaseUrl}/api/messages`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-api-key": config.whatsappAutomation.backendApiKey
      },
      body: JSON.stringify({ to, message }),
      signal: controller.signal
    });

    const raw = await response.text();
    let payload;
    try {
      payload = raw ? JSON.parse(raw) : null;
    } catch {
      payload = raw;
    }

    if (!response.ok) {
      const details = typeof payload === "string" ? payload : JSON.stringify(payload);
      throw new Error(`${contextLabel} rejected by whatsapp-backend (${response.status}): ${details}`);
    }

    return payload;
  } finally {
    clearTimeout(timer);
  }
}

function formatAppointmentMessage(appointment) {
  return [
    "Nueva cita desde la web",
    `ID: ${appointment.id}`,
    `Fecha: ${appointment.date}`,
    `Hora: ${appointment.time}`,
    `Paciente: ${truncate(appointment.patientName, 80)} (${appointment.patientAge} años)`,
    `Tutor: ${truncate(appointment.parentName, 80)}`,
    `Teléfono: ${appointment.parentPhone}`,
    `Motivo: ${truncate(appointment.reason, 280)}`
  ].join("\n");
}

function formatParentAcknowledgement(appointment) {
  return [
    "Hola, gracias por agendar con Dr. Katherine Cedano.",
    `Recibimos tu solicitud para ${appointment.date} a las ${appointment.time}.`,
    "Te confirmaremos por esta misma vía."
  ].join(" ");
}

function formatContactMessage(messageRecord) {
  return [
    "Nuevo mensaje de contacto desde la web",
    `ID: ${messageRecord.id}`,
    `Nombre: ${truncate(messageRecord.name, 100)}`,
    `Teléfono: ${messageRecord.phone}`,
    `Correo: ${truncate(messageRecord.email, 120)}`,
    `Tema: ${topicToLabel(messageRecord.topic)}`,
    `Mensaje: ${truncate(messageRecord.message, 320)}`
  ].join("\n");
}

function formatPreVisitMessage(assessment) {
  return [
    "Nuevo pre-triage antes de cita",
    `ID: ${assessment.id}`,
    `Paciente: ${truncate(assessment.patientName, 80)} (${assessment.patientAge} años)`,
    `Tutor: ${truncate(assessment.guardianName, 80)} - ${assessment.guardianPhone}`,
    `Motivo: ${truncate(assessment.primaryReason, 180)}`,
    `Urgencia: ${assessment.urgencyLevel}`,
    `Recomendación: ${assessment.recommendedChannel}`
  ].join("\n");
}

function formatTriageCaseMessage(triageCase) {
  return [
    "Nuevo caso - Una prioridad",
    `ID: ${triageCase.id}`,
    `Paciente: ${truncate(triageCase.patientName, 80)} (${triageCase.patientAge} años)`,
    `Tutor: ${truncate(triageCase.guardianName, 80)} - ${triageCase.guardianPhone}`,
    `Título: ${truncate(triageCase.title, 120)}`,
    `Urgencia: ${triageCase.urgencyLevel} (score ${triageCase.urgencyScore})`,
    `Resumen: ${truncate(triageCase.urgencyReason, 240)}`
  ].join("\n");
}

export async function notifyAppointmentCreated(appointment) {
  if (!isWhatsAppAutomationConfigured()) {
    return { sent: false, reason: "disabled_or_missing_configuration" };
  }

  const clinicRecipient = normalizePhone(config.whatsappAutomation.clinicRecipient);
  if (!clinicRecipient) {
    return { sent: false, reason: "invalid_clinic_recipient" };
  }

  await sendWhatsAppAutomationMessage(
    clinicRecipient,
    formatAppointmentMessage(appointment),
    "appointment_admin_notification"
  );

  if (config.whatsappAutomation.notifyParentOnAppointment) {
    const parentRecipient = normalizePhone(appointment.parentPhone);
    if (parentRecipient) {
      await sendWhatsAppAutomationMessage(
        parentRecipient,
        formatParentAcknowledgement(appointment),
        "appointment_parent_notification"
      );
    }
  }

  return { sent: true };
}

export async function notifyContactMessageCreated(messageRecord) {
  if (!isWhatsAppAutomationConfigured()) {
    return { sent: false, reason: "disabled_or_missing_configuration" };
  }

  const clinicRecipient = normalizePhone(config.whatsappAutomation.clinicRecipient);
  if (!clinicRecipient) {
    return { sent: false, reason: "invalid_clinic_recipient" };
  }

  await sendWhatsAppAutomationMessage(
    clinicRecipient,
    formatContactMessage(messageRecord),
    "contact_admin_notification"
  );
  return { sent: true };
}

export async function notifyPreVisitAssessmentCreated(assessment) {
  if (!isWhatsAppAutomationConfigured()) {
    return { sent: false, reason: "disabled_or_missing_configuration" };
  }

  const clinicRecipient = normalizePhone(config.whatsappAutomation.clinicRecipient);
  if (!clinicRecipient) {
    return { sent: false, reason: "invalid_clinic_recipient" };
  }

  await sendWhatsAppAutomationMessage(
    clinicRecipient,
    formatPreVisitMessage(assessment),
    "pre_visit_notification"
  );
  return { sent: true };
}

export async function notifyTriageCaseCreated(triageCase) {
  if (!isWhatsAppAutomationConfigured()) {
    return { sent: false, reason: "disabled_or_missing_configuration" };
  }

  const clinicRecipient = normalizePhone(config.whatsappAutomation.clinicRecipient);
  if (!clinicRecipient) {
    return { sent: false, reason: "invalid_clinic_recipient" };
  }

  await sendWhatsAppAutomationMessage(
    clinicRecipient,
    formatTriageCaseMessage(triageCase),
    "triage_case_notification"
  );
  return { sent: true };
}
