import { query } from "../db/client.mjs";

function mapRow(row) {
  return {
    id: row.id,
    patientName: row.patient_name,
    patientAge: row.patient_age,
    guardianName: row.guardian_name,
    guardianPhone: row.guardian_phone,
    primaryReason: row.primary_reason,
    symptoms: row.symptoms,
    feverCelsius: row.fever_celsius == null ? null : Number(row.fever_celsius),
    painLevel: row.pain_level,
    durationHours: row.duration_hours,
    allergies: row.allergies || "",
    medications: row.medications || "",
    urgencyLevel: row.urgency_level,
    triageSummary: row.triage_summary,
    recommendedChannel: row.recommended_channel,
    source: row.source,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
  };
}

export async function createPreVisitAssessment(input) {
  const result = await query(
    `
      INSERT INTO pre_visit_assessments (
        id,
        patient_name,
        patient_age,
        guardian_name,
        guardian_phone,
        primary_reason,
        symptoms,
        fever_celsius,
        pain_level,
        duration_hours,
        allergies,
        medications,
        urgency_level,
        triage_summary,
        recommended_channel,
        source,
        created_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17
      )
      RETURNING *
    `,
    [
      input.id,
      input.patientName,
      input.patientAge,
      input.guardianName,
      input.guardianPhone,
      input.primaryReason,
      input.symptoms,
      input.feverCelsius,
      input.painLevel,
      input.durationHours,
      input.allergies || null,
      input.medications || null,
      input.urgencyLevel,
      input.triageSummary,
      input.recommendedChannel,
      input.source || "website",
      input.createdAt
    ]
  );

  return mapRow(result.rows[0]);
}

export async function listPreVisitAssessments(filters = {}) {
  const clauses = [];
  const params = [];

  if (filters.urgencyLevel) {
    params.push(filters.urgencyLevel);
    clauses.push(`urgency_level = $${params.length}`);
  }

  if (filters.guardianPhone) {
    params.push(filters.guardianPhone);
    clauses.push(`guardian_phone = $${params.length}`);
  }

  const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = Number(filters.limit) > 0 ? Math.min(Number(filters.limit), 200) : 100;
  params.push(limit);

  const result = await query(
    `
      SELECT *
      FROM pre_visit_assessments
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length}
    `,
    params
  );

  return result.rows.map(mapRow);
}
