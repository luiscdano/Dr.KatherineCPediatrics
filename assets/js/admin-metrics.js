(function () {
  var storageKey = "dr_katherine_admin_token";
  var hostName = String(window.location.hostname || "").toLowerCase();
  var isLocalHost = hostName === "localhost" || hostName === "127.0.0.1";
  var runtimeApiBase = String(window.DR_KATHERINE_API_BASE || "").trim();
  var apiBase = (runtimeApiBase || (isLocalHost ? "http://localhost:8787" : "")).replace(/\/+$/, "");
  var state = {
    adminToken: "",
    range: null
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

  function getAdminToken() {
    return String(state.adminToken || "").trim();
  }

  function setAdminToken(value) {
    var cleaned = String(value || "").trim();
    state.adminToken = cleaned;
    if (cleaned) {
      sessionStorage.setItem(storageKey, cleaned);
    } else {
      sessionStorage.removeItem(storageKey);
    }
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

  function getAuthorizationHeader() {
    var token = getAdminToken();
    if (!token) {
      throw new Error("Debes iniciar sesión para consultar métricas.");
    }
    return "Bearer " + token;
  }

  async function login(password) {
    var response = await fetch(withApiBase("/api/v1/admin/auth/login"), {
      method: "POST",
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

    if (!response.ok || !payload || payload.ok !== true || !payload.data || !payload.data.token) {
      var message = (payload && payload.error) || "No se pudo iniciar sesión.";
      throw new Error(message);
    }

    setAdminToken(payload.data.token);
    return payload.data;
  }

  async function ensureSession() {
    var token = getAdminToken();
    if (!token) {
      throw new Error("Debes iniciar sesión para consultar métricas.");
    }

    var response = await fetch(withApiBase("/api/v1/admin/auth/me"), {
      method: "GET",
      headers: {
        Authorization: "Bearer " + token
      }
    });

    var payload = await response.json().catch(function () {
      return null;
    });

    if (!response.ok || !payload || payload.ok !== true) {
      setAdminToken("");
      var message = (payload && payload.error) || "Tu sesión expiró. Inicia sesión nuevamente.";
      throw new Error(message);
    }

    return payload.data;
  }

  async function logout() {
    var token = getAdminToken();
    if (!token) {
      setAuthStatus("No hay sesión activa.");
      return;
    }

    await fetch(withApiBase("/api/v1/admin/auth/logout"), {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token
      }
    }).catch(function () {
      return null;
    });

    setAdminToken("");
    setAuthStatus("Sesión cerrada.");
  }

  async function requestJson(path, options) {
    var response = await fetch(withApiBase(path), {
      method: (options && options.method) || "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: getAuthorizationHeader()
      }
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

  async function loadDashboard() {
    await ensureSession();

    var range = getRangeFromInputs();
    state.range = range;

    setAuthStatus("Consultando métricas...");

    var query = buildQuery(range);
    var metrics = await requestJson("/api/v1/admin/metrics" + query);
    var timeseries = await requestJson("/api/v1/admin/metrics/timeseries" + query);

    var kpis = metrics.kpis || {};
    setKpi("kpi-appointments-total", formatNumber(kpis.appointmentsTotal));
    setKpi("kpi-contacts-total", formatNumber(kpis.contactsTotal));
    setKpi("kpi-occupancy-rate", formatPercent(kpis.occupancyRate));
    setKpi("kpi-conversion-rate", formatPercent(kpis.conversionRate));
    setKpi("kpi-no-show-rate", formatPercent(kpis.noShowRate));
    setKpi("kpi-avg-lead-hours", formatHours(kpis.avgLeadHours));

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

    renderCharts(timeseries.series || []);
    setAuthStatus("Métricas actualizadas correctamente.");
  }

  async function exportCsv() {
    await ensureSession();

    var range = getRangeFromInputs();
    var url = withApiBase("/api/v1/admin/metrics/export.csv" + buildQuery(range));
    var response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: getAuthorizationHeader()
      }
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
    var storedToken = String(sessionStorage.getItem(storageKey) || "").trim();
    if (storedToken) {
      setAdminToken(storedToken);
    }

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

  preloadState();
  if (getAdminToken()) {
    setAuthStatus("Restaurando sesión...");
    loadDashboard().catch(function (error) {
      setAuthStatus(error.message, true);
    });
  } else {
    setAuthStatus("Inicia sesión para ver métricas.");
  }
})();
