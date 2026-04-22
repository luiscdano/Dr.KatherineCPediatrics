# Dr. Katherine C Pediatrics

Sitio web multipágina para consultorio pediátrico, diseñado con arquitectura modular y enfoque de conversión (solicitud de citas), inspirado en la estructura de Paedia y adaptado a la identidad visual de la marca.

## Estructura principal

- `inicio/index.html` - Home (módulo Inicio)
- `index.html` - redirección de raíz hacia `/inicio/`
- `sobre-la-doctora/index.html`
- `servicios-pediatricos/index.html`
- `citas/index.html`
- `recursos-para-padres/index.html`
- `blog.html`
- `contacto/index.html`
- `politica-de-privacidad.html`
- `terminos-y-condiciones.html`
- `servicios/` - páginas de detalle por servicio
- `recursos/` - recursos educativos
- `blog/` - artículos

## Stack

- HTML semántico
- CSS responsive (sin framework)
- JavaScript vanilla para:
  - utilidades compartidas de rutas (`assets/js/utils.js`)
  - layout compartido (header/footer)
  - render de contenido modular
  - interacciones (menú móvil, testimonios, citas y formularios)
- API backend en Node.js/Express para:
  - persistencia de solicitudes de cita
  - recepción de mensajes de contacto
  - consulta de disponibilidad por fecha

## Configuración rápida

1. Instalar dependencias:

```bash
npm install
```

2. Levantar API local:

```bash
cp .env.example .env
npm run dev:api
```

3. Servir el frontend estático:

```bash
python3 -m http.server 8080
```

4. Abrir en navegador:

- `http://localhost:8080`

## Backend API (producción real)

- Entrada principal: `server/index.mjs`
- Persistencia JSON local (entorno dev): `server/data/submissions.json`
- Endpoints públicos:
  - `GET /api/v1/health`
  - `GET /api/v1/appointments/taken?date=YYYY-MM-DD`
  - `POST /api/v1/appointments`
  - `POST /api/v1/contact-messages`
- Endpoints admin (requieren `x-admin-key`):
  - `GET /api/v1/admin/appointments`
  - `PATCH /api/v1/admin/appointments/:id/status`
  - `GET /api/v1/admin/contact-messages`
- Contrato detallado: `API.md`
- Override opcional de API en navegador (debug): `window.DR_KATHERINE_API_BASE`

## Validaciones de calidad

Ejecuta los checks locales antes de subir cambios:

```bash
npm run validate
```

Incluye:

- sintaxis JavaScript
- enlaces internos en HTML
- guardas de contenido (sin placeholders ni dependencias externas)
- metadatos SEO base por página
- coherencia de dominio (`CNAME`, `robots.txt`, `sitemap.xml`, `canonical`)

## Citas integradas en el proyecto

La funcionalidad de citas está implementada dentro del propio sitio y conectada a backend:

- Selección de fecha y horario en `citas/index.html`
- Validación de cliente en `assets/js/main.js` y validación de servidor en `server/validation.mjs`
- Persistencia centralizada en API (`POST /api/v1/appointments`)
- Consulta de horarios ocupados por fecha (`GET /api/v1/appointments/taken`)
- Envío opcional del resumen por WhatsApp al consultorio
- Consentimiento de privacidad obligatorio en formularios críticos
- Validaciones de entrada reforzadas (teléfono, longitud mínima, anti-spam)

## Señales de operación real

- Aviso de emergencia visible en todo el sitio (header sticky)
- Páginas legales versionadas:
  - `politica-de-privacidad.html`
  - `terminos-y-condiciones.html`
- Disclaimer médico en footer y links legales persistentes

## Deploy automático (GitHub Pages)

Se agregaron workflows en:

- `.github/workflows/deploy-pages.yml`
- `.github/workflows/quality-checks.yml`

El deploy publica automáticamente en GitHub Pages cada `push` a `main`, pero solo si `npm run validate` pasa.

### Configuración inicial en GitHub (una sola vez)

1. En el repositorio, entra a `Settings` -> `Pages`.
2. En `Build and deployment`, selecciona `Source: GitHub Actions`.
3. El archivo `CNAME` ya está versionado con `drkatherinecpediatrics.com`. Si cambias de dominio, actualiza ese archivo.
4. En tu proveedor DNS, apunta el dominio a GitHub Pages (cuando hagas el cambio de dominio):
   - `A` para apex (`drkatherinecpediatrics.com`) a `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `CNAME` para `www` hacia `<tu-usuario>.github.io`
5. Haz push a `main` y revisa la ejecución en la pestaña `Actions`.

Guía operativa completa: `DEPLOYMENT.md`.

## Datos reales cargados

- Nombre profesional: `Dr. Katherine Cedano`
- Teléfono/WhatsApp: `(849) 564-6212`
- Dirección: `Edificio Centur, Blvd. 1ro. de Noviembre 407, Punta Cana 23000`
- Google Maps: URL oficial del consultorio
- Instagram: `https://www.instagram.com/drkatherinecpediatrics/`
- Datos centrales: `assets/js/content-data.js`

## SEO técnico

- Metadatos base por página (`title`, `description`, `canonical`)
- `robots.txt`
- `sitemap.xml`
- JSON-LD para clínica médica en la página principal

## Footer solicitado

Incluye en la parte derecha el bloque:

- `Powered by + isótopo + CmLayer`

Con enlace a `https://cmlayer.com`.
