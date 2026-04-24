(function () {
  var hostName = String(window.location.hostname || "").toLowerCase();
  var isLocalHost = hostName === "localhost" || hostName === "127.0.0.1";
  var runtimeApiBase = String(window.DR_KATHERINE_API_BASE || "").trim();
  var apiBase = (runtimeApiBase || (isLocalHost ? "http://localhost:8787" : "")).replace(/\/+$/, "");
  var state = {
    range: null,
    csrfToken: ""
  };

  var authForm = document.getElementById("admin-auth-form");
  var authStatus = document.getElementById("admin-auth-status");
  var passwordInput = document.getElementById("admin-password-input");
  var logoutButton = document.getElementById("admin-auth-logout");
  var filterForm = document.getElementById("metrics-filter-form");
  var fromInput = document.getElementById("metrics-from");
  var toInput = document.getElementById("metrics-to");
  var exportButton = document.getElementById("metrics-export-btn");
  var activityChartHost = document.getElementById("chart-activity");
  var transitionsChartHost = document.getElementById("chart-transitions");
  var statusDistributionHost = document.getElementById("status-distribution");
  var topicDistributionHost = document.getElementById("topic-distribution");
  var triageDistributionHost = document.getElementById("triage-distribution");
  var resourcesDistributionHost = document.getElementById("resources-distribution");
  var triageQueueHost = document.getElementById("triage-queue");

  function withApiBase(path) {
    return apiBase ? apiBase + path : path;
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("es-DO").format(Number(value || 0));
  }

  function formatPercent(value) {
    return Number(value || 0).toFixed(2) + "%";
  }

  function formatHours(value) {
    return Number(value || 0).toFixed(2);
  }

  function defaultRange() {
    var end = new Date();
    var start = new Date(end.getTime());
    start.setUTCDate(start.getUTCDate() - 29);
    return {
      from: start.toISOString().slice(0, 10),
      to: end.toISOString().slice(0, 10)
    };
  }

  function setAuthStatus(message, isError) {
    authStatus.textContent = message || "";
    authStatus.classList.toggle("is-error", Boolean(isError));
  }

  function parseCookies() {
    var result = {};
    var cookieText = String(document.cookie || "");
    if (!cookieText) {
      return result;
    }

    cookieText.split(";").forEach(function (entry) {
      var separatorIndex = entry.indexOf("=");
      if (separatorIndex <= 0) {
        return;
      }
      var key = entry.slice(0, separatorIndex).trim();
      var value = entry.slice(separatorIndex + 1).trim();
      if (!key) {
        return;
      }
      try {
        result[key] = decodeURIComponent(value);
      } catch (_error) {
        result[key] = value;
      }
    });

    return result;
  }

  function readCsrfFromCookie() {
    var cookies = parseCookies();
    return String(cookies.drk_admin_csrf || "").trim();
  }

  function setCsrfToken(value) {
    var cleaned = String(value || "").trim();
    state.csrfToken = cleaned || readCsrfFromCookie();
  }

  function getCsrfToken() {
    var token = String(state.csrfToken || "").trim();
    if (token) {
      return token;
    }

    token = readCsrfFromCookie();
    state.csrfToken = token;
    return token;
  }

  function getRangeFromInputs() {
    return {
      from: String(fromInput.value || "").trim(),
      to: String(toInput.value || "").trim()
    };
  }

  function buildQuery(range) {
    return "?from=" + encodeURIComponent(range.from) + "&to=" + encodeURIComponent(range.to);
  }

  async function login(password) {
    var response = await fetch(withApiBase("/api/v1/admin/auth/login"), {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        password: password
      })
    });

    var payload = await response.json().catch(function () {
      return null;
    });

    if (!response.ok || !payload || payload.ok !== true) {
      var message = (payload && payload.error) || "No se pudo iniciar sesión.";
      throw new Error(message);
    }

    setCsrfToken(payload && payload.data ? payload.data.csrfToken : "");
    return payload.data || {};
  }

  async function ensureSession() {
    var response = await fetch(withApiBase("/api/v1/admin/auth/me"), {
      method: "GET",
      credentials: "include"
    });

    var payload = await response.json().catch(function () {
      return null;
    });

    if (!response.ok || !payload || payload.ok !== true) {
      setCsrfToken("");
      var message = (payload && payload.error) || "Tu sesión expiró. Inicia sesión nuevamente.";
      throw new Error(message);
    }

    setCsrfToken(payload && payload.data ? payload.data.csrfToken : "");
    return payload.data;
  }

  async function logout() {
    var csrfToken = getCsrfToken();

    await fetch(withApiBase("/api/v1/admin/auth/logout"), {
      method: "POST",
      credentials: "include",
      headers: csrfToken
        ? {
            "x-csrf-token": csrfToken
          }
        : {}
    }).catch(function () {
      return null;
    });

    setCsrfToken("");
    setAuthStatus("Sesión cerrada.");
  }

  async function requestJson(path, options) {
    var method = ((options && options.method) || "GET").toUpperCase();
    var headers = Object.assign(
      {
        "Content-Type": "application/json"
      },
      (options && options.headers) || {}
    );
    var body = options && Object.prototype.hasOwnProperty.call(options, "body") ? options.body : undefined;

    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
      var csrfToken = getCsrfToken();
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken;
      }
    }

    var response = await fetch(withApiBase(path), {
      method: method,
      credentials: "include",
      headers: headers,
      body: body
    });

    var payload = await response.json().catch(function () {
      return null;
    });

    if (!response.ok || !payload || payload.ok !== true) {
      var message = (payload && payload.error) || "No se pudo consultar la API de métricas.";
      throw new Error(message);
    }

    return payload.data;
  }

  function setKpi(id, value) {
    var node = document.getElementById(id);
    if (node) {
      node.textContent = value;
    }
  }

  function renderDistribution(host, rows, emptyMessage) {
    if (!host) {
      return;
    }
    host.innerHTML = "";

    if (!rows.length) {
      var empty = document.createElement("p");
      empty.className = "admin-empty";
      empty.textContent = emptyMessage;
      host.appendChild(empty);
      return;
    }

    var max = rows.reduce(function (acc, item) {
      return Math.max(acc, Number(item.total || 0));
    }, 0);

    rows.forEach(function (item) {
      var row = document.createElement("div");
      row.className = "distribution-row";

      var label = document.createElement("span");
      label.className = "distribution-label";
      label.textContent = String(item.label || "");

      var bar = document.createElement("div");
      bar.className = "distribution-bar";
      var fill = document.createElement("div");
      fill.className = "distribution-fill";
      fill.style.width = (max > 0 ? (Number(item.total || 0) / max) * 100 : 0).toFixed(2) + "%";
      bar.appendChild(fill);

      var value = document.createElement("span");
      value.className = "distribution-value";
      value.textContent = formatNumber(item.total);

      row.appendChild(label);
      row.appendChild(bar);
      row.appendChild(value);
      host.appendChild(row);
    });
  }

  function urgencyClass(urgencyLevel) {
    var key = String(urgencyLevel || "").toLowerCase();
    if (["low", "medium", "high", "critical"].indexOf(key) >= 0) {
      return key;
    }
    return "low";
  }

  function renderTriageQueue(items) {
    if (!triageQueueHost) {
      return;
    }

    triageQueueHost.innerHTML = "";
    if (!Array.isArray(items) || !items.length) {
      triageQueueHost.innerHTML = '<p class="admin-empty">No hay casos express pendientes para revisar.</p>';
      return;
    }

    items.forEach(function (item) {
      var card = document.createElement("article");
      card.className = "triage-case-card";
      card.setAttribute("data-case-id", item.id);

      var head = document.createElement("div");
      head.className = "triage-case-head";
      head.innerHTML =
        "<strong>" +
        item.patientName +
        " (" +
        item.patientAge +
        "a)</strong>" +
        '<span class="triage-pill ' +
        urgencyClass(item.urgencyLevel) +
        '">' +
        String(item.urgencyLevel || "low") +
        "</span>";

      var meta = document.createElement("div");
      meta.className = "triage-case-meta";
      meta.innerHTML =
        "<span>Tutor: " +
        item.guardianName +
        " - " +
        item.guardianPhone +
        "</span>" +
        "<span>Estado: " +
        item.status +
        " | Fotos: " +
        Number(item.assetCount || 0) +
        "</span>" +
        "<span>Resumen: " +
        item.urgencyReason +
        "</span>";

      var actions = document.createElement("div");
      actions.className = "triage-actions";
      actions.innerHTML =
        '<select class="triage-status-select">' +
        '<option value="new">new</option>' +
        '<option value="in_review">in_review</option>' +
        '<option value="responded">responded</option>' +
        '<option value="follow_up">follow_up</option>' +
        '<option value="closed">closed</option>' +
        '<option value="referred_er">referred_er</option>' +
        "</select>" +
        '<button type="button" data-action="status">Actualizar estado</button>' +
        '<select class="triage-template-select">' +
        '<option value="monitor_casa_12h">monitor_casa_12h</option>' +
        '<option value="agendar_mismo_dia">agendar_mismo_dia</option>' +
        '<option value="ir_emergencias_ahora">ir_emergencias_ahora</option>' +
        '<option value="solicitar_estudios_previos">solicitar_estudios_previos</option>' +
        '<option value="seguimiento_24h">seguimiento_24h</option>' +
        "</select>" +
        '<input class="triage-followup-input" type="number" min="0" max="168" step="1" value="24" />' +
        '<button type="button" data-action="respond">Responder</button>' +
        '<button type="button" data-action="details">Ver detalle</button>';

      var detail = document.createElement("div");
      detail.className = "triage-case-meta";
      detail.setAttribute("data-role", "details");
      detail.textContent = "";

      card.appendChild(head);
      card.appendChild(meta);
      card.appendChild(actions);
      card.appendChild(detail);
      triageQueueHost.appendChild(card);

      var statusSelect = actions.querySelector(".triage-status-select");
      if (statusSelect) {
        statusSelect.value = item.status || "new";
      }
    });
  }

  function buildChartSvg(series, labels) {
    var width = 880;
    var height = 320;
    var padding = { top: 16, right: 18, bottom: 46, left: 52 };
    var chartWidth = width - padding.left - padding.right;
    var chartHeight = height - padding.top - padding.bottom;
    var maxValue = 0;

    series.forEach(function (item) {
      item.values.forEach(function (value) {
        maxValue = Math.max(maxValue, Number(value || 0));
      });
    });
    if (maxValue <= 0) {
      maxValue = 1;
    }

    var xStep = labels.length > 1 ? chartWidth / (labels.length - 1) : chartWidth;
    var yTicks = 4;
    var svg = [];
    svg.push('<svg viewBox="0 0 ' + width + " " + height + '" aria-hidden="true">');

    for (var i = 0; i <= yTicks; i += 1) {
      var y = padding.top + (chartHeight / yTicks) * i;
      svg.push('<line class="chart-grid-line" x1="' + padding.left + '" y1="' + y + '" x2="' + (width - padding.right) + '" y2="' + y + '"></line>');
    }

    svg.push('<line class="chart-axis-line" x1="' + padding.left + '" y1="' + (height - padding.bottom) + '" x2="' + (width - padding.right) + '" y2="' + (height - padding.bottom) + '"></line>');

    var stepLabelJump = Math.max(1, Math.ceil(labels.length / 8));
    labels.forEach(function (label, index) {
      if (index % stepLabelJump !== 0 && index !== labels.length - 1) {
        return;
      }
      var x = padding.left + (labels.length > 1 ? xStep * index : chartWidth / 2);
      svg.push('<text x="' + x + '" y="' + (height - 20) + '" text-anchor="middle" fill="#5f775d" font-size="11">' + label.slice(5) + "</text>");
    });

    series.forEach(function (item) {
      var points = item.values.map(function (value, index) {
        var x = padding.left + (labels.length > 1 ? xStep * index : chartWidth / 2);
        var normalized = Number(value || 0) / maxValue;
        var y = padding.top + chartHeight - normalized * chartHeight;
        return { x: x, y: y };
      });

      var path = points
        .map(function (point, index) {
          return (index === 0 ? "M" : "L") + point.x.toFixed(2) + " " + point.y.toFixed(2);
        })
        .join(" ");

      svg.push('<path class="' + item.lineClass + '" d="' + path + '"></path>');
      points.forEach(function (point) {
        svg.push('<circle class="chart-point" cx="' + point.x.toFixed(2) + '" cy="' + point.y.toFixed(2) + '" r="3.5" fill="' + item.color + '"></circle>');
      });
    });

    svg.push("</svg>");

    var legend = '<div class="chart-legend">';
    series.forEach(function (item) {
      legend +=
        '<span class="chart-legend-item"><span class="chart-legend-color" style="background:' +
        item.color +
        '"></span>' +
        item.label +
        "</span>";
    });
    legend += "</div>";

    return svg.join("") + legend;
  }

  function renderCharts(seriesData) {
    if (!seriesData.length) {
      activityChartHost.innerHTML = '<p class="admin-empty">No hay datos en el rango seleccionado.</p>';
      transitionsChartHost.innerHTML = '<p class="admin-empty">No hay datos en el rango seleccionado.</p>';
      return;
    }

    var labels = seriesData.map(function (item) {
      return item.day;
    });

    activityChartHost.innerHTML = buildChartSvg(
      [
        {
          label: "Citas",
          values: seriesData.map(function (item) {
            return item.appointments;
          }),
          color: "#5f775d",
          lineClass: "chart-line-primary"
        },
        {
          label: "Contactos",
          values: seriesData.map(function (item) {
            return item.contacts;
          }),
          color: "#a89d75",
          lineClass: "chart-line-secondary"
        },
        {
          label: "Pre-citas",
          values: seriesData.map(function (item) {
            return item.preVisits;
          }),
          color: "#3f8f9d",
          lineClass: "chart-line-quaternary"
        },
        {
          label: "Casos express",
          values: seriesData.map(function (item) {
            return item.triageCases;
          }),
          color: "#c24f4f",
          lineClass: "chart-line-danger"
        }
      ],
      labels
    );

    transitionsChartHost.innerHTML = buildChartSvg(
      [
        {
          label: "Confirmadas",
          values: seriesData.map(function (item) {
            return item.confirmed;
          }),
          color: "#5f775d",
          lineClass: "chart-line-primary"
        },
        {
          label: "Canceladas",
          values: seriesData.map(function (item) {
            return item.cancelled;
          }),
          color: "#cf8b2e",
          lineClass: "chart-line-tertiary"
        },
        {
          label: "No show",
          values: seriesData.map(function (item) {
            return item.noShow;
          }),
          color: "#c24f4f",
          lineClass: "chart-line-danger"
        }
      ],
      labels
    );
  }

  async function handleTriageQueueAction(event) {
    var target = event.target;
    if (!target || !target.getAttribute) {
      return;
    }

    var action = target.getAttribute("data-action");
    if (!action) {
      return;
    }

    var card = target.closest(".triage-case-card");
    if (!card) {
      return;
    }

    var caseId = card.getAttribute("data-case-id");
    if (!caseId) {
      return;
    }

    var statusSelect = card.querySelector(".triage-status-select");
    var templateSelect = card.querySelector(".triage-template-select");
    var followUpInput = card.querySelector(".triage-followup-input");
    var detailHost = card.querySelector('[data-role=\"details\"]');

    if (action === "status") {
      var statusValue = statusSelect ? String(statusSelect.value || "").trim() : "";
      if (!statusValue) {
        setAuthStatus("Selecciona un estado válido.", true);
        return;
      }

      await requestJson("/api/v1/admin/triage/cases/" + encodeURIComponent(caseId) + "/status", {
        method: "PATCH",
        body: JSON.stringify({
          status: statusValue
        })
      });
      setAuthStatus("Estado de caso actualizado.");
      await loadDashboard();
      return;
    }

    if (action === "respond") {
      var template = templateSelect ? String(templateSelect.value || "").trim() : "";
      var followUpHours = followUpInput ? Number(followUpInput.value || 0) : 0;
      var responseNote = "Respuesta clínica guiada enviada desde panel admin.";

      await requestJson("/api/v1/admin/triage/cases/" + encodeURIComponent(caseId) + "/respond", {
        method: "POST",
        body: JSON.stringify({
          template: template,
          note: responseNote,
          status: statusSelect ? String(statusSelect.value || "responded") : "responded",
          followUpHours: followUpHours
        })
      });
      setAuthStatus("Respuesta clínica registrada correctamente.");
      await loadDashboard();
      return;
    }

    if (action === "details") {
      var detail = await requestJson("/api/v1/admin/triage/cases/" + encodeURIComponent(caseId));
      var triageCase = detail && detail.triageCase ? detail.triageCase : null;
      if (!triageCase) {
        setAuthStatus("No fue posible cargar el detalle del caso.", true);
        return;
      }

      var detailLines = [];
      detailLines.push("Título: " + (triageCase.title || "-"));
      detailLines.push("Descripción: " + (triageCase.description || "-"));
      detailLines.push("Urgencia: " + (triageCase.urgencyLevel || "-") + " | Score: " + (triageCase.urgencyScore || 0));
      detailLines.push("Alergias: " + (triageCase.hasAllergies ? triageCase.allergyDetails || "Sí (sin detalle)" : "No"));
      detailLines.push("Fotos: " + ((triageCase.assets && triageCase.assets.length) || 0));
      detailLines.push("Eventos: " + ((triageCase.events && triageCase.events.length) || 0));
      if (detailHost) {
        detailHost.innerHTML = detailLines.map(function (line) { return "<span>" + line + "</span>"; }).join("");
      }
      setAuthStatus("Detalle del caso cargado.");
    }
  }

  async function loadDashboard() {
    await ensureSession();

    var range = getRangeFromInputs();
    state.range = range;

    setAuthStatus("Consultando métricas...");

    var query = buildQuery(range);
    var metrics = await requestJson("/api/v1/admin/metrics" + query);
    var timeseries = await requestJson("/api/v1/admin/metrics/timeseries" + query);
    var triageQueueData = await requestJson("/api/v1/admin/triage/cases?status=new,in_review,follow_up&limit=20");

    var kpis = metrics.kpis || {};
    setKpi("kpi-appointments-total", formatNumber(kpis.appointmentsTotal));
    setKpi("kpi-contacts-total", formatNumber(kpis.contactsTotal));
    setKpi("kpi-occupancy-rate", formatPercent(kpis.occupancyRate));
    setKpi("kpi-conversion-rate", formatPercent(kpis.conversionRate));
    setKpi("kpi-no-show-rate", formatPercent(kpis.noShowRate));
    setKpi("kpi-avg-lead-hours", formatHours(kpis.avgLeadHours));
    setKpi("kpi-previsit-total", formatNumber(kpis.preVisitTotal));
    setKpi("kpi-triage-total", formatNumber(kpis.triageCasesTotal));
    setKpi("kpi-triage-critical", formatNumber(kpis.triageCriticalTotal));
    setKpi("kpi-resource-downloads", formatNumber(kpis.resourceDownloadsTotal));
    setKpi("kpi-reminders-sent", formatNumber(kpis.remindersSentTotal));

    var statusRows = Object.keys(metrics.appointmentsByStatus || {}).map(function (key) {
      return {
        label: key.replace("_", " "),
        total: metrics.appointmentsByStatus[key]
      };
    });
    renderDistribution(statusDistributionHost, statusRows, "Sin citas para mostrar distribución de estado.");

    var topicRows = (metrics.contactsByTopic || []).map(function (row) {
      return {
        label: row.topic,
        total: row.total
      };
    });
    renderDistribution(topicDistributionHost, topicRows, "Sin mensajes de contacto en el rango seleccionado.");

    var triageRows = (metrics.triageByUrgency || []).map(function (row) {
      return {
        label: row.urgencyLevel,
        total: row.total
      };
    });
    renderDistribution(triageDistributionHost, triageRows, "Sin casos express en el rango seleccionado.");

    var resourcesRows = (metrics.resourcesByKey || []).map(function (row) {
      return {
        label: row.resourceKey,
        total: row.total
      };
    });
    renderDistribution(resourcesDistributionHost, resourcesRows, "Sin descargas premium en el rango seleccionado.");

    renderCharts(timeseries.series || []);
    renderTriageQueue((triageQueueData && triageQueueData.triageCases) || []);
    setAuthStatus("Métricas actualizadas correctamente.");
  }

  async function exportCsv() {
    await ensureSession();

    var range = getRangeFromInputs();
    var url = withApiBase("/api/v1/admin/metrics/export.csv" + buildQuery(range));
    var response = await fetch(url, {
      method: "GET",
      credentials: "include"
    });

    if (!response.ok) {
      var payload = await response.json().catch(function () {
        return null;
      });
      throw new Error((payload && payload.error) || "No se pudo exportar el CSV.");
    }

    var blob = await response.blob();
    var link = document.createElement("a");
    var objectUrl = URL.createObjectURL(blob);
    link.href = objectUrl;
    link.download = "metrics-" + range.from + "-to-" + range.to + ".csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  }

  function preloadState() {
    var range = defaultRange();
    fromInput.value = range.from;
    toInput.value = range.to;
  }

  authForm.addEventListener("submit", function (event) {
    event.preventDefault();

    var password = String(passwordInput.value || "").trim();
    if (!password) {
      setAuthStatus("Debes ingresar la contraseña administrativa.", true);
      return;
    }

    setAuthStatus("Autenticando...");
    login(password)
      .then(function () {
        passwordInput.value = "";
        return loadDashboard();
      })
      .catch(function (error) {
        setAuthStatus(error.message, true);
      });
  });

  logoutButton.addEventListener("click", function () {
    logout().catch(function (error) {
      setAuthStatus(error.message, true);
    });
  });

  filterForm.addEventListener("submit", function (event) {
    event.preventDefault();
    loadDashboard().catch(function (error) {
      setAuthStatus(error.message, true);
    });
  });

  exportButton.addEventListener("click", function () {
    exportCsv()
      .then(function () {
        setAuthStatus("CSV generado correctamente.");
      })
      .catch(function (error) {
        setAuthStatus(error.message, true);
      });
  });

  if (triageQueueHost) {
    triageQueueHost.addEventListener("click", function (event) {
      handleTriageQueueAction(event).catch(function (error) {
        setAuthStatus(error.message || "No se pudo procesar la acción sobre el caso.", true);
      });
    });
  }

  preloadState();
  setAuthStatus("Verificando sesión...");
  ensureSession()
    .then(function () {
      return loadDashboard();
    })
    .catch(function (_error) {
      setAuthStatus("Inicia sesión para ver métricas.");
    });
})();
