(function () {
  var data = window.DR_KATHERINE_DATA;
  var utils = window.DR_KATHERINE_UTILS || {};
  var localUrl = typeof utils.localUrl === "function" ? utils.localUrl : function (path) { return path; };
  var i18n = window.DR_KATHERINE_I18N || null;
  var brandAssetVersion = "20260420-03";
  if (!data) {
    return;
  }

  var page = document.body.getAttribute("data-page") || "";
  var headerHost = document.getElementById("site-header");
  var footerHost = document.getElementById("site-footer");
  var SUPPORTED_LANGS = {
    en: true,
    es: true,
    fr: true
  };

  function formatTemplate(template, params) {
    var source = String(template || "");
    if (!params || typeof params !== "object") {
      return source;
    }
    return source.replace(/\{([a-zA-Z0-9_]+)\}/g, function (_match, key) {
      if (!Object.prototype.hasOwnProperty.call(params, key)) {
        return "";
      }
      return String(params[key] == null ? "" : params[key]);
    });
  }

  function currentLang() {
    if (i18n && typeof i18n.getLanguage === "function") {
      return i18n.getLanguage();
    }
    return "en";
  }

  function t(text) {
    var source = String(text || "");
    if (!source) {
      return source;
    }
    if (i18n && typeof i18n.translateText === "function") {
      return i18n.translateText(source, currentLang());
    }
    return source;
  }

  function tk(key, fallback, params) {
    var keyed = "";
    if (i18n && typeof i18n.tKey === "function") {
      keyed = i18n.tKey(key, params || {}, currentLang());
    }
    if (keyed) {
      return keyed;
    }
    return formatTemplate(t(fallback || ""), params || {});
  }

  function normalizeUiLang(lang) {
    var key = String(lang || "").trim().toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(SUPPORTED_LANGS, key)) {
      return "en";
    }
    return key;
  }

  function currentLanguageBadge(lang) {
    var code = normalizeUiLang(lang);
    if (code === "fr") {
      return "FR";
    }
    if (code === "en") {
      return "EN";
    }
    return "ES";
  }

  function labelsForCurrentLanguage(lang) {
    normalizeUiLang(lang);
    return {
      toggle: tk("lang.toggle", "Cambiar idioma"),
      menu: tk("lang.menu", "Selector de idioma"),
      options: {
        en: tk("lang.option.en", "Inglés"),
        es: tk("lang.option.es", "Español"),
        fr: tk("lang.option.fr", "Francés")
      }
    };
  }

  function languageSelectorTemplate() {
    var lang = normalizeUiLang(currentLang());
    var enClass = lang === "en" ? " is-active" : "";
    var esClass = lang === "es" ? " is-active" : "";
    var frClass = lang === "fr" ? " is-active" : "";
    var labels = labelsForCurrentLanguage(lang);
    return (
      '<div class="lang-switcher" id="lang-switcher" data-no-translate="true">' +
      '  <button class="lang-toggle" id="lang-toggle" type="button" aria-expanded="false" aria-controls="lang-menu" aria-label="' + labels.toggle + '">' +
      '    <span class="lang-icon" aria-hidden="true">' +
      '      <svg viewBox="0 0 24 24" role="img" focusable="false"><path d="M12 2a10 10 0 1 0 10 10A10.01 10.01 0 0 0 12 2zm6.93 9h-3.1a15.7 15.7 0 0 0-1.2-5 8.04 8.04 0 0 1 4.3 5zM12 4.08A13.83 13.83 0 0 1 13.92 11h-3.84A13.83 13.83 0 0 1 12 4.08zM9.37 6a15.7 15.7 0 0 0-1.2 5h-3.1a8.04 8.04 0 0 1 4.3-5zM5.07 13h3.1a15.7 15.7 0 0 0 1.2 5 8.04 8.04 0 0 1-4.3-5zM12 19.92A13.83 13.83 0 0 1 10.08 13h3.84A13.83 13.83 0 0 1 12 19.92zM14.63 18a15.7 15.7 0 0 0 1.2-5h3.1a8.04 8.04 0 0 1-4.3 5z"></path></svg>' +
      "    </span>" +
      '    <span class="lang-current" id="lang-current">' + currentLanguageBadge(lang) + "</span>" +
      "  </button>" +
      '  <div class="lang-menu" id="lang-menu" role="menu" aria-label="' + labels.menu + '">' +
      '    <button class="lang-option' + enClass + '" data-lang="en" type="button" role="menuitem">' + labels.options.en + "</button>" +
      '    <button class="lang-option' + esClass + '" data-lang="es" type="button" role="menuitem">' + labels.options.es + "</button>" +
      '    <button class="lang-option' + frClass + '" data-lang="fr" type="button" role="menuitem">' + labels.options.fr + "</button>" +
      "  </div>" +
      "</div>"
    );
  }

  function navTemplate() {
    var orderedHeaderKeys = ["about", "services", "resources", "citas", "triage", "contact"];
    return orderedHeaderKeys
      .map(function (key) {
        return data.nav.find(function (item) {
          return item.key === key;
        });
      })
      .filter(Boolean)
      .map(function (item) {
        var activeClass = item.key === page ? " is-active" : "";
        return '<a class="site-nav-link' + activeClass + '" href="' + localUrl(item.href) + '">' + item.label + "</a>";
      })
      .join("");
  }

  function footerPhoneDisplay() {
    var display = String(data.clinic.phoneDisplay || "").trim();
    if (!display) {
      return "";
    }
    if (/^\+/.test(display)) {
      return display;
    }
    return "+1 " + display;
  }

  function footerInstagramHandle() {
    var source = String(data.clinic.instagramUrl || "");
    var match = source.match(/instagram\.com\/([^/?#]+)/i);
    if (match && match[1]) {
      return match[1].replace(/^@+/, "");
    }
    return "drkatherinecpediatrics";
  }

  function footerMapEmbedUrl() {
    var fallback = "https://www.google.com/maps?q=18.5562371,-68.3720021&z=16&output=embed";
    var source = String(data.clinic.mapsUrl || "").trim();
    if (!source) {
      return fallback;
    }
    if (/output=embed/i.test(source)) {
      return source;
    }
    var coords = source.match(/@(-?[\d.]+),(-?[\d.]+)/);
    if (coords && coords[1] && coords[2]) {
      return "https://www.google.com/maps?q=" + encodeURIComponent(coords[1] + "," + coords[2]) + "&z=16&output=embed";
    }
    return "https://www.google.com/maps?q=" + encodeURIComponent(data.clinic.address || source) + "&z=16&output=embed";
  }

  if (headerHost) {
    headerHost.innerHTML =
      '<header class="site-header" id="inicio">' +
      '  <div class="shell">' +
      '    <a class="brand" href="' + localUrl("/inicio/") + '" aria-label="' + tk("layout.header.homeAriaPrefix", "Ir al inicio de") + ' ' + data.siteName + '">' +
      '      <img class="brand-logo" src="' + localUrl("/assets/img/drkatherinecpediatrics.png?v=" + brandAssetVersion) + '" alt="' + tk("layout.header.logoAltPrefix", "Logo") + ' ' + data.siteName + '" width="1536" height="1024" loading="eager" />' +
      '    </a>' +
      '    <nav class="site-nav" id="site-nav" aria-label="' + tk("layout.header.mainNavAria", "Navegación principal") + '">' + navTemplate() + "</nav>" +
      '    <div class="header-actions">' +
      languageSelectorTemplate() +
      '      <button class="menu-toggle" id="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav">' +
      '        <span></span><span></span><span></span>' +
      '        <span class="sr-only">' + tk("layout.header.openMenuSr", "Abrir menú") + "</span>" +
      "      </button>" +
      "    </div>" +
      "  </div>" +
      "</header>";
  }

  if (footerHost) {
    footerHost.innerHTML =
      '<footer class="site-footer">' +
      '  <div class="shell footer-grid">' +
      '    <section class="footer-main">' +
      '      <img class="footer-brand-logo" src="' + localUrl("/assets/img/drkatherinecpediatrics.png?v=" + brandAssetVersion) + '" alt="' + tk("layout.header.logoAltPrefix", "Logo") + " " + data.siteName + '" loading="eager" />' +
      '      <p class="footer-main-description" data-i18n-key="layout.footer.mainDescription">' + tk("layout.footer.mainDescription", "Cuidado pediátrico profesional y cercano para cada etapa de la infancia.") + "</p>" +
      '      <ul class="footer-contact-list">' +
        '        <li><a class="footer-contact-link" href="' + data.clinic.whatsappHref + '" target="_blank" rel="noopener noreferrer">' +
          '          <img class="footer-contact-icon" src="' + localUrl("/assets/img/w.png") + '" alt="" aria-hidden="true" loading="eager" />' +
          '          <span>' + footerPhoneDisplay() + "</span>" +
      "        </a></li>" +
      '        <li><a class="footer-contact-link" href="mailto:' + data.clinic.email + '">' +
      '          <img class="footer-contact-icon" src="' + localUrl("/assets/img/c.png") + '" alt="" aria-hidden="true" loading="eager" />' +
      "          <span>" + data.clinic.email + "</span>" +
      "        </a></li>" +
      '        <li><a class="footer-contact-link" href="' + data.clinic.instagramUrl + '" target="_blank" rel="noopener noreferrer">' +
      '          <img class="footer-contact-icon" src="' + localUrl("/assets/img/i.png") + '" alt="" aria-hidden="true" loading="eager" />' +
      "          <span>" + footerInstagramHandle() + "</span>" +
      "        </a></li>" +
      '      </ul>' +
      "    </section>" +
      '    <section class="footer-location">' +
      '      <a class="footer-location-address" href="' + data.clinic.mapsUrl + '" target="_blank" rel="noopener noreferrer">' +
      '        <img class="footer-location-address-icon" src="' + localUrl("/assets/img/l.png") + '" alt="" aria-hidden="true" loading="eager" />' +
      '        <span data-i18n-key="layout.footer.address">' + tk("layout.footer.address", data.clinic.address) + "</span>" +
      "      </a>" +
      '      <div class="footer-map-card">' +
        '        <iframe title="' + tk("layout.footer.googleMaps", "Google Maps") + '" src="' + footerMapEmbedUrl() + '" loading="eager" referrerpolicy="no-referrer-when-downgrade" tabindex="-1" aria-hidden="true"></iframe>' +
        '        <a class="footer-map-overlay" href="' + data.clinic.mapsUrl + '" target="_blank" rel="noopener noreferrer" aria-label="' + tk("layout.footer.openMap", "Abrir ubicación en Google Maps") + '"></a>' +
      "      </div>" +
      "    </section>" +
      '    <section class="footer-hours">' +
      '      <h3 data-i18n-key="layout.footer.hours">' + tk("layout.footer.hours", "Horario") + "</h3>" +
      "      <ul>" +
      '        <li data-i18n-key="layout.footer.hoursWeekdays">' + tk("layout.footer.hoursWeekdays", data.clinic.officeHours[0] || "Lunes a Viernes de 8:00 a.m. a 5:30 p.m.") + "</li>" +
      '        <li data-i18n-key="layout.footer.hoursSaturday">' + tk("layout.footer.hoursSaturday", data.clinic.officeHours[1] || "Sábados de 8:00 a.m. a 1:00 p.m.") + "</li>" +
      "      </ul>" +
      '      <a class="btn btn-secondary footer-hours-cta" href="' + localUrl("/citas/#agenda-module") + '" data-i18n-key="layout.footer.onlineAppointments">' + tk("layout.footer.onlineAppointments", "Citas en líneas") + "</a>" +
      "    </section>" +
      "  </div>" +
      '  <div class="shell footer-bottom">' +
      '    <p>© <span id="current-year"></span> ' + data.siteName + '. <span data-i18n-key="layout.footer.rightsReserved">' + tk("layout.footer.rightsReserved", "Todos los derechos reservados.") + "</span></p>" +
      '    <div class="powered-by">' +
      '      <span data-i18n-key="layout.footer.poweredBy">' + tk("layout.footer.poweredBy", "Powered by") + "</span>" +
      '      <a class="footer-cmlayer-link" href="https://cmlayer.com" target="_blank" rel="noopener noreferrer" aria-label="' + tk("layout.footer.cmlayerAria", "Ir a CmLayer") + '">' +
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
  var langToggle = document.getElementById("lang-toggle");
  var langSwitcher = document.getElementById("lang-switcher");

  function closeLanguageMenu() {
    if (!langSwitcher || !langToggle) {
      return;
    }
    langSwitcher.classList.remove("is-open");
    langToggle.setAttribute("aria-expanded", "false");
  }

  function syncLanguageUI(lang) {
    var normalizedLang = normalizeUiLang(lang);
    var labels = labelsForCurrentLanguage(normalizedLang);
    var current = document.getElementById("lang-current");
    var langMenu = document.getElementById("lang-menu");
    if (current) {
      current.textContent = currentLanguageBadge(normalizedLang);
    }
    if (langToggle) {
      langToggle.setAttribute("aria-label", labels.toggle);
    }
    if (langMenu) {
      langMenu.setAttribute("aria-label", labels.menu);
    }
    var options = document.querySelectorAll(".lang-option");
    options.forEach(function (option) {
      var optionLang = option.getAttribute("data-lang");
      option.classList.toggle("is-active", optionLang === normalizedLang);
      if (optionLang === "en") {
        option.textContent = labels.options.en;
      }
      if (optionLang === "es") {
        option.textContent = labels.options.es;
      }
      if (optionLang === "fr") {
        option.textContent = labels.options.fr;
      }
    });
  }

  if (menuBtn && nav) {
    menuBtn.addEventListener("click", function () {
      var opened = menuBtn.getAttribute("aria-expanded") === "true";
      menuBtn.setAttribute("aria-expanded", String(!opened));
      nav.classList.toggle("is-open");
      document.body.classList.toggle("menu-open", !opened);
      if (!opened) {
        closeLanguageMenu();
      }
    });

    nav.addEventListener("click", function (event) {
      if (event.target && event.target.classList.contains("site-nav-link")) {
        nav.classList.remove("is-open");
        menuBtn.setAttribute("aria-expanded", "false");
        document.body.classList.remove("menu-open");
      }
    });
  }

  if (langToggle && langSwitcher) {
    langToggle.addEventListener("click", function () {
      var opened = langSwitcher.classList.contains("is-open");
      if (opened) {
        closeLanguageMenu();
        return;
      }
      langSwitcher.classList.add("is-open");
      langToggle.setAttribute("aria-expanded", "true");
      if (nav) {
        nav.classList.remove("is-open");
      }
      if (menuBtn) {
        menuBtn.setAttribute("aria-expanded", "false");
      }
      document.body.classList.remove("menu-open");
    });

    langSwitcher.addEventListener("click", function (event) {
      var target = event.target;
      if (!target || !target.classList || !target.classList.contains("lang-option")) {
        return;
      }
      var lang = target.getAttribute("data-lang");
      if (i18n && typeof i18n.setLanguage === "function") {
        i18n.setLanguage(lang);
      }
      syncLanguageUI(lang);
      closeLanguageMenu();
    });

    document.addEventListener("click", function (event) {
      if (!langSwitcher.contains(event.target)) {
        closeLanguageMenu();
      }
    });
  }

  if (i18n && typeof i18n.onLanguageChange === "function") {
    i18n.onLanguageChange(function (lang) {
      syncLanguageUI(lang);
    });
  }

  if (i18n && typeof i18n.onCatalogReady === "function") {
    i18n.onCatalogReady(function () {
      syncLanguageUI(currentLang());
    });
  }

  syncLanguageUI(currentLang());
})();
