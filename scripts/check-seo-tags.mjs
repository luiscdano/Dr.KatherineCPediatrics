import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function listHtmlFiles() {
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(path.join(root, entry.name));
    }
  }

  for (const dir of ["blog", "recursos", "servicios"]) {
    const fullDir = path.join(root, dir);
    if (!fs.existsSync(fullDir)) {
      continue;
    }
    for (const entry of fs.readdirSync(fullDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith(".html")) {
        files.push(path.join(fullDir, entry.name));
      }
    }
  }

  return files;
}

function has(regex, content) {
  return regex.test(content);
}

const required = [
  { regex: /<title>[\s\S]*?<\/title>/i, label: "<title>" },
  { regex: /<meta\s+name="description"\s+content="[^"]+"/i, label: 'meta name="description"' },
  { regex: /<link\s+rel="canonical"\s+href="https?:\/\/[^"]+"/i, label: 'link rel="canonical"' },
  { regex: /<body[^>]*data-page="[^"]+"/i, label: "body[data-page]" }
];

const files = listHtmlFiles();
const errors = [];

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  for (const rule of required) {
    if (!has(rule.regex, content)) {
      errors.push({
        file: path.relative(root, file),
        missing: rule.label
      });
    }
  }
}

if (errors.length) {
  console.error("Faltan metadatos o atributos SEO/base:");
  for (const err of errors) {
    console.error(`- ${err.file}: falta ${err.missing}`);
  }
  process.exit(1);
}

console.log(`SEO base OK (${files.length} HTML).`);
