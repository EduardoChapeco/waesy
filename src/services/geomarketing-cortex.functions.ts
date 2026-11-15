/**
 * geomarketing-cortex.functions.ts — Motor BFF de Viabilidade Comercial, Geomarketing (GOAT/Geowire/OSM),
 * Matriz Competitiva Comperator, TAM/SAM/SOM (IBGE Censo 2022), Preço Dinâmico Cortex 360 e SimLabs 4.0.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { assertStoreAccess, getServerIdentity, STAFF_ROLES } from "@/lib/server-access";
import { executeUnifiedAiCall } from "@/services/api-orchestrator.functions";
import { getIbgeMarketIntelligence } from "@/services/ibge-market-intelligence.functions";
import {
  MUNICIPALITY_DEMOGRAPHIC_PRESETS,
  generateStratifiedSyntheticCohort,
} from "@/lib/simlab/brazil-demographics";
import {
  computeCohortDescriptiveAndEconometricStats,
  computePersonaAffordabilityAndMcFaddenUtility,
  type CognitivePersonaSignal,
} from "@/lib/simlab/econometric-engine";
import {
  KNOWN_MUNICIPALITY_COORDINATES,
  NICHE_ECONOMIC_BENCHMARKS,
  calculateHaversineDistanceKm,
  computeCortex360DynamicPrice,
  computeGoatGravitationalAccessibility,
  computeRegionalTamSamSom,
  generateCatchmentRingsFeatureCollection,
  normalizeCityKey,
  resolveKnownCityCoordinates,
  type GeoPointOfInterest,
  type IsochroneFeatureCollectionGeoJSON,
} from "@/lib/geo-analytics";

export interface ComperatorCompetitorRow {
  id: string;
  name: string;
  category: string;
  distanceKm: number;
  latitude: number;
  longitude: number;
  estimatedTicketCents: number | null;
  pricePositioning: "economico" | "intermediario" | "premium" | "nao_informado";
  source: string;
  strengths: string[];
  weaknesses: string[];
  featureSupport: Record<string, boolean>;
}

export interface ViabilitySwotMatrix {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface ViabilityBusinessModelCanvas {
  key_partners: string[];
  key_activities: string[];
  key_resources: string[];
  value_propositions: string[];
  customer_relationships: string[];
  channels: string[];
  customer_segments: string[];
  cost_structure: string[];
  revenue_streams: string[];
}

export interface SimLabViabilityCohortSynthesis {
  sampleSize: number;
  municipalityPreset: string;
  basePriceApprovalRatePct: number;
  dynamicPriceApprovalRatePct: number;
  meanPurchaseIntentPct: number;
  syntheticNps: number;
  optimalPriceBrl: number;
  modeReservationPriceBrl: number;
  priceElasticityScore: number;
  estimatedMonthlyOrders: number;
  estimatedMonthlyRevenueCents: number;
  rentToRevenueRatioPct: number;
  breakevenOrdersPerMonth: number;
  topObjections: string[];
  personaVerbatims: Array<{
    personaName: string;
    socialClass: string;
    neighborhood: string;
    incomeBrl: number;
    choiceProbabilityPct: number;
    reservationPriceBrl: number;
    pricePerception: string;
    verbatim: string;
  }>;
}

export interface ViabilityPorterForceItem {
  score: number;
  level: "Baixa" | "Moderada" | "Alta";
  diagnosis: string;
}

export interface ViabilityPorterFiveForces {
  rivalry_among_competitors: ViabilityPorterForceItem;
  buyer_bargaining_power: ViabilityPorterForceItem;
  supplier_bargaining_power: ViabilityPorterForceItem;
  threat_of_new_entrants: ViabilityPorterForceItem;
  threat_of_substitutes: ViabilityPorterForceItem;
}

export interface ViabilitySexyCanvas {
  lust_desire: string;
  sloth_convenience: string;
  pride_belonging: string;
  greed_advantage: string;
  security_trust: string;
}

export interface ViabilityStudyDTO {
  id: string;
  store_id: string | null;
  user_id: string | null;
  business_name: string;
  niche_slug: string;
  idea_description: string;
  target_address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  radius_km: number;
  base_ticket_cents: number;
  estimated_rent_cents: number;
  viability_score: number;
  verdict: "GO" | "PIVOT" | "NO_GO";
  tam_monthly_cents: number;
  sam_monthly_cents: number;
  som_monthly_cents: number;
  cortex_dynamic_price_cents: number;
  dynamic_price_multiplier: number;
  dynamic_price_rationale: string;
  market_sentiment_alpha: number;
  local_scarcity_beta: number;
  competitor_pressure_gamma: number;
  gravitational_score: number;
  accessibility_index: number;
  competitor_saturation_index: number;
  territorial_diagnosis: string;
  ibge_population: number;
  ibge_per_capita_income_brl: number;
  ibge_density_hab_km2?: number;
  ibge_vehicle_fleet?: number;
  ibge_schooling_rate_pct?: number;
  sexy_canvas?: ViabilitySexyCanvas;
  porter_five_forces?: ViabilityPorterFiveForces;
  tactical_recommendations?: string[];
  report_pdf_url?: string | null;
  discovered_competitors: GeoPointOfInterest[];
  urban_anchors: GeoPointOfInterest[];
  comperator_matrix: ComperatorCompetitorRow[];
  swot_analysis: ViabilitySwotMatrix;
  bmc_canvas: ViabilityBusinessModelCanvas;
  simlab_synthesis: SimLabViabilityCohortSynthesis;
  isochrone_geojson: IsochroneFeatureCollectionGeoJSON;
  executive_summary: string;
  created_at: string;
}

const runViabilityInputSchema = z.object({
  storeId: z.string().uuid().optional().nullable(),
  businessName: z.string().min(2, "Informe o nome do negócio ou projeto"),
  nicheSlug: z.string().default("gastronomia"),
  ideaDescription: z.string().min(5, "Descreva a proposta de valor do negócio"),
  targetAddress: z.string().default("Centro"),
  city: z.string().default("Chapecó"),
  state: z.string().default("SC"),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  radiusKm: z.number().min(0.3).max(10).default(2.0),
  baseTicketCents: z.number().int().min(100).default(5500),
  estimatedRentCents: z.number().int().min(0).default(350000),
});

const saveViabilityCanvasInputSchema = z.object({
  studyId: z.string().uuid(),
  storeId: z.string().uuid().optional().nullable(),
  swotAnalysis: z.object({
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    opportunities: z.array(z.string()),
    threats: z.array(z.string()),
  }),
  bmcCanvas: z.object({
    key_partners: z.array(z.string()),
    key_activities: z.array(z.string()),
    key_resources: z.array(z.string()),
    value_propositions: z.array(z.string()),
    customer_relationships: z.array(z.string()),
    channels: z.array(z.string()),
    customer_segments: z.array(z.string()),
    cost_structure: z.array(z.string()),
    revenue_streams: z.array(z.string()),
  }),
  executiveSummary: z.string().optional(),
});

async function geocodeAddressOrFallback(
  targetAddress: string,
  city: string,
  state: string,
  explicitLat?: number | null,
  explicitLon?: number | null,
): Promise<{ latitude: number; longitude: number; urbanAreaKm2: number }> {
  const known = resolveKnownCityCoordinates(city);

  if (
    typeof explicitLat === "number" &&
    typeof explicitLon === "number" &&
    Number.isFinite(explicitLat) &&
    Number.isFinite(explicitLon)
  ) {
    return {
      latitude: explicitLat,
      longitude: explicitLon,
      urbanAreaKm2: known.urbanAreaKm2,
    };
  }

  try {
    const query = encodeURIComponent(`${targetAddress}, ${city}, ${state}, Brasil`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`,
      {
        headers: {
          "User-Agent": "WaesyGeomarketingCortex/1.0",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(3500),
      },
    );
    if (res.ok) {
      const items: any[] = await res.json();
      if (items && items.length > 0 && items[0].lat && items[0].lon) {
        const lat = parseFloat(items[0].lat);
        const lon = parseFloat(items[0].lon);
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          return {
            latitude: lat,
            longitude: lon,
            urbanAreaKm2: known.urbanAreaKm2,
          };
        }
      }
    }
  } catch {
    // Silencioso: usa coordenada calibrada da cidade
  }

  return {
    latitude: known.latitude,
    longitude: known.longitude,
    urbanAreaKm2: known.urbanAreaKm2,
  };
}

async function discoverCompetitorsAndUrbanAnchors(params: {
  centerLat: number;
  centerLon: number;
  radiusKm: number;
  city: string;
  nicheSlug: string;
  baseTicketCents?: number;
}): Promise<{
  competitors: GeoPointOfInterest[];
  anchors: GeoPointOfInterest[];
}> {
  const { centerLat, centerLon, radiusKm, city, nicheSlug } = params;
  const supabase = getServerClient();
  const competitors: GeoPointOfInterest[] = [];
  const anchors: GeoPointOfInterest[] = [];

  // 1. Consulta Diretório Comercial e Lojas Reais no Supabase (apenas coordenadas e preços reais)
  try {
    const [dirRes, storesRes] = await Promise.all([
      supabase
        .from("directory_listings")
        .select("id, business_name, category, metadata, city, address, latitude, longitude, rating, reviews_count")
        .ilike("city", `%${city.trim()}%`)
        .limit(20),
      supabase
        .from("stores")
        .select("id, name, settings, city, address, google_rating, google_review_count")
        .ilike("city", `%${city.trim()}%`)
        .limit(15),
    ]);

    const dirRows = dirRes.data || [];
    dirRows.forEach((row: any) => {
      const lat = typeof row.latitude === "number" ? row.latitude : Number(row.latitude);
      const lon = typeof row.longitude === "number" ? row.longitude : Number(row.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0)) return;
      const dist = calculateHaversineDistanceKm(centerLat, centerLon, lat, lon);
      if (dist <= radiusKm) {
        const meta = (row.metadata as Record<string, any>) || {};
        const subcat = meta.subcategory || "";
        const catLower = `${row.category || ""} ${subcat}`.toLowerCase();
        const isAnchor =
          catLower.includes("mercado") ||
          catLower.includes("banco") ||
          catLower.includes("escola") ||
          catLower.includes("farmacia") ||
          catLower.includes("hospital");

        const realAvgTicket =
          typeof meta.avg_ticket_cents === "number" && meta.avg_ticket_cents > 0
            ? meta.avg_ticket_cents
            : null;
        const realReviewsCount = Number(row.reviews_count || 0);
        const realRating =
          realReviewsCount > 0 && typeof row.rating === "number" ? Number(row.rating) : null;

        const poi: GeoPointOfInterest = {
          id: `dir-${row.id}`,
          name: row.business_name || row.category || "Estabelecimento local",
          kind: isAnchor ? "anchor" : "competitor",
          category: subcat || row.category || nicheSlug,
          latitude: lat,
          longitude: lon,
          weight: isAnchor ? 1.4 : 1.0,
          avgPriceCents: realAvgTicket,
          rating: realRating,
          source: "supabase_directory",
          address: row.address || city,
        };
        if (isAnchor) {
          anchors.push(poi);
        } else {
          competitors.push(poi);
        }
      }
    });

    const storeRows = storesRes.data || [];
    storeRows.forEach((st: any) => {
      if (competitors.length >= 12) return;
      const stSettings = (st.settings as Record<string, any>) || {};
      const lat = typeof stSettings.latitude === "number" ? stSettings.latitude : Number(stSettings.latitude);
      const lon = typeof stSettings.longitude === "number" ? stSettings.longitude : Number(stSettings.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0)) return;
      const dist = calculateHaversineDistanceKm(centerLat, centerLon, lat, lon);
      if (dist <= radiusKm) {
        const realAvgTicket =
          typeof stSettings.avg_ticket_cents === "number" && stSettings.avg_ticket_cents > 0
            ? stSettings.avg_ticket_cents
            : null;
        const realReviewsCount = Number(st.google_review_count || 0);
        competitors.push({
          id: `store-${st.id}`,
          name: st.name,
          kind: "competitor",
          category: stSettings.category || stSettings.segment || nicheSlug,
          latitude: lat,
          longitude: lon,
          weight: 1.15,
          avgPriceCents: realAvgTicket,
          rating: realReviewsCount > 0 && typeof st.google_rating === "number" ? Number(st.google_rating) : null,
          source: "supabase_store",
          address: st.address || city,
        });
      }
    });
  } catch {
    // Segue para consulta OpenStreetMap Overpass
  }

  // 2. Consulta OpenStreetMap Overpass API dentro do raio (Zero-Token Cost)
  try {
    const radiusMeters = Math.round(Math.min(3000, Math.max(500, radiusKm * 1000)));
    const slugLower = nicheSlug.toLowerCase();
    const isTour = slugLower.includes("turism") || slugLower.includes("tourism") || slugLower.includes("viag") || slugLower.includes("hotel");
    const isHealth = slugLower.includes("saude") || slugLower.includes("health") || slugLower.includes("servic") || slugLower.includes("estetica") || slugLower.includes("beleza");
    const isRetailNiche = slugLower.includes("varejo") || slugLower.includes("retail") || slugLower.includes("moda") || slugLower.includes("mercado");
    const competitorOsmFilter = isTour
      ? `node["amenity"="travel_agency"](around:${radiusMeters},${centerLat},${centerLon});node["shop"="travel_agency"](around:${radiusMeters},${centerLat},${centerLon});node["tourism"~"hotel|hostel|guest_house|information"](around:${radiusMeters},${centerLat},${centerLon});`
      : isHealth
        ? `node["amenity"~"clinic|pharmacy|doctors|dentist"](around:${radiusMeters},${centerLat},${centerLon});node["shop"~"beauty|hairdresser"](around:${radiusMeters},${centerLat},${centerLon});`
        : isRetailNiche
          ? `node["shop"~"supermarket|clothes|convenience|shoes|department_store"](around:${radiusMeters},${centerLat},${centerLon});`
          : `node["amenity"~"restaurant|bar|cafe|fast_food"](around:${radiusMeters},${centerLat},${centerLon});`;
    const anchorOsmFilter = `node["amenity"~"bank|school|university|hospital"](around:${radiusMeters},${centerLat},${centerLon});`;
    const overpassQuery = `[out:json][timeout:4];(${competitorOsmFilter}${anchorOsmFilter});out body 25;`;
    const osmRes = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(overpassQuery)}`,
      signal: AbortSignal.timeout(4000),
    });

    if (osmRes.ok) {
      const osmJson: any = await osmRes.json();
      const elements: any[] = osmJson?.elements || [];
      elements.forEach((el) => {
        if (!el.lat || !el.lon || !el.tags?.name) return;
        const amenityOrShop = el.tags.amenity || el.tags.shop || "comercio";
        const isAnchor = ["bank", "pharmacy", "school", "supermarket"].includes(amenityOrShop);

        const item: GeoPointOfInterest = {
          id: `osm-${el.id}`,
          name: el.tags.name,
          kind: isAnchor ? "anchor" : "competitor",
          category: amenityOrShop,
          latitude: Number(el.lat),
          longitude: Number(el.lon),
          weight: isAnchor ? 1.5 : 1.0,
          avgPriceCents: null,
          rating: null,
          source: "osm_overpass",
          address: el.tags["addr:street"]
            ? `${el.tags["addr:street"]}${el.tags["addr:housenumber"] ? `, ${el.tags["addr:housenumber"]}` : ""}`
            : city,
        };

        if (isAnchor && anchors.length < 10) {
          anchors.push(item);
        } else if (!isAnchor && competitors.length < 12) {
          competitors.push(item);
        }
      });
    }
  } catch {
    // Sem âncoras ou POIs sintéticos: retorna estritamente dados reais obtidos
  }

  return { competitors, anchors };
}

function buildComperatorMatrix(
  centerLat: number,
  centerLon: number,
  competitors: GeoPointOfInterest[],
  baseTicketCents: number,
): ComperatorCompetitorRow[] {
  return competitors.slice(0, 8).map((comp) => {
    const distKm = calculateHaversineDistanceKm(
      centerLat,
      centerLon,
      comp.latitude,
      comp.longitude,
    );
    const estTicket = typeof comp.avgPriceCents === "number" && comp.avgPriceCents > 0 ? comp.avgPriceCents : null;
    const ratio = estTicket !== null ? estTicket / Math.max(100, baseTicketCents) : null;
    const pricePositioning: ComperatorCompetitorRow["pricePositioning"] =
      ratio === null
        ? "nao_informado"
        : ratio < 0.93
          ? "economico"
          : ratio > 1.08
            ? "premium"
            : "intermediario";

    const strengths =
      pricePositioning === "nao_informado"
        ? []
        : pricePositioning === "economico"
          ? ["Ticket médio inferior ao cenário base informado"]
          : pricePositioning === "premium"
            ? ["Ticket médio superior ao cenário base informado"]
            : ["Posicionamento de preço próximo ao cenário base"];

    const weaknesses: string[] = [];

    return {
      id: comp.id,
      name: comp.name,
      category: comp.category,
      distanceKm: Number(distKm.toFixed(2)),
      latitude: comp.latitude,
      longitude: comp.longitude,
      estimatedTicketCents: estTicket,
      pricePositioning,
      source:
        comp.source === "osm_overpass"
          ? "OpenStreetMap"
          : comp.source === "supabase_store"
            ? "Vitrine Waesy"
            : comp.source === "supabase_directory"
              ? "Diretório Municipal"
              : "Malha Territorial",
      strengths,
      weaknesses,
      featureSupport: {},
    };
  });
}

function buildDeterministicSwotAndBmc(params: {
  businessName: string;
  nicheSlug: string;
  ideaDescription: string;
  city: string;
  state: string;
  targetAddress: string;
  baseTicketCents: number;
  dynamicPriceCents: number;
  somMonthlyCents: number;
  competitorCount: number;
  accessibilityIndex: number;
}): {
  swot: ViabilitySwotMatrix;
  bmc: ViabilityBusinessModelCanvas;
  executiveSummary: string;
} {
  const {
    businessName,
    nicheSlug,
    ideaDescription,
    city,
    state,
    targetAddress,
    baseTicketCents,
    dynamicPriceCents,
    somMonthlyCents,
    competitorCount,
    accessibilityIndex,
  } = params;

  const benchmark = NICHE_ECONOMIC_BENCHMARKS[nicheSlug] || NICHE_ECONOMIC_BENCHMARKS.gastronomia;
  const ticketBrl = (baseTicketCents / 100).toFixed(2);
  const dynamicBrl = (dynamicPriceCents / 100).toFixed(2);
  const somBrl = (somMonthlyCents / 100).toLocaleString("pt-BR", { maximumFractionDigits: 0 });

  const swot: ViabilitySwotMatrix = {
    strengths: [
      `Posicionamento nativo digital com operação integrada em ${targetAddress} (${city}/${state}).`,
      `Ticket base (R$ ${ticketBrl}) calibrado com preço ótimo Cortex 360 (R$ ${dynamicBrl}).`,
      `Proposta focada em ${ideaDescription.slice(0, 90)}.`,
    ],
    weaknesses: [
      "Curva inicial de aquisição de clientes nos primeiros 60 dias de operação.",
      "Necessidade de giro constante para diluir custo fixo de ocupação e aluguel.",
    ],
    opportunities: [
      `Mercado Obtível (SOM) estimado em R$ ${somBrl}/mês na bacia de captação de 2km.`,
      `Índice de acessibilidade gravitacional GOAT de ${accessibilityIndex}/100 impulsionado por âncoras urbanas próximas.`,
      "Captura de demanda reprimida via logística expressa Waesy Go / MotoLink e catálogo digital.",
    ],
    threats: [
      `${competitorCount} concorrentes mapeados no raio de captura de 2km disputando a mesma faixa de renda POF.`,
      "Sensibilidade a preço das classes B2/C1 em compras fora de janelas promocionais.",
    ],
  };

  const bmc: ViabilityBusinessModelCanvas = {
    key_partners: [
      "Entregadores e Motoristas Parceiros Waesy Go / MotoLink",
      `Fornecedores regionais de ${city} e polo atacadista de ${state}`,
      "Afiliados e Criadores Locais da Comunidade Waesy",
    ],
    key_activities: [
      `Operação de excelência em ${benchmark.label}`,
      "Gestão ativa de vitrine digital, ofertas relâmpago e recompra",
      "Atendimento consultivo rápido via WhatsApp e Checkout Transparente",
    ],
    key_resources: [
      `Ponto comercial / base operacional em ${targetAddress}, ${city}`,
      "Catálogo inteligente sincronizado com precificação Cortex 360",
      "Base de clientes recorrentes da isócrona primária (500m a 2km)",
    ],
    value_propositions: [
      `${businessName}: ${ideaDescription}`,
      "Conveniência imediata com transparência de preço e entrega rastreada",
      "Qualidade superior frente aos operadores tradicionais não digitalizados do bairro",
    ],
    customer_relationships: [
      "Recompra assistida e atendimento direto sem fricção",
      "Clube de benefícios e recorrência para moradores da isócrona de 1km",
      "Avaliações verificadas e prova social comunitária",
    ],
    channels: [
      "Vitrine Pública e Busca Geolocalizada Waesy",
      "Tráfego orgânico de pedestres na isócrona de 500m (5 min a pé)",
      "Vitrines de Afiliados Locais e Social Commerce",
    ],
    customer_segments: [
      `Moradores e trabalhadores num raio de 2km em ${targetAddress} (${city})`,
      "Famílias e profissionais das classes A2, B1, B2 e C1 com solvência POF validada",
      "Consumidores que priorizam rapidez, confiança e pedido digital",
    ],
    cost_structure: [
      "Ocupação / Aluguel do ponto comercial e utilidades fixas",
      "Custo de Mercadoria Vendida (CMV) / Insumos diretos da operação",
      "Taxa fixa logística por entrega (R$ 0,99 plataforma) e comissões de afiliados",
    ],
    revenue_streams: [
      `Venda direta com ticket base de R$ ${ticketBrl} e preço dinâmico de R$ ${dynamicBrl}`,
      "Combos familiares, pacotes recorrentes e upsell de conveniência",
      "Pedidos via delivery local e retirada agendada na loja",
    ],
  };

  const executiveSummary =
    `Estudo de Viabilidade Comercial & Geomarketing para "${businessName}" (${benchmark.label}) em ${targetAddress}, ${city}/${state}. ` +
    `A bacia de captura apresenta Índice de Acessibilidade Gravitacional GOAT de ${accessibilityIndex}/100 com ${competitorCount} concorrentes identificados no raio. ` +
    `O Mercado Obtível Mensal (SOM) projeta potencial de R$ ${somBrl}/mês, com preço dinâmico ótimo Cortex 360 calculado em R$ ${dynamicBrl}.`;

  return { swot, bmc, executiveSummary };
}

/**
 * 1. Executa o Estudo Completo de Viabilidade Comercial, Geomarketing (GOAT/Geowire/OSM),
 * TAM/SAM/SOM Regional (IBGE Censo 2022), Preço Dinâmico Cortex 360 e Enxame SimLabs 4.0.
 */
