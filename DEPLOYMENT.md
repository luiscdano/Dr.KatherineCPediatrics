# Deployment Runbook (GitHub Pages + Dominio)

## 1) Prerrequisitos

1. Repositorio con `main` como rama de publicación.
2. GitHub Pages configurado en `Settings -> Pages` con `Source: GitHub Actions`.
3. Dominio objetivo definido: `drkatherinecpediatrics.com`.

## 2) Validación local antes de publicar

```bash
npm run validate
```

Este comando bloquea publicación si detecta:

1. Errores de sintaxis JavaScript.
2. Enlaces internos rotos.
3. Placeholders o referencias externas no permitidas.
4. Metadatos SEO base faltantes.
5. Inconsistencia entre `CNAME`, `robots.txt`, `sitemap.xml` y `canonical`.

## 3) Configuración DNS recomendada

En tu proveedor DNS, configura:

1. Registros `A` para apex `drkatherinecpediatrics.com`:
   1. `185.199.108.153`
   2. `185.199.109.153`
   3. `185.199.110.153`
   4. `185.199.111.153`
2. Registro `CNAME` para `www` -> `<usuario>.github.io`.

## 4) Publicación

1. Hacer `push` a `main`.
2. Workflow `Deploy to GitHub Pages` ejecuta:
   1. `validate`
   2. `build`
   3. `deploy`
3. Verificar URL publicada en `Actions` y en `Settings -> Pages`.

## 5) Verificación post-deploy

1. `https://drkatherinecpediatrics.com` responde por HTTPS sin advertencias.
2. `https://drkatherinecpediatrics.com/robots.txt` disponible.
3. `https://drkatherinecpediatrics.com/sitemap.xml` disponible.
4. Rutas críticas responden `200`:
   1. `/`
   2. `/agenda-tu-cita.html`
   3. `/contacto.html`
5. Ruta inválida responde con `404.html` de marca.

## 6) Riesgos comunes

1. Dominio sin `CNAME` en repo: puede perderse en redeploy.
2. DNS incompleto o no propagado: rompe resolución del dominio.
3. Cambios de contenido sin actualizar sitemap/canonical: riesgo SEO.
4. Publicar sin pasar validaciones: riesgo de enlaces rotos en producción.
