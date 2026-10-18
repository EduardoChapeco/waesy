/**
 * geo-analytics.ts — Motor Espacial & Econométrico de Geomarketing (GOAT / Geowire) e Cortex 360
 *
 * Implementa trigonometria esférica determinística (zero dependência externa de Turf),
 * polígonos GeoJSON de isócronas (500m / 1km / 2km), acessibilidade gravitacional GOAT,
 * dimensionamento de mercado TAM/SAM/SOM via Censo IBGE 2022 e Precificação Dinâmica Cortex 360.
 */

const EARTH_RADIUS_KM = 6371.0088;

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export interface IsochroneProperties {
  radiusKm: number;
  areaKm2: number;
  travelMode: "walk_5min" | "walk_10min" | "drive_5min" | "custom";
  label: string;
  estimatedMinutes: number;
}

export interface IsochroneFeatureGeoJSON {
  type: "Feature";
  properties: IsochroneProperties;
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
}

export interface IsochroneFeatureCollectionGeoJSON {
  type: "FeatureCollection";
  features: IsochroneFeatureGeoJSON[];
}

export interface GeoPointOfInterest {
  id: string;
  name: string;
  kind: "competitor" | "anchor" | "partner";
  category: string;
  latitude: number;
  longitude: number;
  weight?: number;
  avgPriceCents?: number | null;
  rating?: number | null;
  source?: "supabase_directory" | "supabase_store" | "osm_overpass" | "heuristic_local";
  address?: string | null;
}

export interface GoatAccessibilityResult {
  gravitationalScore: number;
  normalizedAccessibilityIndex: number; // 0..100
  competitorSaturationIndex: number; // 0..100
  competitorCountIn500m: number;
  competitorCountIn1km: number;
  competitorCountIn2km: number;
  anchorCountIn1km: number;
  localScarcityBeta: number;
  competitorPressureGamma: number;
  territorialDiagnosis: string;
}

export interface RegionalTamSamSomInput {
  population: number;
  perCapitaIncomeBrl: number;
  nicheMonthlySpendShare?: number;
  targetAudienceShare?: number;
  competitorCountInRadius?: number;
  catchmentRadiusKm?: number;
  urbanAreaKm2?: number;
}

export interface RegionalTamSamSomResult {
  tamMonthlyCents: number;
  samMonthlyCents: number;
  somMonthlyCents: number;
  estimatedMarketSharePct: number;
  catchmentPopulation: number;
  monthlySpendPerCapitaCents: number;
}

export interface Cortex360DynamicPriceInput {
  basePriceCents: number;
  marketSentimentAlpha: number;
  localScarcityBeta: number;
  competitorPressureGamma: number;
  sentimentScore?: number;
  scarcityScore?: number;
  competitionScore?: number;
}

export interface Cortex360DynamicPriceResult {
  basePriceCents: number;
  dynamicPriceCents: number;
  multiplier: number;
  sentimentFactor: number;
  scarcityFactor: number;
  competitionFactor: number;
  rationale: string;
}

export const KNOWN_MUNICIPALITY_COORDINATES: Record<
  string,
  { latitude: number; longitude: number; state: string; urbanAreaKm2: number }
> = {
  "sao miguel do oeste": {
    latitude: -26.7253,
    longitude: -53.5183,
    state: "SC",
    urbanAreaKm2: 18.5,
  },
  chapeco: {
    latitude: -27.1004,
    longitude: -52.6152,
    state: "SC",
    urbanAreaKm2: 62.0,
  },
  pinhalzinho: {
    latitude: -26.8481,
    longitude: -52.9911,
    state: "SC",
    urbanAreaKm2: 11.5,
  },
  maravilha: {
    latitude: -26.7619,
    longitude: -53.1736,
    state: "SC",
    urbanAreaKm2: 14.0,
  },
  concordia: {
    latitude: -27.2335,
    longitude: -52.0238,
    state: "SC",
    urbanAreaKm2: 28.0,
  },
  xanxere: {
    latitude: -26.8747,
    longitude: -52.4036,
    state: "SC",
    urbanAreaKm2: 21.0,
  },
  lages: {
    latitude: -27.815,
    longitude: -50.3264,
    state: "SC",
    urbanAreaKm2: 54.0,
  },
  florianopolis: {
    latitude: -27.5949,
    longitude: -48.5482,
    state: "SC",
    urbanAreaKm2: 115.0,
  },
  "sao jose": {
    latitude: -27.6136,
    longitude: -48.6366,
    state: "SC",
    urbanAreaKm2: 48.0,
  },
  "sao paulo": {
    latitude: -23.5505,
    longitude: -46.6333,
    state: "SP",
    urbanAreaKm2: 960.0,
  },
  curitiba: {
    latitude: -25.4284,
    longitude: -49.2733,
    state: "PR",
    urbanAreaKm2: 320.0,
  },
  "porto alegre": {
    latitude: -30.0346,
    longitude: -51.2177,
    state: "RS",
    urbanAreaKm2: 280.0,
  },
};

