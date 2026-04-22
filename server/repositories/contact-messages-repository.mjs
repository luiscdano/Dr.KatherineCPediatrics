import { query } from "../db/client.mjs";

function mapContactMessageRow(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    topic: row.topic,
    message: row.message,
    source: row.source,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
  };
}

export async function createContactMessage(input) {
  const result = await query(
    `
      INSERT INTO contact_messages (
        id,
        name,
        phone,
        email,
        topic,
        message,
        source,
        created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
    `,
    [
      input.id,
      input.name,
      input.phone,
      input.email,
      input.topic,
      input.message,
      input.source,
      input.createdAt
    ]
  );

  return mapContactMessageRow(result.rows[0]);
}

export async function listContactMessages() {
  const result = await query(
    `
      SELECT *
      FROM contact_messages
      ORDER BY created_at DESC
    `
  );

  return result.rows.map(mapContactMessageRow);
}
