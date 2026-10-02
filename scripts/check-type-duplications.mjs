/**
 * @fileoverview VALIDADOR DE UNICIDADE DE TIPOS E INTERFACES EXPORTADOS (Plano 5 — S13)
 * Varre todo o código em src/ e garante que não existem declarações concorrentes
 * de tipos ou interfaces com o mesmo nome em arquivos diferentes.
 */

import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const SRC_DIR = path.resolve(ROOT_DIR, "src");

function walk(dir) {
  let res = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) {
      if (!["node_modules", ".git", "dist"].includes(f.name)) {
        res.push(...walk(full));
      }
    } else if (f.isFile() && (f.name.endsWith(".ts") || f.name.endsWith(".tsx"))) {
      res.push(full);
    }
  }
  return res;
}

export function auditTypeDuplications() {
  const files = walk(SRC_DIR);
  const typeMap = new Map();

  for (const file of files) {
    if (file.includes(".test.") || file.includes("routeTree.gen.")) continue;
    const content = fs.readFileSync(file, "utf8");
    const matches = content.matchAll(/export\s+(?:type|interface)\s+([A-Za-z0-9_]+)/g);
    for (const m of matches) {
      const name = m[1];
      if (!typeMap.has(name)) typeMap.set(name, []);
      typeMap.get(name).push(path.relative(ROOT_DIR, file).replace(/\\/g, "/"));
    }
  }

  const duplicates = [];
  for (const [name, occurrences] of typeMap.entries()) {
    if (occurrences.length > 1) {
      duplicates.push({ name, count: occurrences.length, occurrences });
    }
  }

  duplicates.sort((a, b) => b.count - a.count);
  return { filesCount: files.length, duplicates };
}

// Execution CLI
if (process.argv[1] && process.argv[1].endsWith("check-type-duplications.mjs")) {
  console.log("======================================================================");
  console.log("WAESY TYPE DUPLICATION & SSOT CHECKER (Plano 5 — S13)");
  console.log("======================================================================");
  const result = auditTypeDuplications();
  console.log(`Arquivos inspecionados:            ${result.filesCount}`);
  console.log(`Tipos/interfaces duplicados:       ${result.duplicates.length}`);

  if (result.duplicates.length > 0) {
    console.log("\nViolações de duplicidade de tipo encontradas:");
    for (const d of result.duplicates) {
      console.log(`  - ${d.name} (${d.count}x): ${d.occurrences.join(", ")}`);
    }
    process.exit(1);
  } else {
    console.log("\nAPROVADO: Unicidade 100%! Zero declarações de tipo concorrentes em src/.");
    process.exit(0);
  }
}
