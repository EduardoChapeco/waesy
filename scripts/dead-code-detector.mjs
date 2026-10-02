/**
 * @fileoverview DETECTOR DETERMINISTICO DE CODIGO MORTO, ORFAOS E COMPONENTES DUPLICADOS
 * Analisa o grafo de dependencias a partir dos pontos de entrada (rotas, shells, testes)
 * e detecta arquivos desvinculados ou componentes com nomes duplicados no repositorio.
 */

import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const SRC_DIR = path.resolve(ROOT_DIR, "src");
const REPORT_PATH = path.resolve(ROOT_DIR, "dead-code.report.json");

// Arquivos que sao pontos de entrada raiz ou excecoes conhecidas
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
  "/index.ts",
  "/index.tsx",
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
      if (["node_modules", ".git", "dist", "legacy_quarantine"].includes(entry.name)) continue;
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

function detectDuplicateComponents(allFiles) {
  const componentMap = new Map();
  const duplicates = [];

  for (const file of allFiles) {
    const norm = file.replace(/\\/g, "/");
    if (!norm.includes("/components/")) continue;

    const baseName = path.basename(file, path.extname(file));
    if (["index", "types", "utils", "constants"].includes(baseName.toLowerCase())) continue;

    if (!componentMap.has(baseName)) {
      componentMap.set(baseName, []);
    }
    componentMap.get(baseName).push(path.relative(ROOT_DIR, file).replace(/\\/g, "/"));
  }

  for (const [name, paths] of componentMap.entries()) {
    if (paths.length > 1) {
      duplicates.push({ componentName: name, count: paths.length, paths });
    }
  }

  return duplicates;
}

export function auditDeadCode(options = {}) {
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
      unreferenced.push(path.relative(ROOT_DIR, file).replace(/\\/g, "/"));
    }
  }

  const duplicates = detectDuplicateComponents(allFiles);

  const report = {
    timestamp: new Date().toISOString(),
    totalFiles: allFiles.length,
    totalImported: importedSet.size,
    unreferencedCount: unreferenced.length,
    unreferencedFiles: unreferenced,
    duplicateComponentsCount: duplicates.length,
    duplicateComponents: duplicates,
    status: unreferenced.length > 0 && options.strict ? "FAIL" : "PASS",
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");

  return report;
}

if (process.argv[1] && process.argv[1].endsWith("dead-code-detector.mjs")) {
  const isStrict = process.argv.includes("--strict");
  const isCi = process.argv.includes("--ci");

  console.log("======================================================================");
  console.log("WAESY DEAD CODE & DUPLICATES DETECTOR (CI Gate 5)");
  console.log("======================================================================");

  const report = auditDeadCode({ strict: isStrict });
  console.log(`Arquivos inspecionados:       ${report.totalFiles}`);
  console.log(`Arquivos ativamente ligados:  ${report.totalImported}`);
  console.log(`Arquivos orfaos detectados:   ${report.unreferencedCount}`);
  console.log(`Componentes duplicados:       ${report.duplicateComponentsCount}`);
  console.log(`Relatorio salvo em:           ${REPORT_PATH}`);

  if (report.duplicateComponentsCount > 0) {
    console.log("\nComponentes com nomes coincidentes em caminhos distintos:");
    report.duplicateComponents.slice(0, 10).forEach((d) => {
      console.log(`  - ${d.componentName} (${d.count}x): ${d.paths.join(", ")}`);
    });
  }

  if (report.unreferencedCount > 0) {
    console.log("\nPrimeiros orfaos encontrados:");
    report.unreferencedFiles.slice(0, 15).forEach((f) => console.log(`  - ${f}`));
  }

  if (isStrict && (report.unreferencedCount > 0 || report.duplicateComponentsCount > 0)) {
    console.error("\nFALHA CI: Encontrados orfaos ou duplicacoes em modo estrito!");
    process.exit(1);
  } else {
    console.log("\nSUCESSO: Auditoria de codigo morto e duplicacoes concluida.");
    process.exit(0);
  }
}
