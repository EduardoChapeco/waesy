import fs from "node:fs";
import path from "node:path";

const legacyServiceFiles = [
  "boarding",
  "crm",
  "infotravel",
  "proposal-storage",
  "proposals",
  "quotes",
  "reaccommodation",
  "rooming",
  "trips",
  "vouchers",
];

function extractDeclaredExports(content) {
  const names = [
    ...content.matchAll(/export\s+(?:async\s+)?(?:const|type|function|interface|class|enum)\s+([a-zA-Z0-9_]+)/g),
  ].map((m) => m[1]);

  for (const braceMatch of content.matchAll(/export\s+(?:type\s+)?\{([^}]+)\}/g)) {
    for (const part of braceMatch[1].split(",")) {
      const cleaned = part.trim().replace(/^type\s+/, "");
      if (!cleaned) continue;
      const alias = cleaned.includes(" as ") ? cleaned.split(" as ").pop().trim() : cleaned;
      if (alias) names.push(alias);
    }
  }
  return names;
}

// 1. Coletar todos os nomes exportados de cada arquivo de serviço legado
const exportsByFile = {};
for (const f of legacyServiceFiles) {
  const filePath = path.join("src", "services", `${f}.ts`);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, "utf8");
    const namedExports = extractDeclaredExports(content);

    // Seguir re-exportações: export * from './foo'
    const reexports = [...content.matchAll(/export\s+\*\s+from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
    for (const re of reexports) {
      let targetPath = path.join("src", "services", re.endsWith(".ts") ? re : `${re}.ts`);
      if (fs.existsSync(targetPath)) {
        const reContent = fs.readFileSync(targetPath, "utf8");
        namedExports.push(...extractDeclaredExports(reContent));
      }
    }
    exportsByFile[f] = new Set(namedExports);
  }
}

// 2. Varrer todo o src para verificar imports de arquivos legados
function scanDir(dir) {
  let issues = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, item.name);
    if (item.isDirectory()) {
      issues = issues.concat(scanDir(p));
    } else if (item.name.endsWith(".ts") || item.name.endsWith(".tsx")) {
      const content = fs.readFileSync(p, "utf8");
      for (const f of legacyServiceFiles) {
        const regex = new RegExp(
          `import\\s*\\{([^}]+)\\}\\s*from\\s*['"](?:@/services/|\\./|\\.\\./services/)${f}['"]`,
          "g"
        );
        let m;
        while ((m = regex.exec(content)) !== null) {
          const importedNames = m[1]
            .split(",")
            .map((s) => s.trim().replace(/^type\s+/, "").split(" as ")[0].trim())
            .filter(Boolean);
          const available = exportsByFile[f] || new Set();
          for (const name of importedNames) {
            if (!available.has(name)) {
              issues.push({
                file: p.replace(/\\/g, "/"),
                legacyFile: f,
                missingExport: name,
              });
            }
          }
        }
      }
    }
  }
  return issues;
}

const missing = scanDir("src");
console.log(`\nAuditing Legacy Imports across src/: Found ${missing.length} dead or missing imports:`);
missing.forEach((it, idx) => {
  console.log(`${idx + 1}. [${it.file}] -> imports '${it.missingExport}' from '@/services/${it.legacyFile}' (NOT EXPORTED!)`);
});
