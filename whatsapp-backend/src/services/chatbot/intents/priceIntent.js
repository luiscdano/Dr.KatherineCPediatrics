const IntentStrategy = require('../intentStrategy');

module.exports = new IntentStrategy(
  'price',
  (context) => context.normalizedText.includes('precio') || context.normalizedText.includes('precios'),
  () =>
    'Tarifas y coberturas:\n1) Consulta pediatrica general: solicitar tarifa actual por este canal.\n2) Seguimiento preventivo: plan personalizado segun edad.\n3) Vacunacion: depende del esquema y dosis requeridas.\n\nSi quieres, te conecto con el equipo para cotizacion exacta.'
);
