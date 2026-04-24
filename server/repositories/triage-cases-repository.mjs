import { query, withClient } from "../db/client.mjs";

function toIsoDateTime(value) {
  if (!value) {
    return null;
  }
  return value instanceof Date ? value.toISOString() : String(value);
}

function mapCaseRow(row) {
  return {
    id: row.id,
    patientName: row.patient_name,
    patientAge: row.patient_age,
    guardianName: row.guardian_name,
    guardianPhone: row.guardian_phone,
    guardianEmail: row.guardian_email || "",
    title: row.title,
    description: row.description,
    feverCelsius: row.fever_celsius == null ? null : Number(row.fever_celsius),
    painLevel: row.pain_level,
    durationHours: row.duration_hours,
    hasAllergies: Boolean(row.has_allergies),
    allergyDetails: row.allergy_details || "",
    warningSigns: Array.isArray(row.warning_signs) ? row.warning_signs : [],
    urgencyLevel: row.urgency_level,
    urgencyScore: row.urgency_score,
    urgencyReason: row.urgency_reason,
    status: row.status,
    doctorResponseTemplate: row.doctor_response_template || "",
    doctorResponseNote: row.doctor_response_note || "",
    followUpAt: toIsoDateTime(row.follow_up_at),
    source: row.source,
    createdAt: toIsoDateTime(row.created_at),
    updatedAt: toIsoDateTime(row.updated_at)
  };
}

function mapAssetRow(row) {
  return {
    id: row.id,
    caseId: row.case_id,
    originalName: row.original_name,
    mimeType: row.mime_type,
    fileSizeBytes: row.file_size_bytes,
    dataBase64: row.data_base64,
    createdAt: toIsoDateTime(row.created_at)
  };
}

function mapEventRow(row) {
  return {
    id: row.id,
    caseId: row.case_id,
    eventType: row.event_type,
    previousStatus: row.previous_status || null,
    nextStatus: row.next_status || null,
    actor: row.actor,
    payload: row.payload || {},
    createdAt: toIsoDateTime(row.created_at)
  };
}

async function insertCaseEvent(client, payload) {
  await client.query(
    `
      INSERT INTO rapid_triage_case_events (
        case_id,
        event_type,
        previous_status,
        next_status,
        actor,
        payload,
        created_at
      ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7)
    `,
    [
      payload.caseId,
      payload.eventType,
      payload.previousStatus || null,
      payload.nextStatus || null,
      payload.actor || "system",
      JSON.stringify(payload.payload || {}),
      payload.createdAt || new Date().toISOString()
    ]
  );
}

