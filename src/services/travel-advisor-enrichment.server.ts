/**
 * Motor de Enriquecimento Público e Contexto Completo para o Consultor de Viagens IA.
 * Server-only (.server.ts): nunca importar estaticamente em componentes React cliente.
 */
import type {
  FlightSegmentDTO,
  HotelDTO,
  ItineraryDayDTO,
  PricingBreakdownDTO,
  TravelProposalDTO,
  TravelProposalOptionDTO,
} from "./travel-proposal.functions";
import { getActiveSecretForProvider } from "./secret-vault.functions";

const PUBLIC_FETCH_USER_AGENT = "WaesyTravelAdvisor/1.0 (+https://waesy.com.br)";
const DEFAULT_HTTP_TIMEOUT_MS = 3200;

export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface HotelLookupTarget {
  rawHotelName: string;
  coreHotelName: string;
  destinationCity: string;
  explicitWebsiteUrl?: string;
}

export interface HotelPublicLocationInfo {
  found: boolean;
  resolvedName?: string;
  identifiedCity?: string;
  identifiedState?: string;
  neighborhood?: string;
  road?: string;
  fullAddress?: string;
  distanceToCityCenterKm?: number;
  websiteUrl?: string;
  lat?: number;
  lon?: number;
}

export interface WebsiteExtractedInfo {
  url: string;
  title?: string;
  description?: string;
  schemaSummary?: string;
  excerpt?: string;
  sourceMethod: "firecrawl" | "direct_fetch";
}

export interface SeasonWeatherSummary {
  destinationCity: string;
  mode: "forecast" | "historical_same_period";
  periodLabel: string;
  avgMaxTempC?: number;
  avgMinTempC?: number;
  rainyDaysCount?: number;
  totalDaysSampled?: number;
  summaryText: string;
}

export interface PublicTravelAdvisorDossier {
  hotelTarget: HotelLookupTarget | null;
  hotelLocation: HotelPublicLocationInfo | null;
  visitedWebsite: WebsiteExtractedInfo | null;
  wikipediaSummaries: Array<{ topic: string; title: string; extract: string; url?: string }>;
  weatherSummary: SeasonWeatherSummary | null;
  formattedPromptSection: string;
}

