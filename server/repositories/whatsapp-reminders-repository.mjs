import { query } from "../db/client.mjs";

function mapReminderRow(row) {
  return {
    id: row.id,
    appointmentId: row.appointment_id,
    targetPhone: row.target_phone,
    reminderType: row.reminder_type,
    scheduledFor: row.scheduled_for instanceof Date ? row.scheduled_for.toISOString() : row.scheduled_for,
    status: row.status,
    attempts: row.attempts,
    sentAt: row.sent_at instanceof Date ? row.sent_at.toISOString() : row.sent_at || null,
    lastError: row.last_error || null,
    payload: row.payload || {},
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at || null
  };
}

export async function upsertAppointmentReminder(input) {
  const result = await query(
    `
      INSERT INTO whatsapp_reminders (
        id,
        appointment_id,
        target_phone,
        reminder_type,
        scheduled_for,
        status,
        payload,
        created_at,
        updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,NOW())
      ON CONFLICT (appointment_id, reminder_type)
      DO UPDATE SET
        target_phone = EXCLUDED.target_phone,
        scheduled_for = EXCLUDED.scheduled_for,
        status = CASE WHEN whatsapp_reminders.status = 'sent' THEN whatsapp_reminders.status ELSE EXCLUDED.status END,
        payload = EXCLUDED.payload,
        updated_at = NOW()
      RETURNING *
    `,
    [
      input.id,
      input.appointmentId,
      input.targetPhone,
      input.reminderType,
      input.scheduledFor,
      input.status || "pending",
      JSON.stringify(input.payload || {}),
      input.createdAt
    ]
  );

  return mapReminderRow(result.rows[0]);
}

export async function listDueReminders(limit = 20) {
  const finalLimit = Number(limit) > 0 ? Math.min(Number(limit), 100) : 20;
  const result = await query(
    `
      SELECT
        r.*,
        a.patient_name,
        a.parent_name,
        a.parent_phone,
        a.appointment_date,
        a.appointment_time,
        a.status AS appointment_status
      FROM whatsapp_reminders r
      INNER JOIN appointments a ON a.id = r.appointment_id
      WHERE r.status = 'pending'
        AND r.scheduled_for <= NOW()
      ORDER BY r.scheduled_for ASC
      LIMIT $1
    `,
    [finalLimit]
  );

  return result.rows.map((row) => ({
    reminder: mapReminderRow(row),
    appointment: {
      id: row.appointment_id,
      patientName: row.patient_name,
      parentName: row.parent_name,
      parentPhone: row.parent_phone,
      date: row.appointment_date instanceof Date ? row.appointment_date.toISOString().slice(0, 10) : String(row.appointment_date || "").slice(0, 10),
      time: row.appointment_time,
      status: row.appointment_status
    }
  }));
}

export async function updateReminderDeliveryState(id, update) {
  const result = await query(
    `
      UPDATE whatsapp_reminders
      SET
        status = $2,
        attempts = attempts + $3,
        sent_at = CASE WHEN $2 = 'sent' THEN NOW() ELSE sent_at END,
        last_error = $4,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [
      id,
      update.status,
      Number(update.attemptIncrement || 0),
      update.lastError || null
    ]
  );

  return result.rows.length ? mapReminderRow(result.rows[0]) : null;
}

export async function cancelPendingRemindersByAppointment(appointmentId) {
  await query(
    `
      UPDATE whatsapp_reminders
      SET status = 'cancelled',
          updated_at = NOW(),
          last_error = COALESCE(last_error, 'cancelled_by_status_change')
      WHERE appointment_id = $1
        AND status = 'pending'
    `,
    [appointmentId]
  );
}

export async function listReminders(filters = {}) {
  const clauses = [];
  const params = [];

  if (filters.status) {
    params.push(filters.status);
    clauses.push(`status = $${params.length}`);
  }

  if (filters.appointmentId) {
    params.push(filters.appointmentId);
    clauses.push(`appointment_id = $${params.length}`);
  }

  const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = Number(filters.limit) > 0 ? Math.min(Number(filters.limit), 500) : 200;
  params.push(limit);

  const result = await query(
    `
      SELECT *
      FROM whatsapp_reminders
      ${whereClause}
      ORDER BY scheduled_for DESC
      LIMIT $${params.length}
    `,
    params
  );

  return result.rows.map(mapReminderRow);
}
