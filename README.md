# Dr. Katherine C Pediatrics

Sitio web multipágina para consultorio pediátrico, diseñado con arquitectura modular y enfoque de conversión (agenda de citas), inspirado en la estructura de Paedia y adaptado a la identidad visual de la marca.

## Estructura principal

- `index.html` - Home
- `sobre-la-doctora.html`
- `servicios-pediatricos.html`
- `agenda-tu-cita.html`
- `recursos-para-padres.html`
- `blog.html`
- `contacto.html`
- `servicios/` - páginas de detalle por servicio
- `recursos/` - recursos educativos
- `blog/` - artículos

## Stack

- HTML semántico
- CSS responsive (sin framework)
- JavaScript vanilla para:
  - layout compartido (header/footer)
  - render de contenido modular
  - interacciones (menú móvil, testimonios, agenda y formularios)

## Configuración rápida

1. Servir el proyecto estático:

```bash
python3 -m http.server 8080
```

2. Abrir en navegador:

- `http://localhost:8080`

## Integración AgendaTuCita

La URL base del módulo está en:

- `assets/js/content-data.js` -> `clinic.agendaUrl`

Reemplaza ese valor por el endpoint o enlace final de AgendaTuCita para el consultorio.

## Deploy automático (GitHub Pages)

Se agregó workflow en:

- `.github/workflows/deploy-pages.yml`

Publica automáticamente en GitHub Pages cada `push` a `main`.

### Configuración inicial en GitHub (una sola vez)

1. En el repositorio, entra a `Settings` -> `Pages`.
2. En `Build and deployment`, selecciona `Source: GitHub Actions`.
3. Verifica que el archivo `CNAME` esté en la raíz con `drkatherinecpediatrics.com`.
4. En tu proveedor DNS, apunta el dominio a GitHub Pages:
   - `A` para apex (`drkatherinecpediatrics.com`) a `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `CNAME` para `www` hacia `<tu-usuario>.github.io`
5. Haz push a `main` y revisa la ejecución en la pestaña `Actions`.

## Datos reales cargados

- Nombre profesional: `Dr. Katherine Cedano`
- Teléfono/WhatsApp: `(849) 564-6212`
- Dirección: `Edificio Centur, Blvd. 1ro. de Noviembre 407, Punta Cana 23000`
- Google Maps: URL oficial del consultorio
- Instagram: `https://www.instagram.com/drkatherinecpediatrics/`
- Datos centrales: `assets/js/content-data.js`

## SEO técnico

- Metadatos base por página (`title`, `description`, `canonical`)
- `robots.txt`
- `sitemap.xml`
- JSON-LD para clínica médica en la página principal

## Footer solicitado

Incluye en la parte derecha el bloque:

- `Powered by + isótopo + CmLayer`

Con enlace a `https://cmlayer.com`.
