CREATE TABLE IF NOT EXISTS whatsapp_inbound_messages (
  id BIGSERIAL PRIMARY KEY,
  provider_message_id TEXT,
  sender_wa_id TEXT NOT NULL,
  profile_name TEXT,
  message_type TEXT NOT NULL,
  message_text TEXT,
  event_timestamp TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_inbound_sender ON whatsapp_inbound_messages(sender_wa_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_inbound_provider_message_id ON whatsapp_inbound_messages(provider_message_id);

CREATE TABLE IF NOT EXISTS whatsapp_outbound_messages (
  id BIGSERIAL PRIMARY KEY,
  recipient_wa_id TEXT NOT NULL,
  intent TEXT,
  message_text TEXT NOT NULL,
  provider_response JSONB,
  source_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_outbound_recipient ON whatsapp_outbound_messages(recipient_wa_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_outbound_source_message_id ON whatsapp_outbound_messages(source_message_id);

CREATE TABLE IF NOT EXISTS whatsapp_status_events (
  id BIGSERIAL PRIMARY KEY,
  provider_message_id TEXT,
  recipient_wa_id TEXT,
  status TEXT NOT NULL,
  event_timestamp TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_status_provider_message_id ON whatsapp_status_events(provider_message_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_status_recipient ON whatsapp_status_events(recipient_wa_id);
