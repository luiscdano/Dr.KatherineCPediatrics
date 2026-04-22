CREATE TABLE IF NOT EXISTS appointment_status_history (
  id BIGSERIAL PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  previous_status TEXT,
  next_status TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_appointment_status_history_appointment_id
  ON appointment_status_history (appointment_id);

CREATE INDEX IF NOT EXISTS idx_appointment_status_history_changed_at
  ON appointment_status_history (changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_appointment_status_history_next_status
  ON appointment_status_history (next_status);

CREATE UNIQUE INDEX IF NOT EXISTS appointment_status_history_unique_event
  ON appointment_status_history (appointment_id, next_status, changed_at);

INSERT INTO appointment_status_history (
  appointment_id,
  previous_status,
  next_status,
  changed_at,
  source
)
SELECT
  a.id,
  NULL,
  a.status,
  COALESCE(a.created_at, NOW()),
  'backfill'
FROM appointments a
WHERE NOT EXISTS (
  SELECT 1
  FROM appointment_status_history h
  WHERE h.appointment_id = a.id
);
