/**
 * automated-harvest.ts — Motor de Mineração e Curadoria Automatizada com Agendamento Determinístico
 * 
 * Pipeline:
 * 1. Descoberta de URLs via Feeds RSS e Sitemaps de Portais Locais e Nacionais
 * 2. Idempotência e Deduplicação via Hash SHA-256 da URL canônica no banco (Zero Desperdício de Tokens)
 * 3. Extração Mecânica em 4 Camadas (Text Density Extractor + JSON-LD NewsArticle / @graph)
 * 4. Curadoria Editorial com Squad Especializado em Jornalismo (Pirâmide Invertida, Lead 5W1H, Neutralidade)
 * 5. Promoção e Publicação Canônica em news_articles com Telemetria em scraper_audit_log
 */

import crypto from "crypto";
import { getServerClient } from "@/lib/supabase";
import { extractContentMechanically, type MechanicalExtractionResult } from "./mechanical-extractor";
import { validateMechanicalCompleteness, generateTitleHash, isHealthyImageUrl } from "./integrity-gate";
import { curateWithEditorialSquad } from "./editorial-squad";
import { parseFeed } from "@/lib/mining/rss-ingester.engine";
import { getDefaultCity, getDefaultState } from "@/lib/brand.config";
import { resolveCityAndState, normalizeStateUf } from "@/lib/mining/geo-resolver";

export interface AutomatedHarvestOptions {
  storeId?: string;
  city?: string;
  state?: string;
  maxItems?: number;
  feedUrls?: string[];
  forceRefresh?: boolean;
}

export interface AutomatedHarvestReport {
  success: boolean;
  totalDiscovered: number;
  totalSkippedDuplicate: number;
  totalExtracted: number;
  totalCurated: number;
  totalPublished: number;
  tokensSavedEstimate: number;
  articles: Array<{
    id: string;
    title: string;
    slug: string;
    sourceUrl: string;
    published: boolean;
  }>;
  durationMs: number;
  error?: string;
}

/** Feeds canônicos de notícias regionais e estaduais com alto índice de factualidade */
const CANONICAL_NEWS_FEEDS = [
  "https://g1.globo.com/dynamo/sc/santa-catarina/rss2.xml",
  "https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml",
  "https://clicrdc.com.br/feed/",
  "https://www.diariodigital.com.br/rss",
];

/**
 * Normaliza e gera hash determinístico SHA-256 para URL canônica
 */
export function hashCanonicalUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    // Remove parâmetros de rastreamento de marketing (utm, fbclid, gclid)
    const cleanParams = new URLSearchParams();
    parsed.searchParams.forEach((val, key) => {
      if (!key.startsWith("utm_") && key !== "fbclid" && key !== "gclid" && key !== "ref") {
        cleanParams.set(key, val);
      }
    });
    parsed.search = cleanParams.toString();
    parsed.hash = "";
    const cleanUrl = parsed.toString().toLowerCase();
    return crypto.createHash("sha256").update(cleanUrl).digest("hex");
  } catch {
    return crypto.createHash("sha256").update(rawUrl.trim().toLowerCase()).digest("hex");
  }
}

/**
 * Executa a colheita automatizada de notícias com deduplicação rigorosa e curadoria de alta qualidade
 */
