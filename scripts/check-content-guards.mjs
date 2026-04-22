import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const ignoredDirs = new Set([".git", "node_modules", ".venv_i18n"]);
const targets = [
  "README.md",
  "assets/js/content-data.js",
  "assets/js/layout.js",
  "assets/js/main.js",
  "assets/js/utils.js"
];

function collectHtmlTargets(dirPath) {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (ignoredDirs.has(entry.name)) {
        continue;
      }
      collectHtmlTargets(fullPath);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".html")) {
      targets.push(path.relative(root, fullPath));
    }
  }
}

collectHtmlTargets(root);

const rules = [
  { regex: /\[Pendiente\]/i, message: "Texto provisional [Pendiente]" },
  { regex: /AgendaTuCita/i, message: "Referencia al sistema externo AgendaTuCita" },
  { regex: /agendatucita\.com/i, message: "URL externa de AgendaTuCita" },
  { regex: /agenda-tu-cita\.html/i, message: "Ruta legacy agenda-tu-cita.html" }
];
const forbiddenFiles = ["agenda-tu-cita.html"];

const violations = [];

for (const relPath of targets) {
  const filePath = path.join(root, relPath);
  if (!fs.existsSync(filePath)) {
    continue;
  }
  const content = fs.readFileSync(filePath, "utf8");
  for (const rule of rules) {
    if (rule.regex.test(content)) {
      violations.push({
        file: relPath,
        message: rule.message
      });
    }
  }
}

for (const relPath of forbiddenFiles) {
  const filePath = path.join(root, relPath);
  if (fs.existsSync(filePath)) {
    violations.push({
      file: relPath,
      message: "Archivo legacy no permitido en el repositorio"
    });
  }
}

if (violations.length) {
  console.error("Se detectaron contenidos no permitidos:");
  for (const issue of violations) {
    console.error(`- ${issue.file}: ${issue.message}`);
  }
  process.exit(1);
}

console.log("Contenido validado sin placeholders, dependencias externas ni rutas legacy.");
