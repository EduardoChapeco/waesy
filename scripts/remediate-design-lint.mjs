import fs from "node:fs";
import path from "node:path";
import { lintSource } from "./design-lint.mjs";

const ROOT_DIR = process.cwd();
const SRC_DIR = path.resolve(ROOT_DIR, "src");

export function remediateSource(content, filePath) {
  let modified = content;

  // 1. DL-09: Normalização de raios para a escala canônica de 4 raios (none, sm, md, lg, full)
  modified = modified.replace(/\brounded-(?:xl|2xl|3xl)\b/g, "rounded-lg");
  modified = modified.replace(/\brounded-t-(?:xl|2xl|3xl)\b/g, "rounded-t-lg");
  modified = modified.replace(/\brounded-b-(?:xl|2xl|3xl)\b/g, "rounded-b-lg");
  modified = modified.replace(/\brounded-l-(?:xl|2xl|3xl)\b/g, "rounded-l-lg");
  modified = modified.replace(/\brounded-r-(?:xl|2xl|3xl)\b/g, "rounded-r-lg");

  // 2. DL-03: Normalização de espaçamentos fracionários fora da grade de 4px
  const spacingPrefixes = [
    "p", "px", "py", "pt", "pb", "pl", "pr",
    "m", "mx", "my", "mt", "mb", "ml", "mr",
    "gap", "gap-x", "gap-y", "space-x", "space-y"
  ];
  for (const prefix of spacingPrefixes) {
    const r05 = new RegExp(`\\b${prefix}-0\\.5\\b`, "g");
    const r15 = new RegExp(`\\b${prefix}-1\\.5\\b`, "g");
    const r25 = new RegExp(`\\b${prefix}-2\\.5\\b`, "g");
    const r35 = new RegExp(`\\b${prefix}-3\\.5\\b`, "g");
    modified = modified.replace(r05, `${prefix}-1`);
    modified = modified.replace(r15, `${prefix}-2`);
    modified = modified.replace(r25, `${prefix}-3`);
    modified = modified.replace(r35, `${prefix}-4`);
  }

  // 3. DL-02: Normalização de valores arbitrários entre colchetes em className
  const bracketReplacements = [
    [/\bw-\[100%\]/g, "w-full"],
    [/\bh-\[100%\]/g, "h-full"],
    [/\bw-\[320px\]/g, "w-80"],
    [/\bw-\[280px\]/g, "w-72"],
    [/\bw-\[256px\]/g, "w-64"],
    [/\bw-\[240px\]/g, "w-60"],
    [/\bw-\[200px\]/g, "w-52"],
    [/\bw-\[160px\]/g, "w-40"],
    [/\bh-\[44px\]/g, "h-11"],
    [/\bh-\[48px\]/g, "h-12"],
    [/\bh-\[40px\]/g, "h-10"],
    [/\bh-\[36px\]/g, "h-9"],
    [/\bh-\[32px\]/g, "h-8"],
    [/\bmin-h-\[44px\]/g, "min-h-11"],
    [/\bmax-w-\[1200px\]/g, "max-w-6xl"],
    [/\bmax-w-\[1000px\]/g, "max-w-5xl"],
    [/\bmax-w-\[800px\]/g, "max-w-4xl"],
    [/\bmax-w-\[600px\]/g, "max-w-xl"],
    [/\bmax-w-\[500px\]/g, "max-w-lg"],
    [/\bmax-w-\[400px\]/g, "max-w-md"],
    [/\btext-\[12px\]/g, "text-xs"],
    [/\btext-\[14px\]/g, "text-sm"],
    [/\btext-\[16px\]/g, "text-base"],
    [/\btext-\[18px\]/g, "text-lg"],
    [/\btext-\[20px\]/g, "text-xl"],
    [/\btext-\[24px\]/g, "text-2xl"],
    [/\bp-\[16px\]/g, "p-4"],
    [/\bp-\[24px\]/g, "p-6"],
    [/\bp-\[8px\]/g, "p-2"],
    [/\bp-\[12px\]/g, "p-3"],
    [/\bp-\[20px\]/g, "p-5"],
    [/\bm-\[16px\]/g, "m-4"],
    [/\bgap-\[16px\]/g, "gap-4"],
    [/\bgap-\[8px\]/g, "gap-2"],
    [/\bgap-\[12px\]/g, "gap-3"],
    [/\brounded-\[8px\]/g, "rounded-md"],
    [/\brounded-\[12px\]/g, "rounded-lg"],
    [/\brounded-\[16px\]/g, "rounded-lg"],
    [/\brounded-\[20px\]/g, "rounded-lg"],
    [/\brounded-\[24px\]/g, "rounded-lg"],
  ];
  for (const [pattern, replacement] of bracketReplacements) {
    modified = modified.replace(pattern, replacement);
  }

  // 4. DL-04: Remoção de ! em className
  modified = modified.replace(/(className\s*=\s*["'`][^"'`]*?)(?:^|[\s])!([a-zA-Z0-9_-]+)/g, "$1 $2");

  // 5. DL-15: Adiciona focus-visible a <button ... que não tenha focus-visible
  const lines = modified.split("\n");
  const newLines = lines.map((line) => {
    if (line.includes("<button") && !line.includes("focus-visible:") && !line.includes("<Button") && line.includes("className=")) {
      return line.replace(
        /(className\s*=\s*["'])([^"']*)/,
        "$1focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring $2"
      );
    }
    return line;
  });
  modified = newLines.join("\n");

  return modified;
}

function getAllSourceFiles(dir) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".git", "dist", "legacy_quarantine"].includes(entry.name)) continue;
      files = files.concat(getAllSourceFiles(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts"))) {
      files.push(fullPath);
    }
  }
  return files;
}

if (process.argv[1] && process.argv[1].endsWith("remediate-design-lint.mjs")) {
  const isAll = process.argv.includes("--all");
  let targetFiles = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));

  if (isAll) {
    targetFiles = getAllSourceFiles(SRC_DIR);
    console.log(`Iniciando remediacao em massa de ${targetFiles.length} arquivos...`);
  }

  let totalFixed = 0;
  let filesChangedCount = 0;

  for (const file of targetFiles) {
    if (!fs.existsSync(file)) continue;
    try {
      const content = fs.readFileSync(file, "utf8");
      const beforeViolations = lintSource(content, file).length;
      if (beforeViolations === 0) continue;

      const remediated = remediateSource(content, file);
      const afterViolations = lintSource(remediated, file).length;

      if (afterViolations < beforeViolations) {
        fs.writeFileSync(file, remediated, "utf8");
        const diff = beforeViolations - afterViolations;
        totalFixed += diff;
        filesChangedCount++;
        if (!isAll || diff > 20) {
          console.log(`Corrigido [${path.relative(ROOT_DIR, file).replace(/\\/g, "/")}]: ${beforeViolations} -> ${afterViolations} (-${diff})`);
        }
      }
    } catch (err) {
      // Ignora erro em arquivo individual
    }
  }

  console.log("======================================================================");
  console.log(`REMEDIACAO CONCLUIDA:`);
  console.log(`Arquivos otimizados:           ${filesChangedCount}`);
  console.log(`Total de violacoes eliminadas: ${totalFixed}`);
  console.log("======================================================================");
}
