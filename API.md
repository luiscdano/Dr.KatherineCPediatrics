# API Contract (v1)

Base URL esperada en producción:

- `https://api.drkatherinecpediatrics.com`

## Health

- `GET /api/v1/health`

## Citas

- `GET /api/v1/appointments/taken?date=YYYY-MM-DD`
- `POST /api/v1/appointments`

Body (`POST /appointments`):

```json
{
  "date": "2026-04-24",
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

## Contacto

- `POST /api/v1/contact-messages`

## Pre-cita (mini asistente)

- `POST /api/v1/pre-visit-assessments`

Body:

```json
{
  "patientName": "Juan Perez",
  "patientAge": 4,
  "guardianName": "Maria Perez",
  "guardianPhone": "849-564-6212",
  "primaryReason": "Fiebre desde ayer",
  "symptoms": "Fiebre intermitente, congestión y poco apetito.",
  "feverCelsius": 38.7,
  "painLevel": 4,
  "durationHours": 18,
  "allergies": "No conocidas",
  "medications": "Paracetamol pediátrico",
  "privacyConsent": true,
  "companyWebsite": ""
}
```

Respuesta (`201`):

```json
{
  "ok": true,
  "data": {
    "assessment": {
      "id": "uuid",
      "urgencyLevel": "medium",
      "recommendedChannel": "priority_visit",
      "triageSummary": "Fiebre presente. Síntomas por más de 24 horas."
    },
    "advisory": "Recomendamos consulta pediátrica prioritaria en las próximas 24 horas."
  }
}
```

## Recursos premium (descargas con tracking)

- `POST /api/v1/resource-downloads`

Body:

```json
{
  "resourceKey": "fiebre-24h-kit",
  "parentName": "Maria Perez",
  "parentEmail": "maria@email.com",
  "childAgeGroup": "1-3a",
  "privacyConsent": true,
  "companyWebsite": ""
}
```

Respuesta (`201`):

```json
{
  "ok": true,
  "data": {
    "eventId": "uuid",
    "resource": {
      "key": "fiebre-24h-kit",
      "title": "Kit Fiebre 24H",
      "downloadUrl": "/assets/downloads/fiebre-24h-kit.txt"
    }
  }
}
```

## Una prioridad (fotos + urgencia)

- `POST /api/v1/triage/cases`

Body:

```json
{
  "patientName": "Juan Perez",
  "patientAge": 4,
  "guardianName": "Maria Perez",
  "guardianPhone": "849-564-6212",
  "guardianEmail": "maria@email.com",
  "title": "Golpe con inflamación",
  "description": "Golpe en antebrazo derecho hace 2 horas, dolor moderado y enrojecimiento.",
  "feverCelsius": null,
  "painLevel": 5,
  "durationHours": 2,
  "hasAllergies": false,
  "allergyDetails": "",
  "warningSigns": ["severe_pain"],
  "photos": [
    {
      "originalName": "brazo.jpg",
      "mimeType": "image/jpeg",
      "dataBase64": "..."
    }
  ],
  "privacyConsent": true,
  "companyWebsite": ""
}
```

Respuesta (`201`):

```json
{
  "ok": true,
  "data": {
    "triageCase": {
      "id": "uuid",
      "urgencyLevel": "medium",
      "urgencyScore": 29,
      "urgencyReason": "Dolor moderado.",
      "status": "new"
    },
    "recommendedChannel": "priority_visit",
    "advisory": "Recomendamos consulta pediátrica prioritaria en las próximas 24 horas."
  }
}
```

## Auth admin

- `POST /api/v1/admin/auth/login`
- `GET /api/v1/admin/auth/me`
- `POST /api/v1/admin/auth/logout`

Notas de seguridad admin:

- Login abre sesión por cookie `httpOnly` (`drk_admin_session`).
- Cookie CSRF (`drk_admin_csrf`) para mutaciones por cookie.
- En mutaciones por cookie enviar `x-csrf-token`.
- Compatibilidad con `Authorization: Bearer <token>` y `x-admin-key` legado.

## Admin (requieren auth admin)

### Operación existente

- `GET /api/v1/admin/appointments`
- `PATCH /api/v1/admin/appointments/:id/status`
- `GET /api/v1/admin/contact-messages`
- `GET /api/v1/admin/metrics?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/v1/admin/metrics/timeseries?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/v1/admin/metrics/export.csv?from=YYYY-MM-DD&to=YYYY-MM-DD`

### Nuevos módulos

- `GET /api/v1/admin/pre-visit-assessments?urgencyLevel=&guardianPhone=&limit=`
- `GET /api/v1/admin/resource-downloads?resourceKey=&limit=`
- `GET /api/v1/admin/triage/cases?status=new,in_review&urgencyLevel=&guardianPhone=&limit=`
- `GET /api/v1/admin/triage/cases/:id`
- `PATCH /api/v1/admin/triage/cases/:id/status`
- `POST /api/v1/admin/triage/cases/:id/respond`
- `GET /api/v1/admin/triage/patient-history?guardianPhone=&limit=`
- `GET /api/v1/admin/whatsapp-reminders?status=&appointmentId=&limit=`

Body ejemplo (`POST /api/v1/admin/triage/cases/:id/respond`):

```json
{
  "template": "seguimiento_24h",
  "note": "Mantener observación y agendar consulta de control.",
  "status": "follow_up",
  "followUpHours": 24
}
```

## Recordatorios WhatsApp automáticos

Al crear una cita, el backend programa recordatorios en `whatsapp_reminders`:

- `confirmation`
- `reminder_24h`
- `reminder_2h`

Al marcar cita `no_show`, programa `no_show_recovery`.

Controlado por variables:

- `WHATSAPP_REMINDERS_ENABLED`
- `WHATSAPP_REMINDER_TICK_MS`
- `WHATSAPP_REMINDER_BATCH_SIZE`

## Ops

- `GET /api/v1/ops/metrics`
- Header requerido: `x-ops-key: <OPS_METRICS_KEY>`

Incluye estado del worker de recordatorios y métricas de negocio extendidas.
