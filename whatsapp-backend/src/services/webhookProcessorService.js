const logger = require('../config/logger');
const chatbotService = require('./chatbot/chatbotService');
const { sendWhatsAppMessage } = require('./whatsappService');
const { extractInboundMessages } = require('../utils/webhookPayload');
const { conversationRepository } = require('../repositories');

async function processInboundMessage(event) {
  const from = event.from;

  if (!from) {
    logger.warn('inbound_message_skipped_missing_sender', { event });
    return;
  }

  logger.info('inbound_message_received', {
    from,
    type: event.type,
    profileName: event.profileName,
    text: event.text,
    messageId: event.messageId,
  });

  await conversationRepository.saveInboundMessage({
    from,
    type: event.type,
    text: event.text,
    profileName: event.profileName,
    messageId: event.messageId,
    timestamp: event.timestamp,
  });

  let responseMessage = '';
  let intent = 'unsupported';

  if (event.type === 'text') {
    const chatbotOutput = chatbotService.buildReply({
      text: event.text,
      profileName: event.profileName,
    });
    responseMessage = chatbotOutput.message;
    intent = chatbotOutput.intent;
  } else {
    responseMessage = 'Gracias por tu mensaje. Actualmente solo puedo responder mensajes de texto. Escribe "hola", "info" o "precio".';
  }

  const sendResult = await sendWhatsAppMessage(from, responseMessage);

  await conversationRepository.saveOutboundMessage({
    to: from,
    intent,
    message: responseMessage,
    providerResponse: sendResult,
    sourceMessageId: event.messageId,
  });
}

async function processStatusEvent(event) {
  logger.info('whatsapp_status_event', {
    messageId: event.messageId,
    status: event.type,
    recipient: event.from,
    timestamp: event.timestamp,
    details: event.raw,
  });

  await conversationRepository.saveStatusEvent({
    messageId: event.messageId,
    status: event.type,
    recipient: event.from,
    timestamp: event.timestamp,
    details: event.raw,
  });
}

async function processWebhookPayload(payload) {
  const events = extractInboundMessages(payload);

  if (!events.length) {
    logger.info('webhook_received_without_events');
    return { processed: 0 };
  }

  await Promise.all(
    events.map(async (event) => {
      if (event.eventType === 'message') {
        await processInboundMessage(event);
        return;
      }
      await processStatusEvent(event);
    })
  );

  return { processed: events.length };
}

module.exports = {
  processWebhookPayload,
};
