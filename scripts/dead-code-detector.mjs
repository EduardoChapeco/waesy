/**
 * @fileoverview DETECTOR DETERMINÍSTICO DE CÓDIGO MORTO E ÓRFÃO (Plano 5 — S11)
 * Analisa o grafo de dependências a partir dos pontos de entrada (rotas, shells, testes)
 * e detecta arquivos desvinculados ou órfãos no repositório.
 */

import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const SRC_DIR = path.resolve(ROOT_DIR, "src");

// Arquivos que são pontos de entrada raiz (não precisam ser importados por ninguém)
const ENTRY_POINTS_PATTERNS = [
  "src/router.tsx",
  "src/routeTree.gen.ts",
  "src/routes/",
  "src/app/",
  "src/test/",
  ".test.ts",
  ".test.tsx",
  "src/registries/",
  "src/types/",
];

function isEntryPoint(filePath) {
  const norm = filePath.replace(/\\/g, "/");
  return ENTRY_POINTS_PATTERNS.some((pat) => norm.includes(pat));
}

function getAllSourceFiles(dir) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".git", "dist"].includes(entry.name)) continue;
      files = files.concat(getAllSourceFiles(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
      files.push(fullPath);
    }
  }

  return files;
}

function extractImports(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const imports = new Set();
  const importRegex = /(?:import|export)\s+(?:(?:[\w*\s{},]*)\s+from\s+)?['"]([^'"]+)['"]/g;

  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    if (importPath.startsWith(".") || importPath.startsWith("@/")) {
      imports.add(importPath);
    }
  }

  return Array.from(imports);
}

export function auditDeadCode() {
  const allFiles = getAllSourceFiles(SRC_DIR);
  const fileSet = new Set(allFiles.map((f) => f.replace(/\\/g, "/")));

  const importedSet = new Set();

  for (const file of allFiles) {
    const normFile = file.replace(/\\/g, "/");
    const fileDir = path.dirname(normFile);
    const imports = extractImports(file);

    for (const imp of imports) {
      let resolved = "";
      if (imp.startsWith("@/")) {
        resolved = path.resolve(ROOT_DIR, "src", imp.slice(2)).replace(/\\/g, "/");
      } else {
        resolved = path.resolve(fileDir, imp).replace(/\\/g, "/");
      }

      // Procura extensões
      const candidates = [
        resolved,
        resolved + ".ts",
        resolved + ".tsx",
        resolved + "/index.ts",
        resolved + "/index.tsx",
      ];

      for (const cand of candidates) {
        if (fileSet.has(cand)) {
          importedSet.add(cand);
          break;
        }
      }
    }
  }

  const unreferenced = [];
  for (const file of allFiles) {
    const normFile = file.replace(/\\/g, "/");
    if (!isEntryPoint(normFile) && !importedSet.has(normFile)) {
      unreferenced.push(path.relative(ROOT_DIR, file));
    }
  }

  return {
    totalFiles: allFiles.length,
    totalImported: importedSet.size,
    unreferencedCount: unreferenced.length,
    unreferencedFiles: unreferenced,
  };
}

if (process.argv[1] && process.argv[1].endsWith("dead-code-detector.mjs")) {
  console.log("======================================================================");
  console.log("WAESY DEAD CODE & ORPHAN DETECTOR (Plano 5 — S11)");
  console.log("======================================================================");

  const report = auditDeadCode();
  console.log(`Total de arquivos de código inspecionados: ${report.totalFiles}`);
  console.log(`Total de arquivos ativamente importados:   ${report.totalImported}`);
  console.log(`Arquivos sem referência direta ativa:       ${report.unreferencedCount}`);

  if (report.unreferencedCount > 0) {
    console.log("\nArquivos potencialmente órfãos / candidatos à poda:");
    report.unreferencedFiles.slice(0, 30).forEach((f) => console.log(`  - ${f}`));
    if (report.unreferencedFiles.length > 30) {
      console.log(`  ... e mais ${report.unreferencedFiles.length - 30} arquivos.`);
    }
  } else {
    console.log("\nPARABÉNS: Zero arquivos órfãos detectados no grafo de dependências!");
  }
}
