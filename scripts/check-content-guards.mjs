import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const targets = [
  "README.md",
  "assets/js/content-data.js",
  "assets/js/layout.js",
  "assets/js/main.js",
  "assets/js/utils.js",
  "index.html",
  "agenda-tu-cita.html",
  "blog.html",
  "contacto.html",
  "recursos-para-padres.html",
  "servicios-pediatricos.html",
  "sobre-la-doctora.html"
];

for (const dir of ["blog", "recursos", "servicios"]) {
  const fullDir = path.join(root, dir);
  if (!fs.existsSync(fullDir)) {
    continue;
  }
  for (const entry of fs.readdirSync(fullDir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".html")) {
      targets.push(path.join(dir, entry.name));
    }
  }
}

const rules = [
  { regex: /\[Pendiente\]/i, message: "Texto provisional [Pendiente]" },
  { regex: /AgendaTuCita/i, message: "Referencia al sistema externo AgendaTuCita" },
  { regex: /agendatucita\.com/i, message: "URL externa de AgendaTuCita" }
];

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

if (violations.length) {
  console.error("Se detectaron contenidos no permitidos:");
  for (const issue of violations) {
    console.error(`- ${issue.file}: ${issue.message}`);
  }
  process.exit(1);
}

console.log("Contenido validado sin placeholders ni dependencias externas.");
