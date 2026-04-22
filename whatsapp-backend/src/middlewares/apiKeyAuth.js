const config = require('../config/env');
const AppError = require('../utils/appError');

function apiKeyAuth(req, _res, next) {
  const expectedApiKey = config.security.internalApiKey;

  if (!expectedApiKey) {
    return next();
  }

  const providedApiKey = String(req.get('x-internal-api-key') || '').trim();
  if (!providedApiKey || providedApiKey !== expectedApiKey) {
    return next(new AppError('Unauthorized internal API access.', 401));
  }

  return next();
}

module.exports = apiKeyAuth;
