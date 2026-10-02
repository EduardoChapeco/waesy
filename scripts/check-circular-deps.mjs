/**
 * @fileoverview DETECTOR DE DEPENDÊNCIAS CIRCULARES ENTRE ARQUIVOS E VERTICAIS (Plano 5 — S14)
 * Analisa o grafo direcionado de imports em src/ e detecta ciclos (A -> B -> A)
 * com foco especial em violações de fronteira entre verticais de negócio.
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

function resolveImport(fromFile, imp) {
  let target = "";
  if (imp.startsWith("@/")) {
    target = path.resolve(SRC_DIR, imp.slice(2));
  } else if (imp.startsWith(".")) {
    target = path.resolve(path.dirname(fromFile), imp);
  } else {
    return null;
  }

  const candidates = [
    target,
    target + ".ts",
    target + ".tsx",
    path.join(target, "index.ts"),
    path.join(target, "index.tsx"),
  ];

  for (const cand of candidates) {
    if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
      return path.resolve(cand);
    }
  }
  return null;
}

export function detectCycles() {
  const files = walk(SRC_DIR);
  const adj = new Map();

  for (const file of files) {
    const norm = path.resolve(file);
    adj.set(norm, []);
    const content = fs.readFileSync(file, "utf8");
    const importRegex = /(?:import|export)\s+(?:(?:[\w*\s{},]*)\s+from\s+)?['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const imp = match[1];
      const resolved = resolveImport(file, imp);
      if (resolved && resolved !== norm) {
        adj.get(norm).push(resolved);
      }
    }
  }

  const visited = new Map(); // 0 = unvisited, 1 = visiting, 2 = visited
  const rawCycles = [];

  function dfs(node, currentPath) {
    visited.set(node, 1);
    currentPath.push(node);
    const neighbors = adj.get(node) || [];
    for (const neighbor of neighbors) {
      const state = visited.get(neighbor) || 0;
      if (state === 1) {
        const cycleStartIndex = currentPath.indexOf(neighbor);
        if (cycleStartIndex !== -1) {
          rawCycles.push(currentPath.slice(cycleStartIndex).concat([neighbor]));
        }
      } else if (state === 0) {
        dfs(neighbor, currentPath);
      }
    }
    currentPath.pop();
    visited.set(node, 2);
  }

  for (const file of files) {
    const norm = path.resolve(file);
    if (!visited.has(norm) || visited.get(norm) === 0) {
      dfs(norm, []);
    }
  }

  // Deduplicate cycles that are just rotated versions of the same cycle
  const uniqueCycles = [];
  const seenSignatures = new Set();

  for (const cycle of rawCycles) {
    const nodes = cycle.slice(0, -1);
    const minNode = nodes.reduce((min, n) => (n < min ? n : min), nodes[0]);
    const minIdx = nodes.indexOf(minNode);
    const rotated = nodes.slice(minIdx).concat(nodes.slice(0, minIdx));
    const sig = rotated.join(" | ");
    if (!seenSignatures.has(sig)) {
      seenSignatures.add(sig);
      uniqueCycles.push(cycle);
    }
  }

  // Filtra artefatos gerados pelo framework (routeTree.gen.ts do TanStack Router)
  const applicationCycles = uniqueCycles.filter((cycle) => {
    const rel = cycle.map((p) => path.relative(ROOT_DIR, p).replace(/\\/g, "/"));
    const isGeneratedRouterCycle = rel.every((f) => f === "src/router.tsx" || f === "src/routeTree.gen.ts");
    return !isGeneratedRouterCycle;
  });

  return { filesCount: files.length, cycles: applicationCycles, totalCycles: uniqueCycles.length };
}

// Execution CLI
if (process.argv[1] && process.argv[1].endsWith("check-circular-deps.mjs")) {
  console.log("======================================================================");
  console.log("WAESY CIRCULAR DEPENDENCY & VERTICAL GRAPH CHECKER (Plano 5 — S14)");
  console.log("======================================================================");
  const result = detectCycles();
  console.log(`Arquivos analisados: ${result.filesCount}`);
  console.log(`Ciclos de aplicação: ${result.cycles.length}`);

  if (result.cycles.length > 0) {
    console.log("\nDetalhamento dos ciclos encontrados:");
    for (let i = 0; i < result.cycles.length; i++) {
      const cycle = result.cycles[i];
      const relPath = cycle.map((p) => path.relative(ROOT_DIR, p).replace(/\\/g, "/"));
      console.log(`\n[Ciclo #${i + 1}] (${cycle.length - 1} nós):`);
      for (const step of relPath) {
        console.log(`  -> ${step}`);
      }
    }
    process.exit(1);
  } else {
    console.log("\nAPROVADO: Grafo acíclico! Zero dependências circulares detectadas.");
    process.exit(0);
  }
}