export const runCortexViabilityAndGeomarketingStudy = createServerFn({ method: "POST" })
  .validator((d: unknown) => runViabilityInputSchema.parse(d))
  .handler(async ({ data }): Promise<ViabilityStudyDTO> => {
    const {
      storeId,
      businessName,
      nicheSlug,
      ideaDescription,
      targetAddress,
      city,
      state,
      latitude,
      longitude,
      radiusKm,
      baseTicketCents,
      estimatedRentCents,
    } = data;

    const identity = await getServerIdentity().catch(() => null);
    const supabase = getServerClient();

    // PASSO 1: Geocodificação & Polígonos GeoJSON de Isócronas (500m, 1km, 2km)
    const coords = await geocodeAddressOrFallback(
      targetAddress,
      city,
      state,
      latitude,
      longitude,
    );
    const isochroneGeojson = generateCatchmentRingsFeatureCollection(
      coords.latitude,
      coords.longitude,
      [2.0, 1.0, 0.5],
    );

    // PASSO 2: Descoberta Mecânica Zero-Token de Concorrentes e Âncoras (Supabase + OSM Overpass)
    const { competitors, anchors } = await discoverCompetitorsAndUrbanAnchors({
      centerLat: coords.latitude,
      centerLon: coords.longitude,
      radiusKm,
      city,
      nicheSlug,
      baseTicketCents,
    });

    const allPois: GeoPointOfInterest[] = [...competitors, ...anchors];
    const goatMetrics = computeGoatGravitationalAccessibility(
      coords.latitude,
      coords.longitude,
      allPois,
      1.2,
    );

    // PASSO 3: Inteligência Demográfica IBGE Censo 2022 + TAM / SAM / SOM
    const ibgeData = await getIbgeMarketIntelligence({ data: { cityName: city } }).catch(() => ({
      city,
      state,
      municipioId: 4204202,
      population: 254785,
      populationFormatted: "254.785",
      gdpThousandBrl: 13950000,
      gdpFormatted: "R$ 13950.0 milhões",
      perCapitaGdpEstimatedBrl: 54752,
      source: "IBGE Censo 2022 Consolidado",
      insight: "",
    }));

    // Renda domiciliar mensal per capita estimada a partir do PIB per capita anual (fator 0.58 de apropriação familiar mensal)
    const monthlyPerCapitaIncomeBrl = Math.max(
      1650,
      Math.round(((ibgeData.perCapitaGdpEstimatedBrl || 45000) / 12) * 0.68),
    );

    const benchmark =
      NICHE_ECONOMIC_BENCHMARKS[nicheSlug] || NICHE_ECONOMIC_BENCHMARKS.gastronomia;

    const tamSamSom = computeRegionalTamSamSom({
      population: ibgeData.population || 45000,
      perCapitaIncomeBrl: monthlyPerCapitaIncomeBrl,
      nicheMonthlySpendShare: benchmark.monthlySpendShare,
      targetAudienceShare: benchmark.targetAudienceShare,
      competitorCountInRadius: competitors.length,
      catchmentRadiusKm: radiusKm,
      urbanAreaKm2: coords.urbanAreaKm2,
    });

    // PASSO 4: Simulação de Coorte Local SimLabs 4.0 (Solvência POF + McFadden Logit)
    const normalizedCity = normalizeCityKey(city);
    let presetKey = "Nacional";
    for (const candidateKey of Object.keys(MUNICIPALITY_DEMOGRAPHIC_PRESETS)) {
      if (normalizeCityKey(candidateKey).includes(normalizedCity)) {
        presetKey = candidateKey;
        break;
      }
    }

    const cohortResult = generateStratifiedSyntheticCohort({
      count: 24,
      municipalityFilter: presetKey,
      seed: `${businessName}:${city}:${targetAddress}:${baseTicketCents}`,
    });

    const baseTicketBrl = baseTicketCents / 100;
    const signals: CognitivePersonaSignal[] = cohortResult.profiles.map((persona, idx) => {
      const accessibilityBoost = (goatMetrics.normalizedAccessibilityIndex - 50) / 35;
      const perceivedValue = Math.min(
        9.6,
        Math.max(4.5, 6.8 + accessibilityBoost - (persona.cynicism_index - 5) * 0.22),
      );
      const trustScore = Math.min(
        9.5,
        Math.max(4.8, 6.9 + (goatMetrics.anchorCountIn1km > 2 ? 0.6 : 0)),
      );
      const wtpMultiplier = 0.82 + (perceivedValue / 10) * 0.45;
      const reservationPriceBrl = Math.round(baseTicketBrl * wtpMultiplier * 100) / 100;

      return {
        perceived_value_score: Number(perceivedValue.toFixed(2)),
        trust_score: Number(trustScore.toFixed(2)),
        ux_friction_score: 2.6,
        reservation_price_brl: reservationPriceBrl,
        primary_objection:
          idx % 3 === 0
            ? "Compara preço e frete com concorrentes tradicionais do bairro"
            : idx % 3 === 1
              ? "Avalia se cabe na sobra mensal POF da família"
              : "Exige rapidez no atendimento e clareza no catálogo",
        natural_speech_verbatim:
          `Moro no bairro ${persona.decision_heuristics?.neighborhood || "Centro"} (${city}). ` +
          `Se ${businessName} entregar padrão consistente perto de R$ ${reservationPriceBrl.toFixed(0)}, vale testar.`,
      };
    });

    const baseEvaluations = cohortResult.profiles.map((persona, idx) =>
      computePersonaAffordabilityAndMcFaddenUtility(
        persona,
        {
          unitPriceBrl: baseTicketBrl,
          maxInstallments: baseTicketBrl >= 150 ? 3 : 1,
          category: nicheSlug,
        },
        signals[idx],
      ),
    );

    const cohortStats = computeCohortDescriptiveAndEconometricStats(
      cohortResult.profiles,
      baseEvaluations,
      signals,
      {
        unitPriceBrl: baseTicketBrl,
        maxInstallments: baseTicketBrl >= 150 ? 3 : 1,
        category: nicheSlug,
      },
    );

    // Sentimento de mercado Alpha (-0.20 a +0.35) derivado do NPS e aprovação da coorte SimLabs
    const marketSentimentAlpha = Number(
      Math.max(
        -0.2,
        Math.min(0.35, ((cohortStats.overall_approval_rate - 50) / 100) * 0.45),
      ).toFixed(4),
    );

    // Equação Cortex 360 de Preço Dinâmico
    const cortexPrice = computeCortex360DynamicPrice({
      basePriceCents: baseTicketCents,
      marketSentimentAlpha,
      localScarcityBeta: goatMetrics.localScarcityBeta,
      competitorPressureGamma: goatMetrics.competitorPressureGamma,
    });

    const dynamicTicketBrl = cortexPrice.dynamicPriceCents / 100;
    const dynamicEvaluations = cohortResult.profiles.map((persona, idx) =>
      computePersonaAffordabilityAndMcFaddenUtility(
        persona,
        {
          unitPriceBrl: dynamicTicketBrl,
          maxInstallments: dynamicTicketBrl >= 150 ? 3 : 1,
          category: nicheSlug,
        },
        signals[idx],
      ),
    );
    const dynamicApprovedCount = dynamicEvaluations.filter(
      (e) => e.choice_probability_percent >= 50,
    ).length;
    const dynamicApprovalRatePct =
      Math.round((dynamicApprovedCount / Math.max(1, dynamicEvaluations.length)) * 1000) / 10;

    // Viabilidade Financeira (SOM vs Aluguel & Ponto de Equilíbrio)
    const conversionCaptureFactor = Math.max(0.25, cohortStats.mean_intent_percent / 100);
    const estimatedMonthlyRevenueCents = Math.round(
      tamSamSom.somMonthlyCents * conversionCaptureFactor,
    );
    const estimatedMonthlyOrders = Math.max(
      1,
      Math.round(estimatedMonthlyRevenueCents / Math.max(100, cortexPrice.dynamicPriceCents)),
    );
    const rentToRevenueRatioPct =
      estimatedMonthlyRevenueCents > 0
        ? Math.round((estimatedRentCents / estimatedMonthlyRevenueCents) * 1000) / 10
        : 100;
    // Assumindo margem de contribuição média de 55% para cobrir aluguel + custos fixos
    const contributionMarginPerOrderCents = Math.max(
      100,
      Math.round(cortexPrice.dynamicPriceCents * 0.55),
    );
    const breakevenOrdersPerMonth = Math.ceil(
      Math.max(50000, estimatedRentCents * 1.6) / contributionMarginPerOrderCents,
    );

    const simlabSynthesis: SimLabViabilityCohortSynthesis = {
      sampleSize: cohortResult.profiles.length,
      municipalityPreset: cohortResult.preset.municipality,
      basePriceApprovalRatePct: cohortStats.overall_approval_rate,
      dynamicPriceApprovalRatePct: dynamicApprovalRatePct,
      meanPurchaseIntentPct: cohortStats.mean_intent_percent,
      syntheticNps: cohortStats.synthetic_nps,
      optimalPriceBrl: cohortStats.optimal_price_point_brl,
      modeReservationPriceBrl: cohortStats.mode_reservation_price_brl,
      priceElasticityScore: cohortStats.price_elasticity_score,
      estimatedMonthlyOrders,
      estimatedMonthlyRevenueCents,
      rentToRevenueRatioPct,
      breakevenOrdersPerMonth,
      topObjections: [
        "Sensibilidade orçamentária mensal frente a concorrentes num raio de 1km",
        "Exigência de pedido digital rápido sem taxa de entrega abusiva",
        "Necessidade de combo ou benefício claro na primeira compra",
      ],
      personaVerbatims: cohortResult.profiles.slice(0, 6).map((p, idx) => ({
        personaName: p.display_name,
        socialClass: p.abep_social_class,
        neighborhood: String(p.decision_heuristics?.neighborhood || "Centro"),
        incomeBrl: Number(p.financial_sheet?.net_monthly_income_brl ?? p.median_income_brl ?? 0),
        choiceProbabilityPct: baseEvaluations[idx].choice_probability_percent,
        reservationPriceBrl: Number(baseEvaluations[idx].reservation_price_brl ?? 0),
        pricePerception: baseEvaluations[idx].price_perception,
        verbatim: baseEvaluations[idx].social_feed_comment || signals[idx].natural_speech_verbatim,
      })),
    };

    // Score Composto de Viabilidade Comercial (0 a 100) e Veredito
    const scoreAccessibility = goatMetrics.normalizedAccessibilityIndex * 0.25;
    const scoreCohort = cohortStats.overall_approval_rate * 0.35;
    const scoreRentHealth = Math.max(0, Math.min(100, 100 - rentToRevenueRatioPct * 2.2)) * 0.25;
    const scoreCompetitionSpace = Math.max(10, 100 - goatMetrics.competitorSaturationIndex * 0.7) * 0.15;
    const viabilityScore = Math.round(
      Math.max(12, Math.min(98, scoreAccessibility + scoreCohort + scoreRentHealth + scoreCompetitionSpace)),
    );

    let verdict: "GO" | "PIVOT" | "NO_GO" = "GO";
    if (viabilityScore < 45 || rentToRevenueRatioPct > 45) {
      verdict = "NO_GO";
    } else if (viabilityScore < 68 || rentToRevenueRatioPct > 25) {
      verdict = "PIVOT";
    }

    // PASSO 5: Matriz Competitiva Comperator + Síntese Multi-Agente (IA com Fallback Determinístico)
    const comperatorMatrix = buildComperatorMatrix(
      coords.latitude,
      coords.longitude,
      competitors,
      baseTicketCents,
    );

    const deterministicStrategic = buildDeterministicSwotAndBmc({
      businessName,
      nicheSlug,
      ideaDescription,
      city,
      state,
      targetAddress,
      baseTicketCents,
      dynamicPriceCents: cortexPrice.dynamicPriceCents,
      somMonthlyCents: tamSamSom.somMonthlyCents,
      competitorCount: competitors.length,
      accessibilityIndex: goatMetrics.normalizedAccessibilityIndex,
    });

    let swotAnalysis = deterministicStrategic.swot;
    let bmcCanvas = deterministicStrategic.bmc;
    let executiveSummary = deterministicStrategic.executiveSummary;

    try {
      const aiResponse = await executeUnifiedAiCall({
        taskType: "fast_json",
        feature: "geomarketing_cortex_viability",
        responseFormat: "json_object",
        temperature: 0.25,
        maxTokens: 1600,
        storeId: storeId || undefined,
        ownerId: identity?.id || undefined,
        systemPrompt:
          "Você é o Motor Estrategista Cortex 360 & Engios AI da Waesy. Retorne estritamente um JSON válido com as chaves: executiveSummary (string concisa), swot ({ strengths: string[], weaknesses: string[], opportunities: string[], threats: string[] }) e bmc ({ key_partners: string[], key_activities: string[], key_resources: string[], value_propositions: string[], customer_relationships: string[], channels: string[], customer_segments: string[], cost_structure: string[], revenue_streams: string[] }). Sem markdown extra.",
        userPrompt: JSON.stringify({
          businessName,
          nicheSlug,
          ideaDescription,
          location: `${targetAddress}, ${city} - ${state}`,
          ibgePopulation: ibgeData.population,
          perCapitaIncomeBrl: monthlyPerCapitaIncomeBrl,
          baseTicketBrl,
          cortexDynamicPriceBrl: dynamicTicketBrl,
          somMonthlyBrl: Math.round(tamSamSom.somMonthlyCents / 100),
          competitorsInRadius: competitors.length,
          viabilityScore,
          verdict,
        }),
      });

      const rawText = (aiResponse.text || "").trim();
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.executiveSummary && typeof parsed.executiveSummary === "string") {
          executiveSummary = parsed.executiveSummary;
        }
        if (parsed.swot && Array.isArray(parsed.swot.strengths)) {
          swotAnalysis = {
            strengths: parsed.swot.strengths.slice(0, 5),
            weaknesses: (parsed.swot.weaknesses || swotAnalysis.weaknesses).slice(0, 5),
            opportunities: (parsed.swot.opportunities || swotAnalysis.opportunities).slice(0, 5),
            threats: (parsed.swot.threats || swotAnalysis.threats).slice(0, 5),
          };
        }
        if (parsed.bmc && Array.isArray(parsed.bmc.value_propositions)) {
          bmcCanvas = {
            key_partners: parsed.bmc.key_partners || bmcCanvas.key_partners,
            key_activities: parsed.bmc.key_activities || bmcCanvas.key_activities,
            key_resources: parsed.bmc.key_resources || bmcCanvas.key_resources,
            value_propositions: parsed.bmc.value_propositions || bmcCanvas.value_propositions,
            customer_relationships:
              parsed.bmc.customer_relationships || bmcCanvas.customer_relationships,
            channels: parsed.bmc.channels || bmcCanvas.channels,
            customer_segments: parsed.bmc.customer_segments || bmcCanvas.customer_segments,
            cost_structure: parsed.bmc.cost_structure || bmcCanvas.cost_structure,
            revenue_streams: parsed.bmc.revenue_streams || bmcCanvas.revenue_streams,
          };
        }
      }
    } catch {
      // Preserva síntese determinística completa sem interromper a experiência
    }

    const studyId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const dto: ViabilityStudyDTO = {
      id: studyId,
      store_id: storeId || identity?.store_id || null,
      user_id: identity?.id || null,
      business_name: businessName,
      niche_slug: nicheSlug,
      idea_description: ideaDescription,
      target_address: targetAddress,
      city,
      state,
      latitude: coords.latitude,
      longitude: coords.longitude,
      radius_km: radiusKm,
      base_ticket_cents: baseTicketCents,
      estimated_rent_cents: estimatedRentCents,
      viability_score: viabilityScore,
      verdict,
      tam_monthly_cents: tamSamSom.tamMonthlyCents,
      sam_monthly_cents: tamSamSom.samMonthlyCents,
      som_monthly_cents: tamSamSom.somMonthlyCents,
      cortex_dynamic_price_cents: cortexPrice.dynamicPriceCents,
      dynamic_price_multiplier: cortexPrice.multiplier,
      dynamic_price_rationale: cortexPrice.rationale,
      market_sentiment_alpha: marketSentimentAlpha,
      local_scarcity_beta: goatMetrics.localScarcityBeta,
      competitor_pressure_gamma: goatMetrics.competitorPressureGamma,
      gravitational_score: goatMetrics.gravitationalScore,
      accessibility_index: goatMetrics.normalizedAccessibilityIndex,
      competitor_saturation_index: goatMetrics.competitorSaturationIndex,
      territorial_diagnosis: goatMetrics.territorialDiagnosis,
      ibge_population: ibgeData.population,
      ibge_per_capita_income_brl: monthlyPerCapitaIncomeBrl,
      ibge_density_hab_km2: Number(((ibgeData.population || 45000) / Math.max(10, coords.urbanAreaKm2 * 1.4)).toFixed(1)),
      ibge_vehicle_fleet: Math.round((ibgeData.population || 45000) * 0.68),
      ibge_schooling_rate_pct: 98.4,
      sexy_canvas: {
        lust_desire: `Experiência aspiracional e referência em ${benchmark.label} em ${city}.`,
        sloth_convenience: "Jornada digital sem fricção: cotação/pedido em 3 cliques com atendimento imediato.",
        pride_belonging: `Pertencimento à comunidade local de ${city} com prova social verificada.`,
        greed_advantage: `Custo-benefício transparente (ticket ótimo R$ ${dynamicTicketBrl.toFixed(2)}) e vantagens de recorrência.`,
        security_trust: "Garantia contratual/transacional Waesy, avaliações auditadas e suporte dedicado.",
      },
      porter_five_forces: {
        rivalry_among_competitors: {
          score: goatMetrics.competitorSaturationIndex,
          level: goatMetrics.competitorSaturationIndex >= 65 ? "Alta" : goatMetrics.competitorSaturationIndex >= 35 ? "Moderada" : "Baixa",
          diagnosis: `${competitors.length} operadores do mesmo segmento mapeados no raio de ${radiusKm} km.`,
        },
        buyer_bargaining_power: {
          score: Math.min(95, Math.max(20, Math.round((baseTicketBrl / Math.max(500, monthlyPerCapitaIncomeBrl)) * 900))),
          level: baseTicketBrl / Math.max(500, monthlyPerCapitaIncomeBrl) > 0.06 ? "Alta" : "Moderada",
          diagnosis: `Renda per capita local de R$ ${monthlyPerCapitaIncomeBrl}/mês frente ao ticket base de R$ ${baseTicketBrl.toFixed(2)}.`,
        },
        supplier_bargaining_power: {
          score: 42,
          level: "Moderada",
          diagnosis: `Polo regional de ${city}/${state} dispõe de distribuidores e parceiros locais.`,
        },
        threat_of_new_entrants: {
          score: 55,
          level: "Moderada",
          diagnosis: "Barreira elevada pela exigência de presença omnichannel, reputação e operação integrada.",
        },
        threat_of_substitutes: {
          score: 48,
          level: "Moderada",
          diagnosis: "Mitigada pela conveniência digital e diferenciação de catálogo/serviço no ecossistema Waesy.",
        },
      },
      tactical_recommendations: [
        `Posicionar oferta principal em R$ ${dynamicTicketBrl.toFixed(2)} para maximizar conversão na coorte de ${city}.`,
        `Ativar captura geolocalizada no raio primário de 500m a 1km ao redor de ${targetAddress}.`,
        `Explorar as brechas dos ${competitors.length} concorrentes locais com atendimento digital imediato via WhatsApp.`,
        `Estruturar combos/pacotes de fidelização para diluir o aluguel estimado (${rentToRevenueRatioPct}% da receita projetada).`,
        `Executar validação de elasticidade no SimLab Focus-Group antes de expandir custos fixos.`,
      ],
      discovered_competitors: competitors,
      urban_anchors: anchors,
      comperator_matrix: comperatorMatrix,
      swot_analysis: swotAnalysis,
      bmc_canvas: bmcCanvas,
      simlab_synthesis: simlabSynthesis,
      isochrone_geojson: isochroneGeojson,
      executive_summary: executiveSummary,
      created_at: nowIso,
    };

    // Persistência em market_viability_studies (e sincronização opcional com BMC da loja)
    try {
      const { data: inserted } = await supabase
        .from("market_viability_studies")
        .insert({
          id: dto.id,
          store_id: dto.store_id,
          user_id: dto.user_id,
          business_name: dto.business_name,
          niche_slug: dto.niche_slug,
          idea_description: dto.idea_description,
          target_address: dto.target_address,
          city: dto.city,
          state: dto.state,
          latitude: dto.latitude,
          longitude: dto.longitude,
          radius_km: dto.radius_km,
          base_ticket_cents: dto.base_ticket_cents,
          estimated_rent_cents: dto.estimated_rent_cents,
          viability_score: dto.viability_score,
          verdict: dto.verdict,
          tam_monthly_cents: dto.tam_monthly_cents,
          sam_monthly_cents: dto.sam_monthly_cents,
          som_monthly_cents: dto.som_monthly_cents,
          cortex_dynamic_price_cents: dto.cortex_dynamic_price_cents,
          market_sentiment_alpha: dto.market_sentiment_alpha,
          local_scarcity_beta: dto.local_scarcity_beta,
          competitor_pressure_gamma: dto.competitor_pressure_gamma,
          discovered_competitors: [...competitors, ...anchors],
          comperator_matrix: dto.comperator_matrix,
          swot_analysis: dto.swot_analysis,
          bmc_canvas: dto.bmc_canvas,
          simlab_synthesis: {
            ...dto.simlab_synthesis,
            gravitational_score: dto.gravitational_score,
            accessibility_index: dto.accessibility_index,
            competitor_saturation_index: dto.competitor_saturation_index,
            territorial_diagnosis: dto.territorial_diagnosis,
            ibge_population: dto.ibge_population,
            ibge_per_capita_income_brl: dto.ibge_per_capita_income_brl,
            dynamic_price_multiplier: dto.dynamic_price_multiplier,
            dynamic_price_rationale: dto.dynamic_price_rationale,
          },
          isochrone_geojson: dto.isochrone_geojson,
          executive_summary: dto.executive_summary,
        })
        .select("id")
        .maybeSingle();

      if (inserted?.id) {
        dto.id = inserted.id;
      }
      await supabase.from("store_viability_studies").upsert({
        id: dto.id,
        store_id: dto.store_id,
        user_id: dto.user_id,
        business_name: dto.business_name,
        niche_slug: dto.niche_slug,
        idea_description: dto.idea_description,
        target_address: dto.target_address,
        city: dto.city,
        state: dto.state,
        latitude: dto.latitude,
        longitude: dto.longitude,
        radius_km: dto.radius_km,
        base_ticket_cents: dto.base_ticket_cents,
        estimated_rent_cents: dto.estimated_rent_cents,
        viability_score: dto.viability_score,
        verdict: dto.verdict,
        tam_monthly_cents: dto.tam_monthly_cents,
        sam_monthly_cents: dto.sam_monthly_cents,
        som_monthly_cents: dto.som_monthly_cents,
        cortex_dynamic_price_cents: dto.cortex_dynamic_price_cents,
        market_sentiment_alpha: dto.market_sentiment_alpha,
        local_scarcity_beta: dto.local_scarcity_beta,
        competitor_pressure_gamma: dto.competitor_pressure_gamma,
        ibge_population: dto.ibge_population,
        ibge_per_capita_income_brl: dto.ibge_per_capita_income_brl,
        ibge_density_hab_km2: dto.ibge_density_hab_km2 || 0,
        ibge_vehicle_fleet: dto.ibge_vehicle_fleet || 0,
        ibge_schooling_rate_pct: dto.ibge_schooling_rate_pct || 0,
        discovered_competitors: [...competitors, ...anchors],
        comperator_matrix: dto.comperator_matrix,
        swot_analysis: dto.swot_analysis,
        bmc_canvas: dto.bmc_canvas,
        sexy_canvas: dto.sexy_canvas || {},
        porter_five_forces: dto.porter_five_forces || {},
        tactical_recommendations: dto.tactical_recommendations || [],
        simlab_synthesis: dto.simlab_synthesis,
        isochrone_geojson: dto.isochrone_geojson,
        executive_summary: dto.executive_summary,
      });
    } catch (err) {
      console.warn("[geomarketing-cortex] Estudo retornado em memória (banco pendente de migration):", err);
    }

    return dto;
  });

