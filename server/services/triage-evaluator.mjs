const criticalWarningSigns = new Set([
  "difficulty_breathing",
  "seizure",
  "persistent_vomiting",
  "dehydration_signs",
  "uncontrolled_bleeding",
  "loss_of_consciousness",
  "severe_head_trauma",
  "stiff_neck",
  "purple_rash"
]);

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeWarningSigns(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => cleanText(item).toLowerCase())
    .filter(Boolean);
}

function buildReasonList(parts) {
  return parts.filter(Boolean).join(" ").trim();
}

export function evaluateClinicalUrgency(input) {
  const patientAge = Number(input.patientAge || 0);
  const feverCelsius = input.feverCelsius == null || input.feverCelsius === "" ? null : Number(input.feverCelsius);
  const painLevel = Number.isFinite(Number(input.painLevel)) ? Number(input.painLevel) : 0;
  const durationHours = Number.isFinite(Number(input.durationHours)) ? Number(input.durationHours) : 0;
  const warningSigns = normalizeWarningSigns(input.warningSigns);

  let score = 0;
  const reasons = [];

  const hasCriticalWarningSign = warningSigns.some((item) => criticalWarningSigns.has(item));
  if (hasCriticalWarningSign) {
    score += 70;
    reasons.push("Se detectaron señales de alarma mayor.");
  }

  if (feverCelsius != null) {
    if (feverCelsius >= 40) {
      score += 35;
      reasons.push("Fiebre alta (>= 40°C).");
    } else if (feverCelsius >= 39) {
      score += 24;
      reasons.push("Fiebre moderada-alta.");
    } else if (feverCelsius >= 38) {
      score += 12;
      reasons.push("Fiebre presente.");
    }

    if (patientAge <= 1 && feverCelsius >= 38) {
      score += 30;
      reasons.push("Edad menor a 1 año con fiebre.");
    }
  }

  if (painLevel >= 8) {
    score += 25;
    reasons.push("Dolor intenso reportado.");
  } else if (painLevel >= 5) {
    score += 12;
    reasons.push("Dolor moderado.");
  }

  if (durationHours >= 72) {
    score += 14;
    reasons.push("Síntomas por más de 72 horas.");
  } else if (durationHours >= 24) {
    score += 6;
    reasons.push("Síntomas por más de 24 horas.");
  }

  if (warningSigns.length >= 3) {
    score += 12;
    reasons.push("Múltiples señales de alerta reportadas.");
  }

  let urgencyLevel = "low";
  let recommendedChannel = "home_monitor";
  let advisory = "Monitoreo en casa con seguimiento y orientación pediátrica.";

  if (hasCriticalWarningSign || score >= 70) {
    urgencyLevel = "critical";
    recommendedChannel = "emergency";
    advisory = "Dirigirse a emergencias pediátricas de inmediato. Este canal no reemplaza atención urgente.";
  } else if (score >= 45) {
    urgencyLevel = "high";
    recommendedChannel = "same_day_visit";
    advisory = "Prioridad alta: se recomienda evaluación pediátrica el mismo día.";
  } else if (score >= 24) {
    urgencyLevel = "medium";
    recommendedChannel = "priority_visit";
    advisory = "Recomendamos consulta pediátrica prioritaria en las próximas 24 horas.";
  }

  const urgencyReason = buildReasonList(reasons) || "Caso sin señales de alto riesgo en el pre-triage inicial.";

  return {
    urgencyLevel,
    urgencyScore: score,
    urgencyReason,
    recommendedChannel,
    advisory,
    normalizedWarningSigns: warningSigns
  };
}
