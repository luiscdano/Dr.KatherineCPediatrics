# Production Environment Setup

1. Copia el archivo de ejemplo:

```bash
cp deploy/production/.env.production.example deploy/production/.env.production
```

2. Reemplaza los placeholders obligatorios:
- `ADMIN_DASHBOARD_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `ADMIN_ALLOWED_IPS`
- `OPS_METRICS_KEY`
- `ALERT_WEBHOOK_URL`
- `DB_PASSWORD`
- variables reales de WhatsApp/Meta

3. Validaciones recomendadas antes de publicar:

```bash
npm run validate
npm run release:check
```

4. Confirma endurecimiento admin en producción:
- `ADMIN_COOKIE_SECURE=true`
- `ADMIN_ALLOWED_IPS` con IPs públicas reales
