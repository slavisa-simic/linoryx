import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUTPUT = path.join(ROOT, "linoryx-project-context.txt");

const IGNORED_DIRS = new Set([
  ".git",
  ".idea",
  ".vscode",
  "node_modules",
  "target",
  "dist",
  "build",
  "coverage",
  ".next",
  ".cache",
  ".gradle",
  ".venv",
  "__pycache__",
  ".turbo",
]);

const ALLOWED_EXT = new Set([
  ".java",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".xml",
  ".sql",
  ".css",
  ".scss",
  ".html",
  ".md",
  ".yaml",
  ".yml",
  ".properties",
  ".puml",
  ".dot",
]);

const MAX_FILE_SIZE = 150 * 1024;
const MAX_TOTAL_SIZE = 3 * 1024 * 1024;

function ignored(name) {
  const lower = name.toLowerCase();

  return (
    lower === ".env" ||
    lower.startsWith(".env.") ||
    lower.includes(".secret") ||
    lower.includes("credentials") ||
    lower.endsWith(".pem") ||
    lower.endsWith(".key") ||
    lower.endsWith(".p12") ||
    lower.endsWith(".jks") ||
    lower.endsWith(".keystore") ||
    lower.includes("lock.json") ||
    lower === "yarn.lock" ||
    lower === "pnpm-lock.yaml" ||
    lower === "bun.lock" ||
    lower === "linoryx-project-context.txt"
  );
}

function scan(dir, results = []) {
  const entries = fs.readdirSync(dir, {
    withFileTypes: true,
  });

  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    if (ignored(entry.name)) continue;

    const full = path.join(dir, entry.name);
    const relative = path.relative(ROOT, full).replaceAll("\\", "/");

    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        scan(full, results);
      }
    } else if (entry.isFile()) {
      results.push(relative);
    }
  }

  return results;
}

function includeCode(file) {
  const ext = path.extname(file).toLowerCase();

  if (!ALLOWED_EXT.has(ext)) return false;

  return (
    file === "README.md" ||
    file === "compose.yaml" ||
    file.startsWith("scripts/") ||
    file.startsWith("linoryx-api/") ||
    file.startsWith("linoryx-web/") ||
    file.startsWith("docs/readme/visuals/source/") ||
    file === "linoryx-web/package.json" ||
    file === "linoryx-api/pom.xml"
  );
}

function priority(file) {
  if (file === "README.md") return 0;
  if (file.startsWith("scripts/build-readme")) return 1;
  if (file.startsWith("docs/readme/visuals/source/")) return 2;
  if (file === "compose.yaml") return 3;
  if (file.endsWith("pom.xml") || file.endsWith("package.json")) return 4;
  if (file.includes("/src/test/")) return 5;
  if (file.includes("/src/main/")) return 6;
  if (file.startsWith("linoryx-web/src/")) return 7;
  return 8;
}

const files = scan(ROOT);

const codeFiles = files
  .filter(includeCode)
  .sort((a, b) => priority(a) - priority(b) || a.localeCompare(b));

const sections = [];

sections.push("# LINORYX PROJECT CONTEXT");
sections.push(`Generated: ${new Date().toISOString()}`);

sections.push("\n# PROJECT STRUCTURE");
sections.push(files.join("\n"));

sections.push("\n# SOURCE CODE");

let total = 0;
let included = 0;
const skipped = [];

for (const file of codeFiles) {
  const full = path.join(ROOT, file);
  const size = fs.statSync(full).size;

  if (size > MAX_FILE_SIZE) {
    skipped.push(`${file} (large file)`);
    continue;
  }

  const content = fs.readFileSync(full, "utf8");
  const bytes = Buffer.byteLength(content);

  if (total + bytes > MAX_TOTAL_SIZE) {
    skipped.push(`${file} (size limit)`);
    continue;
  }

  sections.push(`\n${"=".repeat(70)}`);
  sections.push(`FILE: ${file}`);
  sections.push("=".repeat(70));
  sections.push(content);

  total += bytes;
  included++;
}

sections.push("\n# OMITTED SOURCE FILES");
sections.push(skipped.join("\n") || "None");

fs.writeFileSync(OUTPUT, sections.join("\n"), "utf8");

console.log("\nLinoryx export completed.");
console.log(`Files in structure: ${files.length}`);
console.log(`Source files included: ${included}`);
console.log(`Source files omitted: ${skipped.length}`);
console.log(`Output: ${OUTPUT}`);
console.log(`Size: ${(fs.statSync(OUTPUT).size / 1024 / 1024).toFixed(2)} MB`);
