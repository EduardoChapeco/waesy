#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const allowDirty = process.argv.includes("--allow-dirty");
const checkDb = process.argv.includes("--check-db");
const skipBundle = process.argv.includes("--skip-bundle");

const status = execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], {
  encoding: "utf8",
}).trim();

if (status && !allowDirty) {
  console.error("[release] worktree suja; commit ou remova alterações antes de publicar:");
  console.error(status);
  process.exit(1);
}

if (status) {
  console.warn("[release] aviso: executando gate local com alterações não commitadas (--allow-dirty).");
} else {
  console.log("[release] worktree limpa; candidato reprodutível.");
}

const branch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
const sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
console.log(`[release] branch=${branch || "(detached)"} sha=${sha}`);

// Fase 7 (EARS-RES-03): Validação de orçamento de bundle Cloudflare Pages Worker & Client Assets
const WORKER_MAX_UNCOMPRESSED_MB = 24.5;
const WORKER_MAX_GZIPPED_MB = 9.5;
const workerPath = path.join(process.cwd(), "dist/_worker.js/index.js");

if (!skipBundle && fs.existsSync(workerPath)) {
  const buf = fs.readFileSync(workerPath);
  const gz = zlib.gzipSync(buf);
  const rawMb = buf.length / (1024 * 1024);
  const gzMb = gz.length / (1024 * 1024);
  console.log(
    `[release:bundle] dist/_worker.js/index.js raw=${rawMb.toFixed(2)} MB (teto ${WORKER_MAX_UNCOMPRESSED_MB} MB) | gzip=${gzMb.toFixed(2)} MB (teto ${WORKER_MAX_GZIPPED_MB} MB)`,
  );
  if (rawMb > WORKER_MAX_UNCOMPRESSED_MB || gzMb > WORKER_MAX_GZIPPED_MB) {
    console.error("[release:bundle] BLOQUEADO: Worker bundle excedeu o orçamento de segurança Cloudflare Pages.");
    process.exit(1);
  }

  const assetsDir = path.join(process.cwd(), "dist/assets");
  if (fs.existsSync(assetsDir)) {
    const jsAssets = fs
      .readdirSync(assetsDir)
      .filter((f) => f.endsWith(".js"))
      .map((f) => ({ name: f, kb: fs.statSync(path.join(assetsDir, f)).size / 1024 }))
      .sort((a, b) => b.kb - a.kb);
    const top3 = jsAssets.slice(0, 3).map((a) => `${a.name} (${a.kb.toFixed(0)} KB)`).join(", ");
    console.log(`[release:assets] Top 3 JS chunks: ${top3}`);
  }
}

// Fase 7 (EARS-RES-02): Alerta de disco e crescimento de tabelas no Supabase via Management API (--check-db)
if (checkDb) {
  const secretsPath = path.join(process.cwd(), ".env.secrets");
  const secrets = {};
  if (fs.existsSync(secretsPath)) {
    for (const line of fs.readFileSync(secretsPath, "utf8").split(/\r?\n/)) {
      const m = line.trim().match(/^([^=]+)=(.*)$/);
      if (m) secrets[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, "");
    }
  }
  const ref = secrets.SUPABASE_PROJECT_REF || "jfuebqmltksyznovhlwa";
  const token = secrets.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_ACCESS_TOKEN;
  if (token) {
    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/disk/util`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      const availMb = (data?.metrics?.fs_avail_bytes || 0) / (1024 * 1024);
      const usedMb = (data?.metrics?.fs_used_bytes || 0) / (1024 * 1024);
      const sizeMb = (data?.metrics?.fs_size_bytes || 0) / (1024 * 1024);
      console.log(
        `[release:db] Supabase ${ref} /data: ${usedMb.toFixed(2)} MB / ${sizeMb.toFixed(2)} MB (${availMb.toFixed(2)} MB livres)`,
      );
      if (availMb < 32) {
        console.error(
          `[release:db] ALERTA CRÍTICO: Apenas ${availMb.toFixed(2)} MB livres em /data (< 32 MB piso de segurança WAL).`,
        );
        process.exit(2);
      }
    }
  }
}
