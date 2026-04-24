CREATE TABLE IF NOT EXISTS pre_visit_assessments (
  id UUID PRIMARY KEY,
  patient_name TEXT NOT NULL,
  patient_age INTEGER NOT NULL CHECK (patient_age >= 0 AND patient_age <= 18),
  guardian_name TEXT NOT NULL,
  guardian_phone TEXT NOT NULL,
  primary_reason TEXT NOT NULL,
  symptoms TEXT NOT NULL,
  fever_celsius NUMERIC(4, 1),
  pain_level INTEGER NOT NULL CHECK (pain_level >= 0 AND pain_level <= 10),
  duration_hours INTEGER NOT NULL CHECK (duration_hours >= 0 AND duration_hours <= 720),
  allergies TEXT,
  medications TEXT,
  urgency_level TEXT NOT NULL CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
  triage_summary TEXT NOT NULL,
  recommended_channel TEXT NOT NULL CHECK (recommended_channel IN ('home_monitor', 'priority_visit', 'same_day_visit', 'emergency')),
  source TEXT NOT NULL DEFAULT 'website',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pre_visit_assessments_created_at
  ON pre_visit_assessments (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pre_visit_assessments_urgency
  ON pre_visit_assessments (urgency_level, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pre_visit_assessments_guardian_phone
  ON pre_visit_assessments (guardian_phone);

CREATE TABLE IF NOT EXISTS resource_download_events (
  id BIGSERIAL PRIMARY KEY,
  event_id UUID NOT NULL UNIQUE,
  resource_key TEXT NOT NULL,
  parent_name TEXT NOT NULL,
  parent_email TEXT NOT NULL,
  child_age_group TEXT NOT NULL,
  consent_given BOOLEAN NOT NULL DEFAULT TRUE,
  source TEXT NOT NULL DEFAULT 'website',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resource_download_events_created_at
  ON resource_download_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_resource_download_events_resource_key
  ON resource_download_events (resource_key, created_at DESC);

CREATE TABLE IF NOT EXISTS rapid_triage_cases (
  id UUID PRIMARY KEY,
  patient_name TEXT NOT NULL,
  patient_age INTEGER NOT NULL CHECK (patient_age >= 0 AND patient_age <= 18),
  guardian_name TEXT NOT NULL,
  guardian_phone TEXT NOT NULL,
  guardian_email TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  fever_celsius NUMERIC(4, 1),
  pain_level INTEGER NOT NULL CHECK (pain_level >= 0 AND pain_level <= 10),
  duration_hours INTEGER NOT NULL CHECK (duration_hours >= 0 AND duration_hours <= 720),
  has_allergies BOOLEAN NOT NULL DEFAULT FALSE,
  allergy_details TEXT,
  warning_signs TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  urgency_level TEXT NOT NULL CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
  urgency_score INTEGER NOT NULL CHECK (urgency_score >= 0),
  urgency_reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('new', 'in_review', 'responded', 'follow_up', 'closed', 'referred_er')),
  doctor_response_template TEXT,
  doctor_response_note TEXT,
  follow_up_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'website',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_rapid_triage_cases_created_at
  ON rapid_triage_cases (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rapid_triage_cases_status_urgency
  ON rapid_triage_cases (status, urgency_level, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rapid_triage_cases_guardian_phone
  ON rapid_triage_cases (guardian_phone, created_at DESC);

CREATE TABLE IF NOT EXISTS rapid_triage_case_assets (
  id UUID PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES rapid_triage_cases(id) ON DELETE CASCADE,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes > 0),
  data_base64 TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rapid_triage_case_assets_case_id
  ON rapid_triage_case_assets (case_id, created_at ASC);

CREATE TABLE IF NOT EXISTS rapid_triage_case_events (
  id BIGSERIAL PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES rapid_triage_cases(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  previous_status TEXT,
  next_status TEXT,
  actor TEXT NOT NULL DEFAULT 'system',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rapid_triage_case_events_case_id
  ON rapid_triage_case_events (case_id, created_at DESC);

CREATE TABLE IF NOT EXISTS whatsapp_reminders (
  id UUID PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  target_phone TEXT NOT NULL,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('confirmation', 'reminder_24h', 'reminder_2h', 'no_show_recovery')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled', 'skipped')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  sent_at TIMESTAMPTZ,
  last_error TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_reminders_unique_type_per_appointment
  ON whatsapp_reminders (appointment_id, reminder_type);

CREATE INDEX IF NOT EXISTS idx_whatsapp_reminders_schedule
  ON whatsapp_reminders (status, scheduled_for ASC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_reminders_created_at
  ON whatsapp_reminders (created_at DESC);
