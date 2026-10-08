#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { glob } from "glob";

const migrationFiles = await glob("supabase/migrations/**/*.sql", { nodir: true });
const serviceFiles = await glob("src/services/**/*.functions.ts", { nodir: true });

const relationPattern = /create\s+(?:or\s+replace\s+)?(?:table|view)\s+(?:if\s+not\s+exists\s+)?(?:public\.)?["`]?([a-zA-Z_][a-zA-Z0-9_]*)["`]?/gi;
// `supabase.storage.from(...)` aponta para bucket, não para uma relação SQL.
const bffTablePattern = /\.from\(\s*["']([a-zA-Z_][a-zA-Z0-9_]*)["']\s*\)/g;

const declaredTables = new Set();
for (const file of migrationFiles) {
  const content = await readFile(file, "utf8");
  for (const match of content.matchAll(relationPattern)) declaredTables.add(match[1]);
}

const references = new Map();
for (const file of serviceFiles) {
  const content = await readFile(file, "utf8");
  for (const match of content.matchAll(bffTablePattern)) {
    const prefix = content.slice(Math.max(0, match.index - 48), match.index);
    if (/storage\s*$/.test(prefix)) continue;
    if (/schema\(\s*["']auth["']\s*\)\s*$/.test(prefix)) continue;
    const table = match[1];
    if (!references.has(table)) references.set(table, []);
    references.get(table).push(file);
  }
}

const ignoredNonTables = new Set();
const missing = [...references.keys()]
  .filter((table) => !declaredTables.has(table) && !ignoredNonTables.has(table))
  .sort();

console.log("WAESY BFF TABLE CONTRACT CHECK");
console.log(`Migrations analisadas: ${migrationFiles.length}`);
console.log(`Tabelas declaradas: ${declaredTables.size}`);
console.log(`Tabelas referenciadas por BFF: ${references.size}`);
console.log(`Tabelas sem declaração local: ${missing.length}`);

if (missing.length > 0) {
  for (const table of missing) {
    const files = [...new Set(references.get(table))].slice(0, 5);
    console.error(`MISSING_TABLE ${table} <- ${files.join(", ")}`);
  }
  console.error("Falha: cada tabela usada pelo BFF deve existir nas migrations locais ou ser explicitamente adicionada à allowlist com justificativa.");
  process.exitCode = 1;
} else {
  console.log("APROVADO: todas as tabelas referenciadas pelo BFF têm declaração local.");
}
