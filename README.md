# Dr. Katherine C Pediatrics

Sitio web multipágina para consultorio pediátrico, diseñado con arquitectura modular y enfoque de conversión (solicitud de citas), inspirado en la estructura de Paedia y adaptado a la identidad visual de la marca.

## Estructura principal

- `inicio/index.html` - Home (módulo Inicio)
- `index.html` - redirección de raíz hacia `/inicio/`
- `sobre-la-doctora/index.html`
- `servicios-pediatricos/index.html`
- `citas/index.html`
- `recursos-para-padres/index.html`
- `contacto/index.html`
- `politica-de-privacidad.html`
- `terminos-y-condiciones.html`
- `servicios/` - páginas de detalle por servicio
- `recursos/` - recursos educativos

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
- servicio dedicado de WhatsApp Business Cloud API en `whatsapp-backend/` para:
  - webhook de Meta
  - chatbot básico extensible
  - envío transaccional interno desde el backend principal

## Configuración rápida

1. Instalar dependencias:

```bash
npm install
```

2. Configurar variables del backend:

```bash
cp .env.example .env
```

3. Levantar PostgreSQL + API principal (Docker recomendado):

```bash
docker compose -f docker-compose.api.yml up --build -d
```

4. (Opcional) Migrar datos legacy desde JSON hacia PostgreSQL:

```bash
npm run seed:db
```

5. Levantar API local sin Docker (si ya tienes Postgres corriendo):

```bash
npm run migrate:db
npm run dev:api
```

6. Levantar backend de WhatsApp (opcional, recomendado para automatización):

```bash
cd whatsapp-backend
cp .env.example .env
npm install
npm run migrate
npm run dev
cd ..
```

7. Servir el frontend estático:

```bash
python3 -m http.server 8080
```

8. Abrir en navegador:

- `http://localhost:8080`

## Backend API (producción real)

- Entrada principal: `server/index.mjs`
- Persistencia principal: PostgreSQL
- Migraciones SQL versionadas: `server/db/migrations/`
- Script de migración: `npm run migrate:db`
- Script de seed legacy JSON -> DB: `npm run seed:db`
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
- Docker API + DB: `docker-compose.api.yml`

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
- Puente automático al servicio `whatsapp-backend` para notificar citas/mensajes
- Consentimiento de privacidad obligatorio en formularios críticos
- Validaciones de entrada reforzadas (teléfono, longitud mínima, anti-spam)

### Variables para automatización WhatsApp en `server/`

En `.env` del proyecto principal:

- `WHATSAPP_AUTOMATION_ENABLED=true`
- `WHATSAPP_BACKEND_BASE_URL=http://localhost:3000`
- `WHATSAPP_BACKEND_API_KEY=<internal_api_key_de_whatsapp_backend>`
- `WHATSAPP_CLINIC_RECIPIENT=<numero_destino_en_formato_whatsapp>`
- `WHATSAPP_NOTIFY_PARENT_ON_APPOINTMENT=false` (opcional)

### Variables de base de datos en `server/`

En `.env` del proyecto principal:

- `DB_HOST=127.0.0.1`
- `DB_PORT=55432`
- `DB_NAME=dr_katherine`
- `DB_USER=postgres`
- `DB_PASSWORD=<secreto_fuerte>`
- `DB_SSL=false`
- `DB_RUN_MIGRATIONS_ON_START=true`
- `DATA_FILE=server/data/submissions.json` (solo para `npm run seed:db`)

Con `docker-compose.api.yml`, la API dentro del contenedor usa `DB_HOST=db` y `DB_PORT=5432` de forma interna.

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
