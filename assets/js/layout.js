(function () {
  var data = window.DR_KATHERINE_DATA;
  if (!data) {
    return;
  }

  function getBasePath() {
    var host = window.location.hostname || "";
    var pathname = window.location.pathname || "/";
    if (host.endsWith("github.io")) {
      var segments = pathname.split("/").filter(Boolean);
      if (segments.length > 0) {
        return "/" + segments[0];
      }
    }
    return "";
  }

  function localUrl(path) {
    if (typeof path !== "string") {
      return path;
    }
    if (!path.startsWith("/")) {
      return path;
    }
    return getBasePath() + path;
  }

  var page = document.body.getAttribute("data-page") || "";
  var headerHost = document.getElementById("site-header");
  var footerHost = document.getElementById("site-footer");

  function navTemplate() {
    return data.nav
      .map(function (item) {
        var activeClass = item.key === page ? " is-active" : "";
        return '<a class="site-nav-link' + activeClass + '" href="' + localUrl(item.href) + '">' + item.label + "</a>";
      })
      .join("");
  }

  if (headerHost) {
    headerHost.innerHTML =
      '<header class="site-header" id="inicio">' +
      '  <div class="shell">' +
      '    <a class="brand" href="' + localUrl("/index.html") + '" aria-label="Ir al inicio de ' + data.siteName + '">' +
      '      <img src="' + localUrl("/assets/img/isotipo.png") + '" alt="Isotipo ' + data.siteName + '" width="58" height="58" loading="eager" />' +
      '      <span class="brand-copy">' +
      '        <strong>' + data.clinic.name + '</strong>' +
      '        <small>Pediatrics</small>' +
      '      </span>' +
      '    </a>' +
      '    <button class="menu-toggle" id="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav">' +
      '      <span></span><span></span><span></span>' +
      '      <span class="sr-only">Abrir menú</span>' +
      '    </button>' +
      '    <nav class="site-nav" id="site-nav" aria-label="Navegación principal">' + navTemplate() + "</nav>" +
      '    <a class="btn btn-primary btn-top-cta" href="' + localUrl("/agenda-tu-cita.html") + '">Agendar cita</a>' +
      "  </div>" +
      "</header>";
  }

  if (footerHost) {
    footerHost.innerHTML =
      '<footer class="site-footer">' +
      '  <div class="shell footer-grid">' +
      '    <section class="footer-main">' +
      '      <h2>' + data.siteName + '</h2>' +
      '      <p>Cuidado pediátrico profesional y cercano para cada etapa de la infancia.</p>' +
      '      <ul class="footer-contact-list">' +
      '        <li><a href="' + data.clinic.phoneHref + '">' + data.clinic.phoneDisplay + '</a></li>' +
      '        <li><a href="mailto:' + data.clinic.email + '">' + data.clinic.email + '</a></li>' +
      '        <li>' + data.clinic.address + '</li>' +
      '        <li><a href="' + data.clinic.mapsUrl + '" target="_blank" rel="noopener noreferrer">Google Maps</a></li>' +
      '        <li><a href="' + data.clinic.instagramUrl + '" target="_blank" rel="noopener noreferrer">Instagram</a></li>' +
      '      </ul>' +
      "    </section>" +
      '    <section class="footer-links">' +
      '      <h3>Mapa del sitio</h3>' +
      "      <ul>" +
      data.nav
        .map(function (item) {
          return '<li><a href="' + localUrl(item.href) + '">' + item.label + "</a></li>";
        })
        .join("") +
      "      </ul>" +
      "    </section>" +
      '    <section class="footer-hours">' +
      '      <h3>Horarios</h3>' +
      "      <ul>" +
      data.clinic.officeHours
        .map(function (slot) {
          return "<li>" + slot + "</li>";
        })
        .join("") +
      "      </ul>" +
      '      <a class="btn btn-secondary" href="' + localUrl("/agenda-tu-cita.html") + '">Agenda en linea</a>' +
      "    </section>" +
      "  </div>" +
      '  <div class="shell footer-bottom">' +
      '    <p>© <span id="current-year"></span> ' + data.siteName + '. Todos los derechos reservados.</p>' +
      '    <div class="powered-by">' +
      '      <span>Powered by</span>' +
      '      <a class="footer-cmlayer-link" href="https://cmlayer.com" target="_blank" rel="noopener noreferrer" aria-label="Ir a CmLayer">' +
      '        <img class="footer-cmlayer-logo" src="' + localUrl("/assets/img/B01.png") + '" alt="Isotipo B01 de CmLayer" width="54" height="54" loading="lazy" />' +
      '        <span>CmLayer</span>' +
      "      </a>" +
      "    </div>" +
      "  </div>" +
      "</footer>";
  }

  var yearNode = document.getElementById("current-year");
  if (yearNode) {
    yearNode.textContent = String(new Date().getFullYear());
  }

  var menuBtn = document.getElementById("menu-toggle");
  var nav = document.getElementById("site-nav");

  if (menuBtn && nav) {
    menuBtn.addEventListener("click", function () {
      var opened = menuBtn.getAttribute("aria-expanded") === "true";
      menuBtn.setAttribute("aria-expanded", String(!opened));
      nav.classList.toggle("is-open");
      document.body.classList.toggle("menu-open", !opened);
    });

    nav.addEventListener("click", function (event) {
      if (event.target && event.target.classList.contains("site-nav-link")) {
        nav.classList.remove("is-open");
        menuBtn.setAttribute("aria-expanded", "false");
        document.body.classList.remove("menu-open");
      }
    });
  }
})();
