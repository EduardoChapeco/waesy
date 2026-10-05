#!/usr/bin/env node
/**
 * check-client-server-leak.mjs — Gate de hidratação (DEC-165)
 *
 * Percorre o grafo de imports ESTÁTICOS a partir do(s) entry(s) do cliente em
 * dist/assets e falha se algum chunk carregado no boot contém o runtime de
 * servidor (h3 / AsyncLocalStorage do TanStack Start). Esse vazamento faz o
 * browser lançar "AsyncLocalStorage is not a constructor" antes da hidratação,
 * deixando TODA a interface estática (nenhum botão responde) enquanto
 * typecheck e build passam normalmente.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ASSETS = join(process.cwd(), "dist", "assets");
const FORBIDDEN = [
  { re: /tanstack-start:event-storage/, why: "TanStack Start server event storage (h3)" },
  { re: /new\s+[\w$.]*AsyncLocalStorage\b/, why: "AsyncLocalStorage instanciado no cliente" },
  { re: /h3\.internal\.event\./, why: "runtime h3 no cliente" },
];

if (!existsSync(ASSETS)) {
  console.error("[client-leak] dist/assets não encontrado. Rode o build antes.");
  process.exit(1);
}

const files = new Set(readdirSync(ASSETS).filter((f) => f.endsWith(".js")));
const entries = [...files].filter((f) => /^index-[\w-]+\.js$/.test(f));
if (entries.length === 0) {
  console.error("[client-leak] Entry do cliente (index-*.js) não encontrado.");
  process.exit(1);
}

const STATIC_IMPORT = /(?:^|[;\n}])\s*(?:import|export)\s*(?:[\w$*{}\s,]+from\s*)?["']\.\/([^"']+\.js)["']/g;
const seen = new Map(); // file -> parent
const queue = entries.map((e) => [e, null]);
while (queue.length) {
  const [file, parent] = queue.shift();
  if (seen.has(file) || !files.has(file)) continue;
  seen.set(file, parent);
  const src = readFileSync(join(ASSETS, file), "utf8");
  for (const m of src.matchAll(STATIC_IMPORT)) queue.push([m[1], file]);
}

const violations = [];
for (const file of seen.keys()) {
  const src = readFileSync(join(ASSETS, file), "utf8");
  for (const { re, why } of FORBIDDEN) {
    if (re.test(src)) {
      const chain = [];
      for (let f = file; f; f = seen.get(f)) chain.unshift(f);
      violations.push(`${why}\n    cadeia: ${chain.join(" -> ")}`);
      break;
    }
  }
}

if (violations.length) {
  console.error(`\n[client-leak] FALHA: ${violations.length} chunk(s) de boot com runtime de servidor:\n`);
  for (const v of violations) console.error("  - " + v);
  console.error("\nCorrija isolando o acesso a request em createIsomorphicFn/createServerOnlyFn ou mova para *.server.ts.\n");
  process.exit(1);
}
console.log(`[client-leak] OK — ${seen.size} chunks de boot verificados, nenhum runtime de servidor.`);
