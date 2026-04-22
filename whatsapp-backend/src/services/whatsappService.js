const axios = require('axios');
const config = require('../config/env');
const logger = require('../config/logger');
const AppError = require('../utils/appError');

const httpClient = axios.create({
  timeout: 10000,
});

function buildMetaMessagesUrl() {
  return `https://graph.facebook.com/${config.whatsapp.metaApiVersion}/${config.whatsapp.phoneNumberId}/messages`;
}

async function sendWhatsAppMessage(to, message) {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: {
      body: message,
    },
  };

  try {
    logger.info('whatsapp_outbound_attempt', {
      to,
      messagePreview: String(message).slice(0, 120),
    });

    const response = await httpClient.post(buildMetaMessagesUrl(), payload, {
      headers: {
        Authorization: `Bearer ${config.whatsapp.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    logger.info('whatsapp_outbound_success', {
      to,
      statusCode: response.status,
      responseData: response.data,
    });

    return response.data;
  } catch (error) {
    const statusCode = error?.response?.status || 502;
    const errorData = error?.response?.data || null;

    logger.error('whatsapp_outbound_error', {
      to,
      statusCode,
      errorData,
      message: error.message,
    });

    throw new AppError('Failed to send WhatsApp message via Meta API.', statusCode, errorData);
  }
}

module.exports = {
  sendWhatsAppMessage,
};
