const rateLimit = require('express-rate-limit');
const config = require('../config/env');

const defaultLimiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: 'Too many requests. Please try again later.',
  },
});

const webhookLimiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.webhookRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: 'Webhook rate limit exceeded. Please retry later.',
  },
});

module.exports = {
  defaultLimiter,
  webhookLimiter,
};
