import { query } from "../db/client.mjs";

const slotCountPerDay = 12;

function toNumber(value) {
  if (value == null || value === "") {
    return 0;
  }
  return Number(value) || 0;
}

function getDaysInRange(from, to) {
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  const diffMs = end.getTime() - start.getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) {
    return 0;
  }
  return Math.floor(diffMs / 86400000) + 1;
}

export async function getDashboardMetrics(range) {
  const [appointmentsSummary, contactSummary, contactTopics, transitions] = await Promise.all([
    query(
      `
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
          COUNT(*) FILTER (WHERE status = 'confirmed')::int AS confirmed,
          COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
          COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
          COUNT(*) FILTER (WHERE status = 'no_show')::int AS no_show,
          COUNT(DISTINCT appointment_date::text || '|' || appointment_time)
            FILTER (WHERE status = ANY($3::text[]))::int AS busy_slots,
          AVG(
            EXTRACT(EPOCH FROM ((appointment_date::timestamp + appointment_time::time) - (created_at AT TIME ZONE 'UTC'))) / 3600.0
          ) AS avg_lead_hours
        FROM appointments
        WHERE appointment_date BETWEEN $1::date AND $2::date
      `,
      [range.from, range.to, ["pending", "confirmed", "completed"]]
    ),
    query(
      `
        SELECT COUNT(*)::int AS total
        FROM contact_messages
        WHERE created_at::date BETWEEN $1::date AND $2::date
      `,
      [range.from, range.to]
    ),
    query(
      `
        SELECT topic, COUNT(*)::int AS total
        FROM contact_messages
        WHERE created_at::date BETWEEN $1::date AND $2::date
        GROUP BY topic
        ORDER BY total DESC, topic ASC
      `,
      [range.from, range.to]
    ),
    query(
      `
        SELECT next_status AS status, COUNT(*)::int AS total
        FROM appointment_status_history
        WHERE changed_at::date BETWEEN $1::date AND $2::date
        GROUP BY next_status
        ORDER BY total DESC, next_status ASC
      `,
      [range.from, range.to]
    )
  ]);

  const summaryRow = appointmentsSummary.rows[0] || {};
  const contactsTotal = toNumber(contactSummary.rows[0]?.total);
  const appointmentsTotal = toNumber(summaryRow.total);
  const busySlots = toNumber(summaryRow.busy_slots);
  const days = getDaysInRange(range.from, range.to);
  const slotCapacity = days * slotCountPerDay;
  const occupancyRate = slotCapacity > 0 ? (busySlots / slotCapacity) * 100 : 0;
  const conversionRate = contactsTotal > 0 ? (appointmentsTotal / contactsTotal) * 100 : 0;
  const noShowRate = appointmentsTotal > 0 ? (toNumber(summaryRow.no_show) / appointmentsTotal) * 100 : 0;

  return {
    range,
    kpis: {
      appointmentsTotal,
      contactsTotal,
      busySlots,
      slotCapacity,
      occupancyRate: Number(occupancyRate.toFixed(2)),
      conversionRate: Number(conversionRate.toFixed(2)),
      noShowRate: Number(noShowRate.toFixed(2)),
      avgLeadHours: Number(toNumber(summaryRow.avg_lead_hours).toFixed(2))
    },
    appointmentsByStatus: {
      pending: toNumber(summaryRow.pending),
      confirmed: toNumber(summaryRow.confirmed),
      completed: toNumber(summaryRow.completed),
      cancelled: toNumber(summaryRow.cancelled),
      no_show: toNumber(summaryRow.no_show)
    },
    contactsByTopic: contactTopics.rows.map((row) => ({
      topic: row.topic,
      total: toNumber(row.total)
    })),
    statusTransitions: transitions.rows.map((row) => ({
      status: row.status,
      total: toNumber(row.total)
    }))
  };
}

export async function getDashboardTimeSeries(range) {
  const result = await query(
    `
      WITH days AS (
        SELECT generate_series($1::date, $2::date, INTERVAL '1 day')::date AS day
      ),
      appointments_daily AS (
        SELECT appointment_date::date AS day, COUNT(*)::int AS total
        FROM appointments
        WHERE appointment_date BETWEEN $1::date AND $2::date
        GROUP BY appointment_date::date
      ),
      contacts_daily AS (
        SELECT created_at::date AS day, COUNT(*)::int AS total
        FROM contact_messages
        WHERE created_at::date BETWEEN $1::date AND $2::date
        GROUP BY created_at::date
      ),
      transitions_daily AS (
        SELECT
          changed_at::date AS day,
          COUNT(*) FILTER (WHERE next_status = 'confirmed')::int AS confirmed,
          COUNT(*) FILTER (WHERE next_status = 'cancelled')::int AS cancelled,
          COUNT(*) FILTER (WHERE next_status = 'no_show')::int AS no_show
        FROM appointment_status_history
        WHERE changed_at::date BETWEEN $1::date AND $2::date
        GROUP BY changed_at::date
      )
      SELECT
        to_char(d.day, 'YYYY-MM-DD') AS day,
        COALESCE(a.total, 0)::int AS appointments,
        COALESCE(c.total, 0)::int AS contacts,
        COALESCE(t.confirmed, 0)::int AS confirmed,
        COALESCE(t.cancelled, 0)::int AS cancelled,
        COALESCE(t.no_show, 0)::int AS no_show
      FROM days d
      LEFT JOIN appointments_daily a ON a.day = d.day
      LEFT JOIN contacts_daily c ON c.day = d.day
      LEFT JOIN transitions_daily t ON t.day = d.day
      ORDER BY d.day ASC
    `,
    [range.from, range.to]
  );

  return result.rows.map((row) => ({
    day: row.day,
    appointments: toNumber(row.appointments),
    contacts: toNumber(row.contacts),
    confirmed: toNumber(row.confirmed),
    cancelled: toNumber(row.cancelled),
    noShow: toNumber(row.no_show)
  }));
}
