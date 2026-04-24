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

const allowedResourceKeys = new Set([
  "fiebre-24h-kit",
  "alimentacion-etapas-kit",
  "vacunas-checklist-kit",
  "botiquin-hogar-kit"
]);

const allowedAgeGroups = new Set(["0-12m", "1-3a", "4-6a", "7-12a", "13-17a"]);

const allowedWarningSigns = new Set([
  "difficulty_breathing",
  "persistent_vomiting",
  "dehydration_signs",
  "seizure",
  "purple_rash",
  "stiff_neck",
  "high_fever_persistent",
  "uncontrolled_bleeding",
  "loss_of_consciousness",
  "severe_head_trauma",
  "lethargy",
  "severe_pain"
]);

const allowedPhotoMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

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

function normalizeOptionalText(value, maxLength) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return "";
  }

  if (normalized.length > maxLength) {
    throw new ValidationError(`El texto excede el máximo permitido (${maxLength} caracteres).`);
  }

  return normalized;
}

function validatePhone(value, field) {
  const phone = normalizeText(value);
  if (!phoneRegex.test(phone)) {
    throw new ValidationError(`El campo ${field} no tiene formato válido.`);
  }
  return phone;
}

function validateEmail(value, field) {
  const email = normalizeText(value).toLowerCase();
  if (!emailRegex.test(email)) {
    throw new ValidationError(`El campo ${field} no tiene formato válido.`);
  }
  return email;
}

function parseIntegerInRange(value, field, min, max) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new ValidationError(`El campo ${field} debe ser un entero entre ${min} y ${max}.`);
  }
  return parsed;
}

function parseOptionalDecimalInRange(value, field, min, max) {
  if (value == null || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new ValidationError(`El campo ${field} debe estar entre ${min} y ${max}.`);
  }

  return Number(parsed.toFixed(1));
}

function parseWarningSigns(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const unique = new Set();
  value.forEach((entry) => {
    const normalized = normalizeText(entry).toLowerCase();
    if (!normalized) {
      return;
    }
    if (!allowedWarningSigns.has(normalized)) {
      throw new ValidationError("Se recibió un warningSign no permitido.");
    }
    unique.add(normalized);
  });

  return [...unique].slice(0, 10);
}

