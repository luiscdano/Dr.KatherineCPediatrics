const { Pool } = require('pg');
const config = require('./env');
const logger = require('./logger');

let pool;

function buildSslConfig() {
  if (!config.db.ssl) {
    return false;
  }
  return { rejectUnauthorized: false };
}

function getPool() {
  if (config.db.provider !== 'postgres') {
    return null;
  }

  if (!pool) {
    pool = new Pool({
      host: config.db.host,
      port: config.db.port,
      database: config.db.name,
      user: config.db.user,
      password: config.db.password,
      ssl: buildSslConfig(),
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (error) => {
      logger.error('postgres_pool_error', {
        message: error.message,
        stack: error.stack,
      });
    });
  }

  return pool;
}

async function query(text, params = []) {
  const postgresPool = getPool();
  if (!postgresPool) {
    throw new Error('Postgres provider is not enabled.');
  }
  return postgresPool.query(text, params);
}

async function healthCheck() {
  if (config.db.provider !== 'postgres') {
    return {
      provider: config.db.provider,
      status: 'up',
      latencyMs: 0,
    };
  }

  const startedAt = process.hrtime.bigint();
  try {
    await query('SELECT 1');
    const elapsedMs = Number((process.hrtime.bigint() - startedAt) / 1000000n);
    return {
      provider: 'postgres',
      status: 'up',
      latencyMs: elapsedMs,
    };
  } catch (error) {
    return {
      provider: 'postgres',
      status: 'down',
      latencyMs: null,
      error: error.message,
    };
  }
}

async function closePool() {
  if (!pool) {
    return;
  }
  await pool.end();
  pool = undefined;
}

module.exports = {
  getPool,
  query,
  healthCheck,
  closePool,
};
