# Release Checklist

## Pre-release

1. Confirmar contenido legal/comercial con cliente (texto, teléfonos, dirección, políticas).
2. Confirmar variables productivas en `.env` (sin secretos por defecto).
3. Ejecutar validaciones locales:

```bash
npm run validate
npm run release:check
```

4. Ejecutar smoke check de salud:

```bash
OPS_HEALTH_URLS="http://127.0.0.1:8787/api/v1/health,http://127.0.0.1:3000/health" npm run monitor:health
```

## Staging

1. Copiar y completar `deploy/staging/.env.staging.example` como `deploy/staging/.env.staging`.
2. Levantar staging local/espejo:

```bash
docker compose -f deploy/staging/docker-compose.staging.yml --env-file deploy/staging/.env.staging up --build -d
```

3. Validar:
- Frontend: `http://localhost:18080`
- API health: `http://localhost:18787/api/v1/health`
- WhatsApp backend health: `http://localhost:13000/health`

## Producción

1. Activar `ADMIN_COOKIE_SECURE=true` y definir `ADMIN_ALLOWED_IPS` para panel admin.
2. Definir `OPS_METRICS_KEY` y `ALERT_WEBHOOK_URL`.
3. Confirmar webhook de Meta y credenciales reales.
4. Ejecutar rollout y monitorear logs iniciales por 30 minutos.
