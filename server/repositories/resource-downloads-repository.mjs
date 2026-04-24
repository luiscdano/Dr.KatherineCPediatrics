import { query } from "../db/client.mjs";

function mapRow(row) {
  return {
    id: row.event_id,
    resourceKey: row.resource_key,
    parentName: row.parent_name,
    parentEmail: row.parent_email,
    childAgeGroup: row.child_age_group,
    consentGiven: Boolean(row.consent_given),
    source: row.source,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
  };
}

export async function createResourceDownloadEvent(input) {
  const result = await query(
    `
      INSERT INTO resource_download_events (
        event_id,
        resource_key,
        parent_name,
        parent_email,
        child_age_group,
        consent_given,
        source,
        created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
    `,
    [
      input.id,
      input.resourceKey,
      input.parentName,
      input.parentEmail,
      input.childAgeGroup,
      input.consentGiven,
      input.source || "website",
      input.createdAt
    ]
  );

  return mapRow(result.rows[0]);
}

export async function listResourceDownloadEvents(filters = {}) {
  const clauses = [];
  const params = [];

  if (filters.resourceKey) {
    params.push(filters.resourceKey);
    clauses.push(`resource_key = $${params.length}`);
  }

  const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = Number(filters.limit) > 0 ? Math.min(Number(filters.limit), 500) : 200;
  params.push(limit);

  const result = await query(
    `
      SELECT *
      FROM resource_download_events
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length}
    `,
    params
  );

  return result.rows.map(mapRow);
}
