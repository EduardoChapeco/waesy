/**
 * places-harvester.ts — Harvester de Estabelecimentos Locais & Empresas (Places / Maps)
 * 
 * Engenharia Reversa baseada em:
 * - gosom/google-maps-scraper
 * - Mahanaicoach/google-maps-scraper-kit
 * - OpenStreetMap Nominatim & Overpass Geo Engine (100% livre de custos)
 * 
 * Missão:
 * Enriquecer directory_listings e gerar Ghost Stores locais (empresas pré-cadastradas)
 * para prospecção B2B e vitrine urbana instantânea com ZERO custos de APIs pagas do Google.
 */

import { getServerClient, getAnonServerClient } from "@/lib/supabase";
import { getRandomUserAgent, cleanHtmlText, isDomainInCooldown, setDomainCooldown, sleep } from "@/lib/mining/scraper-utils";
import { globalCrawlerCircuitBreaker } from "@/lib/mining/crawler-circuit-breaker";
import { resolveCityAndState, normalizeStateUf } from "@/lib/mining/geo-resolver";
import { getDefaultCity, getDefaultState } from "@/lib/brand.config";

export interface HarvestedPlace {
  businessName: string;
  category: string;
  address: string;
  neighborhood?: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  contactPhone?: string;
  contactWhatsapp?: string;
  websiteUrl?: string;
  rating?: number;
  reviewsCount?: number;
  workingHours?: Record<string, string>;
  source: string;
}

export interface PlacesHarvestResult {
  success: boolean;
  totalFound: number;
  totalInserted: number;
  totalUpdated: number;
  places: HarvestedPlace[];
  error?: string;
}

/**
 * Normaliza categorias de estabelecimentos para a taxonomia padrão da Waesy
 */
export function normalizePlaceCategory(rawCategory: string): string {
  const lower = rawCategory.toLowerCase();
  if (lower.includes("restaurante") || lower.includes("lanchonete") || lower.includes("pizzaria") || lower.includes("bar") || lower.includes("hamburguer")) {
    return "gastronomia";
  }
  if (lower.includes("hotel") || lower.includes("pousada") || lower.includes("resort") || lower.includes("hostel")) {
    return "hospedagem";
  }
  if (lower.includes("academia") || lower.includes("fitness") || lower.includes("crossfit") || lower.includes("esporte")) {
    return "saude_esporte";
  }
  if (lower.includes("mercado") || lower.includes("supermercado") || lower.includes("mercearia") || lower.includes("padaria")) {
    return "mercado_alimentos";
  }
  if (lower.includes("farmacia") || lower.includes("drogaria") || lower.includes("clinica") || lower.includes("hospital") || lower.includes("dentista")) {
    return "saude";
  }
  if (lower.includes("advoc") || lower.includes("jurid") || lower.includes("contabil") || lower.includes("imobili")) {
    return "servicos_profissionais";
  }
  if (lower.includes("oficina") || lower.includes("mecanica") || lower.includes("auto") || lower.includes("posto")) {
    return "automotivo";
  }
  if (lower.includes("loja") || lower.includes("moda") || lower.includes("calcado") || lower.includes("roupa")) {
    return "comercio_varejo";
  }
  return "geral";
}

const CITY_BBOX_MAP: Record<string, [number, number, number, number]> = {
  "chapeco": [-27.16, -52.70, -27.04, -52.55],
  "chapeco-sc": [-27.16, -52.70, -27.04, -52.55],
  "xanxere": [-26.90, -52.45, -26.83, -52.35],
  "concordia": [-27.26, -52.05, -27.19, -51.98],
  "sao-miguel-do-oeste": [-26.75, -53.55, -26.68, -53.48],
};

/**
 * Consulta direta à Overpass API do OpenStreetMap por Bounding Box urbana
 * Alta taxa de sucesso, dados de estabelecimentos comerciais reais e coordenadas exatas.
 */
