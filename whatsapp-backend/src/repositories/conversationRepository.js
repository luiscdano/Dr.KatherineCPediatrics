class ConversationRepository {
  // This abstraction lets you swap in MySQL/Postgres/Mongo/CRM later.
  async saveInboundMessage(_message) {
    throw new Error('saveInboundMessage must be implemented by adapter');
  }

  async saveOutboundMessage(_message) {
    throw new Error('saveOutboundMessage must be implemented by adapter');
  }

  async saveStatusEvent(_event) {
    throw new Error('saveStatusEvent must be implemented by adapter');
  }
}

module.exports = ConversationRepository;
