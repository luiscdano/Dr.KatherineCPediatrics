# Deployment Runbook (Frontend + API + Dominio)

## 1) Arquitectura objetivo

1. Frontend estático en `https://drkatherinecpediatrics.com` (GitHub Pages).
2. API backend en `https://api.drkatherinecpediatrics.com` (Node.js/Express en Render/Railway/Fly.io).
3. DNS separado para frontend y API.

## 2) Variables de entorno API

Usa `.env.example` como base y configura en tu plataforma cloud:

1. `PORT` y `HOST`.
2. `DATA_FILE` o volumen persistente.
3. `CORS_ORIGIN` con dominios reales:
   1. `https://drkatherinecpediatrics.com`
   2. `https://www.drkatherinecpediatrics.com`
4. `ADMIN_API_KEY` fuerte y privado.
5. `RATE_LIMIT_WINDOW_MS` y `RATE_LIMIT_MAX`.

## 3) Validación local antes de publicar

```bash
npm run validate
```

Este comando bloquea publicación si detecta:

1. Errores de sintaxis JavaScript.
2. Enlaces internos rotos.
3. Placeholders o referencias externas no permitidas.
4. Metadatos SEO base faltantes.
5. Inconsistencia entre `CNAME`, `robots.txt`, `sitemap.xml` y `canonical`.

## 4) Configuración DNS recomendada

En tu proveedor DNS, configura:

1. Registros `A` para apex `drkatherinecpediatrics.com`:
   1. `185.199.108.153`
   2. `185.199.109.153`
   3. `185.199.110.153`
   4. `185.199.111.153`
2. Registro `CNAME` para `www` -> `<usuario>.github.io`.
3. Registro `CNAME` para `api` -> `<tu-backend-cloud-hostname>`.

## 5) Publicación frontend (GitHub Pages)

1. Hacer `push` a `main`.
2. Workflow `Deploy to GitHub Pages` ejecuta:
   1. `validate`
   2. `build`
   3. `deploy`
3. Verificar URL publicada en `Actions` y `Settings -> Pages`.

## 6) Publicación API (Node.js)

1. Crear servicio backend en plataforma cloud.
2. Comando de build:

```bash
npm install
```

3. Comando de inicio:

```bash
npm run start:api
```

4. Cargar variables `.env` en la plataforma.
5. Verificar `GET /api/v1/health`.

## 7) Verificación post-deploy

1. Frontend responde por HTTPS:
   1. `https://drkatherinecpediatrics.com`
2. API responde por HTTPS:
   1. `https://api.drkatherinecpediatrics.com/api/v1/health`
3. Recursos SEO:
   1. `https://drkatherinecpediatrics.com/robots.txt`
   2. `https://drkatherinecpediatrics.com/sitemap.xml`
4. Flujos críticos:
   1. Enviar solicitud de cita (crea registro en API).
   2. Enviar mensaje de contacto (crea registro en API).
5. Ruta inválida del frontend responde con `404.html`.

## 8) Riesgos comunes

1. Frontend desplegado sin API activa: formularios fallan en producción.
2. `CORS_ORIGIN` incompleto: bloqueos de navegador en `fetch`.
3. Sin persistencia real en backend: pérdida de datos tras reinicio.
4. Sin `ADMIN_API_KEY` fuerte: riesgo de acceso no autorizado.
5. Publicar sin pasar validaciones: riesgo de regresiones en producción.
