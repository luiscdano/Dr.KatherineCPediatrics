# API Contract (v1)

Base URL esperada en producción:

- `https://api.drkatherinecpediatrics.com`

## Health

- `GET /api/v1/health`

Respuesta:

```json
{
  "ok": true,
  "data": {
    "service": "dr-katherine-api",
    "status": "up",
    "database": {
      "status": "up",
      "latencyMs": 3
    },
    "timestamp": "2026-04-19T02:00:00.000Z"
  }
}
```

## Consultar horarios ocupados

- `GET /api/v1/appointments/taken?date=YYYY-MM-DD`

Respuesta:

```json
{
  "ok": true,
  "data": {
    "date": "2026-04-20",
    "timesTaken": ["08:00", "09:30"]
  }
}
```

## Crear solicitud de cita

- `POST /api/v1/appointments`
- `Content-Type: application/json`

Body:

```json
{
  "date": "2026-04-20",
  "time": "09:30",
  "patientName": "Juan Perez",
  "patientAge": 4,
  "parentName": "Maria Perez",
  "parentPhone": "849-564-6212",
  "reason": "Control de fiebre de 24 horas.",
  "privacyConsent": true,
  "companyWebsite": ""
}
```

Respuesta exitosa (`201`):

```json
{
  "ok": true,
  "data": {
    "appointment": {
      "id": "uuid",
      "date": "2026-04-20",
      "time": "09:30",
      "status": "pending"
    }
  }
}
```

## Crear mensaje de contacto

- `POST /api/v1/contact-messages`
- `Content-Type: application/json`

Body:

```json
{
  "name": "Maria Perez",
  "phone": "849-564-6212",
  "email": "maria@email.com",
  "topic": "agenda",
  "message": "Quiero confirmar disponibilidad para esta semana.",
  "privacyConsent": true,
  "companyName": ""
}
```

Respuesta exitosa (`201`):

```json
{
  "ok": true,
  "data": {
    "message": {
      "id": "uuid",
      "topic": "agenda",
      "createdAt": "2026-04-19T02:00:00.000Z"
    }
  }
}
```

## Admin (requieren `x-admin-key`)

- `GET /api/v1/admin/appointments`
- `PATCH /api/v1/admin/appointments/:id/status`
- `GET /api/v1/admin/contact-messages`

Estados permitidos para cita:

- `pending`
- `confirmed`
- `completed`
- `cancelled`
- `no_show`
