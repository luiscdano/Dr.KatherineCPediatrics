const ConversationRepository = require('../conversationRepository');

class InMemoryConversationRepository extends ConversationRepository {
  constructor() {
    super();
    this.inboundMessages = [];
    this.outboundMessages = [];
    this.statusEvents = [];
  }

  async saveInboundMessage(message) {
    this.inboundMessages.unshift({ ...message, persistedAt: new Date().toISOString() });
  }

  async saveOutboundMessage(message) {
    this.outboundMessages.unshift({ ...message, persistedAt: new Date().toISOString() });
  }

  async saveStatusEvent(event) {
    this.statusEvents.unshift({ ...event, persistedAt: new Date().toISOString() });
  }
}

module.exports = InMemoryConversationRepository;
