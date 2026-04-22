const fs = require('node:fs/promises');
const path = require('node:path');
const config = require('../config/env');
const logger = require('../config/logger');
const { query, closePool } = require('../config/database');

const migrationsDirectory = path.resolve(__dirname, '../database/migrations');

async function ensureMigrationTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGSERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations() {
  const result = await query('SELECT filename FROM schema_migrations ORDER BY filename ASC');
  return new Set(result.rows.map((row) => row.filename));
}

async function runMigration(filename) {
  const filePath = path.join(migrationsDirectory, filename);
  const sql = await fs.readFile(filePath, 'utf8');

  logger.info('migration_running', { filename });

  await query('BEGIN');
  try {
    await query(sql);
    await query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
    await query('COMMIT');
    logger.info('migration_applied', { filename });
  } catch (error) {
    await query('ROLLBACK');
    logger.error('migration_failed', {
      filename,
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

async function run() {
  if (config.db.provider !== 'postgres') {
    logger.info('migration_skipped_non_postgres_provider', { provider: config.db.provider });
    return;
  }

  await ensureMigrationTable();

  const migrationFiles = (await fs.readdir(migrationsDirectory))
    .filter((filename) => filename.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));
  const appliedMigrations = await getAppliedMigrations();

  let appliedCount = 0;
  for (const filename of migrationFiles) {
    if (appliedMigrations.has(filename)) {
      logger.info('migration_already_applied', { filename });
      continue;
    }
    await runMigration(filename);
    appliedCount += 1;
  }

  logger.info('migration_finished', {
    totalFiles: migrationFiles.length,
    newlyApplied: appliedCount,
  });
}

run()
  .then(async () => {
    await closePool();
  })
  .catch(async (error) => {
    logger.error('migration_process_failed', {
      message: error.message,
      stack: error.stack,
    });
    await closePool();
    process.exit(1);
  });
