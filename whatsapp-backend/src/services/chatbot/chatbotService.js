const { normalizeUserText } = require('../../utils/text');
const greetingIntent = require('./intents/greetingIntent');
const infoIntent = require('./intents/infoIntent');
const priceIntent = require('./intents/priceIntent');
const fallbackIntent = require('./intents/fallbackIntent');

class ChatbotService {
  constructor() {
    this.strategies = [greetingIntent, infoIntent, priceIntent, fallbackIntent];
  }

  buildReply({ text, profileName }) {
    const normalizedText = normalizeUserText(text);
    const context = {
      text,
      normalizedText,
      profileName,
    };

    const strategy = this.strategies.find((item) => item.matches(context)) || fallbackIntent;

    return {
      intent: strategy.name,
      message: strategy.getResponse(context),
    };
  }
}

module.exports = new ChatbotService();
