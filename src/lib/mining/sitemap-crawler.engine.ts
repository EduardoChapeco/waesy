/**
 * sitemap-crawler.engine.ts — Motor Industrial de Ingestão e Descoberta em Massa de URLs
 * 
 * Capaz de processar sitemaps XML complexos, índices recursivos (<sitemapindex>)
 * e enfileirar dezenas de milhares de links diretamente na crawl_queue com deduplicação.
 * 
 * Regra DL-04: Proibido uso de negação unária (!ident) para conformidade com design-lint.
 */

import { getServerClient } from "@/lib/supabase";
import { canonicalizeUrl } from "./url-canonicalizer";
import { classifyMinedEntity } from "./intent-classifier.engine";
import { globalCrawlerCircuitBreaker } from "./crawler-circuit-breaker";

export interface DiscoveredUrl {
  url: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
  sourceSitemap: string;
}

export interface SitemapParseResult {
  isSitemapIndex: boolean;
  childSitemaps: string[];
  urls: DiscoveredUrl[];
}

export interface IngestQueueOptions {
  batchSize?: number;
  priorityOverride?: number;
  defaultEntityType?: string;
  storeId?: string;
}

export interface IngestQueueResult {
  totalProcessed: number;
  totalEnqueued: number;
  totalDuplicatesSkipped: number;
  errors: string[];
}

/**
 * Faz fetch seguro de conteúdo XML de Sitemap com headers anti-bloqueio
 */
export async function fetchSitemapXml(sitemapUrl: string): Promise<string | null> {
  const domain = new URL(sitemapUrl).hostname;

  try {
    const response = await globalCrawlerCircuitBreaker.execute(
      () =>
        fetch(sitemapUrl, {
          headers: {
            "User-Agent": "WaesyDeepCrawler/2.0 (+https://usewaesy.com; bot@usewaesy.com)",
            "Accept": "application/xml, text/xml, */*",
          },
          signal: AbortSignal.timeout(15000),
        }),
      domain
    );

    if (response.ok === false) {
      console.warn(`[SitemapCrawler] HTTP ${response.status} ao buscar sitemap: ${sitemapUrl}`);
      return null;
    }

    return await response.text();
  } catch (err: unknown) {
    console.warn(`[SitemapCrawler] Falha de rede para ${sitemapUrl}:`, err instanceof Error ? err.message : String(err));
    return null;
  }
}

/**
 * Parser determinístico e resiliente de XML de Sitemap (compatível com <sitemapindex> e <urlset>)
 */
export function parseSitemapXml(xmlText: string, sitemapUrl: string): SitemapParseResult {
  const isSitemapIndex = /<sitemapindex[\s>]/i.test(xmlText);
  const childSitemaps: string[] = [];
  const urls: DiscoveredUrl[] = [];

  if (isSitemapIndex) {
    const sitemapMatches = xmlText.matchAll(/<sitemap>([\s\S]*?)<\/sitemap>/gi);
    for (const match of sitemapMatches) {
      const locMatch = match[1].match(/<loc>\s*([^<\s]+)\s*<\/loc>/i);
      if (locMatch != null && locMatch[1].length > 5) {
        childSitemaps.push(locMatch[1].trim());
      }
    }
    return { isSitemapIndex: true, childSitemaps, urls: [] };
  }

  // <urlset> padrão
  const urlMatches = xmlText.matchAll(/<url>([\s\S]*?)<\/url>/gi);
  for (const match of urlMatches) {
    const block = match[1];
    const locMatch = block.match(/<loc>\s*([^<\s]+)\s*<\/loc>/i);
    if (locMatch == null || locMatch[1].length === 0) continue;

    const rawUrl = locMatch[1].trim();
    const lastmodMatch = block.match(/<lastmod>\s*([^<\s]+)\s*<\/lastmod>/i);
    const changefreqMatch = block.match(/<changefreq>\s*([^<\s]+)\s*<\/changefreq>/i);
    const priorityMatch = block.match(/<priority>\s*([^<\s]+)\s*<\/priority>/i);

    const canonical = canonicalizeUrl(rawUrl);
    if (canonical == null || canonical.length === 0) continue;

    urls.push({
      url: canonical,
      lastmod: lastmodMatch != null ? lastmodMatch[1].trim() : undefined,
      changefreq: changefreqMatch != null ? changefreqMatch[1].trim() : undefined,
      priority: priorityMatch != null ? parseFloat(priorityMatch[1].trim()) : undefined,
      sourceSitemap: sitemapUrl,
    });
  }

  return { isSitemapIndex: false, childSitemaps: [], urls };
}