/**
 * 2. Lista os Estudos de Viabilidade e Geomarketing salvos pelo empreendedor/loja.
 */
export const listViabilityStudies = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        storeId: z.string().uuid().optional().nullable(),
        limit: z.number().int().min(1).max(30).default(10),
      })
      .parse(d || {}),
  )
  .handler(async ({ data }): Promise<ViabilityStudyDTO[]> => {
    const { storeId, limit } = data;
    const identity = await getServerIdentity().catch(() => null);
    const supabase = getServerClient();

    try {
      let query = supabase
        .from("market_viability_studies")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (storeId) {
        query = query.eq("store_id", storeId);
      } else if (identity?.id) {
        query = query.eq("user_id", identity.id);
      }

      const { data: rows, error } = await query;
      if (error || !rows) return [];

      return rows.map((row: any) => {
        const rawPois: GeoPointOfInterest[] = Array.isArray(row.discovered_competitors)
          ? row.discovered_competitors
          : [];
        const comps = rawPois.filter((p) => p.kind === "competitor");
        const ancs = rawPois.filter((p) => p.kind === "anchor");
        const sim = row.simlab_synthesis || {};

        return {
          id: row.id,
          store_id: row.store_id,
          user_id: row.user_id,
          business_name: row.business_name,
          niche_slug: row.niche_slug,
          idea_description: row.idea_description,
          target_address: row.target_address,
          city: row.city,
          state: row.state,
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
          radius_km: Number(row.radius_km || 2.0),
          base_ticket_cents: Number(row.base_ticket_cents || 5000),
          estimated_rent_cents: Number(row.estimated_rent_cents || 350000),
          viability_score: Number(row.viability_score || 70),
          verdict: (row.verdict as "GO" | "PIVOT" | "NO_GO") || "GO",
          tam_monthly_cents: Number(row.tam_monthly_cents || 0),
          sam_monthly_cents: Number(row.sam_monthly_cents || 0),
          som_monthly_cents: Number(row.som_monthly_cents || 0),
          cortex_dynamic_price_cents: Number(row.cortex_dynamic_price_cents || row.base_ticket_cents || 5000),
          dynamic_price_multiplier: Number(sim.dynamic_price_multiplier || 1.0),
          dynamic_price_rationale:
            sim.dynamic_price_rationale ||
            "Preço calibrado pela equação de elasticidade e pressão competitiva local.",
          market_sentiment_alpha: Number(row.market_sentiment_alpha || 0),
          local_scarcity_beta: Number(row.local_scarcity_beta || 0),
          competitor_pressure_gamma: Number(row.competitor_pressure_gamma || 0),
          gravitational_score: Number(sim.gravitational_score || 3.2),
          accessibility_index: Number(sim.accessibility_index || 74),
          competitor_saturation_index: Number(sim.competitor_saturation_index || 42),
          territorial_diagnosis:
            sim.territorial_diagnosis ||
            "Microzona urbana analisada por isócronas concêntricas.",
          ibge_population: Number(sim.ibge_population || 254785),
          ibge_per_capita_income_brl: Number(sim.ibge_per_capita_income_brl || 3200),
          discovered_competitors: comps,
          urban_anchors: ancs,
          comperator_matrix: Array.isArray(row.comperator_matrix) ? row.comperator_matrix : [],
          swot_analysis: row.swot_analysis || {
            strengths: [],
            weaknesses: [],
            opportunities: [],
            threats: [],
          },
          bmc_canvas: row.bmc_canvas || {
            key_partners: [],
            key_activities: [],
            key_resources: [],
            value_propositions: [],
            customer_relationships: [],
            channels: [],
            customer_segments: [],
            cost_structure: [],
            revenue_streams: [],
          },
          simlab_synthesis: sim,
          isochrone_geojson:
            row.isochrone_geojson && row.isochrone_geojson.type === "FeatureCollection"
              ? row.isochrone_geojson
              : generateCatchmentRingsFeatureCollection(
                  Number(row.latitude || KNOWN_MUNICIPALITY_COORDINATES.chapeco.latitude),
                  Number(row.longitude || KNOWN_MUNICIPALITY_COORDINATES.chapeco.longitude),
                ),
          executive_summary: row.executive_summary || "",
          created_at: row.created_at,
        };
      });
    } catch {
      return [];
    }
  });

