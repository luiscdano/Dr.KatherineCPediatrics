# WhatsApp Business Cloud Backend

Backend modular para Meta WhatsApp Cloud API, listo para producción y diseñado para integrarse con el proyecto principal de Dr. Katherine C Pediatrics.

## Capacidades

- Webhook de entrada (`GET /webhook`, `POST /webhook`)
- Validación de firma HMAC de Meta (`X-Hub-Signature-256`)
- API interna para envíos (`POST /api/messages`)
- Chatbot extensible por estrategias (`hola`, `info`, `precio`, `fallback`)
- Persistencia en Postgres con migraciones SQL
- Seguridad: Helmet, CORS, rate limiting, API key interna, error handler central
- Logging estructurado con Winston

## Estructura

```text
whatsapp-backend/
├── src/
│   ├── app.js
│   ├── server.js
│   ├── config/
│   ├── controllers/
│   ├── database/
│   │   └── migrations/
│   ├── middlewares/
│   ├── repositories/
│   │   └── adapters/
│   ├── routes/
│   ├── scripts/
│   │   └── migrate.js
│   ├── services/
│   └── utils/
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

## Variables de entorno

Usa `.env.example` como base:

- `WHATSAPP_TOKEN`
- `PHONE_NUMBER_ID`
- `VERIFY_TOKEN`
- `APP_SECRET`
- `INTERNAL_API_KEY`
- `DB_PROVIDER` (`postgres` o `memory`)
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL`
- `PORT`, `CORS_ORIGINS`, `LOG_LEVEL`, límites de rate limiting

## Ejecución local (Node)

```bash
cd whatsapp-backend
cp .env.example .env
npm install
npm run migrate
npm run dev
```

Health check:

```bash
curl http://localhost:3000/health
```

## Ejecución con Docker

```bash
cd whatsapp-backend
cp .env.example .env
docker compose -f docker-compose.yml -f docker-compose.override.local.yml up --build -d
```

El `docker-compose` levanta:

- `app` (backend)
- `db` (Postgres 16)

Y ejecuta migraciones automáticamente antes de iniciar la app.

Nota: `docker-compose.override.local.yml` expone Postgres en host `55433` para evitar conflicto con la base de datos del backend principal.

## Endpoints

- `GET /health`
- `GET /webhook`
- `POST /webhook`
- `POST /api/messages` (requiere `x-internal-api-key`)

Ejemplo de envío interno:

```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -H "x-internal-api-key: replace_with_internal_api_key" \
  -d '{
    "to": "18095550123",
    "message": "Nueva cita web recibida"
  }'
```

## Exponer webhook local con ngrok

```bash
ngrok http 3000
```

Luego configura en Meta:

- Callback URL: `https://<tu-subdominio>.ngrok-free.app/webhook`
- Verify Token: valor de `VERIFY_TOKEN`

## Integración con el backend principal

Este servicio está pensado para ser consumido por `server/` del proyecto principal usando:

- `WHATSAPP_BACKEND_BASE_URL`
- `WHATSAPP_BACKEND_API_KEY`
- `WHATSAPP_CLINIC_RECIPIENT`

El backend principal envía automáticamente notificaciones de:

- nuevas citas
- nuevos mensajes de contacto

cuando `WHATSAPP_AUTOMATION_ENABLED=true`.
