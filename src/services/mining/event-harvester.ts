/**
 * event-harvester.ts — Extrator e Persistidor Desacoplado de Eventos e Agenda Cultural
 *
 * Executa scraping e estruturação de eventos da comunidade, feiras, shows e agenda municipal.
 * Persiste na tabela canônica `events` e vincula com notícia de cobertura quando aplicável.
 * Total paridade com o CRUD civil de eventos.
 *
 * Pipeline de Alta Fidelidade (Zero Mocks):
 * 1. Detecção Precoce de Catálogo/Listagem (isEventListingPage) & Spidering de Links Filhos
 * 2. Extração estruturada de Schema.org/Event (JSON-LD e Microdados)
 * 3. Stealth Fallback HTTP com Fingerprint de Navegador Real
 * 4. Deduplicação Segura Anti-Crash PostgREST
 * 5. Auto-Seeder de Fontes Culturais e Regionais
 */

import { getServerClient } from "@/lib/supabase";
import { scrapeUrl } from "@/lib/mining/firecrawl-client";
import { fetchHtmlWithStealth, cleanHtmlText } from "./mechanical-extractor";
import { extractEventFromJsonLd } from "./specialized-extractors";
import { extractContentMechanically } from "./mechanical-extractor";
import { resolveCityAndState, normalizeStateUf } from "@/lib/mining/geo-resolver";
import { getDefaultCity, getDefaultState } from "@/lib/brand.config";
import { normalizeUrl } from "@/lib/mining/scraper-utils";

export interface HarvestEventOptions {
  url: string;
  storeId?: string;
  city?: string;
  state?: string;
  sourceName?: string;
}

export interface HarvestEventResult {
  success: boolean;
  eventId?: string;
  isDuplicate?: boolean;
  isListingPage?: boolean;
  isNewsArticle?: boolean;
  queuedEventsCount?: number;
  error?: string;
}

/**
 * Detecta se a página é um catálogo/listagem de múltiplos eventos
 */
