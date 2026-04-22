import fs from "node:fs/promises";
import path from "node:path";
import { withClient } from "./client.mjs";

const migrationsDirectory = path.resolve(process.cwd(), "server/db/migrations");
const migrationsLockId = 9122301;

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGSERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations(client) {
  const result = await client.query("SELECT filename FROM schema_migrations ORDER BY filename ASC");
  return new Set(result.rows.map((row) => row.filename));
}

async function runSingleMigration(client, filename) {
  const fullPath = path.join(migrationsDirectory, filename);
  const sql = await fs.readFile(fullPath, "utf8");

  await client.query("BEGIN");
  try {
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [filename]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export async function runMigrations() {
  const migrationFiles = (await fs.readdir(migrationsDirectory))
    .filter((filename) => filename.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  return withClient(async (client) => {
    await client.query("SELECT pg_advisory_lock($1)", [migrationsLockId]);
    try {
      await ensureMigrationsTable(client);
      const applied = await getAppliedMigrations(client);
      let newlyApplied = 0;

      for (const filename of migrationFiles) {
        if (applied.has(filename)) {
          continue;
        }
        await runSingleMigration(client, filename);
        newlyApplied += 1;
      }

      return {
        totalFiles: migrationFiles.length,
        newlyApplied
      };
    } finally {
      await client.query("SELECT pg_advisory_unlock($1)", [migrationsLockId]);
    }
  });
}
