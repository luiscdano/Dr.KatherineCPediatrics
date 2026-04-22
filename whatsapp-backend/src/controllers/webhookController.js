const config = require('../config/env');
const logger = require('../config/logger');
const AppError = require('../utils/appError');
const { processWebhookPayload } = require('../services/webhookProcessorService');

async function verifyWebhook(req, res, next) {
  try {
    const mode = req.query['hub.mode'];
    const challenge = req.query['hub.challenge'];
    const token = req.query['hub.verify_token'];

    if (mode === 'subscribe' && token === config.whatsapp.verifyToken) {
      logger.info('webhook_verification_success');
      return res.status(200).send(challenge);
    }

    logger.warn('webhook_verification_failed', {
      mode,
      tokenProvided: Boolean(token),
    });

    return res.status(403).json({ ok: false, error: 'Webhook verification failed.' });
  } catch (error) {
    return next(error);
  }
}

async function receiveWebhook(req, res, next) {
  try {
    await processWebhookPayload(req.body);
    return res.status(200).json({ ok: true });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    return next(new AppError('Webhook processing failed.', 500, { reason: error.message }));
  }
}

module.exports = {
  verifyWebhook,
  receiveWebhook,
};
