/**
 * crawler-batch-engine.ts — Motor Puro e Desacoplado de Processamento da Fila de Crawling
 * 
 * Executa lotes da crawl_queue sem dependência de contexto de requisição HTTP (AsyncLocalStorage),
 * permitindo acionamento seguro por pg_cron, jobs de borda, workers serverless e CLI scripts.
 * Roteamento polimórfico industrial para as 8 entidades do ecossistema Waesy.
 * 
 * Regra: ZERO MOCKS. Todos os dados são extraídos de fontes reais e auditados.
 */

import { getServerClient } from "@/lib/supabase";
import { scrapeUrl } from "@/lib/mining/firecrawl-client";
import { extractAndPersistJobOpportunity } from "./job-opportunity-extractor";
import { harvestAndPersistPlaces } from "./places-harvester";
import { harvestAndPersistPncpTenders } from "./pncp-harvester";
import { harvestAndPersistRealEstate } from "./real-estate-harvester";
import { harvestAndPersistAuctions } from "./auction-harvester";
import { harvestAndPersistEvent } from "./event-harvester";
import { extractContentMechanically, cleanHtmlText } from "./mechanical-extractor";
import { validateMechanicalCompleteness, isHealthyImageUrl, getFallbackThematicImage } from "./integrity-gate";
import { curateWithEditorialSquad } from "./editorial-squad";
import { parseFeed } from "@/lib/mining/rss-ingester.engine";
import { resolveCityAndState } from "@/lib/mining/geo-resolver";
import { getDefaultCity, getDefaultState } from "@/lib/brand.config";

export interface CrawlBatchOptions {
  limit?: number;
  batchSize?: number;
  storeId?: string;
}

export interface CrawlBatchItemResult {
  id: string;
  url: string;
  entityType?: string;
  status: "completed" | "failed";
  error?: string;
  articleId?: string;
  publishedArticleId?: string;
  listingId?: string;
  eventId?: string;
}

export interface CrawlBatchResult {
  processed: number;
  succeeded: number;
  failed: number;
  items: CrawlBatchItemResult[];
  message?: string;
}

/**
 * Auto-Reset / Reaper de Itens Travados na Fila de Crawling
 * Restaura para 'pending' itens presos em 'processing' há mais de 10 minutos ou com processed_at nulo.
 */
export async function reapStalledProcessingQueueItems(supabaseClient?: any): Promise<number> {
  const supabase = supabaseClient || getServerClient();
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { data: stalled, error } = await supabase
    .from("crawl_queue")
    .update({
      status: "pending",
      last_error: "Auto-reset pelo reaper: recuperado de travamento em 'processing'",
      processing_error: "Auto-reset pelo reaper: recuperado de travamento em 'processing'",
      updated_at: new Date().toISOString(),
    })
    .eq("status", "processing")
    .or(`processed_at.lt.${tenMinutesAgo},started_at.lt.${tenMinutesAgo},processed_at.is.null,started_at.is.null`)
    .select("id");

  if (error) {
    // Fallback defensivo caso processed_at não esteja disponível na view/tabela
    const { data: fallbackStalled } = await supabase
      .from("crawl_queue")
      .update({ status: "pending" })
      .eq("status", "processing")
      .select("id");
    return fallbackStalled?.length || 0;
  }

  const count = stalled?.length || 0;
  if (count > 0) {
    console.info(`[CrawlerReaper] ${count} itens em 'processing' foram restaurados para 'pending'.`);
  }
  return count;
}

