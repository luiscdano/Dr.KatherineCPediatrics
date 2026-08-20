const IntentStrategy = require('../intentStrategy');

module.exports = new IntentStrategy(
  'info',
  (context) => context.normalizedText.includes('info'),
  () =>
    'Informacion del consultorio:\n- Dr. Katherine C Pediatrics\n- Punta Cana Village\n- Horario: Lun-Vie 9:00am-5:00pm, Sab teleorientación por WhatsApp\n- Citas por WhatsApp o formulario web.'
);
