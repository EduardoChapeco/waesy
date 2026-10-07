/**
 * @fileoverview VALIDADOR DE UNICIDADE DE TIPOS E INTERFACES EXPORTADOS (Plano 5 — S13)
 * Varre todo o código em src/ e garante que não existem declarações concorrentes
 * de tipos ou interfaces com o mesmo nome em arquivos diferentes.
 */

import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const SRC_DIR = path.resolve(ROOT_DIR, "src");
const SUPABASE_TYPES_FILE = path.resolve(SRC_DIR, "integrations/supabase/types.ts");

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
  const supabaseTypes = fs.existsSync(SUPABASE_TYPES_FILE)
    ? fs.readFileSync(SUPABASE_TYPES_FILE, "utf8")
    : "";
  const databaseAny = /export\s+type\s+Database\s*=\s*any\s*;/.test(supabaseTypes);
  return { filesCount: files.length, duplicates, databaseAny };
}

// Execution CLI
if (process.argv[1] && process.argv[1].endsWith("check-type-duplications.mjs")) {
  console.log("======================================================================");
  console.log("WAESY TYPE DUPLICATION & SSOT CHECKER (Plano 5 — S13)");
  console.log("======================================================================");
  const result = auditTypeDuplications();
  console.log(`Arquivos inspecionados:            ${result.filesCount}`);
  console.log(`Tipos/interfaces duplicados:       ${result.duplicates.length}`);
  console.log(`Contrato Supabase Database=any:   ${result.databaseAny ? "ENCONTRADO" : "não encontrado"}`);

  if (result.databaseAny || result.duplicates.length > 0) {
    console.log("\nViolações de duplicidade de tipo encontradas:");
    for (const d of result.duplicates) {
      console.log(`  - ${d.name} (${d.count}x): ${d.occurrences.join(", ")}`);
    }
    if (result.databaseAny) {
      console.log("  - src/integrations/supabase/types.ts contém Database = any; regenerar o contrato do projeto Supabase.");
    }
    process.exit(1);
  } else {
    console.log("\nAPROVADO: Unicidade 100%! Zero declarações de tipo concorrentes em src/.");
    process.exit(0);
  }
}
