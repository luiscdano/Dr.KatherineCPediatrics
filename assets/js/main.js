(function () {
  var data = window.DR_KATHERINE_DATA;
  var utils = window.DR_KATHERINE_UTILS || {};
  var localUrl = typeof utils.localUrl === "function" ? utils.localUrl : function (path) { return path; };
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
      throw new Error("No se configuró una URL válida de API.");
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
        throw new Error("La solicitud tardó demasiado. Intenta nuevamente.");
      }
      throw new Error("No fue posible conectar con el servidor.");
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
        "El servidor devolvió un error al procesar la solicitud.";
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
    return (
      '<article class="service-card service-item reveal">' +
      '<div class="service-image-wrap">' +
      '<img class="service-image" src="' + localUrl("/assets/img/isotipo.png") + '" alt="Isotipo servicio pediátrico" loading="lazy" />' +
      '<div class="service-hover-wrap"><span class="service-hover-icon">+</span></div>' +
      "</div>" +
      '<div class="service-info">' +
      '<h3 class="service-title">' + item.title + '</h3>' +
      '<p class="service-description">' + item.summary + "</p>" +
      (compact ? '<div class="service-list-wrap">' + badges + "</div>" : '<ul class="service-list">' + bullets + "</ul>") +
      '<a class="text-link" href="' + localUrl(item.detailHref) + '">Ver detalle</a>' +
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
          '<a class="text-link" href="' + localUrl(item.href) + '">Leer recurso</a>' +
          '</article>'
        );
      })
      .join("");

    setHTML("resources-home-grid", html);
    setHTML("resources-page-grid", html);
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
        patientName: String(item.patientName || "Paciente").trim() || "Paciente",
        patientAge: String(item.patientAge || "").trim(),
        parentName: String(item.parentName || "Tutor").trim() || "Tutor",
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
      var header = "Solicitud de cita pediátrica";
      var lines = [
        "Fecha: " + appointment.date,
        "Hora: " + appointment.time,
        "Paciente: " + appointment.patientName + " (" + appointment.patientAge + ")",
        "Tutor: " + appointment.parentName,
        "Teléfono: " + appointment.parentPhone
      ];
      if (appointment.reason) {
        lines.push("Motivo: " + appointment.reason);
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
        empty.textContent = "Aún no hay solicitudes recientes en este dispositivo.";
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
        var statusLabel = item.status === "draft" ? "Borrador local" : "Pendiente de confirmación";
        details.textContent = "Tutor: " + item.parentName + " | Tel: " + item.parentPhone + " | Estado: " + statusLabel;

        var actions = document.createElement("div");
        actions.className = "appointment-history-actions";

        var removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "appointment-remove-btn";
        removeBtn.setAttribute("data-id", item.id);
        removeBtn.textContent = "Eliminar";

        actions.appendChild(removeBtn);
        row.appendChild(headline);
        row.appendChild(details);
        row.appendChild(actions);
        list.appendChild(row);
      });
      historyHost.appendChild(list);
    }

    function formatDateLabel(date) {
      return date.toLocaleDateString("es-DO", {
        weekday: "short",
        day: "2-digit",
        month: "short"
      });
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
      var datePart = selectedDate ? selectedDateInput.value : "Sin fecha";
      var timePart = selectedTime ? selectedTimeInput.value : "Sin horario";
      summary.textContent = "Seleccionado: " + datePart + " a las " + timePart;
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
          var label = isTaken ? time + " • ocupado" : time;
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

    if (dateWrap) {
      var dates = [];
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
          setStatusMessage(confirmation, "Completa los campos obligatorios para continuar.", true);
          return;
        }
        var formData = new FormData(form);
        if (normalizeText(formData.get("companyWebsite"))) {
          setStatusMessage(confirmation, "No fue posible procesar la solicitud. Inténtalo nuevamente.", true);
          return;
        }
        if (!selectedDate || !selectedTime) {
          setStatusMessage(confirmation, "Selecciona fecha y horario antes de enviar.", true);
          return;
        }

        var patientName = normalizeText(formData.get("patientName"));
        var patientAge = normalizeText(formData.get("patientAge"));
        var parentName = normalizeText(formData.get("parentName"));
        var parentPhone = normalizeText(formData.get("parentPhone"));
        var reason = normalizeText(formData.get("reason"));
        var ageNumber = Number(patientAge);

        if (!isValidPhone(parentPhone)) {
          setStatusMessage(confirmation, "Ingresa un teléfono válido para confirmar la cita.", true);
          return;
        }

        if (!Number.isFinite(ageNumber) || ageNumber < 0 || ageNumber > 18) {
          setStatusMessage(confirmation, "La edad del paciente debe estar entre 0 y 18 años.", true);
          return;
        }

        if (reason.length < 8) {
          setStatusMessage(confirmation, "Describe el motivo de consulta con más detalle (mínimo 8 caracteres).", true);
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
          setStatusMessage(confirmation, "Ese horario ya está ocupado para la fecha seleccionada. Elige otro.", true);
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
                "Ese horario acaba de ocuparse. Elige otro horario disponible para continuar.",
                true
              );
              paintSlots();
              updateSummary();
              return;
            }
            setStatusMessage(
              confirmation,
              "No se pudo enviar la solicitud al servidor. Puedes reintentar o contactar por WhatsApp.",
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
            "Solicitud enviada para el " +
              appointment.date +
              " a las " +
              appointment.time +
              ". Te confirmaremos por WhatsApp o llamada del consultorio.",
            false
          );
        } else {
          setStatusMessage(
            confirmation,
            "Solicitud guardada localmente en este dispositivo. Configura la API para enviarla al consultorio.",
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
        setStatusMessage(message, "Completa los campos requeridos para enviar tu consulta.", true);
        return;
      }

      var formData = new FormData(form);
      if (normalizeText(formData.get("companyName"))) {
        setStatusMessage(message, "No fue posible procesar la solicitud. Inténtalo nuevamente.", true);
        return;
      }

      var name = normalizeText(formData.get("name"));
      var phone = normalizeText(formData.get("phone"));
      var email = normalizeText(formData.get("email"));
      var topic = normalizeText(formData.get("topic"));
      var note = normalizeText(formData.get("message"));

      if (!isValidPhone(phone)) {
        setStatusMessage(message, "Ingresa un teléfono válido para poder responderte.", true);
        return;
      }

      if (note.length < 10) {
        setStatusMessage(message, "El mensaje debe tener al menos 10 caracteres.", true);
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

          setStatusMessage(message, "Mensaje enviado correctamente. Te responderemos en el horario de atención.", false);
          form.reset();
          return;
        } catch (error) {
          setStatusMessage(
            message,
            "No se pudo enviar tu mensaje al servidor. Intenta nuevamente o contáctanos por WhatsApp.",
            true
          );
          return;
        }
      }

      var subject = "Consulta web - " + (topic || "general");
      var body =
        "Nombre: " +
        name +
        "\nTeléfono: " +
        phone +
        "\nCorreo: " +
        email +
        "\nTema: " +
        topic +
        "\n\nMensaje:\n" +
        note;

      if (!data.clinic || !data.clinic.email) {
        setStatusMessage(message, "No se encontró un correo de destino configurado. Intenta por WhatsApp.", true);
        return;
      }

      window.location.href = "mailto:" + data.clinic.email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
      setStatusMessage(message, "Se abrió tu aplicación de correo para completar el envío del mensaje.", false);
      form.reset();
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
  renderTestimonials();
  renderFaqs();
  setupAgendaModule();
  setupContactForm();
  setupReveal();
})();