function parseBase64Photo(photo, index) {
  if (!photo || typeof photo !== "object") {
    throw new ValidationError(`La foto #${index + 1} no tiene formato válido.`);
  }

  const originalName = requireText(photo.originalName || photo.name, `photos[${index}].originalName`, 1, 120);
  const mimeType = normalizeText(photo.mimeType).toLowerCase();
  if (!allowedPhotoMimeTypes.has(mimeType)) {
    throw new ValidationError(`El tipo de imagen en photos[${index}] no está permitido.`);
  }

  const rawData = normalizeText(photo.dataBase64);
  if (!rawData) {
    throw new ValidationError(`La foto #${index + 1} no contiene datos.`);
  }

  const cleanedBase64 = rawData
    .replace(/^data:[^;]+;base64,/i, "")
    .replace(/\s+/g, "");

  if (!/^[A-Za-z0-9+/=]+$/.test(cleanedBase64)) {
    throw new ValidationError(`La foto #${index + 1} no usa base64 válido.`);
  }

  const buffer = Buffer.from(cleanedBase64, "base64");
  if (!buffer.length) {
    throw new ValidationError(`La foto #${index + 1} está vacía.`);
  }
  if (buffer.length > 4 * 1024 * 1024) {
    throw new ValidationError(`La foto #${index + 1} supera 4MB.`);
  }

  return {
    originalName,
    mimeType,
    fileSizeBytes: buffer.length,
    dataBase64: cleanedBase64
  };
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

export function validatePreVisitPayload(payload) {
  const privacyConsent = Boolean(payload?.privacyConsent);
  if (!privacyConsent) {
    throw new ValidationError("Debes aceptar la política de privacidad para usar el pre-triage.");
  }

  return {
    patientName: requireText(payload?.patientName, "patientName", 3, 90),
    patientAge: parseIntegerInRange(payload?.patientAge, "patientAge", 0, 18),
    guardianName: requireText(payload?.guardianName, "guardianName", 3, 90),
    guardianPhone: validatePhone(payload?.guardianPhone, "guardianPhone"),
    primaryReason: requireText(payload?.primaryReason, "primaryReason", 6, 240),
    symptoms: requireText(payload?.symptoms, "symptoms", 12, 1800),
    feverCelsius: parseOptionalDecimalInRange(payload?.feverCelsius, "feverCelsius", 34, 43),
    painLevel: parseIntegerInRange(payload?.painLevel ?? 0, "painLevel", 0, 10),
    durationHours: parseIntegerInRange(payload?.durationHours ?? 0, "durationHours", 0, 720),
    allergies: normalizeOptionalText(payload?.allergies, 500),
    medications: normalizeOptionalText(payload?.medications, 500),
    privacyConsent,
    companyWebsite: normalizeText(payload?.companyWebsite)
  };
}

export function validateResourceDownloadPayload(payload) {
  const privacyConsent = Boolean(payload?.privacyConsent);
  if (!privacyConsent) {
    throw new ValidationError("Debes aceptar la política de privacidad para descargar el recurso.");
  }

  const resourceKey = normalizeText(payload?.resourceKey).toLowerCase();
  if (!allowedResourceKeys.has(resourceKey)) {
    throw new ValidationError("resourceKey no contiene un valor permitido.");
  }

  const childAgeGroup = normalizeText(payload?.childAgeGroup).toLowerCase();
  if (!allowedAgeGroups.has(childAgeGroup)) {
    throw new ValidationError("childAgeGroup no contiene un valor permitido.");
  }

  return {
    resourceKey,
    parentName: requireText(payload?.parentName, "parentName", 3, 100),
    parentEmail: validateEmail(payload?.parentEmail, "parentEmail"),
    childAgeGroup,
    privacyConsent,
    companyWebsite: normalizeText(payload?.companyWebsite)
  };
}

export function validateTriageCasePayload(payload) {
  const privacyConsent = Boolean(payload?.privacyConsent);
  if (!privacyConsent) {
    throw new ValidationError("Debes aceptar la política de privacidad para enviar este caso.");
  }

  const hasAllergies = Boolean(payload?.hasAllergies);
  const warningSigns = parseWarningSigns(payload?.warningSigns);
  const photos = Array.isArray(payload?.photos) ? payload.photos : [];
  if (photos.length > 4) {
    throw new ValidationError("Puedes subir hasta 4 imágenes por caso.");
  }

  return {
    patientName: requireText(payload?.patientName, "patientName", 3, 90),
    patientAge: parseIntegerInRange(payload?.patientAge, "patientAge", 0, 18),
    guardianName: requireText(payload?.guardianName, "guardianName", 3, 90),
    guardianPhone: validatePhone(payload?.guardianPhone, "guardianPhone"),
    guardianEmail: normalizeText(payload?.guardianEmail) ? validateEmail(payload?.guardianEmail, "guardianEmail") : "",
    title: requireText(payload?.title, "title", 6, 120),
    description: requireText(payload?.description, "description", 20, 2200),
    feverCelsius: parseOptionalDecimalInRange(payload?.feverCelsius, "feverCelsius", 34, 43),
    painLevel: parseIntegerInRange(payload?.painLevel ?? 0, "painLevel", 0, 10),
    durationHours: parseIntegerInRange(payload?.durationHours ?? 0, "durationHours", 0, 720),
    hasAllergies,
    allergyDetails: hasAllergies ? requireText(payload?.allergyDetails, "allergyDetails", 3, 500) : "",
    warningSigns,
    photos: photos.map(parseBase64Photo),
    privacyConsent,
    companyWebsite: normalizeText(payload?.companyWebsite)
  };
}
