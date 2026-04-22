const app = require('./app');
const config = require('./config/env');
const logger = require('./config/logger');
const { healthCheck, closePool } = require('./config/database');

let server;

async function shutdown(signal) {
  logger.warn('server_shutdown_signal', { signal });

  if (!server) {
    await closePool();
    process.exit(0);
    return;
  }

  server.close(async () => {
    await closePool();
    logger.info('server_stopped', { signal });
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('forced_shutdown_timeout', { signal });
    process.exit(1);
  }, 10000).unref();
}

async function start() {
  const databaseStatus = await healthCheck();
  if (databaseStatus.status !== 'up') {
    throw new Error(`Database health check failed: ${databaseStatus.error || 'unreachable'}`);
  }

  server = app.listen(config.port, () => {
    logger.info('server_started', {
      port: config.port,
      environment: config.env,
      dbProvider: databaseStatus.provider,
    });
  });
}

process.on('SIGINT', () => {
  shutdown('SIGINT');
});
process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});

process.on('uncaughtException', (error) => {
  logger.error('uncaught_exception', {
    message: error.message,
    stack: error.stack,
  });
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.error('unhandled_rejection', { reason: reason instanceof Error ? reason.stack : reason });
  shutdown('unhandledRejection');
});

start().catch(async (error) => {
  logger.error('server_startup_failed', {
    message: error.message,
    stack: error.stack,
  });
  await closePool();
  process.exit(1);
});
