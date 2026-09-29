/**
 * crawler-sources.functions.ts — BFF Server Functions para Governança do Omni-Crawler V127
 * 
 * Gerencia a tabela canônica `crawler_sources` (RSS, Vagas, Editais PNCP, Leilões, Imóveis, Notícias),
 * acionando coletas, alternando status e orquestrando o processamento em lote para as tabelas finais.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, requireAdmin } from "@/lib/server-access";
import { executeContinuousCrawl } from "@/lib/mining/continuous-crawler.engine";
import { executeUnifiedAiCall } from "./api-orchestrator.functions";
import { parseFeed } from "@/lib/mining/rss-ingester.engine";

export const crawlerSourceTypeEnum = z.enum([
  "rss",
  "html_sitemap",
  "jobs_portal",
  "real_estate",
  "auctions",
  "tenders",
  "news",
  "ecommerce",
]);

export type CrawlerSourceType = z.infer<typeof crawlerSourceTypeEnum>;

export interface CrawlerSourceDTO {
  id: string;
  name: string;
  url: string;
  type: CrawlerSourceType;
  category: string;
  region: string;
  priority: number;
  is_active: boolean;
  status: "idle" | "fetching" | "success" | "error" | "paused";
  fetch_interval_minutes: number;
  last_fetched_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  error_count: number;
  items_indexed_count: number;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// ── 1. LISTAR FONTES DE CRAWLERS CANÔNICAS ────────────────────────────────────

export const listCrawlerSources = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        type: crawlerSourceTypeEnum.or(z.literal("all")).optional(),
        status: z.enum(["all", "idle", "fetching", "success", "error", "paused"]).optional(),
        region: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().int().min(1).max(200).default(100),
        offset: z.number().int().min(0).default(0),
      })
      .optional(),
  )
  .handler(async ({ data }): Promise<{ sources: CrawlerSourceDTO[]; total: number }> => {
    const supabase = getServerClient();

    let query = supabase
      .from("crawler_sources")
      .select("*", { count: "exact" })
      .order("priority", { ascending: false })
      .order("name", { ascending: true })
      .range(data?.offset || 0, (data?.offset || 0) + (data?.limit || 100) - 1);

    if (data?.type && data.type !== "all") {
      query = query.eq("type", data.type);
    }
    if (data?.status && data.status !== "all") {
      query = query.eq("status", data.status);
    }
    if (data?.region && data.region.trim()) {
      query = query.ilike("region", `%${data.region.trim()}%`);
    }
    if (data?.search && data.search.trim()) {
      query = query.or(`name.ilike.%${data.search.trim()}%,url.ilike.%${data.search.trim()}%`);
    }

    const { data: rows, count, error } = await query;
    if (error) {
      console.error("[crawler-sources] Erro ao listar fontes:", error);
      return { sources: [], total: 0 };
    }

    return {
      sources: (rows || []) as CrawlerSourceDTO[],
      total: count || 0,
    };
  });

// ── 2. ATIVAR / PAUSAR FONTE DE CRAWLER ───────────────────────────────────────

export const toggleCrawlerSourceActive = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      is_active: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const supabase = getServerClient();

    const { data: updated, error } = await supabase
      .from("crawler_sources")
      .update({
        is_active: data.is_active,
        status: data.is_active ? "idle" : "paused",
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Falha ao alterar status da fonte: ${error.message}`);
    }

    return updated as CrawlerSourceDTO;
  });

// ── 3. CADASTRAR OU EDITAR FONTE DE CRAWLER ───────────────────────────────────

export const upsertCrawlerSource = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
      url: z.string().url("URL de destino inválida"),
      type: crawlerSourceTypeEnum,
      category: z.string().default("general"),
      region: z.string().default("SC"),
      priority: z.number().int().min(1).max(10).default(5),
      fetch_interval_minutes: z.number().int().min(5).default(60),
      config: z.record(z.any()).optional(),
    }),
  )
  .handler(async ({ data: input }) => {
    await requireAdmin();
    const supabase = getServerClient();

    const payload = {
      name: input.name.trim(),
      url: input.url.trim(),
      type: input.type,
      category: input.category.trim(),
      region: input.region.trim(),
      priority: input.priority,
      fetch_interval_minutes: input.fetch_interval_minutes,
      config: input.config || {},
      updated_at: new Date().toISOString(),
    };

    if (input.id) {
      const { data: updated, error } = await supabase
        .from("crawler_sources")
        .update(payload)
        .eq("id", input.id)
        .select()
        .single();

      if (error) throw new Error(`Falha ao atualizar fonte: ${error.message}`);
      return updated as CrawlerSourceDTO;
    }

    const { data: created, error } = await supabase
      .from("crawler_sources")
      .upsert(
        {
          ...payload,
          is_active: true,
          status: "idle",
          created_at: new Date().toISOString(),
        },
        { onConflict: "url" },
      )
      .select()
      .single();

    if (error) throw new Error(`Falha ao cadastrar fonte: ${error.message}`);
    return created as CrawlerSourceDTO;
  });

// ── 4. DISPARAR FETCH SOB DEMANDA DE UMA FONTE (E2E) ──────────────────────────

export const triggerCrawlerSourceFetch = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const supabase = getServerClient();

    const { data: source, error: sourceErr } = await supabase
      .from("crawler_sources")
      .select("*")
      .eq("id", data.id)
      .single();

    if (sourceErr || !source) {
      throw new Error("Fonte não encontrada.");
    }

    // Marca como fetching
    await supabase
      .from("crawler_sources")
      .update({ status: "fetching", last_fetched_at: new Date().toISOString() })
      .eq("id", source.id);

    let itemsIndexed = 0;
    let fetchError: string | null = null;

    try {
      if (source.type === "rss") {
        // Ingestão de RSS
        const feedResult = await parseFeed(source.url);
        if (feedResult && feedResult.items && feedResult.items.length > 0) {
          itemsIndexed = feedResult.items.length;

          // Enfileira os itens na crawl_queue
          for (const item of feedResult.items.slice(0, 20)) {
            if (!item.link) continue;
            let domain = "";
            try {
              domain = new URL(item.link).hostname.replace("www.", "");
            } catch {
              domain = "unknown";
            }

            await supabase.from("crawl_queue").upsert(
              {
                url: item.link,
                domain,
                priority: source.priority,
                entity_type: "news",
                content_type: "rss_xml",
                source_id: source.id,
                status: "pending",
                discovered_via: "source_trigger",
                metadata: {
                  title: item.title,
                  source_name: source.name,
                  category: source.category,
                },
              },
              { onConflict: "url", ignoreDuplicates: true },
            );
          }
        }
      } else {
        // Enfileira a URL raiz na fila com prioridade máxima para processamento contínuo
        let domain = "";
        try {
          domain = new URL(source.url).hostname.replace("www.", "");
        } catch {
          domain = "unknown";
        }

        await supabase.from("crawl_queue").upsert(
          {
            url: source.url,
            domain,
            priority: 10,
            entity_type: source.type,
            content_type: "html_page",
            source_id: source.id,
            status: "pending",
            discovered_via: "source_manual_trigger",
            metadata: {
              source_name: source.name,
              category: source.category,
              region: source.region,
            },
          },
          { onConflict: "url" },
        );
        itemsIndexed = 1;
      }

      // Sucesso
      await supabase
        .from("crawler_sources")
        .update({
          status: "success",
          last_success_at: new Date().toISOString(),
          items_indexed_count: (source.items_indexed_count || 0) + itemsIndexed,
          error_count: 0,
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", source.id);

      return {
        success: true,
        sourceId: source.id,
        itemsIndexed,
        status: "success",
      };
    } catch (err: any) {
      fetchError = err.message || "Erro desconhecido durante fetch da fonte";
      await supabase
        .from("crawler_sources")
        .update({
          status: "error",
          last_error: fetchError?.slice(0, 300),
          error_count: (source.error_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", source.id);

      throw new Error(`Falha no disparo da fonte: ${fetchError}`);
    }
  });

// ── 5. ESTATÍSTICAS CONSOLIDADAS DO OMNI-CRAWLER V127 ──────────────────────────

export const getOmniCrawlerStats = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();

  const [sourcesRes, queueRes, newsRes, jobsRes] = await Promise.all([
    supabase.from("crawler_sources").select("type, status, is_active", { count: "exact" }),
    supabase.from("crawl_queue").select("status", { count: "exact" }),
    supabase.from("news_articles").select("id", { count: "exact", head: true }),
    supabase.from("jobs").select("id", { count: "exact", head: true }),
  ]);

  const sources = sourcesRes.data || [];
  const queue = queueRes.data || [];

  const sourcesByType: Record<string, number> = {};
  let activeSources = 0;
  let erroredSources = 0;

  for (const s of sources) {
    sourcesByType[s.type] = (sourcesByType[s.type] || 0) + 1;
    if (s.is_active) activeSources++;
    if (s.status === "error") erroredSources++;
  }

  const queueByStatus: Record<string, number> = {};
  for (const q of queue) {
    queueByStatus[q.status] = (queueByStatus[q.status] || 0) + 1;
  }

  return {
    totalSources: sourcesRes.count || sources.length,
    activeSources,
    erroredSources,
    sourcesByType,
    totalQueue: queueRes.count || queue.length,
    queuePending: queueByStatus["pending"] || 0,
    queueProcessing: queueByStatus["processing"] || 0,
    queueCompleted: queueByStatus["completed"] || 0,
    queueFailed: queueByStatus["failed"] || 0,
    publishedNewsCount: newsRes.count || 0,
    activeJobsCount: jobsRes.count || 0,
  };
});
