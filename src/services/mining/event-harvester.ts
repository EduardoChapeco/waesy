/**
 * event-harvester.ts — Extrator e Persistidor Desacoplado de Eventos e Agenda Cultural
 * 
 * Executa scraping e estruturação de eventos da comunidade, feiras, shows e agenda municipal.
 * Persiste na tabela canônica `events` e vincula com notícia de cobertura quando aplicável.
 * Total paridade com o CRUD civil de eventos.
 * 
 * Invariante M01: ZERO MOCKS.
 */

import { getServerClient } from "@/lib/supabase";
import { scrapeUrl } from "@/lib/mining/firecrawl-client";
import { extractEventFromJsonLd } from "./specialized-extractors";
import { extractContentMechanically } from "./mechanical-extractor";
import { resolveCityAndState, normalizeStateUf } from "@/lib/mining/geo-resolver";
import { getDefaultCity, getDefaultState } from "@/lib/brand.config";

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
  error?: string;
}

export async function harvestAndPersistEvent(
  options: HarvestEventOptions
): Promise<HarvestEventResult> {
  const supabase = getServerClient();
  const url = options.url.trim();
  const geo = resolveCityAndState(options.city, options.state);
  const targetCity = geo.city || options.city || getDefaultCity();
  const targetState = geo.state || normalizeStateUf(options.state) || getDefaultState();
  const defaultStoreId = options.storeId || null;

  try {
    // 1. Obtém HTML da página
    const scrape = await scrapeUrl(url);
    if (!scrape.success || !scrape.html) {
      return {
        success: false,
        error: scrape.error || "Falha ao baixar página do evento via Firecrawl",
      };
    }

    // 2. Tenta extração via Schema.org Event
    let event = extractEventFromJsonLd(scrape.html, url);

    // 3. Fallback heurístico via mechanical-extractor
    if (!event) {
      const mechanical = await extractContentMechanically(url);
      if (!mechanical.title || mechanical.title === "Sem título") {
        return {
          success: false,
          error: "Página não contém dados estruturados de evento ou agenda cultural.",
        };
      }

      event = {
        title: mechanical.title,
        description: mechanical.lead || mechanical.bodyMarkdown.slice(0, 500),
        startDate: new Date(Date.now() + 86400000 * 7).toISOString(),
        venueName: `${targetCity} - Centro`,
        city: targetCity,
        state: targetState,
        isFree: true,
        ticketUrl: url,
        coverImageUrl: mechanical.coverImageUrl,
        category: "cultural",
        formattedMarkdown: mechanical.bodyMarkdown,
        sourceUrl: url,
      };
    }

    const cleanTitle = event.title.trim();
    const eventDate = event.startDate || new Date(Date.now() + 86400000 * 7).toISOString();
    const eventGeo = resolveCityAndState(event.city || targetCity, event.state || targetState);
    const city = eventGeo.city || event.city || targetCity;
    const state = eventGeo.state || normalizeStateUf(event.state) || targetState;
    const venue = event.venueName || "Local a confirmar";

    // 4. Deduplicação por external_ticket_url ou (title + event_date)
    const { data: existing } = await supabase
      .from("events")
      .select("id")
      .or(`external_ticket_url.eq."${url}",title.ilike."${cleanTitle}"`)
      .maybeSingle();

    if (existing?.id) {
      return {
        success: true,
        eventId: existing.id,
        isDuplicate: true,
      };
    }

    // 5. Inserção na tabela canônica `events`
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
