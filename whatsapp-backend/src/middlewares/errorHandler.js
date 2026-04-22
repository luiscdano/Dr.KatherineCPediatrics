const logger = require('../config/logger');

function errorHandler(err, req, res, _next) {
  const statusCode = Number(err?.statusCode) || 500;
  const message = err?.message || 'Unexpected server error.';

  logger.error('request_error', {
    message,
    statusCode,
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    details: err?.details || null,
    stack: err?.stack || null,
  });

  res.status(statusCode).json({
    ok: false,
    error: message,
    details: err?.details || null,
  });
}

module.exports = errorHandler;