export async function createTriageCase(input) {
  return withClient(async (client) => {
    await client.query("BEGIN");

    try {
      const caseResult = await client.query(
        `
          INSERT INTO rapid_triage_cases (
            id,
            patient_name,
            patient_age,
            guardian_name,
            guardian_phone,
            guardian_email,
            title,
            description,
            fever_celsius,
            pain_level,
            duration_hours,
            has_allergies,
            allergy_details,
            warning_signs,
            urgency_level,
            urgency_score,
            urgency_reason,
            status,
            source,
            created_at,
            updated_at
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::text[],$15,$16,$17,$18,$19,$20,NULL
          )
          RETURNING *
        `,
        [
          input.id,
          input.patientName,
          input.patientAge,
          input.guardianName,
          input.guardianPhone,
          input.guardianEmail || null,
          input.title,
          input.description,
          input.feverCelsius,
          input.painLevel,
          input.durationHours,
          input.hasAllergies,
          input.allergyDetails || null,
          input.warningSigns || [],
          input.urgencyLevel,
          input.urgencyScore,
          input.urgencyReason,
          input.status || "new",
          input.source || "website",
          input.createdAt
        ]
      );

      if (Array.isArray(input.assets) && input.assets.length) {
        for (const asset of input.assets) {
          await client.query(
            `
              INSERT INTO rapid_triage_case_assets (
                id,
                case_id,
                original_name,
                mime_type,
                file_size_bytes,
                data_base64,
                created_at
              ) VALUES ($1,$2,$3,$4,$5,$6,$7)
            `,
            [
              asset.id,
              input.id,
              asset.originalName,
              asset.mimeType,
              asset.fileSizeBytes,
              asset.dataBase64,
              input.createdAt
            ]
          );
        }
      }

      await insertCaseEvent(client, {
        caseId: input.id,
        eventType: "created",
        previousStatus: null,
        nextStatus: input.status || "new",
        actor: "website",
        payload: {
          urgencyLevel: input.urgencyLevel,
          urgencyScore: input.urgencyScore,
          assetCount: Array.isArray(input.assets) ? input.assets.length : 0
        },
        createdAt: input.createdAt
      });

      await client.query("COMMIT");
      return mapCaseRow(caseResult.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
}

export async function listTriageCases(filters = {}) {
  const clauses = [];
  const params = [];

  if (filters.status) {
    if (Array.isArray(filters.status)) {
      params.push(filters.status);
      clauses.push(`c.status = ANY($${params.length}::text[])`);
    } else {
      params.push(filters.status);
      clauses.push(`c.status = $${params.length}`);
    }
  }

  if (filters.urgencyLevel) {
    params.push(filters.urgencyLevel);
    clauses.push(`c.urgency_level = $${params.length}`);
  }

  if (filters.guardianPhone) {
    params.push(filters.guardianPhone);
    clauses.push(`c.guardian_phone = $${params.length}`);
  }

  const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = Number(filters.limit) > 0 ? Math.min(Number(filters.limit), 300) : 100;
  params.push(limit);

  const result = await query(
    `
      SELECT
        c.*,
        COALESCE(a.asset_count, 0)::int AS asset_count
      FROM rapid_triage_cases c
      LEFT JOIN (
        SELECT case_id, COUNT(*)::int AS asset_count
        FROM rapid_triage_case_assets
        GROUP BY case_id
      ) a ON a.case_id = c.id
      ${whereClause}
      ORDER BY
        CASE c.urgency_level
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          ELSE 4
        END,
        c.created_at DESC
      LIMIT $${params.length}
    `,
    params
  );

  return result.rows.map((row) => ({
    ...mapCaseRow(row),
    assetCount: Number(row.asset_count || 0)
  }));
}

export async function getTriageCaseById(caseId, options = {}) {
  const includeAssets = options.includeAssets !== false;
  const includeEvents = options.includeEvents !== false;

  const caseResult = await query(
    `
      SELECT *
      FROM rapid_triage_cases
      WHERE id = $1
      LIMIT 1
    `,
    [caseId]
  );

  if (!caseResult.rows.length) {
    return null;
  }

  const triageCase = mapCaseRow(caseResult.rows[0]);
  const [assetsResult, eventsResult] = await Promise.all([
    includeAssets
      ? query(
          `
            SELECT *
            FROM rapid_triage_case_assets
            WHERE case_id = $1
            ORDER BY created_at ASC
          `,
          [caseId]
        )
      : Promise.resolve({ rows: [] }),
    includeEvents
      ? query(
          `
            SELECT *
            FROM rapid_triage_case_events
            WHERE case_id = $1
            ORDER BY created_at DESC
          `,
          [caseId]
        )
      : Promise.resolve({ rows: [] })
  ]);

  return {
    ...triageCase,
    assets: assetsResult.rows.map(mapAssetRow),
    events: eventsResult.rows.map(mapEventRow)
  };
}

export async function updateTriageCaseStatus(caseId, nextStatus, actor = "admin") {
  return withClient(async (client) => {
    await client.query("BEGIN");

    try {
      const currentResult = await client.query(
        `
          SELECT *
          FROM rapid_triage_cases
          WHERE id = $1
          FOR UPDATE
        `,
        [caseId]
      );

      if (!currentResult.rows.length) {
        await client.query("ROLLBACK");
        return null;
      }

      const current = mapCaseRow(currentResult.rows[0]);
      if (current.status === nextStatus) {
        await client.query("COMMIT");
        return current;
      }

      const updatedResult = await client.query(
        `
          UPDATE rapid_triage_cases
          SET status = $2,
              updated_at = NOW()
          WHERE id = $1
          RETURNING *
        `,
        [caseId, nextStatus]
      );

      await insertCaseEvent(client, {
        caseId,
        eventType: "status_changed",
        previousStatus: current.status,
        nextStatus,
        actor,
        payload: {},
        createdAt: new Date().toISOString()
      });

      await client.query("COMMIT");
      return mapCaseRow(updatedResult.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
}

export async function addTriageCaseResponse(caseId, responseInput) {
  return withClient(async (client) => {
    await client.query("BEGIN");

    try {
      const currentResult = await client.query(
        `
          SELECT *
          FROM rapid_triage_cases
          WHERE id = $1
          FOR UPDATE
        `,
        [caseId]
      );

      if (!currentResult.rows.length) {
        await client.query("ROLLBACK");
        return null;
      }

      const current = mapCaseRow(currentResult.rows[0]);
      const nextStatus = responseInput.status || "responded";
      const followUpAt = responseInput.followUpAt || null;

      const updatedResult = await client.query(
        `
          UPDATE rapid_triage_cases
          SET
            doctor_response_template = $2,
            doctor_response_note = $3,
            follow_up_at = $4,
            status = $5,
            updated_at = NOW()
          WHERE id = $1
          RETURNING *
        `,
        [
          caseId,
          responseInput.template,
          responseInput.note,
          followUpAt,
          nextStatus
        ]
      );

      await insertCaseEvent(client, {
        caseId,
        eventType: "response_added",
        previousStatus: current.status,
        nextStatus,
        actor: responseInput.actor || "admin",
        payload: {
          template: responseInput.template,
          note: responseInput.note,
          followUpAt
        },
        createdAt: new Date().toISOString()
      });

      await client.query("COMMIT");
      return mapCaseRow(updatedResult.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
}

export async function listTriageHistoryByGuardianPhone(guardianPhone, limit = 40) {
  const finalLimit = Number(limit) > 0 ? Math.min(Number(limit), 150) : 40;

  const result = await query(
    `
      SELECT *
      FROM rapid_triage_cases
      WHERE guardian_phone = $1
      ORDER BY created_at DESC
      LIMIT $2
    `,
    [guardianPhone, finalLimit]
  );

  return result.rows.map(mapCaseRow);
}