export const NICHE_ECONOMIC_BENCHMARKS: Record<
  string,
  {
    label: string;
    monthlySpendShare: number;
    targetAudienceShare: number;
    osmTags: Array<{ key: string; value: string }>;
    defaultFeatures: string[];
  }
> = {
  gastronomia: {
    label: "Gastronomia, Restaurantes & Delivery",
    monthlySpendShare: 0.085,
    targetAudienceShare: 0.38,
    osmTags: [
      { key: "amenity", value: "restaurant" },
      { key: "amenity", value: "fast_food" },
      { key: "amenity", value: "cafe" },
    ],
    defaultFeatures: [
      "Pedido Online / Waesy Delivery",
      "Atendimento Presencial",
      "Tempo Médio < 35 min",
      "Programa de Fidelidade / Cashback",
    ],
  },
  varejo: {
    label: "Varejo, Moda & Comércio Especializado",
    monthlySpendShare: 0.065,
    targetAudienceShare: 0.32,
    osmTags: [
      { key: "shop", value: "clothes" },
      { key: "shop", value: "supermarket" },
      { key: "shop", value: "convenience" },
      { key: "shop", value: "department_store" },
    ],
    defaultFeatures: [
      "Catálogo Digital Atualizado",
      "Entrega Expressa MotoLink",
      "Parcelamento PIX / Cartão",
      "Retirada na Loja (Click & Collect)",
    ],
  },
  servicos: {
    label: "Serviços Profissionais, Estética & Clínicas",
    monthlySpendShare: 0.055,
    targetAudienceShare: 0.28,
    osmTags: [
      { key: "amenity", value: "clinic" },
      { key: "shop", value: "beauty" },
      { key: "shop", value: "hairdresser" },
      { key: "office", value: "company" },
    ],
    defaultFeatures: [
      "Agendamento Online 24/7",
      "Avaliações Verificadas",
      "Pacotes Recorrentes / Assinatura",
      "Estacionamento Próprio / Fácil Acesso",
    ],
  },
  turismo: {
    label: "Turismo, Hospedagem & Experiências",
    monthlySpendShare: 0.045,
    targetAudienceShare: 0.24,
    osmTags: [
      { key: "tourism", value: "hotel" },
      { key: "tourism", value: "guest_house" },
      { key: "tourism", value: "attraction" },
    ],
    defaultFeatures: [
      "Reserva Instantânea Confirmada",
      "Roteiro Guiado / Experiência",
      "Cancelamento Flexível",
      "Suporte Concierge WhatsApp",
    ],
  },
  fitness: {
    label: "Academias, Esportes & Bem-Estar",
    monthlySpendShare: 0.04,
    targetAudienceShare: 0.22,
    osmTags: [
      { key: "leisure", value: "fitness_centre" },
      { key: "leisure", value: "sports_centre" },
    ],
    defaultFeatures: [
      "Horário Estendido",
      "Planos Recorrentes Sem Multa",
      "Avaliação Física Inclusa",
      "Climatização Completa",
    ],
  },
};

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDegrees(rad: number): number {
  return (rad * 180) / Math.PI;
}