export async function executeAutomatedNewsHarvest(
  options: AutomatedHarvestOptions = {}
): Promise<AutomatedHarvestReport> {
  const startTime = Date.now();
  const supabase = getServerClient();
  const maxItems = options.maxItems || 10;
  const geo = resolveCityAndState(options.city, options.state);
  const targetCity = geo.city || options.city || getDefaultCity();
  const targetState = geo.state || normalizeStateUf(options.state) || getDefaultState();
  const feedsToScrape = options.feedUrls && options.feedUrls.length > 0 ? options.feedUrls : CANONICAL_NEWS_FEEDS;

  const report: AutomatedHarvestReport = {
    success: true,
    totalDiscovered: 0,
    totalSkippedDuplicate: 0,
    totalExtracted: 0,
    totalCurated: 0,
    totalPublished: 0,
    tokensSavedEstimate: 0,
    articles: [],
    durationMs: 0,
  };

  try {
    // 1. Coletar URLs candidatas a partir dos feeds RSS
    const candidateUrls: Array<{ url: string; titleHint?: string; feedSource: string }> = [];

    for (const feedUrl of feedsToScrape) {
      try {
        const feedResult = await parseFeed(feedUrl);
        if (feedResult && feedResult.items) {
          for (const item of feedResult.items) {
            if (item.link && item.link.startsWith("http")) {
              candidateUrls.push({
                url: item.link,
                titleHint: item.title,
                feedSource: feedResult.title || new URL(feedUrl).hostname,
              });
            }
          }
        }
      } catch (feedErr) {
        console.warn(`[automated-harvest] Falha ao ler feed ${feedUrl}:`, feedErr);
      }
    }

    report.totalDiscovered = candidateUrls.length;
    if (candidateUrls.length === 0) {
      report.durationMs = Date.now() - startTime;
      return report;
    }

    // 2. Processar itens respeitando o limite maxItems e verificando deduplicação SHA-256
    let processedCount = 0;

    for (const candidate of candidateUrls) {
      if (processedCount >= maxItems) break;

      const urlHash = hashCanonicalUrl(candidate.url);

      // Verificação de Idempotência no banco:
      // Verifica se a URL ou seu hash já constam em mined_raw_extractions ou news_articles
      if (!options.forceRefresh) {
        const [existingExtraction, existingArticle] = await Promise.all([
          supabase
            .from("mined_raw_extractions")
            .select("id")
            .or(`source_url.eq."${candidate.url}",title_hash.eq."${urlHash}"`)
            .maybeSingle(),
          supabase
            .from("news_articles")
            .select("id")
            .eq("source_url", candidate.url)
            .maybeSingle(),
        ]);

        if (existingExtraction.data || existingArticle.data) {
          report.totalSkippedDuplicate++;
          // Economia estimada de 3.000 tokens que seriam gastos com re-leitura e curadoria
          report.tokensSavedEstimate += 3000;
          continue;
        }
      }

      // 3. Extração Mecânica em 4 Camadas (Zero Tokens de IA)
      let extraction: MechanicalExtractionResult;
      try {
        extraction = await extractContentMechanically(candidate.url);
      } catch (extractErr) {
        console.warn(`[automated-harvest] Falha na extração mecânica de ${candidate.url}:`, extractErr);
        continue;
      }

      report.totalExtracted++;
      // Tokens de IA economizados pelo parser mecânico de HTML/JSON-LD
      report.tokensSavedEstimate += Math.round(extraction.bodyText.length / 4);

      // 4. Portão de Integridade e Completude Mecânica
      const completeness = validateMechanicalCompleteness(extraction);
      if (!completeness.isValid) {
        console.warn(`[automated-harvest] Matéria rejeitada por incompletude (${candidate.url}):`, completeness.reason);
        continue;
      }

      // 5. Gravação da extração bruta em mined_raw_extractions
      const titleHash = generateTitleHash(extraction.title);
      const { data: rawRecord } = await supabase
        .from("mined_raw_extractions")
        .insert({
          content_type: extraction.contentType || "noticia",
          source_url: candidate.url,
          source_domain: new URL(candidate.url).hostname.replace("www.", ""),
          source_name: extraction.author || candidate.feedSource,
          raw_title: extraction.title,
          raw_lead: extraction.lead,
          raw_body_text: extraction.bodyText,
          cover_image_url: extraction.coverImageUrl,
          gallery_images: extraction.galleryImages,
          city: targetCity,
          state: targetState,
          word_count: extraction.wordCount,
          paragraph_count: extraction.paragraphCount,
          extraction_method: extraction.method,
          title_hash: titleHash,
          status: "ready_for_curation",
          store_id: options.storeId || null,
        })
        .select()
        .single();

      // 6. Curadoria pelo Squad Editorial com Diretrizes Jornalísticas Rígidas
      let curatedArticle;
      try {
        curatedArticle = await curateWithEditorialSquad({
          rawTitle: extraction.title,
          rawText: extraction.bodyText,
          sourceName: extraction.author || candidate.feedSource,
          sourceUrl: candidate.url,
          city: targetCity,
        });
      } catch (curateErr) {
        console.warn(`[automated-harvest] Falha na curadoria editorial de ${candidate.url}:`, curateErr);
        continue;
      }

      report.totalCurated++;

      // 7. Publicação em news_articles
      const slug = `${curatedArticle.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString().slice(-6)}`;
      const coverMediaUrl = isHealthyImageUrl(extraction.coverImageUrl)
        ? extraction.coverImageUrl
        : null;

      const { data: publishedArticle, error: pubError } = await supabase
        .from("news_articles")
        .insert({
          store_id: options.storeId || "00000000-0000-0000-0000-000000000000",
          title: curatedArticle.title,
          slug,
          kicker: curatedArticle.kicker,
          subtitle: curatedArticle.subtitle,
          content_sections: curatedArticle.mobile_sections,
          cover_media_url: coverMediaUrl,
          cover_media_type: "image",
          category: curatedArticle.category,
          tags: curatedArticle.tags,
          city: targetCity,
          state: targetState,
          reading_time_minutes: curatedArticle.reading_time_minutes || 3,
          source_url: candidate.url,
          author_name: extraction.author || candidate.feedSource,
          status: "published",
          published_at: new Date().toISOString(),
        })
        .select("id, title, slug")
        .single();

      if (pubError) {
        console.error("[automated-harvest] Erro ao publicar matéria em news_articles:", pubError);
      } else if (publishedArticle) {
        report.totalPublished++;
        report.articles.push({
          id: publishedArticle.id,
          title: publishedArticle.title,
          slug: publishedArticle.slug,
          sourceUrl: candidate.url,
          published: true,
        });

        // Vincula a matéria minerada à notícia publicada
        if (rawRecord?.id) {
          await supabase
            .from("mined_raw_extractions")
            .update({
              status: "curated",
              curated_article_id: publishedArticle.id,
              curated_at: new Date().toISOString(),
            })
            .eq("id", rawRecord.id);
        }
      }

      processedCount++;
    }

    // 8. Registro de Telemetria e FinOps em scraper_audit_log (schema real)
    const { error: auditErr } = await supabase.from("scraper_audit_log").insert({
      scraper_name: "automated_news_harvester_v2",
      action: "news_harvest",
      status: "success",
      items_found: report.totalDiscovered,
      items_extracted: report.totalExtracted,
      items_processed: report.totalDiscovered,
      items_inserted: report.totalPublished,
      tokens_saved: report.tokensSavedEstimate,
      duration_ms: Date.now() - startTime,
      metadata: { skipped_duplicates: report.totalSkippedDuplicate },
    });
    if (auditErr) console.warn("[automated-harvest] Falha ao gravar auditoria:", auditErr.message);

  } catch (err: any) {
    console.error("[automated-harvest] Erro geral na esteira de mineração:", err);
    report.success = false;
    report.error = err.message || String(err);
  }

  report.durationMs = Date.now() - startTime;
  return report;
}