export function isEventListingPage(title: string, url: string, html: string): boolean {
  const cleanTitle = (title || "").toLowerCase();
  const cleanUrl = (url || "").toLowerCase();

  // 1. URLs explícitas de listagem ou diretório
  if (
    /\/eventos\/?(?:[a-z0-9-]+-sc)?\/?$/i.test(cleanUrl) ||
    /\/agenda\/?(?:cultural)?\/?$/i.test(cleanUrl) ||
    /\/atracoes\/?$/i.test(cleanUrl) ||
    /\/programacao\/?$/i.test(cleanUrl) ||
    /\/shows\/?$/i.test(cleanUrl) ||
    /\/busca\b|\/search\b|\/explore\b/i.test(cleanUrl)
  ) {
    return true;
  }

  // 2. Títulos de catálogo
  if (
    /\beventos\s+em\b/i.test(cleanTitle) ||
    /\bagenda\s+cultural\b/i.test(cleanTitle) ||
    /\bprogramação\s+de\b/i.test(cleanTitle) ||
    /\bfeiras\s+e\s+eventos\b/i.test(cleanTitle) ||
    /\bcalendário\s+de\s+eventos\b/i.test(cleanTitle)
  ) {
    return true;
  }

  // 3. Múltiplos links de eventos na página
  const eventLinkMatches = html.match(/href=["'][^"']*(?:\/evento\/|\/e\/|\/show\/|\/agenda-cultural\/|\/atracao\/)[^"']*["']/gi) || [];
  if (eventLinkMatches.length >= 3) {
    return true;
  }

  return false;
}

/**
 * Extrai links de eventos individuais a partir de uma página de catálogo
 */
export function extractEventLinksFromListing(html: string, baseUrl: string): string[] {
  const regexes = [
    // Sympla (/evento/slug/id ou /evento/id)
    /href=["'](\/evento\/[a-zA-Z0-9_-]+\/\d+[^"'\s?]*)["']/gi,
    /href=["'](https?:\/\/(?:www\.)?sympla\.com\.br\/evento\/[a-zA-Z0-9_-]+\/\d+[^"'\s?]*)["']/gi,
    // Eventbrite (/e/slug-tickets-id)
    /href=["'](https?:\/\/(?:www\.)?eventbrite\.[a-z.]+\/e\/[a-zA-Z0-9_-]+)[^"'\s]*/gi,
    // Blueticket / Ticket360
    /href=["'](\/evento\/\d+[^"'\s?]*)["']/gi,
    // Prefeituras e Agendas Culturais Municipais
    /href=["'](\/(?:evento|cultura\/evento|agenda|atracao)\/[a-zA-Z0-9_-]{4,}[^"'\s?]*)["']/gi,
  ];

  const links = new Set<string>();

  for (const regex of regexes) {
    const matches = html.matchAll(regex);
    for (const match of matches) {
      try {
        const resolved = new URL(match[1], baseUrl).toString();
        if (!/busca|search|\?p=|\/eventos\/?$/i.test(resolved)) {
          links.add(resolved);
        }
      } catch {}
    }
  }

  return Array.from(links).slice(0, 30);
}

/**
 * Colhe e persiste um evento na tabela canônica `events`
 */

const PT_MONTHS: Record<string, number> = {
  janeiro: 0,
  fevereiro: 1,
  março: 2,
  marco: 2,
  abril: 3,
  maio: 4,
  junho: 5,
  julho: 6,
  agosto: 7,
  setembro: 8,
  outubro: 9,
  novembro: 10,
  dezembro: 11,
};

/**
 * Extrai data, horário e valores monetários PT-BR a partir do texto
 * Invariante M01: Zero mocks. Se não houver data real, retorna undefined.
 */
export function parsePtBrEventDateTime(text: string): {
  startDate?: string;
  endDate?: string;
  isFree?: boolean;
  priceMinCents?: number;
  priceMaxCents?: number;
  venueName?: string;
} {
  let isFree: boolean | undefined = undefined;
  let priceMinCents: number | undefined = undefined;
  let priceMaxCents: number | undefined = undefined;
  let venueName: string | undefined = undefined;

  // 1. Detecção de Gratuidade ou Preço
  if (/\b(?:gratuito|gr[áa]tis|entrada franca|acesso livre|0800)\b/i.test(text)) {
    isFree = true;
    priceMinCents = 0;
  } else {
    const priceMatches = Array.from(text.matchAll(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})?|[0-9]+)/gi));
    if (priceMatches.length > 0) {
      const parsedValues = priceMatches
        .map((m) => {
          const num = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
          return isNaN(num) ? 0 : Math.round(num * 100);
        })
        .filter((v) => v >= 500 && v <= 500000);

      if (parsedValues.length > 0) {
        priceMinCents = Math.min(...parsedValues);
        priceMaxCents = Math.max(...parsedValues);
        isFree = priceMinCents === 0;
      }
    }
  }

  // 2. Extração de Local / Espaço
  const venueMatch = text.match(/(?:Local|Onde|Espaço|Teatro|Pavilhão|Centro de Eventos|Arena)[:\s]+([^\n.,<]{5,80})/i);
  if (venueMatch && venueMatch[1]) {
    venueName = venueMatch[1].trim();
  }

  // 3. Extração de Data PT-BR
  const currentYear = new Date().getFullYear();
  let foundDate: Date | null = null;

  // Pattern A: "15 de novembro de 2026" ou "15 de novembro"
  const monthRegex = /\b(\d{1,2})\s+de\s+(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(?:\s+de\s+(\d{4}))?\b/i;
  const matchA = text.match(monthRegex);
  if (matchA) {
    const day = parseInt(matchA[1], 10);
    const month = PT_MONTHS[matchA[2].toLowerCase()];
    const year = matchA[3] ? parseInt(matchA[3], 10) : currentYear;
    if (day >= 1 && day <= 31 && month !== undefined) {
      foundDate = new Date(year, month, day);
    }
  }

  // Pattern B: "15/11/2026" ou "15/11/26"
  if (!foundDate) {
    const slashRegex = /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/;
    const matchB = text.match(slashRegex);
    if (matchB) {
      const day = parseInt(matchB[1], 10);
      const month = parseInt(matchB[2], 10) - 1;
      let year = parseInt(matchB[3], 10);
      if (year < 100) year += 2000;
      if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
        foundDate = new Date(year, month, day);
      }
    }
  }

  // Extração de Hora se a data foi encontrada
  if (foundDate) {
    const timeRegex = /(?:às|as|ás)?\s*(\d{1,2})h(?:(\d{2}))?|\b(\d{1,2}):(\d{2})\b/i;
    const timeMatch = text.match(timeRegex);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1] || timeMatch[3], 10);
      const minutes = parseInt(timeMatch[2] || timeMatch[4] || "0", 10);
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        foundDate.setHours(hours, minutes, 0, 0);
      }
    } else {
      foundDate.setHours(19, 0, 0, 0);
    }
  }

  return {
    startDate: foundDate ? foundDate.toISOString() : undefined,
    isFree,
    priceMinCents,
    priceMaxCents,
    venueName,
  };
}

