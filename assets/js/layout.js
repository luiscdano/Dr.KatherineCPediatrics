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
  var LANGUAGE_UI_LABELS = {
    es: {
      toggle: "Cambiar idioma",
      menu: "Selector de idioma",
      options: {
        en: "Inglés",
        es: "Español",
        fr: "Francés"
      }
    },
    en: {
      toggle: "Change language",
      menu: "Language selector",
      options: {
        en: "English",
        es: "Spanish",
        fr: "French"
      }
    },
    fr: {
      toggle: "Changer de langue",
      menu: "Sélecteur de langue",
      options: {
        en: "Anglais",
        es: "Espagnol",
        fr: "Français"
      }
    }
  };

  function currentLang() {
    if (i18n && typeof i18n.getLanguage === "function") {
      return i18n.getLanguage();
    }
    return "en";
  }

  function normalizeUiLang(lang) {
    var key = String(lang || "").trim().toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(LANGUAGE_UI_LABELS, key)) {
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
    return LANGUAGE_UI_LABELS[normalizeUiLang(lang)] || LANGUAGE_UI_LABELS.en;
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
      '  <div class="shell">' +
      '    <a class="brand" href="' + localUrl("/inicio/") + '" aria-label="Ir al inicio de ' + data.siteName + '">' +
      '      <img class="brand-logo" src="' + localUrl("/assets/img/drkatherinecpediatrics.png?v=" + brandAssetVersion) + '" alt="Logo ' + data.siteName + '" width="1536" height="1024" loading="eager" />' +
      '    </a>' +
      '    <nav class="site-nav" id="site-nav" aria-label="Navegación principal">' + navTemplate() + "</nav>" +
      '    <div class="header-actions">' +
      languageSelectorTemplate() +
      '      <button class="menu-toggle" id="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav">' +
      '        <span></span><span></span><span></span>' +
      '        <span class="sr-only">Abrir menú</span>' +
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
      '      <a class="btn btn-secondary" href="' + localUrl("/citas/") + '">Citas en línea</a>' +
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

  syncLanguageUI(currentLang());
})();
