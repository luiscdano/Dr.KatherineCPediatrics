# Checklist Cliente - Activacion Final WhatsApp

Usa este checklist cuando el cliente entregue credenciales de Meta.

## 1) Datos que deben llegar del cliente

- `APP_ID`
- `APP_SECRET`
- `WABA_ID`
- `PHONE_NUMBER_ID`
- `WHATSAPP_TOKEN` (token permanente)
- URL publica HTTPS para webhook (ejemplo: `https://api.drkatherinecpediatrics.com/webhook`)
- Numero destino interno del consultorio en formato E.164 (ejemplo: `18095550123`)

## 2) Variables a actualizar

### Archivo `.env` en raiz del proyecto (API principal)

- `WHATSAPP_AUTOMATION_ENABLED=true`
- `WHATSAPP_BACKEND_BASE_URL=http://localhost:3000` (o URL interna del servicio)
- `WHATSAPP_BACKEND_API_KEY=<internal_api_key_real>`
- `WHATSAPP_CLINIC_RECIPIENT=<numero_cliente_e164>`
- `WHATSAPP_NOTIFY_PARENT_ON_APPOINTMENT=<true|false>`

### Archivo `whatsapp-backend/.env`

- `VERIFY_TOKEN=<token_verificacion_webhook>`
- `WHATSAPP_TOKEN=<token_permanente_meta>`
- `PHONE_NUMBER_ID=<phone_number_id_meta>`
- `APP_SECRET=<app_secret_meta>`
- `INTERNAL_API_KEY=<internal_api_key_real>`

## 3) Activacion tecnica final

En raiz del proyecto:

```bash
npm run up:all
```

Para apagar todo:

```bash
npm run down:all
```

## 4) Configuracion en Meta Developers

- Callback URL: `https://<tu-dominio-publico>/webhook`
- Verify Token: mismo valor de `VERIFY_TOKEN`
- Suscripcion activa al campo `messages`

## 5) Prueba minima de aceptacion

```bash
curl -s http://127.0.0.1:8787/api/v1/health
curl -s http://127.0.0.1:3000/health
```

Verificar que ambos devuelven `"ok": true`.

Luego abrir:

- `http://localhost:8080/admin/`

e iniciar sesión con `ADMIN_DASHBOARD_PASSWORD` para validar que el dashboard muestra KPIs y series.