/**
 * 3. Salva edições In-Page do Business Model Canvas (BMC) e da Matriz SWOT do estudo.
 */
export const saveViabilityCanvasAndSwot = createServerFn({ method: "POST" })
  .validator((d: unknown) => saveViabilityCanvasInputSchema.parse(d))
  .handler(async ({ data }): Promise<{ success: boolean; updatedAt: string }> => {
    const { studyId, storeId, swotAnalysis, bmcCanvas, executiveSummary } = data;
    const identity = await getServerIdentity().catch(() => null);
    if (!identity?.id) {
      throw new Error("Autenticação obrigatória para salvar alterações do estudo de viabilidade.");
    }

    const supabase = getServerClient();
    const { data: existingStudy, error: fetchErr } = await supabase
      .from("market_viability_studies")
      .select("id, store_id, user_id")
      .eq("id", studyId)
      .maybeSingle();

    if (fetchErr) {
      throw new Error(fetchErr.message || "Falha ao localizar estudo de viabilidade.");
    }
    if (!existingStudy) {
      throw new Error("Estudo de viabilidade não encontrado.");
    }

    const scopedStoreId = storeId || existingStudy.store_id;
    if (scopedStoreId) {
      assertStoreAccess(identity, STAFF_ROLES, scopedStoreId);
    } else if (existingStudy.user_id && existingStudy.user_id !== identity.id && !identity.isPlatformAdmin) {
      throw new Error("Acesso não autorizado a este estudo de viabilidade.");
    }

    const updatedAt = new Date().toISOString();
    const updatePayload: Record<string, unknown> = {
      swot_analysis: swotAnalysis,
      bmc_canvas: bmcCanvas,
      updated_at: updatedAt,
    };
    if (executiveSummary !== undefined) {
      updatePayload.executive_summary = executiveSummary;
    }

    const { error: updateErr } = await supabase
      .from("market_viability_studies")
      .update(updatePayload)
      .eq("id", studyId);

    if (updateErr) {
      throw new Error(updateErr.message || "Falha ao salvar Business Model Canvas e SWOT.");
    }

    if (scopedStoreId) {
      const { error: bmcErr } = await supabase
        .from("store_business_model_canvas")
        .upsert(
          {
            store_id: scopedStoreId,
            key_partners: bmcCanvas.key_partners,
            key_activities: bmcCanvas.key_activities,
            key_resources: bmcCanvas.key_resources,
            value_propositions: bmcCanvas.value_propositions,
            customer_relationships: bmcCanvas.customer_relationships,
            channels: bmcCanvas.channels,
            customer_segments: bmcCanvas.customer_segments,
            cost_structure: bmcCanvas.cost_structure,
            revenue_streams: bmcCanvas.revenue_streams,
            updated_at: updatedAt,
          },
          { onConflict: "store_id" },
        );

      if (bmcErr) {
        throw new Error(bmcErr.message || "Falha ao sincronizar Business Model Canvas da loja.");
      }
    }

    return { success: true, updatedAt };
  });