export async function queryOverpassPlaces(
  query: string,
  city?: string,
  state?: string,
  limit: number = 30
): Promise<HarvestedPlace[]> {
  const resolvedGeo = resolveCityAndState(city, state);
  const targetCity = resolvedGeo.city;
  if (!targetCity) {
    return [];
  }
  const targetState = resolvedGeo.state || normalizeStateUf(state) || getDefaultState();

  const normCity = targetCity.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");
  const bbox = CITY_BBOX_MAP[normCity];
  if (!bbox) {
    return [];
  }
  const [south, west, north, east] = bbox;

  const ql = `[out:json][timeout:20];(node["amenity"](${south},${west},${north},${east});node["shop"](${south},${west},${north},${east}););out body ${limit};`;
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(ql)}`;

  try {
    const response = await globalCrawlerCircuitBreaker.execute(
      () =>
        fetch(url, {
          headers: {
            "User-Agent": "WaesyPlacesHarvester/2.0 (+https://usewaesy.com; contato@usewaesy.com)",
          },
          signal: AbortSignal.timeout(15000),
        }),
      "overpass-api.de"
    );

    if (response.ok === false) {
      return [];
    }

    const json = await response.json();
    const elements = Array.isArray(json?.elements) ? json.elements : [];

    const results: HarvestedPlace[] = [];
    for (const e of elements) {
      if (e.tags == null || e.tags.name == null) continue;
      const tags = e.tags;
      const street = tags["addr:street"] || tags.street || "";
      const houseNumber = tags["addr:housenumber"] ? `, ${tags["addr:housenumber"]}` : "";
      const address = street.length > 0 ? `${street}${houseNumber}` : `${tags.name}, ${city}`;
      const neighborhood = tags["addr:suburb"] || tags["addr:neighbourhood"] || undefined;
      const phone = tags.phone || tags["contact:phone"] || undefined;
      const whatsapp = tags["contact:whatsapp"] || tags.whatsapp || undefined;
      const website = tags.website || tags["contact:website"] || undefined;
      const rawCat = tags.amenity || tags.shop || tags.cuisine || query;

      results.push({
        businessName: String(tags.name).trim(),
        category: normalizePlaceCategory(rawCat),
        address,
        neighborhood,
        city: targetCity,
        state: targetState,
        latitude: Number(e.lat),
        longitude: Number(e.lon),
        contactPhone: phone,
        contactWhatsapp: whatsapp,
        websiteUrl: website,
        workingHours: tags.opening_hours ? { raw: tags.opening_hours } : undefined,
        source: "openstreetmap_overpass",
      });
    }

    return results;
  } catch (err: unknown) {
    console.warn("[PlacesHarvester] Overpass query falhou, alternando para Nominatim:", err instanceof Error ? err.message : String(err));
    return [];
  }
}

/**
 * Consulta geocodificação e locais via OpenStreetMap Nominatim (Gratuito e público)
 */
export async function queryNominatimPlaces(query: string, city: string = "Chapecó", state?: string): Promise<HarvestedPlace[]> {
  const domain = "nominatim.openstreetmap.org";
  const cooldown = isDomainInCooldown(domain);
  if (cooldown.inCooldown) {
    console.warn(`[PlacesHarvester] Nominatim em cooldown (${cooldown.remainingSeconds}s restantes). Usando fallback regional.`);
    return [];
  }

  const resolved = resolveCityAndState(city, state);
  const targetCity = resolved.city || city || getDefaultCity();
  const targetState = resolved.state || normalizeStateUf(state);

  const searchQuery = targetState
    ? `${query}, ${targetCity}, ${targetState}, Brasil`
    : `${query}, ${targetCity}, Brasil`;
  const url = `https://${domain}/search?q=${encodeURIComponent(searchQuery)}&format=json&addressdetails=1&limit=20`;

  try {
    const response = await globalCrawlerCircuitBreaker.execute(
      () =>
        fetch(url, {
          headers: {
            "User-Agent": "WaesyLocalEngine/1.0 (+https://usewaesy.com; dev@usewaesy.com)",
            "Accept-Language": "pt-BR,pt;q=0.9",
          },
          signal: AbortSignal.timeout(12000),
        }),
      domain
    );

    if (response.status === 429) {
      console.warn(`[PlacesHarvester] Nominatim retornou HTTP 429 (Rate Limit). Ativando cooldown de 60s.`);
      setDomainCooldown(domain, 60000, "rate_limit_429", 429);
      return [];
    }

    if (response.ok === false) {
      console.warn(`[PlacesHarvester] Nominatim retornou status ${response.status}`);
      return [];
    }

    const data = await response.json();
    if (Array.isArray(data) === false) return [];

    return data.map((item: any) => {
      const addr = item.address || {};
      const street = addr.road || addr.pedestrian || addr.street || "";
      const houseNumber = addr.house_number ? `, ${addr.house_number}` : "";
      const fullAddress = street ? `${street}${houseNumber}` : item.display_name.split(",")[0];
      const neighborhood = addr.suburb || addr.neighbourhood || addr.city_district || "";
      const placeCity = addr.city || addr.town || addr.municipality || targetCity;
      const placeState = normalizeStateUf(addr.state) || targetState || "";

      return {
        businessName: item.name || item.display_name.split(",")[0],
        category: normalizePlaceCategory(item.type || item.class || query),
        address: fullAddress,
        neighborhood: neighborhood || undefined,
        city: placeCity,
        state: placeState,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        rating: item.extratags?.rating ? parseFloat(item.extratags.rating) : undefined,
        reviewsCount: item.extratags?.reviews ? parseInt(item.extratags.reviews, 10) : 0,
        source: "openstreetmap_nominatim",
      };
    });
  } catch (err: unknown) {
    console.warn("[PlacesHarvester] Falha ao consultar Nominatim:", err instanceof Error ? err.message : String(err));
    return [];
  }
}

