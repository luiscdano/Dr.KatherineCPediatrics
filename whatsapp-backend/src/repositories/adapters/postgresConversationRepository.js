const ConversationRepository = require('../conversationRepository');
const { query } = require('../../config/database');

class PostgresConversationRepository extends ConversationRepository {
  async saveInboundMessage(message) {
    await query(
      `
      INSERT INTO whatsapp_inbound_messages (
        provider_message_id,
        sender_wa_id,
        profile_name,
        message_type,
        message_text,
        event_timestamp
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        message.messageId || null,
        message.from,
        message.profileName || null,
        message.type || 'unknown',
        message.text || null,
        message.timestamp || null,
      ]
    );
  }

  async saveOutboundMessage(message) {
    await query(
      `
      INSERT INTO whatsapp_outbound_messages (
        recipient_wa_id,
        intent,
        message_text,
        provider_response,
        source_message_id
      )
      VALUES ($1, $2, $3, $4::jsonb, $5)
      `,
      [
        message.to,
        message.intent || null,
        message.message,
        JSON.stringify(message.providerResponse || {}),
        message.sourceMessageId || null,
      ]
    );
  }

  async saveStatusEvent(event) {
    await query(
      `
      INSERT INTO whatsapp_status_events (
        provider_message_id,
        recipient_wa_id,
        status,
        event_timestamp,
        payload
      )
      VALUES ($1, $2, $3, $4, $5::jsonb)
      `,
      [
        event.messageId || null,
        event.recipient || null,
        event.status || 'unknown',
        event.timestamp || null,
        JSON.stringify(event.details || {}),
      ]
    );
  }
}

module.exports = PostgresConversationRepository;
