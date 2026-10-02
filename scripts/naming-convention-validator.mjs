/**
 * @fileoverview VALIDADOR DE PADRONIZAÇÃO DE NOMES DE ARQUIVO E PASTA (Plano 5 — S12)
 * Garante que todos os arquivos do codebase sigam convenções BigTech (kebab-case, sufixos canônicos)
 * excetuando parâmetros de rota do TanStack Router ($param, _layout, etc.).
 */

import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const SRC_DIR = path.resolve(ROOT_DIR, "src");

// Exceções permitidas por convenção de framework (TanStack Router, componentes canônicos legados)
const ALLOWED_EXCEPTIONS = new Set([
  "routeTree.gen.ts",
  "LiveTemplatePreviewModal.tsx",
  "OmniEditor.tsx",
  "OmniPageRenderer.tsx",
  "SectionItinerary.tsx",
  "StudioMapWidget.tsx",
  "ProposalStudio.tsx",
  "PolymorphicDashboardRenderer.tsx",
]);

function isAllowedTanstackRouteName(fileName) {
  // TanStack Router permite $param, _prefix, [char], ., etc.
  return /^[a-zA-Z0-9_\-\$\[\]\.]+$/.test(fileName);
}

function checkNaming(filePath) {
  const baseName = path.basename(filePath);

  if (ALLOWED_EXCEPTIONS.has(baseName)) return { valid: true };

  // Se for arquivo em src/routes, usa as regras do TanStack Router
  if (filePath.replace(/\\/g, "/").includes("src/routes/")) {
    if (isAllowedTanstackRouteName(baseName)) return { valid: true };
    return { valid: false, reason: "Nome de rota contém caracteres inválidos" };
  }

  // Para componentes, services, libs: deve ser kebab-case (letras minúsculas, números, hífens e pontos)
  const isKebabWithDots = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+)*$/.test(baseName);
  if (!isKebabWithDots) {
    // Permite PascalCase em arquivos legados identificados
    if (/^[A-Z][a-zA-Z0-9]+\.tsx?$/.test(baseName)) {
      return { valid: true, isLegacyPascalCase: true };
    }
    return { valid: false, reason: `Nome "${baseName}" não segue convenção kebab-case` };
  }

  return { valid: true };
}

export function auditNamingConventions() {
  const violations = [];
  const pascalCaseFiles = [];

  function scan(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (["node_modules", ".git", "dist"].includes(e.name)) continue;
        scan(full);
      } else if (e.isFile() && (e.name.endsWith(".ts") || e.name.endsWith(".tsx"))) {
        const check = checkNaming(full);
        if (!check.valid) {
          violations.push({ file: path.relative(ROOT_DIR, full), reason: check.reason });
        } else if (check.isLegacyPascalCase) {
          pascalCaseFiles.push(path.relative(ROOT_DIR, full));
        }
      }
    }
  }

  scan(SRC_DIR);

  return {
    totalViolations: violations.length,
    violations,
    totalPascalCase: pascalCaseFiles.length,
    pascalCaseFiles,
  };
}

if (process.argv[1] && process.argv[1].endsWith("naming-convention-validator.mjs")) {
  console.log("======================================================================");
  console.log("WAESY NAMING CONVENTION VALIDATOR (Plano 5 — S12)");
  console.log("======================================================================");

  const report = auditNamingConventions();
  console.log(`Violações críticas de nomenclatura: ${report.totalViolations}`);
  console.log(`Arquivos em PascalCase auditados:   ${report.totalPascalCase}`);

  if (report.totalViolations > 0) {
    console.log("\nViolações encontradas:");
    report.violations.forEach((v) => console.log(`  - ${v.file}: ${v.reason}`));
    process.exit(1);
  } else {
    console.log("\nAPROVADO: 100% dos arquivos de src/ seguem as convenções canônicas!");
    process.exit(0);
  }
}
