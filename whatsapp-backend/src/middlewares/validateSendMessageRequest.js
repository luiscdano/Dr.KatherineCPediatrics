const AppError = require('../utils/appError');

function validateSendMessageRequest(req, _res, next) {
  const { to, message } = req.body || {};

  if (!to || typeof to !== 'string') {
    return next(new AppError('Field "to" is required and must be a string.', 400));
  }

  if (!message || typeof message !== 'string') {
    return next(new AppError('Field "message" is required and must be a string.', 400));
  }

  if (message.trim().length === 0) {
    return next(new AppError('Field "message" cannot be empty.', 400));
  }

  return next();
}

module.exports = validateSendMessageRequest;
