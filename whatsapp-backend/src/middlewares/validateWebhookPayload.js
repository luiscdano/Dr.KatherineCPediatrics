const AppError = require('../utils/appError');

function validateWebhookPayload(req, _res, next) {
  const payload = req.body;

  if (!payload || typeof payload !== 'object') {
    return next(new AppError('Invalid webhook payload: body must be an object.', 400));
  }

  if (!Array.isArray(payload.entry)) {
    return next(new AppError('Invalid webhook payload: entry array is required.', 400));
  }

  return next();
}

module.exports = validateWebhookPayload;
