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
- `GET /api/v1/admin/metrics?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/v1/admin/metrics/timeseries?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/v1/admin/metrics/export.csv?from=YYYY-MM-DD&to=YYYY-MM-DD`

Estados permitidos para cita:

- `pending`
- `confirmed`
- `completed`
- `cancelled`
- `no_show`

### Ejemplo respuesta `GET /api/v1/admin/metrics`

```json
{
  "ok": true,
  "data": {
    "range": {
      "from": "2026-03-24",
      "to": "2026-04-22"
    },
    "kpis": {
      "appointmentsTotal": 42,
      "contactsTotal": 37,
      "busySlots": 31,
      "slotCapacity": 360,
      "occupancyRate": 8.61,
      "conversionRate": 113.51,
      "noShowRate": 4.76,
      "avgLeadHours": 68.2
    },
    "appointmentsByStatus": {
      "pending": 10,
      "confirmed": 16,
      "completed": 12,
      "cancelled": 2,
      "no_show": 2
    },
    "contactsByTopic": [
      { "topic": "agenda", "total": 14 },
      { "topic": "seguimiento", "total": 12 }
    ],
    "statusTransitions": [
      { "status": "confirmed", "total": 18 },
      { "status": "completed", "total": 9 }
    ]
  }
}
```
