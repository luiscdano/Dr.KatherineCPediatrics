import { Pool } from "pg";
import config from "../config.mjs";

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      host: config.db.host,
      port: config.db.port,
      database: config.db.database,
      user: config.db.user,
      password: config.db.password,
      ssl: config.db.ssl,
      max: 12,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000
    });
  }

  return pool;
}

export async function query(text, params = []) {
  return getPool().query(text, params);
}

export async function withClient(handler) {
  const client = await getPool().connect();
  try {
    return await handler(client);
  } finally {
    client.release();
  }
}

export async function healthCheckDatabase() {
  const startedAt = process.hrtime.bigint();
  try {
    await query("SELECT 1");
    const latencyMs = Number((process.hrtime.bigint() - startedAt) / 1_000_000n);
    return {
      status: "up",
      latencyMs
    };
  } catch (error) {
    return {
      status: "down",
      latencyMs: null,
      error: error.message
    };
  }
}

export async function closePool() {
  if (!pool) {
    return;
  }
  await pool.end();
  pool = undefined;
}
