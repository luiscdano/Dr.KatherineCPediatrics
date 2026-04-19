const phoneRegex = /^[0-9+()\-\s]{7,20}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const slotRegex = /^\d{2}:\d{2}$/;

const allowedContactTopics = new Set(["agenda", "servicios", "seguimiento", "otro"]);
const allowedAppointmentTimes = new Set([
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30"
]);

export class ValidationError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = "ValidationError";
    this.details = details;
    this.status = 400;
  }
}

export function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function requireText(value, field, min, max) {
  const normalized = normalizeText(value);
  if (!normalized) {
    throw new ValidationError(`El campo ${field} es obligatorio.`);
  }
  if (normalized.length < min || normalized.length > max) {
    throw new ValidationError(`El campo ${field} debe tener entre ${min} y ${max} caracteres.`);
  }
  return normalized;
}

export function validateISODate(value, field = "date") {
  const normalized = normalizeText(value);
  if (!isoDateRegex.test(normalized)) {
    throw new ValidationError(`El campo ${field} debe usar formato YYYY-MM-DD.`);
  }
  const date = new Date(normalized + "T00:00:00Z");
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`El campo ${field} no contiene una fecha válida.`);
  }
  return normalized;
}

export function validateAppointmentPayload(payload) {
  const date = validateISODate(payload?.date, "date");
  const time = normalizeText(payload?.time);
  if (!slotRegex.test(time) || !allowedAppointmentTimes.has(time)) {
    throw new ValidationError("El campo time no contiene un horario permitido.");
  }

  const patientAge = Number(payload?.patientAge);
  if (!Number.isInteger(patientAge) || patientAge < 0 || patientAge > 18) {
    throw new ValidationError("El campo patientAge debe ser un entero entre 0 y 18.");
  }

  const parentPhone = normalizeText(payload?.parentPhone);
  if (!phoneRegex.test(parentPhone)) {
    throw new ValidationError("El campo parentPhone no tiene formato válido.");
  }

  const privacyConsent = Boolean(payload?.privacyConsent);
  if (!privacyConsent) {
    throw new ValidationError("Debes aceptar la política de privacidad.");
  }

  return {
    date,
    time,
    patientName: requireText(payload?.patientName, "patientName", 3, 80),
    patientAge,
    parentName: requireText(payload?.parentName, "parentName", 3, 80),
    parentPhone,
    reason: requireText(payload?.reason, "reason", 8, 500),
    privacyConsent,
    companyWebsite: normalizeText(payload?.companyWebsite)
  };
}

export function validateContactPayload(payload) {
  const name = requireText(payload?.name, "name", 3, 100);
  const phone = normalizeText(payload?.phone);
  const email = normalizeText(payload?.email).toLowerCase();
  const topic = normalizeText(payload?.topic || "otro").toLowerCase();
  const message = requireText(payload?.message, "message", 10, 1200);
  const privacyConsent = Boolean(payload?.privacyConsent);

  if (!phoneRegex.test(phone)) {
    throw new ValidationError("El campo phone no tiene formato válido.");
  }
  if (!emailRegex.test(email)) {
    throw new ValidationError("El campo email no tiene formato válido.");
  }
  if (!allowedContactTopics.has(topic)) {
    throw new ValidationError("El campo topic no contiene un valor permitido.");
  }
  if (!privacyConsent) {
    throw new ValidationError("Debes aceptar la política de privacidad.");
  }

  return {
    name,
    phone,
    email,
    topic,
    message,
    privacyConsent,
    companyName: normalizeText(payload?.companyName)
  };
}
