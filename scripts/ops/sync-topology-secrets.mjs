#!/usr/bin/env node
/**
 * sync-topology-secrets.mjs — Registra a topologia de 3 projetos Supabase em .env.secrets (gitignored).
 *
 * Papéis:
 *   PRIMARY  (wlxapubsesiwtxzbuygt)  -> Auth, dados transacionais, storage. Alimenta VITE_SUPABASE_* / SUPABASE_*.
 *   OFFLOAD  (vnmqummmgvgyazglnoav)  -> Ingestão pesada: logs, telemetria, filas, mineração.
 *   ARCHIVE  (jfuebqmltksyznovhlwa)  -> Apoio/arquivo (antigo principal). Opcional; fora do caminho crítico.
 *
 * Uso (tokens somente via ambiente, nunca em arquivo versionado):
 *   $env:TOK_PRIMARY=...; $env:TOK_OFFLOAD=...; $env:TOK_ARCHIVE=...; $env:DB_PASSWORD=...
 *   node scripts/ops/sync-topology-secrets.mjs [--set-primary-runtime]
 */
import fs from "node:fs";

const SECRETS_PATH = ".env.secrets";
const NODES = [
  { role: "PRIMARY", ref: "wlxapubsesiwtxzbuygt", token: process.env.TOK_PRIMARY },
  { role: "OFFLOAD", ref: "vnmqummmgvgyazglnoav", token: process.env.TOK_OFFLOAD },
  { role: "ARCHIVE", ref: "jfuebqmltksyznovhlwa", token: process.env.TOK_ARCHIVE },
];
const DB_PASSWORD = process.env.DB_PASSWORD;
const setPrimaryRuntime = process.argv.includes("--set-primary-runtime");

function parse(text) {
  const map = new Map();
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m) map.set(m[1], m[2]);
  }
  return map;
}

function upsert(text, key, value) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  return re.test(text) ? text.replace(re, line) : `${text.replace(/\s*$/, "\n")}${line}\n`;
}

async function fetchKeys(node) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${node.ref}/api-keys?reveal=true`, {
    headers: { Authorization: `Bearer ${node.token}` },
  });
  if (!r.ok) throw new Error(`${node.role}: api-keys HTTP ${r.status}`);
  const keys = await r.json();
  const pick = (name) => keys.find((k) => k.name === name && k.type === "legacy")?.api_key;
  return { anon: pick("anon"), service: pick("service_role") };
}

let text = fs.existsSync(SECRETS_PATH) ? fs.readFileSync(SECRETS_PATH, "utf8") : "";
const report = [];

for (const node of NODES) {
  if (!node.token) {
    report.push({ role: node.role, ref: node.ref, status: "SKIP (sem token)" });
    continue;
  }
  const url = `https://${node.ref}.supabase.co`;
  text = upsert(text, `SUPABASE_${node.role}_REF`, node.ref);
  text = upsert(text, `SUPABASE_${node.role}_URL`, url);
  text = upsert(text, `SUPABASE_${node.role}_ACCESS_TOKEN`, node.token);
  if (DB_PASSWORD) text = upsert(text, `SUPABASE_${node.role}_DB_PASSWORD`, JSON.stringify(DB_PASSWORD));
  try {
    const { anon, service } = await fetchKeys(node);
    if (anon) text = upsert(text, `SUPABASE_${node.role}_ANON_KEY`, anon);
    if (service) text = upsert(text, `SUPABASE_${node.role}_SERVICE_ROLE_KEY`, service);
    report.push({ role: node.role, ref: node.ref, status: `OK anon=${Boolean(anon)} service=${Boolean(service)}` });
  } catch (e) {
    report.push({ role: node.role, ref: node.ref, status: `ERRO ${e.message}` });
  }
}

if (setPrimaryRuntime) {
  const m = parse(text);
  const need = ["SUPABASE_PRIMARY_URL", "SUPABASE_PRIMARY_ANON_KEY", "SUPABASE_PRIMARY_SERVICE_ROLE_KEY"];
  if (need.every((k) => m.get(k))) {
    // Backup do runtime anterior (ainda aponta para o projeto legado) antes de trocar.
    text = upsert(text, "LEGACY_VITE_SUPABASE_URL", m.get("VITE_SUPABASE_URL") ?? "");
    text = upsert(text, "VITE_SUPABASE_URL", m.get("SUPABASE_PRIMARY_URL"));
    text = upsert(text, "SUPABASE_URL", m.get("SUPABASE_PRIMARY_URL"));
    text = upsert(text, "VITE_SUPABASE_ANON_KEY", m.get("SUPABASE_PRIMARY_ANON_KEY"));
    text = upsert(text, "SUPABASE_ANON_KEY", m.get("SUPABASE_PRIMARY_ANON_KEY"));
    text = upsert(text, "SUPABASE_SERVICE_ROLE_KEY", m.get("SUPABASE_PRIMARY_SERVICE_ROLE_KEY"));
    text = upsert(text, "PROJECT_REF", m.get("SUPABASE_PRIMARY_REF"));
    text = upsert(text, "SUPABASE_PROJECT_REF", m.get("SUPABASE_PRIMARY_REF"));
    text = upsert(text, "SUPABASE_ACCESS_TOKEN", m.get("SUPABASE_PRIMARY_ACCESS_TOKEN"));
    if (DB_PASSWORD) text = upsert(text, "SUPABASE_DB_PASSWORD", JSON.stringify(DB_PASSWORD));

    // Sincroniza .env, .env.local e .env.production com a URL/chaves públicas do novo PRIMARY
    const envSyncMap = {
      VITE_SUPABASE_URL: m.get("SUPABASE_PRIMARY_URL"),
      VITE_SUPABASE_ANON_KEY: m.get("SUPABASE_PRIMARY_ANON_KEY"),
      SUPABASE_SERVICE_ROLE_KEY: m.get("SUPABASE_PRIMARY_SERVICE_ROLE_KEY"),
      SUPABASE_ACCESS_TOKEN: m.get("SUPABASE_PRIMARY_ACCESS_TOKEN"),
      PROJECT_REF: m.get("SUPABASE_PRIMARY_REF"),
      DB_PASSWORD: (m.get("SUPABASE_PRIMARY_DB_PASSWORD") ?? "").replace(/^["']|["']$/g, ""),
    };
    for (const file of [".env", ".env.local", ".env.production"]) {
      if (!fs.existsSync(file)) continue;
      let envTxt = fs.readFileSync(file, "utf8");
      for (const [k, v] of Object.entries(envSyncMap)) {
        if (!v) continue;
        const re = new RegExp(`^${k}=.*$`, "m");
        if (re.test(envTxt)) {
          envTxt = envTxt.replace(re, `${k}=${file === ".env.local" ? JSON.stringify(v) : v}`);
        }
      }
      fs.writeFileSync(file, envTxt);
    }

    report.push({ role: "RUNTIME", ref: "-", status: "VITE_*/SUPABASE_* e .env* agora apontam para PRIMARY" });
  } else {
    report.push({ role: "RUNTIME", ref: "-", status: "ABORTADO: chaves PRIMARY incompletas" });
  }
}

fs.writeFileSync(SECRETS_PATH, text);
console.table(report);
