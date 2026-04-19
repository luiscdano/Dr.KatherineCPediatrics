import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourceRoots = [
  path.join(root, "assets", "js"),
  path.join(root, "scripts"),
  path.join(root, "server")
];

function listJsFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listJsFiles(fullPath));
      continue;
    }
    if (entry.isFile() && (entry.name.endsWith(".js") || entry.name.endsWith(".mjs"))) {
      files.push(fullPath);
    }
  }
  return files;
}

const existingRoots = sourceRoots.filter((dir) => fs.existsSync(dir));
if (!existingRoots.length) {
  console.error("No se encontraron carpetas de codigo JavaScript para validar sintaxis.");
  process.exit(1);
}

const jsFiles = existingRoots.flatMap((dir) => listJsFiles(dir));
const failures = [];

for (const file of jsFiles) {
  try {
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  } catch (error) {
    failures.push({ file, output: error.stderr?.toString() || error.message });
  }
}

if (failures.length) {
  console.error("Errores de sintaxis JS detectados:");
  for (const failure of failures) {
    console.error(`- ${path.relative(root, failure.file)}`);
    console.error(failure.output.trim());
  }
  process.exit(1);
}

console.log(`Sintaxis JS OK (${jsFiles.length} archivos).`);
