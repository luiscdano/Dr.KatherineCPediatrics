function extractInboundMessages(payload) {
  const results = [];
  const entries = Array.isArray(payload?.entry) ? payload.entry : [];

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      const value = change?.value || {};
      const contacts = Array.isArray(value.contacts) ? value.contacts : [];
      const messages = Array.isArray(value.messages) ? value.messages : [];
      const statuses = Array.isArray(value.statuses) ? value.statuses : [];

      const contactName = contacts[0]?.profile?.name || null;
      const contactWaId = contacts[0]?.wa_id || null;

      for (const message of messages) {
        results.push({
          eventType: 'message',
          messageId: message?.id || null,
          from: message?.from || contactWaId,
          profileName: contactName,
          type: message?.type || 'unknown',
          text: message?.text?.body || '',
          raw: message,
          metadata: value?.metadata || null,
          timestamp: message?.timestamp || null,
        });
      }

      for (const status of statuses) {
        results.push({
          eventType: 'status',
          messageId: status?.id || null,
          from: status?.recipient_id || null,
          profileName: null,
          type: status?.status || 'unknown',
          text: '',
          raw: status,
          metadata: value?.metadata || null,
          timestamp: status?.timestamp || null,
        });
      }
    }
  }

  return results;
}

module.exports = {
  extractInboundMessages,
};
