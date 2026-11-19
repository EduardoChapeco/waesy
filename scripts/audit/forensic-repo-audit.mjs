#!/usr/bin/env node
/**
 * forensic-repo-audit.mjs — Motor Forense AST para Auditoria, Deduplicação e Enxugamento Seguro
 *
 * Executa análise determinística via TypeScript Compiler AST (`src/`, `legacy_quarantine/`,
 * `supabase/`, `package.json`, `tsconfig.json`, `eslint.config.js`) sem alterar nenhum código-fonte.
 *
 * Uso:
 *   node scripts/audit/forensic-repo-audit.mjs
 *   node scripts/audit/forensic-repo-audit.mjs --json .audit/forensic-repo-audit.json --md docs/audits/FORENSIC_CODEBASE_LEAN_AUDIT_LIVE.md
 *   node scripts/audit/forensic-repo-audit.mjs --strict-broken
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import ts from "typescript";

const DEFAULT_RUNTIME_ENTRY_PATTERNS = [
  "src/router.tsx",
  "src/routeTree.gen.ts",
  "src/routes/",
  "src/app/",
  "src/plugins/",
  "src/server.ts",
  "src/start.ts",
  "src/integrations/supabase/client.ts",
  "src/lib/server-client-noop-shim.ts",
  "src/lib/server-browser-only-shim.ts",
  "src/lib/server-recharts-shim.ts",
  "src/lib/client-start-server-core-shim.ts",
];

const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  ".output",
  ".vinxi",
  ".tanstack",
  ".wrangler",
  "legacy_quarantine",
]);

const WATCHLIST_HELPER_NAMES = new Set([
  "isUuid",
  "formatBRL",
  "formatCurrency",
  "formatMoney",
  "formatPrice",
  "slugify",
  "normalizeSlug",
  "isVideoUrl",
  "isImageUrl",
  "parseSafeJson",
  "sanitizeHtml",
  "escapeHtml",
  "maskCpf",
  "parseReaisToCents",
  "toDateInputValue",
  "handleStartNativeChat",
]);

const UI_IMPORT_DISALLOWED_IN_SERVICES = [
  "react",
  "react-dom",
  "@radix-ui",
  "lucide-react",
  "@phosphor-icons",
  "framer-motion",
  "@/components/",
];

const STACK_OVERLAP_GROUPS = [
  { group: "Postgres Drivers", packages: ["pg", "postgres"] },
  { group: "Icon Libraries", packages: ["lucide-react", "@phosphor-icons/react"] },
  { group: "Client PDF/Rasterizers", packages: ["jspdf", "html2canvas"] },
  { group: "Client Carousels/Sliders", packages: ["embla-carousel-react", "vaul"] },
];

function toPosix(p) {
  return p.replace(/\\/g, "/");
}

function isTestFile(relPath) {
  const norm = toPosix(relPath);
  return (
    norm.includes(".test.") ||
    norm.includes(".spec.") ||
    norm.includes("/__tests__/") ||
    norm.startsWith("src/test/") ||
    norm.startsWith("tests/")
  );
}

function collectFiles(rootDir, subDir, extRegex = /\.(ts|tsx)$/) {
  const target = path.join(rootDir, subDir);
  if (!fs.existsSync(target)) return [];
  const results = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (IGNORE_DIRS.has(entry.name)) continue;
        walk(full);
      } else if (entry.isFile() && extRegex.test(entry.name)) {
        results.push({
          absPath: full,
          relPath: toPosix(path.relative(rootDir, full)),
        });
      }
    }
  }
  walk(target);
  return results;
}

function parseSource(absPath, content) {
  const kind = absPath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(absPath, content, ts.ScriptTarget.Latest, true, kind);
}

function resolveModuleSpecifier(importerAbs, specifier, srcFileAbsSet, rootDir) {
  if (!specifier.startsWith(".") && !specifier.startsWith("@/")) {
    return { kind: "external", packageName: getExternalPackageName(specifier), resolved: null };
  }
  const cleanSpec = specifier.replace(/[?#].*$/, "");
  // Ignore non-TS asset imports like CSS/JSON/SVG/PNG (including Vite ?url / ?raw suffixes)
  if (/\.(css|scss|sass|json|svg|png|jpe?g|webp|gif|ico|woff2?|mp4|webm)$/i.test(cleanSpec)) {
    return { kind: "asset", resolved: null, broken: false };
  }
  const baseAbs = cleanSpec.startsWith("@/")
    ? path.resolve(rootDir, "src", cleanSpec.slice(2))
    : path.resolve(path.dirname(importerAbs), cleanSpec);
  const normBase = toPosix(baseAbs);
  const candidates = [
    normBase,
    `${normBase}.ts`,
    `${normBase}.tsx`,
    `${normBase}.mts`,
    `${normBase}.mjs`,
    `${normBase}/index.ts`,
    `${normBase}/index.tsx`,
  ];
  // Support TypeScript NodeNext/ESM relative `.js` extension mapping to `.ts`/`.tsx`
  if (normBase.endsWith(".js") || normBase.endsWith(".jsx")) {
    const stem = normBase.replace(/\.(jsx?)$/, "");
    candidates.push(`${stem}.ts`, `${stem}.tsx`);
  }
  const match = candidates.find((c) => srcFileAbsSet.has(c));
  if (match) {
    return { kind: "internal", resolved: match, broken: false };
  }
  // Support cross-root repo files outside src/ (e.g. supabase/functions/_shared/*)
  if (candidates.some((c) => fs.existsSync(c) && fs.statSync(c).isFile())) {
    return { kind: "internal-outside-src", resolved: null, broken: false };
  }
  return { kind: "internal", resolved: null, broken: true };
}

function getExternalPackageName(specifier) {
  if (specifier.startsWith("node:")) return specifier;
  if (specifier.startsWith("@")) {
    const parts = specifier.split("/");
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : specifier;
  }
  return specifier.split("/")[0];
}

function extractModuleImportsAndExports(sf, content) {
  const specifiers = [];
  const exportedSymbols = [];
  const hasDeprecatedTag = /@deprecated\b/i.test(content);
  const deprecatedSymbols = [];

  function checkDeprecatedNode(node, symbolName) {
    const jsDocs = ts.getJSDocTags(node);
    const tagged = jsDocs.some((t) => t.tagName?.text?.toLowerCase() === "deprecated");
    if (tagged) {
      deprecatedSymbols.push(symbolName);
      return true;
    }
    const start = Math.max(0, node.getFullStart() - 120);
    const trivia = content.slice(start, node.getStart(sf));
    if (/@deprecated\b/i.test(trivia)) {
      deprecatedSymbols.push(symbolName);
      return true;
    }
    return false;
  }

  for (const stmt of sf.statements) {
    if (ts.isImportDeclaration(stmt) && ts.isStringLiteral(stmt.moduleSpecifier)) {
      specifiers.push({
        specifier: stmt.moduleSpecifier.text,
        kind: stmt.importClause?.isTypeOnly ? "type-import" : "import",
        line: sf.getLineAndCharacterOfPosition(stmt.getStart(sf)).line + 1,
      });
    } else if (ts.isExportDeclaration(stmt) && stmt.moduleSpecifier && ts.isStringLiteral(stmt.moduleSpecifier)) {
      specifiers.push({
        specifier: stmt.moduleSpecifier.text,
        kind: "reexport",
        line: sf.getLineAndCharacterOfPosition(stmt.getStart(sf)).line + 1,
      });
    } else if (ts.isExportDeclaration(stmt) && stmt.exportClause && ts.isNamedExports(stmt.exportClause)) {
      for (const el of stmt.exportClause.elements) {
        exportedSymbols.push(el.name.text);
      }
    }

    const isExported =
      ts.canHaveModifiers(stmt) &&
      ts.getModifiers(stmt)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

    if (isExported) {
      if (ts.isFunctionDeclaration(stmt) && stmt.name) {
        exportedSymbols.push(stmt.name.text);
        checkDeprecatedNode(stmt, stmt.name.text);
      } else if (ts.isVariableStatement(stmt)) {
        for (const decl of stmt.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) {
            exportedSymbols.push(decl.name.text);
            checkDeprecatedNode(stmt, decl.name.text);
          }
        }
      } else if (ts.isInterfaceDeclaration(stmt) || ts.isTypeAliasDeclaration(stmt)) {
        exportedSymbols.push(stmt.name.text);
        checkDeprecatedNode(stmt, stmt.name.text);
      }
    }
  }

  // Dynamic imports & require calls
  function visitDynamic(node) {
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length >= 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      specifiers.push({
        specifier: node.arguments[0].text,
        kind: "dynamic-import",
        line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
      });
    }
    ts.forEachChild(node, visitDynamic);
  }
  visitDynamic(sf);

  const reexportOnly =
    sf.statements.length > 0 &&
    sf.statements.every(
      (s) =>
        ts.isExportDeclaration(s) ||
        (ts.isImportDeclaration(s) && s.importClause?.isTypeOnly)
    );

  return {
    specifiers,
    exportedSymbols: [...new Set(exportedSymbols)],
    hasDeprecatedTag,
    deprecatedSymbols: [...new Set(deprecatedSymbols)],
    reexportOnly,
  };
}

function normalizeFunctionAst(sf, node) {
  let statementCount = 0;
  let tokenCount = 0;
  let branchCount = 0;
  let hasJsx = false;
  const localIds = new Map();
  let nextId = 0;
  const parts = [];

  function walk(n) {
    tokenCount++;
    if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n)) {
      hasJsx = true;
    }
    if (ts.isStatement(n) && !ts.isBlock(n)) statementCount++;
    if (
      ts.isIfStatement(n) ||
      ts.isConditionalExpression(n) ||
      ts.isSwitchStatement(n) ||
      ts.isForStatement(n) ||
      ts.isWhileStatement(n) ||
      ts.isCatchClause(n)
    ) {
      branchCount++;
    }
    if (ts.isIdentifier(n)) {
      const parent = n.parent;
      if (parent && ts.isPropertyAccessExpression(parent) && parent.name === n) {
        parts.push(`PROP:${n.text}`);
        return;
      }
      if (!localIds.has(n.text)) localIds.set(n.text, `ID${nextId++}`);
      parts.push(localIds.get(n.text));
      return;
    }
    if (ts.isRegularExpressionLiteral(n)) {
      parts.push(`REGEX:${n.text}`);
      return;
    }
    if (ts.isStringLiteral(n) || ts.isNumericLiteral(n)) {
      parts.push(ts.isNumericLiteral(n) ? "NUM" : "STR");
      return;
    }
    parts.push(ts.SyntaxKind[n.kind]);
    ts.forEachChild(n, walk);
  }

  walk(node);
  const signatureText = parts.join("|");
  const hash = crypto.createHash("sha256").update(signatureText).digest("hex").slice(0, 16);
  return { statementCount, tokenCount, branchCount, hasJsx, hash };
}

function extractFileMetricsAndHelpers(sf, relPath, content) {
  const lines = content.split(/\r?\n/);
  const loc = lines.length;
  const tables = new Set();
  const rpcs = new Set();
  const serverFns = [];
  const helpers = [];
  let useStateCount = 0;
  let useEffectCount = 0;
  let anyCount = 0;
  let supabaseDirectCount = 0;
  let branchCount = 0;
  let functionCount = 0;
  let maxFunctionLoc = 0;
  let embeddedComponentsCount = 0;
  let hasUnconditionalRedirect = false;

  const isRoute = relPath.startsWith("src/routes/") && !relPath.includes("routeTree.gen");

  function getLineNum(pos) {
    return sf.getLineAndCharacterOfPosition(pos).line + 1;
  }

  function recordHelper(name, fnNode, exported, startPos, endPos) {
    functionCount++;
    const fnLoc = getLineNum(endPos) - getLineNum(startPos) + 1;
    if (fnLoc > maxFunctionLoc) maxFunctionLoc = fnLoc;
    if (isRoute && /^[A-Z]/.test(name) && name !== "Route" && !name.endsWith("Page")) {
      embeddedComponentsCount++;
    }

    const ast = normalizeFunctionAst(sf, fnNode);
    const isWatchlisted = WATCHLIST_HELPER_NAMES.has(name);
    const isEligiblePure = !ast.hasJsx && ast.tokenCount >= 11 && ast.tokenCount <= 450 && (ast.statementCount >= 3 || ast.tokenCount >= 18);
    const isEligibleJsx = ast.hasJsx && ast.tokenCount >= 65 && ast.tokenCount <= 450;
    if (isEligiblePure || isEligibleJsx || isWatchlisted) {
      helpers.push({
        name,
        relPath,
        line: getLineNum(startPos),
        loc: fnLoc,
        exported,
        isWatchlisted,
        ...ast,
      });
    }
  }

  for (const stmt of sf.statements) {
    const isExported =
      ts.canHaveModifiers(stmt) &&
      ts.getModifiers(stmt)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

    if (ts.isFunctionDeclaration(stmt) && stmt.name && stmt.body) {
      recordHelper(stmt.name.text, stmt.body, Boolean(isExported), stmt.getStart(sf), stmt.getEnd());
    } else if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name) || !decl.initializer) continue;
        const initText = decl.initializer.getText(sf);
        if (initText.includes("createServerFn(")) {
          serverFns.push(decl.name.text);
        }
        if (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer)) {
          recordHelper(
            decl.name.text,
            decl.initializer.body,
            Boolean(isExported),
            decl.getStart(sf),
            decl.getEnd()
          );
        }
      }
    }
  }

  function visit(node) {
    if (
      ts.isIfStatement(node) ||
      ts.isConditionalExpression(node) ||
      ts.isSwitchStatement(node) ||
      ts.isForStatement(node) ||
      ts.isWhileStatement(node) ||
      ts.isCatchClause(node)
    ) {
      branchCount++;
    }

    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      anyCount++;
    }

    if (ts.isCallExpression(node)) {
      const exprText = node.expression.getText(sf);
      if (exprText === "useState") useStateCount++;
      if (exprText === "useEffect") useEffectCount++;

      if (
        (exprText.endsWith(".from") || exprText === "from") &&
        node.arguments.length >= 1 &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        tables.add(node.arguments[0].text);
        if (!relPath.startsWith("src/services/") && !relPath.startsWith("legacy_quarantine/")) {
          supabaseDirectCount++;
        }
      }
      if (
        (exprText.endsWith(".rpc") || exprText === "rpc") &&
        node.arguments.length >= 1 &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        rpcs.add(node.arguments[0].text);
      }
    }

    if (isRoute && ts.isPropertyAssignment(node) && ts.isIdentifier(node.name)) {
      if (node.name.text === "beforeLoad" || node.name.text === "loader") {
        const text = node.initializer.getText(sf);
        if (/\bthrow\s+redirect\s*\(/.test(text) && !/\bif\s*\(/.test(text.split("throw redirect")[0].slice(-200))) {
          hasUnconditionalRedirect = true;
        }
      }
    }

    ts.forEachChild(node, visit);
  }
  visit(sf);

  return {
    loc,
    functionCount,
    maxFunctionLoc,
    branchCount,
    useStateCount,
    useEffectCount,
    anyCount,
    supabaseDirectCount,
    embeddedComponentsCount,
    hasUnconditionalRedirect,
    tables: [...tables],
    rpcs: [...rpcs],
    serverFns,
    helpers,
  };
}

export function runForensicAudit(rootDir = process.cwd()) {
  const pkgPath = path.join(rootDir, "package.json");
  const pkg = fs.existsSync(pkgPath) ? JSON.parse(fs.readFileSync(pkgPath, "utf8")) : { dependencies: {}, devDependencies: {} };

  const srcFiles = collectFiles(rootDir, "src");
  const srcAbsSet = new Set(srcFiles.map((f) => toPosix(f.absPath)));

  // Include vite.config.ts references as runtime roots
  const viteRuntimeRoots = new Set();
  const vitePath = path.join(rootDir, "vite.config.ts");
  if (fs.existsSync(vitePath)) {
    const viteContent = fs.readFileSync(vitePath, "utf8");
    for (const m of viteContent.matchAll(/["'](\.\/src\/[^"']+)["']/g)) {
      const cand = toPosix(path.resolve(rootDir, m[1]));
      if (srcAbsSet.has(cand)) viteRuntimeRoots.add(cand);
    }
  }

  const fileInfos = new Map();
  const adjacency = new Map(); // absPath -> Set<absPath>
  const reverseCallers = new Map(); // absPath -> Set<relPath>
  const brokenImports = [];
  const layerViolations = [];
  const externalPackageUsage = new Map();
  const allHelpers = [];
  const deprecatedEntries = [];

  for (const file of srcFiles) {
    const content = fs.readFileSync(file.absPath, "utf8");
    const sf = parseSource(file.absPath, content);
    const normAbs = toPosix(file.absPath);
    const { specifiers, exportedSymbols, hasDeprecatedTag, deprecatedSymbols, reexportOnly } =
      extractModuleImportsAndExports(sf, content);
    const metrics = extractFileMetricsAndHelpers(sf, file.relPath, content);

    fileInfos.set(normAbs, {
      ...file,
      normAbs,
      testFile: isTestFile(file.relPath),
      exportedSymbols,
      hasDeprecatedTag,
      deprecatedSymbols,
      reexportOnly,
      ...metrics,
    });

    if (!isTestFile(file.relPath)) {
      allHelpers.push(...metrics.helpers);
    }

    if (hasDeprecatedTag || deprecatedSymbols.length > 0) {
      deprecatedEntries.push({
        relPath: file.relPath,
        fileLevel: hasDeprecatedTag && deprecatedSymbols.length === 0,
        deprecatedSymbols,
      });
    }

    const targets = new Set();
    for (const imp of specifiers) {
      const res = resolveModuleSpecifier(file.absPath, imp.specifier, srcAbsSet, rootDir);
      if (res.kind === "external" && res.packageName) {
        if (!externalPackageUsage.has(res.packageName)) externalPackageUsage.set(res.packageName, new Set());
        externalPackageUsage.get(res.packageName).add(file.relPath);
      } else if (res.kind === "internal") {
        if (res.broken) {
          brokenImports.push({
            file: file.relPath,
            line: imp.line,
            kind: imp.kind,
            specifier: imp.specifier,
          });
        } else if (res.resolved) {
          targets.add(res.resolved);
          if (!reverseCallers.has(res.resolved)) reverseCallers.set(res.resolved, new Set());
          reverseCallers.get(res.resolved).add(file.relPath);
        }
      }

      // Layer boundary checks on non-test files
      if (!isTestFile(file.relPath)) {
        if (file.relPath.startsWith("src/services/")) {
          if (UI_IMPORT_DISALLOWED_IN_SERVICES.some((bad) => imp.specifier === bad || imp.specifier.startsWith(`${bad}/`) || imp.specifier.startsWith(bad))) {
            layerViolations.push({
              rule: "SERVICE_IMPORTS_UI",
              file: file.relPath,
              line: imp.line,
              target: imp.specifier,
            });
          }
        } else if (file.relPath.startsWith("src/routes/") && imp.specifier === "@supabase/supabase-js") {
          layerViolations.push({
            rule: "ROUTE_IMPORTS_SUPABASE_CLIENT",
            file: file.relPath,
            line: imp.line,
            target: imp.specifier,
          });
        }
      }
    }
    adjacency.set(normAbs, targets);

    if (!isTestFile(file.relPath) && metrics.supabaseDirectCount > 0) {
      layerViolations.push({
        rule: "NON_SERVICE_DIRECT_DB_QUERY",
        file: file.relPath,
        count: metrics.supabaseDirectCount,
        tables: metrics.tables,
      });
    }
  }

  // BFS Reachability strictly from true runtime roots & test roots
  function computeReachable(seedFilter) {
    const visited = new Set();
    const queue = [];
    for (const [normAbs, info] of fileInfos) {
      if (seedFilter(normAbs, info)) {
        visited.add(normAbs);
        queue.push(normAbs);
      }
    }
    while (queue.length > 0) {
      const curr = queue.shift();
      for (const next of adjacency.get(curr) || []) {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }
    return visited;
  }

  const runtimeReachable = computeReachable((normAbs, info) => {
    if (info.testFile) return false;
    if (viteRuntimeRoots.has(normAbs)) return true;
    return DEFAULT_RUNTIME_ENTRY_PATTERNS.some((pat) => info.relPath.startsWith(pat));
  });

  const testReachable = computeReachable((_, info) => info.testFile);

  // Active tables & AST hashes across runtimeReachable files (to prevent deleting dormant capabilities!)
  const activeTables = new Set();
  const activeRpcs = new Set();
  const activeExportedSymbols = new Set();
  const activeAstHashes = new Set();

  for (const normAbs of runtimeReachable) {
    const info = fileInfos.get(normAbs);
    if (!info) continue;
    info.tables.forEach((t) => activeTables.add(t));
    info.rpcs.forEach((r) => activeRpcs.add(r));
    info.exportedSymbols.forEach((s) => activeExportedSymbols.add(s));
    info.helpers.forEach((h) => activeAstHashes.add(h.hash));
  }

  // Classify runtime-unreachable non-test files with strict anti-accidental-deletion protection
  const unreachableFiles = [];
  for (const [normAbs, info] of fileInfos) {
    if (info.testFile || runtimeReachable.has(normAbs)) continue;
    const callersNonTest = [...(reverseCallers.get(normAbs) || [])].filter((c) => !isTestFile(c));
    const callersTest = [...(reverseCallers.get(normAbs) || [])].filter((c) => isTestFile(c));

    const uniqueTables = info.tables.filter((t) => !activeTables.has(t));
    const uniqueRpcs = info.rpcs.filter((r) => !activeRpcs.has(r));
    const sharedAstClones = info.helpers.filter((h) => activeAstHashes.has(h.hash)).length;
    const overlappingExports = info.exportedSymbols.filter((s) => activeExportedSymbols.has(s));

    let verdict = "DORMANT_CAPABILITY_KEEP_AND_WIRE";
    let reason = "Contém lógica ou domínio próprio ainda não conectado às rotas ativas";

    if (info.reexportOnly || info.hasDeprecatedTag) {
      verdict = "DEPRECATED_OR_SHIM";
      reason = info.reexportOnly ? "Arquivo apenas reexporta outro módulo (shim)" : "Marcado com @deprecated e inalcançável em runtime";
    } else if (
      uniqueTables.length === 0 &&
      uniqueRpcs.length === 0 &&
      (sharedAstClones > 0 || (info.exportedSymbols.length > 0 && overlappingExports.length === info.exportedSymbols.length))
    ) {
      verdict = "CANDIDATE_DUPLICATE_OR_SUPERSEDED";
      reason = "Símbolos/tabelas já cobertos por módulos canônicos ativos no runtime";
    } else if (uniqueTables.length > 0 || uniqueRpcs.length > 0 || info.serverFns.length > 0) {
      verdict = "DORMANT_CAPABILITY_KEEP_AND_WIRE";
      reason = `Possui capacidades próprias (${uniqueTables.length} tabelas únicas, ${uniqueRpcs.length} RPCs, ${info.serverFns.length} serverFns) — NÃO excluir sem absorver`;
    }

    unreachableFiles.push({
      relPath: info.relPath,
      loc: info.loc,
      verdict,
      reason,
      nonTestDirectCallers: callersNonTest.length,
      testOnlyReachable: testReachable.has(normAbs) || callersTest.length > 0,
      uniqueTables,
      uniqueRpcs,
      serverFnsCount: info.serverFns.length,
    });
  }

  // Group AST Function Clones & Same-Name Helpers across different files
  const byAstHash = new Map();
  const byWatchlistName = new Map();
  for (const h of allHelpers) {
    if ((!h.hasJsx && (h.statementCount >= 3 || h.tokenCount >= 18)) || (h.hasJsx && h.tokenCount >= 65)) {
      if (!byAstHash.has(h.hash)) byAstHash.set(h.hash, []);
      byAstHash.get(h.hash).push(h);
    }
    if (h.isWatchlisted) {
      if (!byWatchlistName.has(h.name)) byWatchlistName.set(h.name, []);
      byWatchlistName.get(h.name).push(h);
    }
  }

  const astClones = [...byAstHash.entries()]
    .map(([hash, items]) => {
      const uniqueFiles = [...new Set(items.map((i) => i.relPath))];
      return { hash, count: items.length, uniqueFilesCount: uniqueFiles.length, sampleName: items[0].name, items };
    })
    .filter((g) => g.uniqueFilesCount >= 2)
    .sort((a, b) => b.uniqueFilesCount - a.uniqueFilesCount || b.count - a.count)
    .slice(0, 60);

  const watchlistedDuplicates = [...byWatchlistName.entries()]
    .map(([name, items]) => ({
      name,
      count: items.length,
      uniqueFiles: [...new Set(items.map((i) => i.relPath))],
      occurrences: items.map((i) => `${i.relPath}:${i.line}`),
    }))
    .filter((g) => g.uniqueFiles.length >= 2 || g.count >= 2)
    .sort((a, b) => b.count - a.count);

  // Add non-test caller counts to @deprecated files
  const deprecatedWithCallers = deprecatedEntries.map((d) => {
    const abs = toPosix(path.resolve(rootDir, d.relPath));
    const callers = [...(reverseCallers.get(abs) || [])].filter((c) => !isTestFile(c));
    return {
      ...d,
      nonTestCallersCount: callers.length,
      nonTestCallersSample: callers.slice(0, 10),
    };
  });

  // Top Monoliths & Unconditional Route Redirect Traps
  const nonTestInfos = [...fileInfos.values()].filter(
    (f) => !f.testFile && f.relPath !== "src/routeTree.gen.ts" && !f.relPath.endsWith("supabase/types.ts")
  );
  const monoliths = [...nonTestInfos]
    .filter((f) => f.loc >= 800)
    .sort((a, b) => b.loc - a.loc)
    .map((f) => ({
      relPath: f.relPath,
      loc: f.loc,
      functionCount: f.functionCount,
      maxFunctionLoc: f.maxFunctionLoc,
      branchCount: f.branchCount,
      hooksCount: f.useStateCount + f.useEffectCount,
      anyCount: f.anyCount,
      embeddedComponentsCount: f.embeddedComponentsCount,
    }));

  const routeRedirectTraps = nonTestInfos
    .filter((f) => f.hasUnconditionalRedirect && f.loc >= 100)
    .map((f) => {
      const abs = f.normAbs;
      const callers = [...(reverseCallers.get(abs) || [])];
      return {
        relPath: f.relPath,
        loc: f.loc,
        importedByCount: callers.length,
        importedBy: callers,
      };
    });

  // Legacy Quarantine Feature Extraction Check
  const quarantineFiles = collectFiles(rootDir, "legacy_quarantine");
  const quarantineInventory = quarantineFiles.map((q) => {
    const content = fs.readFileSync(q.absPath, "utf8");
    const sf = parseSource(q.absPath, content);
    const { exportedSymbols } = extractModuleImportsAndExports(sf, content);
    const m = extractFileMetricsAndHelpers(sf, q.relPath, content);
    const uniqueTables = m.tables.filter((t) => !activeTables.has(t));
    const uniqueRpcs = m.rpcs.filter((r) => !activeRpcs.has(r));
    return {
      relPath: q.relPath,
      loc: m.loc,
      exportedSymbols,
      uniqueTables,
      uniqueRpcs,
      verdict:
        uniqueTables.length > 0 || uniqueRpcs.length > 0 || m.loc >= 400
          ? "EXTRACT_AND_VERIFY_BEFORE_PURGE"
          : "LIKELY_COVERED_SAFE_TO_AUDIT_FOR_PURGE",
    };
  });

  // Package.json usage check across src/ and scripts/
  const scriptFiles = collectFiles(rootDir, "scripts", /\.(ts|tsx|mjs|cjs|js)$/);
  const scriptTexts = scriptFiles.map((f) => ({ relPath: f.relPath, content: fs.readFileSync(f.absPath, "utf8") }));

  function analyzePackages(depMap, kind) {
    return Object.entries(depMap || {}).map(([name, version]) => {
      const srcUsers = [...(externalPackageUsage.get(name) || [])];
      const scriptUsers = scriptTexts
        .filter((s) => s.content.includes(`'${name}'`) || s.content.includes(`"${name}"`) || s.content.includes(`'${name}/`) || s.content.includes(`"${name}/`))
        .map((s) => s.relPath);
      return {
        name,
        version,
        kind,
        srcImportCount: srcUsers.length,
        scriptMatchCount: scriptUsers.length,
      };
    });
  }

  const dependencyAudit = [
    ...analyzePackages(pkg.dependencies, "dependencies"),
    ...analyzePackages(pkg.devDependencies, "devDependencies"),
  ];

  // Check stack config strictness gaps (use ts.readConfigFile to support JSONC comments)
  const tsconfigPath = path.join(rootDir, "tsconfig.json");
  const tsconfigRaw = fs.existsSync(tsconfigPath)
    ? (ts.readConfigFile(tsconfigPath, (p) => fs.readFileSync(p, "utf8")).config ?? {})
    : {};
  const eslintPath = path.join(rootDir, "eslint.config.js");
  const eslintRaw = fs.existsSync(eslintPath) ? fs.readFileSync(eslintPath, "utf8") : "";

  const migrationsCount = fs.existsSync(path.join(rootDir, "supabase/migrations"))
    ? fs.readdirSync(path.join(rootDir, "supabase/migrations")).filter((f) => f.endsWith(".sql")).length
    : 0;
  const referenceMigrationsCount = fs.existsSync(path.join(rootDir, "supabase/reference-migrations"))
    ? collectFiles(rootDir, "supabase/reference-migrations", /\.sql$/).length
    : 0;

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalSrcFiles: srcFiles.length,
      nonTestSrcFiles: nonTestInfos.length,
      runtimeReachableCount: runtimeReachable.size,
      unreachableNonTestCount: unreachableFiles.length,
      dormantCapabilitiesCount: unreachableFiles.filter((u) => u.verdict === "DORMANT_CAPABILITY_KEEP_AND_WIRE").length,
      deprecatedOrShimUnreachableCount: unreachableFiles.filter((u) => u.verdict === "DEPRECATED_OR_SHIM").length,
      supersededCandidateCount: unreachableFiles.filter((u) => u.verdict === "CANDIDATE_DUPLICATE_OR_SUPERSEDED").length,
      brokenImportsCount: brokenImports.length,
      layerViolationsCount: layerViolations.length,
      astCloneClustersCount: astClones.length,
      watchlistedDuplicateHelpersCount: watchlistedDuplicates.length,
      deprecatedFilesCount: deprecatedWithCallers.length,
      monoliths800PlusCount: monoliths.length,
      totalLocNonTestSrc: nonTestInfos.reduce((acc, f) => acc + f.loc, 0),
      monolithsTop20LocSharePct: Number(
        (
          (monoliths.slice(0, 20).reduce((acc, m) => acc + m.loc, 0) /
            Math.max(1, nonTestInfos.reduce((acc, f) => acc + f.loc, 0))) *
          100
        ).toFixed(1)
      ),
      routeRedirectTrapsCount: routeRedirectTraps.length,
      quarantineFilesCount: quarantineInventory.length,
      migrationsCount,
      referenceMigrationsCount,
    },
    brokenImports,
    layerViolations,
    watchlistedDuplicates,
    astClones: astClones.slice(0, 25),
    deprecatedWithCallers,
    unreachableFiles,
    monoliths: monoliths.slice(0, 40),
    routeRedirectTraps,
    quarantineInventory,
    stackAudit: {
      tsconfigStrictFlags: {
        noUnusedLocals: tsconfigRaw?.compilerOptions?.noUnusedLocals ?? null,
        noUnusedParameters: tsconfigRaw?.compilerOptions?.noUnusedParameters ?? null,
      },
      eslintDisabledOrRelaxed: {
        noUnusedVarsOff: /"@typescript-eslint\/no-unused-vars"\s*:\s*"off"/.test(eslintRaw),
        noExplicitAnyWarn: /"@typescript-eslint\/no-explicit-any"\s*:\s*"warn"/.test(eslintRaw),
        rulesOfHooksWarn: /"react-hooks\/rules-of-hooks"\s*:\s*"warn"/.test(eslintRaw),
      },
      overlappingDependencyGroups: STACK_OVERLAP_GROUPS.map((g) => ({
        group: g.group,
        members: g.packages.map((p) => dependencyAudit.find((d) => d.name === p)).filter(Boolean),
      })),
      zeroSrcImportDependencies: dependencyAudit.filter(
        (d) => d.kind === "dependencies" && d.srcImportCount === 0
      ),
    },
  };
}

function formatMarkdownReport(report) {
  const s = report.summary;
  const zeroSrcDeps = report.stackAudit.zeroSrcImportDependencies.map((d) => `\`${d.name}\``).join(", ") || "nenhum";
  const topUnreachablePurge = report.unreachableFiles
    .filter((u) => u.verdict !== "DORMANT_CAPABILITY_KEEP_AND_WIRE")
    .slice(0, 40);
  const topDormant = report.unreachableFiles
    .filter((u) => u.verdict === "DORMANT_CAPABILITY_KEEP_AND_WIRE")
    .slice(0, 30);
  const quarantineToExtract = report.quarantineInventory
    .filter((q) => q.verdict === "EXTRACT_AND_VERIFY_BEFORE_PURGE")
    .slice(0, 40);

  const lines = [
    "# Auditoria Forense AST — Inventário Real de Duplicação, Monólitos, Legado & Stack",
    "",
    `- Gerado em: \`${report.generatedAt}\``,
    `- Total arquivos \`src/\` (não-teste): \`${s.nonTestSrcFiles}\` (\`${s.totalLocNonTestSrc.toLocaleString("en-US")}\` linhas; top 20 monólitos = \`${s.monolithsTop20LocSharePct}%\` do código)`,
    `- Reachable em runtime a partir de rotas/worker/app: \`${s.runtimeReachableCount}\` | Inalcançáveis do runtime: \`${s.unreachableNonTestCount}\``,
    `- Classificação anti-perda de inalcançáveis: \`${s.dormantCapabilitiesCount}\` dormentes úteis (**MANTER/CONECTAR**), \`${s.deprecatedOrShimUnreachableCount}\` \`@deprecated\`/shims, \`${s.supersededCandidateCount}\` duplicados/substituídos candidatos a purga`,
    `- Quebras de import/re-export: \`${s.brokenImportsCount}\` | Violações de camada: \`${s.layerViolationsCount}\` | Armadilhas de redirect em rotas: \`${s.routeRedirectTrapsCount}\``,
    `- Clusters de funções clone AST: \`${s.astCloneClustersCount}\` | Helpers watchlisted repetidos: \`${s.watchlistedDuplicateHelpersCount}\``,
    `- Quarentena (\`legacy_quarantine/\`): \`${s.quarantineFilesCount}\` arquivos | Migrations: \`${s.migrationsCount}\` (+ \`${s.referenceMigrationsCount}\` referências em \`supabase/reference-migrations/\`)`,
    "",
    "## 1. Imports / Re-exports Quebrados",
    "",
    report.brokenImports.length === 0
      ? "_Nenhum import/re-export quebrado detectado._"
      : "| Arquivo | Linha | Tipo | Specifier |\n|---|---:|---|---|\n" +
        report.brokenImports.map((b) => `| \`${b.file}\` | ${b.line} | \`${b.kind}\` | \`${b.specifier}\` |`).join("\n"),
    "",
    "## 2. Rotas Pesadas com Redirect Incondicional e Acoplamento Invertido",
    "",
    report.routeRedirectTraps.length === 0
      ? "_Nenhuma rota pesada com redirect incondicional._"
      : "| Rota | LOC | Importada por |\n|---|---:|---|\n" +
        report.routeRedirectTraps
          .map((r) => `| \`${r.relPath}\` | ${r.loc} | ${r.importedBy.map((c) => `\`${c}\``).join(", ") || "0 callers"} |`)
          .join("\n"),
    "",
    "## 3. Helpers Duplicados Confirmados (AST & Watchlist)",
    "",
    "| Helper | Ocorrências | Arquivos |",
    "|---|---:|---|",
    ...report.watchlistedDuplicates.map(
      (d) => `| \`${d.name}\` | ${d.count} | ${d.uniqueFiles.slice(0, 6).map((f) => `\`${f}\``).join(", ")}${d.uniqueFiles.length > 6 ? ` (+${d.uniqueFiles.length - 6})` : ""} |`
    ),
    "",
    "## 4. Top 20 Monólitos >= 800 LOC",
    "",
    "| # | Arquivo | LOC | Funções | Maior Função | Branches | Hooks | `any` |",
    "|---:|---|---:|---:|---:|---:|---:|---:|",
    ...report.monoliths
      .slice(0, 20)
      .map(
        (m, i) =>
          `| ${i + 1} | \`${m.relPath}\` | ${m.loc} | ${m.functionCount} | ${m.maxFunctionLoc} | ${m.branchCount} | ${m.hooksCount} | ${m.anyCount} |`
      ),
    "",
    "## 5. Arquivos `@deprecated` & Callers Reais",
    "",
    "| Arquivo | Símbolos `@deprecated` | Callers Ativos | Ação Segura |",
    "|---|---|---:|---|",
    ...report.deprecatedWithCallers
      .sort((a, b) => a.nonTestCallersCount - b.nonTestCallersCount)
      .map(
        (d) =>
          `| \`${d.relPath}\` | ${d.fileLevel ? "arquivo inteiro" : d.deprecatedSymbols.map((x) => `\`${x}\``).join(", ")} | ${d.nonTestCallersCount} | ${d.nonTestCallersCount === 0 ? "Candidato imediato à purga após cross-check" : "Migrar callers p/ canônico e remover"} |`
      ),
    "",
    "## 6. Inalcançáveis: Candidatos à Purga vs Dormentes Protegidos",
    "",
    "### 6A. Candidatos à Purga / Shims / Substituídos (Top 40)",
    "",
    "| Arquivo | LOC | Veredito | Motivo |",
    "|---|---:|---|---|",
    ...topUnreachablePurge.map((u) => `| \`${u.relPath}\` | ${u.loc} | \`${u.verdict}\` | ${u.reason} |`),
    "",
    "### 6B. Capacidades Dormentes Protegidas — NÃO Excluir sem Nativizar (Top 30)",
    "",
    "| Arquivo | LOC | ServerFns | Tabelas/RPCs Únicas |",
    "|---|---:|---:|---|",
    ...topDormant.map(
      (u) =>
        `| \`${u.relPath}\` | ${u.loc} | ${u.serverFnsCount} | ${[...u.uniqueTables, ...u.uniqueRpcs].slice(0, 5).map((t) => `\`${t}\``).join(", ") || "lógica isolada"} |`
    ),
    "",
    "## 7. `legacy_quarantine/` — Itens que Exigem Extração/Verificação Antes da Purga",
    "",
    "| Arquivo em Quarentena | LOC | Tabelas/RPCs Não Presentes em Rotas Ativas |",
    "|---|---:|---|",
    ...quarantineToExtract.map(
      (q) =>
        `| \`${q.relPath}\` | ${q.loc} | ${[...q.uniqueTables, ...q.uniqueRpcs].slice(0, 5).map((t) => `\`${t}\``).join(", ") || "componente complexo >=400 LOC"} |`
    ),
    "",
    "## 8. Stack, Higiene & Sobreposições (`package.json` / `tsconfig.json` / `eslint.config.js`)",
    "",
    `- \`tsconfig.json\`: \`noUnusedLocals=${report.stackAudit.tsconfigStrictFlags.noUnusedLocals}\`, \`noUnusedParameters=${report.stackAudit.tsconfigStrictFlags.noUnusedParameters}\``,
    `- \`eslint.config.js\`: \`no-unused-vars=off (${report.stackAudit.eslintDisabledOrRelaxed.noUnusedVarsOff})\`, \`no-explicit-any=warn (${report.stackAudit.eslintDisabledOrRelaxed.noExplicitAnyWarn})\`, \`rules-of-hooks=warn (${report.stackAudit.eslintDisabledOrRelaxed.rulesOfHooksWarn})\``,
    `- Dependências em \`package.json\` com \`0\` imports diretos em \`src/\`: ${zeroSrcDeps}`,
    "",
    "| Grupo de Stack | Pacotes & Imports em `src/` |",
    "|---|---|",
    ...report.stackAudit.overlappingDependencyGroups.map(
      (g) =>
        `| ${g.group} | ${g.members.map((m) => `\`${m.name}\` (${m.srcImportCount} arq src / ${m.scriptMatchCount} scripts)`).join(" vs ")} |`
    ),
  ];
  return lines.join("\n");
}

function main() {
  const args = process.argv.slice(2);
  const jsonIdx = args.indexOf("--json");
  const mdIdx = args.indexOf("--md");
  const strictBroken = args.includes("--strict-broken");

  const report = runForensicAudit(process.cwd());

  if (jsonIdx !== -1 && args[jsonIdx + 1]) {
    const outJson = path.resolve(process.cwd(), args[jsonIdx + 1]);
    fs.mkdirSync(path.dirname(outJson), { recursive: true });
    fs.writeFileSync(outJson, JSON.stringify(report, null, 2), "utf8");
  }

  if (mdIdx !== -1 && args[mdIdx + 1]) {
    const outMd = path.resolve(process.cwd(), args[mdIdx + 1]);
    fs.mkdirSync(path.dirname(outMd), { recursive: true });
    fs.writeFileSync(outMd, formatMarkdownReport(report), "utf8");
  }

  console.log("=== WAESY FORENSIC AST AUDIT ===");
  console.log(JSON.stringify(report.summary, null, 2));
  if (report.brokenImports.length > 0) {
    console.log("Broken imports:", report.brokenImports);
  }

  if (strictBroken && report.brokenImports.length > 0) {
    process.exit(1);
  }
}

if (process.argv[1] && toPosix(process.argv[1]).endsWith("forensic-repo-audit.mjs")) {
  main();
}
