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

Alternativa para levantar API principal + backend WhatsApp + frontend estático con un solo comando:

```bash
npm run up:all
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
docker compose -f docker-compose.yml -f docker-compose.override.local.yml up --build -d
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
- Endpoints de autenticación admin:
  - `POST /api/v1/admin/auth/login`
  - `GET /api/v1/admin/auth/me`
  - `POST /api/v1/admin/auth/logout`
- Endpoints admin (sesión por cookie `httpOnly` + CSRF, o `Authorization: Bearer`, o `x-admin-key` legado):
  - `GET /api/v1/admin/appointments`
  - `PATCH /api/v1/admin/appointments/:id/status`
  - `GET /api/v1/admin/contact-messages`
  - `GET /api/v1/admin/metrics?from=YYYY-MM-DD&to=YYYY-MM-DD`
  - `GET /api/v1/admin/metrics/timeseries?from=YYYY-MM-DD&to=YYYY-MM-DD`
  - `GET /api/v1/admin/metrics/export.csv?from=YYYY-MM-DD&to=YYYY-MM-DD`
  - `GET /api/v1/ops/metrics` (requiere `x-ops-key`)
- Contrato detallado: `API.md`
- Override opcional de API en navegador (debug): `window.DR_KATHERINE_API_BASE`
- Docker API + DB: `docker-compose.api.yml`
- Docker WhatsApp local override (puerto DB host 55433): `whatsapp-backend/docker-compose.override.local.yml`
- Checklist de activación final con cliente: `CHECKLIST_CLIENTE_WHATSAPP.md`
- Dashboard visual admin: `/admin/` (login con contraseña admin)
- Operación unificada:
  - `npm run up:all`
  - `npm run down:all`
  - `npm run logs:all`
  - `npm run staging:up`
  - `npm run staging:down`
  - `npm run monitor:health`
  - `npm run release:check`

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

### Variables de acceso admin en `server/`

En `.env` del proyecto principal:

- `ADMIN_DASHBOARD_PASSWORD=<password_segura_para_panel>`
- `ADMIN_SESSION_SECRET=<secret_largo_para_firmar_jwt>`
- `ADMIN_SESSION_TTL_MINUTES=480`
- `ADMIN_LOGIN_RATE_LIMIT_WINDOW_MS=900000`
- `ADMIN_LOGIN_RATE_LIMIT_MAX=10`
- `ADMIN_SESSION_COOKIE_NAME=drk_admin_session`
- `ADMIN_CSRF_COOKIE_NAME=drk_admin_csrf`
- `ADMIN_COOKIE_SECURE=true` (en producción)
- `ADMIN_COOKIE_SAMESITE=strict`
- `ADMIN_COOKIE_DOMAIN=<opcional>`
- `ADMIN_COOKIE_PATH=/api/v1/admin`
- `ADMIN_ENFORCE_CSRF=true`
- `ADMIN_ALLOWED_IPS=<lista opcional de IP/CIDR>`
- `ADMIN_API_KEY=<opcional_para_compatibilidad_legacy_y_fallback_temporal>`

### Variables de observabilidad en `server/`

En `.env` del proyecto principal:

- `OPS_METRICS_ENABLED=true`
- `OPS_METRICS_KEY=<clave_para_endpoint_ops>`
- `ALERT_WEBHOOK_URL=<webhook_slack_discord_teams_opcional>`
- `ALERT_COOLDOWN_MS=300000`
- `OPS_HEALTH_URLS=<urls_para_check_automatico_separadas_por_coma>`
- `LOG_LEVEL=info`
- `LOG_DIR=server/logs`

### Flujo recomendado de release

- Checklist técnico: `RELEASE_CHECKLIST.md`
- Ejecuta antes de publicar:

```bash
npm run validate
npm run release:check
OPS_HEALTH_URLS="http://127.0.0.1:8787/api/v1/health,http://127.0.0.1:3000/health" npm run monitor:health
```

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
- `.github/workflows/staging-readiness.yml`
- `.github/workflows/ops-monitor.yml`

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
