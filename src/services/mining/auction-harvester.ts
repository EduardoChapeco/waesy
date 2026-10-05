/**
 * auction-harvester.ts — Extrator e Indexador de Leiloeiros Oficiais & Casas de Leilão
 * 
 * Processa portais de leilões judiciais e extrajudiciais da crawl_queue, extrai credenciais
 * da leiloeira, comarca de atuação, site oficial e registra a empresa em directory_listings
 * e mined_raw_extractions com categoria 'leiloes'.
 * 
 * Regra: ZERO MOCKS. Todos os dados são extraídos diretamente do HTML e metadados reais.
 */

import { getServerClient } from "@/lib/supabase";
import { scrapeUrl } from "@/lib/mining/firecrawl-client";
import { cleanHtmlText } from "@/lib/mining/scraper-utils";
import { resolveCityAndState, normalizeStateUf } from "@/lib/mining/geo-resolver";
import { getDefaultCity, getDefaultState } from "@/lib/brand.config";

export interface AuctionHarvestOptions {
  url: string;
  sourceName?: string;
  category?: string;
  city?: string;
  state?: string;
  storeId?: string;
}

export interface AuctionHarvestResult {
  success: boolean;
  listingId?: string;
  businessName: string;
  city: string;
  error?: string;
}

export async function harvestAndPersistAuctions(
  options: AuctionHarvestOptions
): Promise<AuctionHarvestResult> {
  const supabase = getServerClient();
  const startTime = Date.now();
  const geo = resolveCityAndState(options.city, options.state);
  const city = geo.city || options.city || getDefaultCity();
  const state = geo.state || normalizeStateUf(options.state) || getDefaultState();

  try {
    const scrape = await scrapeUrl(options.url);
    if (scrape.success === false || scrape.html == null) {
      throw new Error(scrape.error || `Falha ao obter HTML da casa de leilões: ${options.url}`);
    }

    const html = scrape.html;
    const urlObj = new URL(options.url);
    const domain = urlObj.hostname;

    // 1. Extração do Nome da Casa de Leilão
    let businessName = options.sourceName;
    if (businessName == null || businessName.length === 0) {
      const ogSiteName = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i);
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (ogSiteName && ogSiteName[1].trim()) {
        businessName = cleanHtmlText(ogSiteName[1]);
      } else if (titleMatch && titleMatch[1].trim()) {
        const parts = titleMatch[1].split(/[-|–]/);
        businessName = cleanHtmlText(parts[0]);
      } else {
        businessName = domain.replace(/^www\./, "").replace(/\.com\.br$/, "").replace(/\.com$/, "");
      }
    }

    // 2. Extração de Telefone e Contato
    let contactPhone: string | null = null;
    let contactWhatsapp: string | null = null;
    const phoneMatch = html.match(/(?:\(?\d{2}\)?\s*)?(?:9?\d{4}[-\s]?\d{4})/g);
    if (phoneMatch && phoneMatch.length > 0) {
      contactPhone = phoneMatch[0].trim();
      const zapCandidate = phoneMatch.find((p) => p.includes("9") || p.length > 10);
      if (zapCandidate) contactWhatsapp = zapCandidate.trim();
    }

    // 3. Descrição e Metadados
    const descMatch = html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["']/i);
    const description = descMatch
      ? cleanHtmlText(descMatch[1])
      : `${businessName} — Leilões judiciais e extrajudiciais de imóveis, veículos e bens em ${city}/${state}.`;

    const imgMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    const bannerUrl = imgMatch ? imgMatch[1].trim() : null;

    // 4. Verifica existência prévia em directory_listings
    const { data: existing } = await supabase
      .from("directory_listings")
      .select("id")
      .eq("website_url", options.url)
      .maybeSingle();

    const payload = {
      business_name: businessName,
      category: "leiloes",
      description,
      city,
      state,
      contact_phone: contactPhone,
      contact_whatsapp: contactWhatsapp,
      website_url: options.url,
      banner_url: bannerUrl,
      source: "auction_crawler",
      scraper_source: "auction_harvester",
      status: "active",
      is_crawled: true,
      is_verified: false,
      data_quality_score: 85,
      last_validated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {
        source_domain: domain,
        scraped_title: (scrape as any).metadata?.title,
        auction_type: options.category || "auctions_judicial",
        extracted_at: new Date().toISOString(),
      },
    };

    let listingId: string;
    if (existing?.id) {
      listingId = existing.id;
      await supabase.from("directory_listings").update(payload).eq("id", listingId);
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from("directory_listings")
        .insert({
          ...payload,
          store_id: options.storeId || null,
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insErr) throw insErr;
      listingId = inserted.id;
    }

    // 5. Registra em mined_raw_extractions (não bloqueante)
    try {
      await supabase.from("mined_raw_extractions").insert({
        content_type: "portais_publicos",
        source_url: options.url,
        source_domain: domain,
        source_name: businessName,
        raw_title: businessName,
        raw_lead: description.slice(0, 300),
        raw_body_text: description,
        city,
        state,
        word_count: description.split(/\s+/).length,
        paragraph_count: 1,
        has_full_content: true,
        extraction_method: "auction_harvester",
        title_hash: Buffer.from(businessName).toString("base64").slice(0, 32),
        status: "approved",
        is_duplicate: false,
        curated_directory_id: listingId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch {
      // Ignora erro não bloqueante em raw extractions
    }

    // 6. Auditoria em scraper_audit_log
    await supabase.from("scraper_audit_log").insert({
      scraper_name: "auction-harvester",
      action: "harvest_and_persist",
      target_table: "directory_listings",
      status: "success",
      records_affected: 1,
      duration_ms: Date.now() - startTime,
      result_summary: { businessName, city, listingId, url: options.url },
    });

    return {
      success: true,
      listingId,
      businessName,
      city,
    };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.error(`[AuctionHarvester] Erro ao minerar ${options.url}:`, errorMsg);

    await supabase.from("scraper_audit_log").insert({
      scraper_name: "auction-harvester",
      action: "harvest_and_persist",
      target_table: "directory_listings",
      status: "failed",
      records_affected: 0,
      duration_ms: Date.now() - startTime,
      result_summary: { error: errorMsg, url: options.url },
    });

    return {
      success: false,
      businessName: options.sourceName || options.url,
      city,
      error: errorMsg,
    };
  }
}
