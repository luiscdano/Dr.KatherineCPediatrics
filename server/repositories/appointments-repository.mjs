import { query } from "../db/client.mjs";

const busyStatuses = ["pending", "confirmed", "completed"];

function toIsoDate(value) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value || "").slice(0, 10);
}

function mapAppointmentRow(row) {
  return {
    id: row.id,
    date: toIsoDate(row.appointment_date),
    time: row.appointment_time,
    patientName: row.patient_name,
    patientAge: row.patient_age,
    parentName: row.parent_name,
    parentPhone: row.parent_phone,
    reason: row.reason,
    status: row.status,
    source: row.source,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at || undefined
  };
}

function isBusySlotConflict(error) {
  return error?.code === "23505" && error?.constraint === "appointments_busy_slot_uniq";
}

export async function listTakenTimesByDate(date) {
  const result = await query(
    `
      SELECT DISTINCT appointment_time
      FROM appointments
      WHERE appointment_date = $1
        AND status = ANY($2::text[])
      ORDER BY appointment_time ASC
    `,
    [date, busyStatuses]
  );

  return result.rows.map((row) => row.appointment_time);
}

export async function createAppointment(input) {
  try {
    const result = await query(
      `
        INSERT INTO appointments (
          id,
          appointment_date,
          appointment_time,
          patient_name,
          patient_age,
          parent_name,
          parent_phone,
          reason,
          status,
          source,
          created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        RETURNING *
      `,
      [
        input.id,
        input.date,
        input.time,
        input.patientName,
        input.patientAge,
        input.parentName,
        input.parentPhone,
        input.reason,
        input.status,
        input.source,
        input.createdAt
      ]
    );

    return mapAppointmentRow(result.rows[0]);
  } catch (error) {
    if (isBusySlotConflict(error)) {
      const conflict = new Error("El horario seleccionado ya está ocupado.");
      conflict.status = 409;
      throw conflict;
    }
    throw error;
  }
}

export async function listAppointments(filters = {}) {
  const clauses = [];
  const params = [];

  if (filters.status) {
    params.push(filters.status);
    clauses.push(`status = $${params.length}`);
  }

  if (filters.date) {
    params.push(filters.date);
    clauses.push(`appointment_date = $${params.length}`);
  }

  const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await query(
    `
      SELECT *
      FROM appointments
      ${whereClause}
      ORDER BY created_at DESC
    `,
    params
  );

  return result.rows.map(mapAppointmentRow);
}

export async function updateAppointmentStatus(id, status) {
  try {
    const result = await query(
      `
        UPDATE appointments
        SET status = $2,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [id, status]
    );

    if (!result.rows.length) {
      return null;
    }

    return mapAppointmentRow(result.rows[0]);
  } catch (error) {
    if (isBusySlotConflict(error)) {
      const conflict = new Error("No se pudo actualizar el estado: el horario ya está ocupado.");
      conflict.status = 409;
      throw conflict;
    }
    throw error;
  }
}
