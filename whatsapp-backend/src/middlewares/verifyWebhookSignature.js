const crypto = require('node:crypto');
const config = require('../config/env');
const logger = require('../config/logger');
const AppError = require('../utils/appError');

function verifyWebhookSignature(req, _res, next) {
  const appSecret = config.whatsapp.appSecret;
  if (!appSecret) {
    logger.warn('webhook_signature_skipped_missing_app_secret');
    return next();
  }

  const signatureHeader = String(req.get('x-hub-signature-256') || '').trim();
  if (!signatureHeader) {
    return next(new AppError('Missing X-Hub-Signature-256 header.', 401));
  }

  if (!Buffer.isBuffer(req.rawBody)) {
    return next(new AppError('Missing raw request body for signature validation.', 400));
  }

  const expectedSignature = `sha256=${crypto
    .createHmac('sha256', appSecret)
    .update(req.rawBody)
    .digest('hex')}`;

  const expectedBuffer = Buffer.from(expectedSignature);
  const providedBuffer = Buffer.from(signatureHeader);

  const isValidSignature =
    expectedBuffer.length === providedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, providedBuffer);

  if (!isValidSignature) {
    logger.warn('webhook_signature_invalid');
    return next(new AppError('Invalid webhook signature.', 401));
  }

  return next();
}

module.exports = verifyWebhookSignature;