/**
 * Varredura recursiva de Sitemaps com limite configurável
 */
export async function crawlSitemapsDeep(
  entrySitemaps: string[],
  maxTotalUrls = 10000,
  maxDepth = 3
): Promise<DiscoveredUrl[]> {
  const discoveredMap = new Map<string, DiscoveredUrl>();
  const visitedSitemaps = new Set<string>();
  const sitemapQueue: Array<{ url: string; depth: number }> = entrySitemaps.map((u) => ({ url: u, depth: 1 }));

  while (sitemapQueue.length > 0 && discoveredMap.size < maxTotalUrls) {
    const current = sitemapQueue.shift();
    if (current == null) break;
    if (visitedSitemaps.has(current.url)) continue;
    visitedSitemaps.add(current.url);

    const xml = await fetchSitemapXml(current.url);
    if (xml == null || xml.length === 0) continue;

    const parsed = parseSitemapXml(xml, current.url);

    if (parsed.isSitemapIndex && current.depth < maxDepth) {
      for (const child of parsed.childSitemaps) {
        if (visitedSitemaps.has(child) === false) {
          sitemapQueue.push({ url: child, depth: current.depth + 1 });
        }
      }
    } else {
      for (const item of parsed.urls) {
        if (discoveredMap.has(item.url) === false) {
          discoveredMap.set(item.url, item);
          if (discoveredMap.size >= maxTotalUrls) break;
        }
      }
    }
  }

  return Array.from(discoveredMap.values());
}

/**
 * Ingestão de URLs descobertas na crawl_queue do Supabase em lotes otimizados
 */
export async function bulkIngestToCrawlQueue(
  urls: DiscoveredUrl[],
  options: IngestQueueOptions = {}
): Promise<IngestQueueResult> {
  const supabase = getServerClient();
  const batchSize = options.batchSize || 200;
  let totalEnqueued = 0;
  let totalDuplicatesSkipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < urls.length; i += batchSize) {
    const chunk = urls.slice(i, i + batchSize);

    // Classifica polimorficamente cada link antes da inserção
    const rowsToUpsert = await Promise.all(
      chunk.map(async (u) => {
        let entityType = options.defaultEntityType;
        if (entityType == null) {
          try {
            const classified = await classifyMinedEntity(u.url, {});
            entityType = classified.entityType;
          } catch {
            entityType = "news";
          }
        }

        let domain = "unknown";
        try {
          domain = new URL(u.url).hostname;
        } catch {
          domain = "unknown";
        }

        return {
          url: u.url,
          domain,
          entity_type: entityType,
          status: "pending",
          priority: options.priorityOverride || 3,
          store_id: options.storeId || null,
          metadata: {
            sitemap_source: u.sourceSitemap,
            lastmod: u.lastmod || null,
            changefreq: u.changefreq || null,
            sitemap_priority: u.priority || null,
            discovered_at: new Date().toISOString(),
          },
        };
      })
    );

    try {
      const { data, error } = await supabase
        .from("crawl_queue")
        .upsert(rowsToUpsert, { onConflict: "url", ignoreDuplicates: true })
        .select("id");

      if (error != null) {
        errors.push(`Erro no lote ${i}-${i + chunk.length}: ${error.message}`);
      } else {
        const count = data?.length || 0;
        totalEnqueued += count;
        totalDuplicatesSkipped += chunk.length - count;
      }
    } catch (batchErr: unknown) {
      errors.push(`Exceção no lote ${i}: ${batchErr instanceof Error ? batchErr.message : String(batchErr)}`);
    }
  }

  return {
    totalProcessed: urls.length,
    totalEnqueued,
    totalDuplicatesSkipped,
    errors,
  };
}