function roundTo(val: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

function clamp(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return min;
  return Math.min(max, Math.max(min, val));
}

export function normalizeCityKey(cityName: string): string {
  return (cityName || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function resolveKnownCityCoordinates(cityName: string): {
  latitude: number;
  longitude: number;
  state: string;
  urbanAreaKm2: number;
} {
  const norm = normalizeCityKey(cityName);
  for (const [key, coords] of Object.entries(KNOWN_MUNICIPALITY_COORDINATES)) {
    if (norm.includes(key) || key.includes(norm)) {
      return coords;
    }
  }
  return KNOWN_MUNICIPALITY_COORDINATES.chapeco;
}

/**
 * 1. Distância geodésica exata pela Fórmula de Haversine em quilômetros.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return 0;
  }

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const rLat1 = toRadians(lat1);
  const rLat2 = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));

  return roundTo(EARTH_RADIUS_KM * c, 4);
}

/**
 * 2. Gera polígono GeoJSON determinístico de isócrona/raio de captura sobre a esfera terrestre
 * (estilo plan4better/goat):
 * - 0.5 km: Caminhada 5 min (Área Primária)
 * - 1.0 km: Caminhada 10 min (Área Secundária)
 * - 2.0 km: Deslocamento Motorizado 5 min / Delivery Curto (Área Terciária)
 */
export function generateIsochronePolygonGeoJSON(
  centerLat: number,
  centerLon: number,
  radiusKm: number,
  points: number = 64,
): IsochroneFeatureGeoJSON {
  const safeRadiusKm = Math.max(0.05, Number(radiusKm) || 0.5);
  const safePoints = Math.max(12, Math.min(256, Math.round(points || 64)));
  const angularDistance = safeRadiusKm / EARTH_RADIUS_KM;
  const latRad = toRadians(centerLat);
  const lonRad = toRadians(centerLon);

  const ring: number[][] = [];

  for (let i = 0; i < safePoints; i++) {
    const bearing = (2 * Math.PI * i) / safePoints;
    const sinLat =
      Math.sin(latRad) * Math.cos(angularDistance) +
      Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearing);
    const pointLatRad = Math.asin(clamp(sinLat, -1, 1));

    const y = Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latRad);
    const x = Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(pointLatRad);
    const pointLonRad = lonRad + Math.atan2(y, x);

    ring.push([roundTo(toDegrees(pointLonRad), 6), roundTo(toDegrees(pointLatRad), 6)]);
  }

  // Fecha o anel linear conforme especificação RFC 7946 GeoJSON
  if (ring.length > 0) {
    ring.push([ring[0][0], ring[0][1]]);
  }

  const areaKm2 = roundTo(Math.PI * safeRadiusKm * safeRadiusKm, 3);
  let travelMode: IsochroneProperties["travelMode"] = "custom";
  let label = `Raio ${safeRadiusKm} km`;
  let estimatedMinutes = Math.max(2, Math.round(safeRadiusKm * 8));

  if (Math.abs(safeRadiusKm - 0.5) < 0.08) {
    travelMode = "walk_5min";
    label = "500m (5 min a pé · Fluxo Primário)";
    estimatedMinutes = 5;
  } else if (Math.abs(safeRadiusKm - 1.0) < 0.08) {
    travelMode = "walk_10min";
    label = "1 km (10 min a pé · Vizinhança)";
    estimatedMinutes = 10;
  } else if (Math.abs(safeRadiusKm - 2.0) < 0.15) {
    travelMode = "drive_5min";
    label = "2 km (5 min veículo / Delivery)";
    estimatedMinutes = 5;
  }

  return {
    type: "Feature",
    properties: {
      radiusKm: safeRadiusKm,
      areaKm2,
      travelMode,
      label,
      estimatedMinutes,
    },
    geometry: {
      type: "Polygon",
      coordinates: [ring],
    },
  };
}

/**
 * Gera a coleção completa dos 3 anéis de captura concêntricos (2km, 1km, 500m).
 */
export function generateCatchmentRingsFeatureCollection(
  centerLat: number,
  centerLon: number,
  radiiKm: number[] = [2.0, 1.0, 0.5],
): IsochroneFeatureCollectionGeoJSON {
  return {
    type: "FeatureCollection",
    features: radiiKm.map((r) => generateIsochronePolygonGeoJSON(centerLat, centerLon, r, 64)),
  };
}

/**
 * 3. Índice de Acessibilidade Gravitacional GOAT & Saturação Competitiva Geowire:
 * Oportunidade Gravitacional = \sum_j w_j * exp(-\beta * d_ij)
 */
export function computeGoatGravitationalAccessibility(
  targetLat: number,
  targetLon: number,
  pois: GeoPointOfInterest[],
  impedanceBeta: number = 1.2,
): GoatAccessibilityResult {
  const beta = Math.max(0.1, Number(impedanceBeta) || 1.2);
  let rawGravity = 0;
  let competitorGravity = 0;

  let competitorCountIn500m = 0;
  let competitorCountIn1km = 0;
  let competitorCountIn2km = 0;
  let anchorCountIn1km = 0;

  for (const poi of pois || []) {
    const distKm = calculateHaversineDistanceKm(
      targetLat,
      targetLon,
      poi.latitude,
      poi.longitude,
    );
    const decay = Math.exp(-beta * distKm);
    const weight = Math.max(0.2, Number(poi.weight ?? 1.0));

    if (poi.kind === "competitor") {
      competitorGravity += weight * decay;
      if (distKm <= 0.5) competitorCountIn500m += 1;
      if (distKm <= 1.0) competitorCountIn1km += 1;
      if (distKm <= 2.0) competitorCountIn2km += 1;
    } else {
      rawGravity += weight * decay;
      if (distKm <= 1.0) anchorCountIn1km += 1;
    }
  }

  // Se a lista tiver apenas POIs genéricos ou âncoras, garante pontuação gravitacional proporcional
  const totalGravitySignal = rawGravity + competitorGravity * 0.35;
  const gravitationalScore = roundTo(totalGravitySignal, 3);

  const normalizedAccessibilityIndex = Math.round(
    clamp(100 * (1 - Math.exp(-0.28 * (rawGravity + anchorCountIn1km * 0.6 + 1.2))), 12, 98),
  );

  const competitorSaturationIndex = Math.round(
    clamp(100 * (1 - Math.exp(-0.35 * (competitorGravity + competitorCountIn1km * 0.5))), 0, 99),
  );

  // Escassez local Beta (-0.20 a +0.45): maior quando há muitas âncoras de fluxo e poucos concorrentes em 1km
  const scarcityRaw =
    (anchorCountIn1km * 0.06 + (normalizedAccessibilityIndex / 100) * 0.22) -
    competitorCountIn1km * 0.055;
  const localScarcityBeta = roundTo(clamp(scarcityRaw, -0.2, 0.45), 4);

  // Pressão competitiva Gamma (0.00 a 0.40): cresce com densidade de concorrentes diretos no raio
  const pressureRaw =
    competitorCountIn500m * 0.065 +
    (competitorCountIn1km - competitorCountIn500m) * 0.035 +
    (competitorCountIn2km - competitorCountIn1km) * 0.015;
  const competitorPressureGamma = roundTo(clamp(pressureRaw, 0, 0.4), 4);

  let territorialDiagnosis =
    "Território com baixa saturação e oportunidade de captura pioneira (Oceano Azul local).";
  if (competitorSaturationIndex >= 70) {
    territorialDiagnosis =
      "Alta densidade competitiva na microzona. Exige forte diferenciação de marca, nicho ou conveniência.";
  } else if (competitorSaturationIndex >= 40) {
    territorialDiagnosis =
      "Polos comerciais consolidados com fluxo ativo de pedestres e competição moderada.";
  }

  return {
    gravitationalScore,
    normalizedAccessibilityIndex,
    competitorSaturationIndex,
    competitorCountIn500m,
    competitorCountIn1km,
    competitorCountIn2km,
    anchorCountIn1km,
    localScarcityBeta,
    competitorPressureGamma,
    territorialDiagnosis,
  };
}

/**
 * 4. Dimensionamento Econômico Regional TAM / SAM / SOM (Market-Intelligence-Agent + IBGE Censo 2022)
 */
export function computeRegionalTamSamSom(
  input: RegionalTamSamSomInput,
): RegionalTamSamSomResult {
  const population = Math.max(1000, Math.round(Number(input.population) || 45000));
  const perCapitaIncomeBrl = Math.max(800, Number(input.perCapitaIncomeBrl) || 3200);
  const nicheMonthlySpendShare = clamp(Number(input.nicheMonthlySpendShare ?? 0.065), 0.005, 0.45);
  const targetAudienceShare = clamp(Number(input.targetAudienceShare ?? 0.32), 0.05, 0.95);
  const competitorCount = Math.max(0, Math.round(Number(input.competitorCountInRadius ?? 3)));
  const catchmentRadiusKm = Math.max(0.3, Number(input.catchmentRadiusKm ?? 2.0));
  const urbanAreaKm2 = Math.max(4, Number(input.urbanAreaKm2 ?? 28));

  const monthlySpendPerCapitaCents = Math.round(
    perCapitaIncomeBrl * nicheMonthlySpendShare * 100,
  );

  // TAM Mensal Municipal: População Total * Gasto Mensal per Capita no Nicho
  const tamMonthlyCents = Math.round(population * monthlySpendPerCapitaCents);

  // Fração territorial da isócrona ponderada por concentração central (fator 1.45 de densidade urbana central)
  const catchmentAreaKm2 = Math.PI * catchmentRadiusKm * catchmentRadiusKm;
  const spatialCaptureRatio = clamp((catchmentAreaKm2 / urbanAreaKm2) * 1.45, 0.18, 1.0);
  const catchmentPopulation = Math.round(population * spatialCaptureRatio);

  // SAM Mensal: Mercado Endereçável Servível (Público-alvo do nicho dentro da bacia de captação/entrega)
  const effectiveSamRatio = clamp(targetAudienceShare * Math.max(0.55, spatialCaptureRatio), 0.08, 0.85);
  const samMonthlyCents = Math.round(tamMonthlyCents * effectiveSamRatio);

  // SOM Mensal: Participação Obtível Realista dividida pelos players no raio com peso de entrante digital
  const totalPlayersAfterEntry = competitorCount + 1;
  const rawShare = 1 / totalPlayersAfterEntry;
  const realisticCaptureCap = clamp(rawShare * 0.85, 0.03, 0.45);
  const somMonthlyCents = Math.round(samMonthlyCents * realisticCaptureCap);
  const estimatedMarketSharePct = roundTo(realisticCaptureCap * 100, 2);

  return {
    tamMonthlyCents,
    samMonthlyCents,
    somMonthlyCents,
    estimatedMarketSharePct,
    catchmentPopulation,
    monthlySpendPerCapitaCents,
  };
}

/**
 * 5. Fórmula Canônica de Precificação Dinâmica Cortex 360:
 * Preço Dinâmico = Preço Base * (1 + \alpha * Sentimento de Mercado) * (1 + \beta * Escassez Local) * (1 - \gamma * Pressão da Concorrência)
 */
export function computeCortex360DynamicPrice(
  input: Cortex360DynamicPriceInput,
): Cortex360DynamicPriceResult {
  const basePriceCents = Math.max(0, Math.round(Number(input.basePriceCents) || 0));
  const alpha = clamp(Number(input.marketSentimentAlpha || 0), -0.5, 0.8);
  const beta = clamp(Number(input.localScarcityBeta || 0), -0.5, 0.8);
  const gamma = clamp(Number(input.competitorPressureGamma || 0), 0, 0.75);

  const sentimentSignal =
    input.sentimentScore !== undefined ? clamp(Number(input.sentimentScore), -1, 1) : 1.0;
  const scarcitySignal =
    input.scarcityScore !== undefined ? clamp(Number(input.scarcityScore), -1, 1) : 1.0;
  const competitionSignal =
    input.competitionScore !== undefined ? clamp(Number(input.competitionScore), 0, 1) : 1.0;

  const sentimentFactor = roundTo(1 + alpha * sentimentSignal, 4);
  const scarcityFactor = roundTo(1 + beta * scarcitySignal, 4);
  const competitionFactor = roundTo(1 - gamma * competitionSignal, 4);

  const rawMultiplier = sentimentFactor * scarcityFactor * competitionFactor;
  const multiplier = roundTo(clamp(rawMultiplier, 0.5, 2.2), 4);
  const dynamicPriceCents = Math.round(basePriceCents * multiplier);

  const deltaPct = roundTo((multiplier - 1) * 100, 1);
  let rationale = "";
  if (deltaPct > 3) {
    rationale = `Prêmio de +${deltaPct}% sustentado por sentimento favorável e baixa saturação na isócrona local.`;
  } else if (deltaPct < -3) {
    rationale = `Ajuste competitivo de ${deltaPct}% recomendado para acelerar penetração frente à pressão de concorrentes no raio.`;
  } else {
    rationale = `Preço base em equilíbrio ótimo (${deltaPct >= 0 ? "+" : ""}${deltaPct}%) com a elasticidade e concorrência local.`;
  }

  return {
    basePriceCents,
    dynamicPriceCents,
    multiplier,
    sentimentFactor,
    scarcityFactor,
    competitionFactor,
    rationale,
  };
}
