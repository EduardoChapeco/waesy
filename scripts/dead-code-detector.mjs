#!/usr/bin/env node
/**
 * @fileoverview Detector determinístico de código morto e duplicação exata.
 *
 * O grafo considera rotas, testes, registries, server functions e módulos
 * carregados dinamicamente como entrypoints. Colisões de basename são apenas
 * informativas: dois componentes com o mesmo nome podem ser implementações
 * válidas em verticais diferentes; somente conteúdo idêntico é duplicação.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT_DIR = process.cwd();
const SRC_DIR = path.resolve(ROOT_DIR, "src");
const REPORT_PATH = path.resolve(ROOT_DIR, "dead-code.report.json");
const ALLOWLIST_PATH = path.resolve(ROOT_DIR, ".audit/dead-code-allowlist.json");

const ENTRY_POINTS_PATTERNS = [
  "src/router.tsx",
  "src/routeTree.gen.ts",
  "src/routes/",
  "src/app/",
  "src/test/",
  "src/services/",
  "src/plugins/",
  "src/server.ts",
  "src/start.ts",
  "src/integrations/supabase/client.ts",
  "src/config/route-registry.ts",
  ".test.ts",
  ".test.tsx",
  "src/registries/",
  "src/types/",
  "/index.ts",
  "/index.tsx",
];

function isEntryPoint(filePath) {
  const norm = filePath.replace(/\\/g, "/");
  return ENTRY_POINTS_PATTERNS.some((pattern) => norm.includes(pattern));
}

function getAllSourceFiles(dir) {
  let files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".git", "dist", "legacy_quarantine"].includes(entry.name)) continue;
      files = files.concat(getAllSourceFiles(fullPath));
    } else if (entry.isFile() && (/\.tsx?$/.test(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

function extractImports(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const imports = new Set();
  const patterns = [
    /(?:import|export)\s+(?:(?:[\w*\s{},]*)\s+from\s+)?["']([^"']+)["']/g,
    /import\(\s*["']([^"']+)["']\s*\)/g,
    /require\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      const importPath = match[1];
      if (importPath.startsWith(".") || importPath.startsWith("@/")) imports.add(importPath);
    }
  }
  return [...imports];
}

function resolveImport(importer, importPath, fileSet) {
  const importerPath = importer.replace(/\\/g, "/");
  const base = importPath.startsWith("@/")
    ? path.resolve(ROOT_DIR, "src", importPath.slice(2))
    : path.resolve(path.dirname(importerPath), importPath);
  const resolved = base.replace(/\\/g, "/");
  const candidates = [resolved, `${resolved}.ts`, `${resolved}.tsx`, `${resolved}/index.ts`, `${resolved}/index.tsx`];
  return candidates.find((candidate) => fileSet.has(candidate));
}

function detectDuplicateComponents(allFiles) {
  const componentMap = new Map();
  for (const file of allFiles) {
    const norm = file.replace(/\\/g, "/");
    if (!norm.includes("/components/")) continue;
    const baseName = path.basename(file, path.extname(file));
    if (["index", "types", "utils", "constants"].includes(baseName.toLowerCase())) continue;
    if (!componentMap.has(baseName)) componentMap.set(baseName, []);
    componentMap.get(baseName).push(path.relative(ROOT_DIR, file).replace(/\\/g, "/"));
  }

  const exactDuplicates = [];
  const nameCollisions = [];
  for (const [componentName, paths] of componentMap) {
    if (paths.length < 2) continue;
    const hashes = new Map();
    for (const relativePath of paths) {
      const content = fs.readFileSync(path.resolve(ROOT_DIR, relativePath), "utf8");
      const hash = crypto.createHash("sha256").update(content).digest("hex");
      if (!hashes.has(hash)) hashes.set(hash, []);
      hashes.get(hash).push(relativePath);
    }
    const duplicateGroups = [...hashes.values()].filter((group) => group.length > 1);
    if (duplicateGroups.length) {
      exactDuplicates.push({ componentName, count: duplicateGroups.flat().length, paths: duplicateGroups.flat() });
    } else {
      nameCollisions.push({ componentName, count: paths.length, paths });
    }
  }
  return { exactDuplicates, nameCollisions };
}

export function auditDeadCode(options = {}) {
  const allFiles = getAllSourceFiles(SRC_DIR);
  const fileSet = new Set(allFiles.map((file) => file.replace(/\\/g, "/")));
  const importedSet = new Set();

  for (const file of allFiles) {
    const normalized = file.replace(/\\/g, "/");
    for (const importPath of extractImports(file)) {
      const resolved = resolveImport(normalized, importPath, fileSet);
      if (resolved) importedSet.add(resolved);
    }
  }

  const discoveredUnreferencedFiles = allFiles
    .map((file) => file.replace(/\\/g, "/"))
    .filter((file) => !isEntryPoint(file) && !importedSet.has(file))
    .map((file) => path.relative(ROOT_DIR, file).replace(/\\/g, "/"));
  const allowlist = fs.existsSync(ALLOWLIST_PATH)
    ? JSON.parse(fs.readFileSync(ALLOWLIST_PATH, "utf8"))
    : { entries: {} };
  const repositoryRelativeFiles = new Set(allFiles.map((file) => path.relative(ROOT_DIR, file).replace(/\\/g, "/")));
  const allowlistUnknownFiles = Object.keys(allowlist.entries || {}).filter((file) => !repositoryRelativeFiles.has(file));
  const intentionalUnreferencedFiles = discoveredUnreferencedFiles.filter((file) => allowlist.entries?.[file]);
  const unreferencedFiles = discoveredUnreferencedFiles.filter((file) => !allowlist.entries?.[file]);
  const duplicates = detectDuplicateComponents(allFiles);
  const shouldFail = options.strict && (unreferencedFiles.length > 0 || duplicates.exactDuplicates.length > 0 || allowlistUnknownFiles.length > 0);
  const report = {
    timestamp: new Date().toISOString(),
    totalFiles: allFiles.length,
    totalImported: importedSet.size,
    discoveredUnreferencedCount: discoveredUnreferencedFiles.length,
    intentionalUnreferencedCount: intentionalUnreferencedFiles.length,
    intentionalUnreferencedFiles,
    allowlistUnknownCount: allowlistUnknownFiles.length,
    allowlistUnknownFiles,
    unreferencedCount: unreferencedFiles.length,
    unreferencedFiles,
    duplicateComponentsCount: duplicates.exactDuplicates.length,
    duplicateComponents: duplicates.exactDuplicates,
    nameCollisionCount: duplicates.nameCollisions.length,
    nameCollisions: duplicates.nameCollisions,
    status: shouldFail ? "FAIL" : "PASS",
  };
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
  return report;
}

if (process.argv[1]?.endsWith("dead-code-detector.mjs")) {
  const strict = process.argv.includes("--strict") || process.argv.includes("--ci");
  const report = auditDeadCode({ strict });
  console.log("======================================================================");
  console.log("WAESY DEAD CODE & DUPLICATES DETECTOR (CI Gate 5)");
  console.log("======================================================================");
  console.log(`Arquivos inspecionados:          ${report.totalFiles}`);
  console.log(`Arquivos ativamente ligados:     ${report.totalImported}`);
  console.log(`Arquivos orfaos detectados:      ${report.unreferencedCount}`);
  console.log(`Superficies intencionais:        ${report.intentionalUnreferencedCount}`);
  console.log(`Entradas obsoletas no ledger:   ${report.allowlistUnknownCount}`);
  console.log(`Duplicacoes exatas:               ${report.duplicateComponentsCount}`);
  console.log(`Colisoes de basename informativas: ${report.nameCollisionCount}`);
  console.log(`Relatorio salvo em:               ${REPORT_PATH}`);
  if (report.duplicateComponentsCount > 0) {
    console.log("\nDuplicacoes exatas:");
    for (const duplicate of report.duplicateComponents.slice(0, 10)) {
      console.log(`  - ${duplicate.componentName}: ${duplicate.paths.join(", ")}`);
    }
  }
  if (report.unreferencedCount > 0) {
    console.log("\nPrimeiros orfaos encontrados:");
    for (const file of report.unreferencedFiles.slice(0, 15)) console.log(`  - ${file}`);
  }
  if (report.allowlistUnknownCount > 0) {
    console.log("\nEntradas obsoletas no ledger:");
    for (const file of report.allowlistUnknownFiles) console.log(`  - ${file}`);
  }
  if (report.nameCollisionCount > 0) {
    console.log("\nColisoes de nome (nao sao duplicacao exata):");
    for (const collision of report.nameCollisions.slice(0, 10)) {
      console.log(`  - ${collision.componentName} (${collision.count}x): ${collision.paths.join(", ")}`);
    }
  }
  if (report.status === "FAIL") {
    console.error("\nFALHA CI: Encontrados arquivos sem referência ou duplicações exatas.");
    process.exit(1);
  }
  console.log("\nSUCESSO: Auditoria de codigo morto e duplicacoes concluida.");
}
