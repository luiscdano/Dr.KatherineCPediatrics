import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const expectedDomain = "drkatherinecpediatrics.com";
const expectedBaseUrl = `https://${expectedDomain}`;
const expectedSitemapUrl = `${expectedBaseUrl}/sitemap.xml`;

function listHtmlFiles() {
  const files = [];
  const rootEntries = fs.readdirSync(root, { withFileTypes: true });
  for (const entry of rootEntries) {
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

function normalizePathForUrl(filePath) {
  const rel = path.relative(root, filePath).replace(/\\/g, "/");
  return rel === "index.html" ? "/" : `/${rel}`;
}

function getCanonicalHref(html) {
  const linkTags = html.match(/<link\b[^>]*>/gi) || [];
  for (const tag of linkTags) {
    if (!/rel\s*=\s*["']canonical["']/i.test(tag)) {
      continue;
    }
    const hrefMatch = tag.match(/href\s*=\s*["']([^"']+)["']/i);
    if (hrefMatch) {
      return hrefMatch[1];
    }
  }
  return "";
}

const errors = [];

const cnamePath = path.join(root, "CNAME");
if (!fs.existsSync(cnamePath)) {
  errors.push("Falta archivo CNAME en la raiz del proyecto.");
} else {
  const cname = fs.readFileSync(cnamePath, "utf8").trim().toLowerCase();
  if (cname !== expectedDomain) {
    errors.push(`CNAME invalido: "${cname}". Esperado: "${expectedDomain}".`);
  }
}

const robotsPath = path.join(root, "robots.txt");
if (!fs.existsSync(robotsPath)) {
  errors.push("Falta robots.txt.");
} else {
  const robots = fs.readFileSync(robotsPath, "utf8");
  const sitemapMatch = robots.match(/^\s*Sitemap:\s*(\S+)\s*$/im);
  if (!sitemapMatch) {
    errors.push("robots.txt no contiene directiva Sitemap.");
  } else {
    const sitemapValue = sitemapMatch[1].trim();
    if (sitemapValue !== expectedSitemapUrl) {
      errors.push(`robots.txt Sitemap invalido: "${sitemapValue}". Esperado: "${expectedSitemapUrl}".`);
    }
  }
}

const sitemapPath = path.join(root, "sitemap.xml");
const sitemapLocs = new Set();
if (!fs.existsSync(sitemapPath)) {
  errors.push("Falta sitemap.xml.");
} else {
  const sitemap = fs.readFileSync(sitemapPath, "utf8");
  const locMatches = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/gi)];
  for (const match of locMatches) {
    const loc = match[1].trim();
    sitemapLocs.add(loc);
    if (!loc.startsWith(`${expectedBaseUrl}/`)) {
      errors.push(`URL fuera de dominio en sitemap.xml: "${loc}".`);
    }
  }
  if (sitemapLocs.size === 0) {
    errors.push("sitemap.xml no contiene entradas <loc>.");
  }
}

const htmlFiles = listHtmlFiles();
for (const file of htmlFiles) {
  const rel = path.relative(root, file).replace(/\\/g, "/");
  const html = fs.readFileSync(file, "utf8");
  const canonical = getCanonicalHref(html);
  const expectedCanonical = `${expectedBaseUrl}${normalizePathForUrl(file)}`;

  if (!canonical) {
    errors.push(`${rel}: falta link canonical.`);
  } else if (canonical !== expectedCanonical) {
    errors.push(`${rel}: canonical invalido "${canonical}" (esperado "${expectedCanonical}").`);
  }

  if (rel !== "404.html") {
    if (!sitemapLocs.has(expectedCanonical)) {
      errors.push(`${rel}: falta en sitemap.xml -> ${expectedCanonical}`);
    }
  } else if (sitemapLocs.has(expectedCanonical)) {
    errors.push(`404.html no debe estar en sitemap.xml (${expectedCanonical}).`);
  }
}

if (errors.length) {
  console.error("Errores de configuracion de dominio detectados:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Dominio y sitemap OK (${htmlFiles.length} HTML verificados).`);
