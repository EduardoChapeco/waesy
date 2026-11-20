#!/usr/bin/env node
/**
 * audit-federation-joins.mjs — Detecta embeds PostgREST (select("a, outra_tabela(...)")) que cruzam nós.
 *
 * Um embed só funciona quando as duas tabelas estão no MESMO projeto. Se `.from(A)` vai para um nó e o
 * select embute B que vive em outro nó, a consulta quebra (relação inexistente). Este script lista esses casos.
 *
 * Uso: node scripts/ops/audit-federation-joins.mjs [--mining]   (--mining inclui MINING_BULK_TABLES_LIST)
 * Saída: tabela de achados; exit code 1 se houver cruzamentos.
 */
import fs from "node:fs";
import path from "node:path";

const src = fs.readFileSync("src/lib/supabase-federation.ts", "utf8");
function list(name) {
  const m = src.match(new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\] as const;`));
  return m ? [...m[1].matchAll(/"([a-z0-9_]+)"/g)].map((x) => x[1]) : [];
}
const includeMining = process.argv.includes("--mining");
const routed = new Set([...list("OFFLOAD_TABLES_LIST"), ...(includeMining ? list("MINING_BULK_TABLES_LIST") : [])]);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name)) out.push(p);
  }
  return out;
}

const findings = [];
for (const file of walk("src")) {
  const text = fs.readFileSync(file, "utf8");
  for (const m of text.matchAll(/\.from\(\s*["'`]([a-z0-9_]+)["'`]\s*\)/g)) {
    const from = m[1];
    const window = text.slice(m.index, m.index + 900);
    const sel = window.match(/\.select\(\s*(["'`])([\s\S]*?)\1/);
    if (!sel) continue;
    const body = sel[2];
    for (const e of body.matchAll(/\b([a-z0-9_]+)\s*(?:!\w+)?\s*\(/g)) {
      const embedded = e[1];
      if (embedded === from || /^(count|coalesce|sum|avg|min|max)$/.test(embedded)) continue;
      const crosses = routed.has(from) !== routed.has(embedded) && (routed.has(from) || routed.has(embedded));
      if (crosses) {
        const line = text.slice(0, m.index).split("\n").length;
        findings.push({ arquivo: `${file.replace(/\\/g, "/")}:${line}`, from, embed: embedded });
      }
    }
  }
}

if (findings.length) {
  console.table(findings);
  console.error(`\n${findings.length} embed(s) cruzando nós. Resolver (duas consultas no servidor) antes de rotear.`);
  process.exit(1);
}
console.log(`OK: nenhum embed cruza nós (${routed.size} tabelas roteadas${includeMining ? ", incluindo mineração" : ""}).`);
