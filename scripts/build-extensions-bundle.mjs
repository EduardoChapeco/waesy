#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(process.cwd());
const OUT_FILE = join(ROOT, "src", "generated", "extensions-bundle.server.ts");

const EXCLUDED_NAMES = new Set([
  "node_modules",
  ".git",
  ".chrome-session",
  "output",
  "dist",
  ".DS_Store",
  "Thumbs.db",
]);

function collectEntries(baseDir, currentDir = "") {
  const dirPath = join(baseDir, currentDir);
  if (!existsSync(dirPath)) return [];

  const items = readdirSync(dirPath).sort((a, b) => a.localeCompare(b));
  const entries = [];

  for (const item of items) {
    if (EXCLUDED_NAMES.has(item) || item.endsWith(".log") || item.endsWith(".tmp")) {
      continue;
    }

    const fullPath = join(dirPath, item);
    const relativePath = currentDir ? `${currentDir}/${item}` : item;
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      entries.push(...collectEntries(baseDir, relativePath));
    } else if (stat.isFile()) {
      const content = readFileSync(fullPath);
      const isExecutable = item.endsWith(".bat") || item.endsWith(".sh") || item.endsWith(".mjs");
      entries.push({
        path: relativePath,
        base64: content.toString("base64"),
        isExecutable,
      });
    }
  }

  return entries;
}

const bundles = {
  infotravel_extension: collectEntries(join(ROOT, "tools", "infotravel-extension")),
  whatsapp_extension: collectEntries(join(ROOT, "tools", "whatsapp-extension")),
  infotravel_miner: collectEntries(join(ROOT, "tools", "infotravel-miner")),
};

mkdirSync(join(ROOT, "src", "generated"), { recursive: true });

const banner = `// ARQUIVO GERADO AUTOMATICAMENTE POR scripts/build-extensions-bundle.mjs — NÃO EDITAR MANUALMENTE
export type BundledExtensionPackageType =
  | "infotravel_extension"
  | "whatsapp_extension"
  | "infotravel_miner";

export interface EmbeddedExtensionFileEntry {
  path: string;
  base64: string;
  isExecutable: boolean;
}

export const EMBEDDED_EXTENSION_BUNDLES: Record<
  BundledExtensionPackageType,
  EmbeddedExtensionFileEntry[]
> = ${JSON.stringify(bundles, null, 2)};
`;

writeFileSync(OUT_FILE, banner, "utf-8");

const counts = Object.entries(bundles)
  .map(([k, v]) => `${k}=${v.length}`)
  .join(", ");
console.log(`[build-extensions-bundle] Gerado ${OUT_FILE} (${counts})`);
