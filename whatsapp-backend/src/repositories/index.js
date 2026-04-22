const config = require('../config/env');
const logger = require('../config/logger');
const InMemoryConversationRepository = require('./adapters/inMemoryConversationRepository');
const PostgresConversationRepository = require('./adapters/postgresConversationRepository');

const repositoryProvider = config.db.provider === 'postgres' ? 'postgres' : 'memory';
const conversationRepository =
  repositoryProvider === 'postgres'
    ? new PostgresConversationRepository()
    : new InMemoryConversationRepository();

logger.info('conversation_repository_initialized', {
  provider: repositoryProvider,
});

module.exports = {
  conversationRepository,
  repositoryProvider,
};
