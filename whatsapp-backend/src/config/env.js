const dotenv = require('dotenv');

dotenv.config();

function toPositiveInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function toArray(value) {
  if (!value) {
    return ['*'];
  }
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function toBoolean(value, fallback = false) {
  if (value == null || value === '') {
    return fallback;
  }
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return fallback;
}

function validateRequiredEnv(runtimeEnv) {
  const required = ['WHATSAPP_TOKEN', 'PHONE_NUMBER_ID', 'VERIFY_TOKEN', 'INTERNAL_API_KEY'];
  const missing = required.filter((key) => !process.env[key] || !String(process.env[key]).trim());

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (runtimeEnv === 'production' && (!process.env.APP_SECRET || !String(process.env.APP_SECRET).trim())) {
    throw new Error('APP_SECRET is required in production for webhook signature verification.');
  }

  const provider = String(process.env.DB_PROVIDER || 'postgres').trim().toLowerCase();
  if (!['postgres', 'memory'].includes(provider)) {
    throw new Error('DB_PROVIDER must be one of: postgres, memory');
  }

  if (provider === 'postgres') {
    const requiredDb = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
    const missingDb = requiredDb.filter((key) => !process.env[key] || !String(process.env[key]).trim());
    if (missingDb.length) {
      throw new Error(`Missing required database environment variables: ${missingDb.join(', ')}`);
    }
  }
}

const runtimeEnv = process.env.NODE_ENV || 'development';
validateRequiredEnv(runtimeEnv);

const config = {
  env: runtimeEnv,
  port: toPositiveInt(process.env.PORT, 3000),
  corsOrigins: toArray(process.env.CORS_ORIGINS),
  security: {
    internalApiKey: String(process.env.INTERNAL_API_KEY || '').trim(),
    rateLimitWindowMs: toPositiveInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    rateLimitMax: toPositiveInt(process.env.RATE_LIMIT_MAX, 200),
    webhookRateLimitMax: toPositiveInt(process.env.WEBHOOK_RATE_LIMIT_MAX, 300),
  },
  whatsapp: {
    verifyToken: String(process.env.VERIFY_TOKEN || '').trim(),
    accessToken: String(process.env.WHATSAPP_TOKEN || '').trim(),
    phoneNumberId: String(process.env.PHONE_NUMBER_ID || '').trim(),
    metaApiVersion: String(process.env.META_API_VERSION || 'v20.0').trim(),
    appSecret: String(process.env.APP_SECRET || '').trim(),
  },
  logging: {
    level: String(process.env.LOG_LEVEL || 'info').trim().toLowerCase(),
  },
  db: {
    provider: String(process.env.DB_PROVIDER || 'postgres').trim().toLowerCase(),
    host: String(process.env.DB_HOST || '').trim(),
    port: toPositiveInt(process.env.DB_PORT, 5432),
    name: String(process.env.DB_NAME || '').trim(),
    user: String(process.env.DB_USER || '').trim(),
    password: String(process.env.DB_PASSWORD || '').trim(),
    ssl: toBoolean(process.env.DB_SSL, false),
  },
};

module.exports = config;
