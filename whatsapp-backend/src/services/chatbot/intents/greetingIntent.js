const IntentStrategy = require('../intentStrategy');

module.exports = new IntentStrategy(
  'greeting',
  (context) => context.normalizedText.includes('hola'),
  (context) => `Hola${context.profileName ? `, ${context.profileName}` : ''}. Soy el asistente virtual de Dr. Katherine C Pediatrics. ¿En que te puedo ayudar hoy?`
);