/**
 * Fallback regional: retorna lista vazia quando Nominatim não responde.
 * M01: Proibido retornar dados sintéticos em produção.
 * A UI deve exibir empty state honesto e permitir nova tentativa.
 */
export function generateCuratedLocalPlaces(_query: string, _city?: string, _state?: string): HarvestedPlace[] {
  console.warn("[PlacesHarvester] Nominatim indisponível. Empty state ativado — nenhum dado sintético será injetado.");
  return [];
}

/**
 * Harvester principal de lugares: Busca em fontes públicas, normaliza e persiste em directory_listings
 */
export async function harvestAndPersistPlaces(params: {
  query: string;
  city?: string;
  state?: string;
  storeId?: string;
  authorProfileId?: string;
}): Promise<PlacesHarvestResult> {
  const resolvedGeo = resolveCityAndState(params.city, params.state);
  const city = resolvedGeo.city || params.city || getDefaultCity();
  const state = resolvedGeo.state || normalizeStateUf(params.state);
  const startTime = Date.now();

  // 1. Tentar Overpass API (rápido e rico em dados comerciais), com fallback para Nominatim
  let places = state ? await queryOverpassPlaces(params.query, city, state) : [];
  if (places.length === 0) {
    places = await queryNominatimPlaces(params.query, city, state);
  }

  const supabase = getServerClient();
  let totalInserted = 0;
  let totalUpdated = 0;

  try {
    for (const place of places) {
      // Checa duplicidade por nome + cidade
      const { data: existing } = await supabase
        .from("directory_listings")
        .select("id")
        .eq("business_name", place.businessName)
        .eq("city", place.city)
        .maybeSingle();

      const payload = {
        business_name: place.businessName,
        category: place.category,
        address: place.address,
        neighborhood: place.neighborhood || null,
        city: place.city,
        state: place.state || state || "",
        latitude: place.latitude,
        longitude: place.longitude,
        contact_phone: place.contactPhone || null,
        contact_whatsapp: place.contactWhatsapp || null,
        website_url: place.websiteUrl || null,
        rating: place.rating ? Number(place.rating) : null,
        reviews_count: place.reviewsCount ? Number(place.reviewsCount) : 0,
        working_hours: place.workingHours || {},
        is_verified: false,
        is_crawled: true,
        source: place.source,
        scraper_source: "places_harvester",
        status: "active",
        data_quality_score: 85,
        last_validated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (existing?.id) {
        await supabase
          .from("directory_listings")
          .update(payload)
          .eq("id", existing.id);
        totalUpdated++;
      } else {
        await supabase
          .from("directory_listings")
          .insert({
            ...payload,
            store_id: params.storeId || null,
            author_profile_id: params.authorProfileId || null,
            created_at: new Date().toISOString(),
          });
        totalInserted++;
      }
    }

    // Registra telemetria em scraper_audit_log
    await supabase.from("scraper_audit_log").insert({
      scraper_name: `Places Harvester [${params.query} - ${city}]`,
      url: `places://${encodeURIComponent(params.query)}/${city}`,
      status: "completed",
      items_found: places.length,
      execution_time_ms: Date.now() - startTime,
      created_at: new Date().toISOString(),
    });

    return {
      success: true,
      totalFound: places.length,
      totalInserted,
      totalUpdated,
      places,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await supabase.from("scraper_audit_log").insert({
      scraper_name: `Places Harvester [${params.query} - ${city}]`,
      url: `places://${encodeURIComponent(params.query)}/${city}`,
      status: "failed",
      items_found: 0,
      error_details: errorMsg,
      execution_time_ms: Date.now() - startTime,
      created_at: new Date().toISOString(),
    });

    return {
      success: false,
      totalFound: 0,
      totalInserted: 0,
      totalUpdated: 0,
      places: [],
      error: errorMsg,
    };
  }
}
