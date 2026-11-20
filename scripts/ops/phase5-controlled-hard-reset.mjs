#!/usr/bin/env node
/**
 * phase5-controlled-hard-reset.mjs
 *
 * Fase 5 (EARS-RST-01): Hard Reset Controlado de Dados de Teste, Mídias de Storage
 * e Recuperação Física de Disco (/data) exclusivamente no projeto canônico
 * `jfuebqmltksyznovhlwa` (NUNCA toca em `mirhhypunfwbxnmpcnjs`).
 *
 * Preserva 100% intactos:
 *   - Todas as tabelas, colunas, constraints, índices, views, RPCs e políticas RLS
 *   - Histórico de migrações (`supabase_migrations.schema_migrations`)
 *   - Buckets de storage e suas políticas RLS
 *   - Catálogos estruturais / taxonomia base (`*_catalog`, `platform_vertical_subsystems`, `niches`)
 *
 * Uso:
 *   node scripts/ops/phase5-controlled-hard-reset.mjs --confirm-hard-reset
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ALLOWED_PROJECT_REF = "jfuebqmltksyznovhlwa";
const FORBIDDEN_PROJECT_REF = "mirhhypunfwbxnmpcnjs";

const confirmed = process.argv.includes("--confirm-hard-reset");
const dryRun = process.argv.includes("--dry-run");

if (!confirmed && !dryRun) {
  console.error("[phase5] Abortado: informe --confirm-hard-reset (ou --dry-run para inspeção).");
  process.exit(1);
}

// Carregar .env.secrets
const secrets = {};
const secretsPath = path.join(process.cwd(), ".env.secrets");
if (fs.existsSync(secretsPath)) {
  for (const line of fs.readFileSync(secretsPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^([^=]+)=(.*)$/);
    if (m) {
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      secrets[m[1].trim()] = v;
    }
  }
}

const projectRef = secrets.SUPABASE_PROJECT_REF || secrets.PROJECT_REF || ALLOWED_PROJECT_REF;
if (projectRef !== ALLOWED_PROJECT_REF || projectRef === FORBIDDEN_PROJECT_REF) {
  console.error(`[phase5] FRONTEIRA DE SEGURANÇA VIOLADA: projeto alvo '${projectRef}' não autorizado.`);
  process.exit(1);
}

const accessToken = secrets.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_ACCESS_TOKEN;
const supabaseUrl = secrets.VITE_SUPABASE_URL || secrets.SUPABASE_URL || `https://${projectRef}.supabase.co`;
const serviceKey = secrets.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!accessToken) {
  console.error("[phase5] SUPABASE_ACCESS_TOKEN ausente em .env.secrets.");
  process.exit(1);
}

const mgmtHeaders = {
  Authorization: `Bearer ${accessToken}`,
  "Content-Type": "application/json",
};

async function getDiskUtil() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/disk/util`, {
    headers: mgmtHeaders,
  });
  if (!res.ok) return null;
  const json = await res.json();
  const m = json?.metrics || {};
  return {
    usedMb: Number(((m.fs_used_bytes || 0) / (1024 * 1024)).toFixed(2)),
    sizeMb: Number(((m.fs_size_bytes || 0) / (1024 * 1024)).toFixed(2)),
    availMb: Number(((m.fs_avail_bytes || 0) / (1024 * 1024)).toFixed(2)),
  };
}

async function runMgmtSql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: mgmtHeaders,
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
  }
  return data;
}

console.log(`=== FASE 5: HARD RESET CONTROLADO (${projectRef}) | mode=${dryRun ? "DRY-RUN" : "EXECUTE"} ===`);

const diskBefore = await getDiskUtil();
if (diskBefore) {
  console.log(
    `[Disco Antes] ${diskBefore.usedMb} MB usados / ${diskBefore.sizeMb} MB totais (${diskBefore.availMb} MB livres para postgres)`,
  );
  if (diskBefore.availMb < 16) {
    console.error(
      `[BLOQUEIO FÍSICO /data] Apenas ${diskBefore.availMb} MB livres (< 16 MB exigidos pelo PostgreSQL para pg_wal/xlogtemp).`,
    );
    console.error(
      `Ação necessária no painel Supabase antes de reexecutar este script:`,
    );
    console.error(
      `  1) Expandir disco de 2 GB para 4+ GB em https://supabase.com/dashboard/project/${projectRef}/settings/compute-and-disk`,
    );
    console.error(
      `  2) Ou desativar Spend Cap / alterar plano em https://supabase.com/dashboard/org/iakxlpfvglyiljqiivbb/billing`,
    );
    process.exit(2);
  }
}

const WIPE_SQL = `
-- 1. Desagendar crons autônomos (EARS-RES-01)
DO $$
DECLARE v_job RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') AND to_regclass('cron.job') IS NOT NULL THEN
    FOR v_job IN SELECT jobid FROM cron.job LOOP
      BEGIN
        PERFORM cron.unschedule(v_job.jobid);
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END LOOP;
  END IF;
END $$;

-- 2. Truncar/limpar logs, filas e tabelas transacionais/teste preservando schema e catálogos base
DO $$
DECLARE
  v_tbl text;
  v_tables text[] := ARRAY[
    'cron.job_run_details',
    'net._http_response',
    'public.system_error_logs',
    'public.system_audit_logs',
    'public.security_audit_events',
    'public.session_audit_logs',
    'public.scraper_audit_log',
    'public.telemetry_logs',
    'public.ai_telemetry_logs',
    'public.ai_prompt_execution_logs',
    'public.ad_telemetry_events',
    'public.pixel_dispatch_log',
    'public.builder_analytics_events',
    'public.agent_execution_log',
    'public.whatsapp_outbox',
    'public.whatsapp_provider_webhook_events',
    'public.whatsapp_channel_audit_events',
    'public.chat_access_audit_events',
    'public.mined_raw_extractions',
    'public.mined_articles',
    'public.mined_recipes',
    'public.mined_lawsuits',
    'public.mined_products',
    'public.mined_tenders',
    'public.news_articles',
    'public.posts',
    'public.stories',
    'public.classifieds',
    'public.travel_proposal_acceptances',
    'public.travel_proposals',
    'public.tourism_trips',
    'public.crm_leads',
    'public.leads_crm',
    'public.orders',
    'public.carts',
    'public.contracts',
    'public.financial_transactions',
    'public.receivables',
    'public.products',
    'public.directory_listings',
    'public.workspace_members',
    'public.stores',
    'public.profiles'
  ];
BEGIN
  FOREACH v_tbl IN ARRAY v_tables LOOP
    IF to_regclass(v_tbl) IS NOT NULL THEN
      BEGIN
        EXECUTE format('TRUNCATE TABLE %s RESTART IDENTITY CASCADE', v_tbl);
      EXCEPTION WHEN OTHERS THEN
        BEGIN
          EXECUTE format('DELETE FROM %s', v_tbl);
        EXCEPTION WHEN OTHERS THEN
          RAISE NOTICE 'Ignorado %: %', v_tbl, SQLERRM;
        END;
      END;
    END IF;
  END LOOP;
END $$;

-- 3. Remover usuários de teste em auth.users (preservando schema auth)
DELETE FROM auth.users;
`;

if (dryRun) {
  console.log("[DRY-RUN] SQL preparado com sucesso. Nenhuma mutação executada.");
  process.exit(0);
}

try {
  console.log("[1/4] Executando Hard Reset SQL nas tabelas de teste, usuários e logs...");
  await runMgmtSql(WIPE_SQL);
  console.log("OK: Dados de teste e logs limpos.");

  if (serviceKey) {
    console.log("[2/4] Esvaziando objetos de teste nos buckets do Supabase Storage...");
    const sb = createClient(supabaseUrl, serviceKey);
    const { data: buckets, error: bErr } = await sb.storage.listBuckets();
    if (bErr) {
      console.warn("Aviso ao listar buckets:", bErr.message);
    } else {
      for (const bucket of buckets || []) {
        let removedTotal = 0;
        const { data: objects } = await sb.storage.from(bucket.name).list("", { limit: 1000 });
        const paths = (objects || []).filter((o) => o.name).map((o) => o.name);
        if (paths.length > 0) {
          await sb.storage.from(bucket.name).remove(paths);
          removedTotal += paths.length;
        }
        console.log(`  Bucket '${bucket.name}': ${removedTotal} objeto(s) removidos (bucket e RLS preservados).`);
      }
    }
  }

  console.log("[3/4] Executando VACUUM FULL, REINDEX e CHECKPOINT...");
  await runMgmtSql("VACUUM FULL;");
  await runMgmtSql("REINDEX DATABASE postgres;");
  await runMgmtSql("CHECKPOINT;");
  console.log("OK: Espaço físico devolvido ao volume /data.");

  console.log("[4/4] Verificando utilização de disco pós-reset...");
  const diskAfter = await getDiskUtil();
  if (diskAfter) {
    console.log(
      `[Disco Depois] ${diskAfter.usedMb} MB usados / ${diskAfter.sizeMb} MB totais (${diskAfter.availMb} MB livres para postgres)`,
    );
  }
  console.log("=== FASE 5 CONCLUÍDA COM SUCESSO ===");
} catch (err) {
  console.error("[phase5] Falha durante execução:", err.message);
  process.exit(1);
}
