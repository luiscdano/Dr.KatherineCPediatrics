const IntentStrategy = require('../intentStrategy');

module.exports = new IntentStrategy(
  'fallback',
  () => true,
  () =>
    'Gracias por escribir. Puedo ayudarte con: "hola", "info" o "precio". Si prefieres, deja tu consulta y el equipo te responde en horario de atencion.'
);
