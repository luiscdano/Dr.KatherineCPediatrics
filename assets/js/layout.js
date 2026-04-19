(function () {
  var data = window.DR_KATHERINE_DATA;
  var utils = window.DR_KATHERINE_UTILS || {};
  var localUrl = typeof utils.localUrl === "function" ? utils.localUrl : function (path) { return path; };
  if (!data) {
    return;
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

  function legalLinksTemplate() {
    if (!Array.isArray(data.legalLinks) || !data.legalLinks.length) {
      return "";
    }
    return (
      '<div class="footer-legal">' +
      "<h3>Legal</h3>" +
      '<ul class="footer-legal-list">' +
      data.legalLinks
        .map(function (item) {
          return '<li><a href="' + localUrl(item.href) + '">' + item.label + "</a></li>";
        })
        .join("") +
      "</ul>" +
      "</div>"
    );
  }

  if (headerHost) {
    headerHost.innerHTML =
      '<header class="site-header" id="inicio">' +
      '  <div class="site-notice" role="status">' +
      '    <p>' + data.clinic.emergencyNotice + "</p>" +
      "  </div>" +
      '  <div class="shell">' +
      '    <a class="brand" href="' + localUrl("/index.html") + '" aria-label="Ir al inicio de ' + data.siteName + '">' +
      '      <img src="' + localUrl("/assets/img/isotipo.png") + '" alt="Isotipo ' + data.siteName + '" width="58" height="58" loading="eager" />' +
      '      <span class="brand-copy">' +
      '        <strong>' + data.clinic.name + '</strong>' +
      '        <small>Pediatría</small>' +
      '      </span>' +
      '    </a>' +
      '    <button class="menu-toggle" id="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav">' +
      '      <span></span><span></span><span></span>' +
      '      <span class="sr-only">Abrir menú</span>' +
      '    </button>' +
      '    <nav class="site-nav" id="site-nav" aria-label="Navegación principal">' + navTemplate() + "</nav>" +
      '    <a class="btn btn-primary btn-top-cta" href="' + localUrl("/citas.html") + '">Agendar cita</a>' +
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
      legalLinksTemplate() +
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
      '      <a class="btn btn-secondary" href="' + localUrl("/citas.html") + '">Citas en línea</a>' +
      "    </section>" +
      "  </div>" +
      '  <div class="shell footer-bottom">' +
      '    <p>© <span id="current-year"></span> ' + data.siteName + '. Todos los derechos reservados.</p>' +
      '    <p class="footer-disclaimer">Este sitio ofrece información general y no sustituye una evaluación médica presencial.</p>' +
      '    <div class="powered-by">' +
      '      <span>Powered by</span>' +
      '      <a class="footer-cmlayer-link" href="https://cmlayer.com" target="_blank" rel="noopener noreferrer" aria-label="Ir a CmLayer">' +
      '        <span class="footer-cmlayer-logo" aria-hidden="true"></span>' +
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
