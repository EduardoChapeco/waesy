/**
 * supabase-federation.ts — Motor de Federação Multi-DB & Topologia Reversível (Primary + Offload + Archive / Self-Hosted Ready)
 *
 * Arquitetura Canônica em 3 Camadas:
 * 1. PRIMARY CORE (`wlxapubsesiwtxzbuygt` ou Supabase Próprio Self-Hosted):
 *    - Identidade, Auth (`auth.users`, `profiles`), Lojas (`stores`, `workspace_members`),
 *      Catálogo, Classificados, Turismo (`travel_proposals`, `tourism_trips`, `leads_crm`),
 *      Pedidos (`orders`), Contratos (`contracts`), Financeiro (`financial_transactions`, `receivables`) e Storage.
 * 2. SECONDARY OFFLOAD (`vnmqummmgvgyazglnoav`):
 *    - Drena 100% da carga pesada de escrita contínua append-only que satura WAL e disco `/data`:
 *      Logs de erro/auditoria, telemetria, analytics de blocos, extrações brutas e logs de execução de agentes.
 * 3. TERTIARY ARCHIVE / APOIO (`jfuebqmltksyznovhlwa`):
 *    - Nó de apoio/arquivo e absorção de mineração/ingestão em massa (ativado quando saudável e configurado).
 * 4. REVERSIBILIDADE TOTAL (Zero Lock-In / 1 Projeto ou Self-Hosted):
 *    - Quando `SUPABASE_TOPOLOGY_MODE="single"` (ou quando as variáveis de apoio não estão definidas),
 *      100% das chamadas `.from()` e `.rpc()` operam de forma transparente no banco único
 *      (seja 1 Supabase gerenciado ou a instância Self-Hosted própria), sem alterar rotas ou Server Functions.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type SupabaseTopologyMode = "single" | "dual" | "triple" | "auto";

export const CANONICAL_PRIMARY_PROJECT_REF = "wlxapubsesiwtxzbuygt";
export const CANONICAL_OFFLOAD_PROJECT_REF = "vnmqummmgvgyazglnoav";
export const CANONICAL_ARCHIVE_PROJECT_REF = "jfuebqmltksyznovhlwa";

/**
 * Tabelas de alta volumetria/escrita roteadas para o banco secundário (Offload DB)
 * quando a topologia `dual` está ativa.
 */
export const OFFLOAD_TABLES_LIST = [
  // 1. Logs de Erro, Auditoria & Segurança
  "system_error_logs",
  "system_audit_logs",
  "security_audit_events",
  "forensic_audit_events",
  "audit_log",
  "system_wipe_logs",
  "fraud_investigation_logs",
  // 2. Telemetria, Analytics & Eventos de Interface
  "telemetry_logs",
  "ai_telemetry_logs",
  "ai_prompt_execution_logs",
  "ad_telemetry_events",
  "pixel_dispatch_log",
  "builder_analytics_events",
  "pwa_telemetry",
  "invite_telemetry",
  "lead_conversion_telemetry",
  "user_form_submissions_log",
  "abandoned_carts_log",
  // 3. Mineração (somente trilhas append-only; tabelas de curadoria/config ficam em MINING_BULK_TABLES_LIST)
  "mined_raw_extractions",
  "cnpj_market_audits",
  // 4. Filas Assíncronas, Webhooks & Execução de Agentes
  "agent_execution_log",
  "whatsapp_channel_audit_events",
  "chat_access_audit_events",
  "marketplace_sync_logs",
] as const;

export type OffloadTableName = (typeof OFFLOAD_TABLES_LIST)[number];

const OFFLOAD_TABLES_SET = new Set<string>(OFFLOAD_TABLES_LIST);

/**
 * RPCs de telemetria/manutenção roteadas para o banco secundário (Offload DB)
 * quando a topologia `dual` está ativa.
 */
export const OFFLOAD_RPCS_LIST = [
  "report_security_telemetry",
  "record_ad_telemetry",
  "purge_transient_bloat",
  "dispatch_mining_cron",
] as const;

const OFFLOAD_RPCS_SET = new Set<string>(OFFLOAD_RPCS_LIST);

export function isOffloadTable(tableName: string): boolean {
  if (!tableName) return false;
  const clean = tableName.trim().toLowerCase().replace(/^public\./, "");
  return OFFLOAD_TABLES_SET.has(clean);
}

export function isOffloadRpc(rpcName: string): boolean {
  if (!rpcName) return false;
  const clean = rpcName.trim().toLowerCase().replace(/^public\./, "");
  return OFFLOAD_RPCS_SET.has(clean);
}

export function resolveTopologyMode(
  rawMode?: string,
  offloadUrl?: string,
  offloadKey?: string,
): SupabaseTopologyMode {
  const normalized = (rawMode || "").trim().toLowerCase();
  if (normalized === "single") return "single";
  if (offloadUrl && offloadUrl.startsWith("http") && offloadKey && offloadKey.length >= 10) {
    return "dual";
  }
  return "single";
}

/**
 * Envolve o cliente primário e o cliente secundário (Offload) em um Proxy transparente.
 * - Em modo `dual`: redireciona `.from(table)` de tabelas em `OFFLOAD_TABLES_LIST` e `.rpc(fn)`
 *   de `OFFLOAD_RPCS_LIST` para o `offloadClient`.
 * - Em modo `single` (ou se `offloadClient` for nulo): todas as operações permanecem no `primaryClient`.
 */