/** Validação anti-SSRF estrita para qualquer URL visitada pelo backend em runtime. */
export function isSafePublicHttpUrl(rawUrl: string | undefined | null): string | null {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    if (parsed.username || parsed.password) return null;

    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (!host || !host.includes(".")) return null;
    if (
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      host.endsWith(".home.arpa")
    ) {
      return null;
    }

    if (isPrivateOrReservedIp(host)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function isPrivateOrReservedIp(host: string): boolean {
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;
  }
  if (host === "::1" || host === "::" || /^(fc|fd|fe80):/i.test(host)) {
    return true;
  }
  return false;
}

/** Normaliza nome do hotel preservando nome principal caso venha com submarca/rede (ex: "Portal Beach Hotel - Rede Soberano"). */
export function normalizeHotelLookupName(rawName: string): { rawHotelName: string; coreHotelName: string } {
  const rawHotelName = rawName.replace(/\s+/g, " ").trim();
  const segments = rawHotelName.split(/\s+[-–|•/]\s+/);
  const firstSegment = segments[0]?.trim() || rawHotelName;
  const coreHotelName = firstSegment.length >= 5 ? firstSegment : rawHotelName;
  return { rawHotelName, coreHotelName };
}

/** Extrai o hotel principal e sua cidade de referência da opção selecionada ou da proposta. */
export function extractHotelLookupTarget(
  proposal: TravelProposalDTO,
  currentOptionId?: string,
): HotelLookupTarget | null {
  const options = Array.isArray(proposal.options) ? proposal.options : [];
  const activeOption =
    (currentOptionId ? options.find((opt) => opt.id === currentOptionId) : undefined) ||
    options.find((opt) => opt.is_recommended) ||
    options[0];

  const primaryHotel: HotelDTO | undefined =
    activeOption?.hotels?.[0] || proposal.hotels?.[0];

  const candidateName =
    activeOption?.hotel_name?.trim() ||
    primaryHotel?.hotel_name?.trim() ||
    "";

  const isGenericName =
    !candidateName ||
    /^(hotel selecionado|hotel exclusivo|hospedagem selecionada|a definir)$/i.test(candidateName);

  const destinationCity =
    primaryHotel?.destination?.trim() ||
    proposal.destination_city?.trim() ||
    proposal.destination?.trim() ||
    "";

  if (isGenericName && !destinationCity) return null;

  const { rawHotelName, coreHotelName } = isGenericName
    ? { rawHotelName: "", coreHotelName: "" }
    : normalizeHotelLookupName(candidateName);

  const hotelAny = primaryHotel as Record<string, any> | undefined;
  const customFields = (proposal.custom_fields || {}) as Record<string, any>;
  const explicitWebsiteUrl =
    isSafePublicHttpUrl(hotelAny?.website) ||
    isSafePublicHttpUrl(hotelAny?.website_url) ||
    isSafePublicHttpUrl(hotelAny?.url) ||
    isSafePublicHttpUrl(customFields.hotel_website) ||
    isSafePublicHttpUrl(customFields.hotel_url) ||
    undefined;

  return {
    rawHotelName,
    coreHotelName,
    destinationCity,
    explicitWebsiteUrl,
  };
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

function sanitizeUntrustedSnippet(text: string, maxLength = 1200): string {
  let cleaned = "";
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    cleaned += code <= 0x1f || code === 0x7f ? " " : text[i];
  }
  return cleaned.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

async function fetchJsonSafe(
  url: string,
  fetchImpl: FetchLike,
  headers: Record<string, string> = {},
  timeoutMs = DEFAULT_HTTP_TIMEOUT_MS,
): Promise<any | null> {
  try {
    const res = await fetchImpl(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": PUBLIC_FETCH_USER_AGENT,
        ...headers,
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function lookupHotelLocationViaNominatim(
  target: HotelLookupTarget,
  fetchImpl: FetchLike = fetch,
): Promise<HotelPublicLocationInfo | null> {
  if (!target.coreHotelName && !target.destinationCity) return null;

  const cityCenterPromise = target.destinationCity
    ? fetchJsonSafe(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(target.destinationCity)}&format=jsonv2&addressdetails=1&limit=1`,
        fetchImpl,
      )
    : Promise.resolve(null);

  const queries = target.coreHotelName
    ? Array.from(
        new Set(
          [
            target.destinationCity ? `${target.coreHotelName} ${target.destinationCity}` : target.coreHotelName,
            target.destinationCity && target.rawHotelName !== target.coreHotelName
              ? `${target.rawHotelName} ${target.destinationCity}`
              : "",
            target.coreHotelName,
          ].filter(Boolean),
        ),
      )
    : [];

  let hotelHit: any = null;
  for (const query of queries) {
    const list = await fetchJsonSafe(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=jsonv2&addressdetails=1&extratags=1&namedetails=1&limit=3`,
      fetchImpl,
    );
    if (Array.isArray(list) && list.length > 0) {
      const preferred =
        list.find(
          (item) =>
            item.category === "tourism" ||
            item.type === "hotel" ||
            item.type === "resort" ||
            item.type === "guest_house" ||
            Boolean(item.extratags?.website || item.extratags?.url),
        ) || list[0];
      if (preferred) {
        hotelHit = preferred;
        break;
      }
    }
  }

  const cityList = await cityCenterPromise;
  const cityHit = Array.isArray(cityList) && cityList.length > 0 ? cityList[0] : null;

  if (!hotelHit) {
    if (!cityHit) return null;
    const cityAddr = cityHit.address || {};
    return {
      found: false,
      identifiedCity: cityAddr.city || cityAddr.town || cityAddr.municipality || target.destinationCity,
      identifiedState: cityAddr.state || undefined,
      fullAddress: cityHit.display_name || undefined,
    };
  }

  const addr = hotelHit.address || {};
  const extras = hotelHit.extratags || {};
  const lat = Number(hotelHit.lat);
  const lon = Number(hotelHit.lon);
  const cityLat = Number(cityHit?.lat);
  const cityLon = Number(cityHit?.lon);

  let distanceToCityCenterKm: number | undefined;
  if (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    Number.isFinite(cityLat) &&
    Number.isFinite(cityLon)
  ) {
    const dist = haversineKm(lat, lon, cityLat, cityLon);
    if (dist <= 120) {
      distanceToCityCenterKm = dist;
    }
  }

  const websiteUrl =
    isSafePublicHttpUrl(extras.website) ||
    isSafePublicHttpUrl(extras.url) ||
    isSafePublicHttpUrl(extras["contact:website"]) ||
    undefined;

  return {
    found: true,
    resolvedName: hotelHit.name || hotelHit.namedetails?.name || target.coreHotelName,
    identifiedCity:
      addr.city || addr.town || addr.municipality || addr.village || target.destinationCity || undefined,
    identifiedState: addr.state || undefined,
    neighborhood:
      addr.suburb || addr.neighbourhood || addr.quarter || addr.city_district || undefined,
    road: addr.road || addr.street || undefined,
    fullAddress: hotelHit.display_name ? sanitizeUntrustedSnippet(hotelHit.display_name, 300) : undefined,
    distanceToCityCenterKm,
    websiteUrl,
    lat: Number.isFinite(lat) ? lat : undefined,
    lon: Number.isFinite(lon) ? lon : undefined,
  };
}

async function discoverWebsiteViaWikidata(
  query: string,
  fetchImpl: FetchLike,
): Promise<string | undefined> {
  if (!query) return undefined;
  const searchJson = await fetchJsonSafe(
    `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&language=pt&uselang=pt&format=json&limit=3`,
    fetchImpl,
  );
  const results = Array.isArray(searchJson?.search) ? searchJson.search : [];
  for (const item of results) {
    if (!item?.id) continue;
    const desc = String(item.description || "").toLowerCase();
    const isLodgingOrBrand =
      desc.includes("hotel") ||
      desc.includes("resort") ||
      desc.includes("pousada") ||
      desc.includes("hospitality") ||
      desc.includes("hoteis") ||
      desc.includes("hotéis");
    if (!isLodgingOrBrand && results.length > 1) continue;

    const entityJson = await fetchJsonSafe(
      `https://www.wikidata.org/wiki/Special:EntityData/${encodeURIComponent(item.id)}.json`,
      fetchImpl,
    );
    const websiteClaim =
      entityJson?.entities?.[item.id]?.claims?.P856?.[0]?.mainsnak?.datavalue?.value;
    const safeUrl = isSafePublicHttpUrl(websiteClaim);
    if (safeUrl) return safeUrl;
  }
  return undefined;
}

async function lookupWikipediaTopics(
  topics: string[],
  fetchImpl: FetchLike,
): Promise<Array<{ topic: string; title: string; extract: string; url?: string }>> {
  const uniqueTopics = Array.from(new Set(topics.map((t) => t.trim()).filter((t) => t.length >= 3))).slice(0, 3);
  const results: Array<{ topic: string; title: string; extract: string; url?: string }> = [];

  await Promise.all(
    uniqueTopics.map(async (topic) => {
      const searchJson = await fetchJsonSafe(
        `https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&srlimit=1&utf8=1&format=json`,
        fetchImpl,
      );
      const hitTitle = searchJson?.query?.search?.[0]?.title;
      if (!hitTitle) return;

      const summaryJson = await fetchJsonSafe(
        `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(hitTitle.replace(/ /g, "_"))}`,
        fetchImpl,
      );
      const extract = summaryJson?.extract ? sanitizeUntrustedSnippet(summaryJson.extract, 650) : "";
      if (!extract) return;

      results.push({
        topic,
        title: summaryJson.title || hitTitle,
        extract,
        url: summaryJson?.content_urls?.desktop?.page || undefined,
      });
    }),
  );

  return results;
}

function extractHtmlSignals(html: string): {
  title?: string;
  description?: string;
  schemaSummary?: string;
  excerpt?: string;
} {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? sanitizeUntrustedSnippet(decodeBasicEntities(titleMatch[1]), 160) : undefined;

  const metaDescMatch =
    html.match(/<meta[^>]+(?:name=["']description["']|property=["']og:description["'])[^>]+content=["']([\s\S]*?)["'][^>]*>/i) ||
    html.match(/<meta[^>]+content=["']([\s\S]*?)["'][^>]+(?:name=["']description["']|property=["']og:description["'])[^>]*>/i);
  const description = metaDescMatch
    ? sanitizeUntrustedSnippet(decodeBasicEntities(metaDescMatch[1]), 420)
    : undefined;

  const schemaParts: string[] = [];
  const jsonLdMatches = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const match of jsonLdMatches) {
    try {
      const parsed = JSON.parse(match[1]);
      const nodes = collectSchemaNodes(parsed);
      for (const node of nodes) {
        const typeStr = Array.isArray(node["@type"]) ? node["@type"].join(",") : String(node["@type"] || "");
        if (!/(Hotel|LodgingBusiness|Resort|Hostel|Place|LocalBusiness)/i.test(typeStr)) continue;
        if (node.name) schemaParts.push(`Nome: ${sanitizeUntrustedSnippet(String(node.name), 120)}`);
        if (node.address && typeof node.address === "object") {
          const addrText = [
            node.address.streetAddress,
            node.address.addressLocality,
            node.address.addressRegion,
            node.address.postalCode,
          ]
            .filter(Boolean)
            .join(", ");
          if (addrText) schemaParts.push(`Endereço: ${sanitizeUntrustedSnippet(addrText, 220)}`);
        }
        if (node.checkinTime) schemaParts.push(`Check-in: ${sanitizeUntrustedSnippet(String(node.checkinTime), 40)}`);
        if (node.checkoutTime) schemaParts.push(`Check-out: ${sanitizeUntrustedSnippet(String(node.checkoutTime), 40)}`);
        if (node.starRating?.ratingValue) {
          schemaParts.push(`Categoria: ${node.starRating.ratingValue} estrelas`);
        }
        if (Array.isArray(node.amenityFeature) && node.amenityFeature.length > 0) {
          const amenities = node.amenityFeature
            .map((a: any) => a?.name || a?.value)
            .filter(Boolean)
            .slice(0, 10)
            .join(", ");
          if (amenities) schemaParts.push(`Comodidades no site: ${sanitizeUntrustedSnippet(amenities, 320)}`);
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks on third-party sites
    }
  }

  const strippedText = html
    .replace(/<(script|style|noscript|svg|iframe|header|footer|nav)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  const cleanText = sanitizeUntrustedSnippet(decodeBasicEntities(strippedText), 1400);

  return {
    title,
    description,
    schemaSummary: schemaParts.length > 0 ? schemaParts.join(" | ") : undefined,
    excerpt: cleanText || undefined,
  };
}

function collectSchemaNodes(input: any): any[] {
  if (!input || typeof input !== "object") return [];
  if (Array.isArray(input)) return input.flatMap(collectSchemaNodes);
  if (Array.isArray(input["@graph"])) return input["@graph"].flatMap(collectSchemaNodes);
  return [input];
}

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

export async function visitWebsiteAndExtractInfo(
  rawUrl: string | undefined | null,
  options: { firecrawlApiKey?: string | null; fetchImpl?: FetchLike } = {},
): Promise<WebsiteExtractedInfo | null> {
  const safeUrl = isSafePublicHttpUrl(rawUrl);
  if (!safeUrl) return null;

  const fetchImpl = options.fetchImpl || fetch;

  if (options.firecrawlApiKey) {
    try {
      const fcRes = await fetchImpl("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${options.firecrawlApiKey}`,
        },
        body: JSON.stringify({
          url: safeUrl,
          formats: ["markdown"],
          onlyMainContent: true,
        }),
        signal: AbortSignal.timeout(DEFAULT_HTTP_TIMEOUT_MS),
      });
      if (fcRes.ok) {
        const fcJson = await fcRes.json();
        const markdown = typeof fcJson?.data?.markdown === "string" ? fcJson.data.markdown : "";
        if (markdown.trim()) {
          return {
            url: safeUrl,
            title: fcJson?.data?.metadata?.title
              ? sanitizeUntrustedSnippet(String(fcJson.data.metadata.title), 160)
              : undefined,
            description: fcJson?.data?.metadata?.description
              ? sanitizeUntrustedSnippet(String(fcJson.data.metadata.description), 400)
              : undefined,
            excerpt: sanitizeUntrustedSnippet(markdown, 1500),
            sourceMethod: "firecrawl",
          };
        }
      }
    } catch {
      // Fallback transparently to safe direct fetch
    }
  }

  try {
    const res = await fetchImpl(safeUrl, {
      headers: {
        "User-Agent": PUBLIC_FETCH_USER_AGENT,
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(DEFAULT_HTTP_TIMEOUT_MS),
    });

    if (!res.ok) return null;
    if (res.url && !isSafePublicHttpUrl(res.url)) return null;

    const contentType = res.headers.get("content-type") || "";
    if (!/text\/html|application\/xhtml|text\/plain/i.test(contentType)) return null;

    const rawHtml = (await res.text()).slice(0, 200_000);
    if (!rawHtml.trim()) return null;

    const signals = extractHtmlSignals(rawHtml);
    if (!signals.title && !signals.description && !signals.schemaSummary && !signals.excerpt) {
      return null;
    }

    return {
      url: res.url && isSafePublicHttpUrl(res.url) ? res.url : safeUrl,
      ...signals,
      sourceMethod: "direct_fetch",
    };
  } catch {
    return null;
  }
}

function buildArchiveReferenceDates(
  travelStartDate?: string | null,
  travelEndDate?: string | null,
  nowDate: Date = new Date(),
): { startIso: string; endIso: string; periodLabel: string } | null {
  if (!travelStartDate) return null;
  const parsedStart = new Date(`${travelStartDate.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(parsedStart.getTime())) return null;

  const parsedEnd = travelEndDate ? new Date(`${travelEndDate.slice(0, 10)}T12:00:00Z`) : null;
  const durationDays =
    parsedEnd && !Number.isNaN(parsedEnd.getTime()) && parsedEnd >= parsedStart
      ? Math.min(14, Math.max(1, Math.round((parsedEnd.getTime() - parsedStart.getTime()) / 86400000)))
      : 5;

  const targetMonth = parsedStart.getUTCMonth();
  const targetDay = Math.min(28, parsedStart.getUTCDate());

  let refYear = nowDate.getUTCFullYear() - 1;
  const probeThisYear = new Date(Date.UTC(nowDate.getUTCFullYear(), targetMonth, targetDay));
  if (probeThisYear.getTime() < nowDate.getTime() - 21 * 86400000) {
    refYear = nowDate.getUTCFullYear();
  }

  const refStart = new Date(Date.UTC(refYear, targetMonth, targetDay));
  const refEnd = new Date(refStart.getTime() + durationDays * 86400000);

  return {
    startIso: refStart.toISOString().slice(0, 10),
    endIso: refEnd.toISOString().slice(0, 10),
    periodLabel: `${parsedStart.toISOString().slice(0, 10)}${travelEndDate ? ` a ${travelEndDate.slice(0, 10)}` : ""}`,
  };
}

export async function lookupTravelSeasonWeather(
  destinationCity: string,
  travelStartDate?: string | null,
  travelEndDate?: string | null,
  fetchImpl: FetchLike = fetch,
  nowDate: Date = new Date(),
): Promise<SeasonWeatherSummary | null> {
  const cleanCity = destinationCity.trim();
  if (!cleanCity) return null;

  const geoJson = await fetchJsonSafe(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanCity)}&count=1&language=pt&format=json`,
    fetchImpl,
  );
  const place = geoJson?.results?.[0];
  if (!Number.isFinite(place?.latitude) || !Number.isFinite(place?.longitude)) return null;

  const startParsed = travelStartDate ? new Date(`${travelStartDate.slice(0, 10)}T12:00:00Z`) : null;
  const diffDays =
    startParsed && !Number.isNaN(startParsed.getTime())
      ? Math.round((startParsed.getTime() - nowDate.getTime()) / 86400000)
      : null;

  if (diffDays !== null && diffDays >= -1 && diffDays <= 13) {
    const forecastJson = await fetchJsonSafe(
      `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&forecast_days=7`,
      fetchImpl,
    );
    const daily = forecastJson?.daily;
    if (Array.isArray(daily?.time) && daily.time.length > 0) {
      return summarizeDailyMeteo(cleanCity, "forecast", "Próximos 7 dias (previsão real)", daily);
    }
  }

  const archiveDates = buildArchiveReferenceDates(travelStartDate, travelEndDate, nowDate);
  if (archiveDates) {
    const archiveJson = await fetchJsonSafe(
      `https://archive-api.open-meteo.com/v1/archive?latitude=${place.latitude}&longitude=${place.longitude}&start_date=${archiveDates.startIso}&end_date=${archiveDates.endIso}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`,
      fetchImpl,
    );
    const daily = archiveJson?.daily;
    if (Array.isArray(daily?.time) && daily.time.length > 0) {
      return summarizeDailyMeteo(
        cleanCity,
        "historical_same_period",
        `Mesma época da viagem (${archiveDates.periodLabel}, referência histórica ${archiveDates.startIso} a ${archiveDates.endIso})`,
        daily,
      );
    }
  }

  const currentJson = await fetchJsonSafe(
    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&forecast_days=3`,
    fetchImpl,
  );
  const daily = currentJson?.daily;
  if (Array.isArray(daily?.time) && daily.time.length > 0) {
    return summarizeDailyMeteo(cleanCity, "forecast", "Previsão atual (3 dias)", daily);
  }
  return null;
}

function summarizeDailyMeteo(
  destinationCity: string,
  mode: "forecast" | "historical_same_period",
  periodLabel: string,
  daily: {
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_sum?: number[];
  },
): SeasonWeatherSummary | null {
  const maxes = (daily.temperature_2m_max || []).filter((n) => typeof n === "number" && Number.isFinite(n));
  const mins = (daily.temperature_2m_min || []).filter((n) => typeof n === "number" && Number.isFinite(n));
  const precs = (daily.precipitation_sum || []).filter((n) => typeof n === "number" && Number.isFinite(n));
  if (maxes.length === 0 || mins.length === 0) return null;

  const avgMaxTempC = Math.round(maxes.reduce((a, b) => a + b, 0) / maxes.length);
  const avgMinTempC = Math.round(mins.reduce((a, b) => a + b, 0) / mins.length);
  const rainyDaysCount = precs.filter((p) => p >= 2.0).length;
  const totalDaysSampled = Math.max(maxes.length, precs.length);

  const summaryText = `${destinationCity} — ${periodLabel}: média das máximas de ${avgMaxTempC}°C e mínimas de ${avgMinTempC}°C (${rainyDaysCount} de ${totalDaysSampled} dias com chuva >= 2mm no período consultado).`;
  return {
    destinationCity,
    mode,
    periodLabel,
    avgMaxTempC,
    avgMinTempC,
    rainyDaysCount,
    totalDaysSampled,
    summaryText,
  };
}

function formatFlightSummary(flights: FlightSegmentDTO[]): string {
  if (!Array.isArray(flights) || flights.length === 0) return "Não especificado detalhadamente na cotação";
  return flights
    .map((f, idx) => {
      const dir = f.leg || (f.type === "return" ? "Volta" : f.type === "outbound" ? "Ida" : `Trecho ${idx + 1}`);
      const airline = [f.airline_name || f.airline, f.flight_number].filter(Boolean).join(" ");
      const route = `${f.origin_iata || f.origin_city || f.origin || "Origem"} -> ${f.destination_iata || f.destination_city || f.destination || "Destino"}`;
      const timing = [f.departure_date, f.departure_time && f.arrival_time ? `${f.departure_time}-${f.arrival_time}` : f.departure_time]
        .filter(Boolean)
        .join(" ");
      const stops =
        typeof f.stops_count === "number"
          ? f.stops_count === 0
            ? "Voo direto"
            : `${f.stops_count} parada(s)`
          : typeof f.stops === "number"
            ? f.stops === 0
              ? "Voo direto"
              : `${f.stops} parada(s)`
            : "";
      const bag =
        f.baggage && typeof f.baggage === "string"
          ? `Bagagem: ${f.baggage}`
          : f.baggage_included === true
            ? "Com bagagem despachada"
            : typeof f.baggage_included === "string" && f.baggage_included
              ? `Bagagem: ${f.baggage_included}`
              : "";
      return [dir, airline || "Companhia aérea cotada", route, timing, stops, f.cabin_class, bag].filter(Boolean).join(" | ");
    })
    .join("\n  ");
}

function formatHotelsSummary(hotels: HotelDTO[]): string {
  if (!Array.isArray(hotels) || hotels.length === 0) return "";
  return hotels
    .map((h) => {
      const checkIn = h.check_in || h.checkin_date;
      const checkOut = h.check_out || h.checkout_date;
      const dates = checkIn && checkOut ? `${checkIn} a ${checkOut}` : checkIn || "";
      const extras = [
        h.destination ? `Cidade: ${h.destination}` : "",
        h.address ? `Endereço informado: ${h.address}` : "",
        h.stars ? `${h.stars} estrelas` : "",
        h.room_type ? `Acomodação: ${h.room_type}` : "",
        h.board_basis ? `Regime: ${h.board_basis}` : "",
        dates ? `Hospedagem: ${dates}` : "",
        h.nights_count ? `${h.nights_count} diárias` : "",
        Array.isArray(h.amenities) && h.amenities.length > 0 ? `Estrutura: ${h.amenities.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join(" | ");
      return `${h.hotel_name}${extras ? ` (${extras})` : ""}`;
    })
    .join("\n  ");
}

function formatPricingSummary(pricing?: PricingBreakdownDTO): string {
  if (!pricing) return "Sob consulta";
  const total = ((pricing.total_price_cents || 0) / 100).toFixed(2);
  const installments = Array.isArray(pricing.installments_options)
    ? pricing.installments_options
        .map(
          (i) =>
            `${i.installments_count}x de R$ ${((i.installment_value_cents || 0) / 100).toFixed(2)} (${i.method}${i.has_interest === false ? " sem juros" : ""})`,
        )
        .join(" | ")
    : "";
  return [
    `Total: R$ ${total}`,
    pricing.boarding_tax_cents > 0 ? `Taxas embarque: R$ ${(pricing.boarding_tax_cents / 100).toFixed(2)}` : "",
    pricing.discount_cents > 0 ? `Desconto aplicado: R$ ${(pricing.discount_cents / 100).toFixed(2)}` : "",
    installments ? `Parcelamento: ${installments}` : "",
    pricing.payment_terms ? `Condições: ${pricing.payment_terms}` : "",
  ]
    .filter(Boolean)
    .join(" — ");
}

function formatOptionDetail(opt: TravelProposalOptionDTO, idx: number, isActive: boolean): string {
  const flightsList = opt.flights && opt.flights.length > 0 ? opt.flights : [];
  const hotelsList = opt.hotels && opt.hotels.length > 0 ? opt.hotels : [];
  const itineraryList = opt.itinerary && opt.itinerary.length > 0 ? opt.itinerary : [];

  return [
    `Opção ${idx + 1}: ${opt.name}${isActive ? " [ATUALMENTE SELECIONADA PELO VIAJANTE]" : ""}${opt.is_recommended ? " [RECOMENDADA PELA AGÊNCIA]" : ""}`,
    `- Hospedagem principal: ${opt.hotel_name || hotelsList[0]?.hotel_name || "Hotel Selecionado"} | Regime: ${opt.meal_plan || hotelsList[0]?.board_basis || "Conforme cotação"}${opt.room_type ? ` | Quarto: ${opt.room_type}` : ""}${opt.hotel_stars ? ` | ${opt.hotel_stars} estrelas` : ""}`,
    hotelsList.length > 0 ? `- Detalhes da hospedagem:\n  ${formatHotelsSummary(hotelsList)}` : "",
    `- Malha aérea: ${opt.airline || ""} \n  ${formatFlightSummary(flightsList)}`,
    `- Valores: ${formatPricingSummary(opt.pricing)}`,
    opt.includes?.length ? `- Inclui: ${opt.includes.join(", ")}` : "",
    opt.excludes?.length ? `- Não inclui: ${opt.excludes.join(", ")}` : "",
    itineraryList.length > 0 ? `- Roteiro:\n  ${formatItinerary(itineraryList)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function formatItinerary(days: ItineraryDayDTO[]): string {
  if (!Array.isArray(days) || days.length === 0) return "";
  return days
    .slice(0, 15)
    .map(
      (d) =>
        `Dia ${d.day_number}${d.date ? ` (${d.date})` : ""}: ${d.title}${d.location ? ` [${d.location}]` : ""}${d.description ? ` — ${sanitizeUntrustedSnippet(d.description, 220)}` : ""}`,
    )
    .join("\n  ");
}

/** Serializa todos os campos relevantes publicados na proposta para o contexto da IA. */
export function buildFullProposalAdvisorContext(
  proposal: TravelProposalDTO,
  currentOptionId?: string,
): string {
  const options = Array.isArray(proposal.options) ? proposal.options : [];
  const optionsText =
    options.length > 0
      ? options.map((opt, idx) => formatOptionDetail(opt, idx, Boolean(currentOptionId && opt.id === currentOptionId))).join("\n\n")
      : [
          `Opção Única: ${proposal.title || proposal.destination_city}`,
          proposal.hotels?.length ? `- Hospedagem:\n  ${formatHotelsSummary(proposal.hotels)}` : "",
          `- Malha aérea:\n  ${formatFlightSummary(proposal.flights || [])}`,
          `- Valores: ${formatPricingSummary(proposal.pricing)}`,
          proposal.includes?.length ? `- Inclui: ${proposal.includes.join(", ")}` : "",
          proposal.excludes?.length ? `- Não inclui: ${proposal.excludes.join(", ")}` : "",
        ]
          .filter(Boolean)
          .join("\n");

  const globalItinerary = proposal.itinerary?.length ? `\nRoteiro Base:\n  ${formatItinerary(proposal.itinerary)}` : "";
  const transfers =
    proposal.transfers?.length > 0
      ? `\nTraslados:\n  ${proposal.transfers.map((t) => `${t.type} (${t.vehicle || t.vehicle_type || "Veículo reservado"})${t.notes ? ` - ${t.notes}` : ""}`).join(" | ")}`
      : "";
  const tours =
    proposal.tours?.length > 0
      ? `\nPasseios listados:\n  ${proposal.tours.map((t: any) => `${t.title || t.name}${t.duration ? ` (${t.duration})` : ""}${t.included || t.is_included ? " [Incluso]" : ""}`).join(" | ")}`
      : "";

  return [
    `Título: ${proposal.title || "Proposta de Viagem"}`,
    `Destino: ${proposal.destination_city || proposal.destination || "Não informado"}`,
    `Período da viagem: ${proposal.travel_start_date || "A definir"} a ${proposal.travel_end_date || "A definir"}`,
    `Viajantes: ${proposal.adults_count} adulto(s), ${proposal.children_count} criança(s)`,
    proposal.valid_until ? `Validade desta cotação: ${proposal.valid_until}` : "",
    `Agência emissora: ${proposal.agency_name || "Agência"} | WhatsApp do agente: ${proposal.agency_whatsapp || proposal.agent_whatsapp || "Não informado"}`,
    optionsText,
    globalItinerary,
    transfers,
    tours,
    proposal.special_notes ? `Observações da agência: ${sanitizeUntrustedSnippet(proposal.special_notes, 500)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Orquestra em paralelo fontes públicas reais sobre hotel, cidade, site oficial, Wikipedia e clima Open-Meteo.
 * Sempre degrada graciosamente caso alguma fonte externa falhe ou atinja timeout.
 */
export async function resolveHotelAndDestinationPublicContext(
  proposal: TravelProposalDTO,
  options: {
    currentOptionId?: string;
    question?: string;
    fetchImpl?: FetchLike;
    firecrawlApiKey?: string | null;
    nowDate?: Date;
  } = {},
): Promise<PublicTravelAdvisorDossier> {
  const fetchImpl = options.fetchImpl || fetch;
  const hotelTarget = extractHotelLookupTarget(proposal, options.currentOptionId);
  const destinationCity = hotelTarget?.destinationCity || proposal.destination_city || "";

  let firecrawlApiKey = options.firecrawlApiKey;
  if (firecrawlApiKey === undefined) {
    firecrawlApiKey = await getActiveSecretForProvider("firecrawl", proposal.store_id || undefined).catch(() => null);
  }

  const [hotelLocation, wikidataWebsite, weatherSummary] = await Promise.all([
    hotelTarget ? lookupHotelLocationViaNominatim(hotelTarget, fetchImpl) : Promise.resolve(null),
    hotelTarget?.coreHotelName && !hotelTarget.explicitWebsiteUrl
      ? discoverWebsiteViaWikidata(hotelTarget.coreHotelName, fetchImpl)
      : Promise.resolve(undefined),
    destinationCity
      ? lookupTravelSeasonWeather(
          destinationCity,
          proposal.travel_start_date,
          proposal.travel_end_date,
          fetchImpl,
          options.nowDate,
        )
      : Promise.resolve(null),
  ]);

  const effectiveWebsiteUrl =
    hotelTarget?.explicitWebsiteUrl || hotelLocation?.websiteUrl || wikidataWebsite;

  const wikiTopics: string[] = [];
  if (hotelTarget?.coreHotelName) {
    wikiTopics.push(
      destinationCity ? `${hotelTarget.coreHotelName} ${destinationCity}` : hotelTarget.coreHotelName,
    );
  }
  if (hotelLocation?.neighborhood && destinationCity) {
    wikiTopics.push(`${hotelLocation.neighborhood} ${destinationCity}`);
  }
  if (destinationCity) {
    wikiTopics.push(destinationCity);
  }

  const [visitedWebsite, wikipediaSummaries] = await Promise.all([
    effectiveWebsiteUrl
      ? visitWebsiteAndExtractInfo(effectiveWebsiteUrl, { firecrawlApiKey, fetchImpl })
      : Promise.resolve(null),
    lookupWikipediaTopics(wikiTopics, fetchImpl),
  ]);

  const lines: string[] = [];
  if (hotelTarget?.coreHotelName) {
    lines.push(
      `- Hotel consultado: ${hotelTarget.rawHotelName} (cidade de referência: ${hotelLocation?.identifiedCity || hotelTarget.destinationCity || "a identificar"})`,
    );
  }
  if (hotelLocation) {
    const locParts = [
      hotelLocation.resolvedName ? `Nome no mapa: ${hotelLocation.resolvedName}` : "",
      hotelLocation.neighborhood ? `Bairro/Praia: ${hotelLocation.neighborhood}` : "",
      hotelLocation.road ? `Logradouro: ${hotelLocation.road}` : "",
      hotelLocation.identifiedCity
        ? `Cidade/UF: ${[hotelLocation.identifiedCity, hotelLocation.identifiedState].filter(Boolean).join(" - ")}`
        : "",
      typeof hotelLocation.distanceToCityCenterKm === "number"
        ? `Distância aproximada até o centro geográfico de ${hotelLocation.identifiedCity || destinationCity}: ${hotelLocation.distanceToCityCenterKm} km`
        : "",
      hotelLocation.fullAddress ? `Endereço público: ${hotelLocation.fullAddress}` : "",
    ].filter(Boolean);
    if (locParts.length > 0) lines.push(`- Geolocalização OpenStreetMap/Nominatim: ${locParts.join(" | ")}`);
  }

  if (visitedWebsite) {
    lines.push(`- Site oficial visitado (${visitedWebsite.url}):`);
    if (visitedWebsite.title) lines.push(`  Título do site: ${visitedWebsite.title}`);
    if (visitedWebsite.description) lines.push(`  Resumo oficial: ${visitedWebsite.description}`);
    if (visitedWebsite.schemaSummary) lines.push(`  Dados estruturados do hotel: ${visitedWebsite.schemaSummary}`);
    if (visitedWebsite.excerpt) lines.push(`  Trecho público extraído do site: ${visitedWebsite.excerpt}`);
  } else if (effectiveWebsiteUrl) {
    lines.push(`- Site oficial identificado: ${effectiveWebsiteUrl}`);
  }

  if (wikipediaSummaries.length > 0) {
    for (const w of wikipediaSummaries) {
      lines.push(`- Enciclopédia Pública (Wikipedia — ${w.title}): ${w.extract}`);
    }
  }

  if (weatherSummary) {
    lines.push(`- Clima e Referência Meteorológica (Open-Meteo): ${weatherSummary.summaryText}`);
  }

  return {
    hotelTarget,
    hotelLocation,
    visitedWebsite,
    wikipediaSummaries,
    weatherSummary,
    formattedPromptSection:
      lines.length > 0
        ? lines.join("\n")
        : `Nenhuma fonte externa retornou dados extras em tempo real para ${destinationCity || "este hotel"}; utilize seu conhecimento geográfico e turístico consolidado sobre o destino e o hotel mencionado.`,
  };
}