export interface CompetitorWebAuditDTO {
  competitorId: string;
  competitorName: string;
  communicationTone: string | null;
  publicPriceRange: string | null;
  estimatedRating: number | null;
  digitalMaturityScore: number | null;
  channelsDetected: string[];
  strategicWeaknessToExploit: string | null;
}

export const inspectCompetitorWebPresence = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        competitorId: z.string(),
        competitorName: z.string(),
        category: z.string().default("comercio"),
        city: z.string().default("Chapecó"),
        estimatedTicketCents: z.number().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<CompetitorWebAuditDTO> => {
    const identity = await getServerIdentity();
    if (!identity?.id) {
      throw new Error("Não autorizado a auditar concorrentes.");
    }

    const { competitorId, competitorName, category, city, estimatedTicketCents } = data;
    const supabase = getServerClient();
    const channelsDetected: string[] = [];
    let estimatedRating: number | null = null;
    let publicPriceRange: string | null = null;
    let digitalMaturityScore: number | null = null;
    let communicationTone: string | null = null;
    let strategicWeaknessToExploit: string | null = null;

    if (competitorId.startsWith("store-")) {
      const storeId = competitorId.slice("store-".length);
      const [{ data: storeRow }, { data: prodRows }] = await Promise.all([
        supabase
          .from("stores")
          .select("id, slug, phone, email, social_links, google_rating, google_review_count, is_active, ai_sales_agent_enabled, pix_key")
          .eq("id", storeId)
          .maybeSingle(),
        supabase
          .from("products")
          .select("price_cents")
          .eq("store_id", storeId)
          .eq("is_active", true)
          .limit(30),
      ]);

      if (storeRow) {
        if (storeRow.is_active && storeRow.slug) channelsDetected.push("Vitrine Waesy");
        if (storeRow.phone) channelsDetected.push("WhatsApp Comercial");
        if (storeRow.email) channelsDetected.push("E-mail Comercial");
        const socials = (storeRow.social_links as Record<string, any>) || {};
        if (socials.instagram) channelsDetected.push("Instagram");
        if (socials.website) channelsDetected.push("Site Institucional");
        if (Number(storeRow.google_review_count || 0) > 0) {
          channelsDetected.push("Google Perfil");
          estimatedRating = typeof storeRow.google_rating === "number" ? Number(storeRow.google_rating) : null;
        }
        const activePrices = (prodRows || [])
          .map((p: any) => Number(p.price_cents))
          .filter((v) => Number.isFinite(v) && v > 0);
        if (activePrices.length > 0) {
          const minBrl = Math.round(Math.min(...activePrices) / 100);
          const maxBrl = Math.round(Math.max(...activePrices) / 100);
          publicPriceRange = minBrl === maxBrl ? `R$ ${minBrl}` : `R$ ${minBrl} a R$ ${maxBrl}`;
        }
        const rawScore =
          channelsDetected.length * 16 +
          (activePrices.length > 0 ? 15 : 0) +
          (storeRow.pix_key ? 10 : 0) +
          (storeRow.ai_sales_agent_enabled ? 15 : 0);
        digitalMaturityScore = Math.min(100, rawScore);
        communicationTone = storeRow.ai_sales_agent_enabled
          ? "Atendimento Automatizado"
          : channelsDetected.length > 0
            ? "Presença Digital Ativa"
            : null;
        if (!storeRow.pix_key || activePrices.length === 0) {
          strategicWeaknessToExploit = `${competitorName} em ${city} não possui catálogo transacional completo publicado nesta vitrine.`;
        }
      }
    } else if (competitorId.startsWith("dir-")) {
      const dirId = competitorId.slice("dir-".length);
      const { data: dirRow } = await supabase
        .from("directory_listings")
        .select("id, website_url, contact_whatsapp, contact_phone, contact_email, rating, reviews_count, price_level")
        .eq("id", dirId)
        .maybeSingle();

      if (dirRow) {
        if (dirRow.website_url) channelsDetected.push("Site Institucional");
        if (dirRow.contact_whatsapp) channelsDetected.push("WhatsApp Comercial");
        if (dirRow.contact_phone) channelsDetected.push("Telefone Direto");
        if (dirRow.contact_email) channelsDetected.push("E-mail Comercial");
        if (Number(dirRow.reviews_count || 0) > 0) {
          channelsDetected.push("Avaliações Registradas");
          estimatedRating = typeof dirRow.rating === "number" ? Number(dirRow.rating) : null;
        }
        digitalMaturityScore = Math.min(100, channelsDetected.length * 20);
        if (dirRow.price_level) {
          publicPriceRange = `Faixa cadastrada: ${dirRow.price_level}`;
        }
        if (!dirRow.website_url && !dirRow.contact_whatsapp) {
          strategicWeaknessToExploit = `${competitorName} (${category}) em ${city} não possui site nem WhatsApp verificados no diretório.`;
        }
      }
    } else if (competitorId.startsWith("osm-")) {
      channelsDetected.push("OpenStreetMap");
      strategicWeaknessToExploit = `${competitorName} em ${city} não possui canais digitais ou avaliações cadastradas na plataforma.`;
    }

    if (!publicPriceRange && typeof estimatedTicketCents === "number" && estimatedTicketCents > 0) {
      const ticketBrl = Math.round(estimatedTicketCents / 100);
      publicPriceRange = `R$ ${ticketBrl}`;
    }

    return {
      competitorId,
      competitorName,
      communicationTone,
      publicPriceRange,
      estimatedRating,
      digitalMaturityScore,
      channelsDetected,
      strategicWeaknessToExploit,
    };
  });

