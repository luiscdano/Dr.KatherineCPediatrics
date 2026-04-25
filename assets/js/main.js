(function () {
  var data = window.DR_KATHERINE_DATA;
  var utils = window.DR_KATHERINE_UTILS || {};
  var localUrl = typeof utils.localUrl === "function" ? utils.localUrl : function (path) { return path; };
  var i18n = window.DR_KATHERINE_I18N || null;

  function currentLang() {
    if (i18n && typeof i18n.getLanguage === "function") {
      return i18n.getLanguage();
    }
    return "en";
  }

  function t(value) {
    var text = String(value || "");
    if (!text) {
      return text;
    }
    if (i18n && typeof i18n.translateText === "function") {
      return i18n.translateText(text, currentLang());
    }
    return text;
  }

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

  function channelLabel(channelCode) {
    var code = normalizeText(channelCode || "").toLowerCase();
    if (code === "emergency") {
      return tk("main.channels.emergency", "Derivación a emergencias (si aplica).");
    }
    if (code === "same_day_visit") {
      return tk("main.channels.sameDayVisit", "Consulta el mismo día.");
    }
    if (code === "priority_visit") {
      return tk("main.channels.priorityVisit", "Consulta prioritaria en 24 horas.");
    }
    return tk("main.channels.homeMonitor", "Monitoreo en casa con seguimiento.");
  }

  function localeForCurrentLang() {
    var lang = currentLang();
    if (lang === "fr") {
      return "fr-FR";
    }
    if (lang === "es") {
      return "es-DO";
    }
    return "en-US";
  }

  function normalizeWeekdayLabel(label) {
    var compact = String(label || "").replace(/\./g, "").trim();
    if (!compact) {
      return compact;
    }
    return compact.charAt(0).toUpperCase() + compact.slice(1);
  }

  if (!data) {
    return;
  }

  function setHTML(id, html) {
    var node = document.getElementById(id);
    if (node) {
      node.innerHTML = html;
    }
  }

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function isValidPhone(value) {
    return /^[0-9+()\-\s]{7,20}$/.test(normalizeText(value));
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeText(value));
  }

  function escapeHTML(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setStatusMessage(node, text, isError) {
    if (!node) {
      return;
    }
    node.textContent = text || "";
    node.classList.toggle("is-visible", Boolean(text));
    node.classList.toggle("is-error", Boolean(text) && Boolean(isError));
  }

  var host = window.location.hostname || "";
  var apiConfig = data.api || {};
  var localHost = host === "localhost" || host === "127.0.0.1";
  var runtimeApiBase = normalizeText(window.DR_KATHERINE_API_BASE);
  var configuredApiBase = runtimeApiBase || (localHost ? "http://localhost:8787" : normalizeText(apiConfig.baseUrl));
  var apiBaseUrl = configuredApiBase ? configuredApiBase.replace(/\/+$/, "") : "";
  var apiTimeoutMs = Number(apiConfig.timeoutMs || 10000);

  if (!Number.isFinite(apiTimeoutMs) || apiTimeoutMs < 1000) {
    apiTimeoutMs = 10000;
  }

  function hasApiBase() {
    return Boolean(apiBaseUrl);
  }

  function buildApiUrl(path) {
    if (typeof path !== "string") {
      return "";
    }
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    var cleanPath = path.startsWith("/") ? path : "/" + path;
    return (apiBaseUrl || "") + cleanPath;
  }

  async function apiRequest(path, options) {
    var url = buildApiUrl(path);
    if (!url) {
      throw new Error(tk("main.errors.invalidApiUrl", "No se configuró una URL válida de API."));
    }

    var controller = new AbortController();
    var timeout = window.setTimeout(function () {
      controller.abort();
    }, apiTimeoutMs);

    var settings = Object.assign(
      {
        method: "GET",
        headers: {
          Accept: "application/json"
        },
        signal: controller.signal
      },
      options || {}
    );

    settings.headers = Object.assign(
      {
        Accept: "application/json"
      },
      settings.headers || {}
    );

    var response;
    try {
      response = await fetch(url, settings);
    } catch (error) {
      if (error && error.name === "AbortError") {
        throw new Error(tk("main.errors.requestTimeout", "La solicitud tardó demasiado. Intenta nuevamente."));
      }
      throw new Error(tk("main.errors.cannotConnectServer", "No fue posible conectar con el servidor."));
    } finally {
      window.clearTimeout(timeout);
    }

    var responseText = await response.text();
    var payload = null;
    if (responseText) {
      try {
        payload = JSON.parse(responseText);
      } catch (error) {
        payload = null;
      }
    }

    if (!response.ok) {
      var message =
        (payload && (payload.error || payload.message)) ||
        tk("main.errors.serverProcessingError", "El servidor devolvió un error al procesar la solicitud.");
      var requestError = new Error(message);
      requestError.status = response.status;
      requestError.payload = payload;
      throw requestError;
    }

    return payload || {};
  }

  function iconSVG(kind) {
    if (kind === "heart") {
      return '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 56c-1.3 0-2.5-.5-3.5-1.3C15.7 43.7 8 36.8 8 25.8 8 16.5 15.4 9 24.6 9c4.8 0 9.3 2.1 12.4 5.8C40 11.1 44.6 9 49.4 9 58.6 9 66 16.5 66 25.8c0 11-7.7 17.9-20.5 28.9-1 .8-2.2 1.3-3.5 1.3h-10z" transform="translate(-5 -1)"></path></svg>';
    }
    if (kind === "spark") {
      return '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M31 6l6 15 15 6-15 6-6 15-6-15-15-6 15-6z"></path><circle cx="51" cy="51" r="6"></circle></svg>';
    }
    if (kind === "guide") {
      return '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M12 10h24a8 8 0 0 1 8 8v36H20a8 8 0 0 0-8 8V10z"></path><path d="M44 18h8v44H28a8 8 0 0 1 8-8h8V18z"></path></svg>';
    }
    return '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M10 54h44v4H10z"></path><path d="M16 46h8V26h-8zm12 0h8V18h-8zm12 0h8V10h-8z"></path></svg>';
  }

  function renderSocialProof() {
    var html = data.socialProof
      .map(function (item) {
        return (
          '<article class="stat-card reveal">' +
          '<h3>' + item.value + '</h3>' +
          '<p class="stat-title">' + item.label + '</p>' +
          '<p>' + item.detail + '</p>' +
          '</article>'
        );
      })
      .join("");
    setHTML("social-proof-grid", html);
  }

  function renderAdvantages() {
    var html = data.advantages
      .map(function (item) {
        return (
          '<article class="adv-card reveal">' +
          '<div class="adv-icon">' + iconSVG(item.icon) + '</div>' +
          '<h3>' + item.title + '</h3>' +
          '<p>' + item.description + '</p>' +
          '</article>'
        );
      })
      .join("");
    setHTML("advantages-grid", html);
  }

  function serviceCardTemplate(item, compact) {
    var bullets = item.bullets
      .map(function (bullet) {
        return "<li>" + bullet + "</li>";
      })
      .join("");
    var badges = item.bullets
      .slice(0, 3)
      .map(function (bullet) {
        return '<div class="service-badge">' + bullet + "</div>";
      })
      .join("");
    var serviceIsotypeAlt = tk("main.alt.serviceIsotype", "Isotipo servicio pediátrico");
    return (
      '<article class="service-card service-item reveal">' +
      '<div class="service-image-wrap">' +
      '<img class="service-image" src="' + localUrl("/assets/img/isotipo.png") + '" alt="' + serviceIsotypeAlt + '" loading="lazy" />' +
      '<div class="service-hover-wrap"><span class="service-hover-icon">+</span></div>' +
      "</div>" +
      '<div class="service-info">' +
      '<h3 class="service-title">' + item.title + '</h3>' +
      '<p class="service-description">' + item.summary + "</p>" +
      (compact ? '<div class="service-list-wrap">' + badges + "</div>" : '<ul class="service-list">' + bullets + "</ul>") +
      '<a class="text-link" href="' + localUrl(item.detailHref) + '">' + tk("main.actions.viewDetail", "Ver detalle") + "</a>" +
      "</div>" +
      '</article>'
    );
  }

  function renderServices() {
    setHTML(
      "home-services-grid",
      data.services
        .map(function (item) {
          return serviceCardTemplate(item, true);
        })
        .join("")
    );

    setHTML(
      "services-grid",
      data.services
        .map(function (item) {
          return serviceCardTemplate(item, false);
        })
        .join("")
    );
  }

  function renderDoctorInfo() {
    setHTML(
      "doctor-education-list",
      data.doctorProfile.education
        .map(function (line) {
          return "<li>" + line + "</li>";
        })
        .join("")
    );

    setHTML(
      "doctor-approach-list",
      data.doctorProfile.approach
        .map(function (line) {
          return "<li>" + line + "</li>";
        })
        .join("")
    );

    setHTML(
      "future-team-grid",
      data.futureTeam
        .map(function (item) {
          return (
            '<article class="future-team-card reveal">' +
            '<h3>' + item.role + '</h3>' +
            '<p>' + item.status + "</p>" +
            "</article>"
          );
        })
        .join("")
    );
  }

  function renderResources() {
    var html = data.resources
      .map(function (item) {
        return (
          '<article class="resource-card reveal">' +
          '<span class="pill">' + item.tag + '</span>' +
          '<h3>' + item.title + '</h3>' +
          '<p>' + item.excerpt + '</p>' +
          '<a class="text-link" href="' + localUrl(item.href) + '">' + tk("main.actions.readResource", "Leer recurso") + "</a>" +
          '</article>'
        );
      })
      .join("");

    setHTML("resources-home-grid", html);
    setHTML("resources-page-grid", html);
  }

  function renderAgeRoutes() {
    var moduleHost = document.getElementById("age-route-module");
    var tabsHost = document.getElementById("age-route-tabs");
    var cardHost = document.getElementById("age-route-card");
    var routes = Array.isArray(data.ageRoutes) ? data.ageRoutes : [];

    if (!moduleHost || !tabsHost || !cardHost || !routes.length) {
      return;
    }

    var activeKey = routes[0].key;
    function paint() {
      tabsHost.innerHTML = routes
        .map(function (route) {
          var activeClass = route.key === activeKey ? " is-active" : "";
          return (
            '<button class="age-route-tab' +
            activeClass +
            '" type="button" data-key="' +
            route.key +
            '">' +
            route.label +
            "</button>"
          );
        })
        .join("");

      var selected = routes.find(function (route) {
        return route.key === activeKey;
      }) || routes[0];

      cardHost.innerHTML =
        '<h3>' +
        selected.title +
        "</h3>" +
        '<ul class="age-route-list">' +
        selected.focus
          .map(function (line) {
            return "<li>" + line + "</li>";
          })
          .join("") +
        "</ul>" +
        '<a class="btn btn-ghost" href="' +
        localUrl(selected.ctaHref) +
        '">' +
        selected.ctaLabel +
        "</a>";

      var buttons = tabsHost.querySelectorAll(".age-route-tab");
      buttons.forEach(function (button) {
        button.addEventListener("click", function () {
          activeKey = normalizeText(button.getAttribute("data-key"));
          paint();
        });
      });
    }

    paint();
  }

  function renderWarningSigns() {
    var signs = Array.isArray(data.alertSigns) ? data.alertSigns : [];
    if (!signs.length) {
      return;
    }

    function renderIn(hostId) {
      var host = document.getElementById(hostId);
      if (!host) {
        return;
      }

      host.innerHTML =
        "<ul>" +
        signs
          .map(function (line) {
            return "<li>" + line + "</li>";
          })
          .join("") +
        "</ul>";
    }

    renderIn("alert-signs-list");
    renderIn("alert-signs-list-inline");
  }

  function renderPremiumResourcesCards() {
    var host = document.getElementById("premium-resources-grid");
    var select = document.getElementById("premium-resource-key");
    var resources = Array.isArray(data.premiumResources) ? data.premiumResources : [];

    if (!host || !resources.length) {
      return;
    }

    host.innerHTML = resources
      .map(function (item) {
        return (
          '<article class="resource-card reveal premium-resource-card">' +
          '<span class="pill">Premium</span>' +
          "<h3>" +
          item.title +
          "</h3>" +
          "<p>" +
          item.summary +
          "</p>" +
          '<p class="premium-audience">' + tk("main.labels.ages", "Edades:") + " " +
          item.audience +
          "</p>" +
          "</article>"
        );
      })
      .join("");

    if (select) {
      select.innerHTML = resources
        .map(function (item) {
          return '<option value="' + item.key + '">' + item.title + "</option>";
        })
        .join("");
    }
  }

  function renderTestimonials() {
    var slider = document.getElementById("testimonial-slider");
    if (!slider) {
      return;
    }

    var index = 0;
    function mount() {
      var item = data.testimonials[index];
      slider.innerHTML =
        '<figure class="testimonial reveal">' +
        '<blockquote>"' + item.quote + '"</blockquote>' +
        '<figcaption>' + item.author + "</figcaption>" +
        "</figure>";
    }

    mount();

    var prev = document.getElementById("testimonial-prev");
    var next = document.getElementById("testimonial-next");

    if (prev) {
      prev.addEventListener("click", function () {
        index = (index - 1 + data.testimonials.length) % data.testimonials.length;
        mount();
      });
    }

    if (next) {
      next.addEventListener("click", function () {
        index = (index + 1) % data.testimonials.length;
        mount();
      });
    }
  }

  function renderFaqs() {
    var html = data.faqs
      .map(function (faq) {
        return (
          '<details class="faq-item reveal">' +
          '<summary>' + faq.question + '</summary>' +
          '<p>' + faq.answer + '</p>' +
          '</details>'
        );
      })
      .join("");

    setHTML("faq-list", html);
  }

  function setupAgendaModule() {
    var module = document.getElementById("agenda-module");
    if (!module) {
      return;
    }

    var dateWrap = document.getElementById("agenda-date-list");
    var slotWrap = document.getElementById("agenda-slot-list");
    var selectedDateInput = document.getElementById("selected-date");
    var selectedTimeInput = document.getElementById("selected-time");
    var summary = document.getElementById("agenda-summary");
    var form = document.getElementById("appointment-form");
    var confirmation = document.getElementById("appointment-confirmation");
    var clearFormBtn = document.getElementById("clear-appointment-form");
    var whatsappLink = document.getElementById("appointment-whatsapp-link");
    var historyHost = document.getElementById("appointment-history");
    var clearHistoryBtn = document.getElementById("clear-appointment-history");
    var storageKey = "dr_katherine_appointments";
    var memoryAppointments = [];
    var remoteTakenTimesCache = {};
    var slotsRequestNonce = 0;

    var times = ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "15:00", "15:30", "16:00", "16:30"];

    var today = new Date();
    var selectedDate = null;
    var selectedTime = null;
    var storageEnabled = canUseStorage();
    var lastSharedAppointmentId = "";

    function canUseStorage() {
      try {
        var probe = "__drk_probe";
        window.localStorage.setItem(probe, "1");
        window.localStorage.removeItem(probe);
        return true;
      } catch (error) {
        return false;
      }
    }

    function normalizeAppointment(item, index) {
      if (!item || typeof item !== "object") {
        return null;
      }
      var date = String(item.date || "").trim();
      var time = String(item.time || "").trim();
      if (!date || !time) {
        return null;
      }
      return {
        id: String(item.id || date + "-" + time + "-" + index),
        date: date,
        time: time,
        patientName: String(item.patientName || tk("main.labels.patient", "Paciente")).trim() || tk("main.labels.patient", "Paciente"),
        patientAge: String(item.patientAge || "").trim(),
        parentName: String(item.parentName || tk("main.labels.guardian", "Tutor")).trim() || tk("main.labels.guardian", "Tutor"),
        parentPhone: String(item.parentPhone || "").trim(),
        reason: String(item.reason || "").trim(),
        status: String(item.status || "draft").trim() || "draft",
        source: String(item.source || "website").trim() || "website",
        createdAt: String(item.createdAt || new Date().toISOString())
      };
    }

    function readAppointments() {
      var parsed = [];

      if (storageEnabled) {
        try {
          var raw = window.localStorage.getItem(storageKey);
          if (raw) {
            parsed = JSON.parse(raw);
          }
        } catch (error) {
          storageEnabled = false;
          parsed = memoryAppointments.slice();
        }
      } else {
        parsed = memoryAppointments.slice();
      }

      if (!Array.isArray(parsed)) {
        parsed = [];
      }

      var normalized = parsed
        .map(function (item, index) {
          return normalizeAppointment(item, index);
        })
        .filter(function (item) {
          return Boolean(item);
        });

      if (!storageEnabled) {
        memoryAppointments = normalized.slice();
      }

      return normalized;
    }

    function writeAppointments(appointments) {
      if (storageEnabled) {
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(appointments));
          return;
        } catch (error) {
          storageEnabled = false;
        }
      }
      memoryAppointments = appointments.slice();
    }

    function clearStorageAppointments() {
      if (storageEnabled) {
        try {
          window.localStorage.removeItem(storageKey);
          return;
        } catch (error) {
          storageEnabled = false;
        }
      }
      memoryAppointments = [];
    }

    function getTakenTimesByDate(dateValue, appointments) {
      return appointments.reduce(function (acc, item) {
        if (item.date === dateValue && item.status !== "draft" && item.status !== "cancelled") {
          acc[item.time] = true;
        }
        return acc;
      }, {});
    }

    function hasConflict(appointments, dateValue, timeValue) {
      return appointments.some(function (item) {
        return item.date === dateValue && item.time === timeValue && item.status !== "draft" && item.status !== "cancelled";
      });
    }

    function resetAppointmentFeedback() {
      setStatusMessage(confirmation, "", false);
      if (whatsappLink) {
        whatsappLink.classList.add("is-hidden");
        whatsappLink.setAttribute("href", "#");
      }
      lastSharedAppointmentId = "";
    }

    function buildWhatsAppLink(appointment) {
      var header = tk("main.whatsapp.headerAppointmentRequest", "Solicitud de cita pediátrica");
      var lines = [
        tk("main.labels.dateColon", "Fecha:") + " " + appointment.date,
        tk("main.labels.timeColon", "Hora:") + " " + appointment.time,
        tk("main.labels.patientColon", "Paciente:") + " " + appointment.patientName + " (" + appointment.patientAge + ")",
        tk("main.labels.guardianColon", "Tutor:") + " " + appointment.parentName,
        tk("main.labels.phoneColon", "Teléfono:") + " " + appointment.parentPhone
      ];
      if (appointment.reason) {
        lines.push(tk("main.labels.motiveColon", "Motivo:") + " " + appointment.reason);
      }
      var text = header + "\n\n" + lines.join("\n");
      return data.clinic.whatsappHref + "?text=" + encodeURIComponent(text);
    }

    function renderAppointmentHistory() {
      if (!historyHost) {
        return;
      }
      historyHost.innerHTML = "";

      var appointments = readAppointments();
      if (!appointments.length) {
        var empty = document.createElement("p");
        empty.textContent = tk("main.messages.noRecentRequests", "Aún no hay solicitudes recientes en este dispositivo.");
        historyHost.appendChild(empty);
        return;
      }

      var list = document.createElement("ul");
      appointments.slice(0, 10).forEach(function (item) {
        var row = document.createElement("li");
        row.setAttribute("data-id", item.id);

        var headline = document.createElement("strong");
        headline.textContent = item.date + " | " + item.time + " | " + item.patientName;

        var details = document.createElement("small");
        var statusLabel =
          item.status === "draft"
            ? tk("main.status.localDraft", "Borrador local")
            : tk("main.status.pendingConfirmation", "Pendiente de confirmación");
        details.textContent =
          tk("main.labels.guardianColon", "Tutor:") +
          " " +
          item.parentName +
          " | " +
          tk("main.labels.phoneShort", "Tel:") +
          " " +
          item.parentPhone +
          " | " +
          tk("main.labels.statusColon", "Estado:") +
          " " +
          statusLabel;

        var actions = document.createElement("div");
        actions.className = "appointment-history-actions";

        var removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "appointment-remove-btn";
        removeBtn.setAttribute("data-id", item.id);
        removeBtn.textContent = tk("main.actions.delete", "Eliminar");

        actions.appendChild(removeBtn);
        row.appendChild(headline);
        row.appendChild(details);
        row.appendChild(actions);
        list.appendChild(row);
      });
      historyHost.appendChild(list);
    }

    function formatDateLabel(date) {
      var formatted = date.toLocaleDateString(localeForCurrentLang(), {
        weekday: "short",
        day: "2-digit",
        month: "short"
      });
      return normalizeWeekdayLabel(formatted);
    }

    function formatDateValue(date) {
      var year = String(date.getFullYear());
      var month = String(date.getMonth() + 1).padStart(2, "0");
      var day = String(date.getDate()).padStart(2, "0");
      return year + "-" + month + "-" + day;
    }

    async function fetchRemoteTakenTimes(dateValue) {
      if (!hasApiBase() || !dateValue) {
        return {};
      }

      if (remoteTakenTimesCache[dateValue]) {
        return remoteTakenTimesCache[dateValue];
      }

      try {
        var payload = await apiRequest("/api/v1/appointments/taken?date=" + encodeURIComponent(dateValue));
        var timesTaken = (payload && payload.data && Array.isArray(payload.data.timesTaken)) ? payload.data.timesTaken : [];
        var parsed = timesTaken.reduce(function (acc, slot) {
          var normalized = normalizeText(slot);
          if (normalized) {
            acc[normalized] = true;
          }
          return acc;
        }, {});
        remoteTakenTimesCache[dateValue] = parsed;
        return parsed;
      } catch (error) {
        return {};
      }
    }

    function updateSummary() {
      if (!summary) {
        return;
      }
      var datePart = selectedDate ? selectedDateInput.value : tk("main.labels.noDate", "Sin fecha");
      var timePart = selectedTime ? selectedTimeInput.value : tk("main.labels.noTime", "Sin horario");
      summary.textContent =
        tk("main.labels.selected", "Seleccionado:") +
        " " +
        datePart +
        " " +
        tk("main.labels.at", "a las") +
        " " +
        timePart;
    }

    function renderSlotsFromTakenTimes(takenTimes) {
      if (!slotWrap) {
        return;
      }

      if (selectedTime && takenTimes[selectedTime]) {
        selectedTime = null;
        if (selectedTimeInput) {
          selectedTimeInput.value = "";
        }
      }

      slotWrap.innerHTML = times
        .map(function (time) {
          var active = selectedTime === time ? " is-active" : "";
          var isTaken = Boolean(takenTimes[time]);
          var disabled = isTaken ? " disabled" : "";
          var label = isTaken ? time + " • " + tk("main.labels.booked", "ocupado") : time;
          return '<button class="slot-btn' + active + '" data-time="' + time + '" type="button"' + disabled + ">" + label + "</button>";
        })
        .join("");

      var buttons = slotWrap.querySelectorAll("button:not([disabled])");
      buttons.forEach(function (btn) {
        btn.addEventListener("click", function () {
          selectedTime = btn.getAttribute("data-time");
          if (selectedTimeInput) {
            selectedTimeInput.value = selectedTime;
          }
          paintSlots();
          updateSummary();
        });
      });
    }

    function paintSlots() {
      if (!slotWrap) {
        return;
      }

      var appointments = readAppointments();
      var dateValue = selectedDateInput ? selectedDateInput.value : "";
      var localTakenTimes = dateValue ? getTakenTimesByDate(dateValue, appointments) : {};
      var requestNonce = slotsRequestNonce += 1;

      renderSlotsFromTakenTimes(localTakenTimes);

      if (!dateValue || !hasApiBase()) {
        return;
      }

      fetchRemoteTakenTimes(dateValue).then(function (remoteTakenTimes) {
        if (requestNonce !== slotsRequestNonce) {
          return;
        }
        var mergedTakenTimes = Object.assign({}, remoteTakenTimes, localTakenTimes);
        renderSlotsFromTakenTimes(mergedTakenTimes);
      });
    }

    var dates = [];

    function refreshDateButtonLabels() {
      if (!dateWrap || !dates.length) {
        return;
      }
      var buttons = dateWrap.querySelectorAll("button[data-date]");
      buttons.forEach(function (button, index) {
        if (dates[index]) {
          button.textContent = formatDateLabel(dates[index]);
        }
      });
    }

    if (dateWrap) {
      for (var i = 0; i < 14; i += 1) {
        var d = new Date(today);
        d.setDate(today.getDate() + i);
        dates.push(d);
      }

      dateWrap.innerHTML = dates
        .map(function (date, idx) {
          var value = formatDateValue(date);
          var active = idx === 0 ? " is-active" : "";
          return '<button class="date-btn' + active + '" data-date="' + value + '" type="button">' + formatDateLabel(date) + "</button>";
        })
        .join("");

      var dateButtons = dateWrap.querySelectorAll("button");
      dateButtons.forEach(function (btn, idx) {
        btn.addEventListener("click", function () {
          dateButtons.forEach(function (other) {
            other.classList.remove("is-active");
          });
          btn.classList.add("is-active");
          selectedDate = dates[idx];
          if (selectedDateInput) {
            selectedDateInput.value = btn.getAttribute("data-date");
          }
          selectedTime = null;
          if (selectedTimeInput) {
            selectedTimeInput.value = "";
          }
          resetAppointmentFeedback();
          paintSlots();
          updateSummary();
        });
      });

      if (dateButtons[0]) {
        dateButtons[0].click();
      }
    }

    paintSlots();
    renderAppointmentHistory();

    if (historyHost) {
      historyHost.addEventListener("click", function (event) {
        var target = event.target;
        if (!target || !target.classList || !target.classList.contains("appointment-remove-btn")) {
          return;
        }
        var removeId = target.getAttribute("data-id");
        if (!removeId) {
          return;
        }
        var filtered = readAppointments().filter(function (item) {
          return item.id !== removeId;
        });
        writeAppointments(filtered);
        if (removeId === lastSharedAppointmentId) {
          resetAppointmentFeedback();
        }
        renderAppointmentHistory();
        paintSlots();
        updateSummary();
      });
    }

    if (clearFormBtn && form) {
      clearFormBtn.addEventListener("click", function () {
        form.reset();
        selectedTime = null;
        if (selectedDate && selectedDateInput) {
          selectedDateInput.value = formatDateValue(selectedDate);
        }
        if (selectedTimeInput) {
          selectedTimeInput.value = "";
        }
        resetAppointmentFeedback();
        paintSlots();
        updateSummary();
      });
    }

    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener("click", function () {
        clearStorageAppointments();
        resetAppointmentFeedback();
        renderAppointmentHistory();
        paintSlots();
        updateSummary();
      });
    }

    if (form) {
      form.addEventListener("submit", async function (event) {
        event.preventDefault();
        if (!form.checkValidity()) {
          form.reportValidity();
          setStatusMessage(confirmation, tk("main.validation.requiredContinue", "Completa los campos obligatorios para continuar."), true);
          return;
        }
        var formData = new FormData(form);
        if (normalizeText(formData.get("companyWebsite"))) {
          setStatusMessage(confirmation, tk("main.validation.processingFailedRetry", "No fue posible procesar la solicitud. Inténtalo nuevamente."), true);
          return;
        }
        if (!selectedDate || !selectedTime) {
          setStatusMessage(confirmation, tk("main.validation.selectDateTime", "Selecciona fecha y horario antes de enviar."), true);
          return;
        }

        var patientName = normalizeText(formData.get("patientName"));
        var patientAge = normalizeText(formData.get("patientAge"));
        var parentName = normalizeText(formData.get("parentName"));
        var parentPhone = normalizeText(formData.get("parentPhone"));
        var reason = normalizeText(formData.get("reason"));
        var ageNumber = Number(patientAge);

        if (!isValidPhone(parentPhone)) {
          setStatusMessage(confirmation, tk("main.validation.invalidPhoneConfirmAppointment", "Ingresa un teléfono válido para confirmar la cita."), true);
          return;
        }

        if (!Number.isFinite(ageNumber) || ageNumber < 0 || ageNumber > 18) {
          setStatusMessage(confirmation, tk("main.validation.invalidPatientAgeRange", "La edad del paciente debe estar entre 0 y 18 años."), true);
          return;
        }

        if (reason.length < 8) {
          setStatusMessage(confirmation, tk("main.validation.describeReasonMin", "Describe el motivo de consulta con más detalle (mínimo 8 caracteres)."), true);
          return;
        }

        var appointment = {
          id: String(Date.now()) + "-" + String(Math.floor(Math.random() * 100000)),
          date: selectedDateInput ? selectedDateInput.value : "",
          time: selectedTimeInput ? selectedTimeInput.value : "",
          patientName: patientName,
          patientAge: String(ageNumber),
          parentName: parentName,
          parentPhone: parentPhone,
          reason: reason,
          status: "draft",
          source: "website",
          createdAt: new Date().toISOString()
        };

        var appointments = readAppointments();
        if (hasConflict(appointments, appointment.date, appointment.time)) {
          setStatusMessage(confirmation, tk("main.validation.slotTaken", "Ese horario ya está ocupado para la fecha seleccionada. Elige otro."), true);
          paintSlots();
          updateSummary();
          return;
        }

        var savedInBackend = false;
        if (hasApiBase()) {
          try {
            var response = await apiRequest("/api/v1/appointments", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                date: appointment.date,
                time: appointment.time,
                patientName: appointment.patientName,
                patientAge: Number(appointment.patientAge),
                parentName: appointment.parentName,
                parentPhone: appointment.parentPhone,
                reason: appointment.reason,
                privacyConsent: true,
                companyWebsite: normalizeText(formData.get("companyWebsite"))
              })
            });

            var persistedId =
              response &&
              response.data &&
              response.data.appointment &&
              normalizeText(response.data.appointment.id);
            if (persistedId) {
              appointment.id = persistedId;
            }
            appointment.status = "pending";
            remoteTakenTimesCache[appointment.date] = Object.assign({}, remoteTakenTimesCache[appointment.date] || {}, {
              [appointment.time]: true
            });
            savedInBackend = true;
          } catch (error) {
            if (error && error.status === 409) {
              remoteTakenTimesCache[appointment.date] = null;
              setStatusMessage(
                confirmation,
                tk("main.validation.slotJustTaken", "Ese horario acaba de ocuparse. Elige otro horario disponible para continuar."),
                true
              );
              paintSlots();
              updateSummary();
              return;
            }
            setStatusMessage(
              confirmation,
              tk("main.validation.appointmentSendFailedWhatsapp", "No se pudo enviar la solicitud al servidor. Puedes reintentar o contactar por WhatsApp."),
              true
            );
            return;
          }
        }

        if (!savedInBackend) {
          appointment.status = "draft";
        }

        appointments.unshift(appointment);
        writeAppointments(appointments);
        renderAppointmentHistory();

        if (savedInBackend) {
          setStatusMessage(
            confirmation,
            tk(
              "main.messages.appointmentSentWithDateTime",
              "Solicitud enviada para el {date} a las {time}. Te confirmaremos por WhatsApp o llamada del consultorio.",
              { date: appointment.date, time: appointment.time }
            ),
            false
          );
        } else {
          setStatusMessage(
            confirmation,
            tk("main.messages.appointmentSavedLocal", "Solicitud guardada localmente en este dispositivo. Configura la API para enviarla al consultorio."),
            true
          );
        }

        if (whatsappLink) {
          lastSharedAppointmentId = appointment.id;
          whatsappLink.setAttribute("href", buildWhatsAppLink(appointment));
          whatsappLink.classList.remove("is-hidden");
        }

        form.reset();
        selectedTime = null;
        if (selectedDate && selectedDateInput) {
          selectedDateInput.value = formatDateValue(selectedDate);
        }
        if (selectedTimeInput) {
          selectedTimeInput.value = "";
        }
        paintSlots();
        updateSummary();
      });
    }

    if (i18n && typeof i18n.onLanguageChange === "function") {
      i18n.onLanguageChange(function () {
        refreshDateButtonLabels();
        renderAppointmentHistory();
        paintSlots();
        updateSummary();
      });
    }
  }

  function setupContactForm() {
    var form = document.getElementById("contact-form");
    if (!form) {
      return;
    }
    var message = document.getElementById("contact-confirmation");

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        setStatusMessage(message, tk("main.validation.requiredContactFields", "Completa los campos requeridos para enviar tu consulta."), true);
        return;
      }

      var formData = new FormData(form);
      if (normalizeText(formData.get("companyName"))) {
        setStatusMessage(message, tk("main.validation.processingFailedRetry", "No fue posible procesar la solicitud. Inténtalo nuevamente."), true);
        return;
      }

      var name = normalizeText(formData.get("name"));
      var phone = normalizeText(formData.get("phone"));
      var email = normalizeText(formData.get("email"));
      var topic = normalizeText(formData.get("topic"));
      var note = normalizeText(formData.get("message"));

      if (!isValidPhone(phone)) {
        setStatusMessage(message, tk("main.validation.invalidPhoneReply", "Ingresa un teléfono válido para poder responderte."), true);
        return;
      }

      if (note.length < 10) {
        setStatusMessage(message, tk("main.validation.messageMinLength", "El mensaje debe tener al menos 10 caracteres."), true);
        return;
      }

      if (hasApiBase()) {
        try {
          await apiRequest("/api/v1/contact-messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              name: name,
              phone: phone,
              email: email,
              topic: topic || "otro",
              message: note,
              privacyConsent: true,
              companyName: normalizeText(formData.get("companyName"))
            })
          });

          setStatusMessage(message, tk("main.messages.contactSentSuccess", "Mensaje enviado correctamente. Te responderemos en el horario de atención."), false);
          form.reset();
          return;
        } catch (error) {
          setStatusMessage(
            message,
            tk("main.messages.contactSendFailed", "No se pudo enviar tu mensaje al servidor. Intenta nuevamente o contáctanos por WhatsApp."),
            true
          );
          return;
        }
      }

      var subject = tk("main.mail.subjectPrefix", "Consulta web -") + " " + (topic || tk("main.topics.general", "general"));
      var body =
        tk("main.mail.namePrefix", "Nombre:") +
        " " +
        name +
        "\n" +
        tk("main.mail.phonePrefix", "Teléfono:") +
        " " +
        phone +
        "\n" +
        tk("main.mail.emailPrefix", "Correo:") +
        " " +
        email +
        "\n" +
        tk("main.mail.topicPrefix", "Tema:") +
        " " +
        topic +
        "\n\n" +
        tk("main.mail.messagePrefix", "Mensaje:") +
        "\n" +
        note;

      if (!data.clinic || !data.clinic.email) {
        setStatusMessage(message, tk("main.messages.noDestinationEmail", "No se encontró un correo de destino configurado. Intenta por WhatsApp."), true);
        return;
      }

      window.location.href = "mailto:" + data.clinic.email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
      setStatusMessage(message, tk("main.messages.mailAppOpened", "Se abrió tu aplicación de correo para completar el envío del mensaje."), false);
      form.reset();
    });
  }

  function renderPrevisitSummary(summaryHost, payload) {
    if (!summaryHost) {
      return;
    }

    var urgency = normalizeText(payload.urgencyLevel || "").toLowerCase();
    var urgencyClass = "urgency-low";
    if (urgency === "critical") {
      urgencyClass = "urgency-critical";
    } else if (urgency === "high") {
      urgencyClass = "urgency-high";
    } else if (urgency === "medium") {
      urgencyClass = "urgency-medium";
    }

    summaryHost.innerHTML =
      '<p><strong>' + tk("main.labels.detectedUrgency", "Urgencia detectada:") + '</strong> <span class="urgency-pill ' +
      urgencyClass +
      '">' +
      escapeHTML(urgency || "low") +
      "</span></p>" +
      '<p><strong>' + tk("main.labels.recommendedChannel", "Canal recomendado:") + '</strong> ' +
      escapeHTML(channelLabel(payload.recommendedChannel || "priority_visit")) +
      "</p>" +
      '<p><strong>' + tk("main.labels.clinicalSummary", "Resumen clínico:") + '</strong> ' +
      escapeHTML(payload.triageSummary || payload.urgencyReason || tk("main.defaults.noAdditionalNotes", "Sin observaciones adicionales.")) +
      "</p>" +
      (payload.advisory ? '<p class="previsit-advisory">' + escapeHTML(payload.advisory) + "</p>" : "");
  }

  function evaluateLocalUrgency(input) {
    var score = 0;

    if (Number(input.feverCelsius) >= 40) {
      score += 35;
    } else if (Number(input.feverCelsius) >= 39) {
      score += 22;
    }

    if (Number(input.patientAge) <= 1 && Number(input.feverCelsius) >= 38) {
      score += 28;
    }

    if (Number(input.painLevel) >= 8) {
      score += 22;
    } else if (Number(input.painLevel) >= 5) {
      score += 12;
    }

    if (Number(input.durationHours) >= 72) {
      score += 14;
    } else if (Number(input.durationHours) >= 24) {
      score += 6;
    }

    if (Array.isArray(input.warningSigns) && input.warningSigns.length >= 2) {
      score += 15;
    }

    if (Array.isArray(input.warningSigns) && input.warningSigns.indexOf("difficulty_breathing") >= 0) {
      score += 40;
    }

    var urgencyLevel = "low";
    var recommendedChannel = "home_monitor";
    var advisory = tk("main.advisory.homeMonitor", "Monitoreo en casa con seguimiento pediátrico.");

    if (score >= 70) {
      urgencyLevel = "critical";
      recommendedChannel = "emergency";
      advisory = tk("main.advisory.emergencyNow", "Acude a emergencias pediátricas de inmediato.");
    } else if (score >= 45) {
      urgencyLevel = "high";
      recommendedChannel = "same_day_visit";
      advisory = tk("main.advisory.sameDay", "Consulta pediátrica el mismo día.");
    } else if (score >= 24) {
      urgencyLevel = "medium";
      recommendedChannel = "priority_visit";
      advisory = tk("main.advisory.priority24h", "Consulta prioritaria en las próximas 24 horas.");
    }

    return {
      urgencyLevel: urgencyLevel,
      urgencyScore: score,
      recommendedChannel: recommendedChannel,
      triageSummary: tk("main.messages.preliminaryLocal", "Resultado preliminar generado localmente."),
      advisory: advisory
    };
  }

  function setupPreVisitAssistant() {
    var form = document.getElementById("previsit-form");
    if (!form) {
      return;
    }

    var confirmation = document.getElementById("previsit-confirmation");
    var summaryHost = document.getElementById("previsit-summary");

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        setStatusMessage(confirmation, tk("main.validation.requiredContinue", "Completa los campos obligatorios para continuar."), true);
        return;
      }

      var formData = new FormData(form);
      if (normalizeText(formData.get("companyWebsite"))) {
        setStatusMessage(confirmation, tk("main.validation.processingFailedRetry", "No fue posible procesar la solicitud. Inténtalo nuevamente."), true);
        return;
      }

      var payload = {
        patientName: normalizeText(formData.get("patientName")),
        patientAge: Number(normalizeText(formData.get("patientAge"))),
        guardianName: normalizeText(formData.get("guardianName")),
        guardianPhone: normalizeText(formData.get("guardianPhone")),
        primaryReason: normalizeText(formData.get("primaryReason")),
        symptoms: normalizeText(formData.get("symptoms")),
        feverCelsius: normalizeText(formData.get("feverCelsius")) ? Number(normalizeText(formData.get("feverCelsius"))) : null,
        painLevel: Number(normalizeText(formData.get("painLevel")) || 0),
        durationHours: Number(normalizeText(formData.get("durationHours")) || 0),
        allergies: normalizeText(formData.get("allergies")),
        medications: normalizeText(formData.get("medications")),
        privacyConsent: Boolean(formData.get("privacyConsent")),
        companyWebsite: normalizeText(formData.get("companyWebsite"))
      };

      if (!isValidPhone(payload.guardianPhone)) {
        setStatusMessage(confirmation, tk("main.validation.invalidPhoneReply", "Ingresa un teléfono válido para poder responderte."), true);
        return;
      }

      if (hasApiBase()) {
        try {
          var response = await apiRequest("/api/v1/pre-visit-assessments", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
          });

          var assessment = (response && response.data && response.data.assessment) || {};
          var advisory = (response && response.data && response.data.advisory) || "";
          renderPrevisitSummary(summaryHost, {
            urgencyLevel: assessment.urgencyLevel,
            recommendedChannel: assessment.recommendedChannel,
            triageSummary: assessment.triageSummary,
            advisory: advisory
          });
          setStatusMessage(confirmation, tk("main.messages.pretriageSent", "Pre-triage enviado correctamente y agregado a la bandeja clínica."), false);
          return;
        } catch (error) {
          setStatusMessage(confirmation, tk("main.messages.pretriageSendFailedLocal", "No se pudo enviar el pre-triage al servidor. Mostramos evaluación local."), true);
        }
      }

      var localResult = evaluateLocalUrgency(payload);
      renderPrevisitSummary(summaryHost, localResult);
    });
  }

  function setupPremiumResources() {
    var form = document.getElementById("premium-resources-form");
    var resultHost = document.getElementById("premium-resource-result");
    var listHost = document.getElementById("premium-download-list");
    if (!form || !resultHost || !listHost) {
      return;
    }

    var storageKey = "dr_katherine_premium_resources";
    var localCatalog = {
      "fiebre-24h-kit": "/assets/downloads/fiebre-24h-kit.txt",
      "alimentacion-etapas-kit": "/assets/downloads/alimentacion-etapas-kit.txt",
      "vacunas-checklist-kit": "/assets/downloads/vacunas-checklist-kit.txt",
      "botiquin-hogar-kit": "/assets/downloads/botiquin-hogar-kit.txt"
    };

    function readUnlocked() {
      try {
        var raw = window.localStorage.getItem(storageKey);
        var parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch (_error) {
        return [];
      }
    }

    function writeUnlocked(items) {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(items));
      } catch (_error) {
        // ignore local storage errors
      }
    }

    function renderUnlocked() {
      var items = readUnlocked();
      if (!items.length) {
        listHost.innerHTML = "<p>" + tk("main.messages.noUnlockedResources", "Aún no hay recursos desbloqueados en este dispositivo.") + "</p>";
        return;
      }

      listHost.innerHTML =
        "<ul>" +
        items
          .map(function (item) {
            return (
              '<li><a class=\"text-link\" href=\"' +
              localUrl(item.downloadUrl) +
              '" download>' +
              escapeHTML(item.title) +
              "</a></li>"
            );
          })
          .join("") +
        "</ul>";
    }

    renderUnlocked();

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        setStatusMessage(resultHost, tk("main.validation.requiredActivateResource", "Completa los campos requeridos para activar el recurso."), true);
        return;
      }

      var formData = new FormData(form);
      if (normalizeText(formData.get("companyWebsite"))) {
        setStatusMessage(resultHost, tk("main.validation.processingFailedRetry", "No fue posible procesar la solicitud. Inténtalo nuevamente."), true);
        return;
      }

      var payload = {
        parentName: normalizeText(formData.get("parentName")),
        parentEmail: normalizeText(formData.get("parentEmail")),
        childAgeGroup: normalizeText(formData.get("childAgeGroup")),
        resourceKey: normalizeText(formData.get("resourceKey")),
        privacyConsent: Boolean(formData.get("privacyConsent")),
        companyWebsite: normalizeText(formData.get("companyWebsite"))
      };

      if (!isValidEmail(payload.parentEmail)) {
        setStatusMessage(resultHost, tk("main.validation.invalidEmail", "Ingresa un correo electrónico válido."), true);
        return;
      }

      var unlockItem = {
        key: payload.resourceKey,
        title: payload.resourceKey,
        downloadUrl: localCatalog[payload.resourceKey] || "#"
      };

      if (hasApiBase()) {
        try {
          var response = await apiRequest("/api/v1/resource-downloads", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
          });

          if (response && response.data && response.data.resource) {
            unlockItem.title = response.data.resource.title || unlockItem.title;
            unlockItem.downloadUrl = response.data.resource.downloadUrl || unlockItem.downloadUrl;
          }
        } catch (error) {
          setStatusMessage(
            resultHost,
            tk("main.messages.resourceRegisterFailedLocal", "No se pudo registrar el recurso en el servidor. Lo activamos localmente en este dispositivo."),
            true
          );
        }
      }

      var current = readUnlocked().filter(function (item) {
        return item.key !== unlockItem.key;
      });
      current.unshift(unlockItem);
      writeUnlocked(current.slice(0, 10));
      renderUnlocked();
      setStatusMessage(resultHost, tk("main.messages.resourceActivated", "Recurso activado correctamente. Ya puedes descargarlo."), false);
      form.reset();
    });
  }

  function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var result = String(reader.result || "");
        resolve(result.replace(/^data:[^;]+;base64,/i, ""));
      };
      reader.onerror = function () {
        reject(new Error(tk("main.messages.cannotReadImage", "No fue posible leer una de las imágenes.")));
      };
      reader.readAsDataURL(file);
    });
  }

  function setupRapidEvaluationForm() {
    var form = document.getElementById("rapid-eval-form");
    if (!form) {
      return;
    }

    var confirmation = document.getElementById("rapid-eval-confirmation");
    var resultHost = document.getElementById("rapid-eval-result");
    var photosInput = document.getElementById("rapid-photos");
    var photosTrigger = document.getElementById("rapid-photos-trigger");
    var photosStatus = document.getElementById("rapid-photos-status");
    var previewHost = document.getElementById("rapid-photo-preview");

    function getSelectedFilesText(files) {
      var selected = files ? files.length : 0;
      if (!selected) {
        return tk("main.files.noneSelected", "Ningún archivo seleccionado");
      }
      if (selected === 1) {
        return tk("main.files.oneSelected", "1 archivo seleccionado");
      }
      return tk("main.files.manySelected", "{count} archivos seleccionados", { count: selected });
    }

    function syncPhotoInputLabels() {
      if (photosTrigger) {
        photosTrigger.textContent = tk("main.actions.selectFile", "Seleccionar archivo");
      }
      if (photosStatus) {
        photosStatus.textContent = getSelectedFilesText(photosInput && photosInput.files);
      }
    }

    function renderPreview(files) {
      if (!previewHost) {
        return;
      }
      if (!files || !files.length) {
        previewHost.innerHTML = "";
        return;
      }

      previewHost.innerHTML = "";
      Array.prototype.slice.call(files, 0, 4).forEach(function (file) {
        var item = document.createElement("div");
        item.className = "photo-preview-item";
        item.textContent = file.name + " (" + Math.round(file.size / 1024) + "KB)";
        previewHost.appendChild(item);
      });
    }

    if (photosInput) {
      photosInput.addEventListener("change", function () {
        renderPreview(photosInput.files);
        if (photosStatus) {
          photosStatus.textContent = getSelectedFilesText(photosInput.files);
        }
      });
    }

    if (photosTrigger && photosInput) {
      photosTrigger.addEventListener("click", function () {
        photosInput.click();
      });
    }

    syncPhotoInputLabels();

    if (i18n && typeof i18n.onLanguageChange === "function") {
      i18n.onLanguageChange(function () {
        syncPhotoInputLabels();
      });
    }

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        setStatusMessage(confirmation, tk("main.validation.requiredSendCase", "Completa los campos requeridos para enviar el caso."), true);
        return;
      }

      var formData = new FormData(form);
      if (normalizeText(formData.get("companyWebsite"))) {
        setStatusMessage(confirmation, tk("main.validation.processingFailedRetry", "No fue posible procesar la solicitud. Inténtalo nuevamente."), true);
        return;
      }

      var warningSigns = formData.getAll("warningSigns").map(function (item) {
        return normalizeText(item);
      }).filter(Boolean);

      var files = photosInput && photosInput.files ? Array.prototype.slice.call(photosInput.files, 0, 4) : [];
      var encodedPhotos = [];
      if (files.length) {
        for (var index = 0; index < files.length; index += 1) {
          var file = files[index];
          var encoded = await fileToBase64(file);
          encodedPhotos.push({
            originalName: file.name,
            mimeType: file.type || "image/jpeg",
            dataBase64: encoded
          });
        }
      }

      var payload = {
        patientName: normalizeText(formData.get("patientName")),
        patientAge: Number(normalizeText(formData.get("patientAge"))),
        guardianName: normalizeText(formData.get("guardianName")),
        guardianPhone: normalizeText(formData.get("guardianPhone")),
        guardianEmail: normalizeText(formData.get("guardianEmail")),
        title: normalizeText(formData.get("title")),
        description: normalizeText(formData.get("description")),
        feverCelsius: normalizeText(formData.get("feverCelsius")) ? Number(normalizeText(formData.get("feverCelsius"))) : null,
        painLevel: Number(normalizeText(formData.get("painLevel")) || 0),
        durationHours: Number(normalizeText(formData.get("durationHours")) || 0),
        hasAllergies: Boolean(formData.get("hasAllergies")),
        allergyDetails: normalizeText(formData.get("allergyDetails")),
        warningSigns: warningSigns,
        photos: encodedPhotos,
        privacyConsent: Boolean(formData.get("privacyConsent")),
        companyWebsite: normalizeText(formData.get("companyWebsite"))
      };

      if (!isValidPhone(payload.guardianPhone)) {
        setStatusMessage(confirmation, tk("main.validation.invalidPhoneFollowUp", "Ingresa un teléfono válido para seguimiento clínico."), true);
        return;
      }
      if (payload.guardianEmail && !isValidEmail(payload.guardianEmail)) {
        setStatusMessage(confirmation, tk("main.validation.invalidEmailOptional", "Ingresa un correo válido o déjalo en blanco."), true);
        return;
      }

      var triageResult;
      if (hasApiBase()) {
        try {
          var response = await apiRequest("/api/v1/triage/cases", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
          });

          triageResult = {
            id: response && response.data && response.data.triageCase ? response.data.triageCase.id : "N/A",
            urgencyLevel: response && response.data && response.data.triageCase ? response.data.triageCase.urgencyLevel : "low",
            urgencyReason: response && response.data && response.data.triageCase ? response.data.triageCase.urgencyReason : "",
            recommendedChannel: response && response.data ? response.data.recommendedChannel : "priority_visit",
            advisory: response && response.data ? response.data.advisory : ""
          };
          setStatusMessage(
            confirmation,
            tk("main.messages.caseSentSuccess", "Caso enviado correctamente. La doctora lo verá en su bandeja priorizada."),
            false
          );
        } catch (error) {
          setStatusMessage(
            confirmation,
            tk("main.messages.caseSendFailedLocal", "No se pudo enviar el caso al servidor. Mostramos evaluación preliminar local."),
            true
          );
        }
      }

      if (!triageResult) {
        var local = evaluateLocalUrgency(payload);
        triageResult = {
          id: "LOCAL",
          urgencyLevel: local.urgencyLevel,
          urgencyReason: local.triageSummary,
          recommendedChannel: local.recommendedChannel,
          advisory: local.advisory
        };
      }

      renderPrevisitSummary(resultHost, {
        urgencyLevel: triageResult.urgencyLevel,
        recommendedChannel: triageResult.recommendedChannel,
        triageSummary: triageResult.urgencyReason,
        advisory: triageResult.advisory
      });
    });
  }

  function setupReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) {
      return;
    }

    if (!("IntersectionObserver" in window)) {
      items.forEach(function (item) {
        item.classList.add("is-visible");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -40px 0px"
      }
    );

    items.forEach(function (item) {
      observer.observe(item);
    });
  }

  renderSocialProof();
  renderAdvantages();
  renderServices();
  renderDoctorInfo();
  renderResources();
  renderAgeRoutes();
  renderWarningSigns();
  renderPremiumResourcesCards();
  renderTestimonials();
  renderFaqs();
  setupAgendaModule();
  setupContactForm();
  setupPreVisitAssistant();
  setupPremiumResources();
  setupRapidEvaluationForm();
  setupReveal();
})();
