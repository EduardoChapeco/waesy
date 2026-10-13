#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const migrationsDir = path.join(root, "supabase", "migrations");
const files = fs
  .readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

const invalidNames = files.filter((file) => !/^\d+_.+\.sql$/.test(file));
const versions = new Map();
const emptyFiles = [];
const fileHashes = [];

for (const file of files) {
  const match = file.match(/^(\d+)_/);
  if (!match) continue;

  const version = match[1];
  const names = versions.get(version) || [];
  names.push(file);
  versions.set(version, names);

  const content = fs.readFileSync(path.join(migrationsDir, file));
  if (content.length === 0) emptyFiles.push(file);
  fileHashes.push(`${file} ${crypto.createHash("sha256").update(content).digest("hex")}`);
}

const duplicates = [...versions.entries()]
  .filter(([, names]) => names.length > 1)
  .map(([version, names]) => ({ version, names }));

const manifest = {
  schemaVersion: "1.0.0",
  migrationCount: files.length,
  firstMigration: files[0] || null,
  lastMigration: files.at(-1) || null,
  invalidNames,
  emptyFiles,
  duplicateVersions: duplicates,
  fileHashesSha256: crypto
    .createHash("sha256")
    .update(fileHashes.join("\n"))
    .digest("hex"),
};

console.log(JSON.stringify(manifest, null, 2));

if (invalidNames.length || emptyFiles.length || duplicates.length) {
  console.error("MIGRATION_INVENTORY_FAIL");
  process.exit(1);
}

console.log(`MIGRATION_INVENTORY_PASS: ${files.length} SQL migrations, unique non-empty versions`);