export async function executeCrawlQueueBatchDirect(
  options?: CrawlBatchOptions
): Promise<CrawlBatchResult> {
  const supabase = getServerClient();
  const batchSize = options?.batchSize || options?.limit || 2;

  // 0. Auto-reset / Reaper de itens presos em 'processing' há mais de 10 minutos
  await reapStalledProcessingQueueItems(supabase);

  // 1. Busca itens pendentes ordenados por prioridade decrescente e idade
  let query = supabase
    .from("crawl_queue")
    .select("*")
    .eq("status", "pending")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(batchSize);

  if (options?.storeId) {
    query = query.eq("store_id", options.storeId);
  }

  const { data: queueItems, error: fetchErr } = await query;
  if (fetchErr != null || queueItems == null || queueItems.length === 0) {
    return {
      processed: 0,
      succeeded: 0,
      failed: 0,
      items: [],
      message: "Fila de crawling vazia no momento.",
    };
  }

  const results: CrawlBatchItemResult[] = [];

  for (const item of queueItems) {
    // 2. Marca status como processing
    await supabase
      .from("crawl_queue")
      .update({
        status: "processing",
        processed_at: new Date().toISOString(),
        retry_count: (item.retry_count || 0) + 1,
      })
      .eq("id", item.id);

    try {
      const entityType = (item.entity_type || "news").toLowerCase();

      if (entityType === "jobs_portal" || entityType === "job") {
        // ── 1. VAGAS & EMPREGOS (jobs) ──────────────────────────────────
        const scrape = await scrapeUrl(item.url);
        let jobRes: { success: boolean; insertedId?: string; error?: string } = { success: false };

        const geo = resolveCityAndState(item.metadata?.city, item.metadata?.state);
        if (scrape.success && scrape.html) {
          jobRes = await extractAndPersistJobOpportunity(scrape.html, item.url, {
            storeId: item.store_id || undefined,
            city: geo.city || item.metadata?.city,
            state: geo.state || item.metadata?.state,
          });
        } else {
          jobRes = { success: false, error: scrape.error || "Falha ao obter HTML da vaga" };
        }

        await supabase
          .from("crawl_queue")
          .update({
            status: jobRes.success ? "completed" : "failed",
            last_error: jobRes.error || null,
            processing_error: jobRes.error || null,
            completed_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        results.push({
          id: item.id,
          url: item.url,
          entityType,
          status: jobRes.success ? "completed" : "failed",
          error: jobRes.error,
        });

      } else if (entityType === "places" || entityType === "directory") {
        // ── 2. ESTABELECIMENTOS & DIRETÓRIO (directory_listings) ────────
        const queryTerm = item.metadata?.query || item.metadata?.category || "comércio";
        const geo = resolveCityAndState(item.metadata?.city, item.metadata?.state);
        const placesRes = await harvestAndPersistPlaces({
          query: queryTerm,
          city: geo.city || item.metadata?.city,
          state: geo.state || item.metadata?.state,
          storeId: item.store_id || undefined,
        });

        await supabase
          .from("crawl_queue")
          .update({
            status: placesRes.success ? "completed" : "failed",
            last_error: placesRes.error || null,
            processing_error: placesRes.error || null,
            completed_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        results.push({
          id: item.id,
          url: item.url,
          entityType,
          status: placesRes.success ? "completed" : "failed",
          error: placesRes.error,
        });

      } else if (entityType === "tenders" || entityType === "licitacao") {
        // ── 3. LICITAÇÕES & COMPRAS PÚBLICAS (mined_tenders) ───────────
        const tenderGeo = resolveCityAndState(item.metadata?.city, item.metadata?.uf || item.metadata?.state);
        const tendersRes = await harvestAndPersistPncpTenders({
          query: item.metadata?.query || tenderGeo.city || getDefaultCity(),
          uf: tenderGeo.state || getDefaultState(),
          codigoMunicipioIbge: tenderGeo.ibgeCode || item.metadata?.ibge || "4204202",
          limit: 10,
        });

        await supabase
          .from("crawl_queue")
          .update({
            status: tendersRes.success ? "completed" : "failed",
            last_error: tendersRes.error || null,
            processing_error: tendersRes.error || null,
            completed_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        results.push({
          id: item.id,
          url: item.url,
          entityType,
          status: tendersRes.success ? "completed" : "failed",
          error: tendersRes.error,
        });

      } else if (entityType === "real_estate" || entityType === "imoveis") {
        // ── 4. IMÓVEIS & IMOBILIÁRIAS (directory_listings) ──────────────
        const estateGeo = resolveCityAndState(item.metadata?.city || item.metadata?.region, item.metadata?.state);
        const estateRes = await harvestAndPersistRealEstate({
          url: item.url,
          sourceName: item.metadata?.source_name,
          city: estateGeo.city || item.metadata?.city,
          state: estateGeo.state || item.metadata?.state,
          storeId: item.store_id || undefined,
        });

        await supabase
          .from("crawl_queue")
          .update({
            status: estateRes.success ? "completed" : "failed",
            last_error: estateRes.error || null,
            processing_error: estateRes.error || null,
            completed_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        results.push({
          id: item.id,
          url: item.url,
          entityType,
          status: estateRes.success ? "completed" : "failed",
          listingId: estateRes.listingId,
          error: estateRes.error,
        });

      } else if (entityType === "auctions" || entityType === "leiloes") {
        // ── 5. LEILÕES & LEILOEIROS (directory_listings) ─────────────────
        const auctionGeo = resolveCityAndState(item.metadata?.city, item.metadata?.state);
        const auctionRes = await harvestAndPersistAuctions({
          url: item.url,
          sourceName: item.metadata?.source_name,
          category: item.metadata?.category,
          city: auctionGeo.city || item.metadata?.city,
          state: auctionGeo.state || item.metadata?.state,
          storeId: item.store_id || undefined,
        });

        await supabase
          .from("crawl_queue")
          .update({
            status: auctionRes.success ? "completed" : "failed",
            last_error: auctionRes.error || null,
            processing_error: auctionRes.error || null,
            completed_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        results.push({
          id: item.id,
          url: item.url,
          entityType,
          status: auctionRes.success ? "completed" : "failed",
          listingId: auctionRes.listingId,
          error: auctionRes.error,
        });

      } else if (
        entityType === "rss" ||
        item.url.endsWith(".xml") ||
        item.url.includes("/rss") ||
        item.url.includes("/feed")
      ) {
        // ── 6. RSS & ATOM FEEDS (Descoberta e enfileiramento de notícias) ─
        const feedResult = await parseFeed(item.url);
        let enqueuedCount = 0;
        const feedGeo = resolveCityAndState(item.metadata?.city, item.metadata?.state);

        for (const feedItem of feedResult.items.slice(0, 15)) {
          if (feedItem.link != null && feedItem.link.length > 5) {
            await supabase.from("crawl_queue").upsert(
              {
                url: feedItem.link,
                entity_type: "news",
                status: "pending",
                store_id: item.store_id || null,
                metadata: {
                  title: feedItem.title,
                  source_feed: item.url,
                  published_at: feedItem.publishedAt || null,
                  image_url: feedItem.imageUrl || null,
                  city: feedGeo.city || item.metadata?.city || null,
                  state: feedGeo.state || item.metadata?.state || null,
                  region: item.metadata?.region || null,
                },
              },
              { onConflict: "url" }
            );
            enqueuedCount++;
          }
        }

        await supabase
          .from("crawl_queue")
          .update({
            status: "completed",
            last_error: null,
            processing_error: null,
            completed_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        results.push({
          id: item.id,
          url: item.url,
          entityType: "rss",
          status: "completed",
        });

      } else if (
        entityType === "event" ||
        entityType === "events" ||
        entityType === "agenda"
      ) {
        // ── 7. EVENTOS & AGENDA CULTURAL (events) ────────────────────────
        const eventGeo = resolveCityAndState(item.metadata?.city, item.metadata?.state);
        const city = eventGeo.city || item.metadata?.city || getDefaultCity();
        const state = eventGeo.state || item.metadata?.state || getDefaultState();
        const eventRes = await harvestAndPersistEvent({
          url: item.url,
          city,
          state,
          storeId: item.store_id || undefined,
          sourceName: item.metadata?.source_name,
        });

        await supabase
          .from("crawl_queue")
          .update({
            status: eventRes.success ? "completed" : "failed",
            last_error: eventRes.error || null,
            processing_error: eventRes.error || null,
            completed_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        results.push({
          id: item.id,
          url: item.url,
          entityType: "event",
          status: eventRes.success ? "completed" : "failed",
          eventId: eventRes.eventId,
          error: eventRes.error,
        });

      } else {
        // ── 8. NOTÍCIAS & ARTIGOS HTML (news_articles) ───────────────────
        const extraction = await extractContentMechanically(item.url);
        const validation = validateMechanicalCompleteness(extraction);

        if (validation.isValid === false) {
          throw new Error(validation.reason || "Conteúdo reprovado pelo Integrity Gate");
        }

        const newsGeo = resolveCityAndState(item.metadata?.city, item.metadata?.state);
        const city = newsGeo.city || item.metadata?.city || getDefaultCity();
        const state = newsGeo.state || item.metadata?.state || getDefaultState();

        const editorial = await curateWithEditorialSquad({
          rawTitle: extraction.title,
          rawText: extraction.bodyMarkdown,
          sourceName: new URL(item.url).hostname,
          sourceUrl: item.url,
          city,
        });

        let coverUrl = extraction.coverImageUrl;
        if (coverUrl == null || (await isHealthyImageUrl(coverUrl)) === false) {
          coverUrl = getFallbackThematicImage(editorial?.category || "cidade");
        }

        const defaultStoreId = item.store_id || "5108ce27-2df1-4ce2-89f2-681fea6dba95";

        const { data: minedArticle, error: insertErr } = await supabase
          .from("mined_articles")
          .insert({
            crawl_queue_id: item.id,
            source_url: item.url,
            source_domain: new URL(item.url).hostname,
            source_type: "crawl",
            store_id: defaultStoreId,
            raw_title: extraction.title,
            ai_structured_title: editorial?.title || extraction.title,
            ai_structured_subtitle: editorial?.subtitle || extraction.lead || "",
            ai_suggested_kicker: editorial?.kicker || "Atualidade",
            ai_suggested_category: editorial?.category || "cidade",
            ai_suggested_tags: editorial?.tags || ["notícias", city.toLowerCase()],
            ai_suggested_cover_url: coverUrl,
            ai_summary: editorial?.key_takeaways?.join(" • ") || extraction.lead || "",
            quality_score: validation.qualityScore,
            quality_flags: validation.flags,
            word_count: extraction.wordCount,
            paragraph_count: extraction.paragraphCount,
            has_cover_image: Boolean(coverUrl),
            is_duplicate: false,
            status: "pending_review",
            curation_status: "pending",
            extracted_markdown: extraction.bodyMarkdown,
            ai_structured_sections: editorial?.mobile_sections || [],
            metadata: {
              crawl_queue_id: item.id,
              reading_time_minutes: editorial?.reading_time_minutes || 3,
              urgency_level: editorial?.urgency_level || "normal",
              source_attribution: editorial?.source_attribution || "",
            },
          })
          .select("id")
          .single();

        if (insertErr) {
          throw new Error(`Erro ao salvar artigo minerado: ${insertErr.message}`);
        }

        // Promoção e publicação canônica direta em news_articles
        let publishedArticleId: string | undefined;
        if (validation.isValid && validation.qualityScore >= 70) {
          const cleanTitle = (editorial?.title || extraction.title).trim();

          // Verifica se já existe em news_articles pelo source_url
          const { data: existingNews } = await supabase
            .from("news_articles")
            .select("id")
            .eq("source_url", item.url)
            .maybeSingle();

          if (existingNews?.id) {
            publishedArticleId = existingNews.id;
          } else {
            const slugBase = cleanTitle
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9]+/g, "-")
              .slice(0, 70);
            const slug = `${slugBase}-${Date.now().toString(36)}`;

            const rawSections = editorial?.mobile_sections || [];
            const sections = rawSections.length >= 2
              ? rawSections.map((s: any) => ({
                  type: s.type || "paragraph",
                  ...(s.heading ? { heading: cleanHtmlText(s.heading) } : {}),
                  content: cleanHtmlText(s.content),
                }))
              : extraction.bodyMarkdown
                  .split(/\n\n+/)
                  .filter((p) => p.trim().length > 20)
                  .map((p) => ({ type: "paragraph", content: cleanHtmlText(p.trim()) }));

            const tags = Array.from(new Set([
              editorial?.category || "cidade",
              city.toLowerCase(),
              "notícias",
              state.toLowerCase(),
              ...(editorial?.tags || []),
            ]));

            const { data: pubArticle, error: pubErr } = await supabase
              .from("news_articles")
              .insert({
                store_id: defaultStoreId,
                title: cleanTitle,
                slug,
                kicker: editorial?.kicker || "ATUALIDADE REGIONAL",
                subtitle: editorial?.subtitle || extraction.lead || null,
                content_sections: sections,
                cover_media_url: coverUrl,
                cover_media_type: "image",
                category: editorial?.category || "cidade",
                tags,
                city,
                state,
                reading_time_minutes: editorial?.reading_time_minutes || Math.max(2, Math.ceil(extraction.wordCount / 160)),
                source_url: item.url,
                source_type: "crawler",
                author_name: extraction.author || new URL(item.url).hostname,
                status: "published",
                published_at: item.metadata?.published_at || new Date().toISOString(),
                quality_score: validation.qualityScore,
                curation_status: "approved",
                ai_summary: editorial?.key_takeaways?.join(" • ") || extraction.lead || null,
                ai_keywords: editorial?.tags || [],
                mined_article_id: minedArticle?.id || null,
                crawl_queue_id: item.id,
              })
              .select("id")
              .maybeSingle();

            if (pubErr) {
              console.error("[CrawlerBatchEngine] Falha ao publicar em news_articles:", pubErr.message);
            }

            if (!pubErr && pubArticle) {
              publishedArticleId = pubArticle.id;
              if (minedArticle?.id) {
                await supabase
                  .from("mined_articles")
                  .update({
                    status: "approved",
                    curation_status: "approved",
                    published_article_id: publishedArticleId,
                  })
                  .eq("id", minedArticle.id);
              }

              // Se a matéria descreve um evento cultural, feira, show ou congresso, promove também para public.events
              if (/(show|festival|feira|exposi[çc][ãa]o|congresso|oktoberfest|agenda cultural|espet[áa]culo|campeonato)/i.test(cleanTitle)) {
                await harvestAndPersistEvent({
                  url: item.url,
                  city,
                  state,
                  storeId: defaultStoreId || undefined,
                  sourceName: new URL(item.url).hostname,
                }).catch(() => null);
              }
            }
          }
        }

        await supabase
          .from("crawl_queue")
          .update({
            status: "completed",
            last_error: null,
            processing_error: null,
            mined_article_id: minedArticle?.id || null,
            completed_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        results.push({
          id: item.id,
          url: item.url,
          entityType,
          status: "completed",
          articleId: minedArticle?.id,
          publishedArticleId,
        });
      }
    } catch (itemErr: any) {
      const errMsg = itemErr?.message || "Erro desconhecido";
      await supabase
        .from("crawl_queue")
        .update({
          status: "failed",
          last_error: errMsg.slice(0, 300),
          processing_error: errMsg.slice(0, 300),
          completed_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      results.push({
        id: item.id,
        url: item.url,
        entityType: item.entity_type,
        status: "failed",
        error: errMsg,
      });
    }
  }

  const succeeded = results.filter((r) => r.status === "completed").length;
  const failed = results.filter((r) => r.status === "failed").length;

  return {
    processed: results.length,
    succeeded,
    failed,
    items: results,
  };
}
