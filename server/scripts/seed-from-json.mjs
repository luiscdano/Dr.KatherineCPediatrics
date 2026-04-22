import fs from "node:fs/promises";
import config from "../config.mjs";
import { runMigrations } from "../db/migrator.mjs";
import { closePool, query } from "../db/client.mjs";

function normalizeStore(store) {
  return {
    appointments: Array.isArray(store?.appointments) ? store.appointments : [],
    contactMessages: Array.isArray(store?.contactMessages) ? store.contactMessages : []
  };
}

async function safeReadJson(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return { appointments: [], contactMessages: [] };
  }
}

async function insertAppointment(item) {
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
        created_at,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `,
    [
      item.id,
      item.date,
      item.time,
      item.patientName,
      item.patientAge,
      item.parentName,
      item.parentPhone,
      item.reason,
      item.status || "pending",
      item.source || "website",
      item.createdAt || new Date().toISOString(),
      item.updatedAt || null
    ]
  );
  return result.rows.length > 0;
}

async function insertInitialStatusHistory(item) {
  await query(
    `
      INSERT INTO appointment_status_history (
        appointment_id,
        previous_status,
        next_status,
        changed_at,
        source
      )
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (appointment_id, next_status, changed_at) DO NOTHING
    `,
    [
      item.id,
      null,
      item.status || "pending",
      item.createdAt || new Date().toISOString(),
      "seed"
    ]
  );
}

async function insertContactMessage(item) {
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
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `,
    [
      item.id,
      item.name,
      item.phone,
      item.email,
      item.topic || "otro",
      item.message,
      item.source || "website",
      item.createdAt || new Date().toISOString()
    ]
  );
  return result.rows.length > 0;
}

async function main() {
  await runMigrations();
  const store = normalizeStore(await safeReadJson(config.dataFile));

  let seededAppointments = 0;
  let seededMessages = 0;

  for (const appointment of store.appointments) {
    try {
      if (await insertAppointment(appointment)) {
        await insertInitialStatusHistory(appointment);
        seededAppointments += 1;
      }
    } catch (error) {
      if (error?.code !== "23505") {
        throw error;
      }
    }
  }

  for (const message of store.contactMessages) {
    try {
      if (await insertContactMessage(message)) {
        seededMessages += 1;
      }
    } catch (error) {
      if (error?.code !== "23505") {
        throw error;
      }
    }
  }

  // eslint-disable-next-line no-console
  console.log(`[db] seed complete | appointments=${seededAppointments} contactMessages=${seededMessages}`);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("[db] seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
