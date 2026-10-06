#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const migrationsDir = path.join(root, "supabase", "migrations");
const files = fs
  .readdirSync(migrationsDir)
  .filter((file) => /^\d+_.+\.sql$/.test(file))
  .sort();
const versions = new Map();
for (const file of files) {
  const version = file.match(/^(\d+)_/)[1];
  const existing = versions.get(version) || [];
  existing.push(file);
  versions.set(version, existing);
}

const duplicates = [...versions.entries()].filter(([, names]) => names.length > 1);
if (duplicates.length > 0) {
  console.error("[schema] Migration versions duplicadas:");
  for (const [version, names] of duplicates) console.error(`  ${version}: ${names.join(", ")}`);
  process.exit(1);
}

const sql = files.map((file) => fs.readFileSync(path.join(migrationsDir, file), "utf8")).join("\n");
const tables = new Set(
  [...sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z0-9_]+)/gi)].map(
    (match) => match[1].toLowerCase(),
  ),
);
const functions = new Set(
  [...sql.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?([a-zA-Z0-9_]+)/gi)].map(
    (match) => match[1].toLowerCase(),
  ),
);
const dbTypes = fs.readFileSync(
  path.join(root, "src", "integrations", "supabase", "types.ts"),
  "utf8",
);
const hasAnyDatabase = /type\s+Database\s*=\s*any\b/.test(dbTypes);

console.log(`[schema] migrations=${files.length}`);
console.log(`[schema] tables_declared=${tables.size}`);
console.log(`[schema] functions_declared=${functions.size}`);
if (hasAnyDatabase) {
  console.warn(
    "[schema] warning: src/integrations/supabase/types.ts ainda declara Database = any; gerar tipos Supabase permanece requisito da Onda 1.",
  );
}
console.log("[schema] migration version uniqueness: OK");
