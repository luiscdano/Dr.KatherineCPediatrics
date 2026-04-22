import { runMigrations } from "../db/migrator.mjs";
import { closePool } from "../db/client.mjs";

async function main() {
  const result = await runMigrations();
  // eslint-disable-next-line no-console
  console.log(`[db] migrations complete | total=${result.totalFiles} newlyApplied=${result.newlyApplied}`);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("[db] migration failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
