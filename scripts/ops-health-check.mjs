import process from "node:process";

const DEFAULT_TIMEOUT_MS = Number(process.env.OPS_HEALTH_TIMEOUT_MS || 8000);
const urls = String(process.env.OPS_HEALTH_URLS || "")
  .split(",")
  .map((item) => item.trim())
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

async function sendAlert(message, details) {
  const webhookUrl = String(process.env.ALERT_WEBHOOK_URL || "").trim();
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
  try {
    const response = await withTimeout(url, DEFAULT_TIMEOUT_MS);
    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload || payload.ok !== true) {
      failures.push({
        url,
        status: response.status,
        payload
      });
      continue;
    }

    console.log(`[ops-health-check] OK ${url}`);
  } catch (error) {
    failures.push({
      url,
      error: error?.message || String(error)
    });
  }
}

if (failures.length > 0) {
  console.error("[ops-health-check] Fallas detectadas", JSON.stringify(failures, null, 2));
  await sendAlert("health_check_failed", failures);
  process.exit(1);
}

console.log("[ops-health-check] Todas las verificaciones pasaron.");
