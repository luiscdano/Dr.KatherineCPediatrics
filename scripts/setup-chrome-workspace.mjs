import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import crypto from "node:crypto";

const projectRoot = path.resolve(process.cwd());
const metadataDir = path.join(projectRoot, ".well-known", "appspecific");
const metadataPath = path.join(metadataDir, "com.chrome.devtools.json");

function readExistingUuid(filePath) {
  if (!fs.existsSync(filePath)) {
    return "";
  }

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    const uuid = String(parsed?.workspace?.uuid || "").trim();
    return uuid;
  } catch {
    return "";
  }
}

function isUuidV4(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

const existingUuid = readExistingUuid(metadataPath);
const workspaceUuid = isUuidV4(existingUuid) ? existingUuid : crypto.randomUUID();

const payload = {
  workspace: {
    root: projectRoot,
    uuid: workspaceUuid
  }
};

fs.mkdirSync(metadataDir, { recursive: true });
fs.writeFileSync(metadataPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

console.log("[devtools-workspace] Archivo generado:");
console.log(` - ${metadataPath}`);
console.log("[devtools-workspace] Usa Chrome en localhost y conecta el Workspace en:");
console.log(" - DevTools > Sources > Workspaces > Connect");
