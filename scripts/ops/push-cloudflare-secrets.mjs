#!/usr/bin/env node
/**
 * push-cloudflare-secrets.mjs — Publica no Cloudflare Pages (production) os secrets da topologia Supabase.
 * Lê .env.secrets (gitignored). Usa `wrangler pages secret bulk` com arquivo temporário apagado ao final.
 *
 * Uso: node scripts/ops/push-cloudflare-secrets.mjs [--project=usewaesy] [--dry]
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const project = (process.argv.find((a) => a.startsWith("--project=")) ?? "--project=usewaesy").split("=")[1];
const dry = process.argv.includes("--dry");

const env = new Map();
for (const line of fs.readFileSync(".env.secrets", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m) env.set(m[1], m[2].trim().replace(/^["']|["']$/g, ""));
}
const get = (k) => env.get(k) ?? "";
const enc = encodeURIComponent;

const primaryUrl = get("SUPABASE_PRIMARY_URL");
const pass = get("SUPABASE_PRIMARY_DB_PASSWORD");
const ref = get("SUPABASE_PRIMARY_REF");

const payload = {
  VITE_SUPABASE_URL: primaryUrl,
  SUPABASE_URL: primaryUrl,
  VITE_SUPABASE_ANON_KEY: get("SUPABASE_PRIMARY_ANON_KEY"),
  VITE_SUPABASE_PUBLISHABLE_KEY: get("SUPABASE_PRIMARY_ANON_KEY"),
  SUPABASE_ANON_KEY: get("SUPABASE_PRIMARY_ANON_KEY"),
  SUPABASE_SERVICE_ROLE_KEY: get("SUPABASE_PRIMARY_SERVICE_ROLE_KEY"),
  SUPABASE_PROJECT_REF: ref,
  PROJECT_REF: ref,
  SUPABASE_ACCESS_TOKEN: get("SUPABASE_PRIMARY_ACCESS_TOKEN"),
  SUPABASE_DB_PASSWORD: pass,
  DB_PASSWORD: pass,
  SUPABASE_DB_URL: `postgresql://postgres:${enc(pass)}@db.${ref}.supabase.co:5432/postgres`,
  DATABASE_URL: `postgresql://postgres:${enc(pass)}@db.${ref}.supabase.co:5432/postgres`,
  SUPABASE_OFFLOAD_URL: get("SUPABASE_OFFLOAD_URL"),
  SUPABASE_OFFLOAD_SERVICE_ROLE_KEY: get("SUPABASE_OFFLOAD_SERVICE_ROLE_KEY"),
  SUPABASE_TOPOLOGY_MODE: "auto",
  SUPABASE_ROUTE_MINING: "0",
};
// ARCHIVE só entra quando explicitamente habilitado (nó saudável): SUPABASE_ARCHIVE_ENABLED=1 em .env.secrets.
if (get("SUPABASE_ARCHIVE_ENABLED") === "1") {
  payload.SUPABASE_ARCHIVE_URL = get("SUPABASE_ARCHIVE_URL");
  payload.SUPABASE_ARCHIVE_SERVICE_ROLE_KEY = get("SUPABASE_ARCHIVE_SERVICE_ROLE_KEY");
}

const missing = Object.entries(payload).filter(([, v]) => !v).map(([k]) => k);
console.table(Object.keys(payload).map((k) => ({ secret: k, definido: Boolean(payload[k]) })));
if (missing.length) {
  console.error(`Abortado: valores ausentes -> ${missing.join(", ")}`);
  process.exit(1);
}
if (dry) process.exit(0);

const tmp = path.join(os.tmpdir(), `cf-secrets-${Date.now()}.json`);
fs.writeFileSync(tmp, JSON.stringify(payload), { mode: 0o600 });
try {
  const r = spawnSync("cmd", ["/c", "npx", "wrangler", "pages", "secret", "bulk", tmp, "--project-name", project], {
    stdio: "inherit",
  });
  process.exitCode = r.status ?? 1;
} finally {
  fs.rmSync(tmp, { force: true });
}
