/**
 * deep-core.functions.ts — MASTER PROMPT V113 BFF Engine
 *
 * Responsável por:
 * 1. Transações Atômicas Server-Side (.rpc) de Ad-Boost + Financial Ledger
 * 2. Finalização Atômica de Pedido + Despacho Logístico Waesy Go MotoLink (Haversine Server-Side)
 * 3. Sincronização de Estados Cross-Module (The Ripple Effect: Ban / Suspensão / Exclusão Civil)
 * 4. Leitura Dinâmica de Taxonomias de Domínio (Expurgo de Hardcoded com Cache Server/Client)
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequest } from "@tanstack/start-server-core";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { extractClientIp } from "@/lib/rate-limiter";

// ── 1. CACHE EM MEMÓRIA SERVER-SIDE PARA TAXONOMIAS DINÂMICAS (FASE 4) ──────
const TAXONOMY_MEMORY_CACHE = new Map<string, { expiresAt: number; items: DynamicTaxonomyItemDTO[] }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

export interface DynamicTaxonomyItemDTO {
  id: string;
  domain_group: string;
  code: string;
  label: string;
  icon_name?: string | null;
  sort_order: number;
  metadata: Record<string, any>;
}

export const getDynamicPlatformTaxonomies = createServerFn({ method: "GET" })
  .validator(
    z.object({
      domainGroup: z.enum([
        "product_categories",
        "education_levels",
        "contract_types",
        "subscription_tiers",
        "discovery_pillars",
      ]),
      forceRefresh: z.boolean().optional(),
    })
  )
  .handler(async ({ data: { domainGroup, forceRefresh } }) => {
    const cached = TAXONOMY_MEMORY_CACHE.get(domainGroup);
    if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
      return cached.items;
    }

    const supabase = getServerClient();
    const { data, error } = await supabase
      .from("platform_domain_taxonomies")
      .select("id, domain_group, code, label, icon_name, sort_order, metadata")
      .eq("domain_group", domainGroup)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error || !data) {
      return cached?.items || [];
    }

    const items: DynamicTaxonomyItemDTO[] = data.map((row: any) => ({
      id: row.id,
      domain_group: row.domain_group,
      code: row.code,
      label: row.label,
      icon_name: row.icon_name || null,
      sort_order: Number(row.sort_order || 0),
      metadata: (row.metadata as Record<string, any>) || {},
    }));

    TAXONOMY_MEMORY_CACHE.set(domainGroup, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      items,
    });

    return items;
  });

// ── 2. EFEITO CASCATA CROSS-MODULE (FASE 3: THE RIPPLE EFFECT) ──────────────
export const triggerCivilIdentityRippleCascade = createServerFn({ method: "POST" })
  .validator(
    z.object({
      targetProfileId: z.string().uuid(),
      action: z.enum(["ban", "suspend", "soft_delete"]),
      reason: z.string().min(3).max(500).optional(),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const isMaster =
      identity.role === "platform_admin" ||
      identity.role === "master" ||
      identity.role === "superadmin" ||
      identity.id === data.targetProfileId;

    if (!isMaster) {
      throw new Error("Acesso negado: apenas Admin Master ou o próprio titular pode acionar a cascata de identidade.");
    }

    const req = getRequest();
    const clientIp = extractClientIp(req);
    const supabase = getServerClient();

    const { data: rpcResult, error } = await supabase.rpc("execute_civil_identity_ripple_cascade", {
      p_target_profile_id: data.targetProfileId,
      p_action: data.action,
      p_reason: data.reason || "Cascata sistêmica de encerramento/suspensão de identidade civil",
      p_actor_ip: clientIp,
    });

    if (error) {
      throw new Error(`Falha na transação de cascata cross-module: ${error.message}`);
    }

    return rpcResult as {
      status: "success";
      target_profile_id: string;
      action: string;
      ripple_effect: {
        deactivated_personas: number;
        archived_classifieds: number;
        withdrawn_job_applications: number;
        paused_ad_campaigns: number;
        paused_jobs: number;
      };
    };
  });

// ── 3. AUDITORIA DE LIVRO-RAZÃO (FINANCIAL LEDGER) DA LOJA (FASE 2) ─────────
export const listStoreFinancialLedger = createServerFn({ method: "GET" })
  .validator(z.object({ limit: z.number().int().min(1).max(100).optional() }).optional())
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "finance"]);

    const supabase = getServerClient();
    const { data: rows, error } = await supabase
      .from("financial_ledger")
      .select("*")
      .eq("store_id", identity.store_id)
      .order("created_at", { ascending: false })
      .limit(data?.limit ?? 50);

    if (error) {
      return [];
    }

    return rows || [];
  });

// ── 4. LISTAGEM E GOVERNANÇA DE TAXONOMIAS DINÂMICAS (ADMIN MASTER) ─────────
export const listPlatformDomainTaxonomies = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        domainGroup: z.string().optional(),
        activeOnly: z.boolean().optional(),
      })
      .optional()
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    let query = supabase
      .from("platform_domain_taxonomies")
      .select("id, domain_group, code, label, icon_name, sort_order, is_active, metadata")
      .order("domain_group", { ascending: true })
      .order("sort_order", { ascending: true });

    if (data?.domainGroup) {
      query = query.eq("domain_group", data.domainGroup);
    }
    if (data?.activeOnly !== false) {
      query = query.eq("is_active", true);
    }

    const { data: rows, error } = await query;
    if (error || !rows) {
      return { taxonomies: [] };
    }

    return {
      taxonomies: rows.map((r: any) => ({
        id: r.id,
        domain_group: r.domain_group,
        slug: r.code,
        code: r.code,
        label: r.label,
        icon_name: r.icon_name || null,
        sort_order: Number(r.sort_order || 0),
        is_active: Boolean(r.is_active),
        metadata: r.metadata || {},
      })),
    };
  });

export const upsertPlatformDomainTaxonomy = createServerFn({ method: "POST" })
  .validator(
    z.object({
      domainGroup: z.string().min(2).max(100),
      slug: z.string().min(2).max(100),
      label: z.string().min(1).max(150),
      isActive: z.boolean().optional().default(true),
      sortOrder: z.number().int().optional().default(10),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const isMaster =
      identity.role === "platform_admin" ||
      identity.role === "master" ||
      identity.role === "superadmin";

    if (!isMaster) {
      throw new Error("Apenas Admin Master pode gerenciar taxonomias globais.");
    }

    const supabase = getServerClient();
    const { data: row, error } = await supabase
      .from("platform_domain_taxonomies")
      .upsert(
        {
          domain_group: data.domainGroup,
          code: data.slug.trim().toLowerCase(),
          label: data.label.trim(),
          is_active: data.isActive ?? true,
          sort_order: data.sortOrder ?? 10,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "domain_group,code" }
      )
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao salvar taxonomia: ${error.message}`);
    }

    TAXONOMY_MEMORY_CACHE.delete(data.domainGroup);
    return row;
  });

// ── 5. BOOST ATÔMICO DE CAMPANHA DE ANÚNCIOS + LEDGER (FASE 2 ACID) ─────────
export const boostAdCampaignAtomic = createServerFn({ method: "POST" })
  .validator(
    z.object({
      campaignId: z.string().uuid(),
      amountCents: z.number().int().min(100),
      priorityDelta: z.number().int().min(1).max(1000).optional().default(50),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "marketing"]);

    const req = getRequest();
    const clientIp = extractClientIp(req);
    const supabase = getServerClient();

    const { data: rpcResult, error } = await supabase.rpc("execute_ad_campaign_boost_atomic", {
      p_campaign_id: data.campaignId,
      p_store_id: identity.store_id,
      p_actor_profile_id: identity.id,
      p_boost_amount_cents: data.amountCents,
      p_priority_boost_delta: data.priorityDelta,
      p_client_ip: clientIp,
    });

    if (error) {
      throw new Error(`Transação ACID de Boost revertida: ${error.message}`);
    }

    return rpcResult;
  });