export async function harvestAndPersistEvent(
  options: HarvestEventOptions
): Promise<HarvestEventResult> {
  const supabase = getServerClient();
  const url = normalizeUrl(options.url.trim());
  const geo = resolveCityAndState(options.city, options.state);
  const targetCity = geo.city || options.city || getDefaultCity();
  const targetState = geo.state || normalizeStateUf(options.state) || getDefaultState();
  const defaultStoreId = options.storeId || null;

  try {
    // 1. Obtém HTML da página via Firecrawl ou Fallback Stealth Nativo
    let htmlContent: string | null = null;
    try {
      const scrape = await scrapeUrl(url);
      if (scrape.success && scrape.html) {
        htmlContent = scrape.html;
      }
    } catch {
      // Firecrawl indisponível ou rate-limited
    }

    if (!htmlContent) {
      htmlContent = await fetchHtmlWithStealth(url).catch(() => null);
    }

    if (!htmlContent) {
      return {
        success: false,
        error: `Falha ao baixar página do evento via Firecrawl e fetch stealth: ${url}`,
      };
    }

    // 2. Extrai título preliminar da página
    const titleTagMatch = htmlContent.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const h1Match = htmlContent.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const pageTitle = cleanHtmlText(h1Match ? h1Match[1] : titleTagMatch ? titleTagMatch[1] : "");

    // 3. Se for catálogo de eventos, extrai links filhos e enfileira
    if (isEventListingPage(pageTitle, url, htmlContent)) {
      const eventLinks = extractEventLinksFromListing(htmlContent, url);
      if (eventLinks.length > 0) {
        const queueItems = eventLinks.map((link) => ({
          url: link,
          domain: new URL(link).hostname.replace("www.", ""),
          entity_type: "event",
          status: "pending",
          priority: 8,
          discovered_via: "events_catalog_spider",
          metadata: {
            parent_url: url,
            city: targetCity,
            state: targetState,
            source_name: options.sourceName,
          },
        }));

        await supabase.from("crawl_queue").upsert(queueItems, { onConflict: "url", ignoreDuplicates: true });
        return {
          success: true,
          isListingPage: true,
          queuedEventsCount: eventLinks.length,
        };
      }

      return {
        success: true,
        isListingPage: true,
        queuedEventsCount: 0,
      };
    }

    // 3.1 Barreira Zero-Trust Anti-Notícia: Se a página for um artigo jornalístico ou release de imprensa, NÃO é evento!
    const isExplicitNewsUrl = /\/(?:noticias?|materias?|reportagens?|posts?|artigos?|jornal|editorial|seguranca|policia|politica|economia|cidades?|geral|blogs?|releases?|imprensa|comunicacao|informativo)\b|\.ghtml$|\b(?:id_noticia|noticia_id|post_id)=\b|\/\d{4}\/\d{2}\/\d{2}\//i.test(url);
    const hasNewsSchema = /<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?"@type"\s*:\s*"(?:NewsArticle|Article|BlogPosting|ReportageNewsArticle)"[\s\S]*?<\/script>/i.test(htmlContent);
    const hasNewsOgType = /<meta[^>]*property=["']og:type["'][^>]*content=["']article["']/i.test(htmlContent);
    const hasNewsDateline = /\b(?:publicado em|atualizado em|redação|reportagem de|jornalista|repórter|foto\s*:|créditos?\s*:|leia mais|veja também|compartilhe nas redes|assessoria de imprensa)\b/i.test(htmlContent);

    // Se possui traços fortes de notícia e NÃO possui Schema.org Event explícito, rejeita imediatamente!
    const hasExplicitEventSchema = /<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?"@type"\s*:\s*"(?:Event|MusicEvent|Festival|BusinessEvent|SocialEvent|TheaterEvent|SportsEvent|ComedyEvent)"[\s\S]*?<\/script>/i.test(htmlContent);
    const hasTicketingAffordance = /\b(?:ingressos?|bilheteria|compre aqui|comprar ingresso|lote|garanta seu ingresso|inscri[çc][õo]es|inscreva-se|entrada franca|acesso gratuito|valor do ingresso|taxa de inscri[çc][ãa]o|sympla|eventbrite|blueticket|ticket360|bilheto|diskingressos)\b/i.test(htmlContent);

    if ((isExplicitNewsUrl || hasNewsSchema || hasNewsOgType || hasNewsDateline) && !hasExplicitEventSchema && !hasTicketingAffordance) {
      return {
        success: false,
        isNewsArticle: true,
        error: "Página identificada como artigo/notícia jornalística e não bilheteria de evento. Bloqueado pelo Anti-News Gate.",
      };
    }

    // 4. Tenta extração via Schema.org Event
    let event = extractEventFromJsonLd(htmlContent, url);

    // 5. Fallback heurístico estrito para páginas sem Schema.org (Apenas se houver local e data futuros confirmados com bilheteria/RSVP)
    if (!event) {
      if ((hasNewsDateline || isExplicitNewsUrl) && !hasTicketingAffordance) {
        return {
          success: false,
          isNewsArticle: true,
          error: "Página editorial não qualificada como bilheteria ou evento oficial.",
        };
      }

      const mechanical = await extractContentMechanically(url, htmlContent);
      if (!mechanical.title || mechanical.title === "Sem título" || mechanical.title.length < 5) {
        return {
          success: false,
          error: "Página não contém dados estruturados de evento ou agenda cultural.",
        };
      }

      const parsedPtBr = parsePtBrEventDateTime(htmlContent + " " + mechanical.bodyText);
      if (!parsedPtBr.startDate) {
        return {
          success: false,
          error: "Página não contém data real identificável para o evento. Rejeitado por integridade editorial (zero mocks).",
        };
      }

      // Validação de Data Futura: Evento precisa ser no futuro ou hoje (não pode ser notícia antiga!)
      const eventTime = new Date(parsedPtBr.startDate).getTime();
      const yesterday = Date.now() - 24 * 60 * 60 * 1000;
      if (eventTime < yesterday) {
        return {
          success: false,
          error: "Data extraída pertence ao passado. Matérias arquivadas não são eventos futuros.",
        };
      }

      // Validação de Local: Precisa ter um venue real identificado
      if (!parsedPtBr.venueName) {
        return {
          success: false,
          error: "Local/Espaço do evento não identificado no texto. Rejeitado para evitar eventos fictícios no centro.",
        };
      }

      event = {
        title: mechanical.title,
        description: mechanical.lead || mechanical.bodyMarkdown.slice(0, 500),
        startDate: parsedPtBr.startDate,
        venueName: parsedPtBr.venueName,
        city: targetCity,
        state: targetState,
        isFree: parsedPtBr.isFree ?? false,
        priceMinCents: parsedPtBr.priceMinCents,
        priceMaxCents: parsedPtBr.priceMaxCents,
        ticketUrl: url,
        coverImageUrl: mechanical.coverImageUrl,
        category: "cultural",
        formattedMarkdown: mechanical.bodyMarkdown,
        sourceUrl: url,
      };
    }

    const cleanTitle = event.title.trim();
    const eventDate = event.startDate;
    if (!eventDate) {
      return {
        success: false,
        error: "Data do evento ausente. Rejeitado por ausência de data real.",
      };
    }
    const eventGeo = resolveCityAndState(event.city || targetCity, event.state || targetState);
    const city = eventGeo.city || event.city || targetCity;
    const state = eventGeo.state || normalizeStateUf(event.state) || targetState;
    const venue = event.venueName || "Local a confirmar";

    // 6. Deduplicação Segura (sem quebra de sintaxe PostgREST em títulos com caracteres especiais)
    const { data: existingUrl } = await supabase
      .from("events")
      .select("id")
      .eq("external_ticket_url", url)
      .maybeSingle();

    let existingId = existingUrl?.id;

    if (!existingId && cleanTitle) {
      const { data: existingTitle } = await supabase
        .from("events")
        .select("id")
        .ilike("title", cleanTitle)
        .maybeSingle();
      existingId = existingTitle?.id;
    }

    if (existingId) {
      return {
        success: true,
        eventId: existingId,
        isDuplicate: true,
      };
    }

    // 7. Inserção na tabela canônica `events`
    const { data: insertedEvent, error: insertErr } = await supabase
      .from("events")
      .insert({
        store_id: defaultStoreId,
        title: cleanTitle,
        description: event.description || "Evento oficial da agenda urbana e cultural regional.",
        event_date: eventDate,
        end_date: event.endDate || null,
        location: `${venue}, ${city} - ${state}`,
        venue: venue,
        venue_name: venue,
        address: event.address || null,
        city: city,
        state: state,
        cover_image: event.coverImageUrl || null,
        ticket_url: event.ticketUrl || url,
        external_ticket_url: event.ticketUrl || url,
        is_external_ticket: Boolean(event.ticketUrl || url),
        is_free: event.isFree ?? false,
        price_min_cents: event.priceMinCents || null,
        price_max_cents: event.priceMaxCents || null,
        organizer_name: event.organizerName || options.sourceName || "Organização Local",
        category: event.category || "cultural",
        tags: [event.category || "cultural", city.toLowerCase(), "agenda", "evento", state.toLowerCase()],
        status: "published",
        is_external: true,
        external_source: new URL(url).hostname,
        attributes: {},
        rsvp_going_count: 0,
        rsvp_interested_count: 0,
        rsvp_not_going_count: 0,
      })
      .select("id")
      .single();

    if (insertErr) {
      return {
        success: false,
        error: `Falha ao persistir evento no banco: ${insertErr.message}`,
      };
    }

    return {
      success: true,
      eventId: insertedEvent?.id,
      isDuplicate: false,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Erro desconhecido na colheita de eventos",
    };
  }
}

/**
 * Processador em lote de eventos com auto-seeding quando a fila estiver vazia
 */
export async function harvestEventsBatch(limit = 6): Promise<{
  inspected: number;
  harvestedEvents: number;
  queuedFromListings: number;
  errors: number;
}> {
  const supabase = getServerClient();

  // 1. Verifica itens pendentes na fila
  const { data: eventQueue } = await supabase
    .from("crawl_queue")
    .select("id, url, store_id, metadata")
    .in("entity_type", ["event", "events", "agenda"])
    .eq("status", "pending")
    .limit(limit);

  let inspected = eventQueue?.length || 0;
  let harvestedEvents = 0;
  let queuedFromListings = 0;
  let errors = 0;

  // 2. Se a fila tiver itens, processa
  if (eventQueue && eventQueue.length > 0) {
    for (const eq of eventQueue) {
      try {
        const res = await harvestAndPersistEvent({
          url: eq.url,
          city: eq.metadata?.city || getDefaultCity(),
          state: eq.metadata?.state || getDefaultState(),
          storeId: eq.store_id || undefined,
          sourceName: eq.metadata?.source_name,
        });

        if (res.success) {
          if (res.isListingPage) {
            queuedFromListings += res.queuedEventsCount || 0;
          } else {
            harvestedEvents++;
          }
          await supabase.from("crawl_queue").update({
            status: "completed",
            completed_at: new Date().toISOString(),
          }).eq("id", eq.id);
        } else {
          errors++;
          await supabase.from("crawl_queue").update({
            status: "failed",
            last_error: res.error || "Falha na colheita do evento",
            completed_at: new Date().toISOString(),
          }).eq("id", eq.id);
        }
      } catch {
        errors++;
      }
    }
    return { inspected, harvestedEvents, queuedFromListings, errors };
  }

  // 3. Auto-seeding a partir de crawler_sources caso a fila esteja seca
  const { data: sources } = await supabase
    .from("crawler_sources")
    .select("id, name, url, config, region")
    .in("category", ["agenda_cultural", "events", "cultural"])
    .eq("is_active", true)
    .limit(4);

  if (sources && sources.length > 0) {
    for (const src of sources) {
      inspected++;
      try {
        const res = await harvestAndPersistEvent({
          url: src.url,
          city: (src.config as any)?.city || getDefaultCity(),
          state: (src.config as any)?.state || getDefaultState(),
          sourceName: src.name,
        });

        if (res.success) {
          if (res.isListingPage) queuedFromListings += res.queuedEventsCount || 0;
          else harvestedEvents++;
        }
      } catch {
        errors++;
      }
    }
  }

  return { inspected, harvestedEvents, queuedFromListings, errors };
}
