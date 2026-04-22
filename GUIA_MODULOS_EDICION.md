# Guía de Módulos y Secciones (Edición Rápida)

Esta guía te dice qué contiene cada módulo, en qué archivo está, y dónde editar texto, cards, imágenes o formularios.

## 1) Núcleo global del sitio

### 1.1 Datos globales (contenido reusable)
- Archivo: `assets/js/content-data.js`
- Aquí se editan datos que se pintan en varias páginas:
  - Marca y dominio: `siteName`, `domain`, `api`
  - Datos del consultorio: `clinic`
  - Navegación: `nav`
  - Enlaces legales: `legalLinks`
  - Bloques dinámicos: `socialProof`, `advantages`, `services`, `doctorProfile`, `futureTeam`, `resources`, `testimonials`, `faqs`
- Impacto: cambiar aquí actualiza múltiples módulos sin tocar cada HTML.

### 1.2 Header + Footer globales
- Archivo: `assets/js/layout.js`
- Contiene:
  - Aviso superior de emergencia (`site-notice`)
  - Menú principal (`site-nav`)
  - Botón superior CTA (`btn-top-cta`)
  - Footer completo: contacto, mapa del sitio, legales, horarios y "Powered by"
- Si quieres cambiar el texto o estructura del header/footer, se edita aquí.

### 1.3 Renderizado de módulos dinámicos y formularios
- Archivo: `assets/js/main.js`
- Contiene funciones de render:
  - `renderSocialProof`, `renderAdvantages`, `renderServices`, `renderDoctorInfo`, `renderResources`, `renderTestimonials`, `renderFaqs`
- Contiene lógica de formularios:
  - Citas: `setupAgendaModule`
  - Contacto: `setupContactForm`

## 2) Módulos por página

## 2.1 Inicio
- Archivo: `inicio/index.html`
- Secciones:
  - Hero principal (texto + imagen hero)
  - Apertura consultorio (CTA)
  - "Por qué elegirnos" + grid de ventajas dinámico (`advantages-grid`)
  - Servicios home dinámico (`home-services-grid`)
  - Perfil doctora (listas dinámicas `doctor-education-list` y `doctor-approach-list`)
  - Bloque de citas home
  - Testimonios dinámicos (`testimonial-slider` + botones prev/next)
  - Estadísticas dinámicas (`social-proof-grid`)
  - Bloque Instagram (cards estáticas)
  - Recursos home dinámico (`resources-home-grid`)
  - CTA final
- Editar aquí:
  - Textos y estructura específicos del home: `inicio/index.html`
  - Cards dinámicas (servicios, recursos, ventajas, testimonios): `assets/js/content-data.js`
  - Lógica de slider/testimonios: `assets/js/main.js`

## 2.2 Sobre la doctora
- Archivo: `sobre-la-doctora/index.html`
- Secciones:
  - Hero de presentación
  - Bloque enfoque clínico
  - Formación y principios (listas dinámicas)
  - Equipo en expansión dinámico (`future-team-grid`)
  - CTA final
- Editar aquí:
  - Textos propios de la página: `sobre-la-doctora/index.html`
  - Listas de formación/enfoque/equipo: `assets/js/content-data.js`

## 2.3 Servicios (landing)
- Archivo: `servicios-pediatricos/index.html`
- Secciones:
  - Hero
  - Grid dinámico de servicios (`services-grid`)
  - Bloques de apoyo y CTA
- Editar aquí:
  - Texto general: `servicios-pediatricos/index.html`
  - Títulos/resúmenes/bullets/enlaces de servicios: `assets/js/content-data.js`

## 2.4 Citas
- Archivo: `citas/index.html`
- Secciones:
  - Hero
  - Módulo agenda (`agenda-module`)
  - Disponibilidad dinámica (`agenda-date-list`, `agenda-slot-list`)
  - Formulario (`appointment-form`)
  - Confirmación (`appointment-confirmation`)
  - Historial local (`appointment-history`)
  - FAQ dinámico (`faq-list`)
- Editar aquí:
  - Layout/campos/labels del formulario: `citas/index.html`
  - Reglas de validación y envío: `assets/js/main.js` (`setupAgendaModule`)
  - Preguntas frecuentes: `assets/js/content-data.js` (`faqs`)

## 2.5 Recursos para padres (landing)
- Archivo: `recursos-para-padres/index.html`
- Secciones:
  - Hero
  - Grid dinámico de recursos (`resources-page-grid`)
  - CTA
- Editar aquí:
  - Texto estructural: `recursos-para-padres/index.html`
  - Cards de recursos: `assets/js/content-data.js` (`resources`)

## 2.6 Contacto
- Archivo: `contacto/index.html`
- Secciones:
  - Hero
  - Canales de contacto
  - Horario
  - Formulario (`contact-form`)
  - Mensaje de confirmación (`contact-confirmation`)
- Editar aquí:
  - Labels, temas del select y copy del formulario: `contacto/index.html`
  - Validación/envío a API o fallback mailto: `assets/js/main.js` (`setupContactForm`)

## 2.7 404 y legales
- Archivos:
  - `404.html`
  - `politica-de-privacidad.html`
  - `terminos-y-condiciones.html`
- Edición:
  - Todo el contenido es estático en cada archivo.

## 2.9 Páginas de detalle (estáticas)

### Servicios detalle
- `servicios/consulta-pediatrica-general.html`
- `servicios/control-crecimiento-desarrollo.html`
- `servicios/seguimiento-medico-preventivo.html`
- `servicios/vacunacion-infantil.html`
- Contienen hero + sección principal + CTA.

### Recursos detalle
- `recursos/calendario-vacunacion.html`
- `recursos/guia-fiebre-infantil.html`
- `recursos/alimentacion-por-etapas.html`
- Contienen hero + contenido guía + CTA.

## 3) Dónde editar según el tipo de cambio

- Cambiar teléfono, WhatsApp, email, dirección, Instagram, horarios:
  - `assets/js/content-data.js` -> `clinic`

- Cambiar menú principal o links del footer:
  - `assets/js/content-data.js` -> `nav` y `legalLinks`

- Cambiar cards de servicios en home y landing de servicios:
  - `assets/js/content-data.js` -> `services`

- Cambiar cards de recursos en home y landing de recursos:
  - `assets/js/content-data.js` -> `resources`

- Cambiar testimonios:
  - `assets/js/content-data.js` -> `testimonials`

- Cambiar FAQ de citas:
  - `assets/js/content-data.js` -> `faqs`

- Cambiar estructura/orden de secciones de una página:
  - Edita el HTML de esa página (`inicio/index.html`, `citas/index.html`, etc.)

- Cambiar validaciones o flujo de formularios:
  - `assets/js/main.js`

- Cambiar header/footer global (markup):
  - `assets/js/layout.js`

- Cambiar estilos visuales globales:
  - `assets/css/styles.css`

## 4) Guía rápida de imágenes

- Logo/isotipo global:
  - `assets/img/isotipo.png`

- Hero principal home:
  - `assets/img/drkatherinecpediatrics.png`

- Las cards dinámicas de servicios usan isotipo por defecto desde `serviceCardTemplate` en `assets/js/main.js`.
  - Si quieres una imagen distinta por servicio, hay que extender `services` en `content-data.js` con un campo de imagen y ajustar `serviceCardTemplate`.

## 5) Regla práctica para evitar errores

1. Si el contenido se repite en varias páginas, edítalo en `assets/js/content-data.js`.
2. Si solo afecta una página específica, edita su `.html`.
3. Si rompe validación de formulario o interacciones, revisa `assets/js/main.js`.
4. Antes de subir cambios: `npm run validate`.
