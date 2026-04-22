const IntentStrategy = require('../intentStrategy');

module.exports = new IntentStrategy(
  'info',
  (context) => context.normalizedText.includes('info'),
  () =>
    'Informacion del consultorio:\n- Dr. Katherine C Pediatrics\n- Punta Cana Village\n- Horario: Lun-Vie 8:00am-5:30pm, Sab 8:00am-1:00pm\n- Citas por WhatsApp o formulario web.'
);
