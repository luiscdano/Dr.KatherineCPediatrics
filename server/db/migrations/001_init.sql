CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY,
  appointment_date DATE NOT NULL,
  appointment_time TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  patient_age INTEGER NOT NULL,
  parent_name TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments (appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments (status);
CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON appointments (created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS appointments_busy_slot_uniq
  ON appointments (appointment_date, appointment_time)
  WHERE status IN ('pending', 'confirmed', 'completed');

CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  topic TEXT NOT NULL,
  message TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_topic ON contact_messages (topic);
