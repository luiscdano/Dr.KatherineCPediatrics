import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const requiredFiles = [
  ".env.example",
  "docker-compose.api.yml",
  "whatsapp-backend/docker-compose.yml",
  "whatsapp-backend/docker-compose.override.local.yml",
  "deploy/staging/docker-compose.staging.yml",
  "RELEASE_CHECKLIST.md",
  ".github/workflows/quality-checks.yml",
  ".github/workflows/deploy-pages.yml",
  ".github/workflows/staging-readiness.yml"
];

const requiredEnvKeys = [
  "ADMIN_DASHBOARD_PASSWORD",
  "ADMIN_SESSION_SECRET",
  "ADMIN_COOKIE_SECURE",
  "ADMIN_ENFORCE_CSRF",
  "OPS_METRICS_KEY",
  "OPS_METRICS_ENABLED",
  "ALERT_WEBHOOK_URL",
  "OPS_HEALTH_URLS"
];

const missingFiles = requiredFiles.filter((filePath) => !fs.existsSync(path.join(projectRoot, filePath)));
if (missingFiles.length) {
  console.error("[release-check] Faltan archivos requeridos:");
  for (const item of missingFiles) {
    console.error(` - ${item}`);
  }
  process.exit(1);
}

const envExamplePath = path.join(projectRoot, ".env.example");
const envLines = fs.readFileSync(envExamplePath, "utf8").split(/\r?\n/);
const envKeys = new Set(
  envLines
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => line.split("=")[0].trim())
);

const missingEnvKeys = requiredEnvKeys.filter((key) => !envKeys.has(key));
if (missingEnvKeys.length) {
  console.error("[release-check] Faltan variables en .env.example:");
  for (const item of missingEnvKeys) {
    console.error(` - ${item}`);
  }
  process.exit(1);
}

console.log("[release-check] Checklist técnico base completado.");
