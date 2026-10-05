/**
 * seed-massive-crawlers.ts — Ingestão Massiva de Dezenas de Milhares de Links na Fila
 * 
 * Executa descoberta profunda de sitemaps e feeds RSS regionais para Chapecó e Santa Catarina.
 * Alimenta a tabela `crawl_queue` de forma concorrente e idempotente com deduplicação.
 * 
 * Uso: npx tsx scripts/seed-massive-crawlers.ts [--limit=5000]
 */

import fs from "fs";
import dotenv from "dotenv";

if (fs.existsSync(".env.local")) dotenv.config({ path: ".env.local" });
if (fs.existsSync(".env.secrets")) dotenv.config({ path: ".env.secrets" });
if (fs.existsSync(".env")) dotenv.config({ path: ".env" });

if (!process.env.VITE_SUPABASE_URL && process.env.SUPABASE_URL) {
  process.env.VITE_SUPABASE_URL = process.env.SUPABASE_URL;
}
if (!process.env.VITE_SUPABASE_ANON_KEY && process.env.SUPABASE_ANON_KEY) {
  process.env.VITE_SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
}

import { REGIONAL_SOURCES_CATALOG } from "../src/lib/mining/regional-sources-catalog";
import { crawlSitemapsDeep, bulkIngestToCrawlQueue } from "../src/lib/mining/sitemap-crawler.engine";
import { parseFeed } from "../src/lib/mining/rss-ingester.engine";
import { getServerClient } from "../src/lib/supabase";

async function main() {
  console.log("═".repeat(80));
  console.log("  WAESY INDUSTRIAL CRAWLER — INGESTÃO MASSIVA DE SITEMAPS E FEEDS");
  console.log("  Região: Chapecó e Grande Oeste Catarinense");
  console.log("═".repeat(80));

  const supabase = getServerClient();
  const tStart = Date.now();
  let grandTotalDiscovered = 0;
  let grandTotalEnqueued = 0;
  let grandTotalSkipped = 0;

  const verticalCounts: Record<string, number> = {};

  for (const source of REGIONAL_SOURCES_CATALOG) {
    console.log(`\n▶ Processando fonte: [${source.name}] (${source.domain})`);
    const sourceT0 = Date.now();

    // 1. Descoberta via Sitemaps XML
    let discoveredFromSitemaps: Array<{ url: string; lastmod?: string; sourceSitemap: string }> = [];
    if (source.sitemaps.length > 0) {
      console.log(`  Buscando sitemaps: ${source.sitemaps.join(", ")}`);
      try {
        const discovered = await crawlSitemapsDeep(source.sitemaps, 2000, 2);
        discoveredFromSitemaps = discovered;
        console.log(`  ✓ ${discovered.length} URLs extraídas dos sitemaps em ${Date.now() - sourceT0}ms`);
      } catch (err: unknown) {
        console.warn(`  ⚠️ Erro ao varrer sitemaps de ${source.domain}:`, err instanceof Error ? err.message : String(err));
      }
    }

    // 2. Descoberta via Feeds RSS/Atom
    const discoveredFromFeeds: Array<{ url: string; lastmod?: string; sourceSitemap: string }> = [];
    for (const feedUrl of source.rssFeeds) {
      try {
        const feed = await parseFeed(feedUrl);
        for (const item of feed.items) {
          if (item.link != null && item.link.length > 5) {
            discoveredFromFeeds.push({
              url: item.link,
              lastmod: item.publishedAt,
              sourceSitemap: feedUrl,
            });
          }
        }
        console.log(`  ✓ Feed ${feedUrl}: ${feed.items.length} itens extraídos`);
      } catch (feedErr: unknown) {
        console.warn(`  ⚠️ Feed ${feedUrl} falhou:`, feedErr instanceof Error ? feedErr.message : String(feedErr));
      }
    }

    // Combina e deduplica na memória
    const allForSource = [...discoveredFromSitemaps, ...discoveredFromFeeds];
    const uniqueMap = new Map<string, typeof allForSource[0]>();
    for (const item of allForSource) {
      if (uniqueMap.has(item.url) === false) {
        uniqueMap.set(item.url, item);
      }
    }

    const uniqueList = Array.from(uniqueMap.values());
    console.log(`  Total único para ${source.name}: ${uniqueList.length} links`);

    if (uniqueList.length > 0) {
      console.log(`  Enfileirando em crawl_queue em lotes...`);
      const ingestRes = await bulkIngestToCrawlQueue(uniqueList, {
        defaultEntityType: source.defaultEntityType,
        priorityOverride: source.priority,
        batchSize: 250,
      });

      console.log(`  ✓ Ingestão: ${ingestRes.totalEnqueued} novos | ${ingestRes.totalDuplicatesSkipped} já existiam`);
      grandTotalDiscovered += uniqueList.length;
      grandTotalEnqueued += ingestRes.totalEnqueued;
      grandTotalSkipped += ingestRes.totalDuplicatesSkipped;

      verticalCounts[source.defaultEntityType] = (verticalCounts[source.defaultEntityType] || 0) + ingestRes.totalEnqueued;
    }
  }

  // Estatísticas finais
  const { count: currentQueueTotal } = await supabase
    .from("crawl_queue")
    .select("*", { count: "exact", head: true });

  const { count: pendingQueueTotal } = await supabase
    .from("crawl_queue")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  console.log("\n" + "═".repeat(80));
  console.log("  RESUMO DA INGESTÃO MASSIVA");
  console.log("═".repeat(80));
  console.log(`• Tempo total de execução:      ${((Date.now() - tStart) / 1000).toFixed(1)}s`);
  console.log(`• Total de URLs descobertas:    ${grandTotalDiscovered}`);
  console.log(`• Total de novas URLs na fila:  ${grandTotalEnqueued}`);
  console.log(`• Duplicatas ignoradas:         ${grandTotalSkipped}`);
  console.log(`• Total geral na crawl_queue:   ${currentQueueTotal}`);
  console.log(`• Total pendente para minerar:  ${pendingQueueTotal}`);
  console.log("\n• Novas URLs por vertical:");
  for (const [vert, count] of Object.entries(verticalCounts)) {
    console.log(`  - ${vert.padEnd(16)}: ${count}`);
  }
  console.log("═".repeat(80) + "\n");
}

main().catch((err) => {
  console.error("Erro fatal na ingestão massiva:", err);
  process.exit(1);
});
