# Contributing Guide

## Scope

Este repositorio contiene el sitio web estatico de Dr. Katherine C Pediatrics.

## Workflow

1. Crea una rama desde `main`.
2. Implementa cambios pequenos y atomicos.
3. Ejecuta validaciones locales antes de abrir PR.
4. Abre pull request con contexto tecnico claro.

## Local Validation

```bash
npm run validate
```

## Pull Request Checklist

1. No romper rutas internas ni assets.
2. No introducir placeholders ni contenido provisional.
3. Mantener metadatos SEO base por pagina (`title`, `description`, `canonical`).
4. Confirmar que el flujo de agenda y contacto sigue funcional.

## Commit Messages

Usa prefijos consistentes:

- `feat:` nueva funcionalidad
- `fix:` correccion de bug
- `refactor:` mejora estructural sin cambio funcional
- `docs:` cambios de documentacion
- `chore:` tareas de mantenimiento