export function createFederatedSupabaseClient(
  primaryClient: SupabaseClient,
  offloadClient: SupabaseClient | null,
  mode: SupabaseTopologyMode = offloadClient ? "dual" : "single",
): SupabaseClient {
  if (!offloadClient || mode === "single") {
    return primaryClient;
  }

  return new Proxy(primaryClient, {
    get(target, prop, receiver) {
      if (prop === "from") {
        return (relation: string) => {
          if (isOffloadTable(relation)) {
            return offloadClient.from(relation);
          }
          return target.from(relation);
        };
      }

      if (prop === "rpc") {
        return (fn: string, args?: Record<string, unknown>, options?: any) => {
          if (isOffloadRpc(fn)) {
            return offloadClient.rpc(fn, args, options);
          }
          return target.rpc(fn, args, options);
        };
      }

      if (prop === "__federation__") {
        return {
          mode,
          hasOffload: true,
          primaryClient,
          offloadClient,
        };
      }

      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}


// ---------------------------------------------------------------------------
// Federação em 3 camadas: PRIMARY (Auth + transacional) · OFFLOAD (ingestão) · ARCHIVE (apoio/arquivo)
// ---------------------------------------------------------------------------

/**
 * Tabelas de mineração/curadoria. Só são roteadas quando `SUPABASE_ROUTE_MINING=1`, porque são lidas com
 * joins/embeds e administradas via CMS. Destino: ARCHIVE, com fallback para OFFLOAD, depois PRIMARY.
 * Antes de ligar, rode `node scripts/ops/audit-federation-joins.mjs` (zero joins cruzando nós).
 */
export const MINING_BULK_TABLES_LIST = [
  "crawl_queue",
  "crawler_sources",
  "rss_feeds",
  "mining_schedules",
  "scraper_configs",
  "mined_articles",
  "mined_recipes",
  "mined_lawsuits",
  "mined_products",
  "mined_tenders",
  "news_articles",
  "economic_indicators",
] as const;

const MINING_BULK_TABLES_SET = new Set<string>(MINING_BULK_TABLES_LIST);

export type FederationNodeRole = "primary" | "offload" | "archive";
export type FederationTopology = "single" | "dual" | "triple";

export interface FederationNodes {
  /** Resolvidos sob demanda: clientes de apoio só são criados se a tabela for roteada para eles. */
  offload?: (() => SupabaseClient | null) | null;
  archive?: (() => SupabaseClient | null) | null;
}

export interface FederationOptions {
  routeMining?: boolean;
}

function cleanRelation(name: string): string {
  return (name || "").trim().toLowerCase().replace(/^public\./, "");
}

/** Decide qual nó atende uma tabela. `primary` é sempre o fallback seguro. */
export function resolveTableNode(
  relation: string,
  available: { offload: boolean; archive: boolean },
  options: FederationOptions = {},
): FederationNodeRole {
  const clean = cleanRelation(relation);
  if (!clean) return "primary";
  if (OFFLOAD_TABLES_SET.has(clean)) {
    if (available.offload) return "offload";
    if (available.archive) return "archive";
    return "primary";
  }
  if (options.routeMining && MINING_BULK_TABLES_SET.has(clean)) {
    if (available.archive) return "archive";
    if (available.offload) return "offload";
    return "primary";
  }
  return "primary";
}

export function resolveFederationTopology(env: {
  mode?: string;
  offloadUrl?: string;
  offloadKey?: string;
  archiveUrl?: string;
  archiveKey?: string;
}): FederationTopology {
  if ((env.mode || "").trim().toLowerCase() === "single") return "single";
  const ok = (u?: string, k?: string) => Boolean(u && u.startsWith("http") && k && k.length >= 10);
  const hasOffload = ok(env.offloadUrl, env.offloadKey);
  const hasArchive = ok(env.archiveUrl, env.archiveKey);
  if (hasOffload && hasArchive) return "triple";
  if (hasOffload || hasArchive) return "dual";
  return "single";
}

/**
 * Proxy transparente de 3 nós. O PRIMARY atende Auth, Storage, RPCs e toda tabela que não esteja
 * explicitamente roteada. Se um nó de apoio não estiver configurado, a tabela cai no PRIMARY (sem quebra).
 * Para reverter para 1 projeto: `SUPABASE_TOPOLOGY_MODE=single` (ou remover as variáveis de apoio).
 */
export function createTieredFederatedClient(
  primaryClient: SupabaseClient,
  nodes: FederationNodes,
  options: FederationOptions = {},
): SupabaseClient {
  if (!nodes.offload && !nodes.archive) return primaryClient;

  const cache: Partial<Record<FederationNodeRole, SupabaseClient | null>> = {};
  const client = (role: FederationNodeRole): SupabaseClient => {
    if (role === "primary") return primaryClient;
    if (!(role in cache)) cache[role] = (role === "offload" ? nodes.offload : nodes.archive)?.() ?? null;
    return cache[role] ?? primaryClient;
  };
  const available = { offload: Boolean(nodes.offload), archive: Boolean(nodes.archive) };

  return new Proxy(primaryClient, {
    get(target, prop, receiver) {
      if (prop === "from") {
        return (relation: string) => client(resolveTableNode(relation, available, options)).from(relation);
      }
      if (prop === "rpc") {
        return (fn: string, args?: Record<string, unknown>, opts?: any) => {
          const role: FederationNodeRole = isOffloadRpc(fn) && available.offload ? "offload" : "primary";
          return client(role).rpc(fn, args, opts);
        };
      }
      if (prop === "__federation__") {
        return { available, routeMining: Boolean(options.routeMining) };
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}
