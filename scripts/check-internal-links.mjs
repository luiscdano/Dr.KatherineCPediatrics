import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const ignoredDirs = new Set([".git", "node_modules", ".venv_i18n"]);

function listHtmlFiles() {
  const files = [];

  function walk(dirPath) {
    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        if (ignoredDirs.has(entry.name)) {
          continue;
        }
        walk(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith(".html")) {
        files.push(fullPath);
      }
    }
  }

  walk(root);
  return files;
}

function isExternalRef(url) {
  return /^(https?:|mailto:|tel:|javascript:|data:|\/\/|#)/i.test(url);
}

function normalizeTarget(filePath, rawUrl) {
  const clean = rawUrl.split("#")[0].split("?")[0].trim();
  if (!clean) {
    return null;
  }

  if (clean.startsWith("/")) {
    return path.join(root, clean.slice(1));
  }
  return path.resolve(path.dirname(filePath), clean);
}

const htmlFiles = listHtmlFiles();
const errors = [];
const attrRegex = /(href|src)\s*=\s*"([^"]+)"/g;

for (const file of htmlFiles) {
  const content = fs.readFileSync(file, "utf8");
  let match;
  while ((match = attrRegex.exec(content)) !== null) {
    const value = match[2];
    if (isExternalRef(value)) {
      continue;
    }

    const targetPath = normalizeTarget(file, value);
    if (!targetPath) {
      continue;
    }
    if (!targetPath.startsWith(root)) {
      errors.push({
        file,
        value,
        reason: "La referencia sale del repositorio"
      });
      continue;
    }
    if (!fs.existsSync(targetPath)) {
      errors.push({
        file,
        value,
        reason: `No existe ${path.relative(root, targetPath)}`
      });
    }
  }
}

if (errors.length) {
  console.error("Referencias internas invalidas detectadas:");
  for (const err of errors) {
    console.error(`- ${path.relative(root, err.file)} -> ${err.value} (${err.reason})`);
  }
  process.exit(1);
}

console.log(`Enlaces internos OK (${htmlFiles.length} HTML verificados).`);
