import process from "node:process";

function toInteger(value, fallback, { min = Number.NEGATIVE_INFINITY } = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.trunc(parsed));
}

const DEFAULT_TIMEOUT_MS = toInteger(process.env.OPS_HEALTH_TIMEOUT_MS, 8000, { min: 1000 });
const DEFAULT_RETRIES = toInteger(process.env.OPS_HEALTH_RETRIES, 3, { min: 1 });
const DEFAULT_RETRY_DELAY_MS = toInteger(process.env.OPS_HEALTH_RETRY_DELAY_MS, 1500, { min: 0 });

function extractUrlCandidate(value) {
  const raw = String(value || "")
    .trim()
    .replace(/^['"]+|['"]+$/g, "");
  if (!raw) {
    return "";
  }

  const directMatch = raw.match(/^https?:\/\/\S+$/i);
  if (directMatch) {
    return directMatch[0];
  }

  const embeddedMatch = raw.match(/https?:\/\/[^\s,]+/i);
  if (embeddedMatch) {
    return embeddedMatch[0];
  }

  return "";
}

const urls = String(process.env.OPS_HEALTH_URLS || "")
  .replace(/\r\n/g, "\n")
  .replace(/\n+/g, ",")
  .split(",")
  .map((item) => item.trim())
  .map((item) => extractUrlCandidate(item))
  .filter(Boolean);

if (!urls.length) {
  console.error("[ops-health-check] Define OPS_HEALTH_URLS con una o más URLs separadas por coma.");
  process.exit(1);
}

function withTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { method: "GET", signal: controller.signal })
    .finally(() => {
      clearTimeout(timeout);
    });
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function sendAlert(message, details) {
  const webhookUrl = extractUrlCandidate(process.env.ALERT_WEBHOOK_URL);
  if (!webhookUrl) {
    return;
  }

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        source: "dr-katherine-ops-check",
        message,
        details,
        timestamp: new Date().toISOString()
      })
    });
  } catch (error) {
    console.error("[ops-health-check] No se pudo enviar alerta", error?.message || error);
  }
}

const failures = [];
for (const url of urls) {
  let passed = false;
  let lastFailure = null;

  for (let attempt = 1; attempt <= DEFAULT_RETRIES; attempt += 1) {
    try {
      const response = await withTimeout(url, DEFAULT_TIMEOUT_MS);
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload || payload.ok !== true) {
        lastFailure = {
          status: response.status,
          payload
        };
      } else {
        console.log(`[ops-health-check] OK ${url} (attempt ${attempt}/${DEFAULT_RETRIES})`);
        passed = true;
        break;
      }
    } catch (error) {
      lastFailure = {
        error: error?.message || String(error)
      };
    }

    if (attempt < DEFAULT_RETRIES) {
      console.warn(
        `[ops-health-check] Retry ${attempt}/${DEFAULT_RETRIES - 1} for ${url} in ${DEFAULT_RETRY_DELAY_MS}ms`
      );
      if (DEFAULT_RETRY_DELAY_MS > 0) {
        await sleep(DEFAULT_RETRY_DELAY_MS);
      }
    }
  }

  if (!passed) {
    failures.push({
      url,
      attempts: DEFAULT_RETRIES,
      ...lastFailure
    });
  }
}

if (failures.length > 0) {
  console.error("[ops-health-check] Fallas detectadas", JSON.stringify(failures, null, 2));
  await sendAlert("health_check_failed", failures);
  process.exit(1);
}

console.log("[ops-health-check] Todas las verificaciones pasaron.");