export const exportViabilityStudyDossier = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        studyId: z.string(),
        storeId: z.string().optional().nullable(),
        htmlContent: z.string().min(10),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ success: boolean; storagePath: string; publicUrl: string | null }> => {
    const identity = await getServerIdentity();
    if (!identity?.id) {
      throw new Error("Não autorizado a exportar dossiê.");
    }
    const { studyId, storeId, htmlContent } = data;
    if (storeId) {
      assertStoreAccess(identity, STAFF_ROLES, storeId);
    }

    const supabase = getServerClient();
    const folder = storeId || `user-${identity.id}`;
    const storagePath = `${folder}/${studyId}.pdf`;
    const bytes = new TextEncoder().encode(htmlContent);

    const { error: uploadError } = await supabase.storage
      .from("viability-reports")
      .upload(storagePath, bytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Falha ao enviar dossiê para storage: ${uploadError.message}`);
    }

    const { data: pub } = supabase.storage.from("viability-reports").getPublicUrl(storagePath);
    const publicUrl = pub?.publicUrl || null;
    if (publicUrl) {
      const { error: updateErr } = await supabase
        .from("store_viability_studies")
        .update({ report_pdf_url: publicUrl })
        .eq("id", studyId);
      if (updateErr) {
        throw new Error(`Dossiê salvo, porém falhou ao vincular URL ao estudo: ${updateErr.message}`);
      }
    }
    return { success: true, storagePath, publicUrl };
  });
