const { healthCheck } = require('../config/database');
const { repositoryProvider } = require('../repositories');

async function healthController(_req, res) {
  const database = await healthCheck();
  const ok = database.status === 'up';

  res.status(ok ? 200 : 503).json({
    ok,
    service: 'whatsapp-backend',
    repositoryProvider,
    database,
    timestamp: new Date().toISOString(),
  });
}

module.exports = {
  healthController,
};
