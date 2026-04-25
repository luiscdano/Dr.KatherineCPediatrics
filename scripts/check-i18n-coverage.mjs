import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const ignoredDirs = new Set([".git", "node_modules", ".venv_i18n"]);

function loadWindowObject(filePath, varName) {
  const content = fs.readFileSync(filePath, "utf8");
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(content, sandbox, { filename: filePath });
  const value = sandbox.window[varName];
  if (!value || typeof value !== "object") {
    throw new Error(`No se pudo cargar ${varName} desde ${filePath}`);
  }
  return value;
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function shouldSkipCandidate(value) {
  const text = normalizeText(value);
  if (!text) {
    return true;
  }
  if (/^[\d\s().+\-/:|]+$/.test(text)) {
    return true;
  }
  if (/^https?:\/\//i.test(text) || /^mailto:/i.test(text) || /^tel:/i.test(text)) {
    return true;
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
    return true;
  }
  if (/^\/[a-z0-9\-_/]+\.?[a-z0-9]*$/i.test(text)) {
    return true;
  }
  if (/^\{\s*"@context"/i.test(text)) {
    return true;
  }
  return false;
}

function isLikelySpanishText(value) {
  const text = normalizeText(value).toLowerCase();
  if (!text) {
    return false;
  }

  if (/[áéíóúñ¿¡]/.test(text)) {
    return true;
  }

  return /\b(el|la|los|las|de|del|para|con|y|que|una|un|cada|consultorio|pediatr|citas|contacto|recursos|señales|paso|fechas|horarios|meses|años|día|urgencias|doctora|formulario|inicio|servicios|recordatorio|opcional)\b/.test(
    text
  );
}

function collectHtmlFiles(dirPath, bucket) {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (ignoredDirs.has(entry.name)) {
        continue;
      }
      collectHtmlFiles(path.join(dirPath, entry.name), bucket);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".html")) {
      bucket.push(path.join(dirPath, entry.name));
    }
  }
}

function addCandidate(value, sourceFile, candidates) {
  const text = normalizeText(value);
  if (shouldSkipCandidate(text) || !isLikelySpanishText(text)) {
    return;
  }

  if (!candidates.has(text)) {
    candidates.set(text, new Set());
  }
  candidates.get(text).add(sourceFile);
}

function collectCandidatesFromHtml(htmlFiles, candidates) {
  for (const filePath of htmlFiles) {
    const relPath = path.relative(root, filePath);
    let html = fs.readFileSync(filePath, "utf8");
    html = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");

    const textRegex = />\s*([^<>]+?)\s*</g;
    let match = null;
    while ((match = textRegex.exec(html))) {
      addCandidate(match[1], relPath, candidates);
    }

    const attrRegex = /\b(placeholder|title|aria-label|alt|content)="([^"]+)"/gi;
    while ((match = attrRegex.exec(html))) {
      addCandidate(match[2], relPath, candidates);
    }
  }
}

function walkObject(value, sourceName, candidates) {
  if (Array.isArray(value)) {
    value.forEach((item) => walkObject(item, sourceName, candidates));
    return;
  }

  if (value && typeof value === "object") {
    Object.values(value).forEach((item) => walkObject(item, sourceName, candidates));
    return;
  }

  if (typeof value === "string") {
    addCandidate(value, sourceName, candidates);
  }
}

const enDictPath = path.join(root, "assets/js/i18n-dict.js");
const frDictPath = path.join(root, "assets/js/i18n-dict-fr.js");
const contentDataPath = path.join(root, "assets/js/content-data.js");

const enDict = loadWindowObject(enDictPath, "DR_KATHERINE_I18N_DICT");
const frDict = loadWindowObject(frDictPath, "DR_KATHERINE_I18N_DICT_FR");
const contentData = loadWindowObject(contentDataPath, "DR_KATHERINE_DATA");

const htmlFiles = [];
collectHtmlFiles(root, htmlFiles);

const candidates = new Map();
collectCandidatesFromHtml(htmlFiles, candidates);
walkObject(contentData, "assets/js/content-data.js", candidates);

const missingEn = [];
const missingFr = [];

for (const [text, sourceSet] of candidates.entries()) {
  const sources = Array.from(sourceSet).slice(0, 3);
  if (!Object.prototype.hasOwnProperty.call(enDict, text)) {
    missingEn.push({ text, sources });
  }
  if (!Object.prototype.hasOwnProperty.call(frDict, text)) {
    missingFr.push({ text, sources });
  }
}

missingEn.sort((a, b) => a.text.localeCompare(b.text, "es"));
missingFr.sort((a, b) => a.text.localeCompare(b.text, "es"));

if (missingEn.length || missingFr.length) {
  console.error("Cobertura i18n incompleta detectada.");
  if (missingEn.length) {
    console.error(`\nFaltantes EN (${missingEn.length}):`);
    for (const issue of missingEn.slice(0, 80)) {
      console.error(`- ${issue.text} :: ${issue.sources.join(", ")}`);
    }
  }
  if (missingFr.length) {
    console.error(`\nFaltantes FR (${missingFr.length}):`);
    for (const issue of missingFr.slice(0, 80)) {
      console.error(`- ${issue.text} :: ${issue.sources.join(", ")}`);
    }
  }
  process.exit(1);
}

console.log(`Cobertura i18n OK (${candidates.size} cadenas base verificadas en EN y FR).`);
