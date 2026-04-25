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

function loadJsonFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  return JSON.parse(content);
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
  if (/^[a-z0-9]+(?:-[a-z0-9]+)+$/i.test(text)) {
    return true;
  }
  if (/\b(?:tk|tKey)\s*\(/.test(text)) {
    return true;
  }
  if (/\b(?:aria-label|class|id|href|src|alt|title)\s*=/.test(text)) {
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

  return /\b(el|la|los|las|de|del|para|con|y|que|una|un|cada|consultorio|pediatr|citas|contacto|recursos|señales|paso|fechas|horarios|meses|años|día|urgencias|doctora|formulario|inicio|servicios|recordatorio|opcional|ver|leer|edad|edades|paciente|tutor|correo|fiebre|dolor|disponibilidad|archivo|seleccionado|recurso|motivo|resumen|canal|estado)\b/.test(
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

function decodeJsStringLiteral(literal) {
  const quote = literal[0];
  if (quote !== "'" && quote !== "\"") {
    return literal;
  }

  let body = literal.slice(1, -1);
  body = body
    .replace(/\\n/g, " ")
    .replace(/\\r/g, " ")
    .replace(/\\t/g, " ")
    .replace(/\\"/g, "\"")
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, "\\");
  return body;
}

function collectCandidatesFromJsLiterals(jsFiles, candidates) {
  const literalRegex = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g;

  for (const filePath of jsFiles) {
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const relPath = path.relative(root, filePath);
    const source = fs.readFileSync(filePath, "utf8");
    let match = null;
    while ((match = literalRegex.exec(source))) {
      const decoded = decodeJsStringLiteral(match[0]);
      const normalized = normalizeText(decoded);
      if (!normalized) {
        continue;
      }
      if (/[<>]/.test(normalized)) {
        continue;
      }
      if (/^[a-z0-9._:/\-]+$/i.test(normalized)) {
        continue;
      }
      addCandidate(normalized, relPath, candidates);
    }
  }
}

function collectKeyUsagesFromHtml(htmlFiles, keyUsages) {
  const attrRegex =
    /\bdata-i18n-(?:key|html-key|placeholder-key|title-key|aria-label-key|alt-key|value-key)="([^"]+)"/gi;
  for (const filePath of htmlFiles) {
    const relPath = path.relative(root, filePath);
    const html = fs.readFileSync(filePath, "utf8");
    let match = null;
    while ((match = attrRegex.exec(html))) {
      const key = normalizeText(match[1]);
      if (!key) {
        continue;
      }
      if (!keyUsages.has(key)) {
        keyUsages.set(key, new Set());
      }
      keyUsages.get(key).add(relPath);
    }
  }
}

function collectKeyUsagesFromJs(jsFiles, keyUsages) {
  const keyRegex = /\b(?:tk|tKey)\(\s*['"]([^'"]+)['"]/g;
  for (const filePath of jsFiles) {
    if (!fs.existsSync(filePath)) {
      continue;
    }
    const relPath = path.relative(root, filePath);
    const source = fs.readFileSync(filePath, "utf8");
    let match = null;
    while ((match = keyRegex.exec(source))) {
      const key = normalizeText(match[1]);
      if (!key) {
        continue;
      }
      if (!keyUsages.has(key)) {
        keyUsages.set(key, new Set());
      }
      keyUsages.get(key).add(relPath);
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
const keyCatalogEsPath = path.join(root, "assets/i18n/keys.es.json");
const keyCatalogEnPath = path.join(root, "assets/i18n/keys.en.json");
const keyCatalogFrPath = path.join(root, "assets/i18n/keys.fr.json");

const enDict = loadWindowObject(enDictPath, "DR_KATHERINE_I18N_DICT");
const frDict = loadWindowObject(frDictPath, "DR_KATHERINE_I18N_DICT_FR");
const contentData = loadWindowObject(contentDataPath, "DR_KATHERINE_DATA");
const keyCatalogEs = fs.existsSync(keyCatalogEsPath) ? loadJsonFile(keyCatalogEsPath) : {};
const keyCatalogEn = fs.existsSync(keyCatalogEnPath) ? loadJsonFile(keyCatalogEnPath) : {};
const keyCatalogFr = fs.existsSync(keyCatalogFrPath) ? loadJsonFile(keyCatalogFrPath) : {};

const htmlFiles = [];
collectHtmlFiles(root, htmlFiles);

const candidates = new Map();
collectCandidatesFromHtml(htmlFiles, candidates);
walkObject(contentData, "assets/js/content-data.js", candidates);
collectCandidatesFromJsLiterals(
  [path.join(root, "assets/js/main.js")],
  candidates
);

const keyUsages = new Map();
collectKeyUsagesFromHtml(htmlFiles, keyUsages);
collectKeyUsagesFromJs([path.join(root, "assets/js/main.js"), path.join(root, "assets/js/layout.js")], keyUsages);

const missingEn = [];
const missingFr = [];
const missingKeyEs = [];
const missingKeyEn = [];
const missingKeyFr = [];

for (const [text, sourceSet] of candidates.entries()) {
  const sources = Array.from(sourceSet).slice(0, 3);
  if (!Object.prototype.hasOwnProperty.call(enDict, text)) {
    missingEn.push({ text, sources });
  }
  if (!Object.prototype.hasOwnProperty.call(frDict, text)) {
    missingFr.push({ text, sources });
  }
}

for (const [key, sourceSet] of keyUsages.entries()) {
  const sources = Array.from(sourceSet).slice(0, 3);
  if (!Object.prototype.hasOwnProperty.call(keyCatalogEs, key)) {
    missingKeyEs.push({ key, sources });
  }
  if (!Object.prototype.hasOwnProperty.call(keyCatalogEn, key)) {
    missingKeyEn.push({ key, sources });
  }
  if (!Object.prototype.hasOwnProperty.call(keyCatalogFr, key)) {
    missingKeyFr.push({ key, sources });
  }
}

missingEn.sort((a, b) => a.text.localeCompare(b.text, "es"));
missingFr.sort((a, b) => a.text.localeCompare(b.text, "es"));
missingKeyEs.sort((a, b) => a.key.localeCompare(b.key, "es"));
missingKeyEn.sort((a, b) => a.key.localeCompare(b.key, "es"));
missingKeyFr.sort((a, b) => a.key.localeCompare(b.key, "es"));

if (
  missingEn.length ||
  missingFr.length ||
  missingKeyEs.length ||
  missingKeyEn.length ||
  missingKeyFr.length
) {
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
  if (missingKeyEs.length) {
    console.error(`\nClaves faltantes ES (${missingKeyEs.length}):`);
    for (const issue of missingKeyEs.slice(0, 120)) {
      console.error(`- ${issue.key} :: ${issue.sources.join(", ")}`);
    }
  }
  if (missingKeyEn.length) {
    console.error(`\nClaves faltantes EN (${missingKeyEn.length}):`);
    for (const issue of missingKeyEn.slice(0, 120)) {
      console.error(`- ${issue.key} :: ${issue.sources.join(", ")}`);
    }
  }
  if (missingKeyFr.length) {
    console.error(`\nClaves faltantes FR (${missingKeyFr.length}):`);
    for (const issue of missingKeyFr.slice(0, 120)) {
      console.error(`- ${issue.key} :: ${issue.sources.join(", ")}`);
    }
  }
  process.exit(1);
}

console.log(
  `Cobertura i18n OK (${candidates.size} cadenas base + ${keyUsages.size} claves verificadas en ES/EN/FR).`
);
