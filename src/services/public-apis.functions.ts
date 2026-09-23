import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import {
  validateCpfMod11,
  validateCnpjMod11,
  cleanDocument,
  validateBirthDate,
} from "@/lib/document-validator";
import { executeUnifiedAiCall } from "@/services/api-orchestrator.functions";
import { enrichCnpj } from "@/lib/mining/cnpj-enrichment.engine";

export interface ResolvedAddressDTO {
  cep: string;
  street: string;
  number?: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  latitude?: number | null;
  longitude?: number | null;
  fullAddress: string;
  provider: "brasilapi_v2" | "viacep_fallback" | "nominatim" | "manual";
}

export interface CnpjCompanyDTO {
  cnpj: string;
  corporateName: string;
  tradeName: string;
  registrationStatus: string;
  openingDate: string;
  mainCnae: {
    code: number | string;
    description: string;
  };
  legalNature?: string;
  capitalSocial?: number;
  phone?: string;
  email?: string;
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    cep: string;
    latitude?: number | null;
    longitude?: number | null;
  };
  socios?: Array<{ nome: string; qualificacao?: string; cpf_cnpj_socio?: string }>;
  dataQualityScore?: number;
  source?: string;
}

export interface PublicApiGovernanceDTO {
  defaultMapProvider: "carto_voyager" | "carto_dark" | "osm_standard" | "google_maps" | "mapbox";
  isMapServiceActive: boolean;
  isCepAutoFillActive: boolean;
  isCnpjLookupActive: boolean;
  isCpfValidationActive: boolean;
  isBirthDateValidationActive: boolean;
  isOsmGeocodingActive: boolean;
  isAiAddressParserActive: boolean;
  primaryCepProvider: "brasilapi_v2" | "viacep";
  timeoutMs: number;
  isSimLabsClassifiedTelemetryActive: boolean;
}

export const DEFAULT_PUBLIC_API_GOVERNANCE: PublicApiGovernanceDTO = {
  defaultMapProvider: "osm_standard",
  isMapServiceActive: true,
  isCepAutoFillActive: true,
  isCnpjLookupActive: true,
  isCpfValidationActive: true,
  isBirthDateValidationActive: true,
  isOsmGeocodingActive: true,
  isAiAddressParserActive: true,
  primaryCepProvider: "brasilapi_v2",
  timeoutMs: 4000,
  isSimLabsClassifiedTelemetryActive: false,
};

const NOMINATIM_USER_AGENT = "WaesyPlatform/1.0 (contato@usewaesy.com)";

/**
 * Consulta de CEP de alta precisão cirúrgica via BrasilAPI v2 (com coordenadas geográficas)
 * e fallback resiliente automático para o ViaCEP.
 */
export const lookupCep = createServerFn({ method: "POST" })
  .validator(
    z.object({
      cep: z.string().min(5),
    })
  )
  .handler(async ({ data: { cep } }): Promise<ResolvedAddressDTO> => {
    const cleanCep = cleanDocument(cep);
    if (cleanCep.length !== 8) {
      throw new Error("CEP deve conter exatamente 8 dígitos numéricos.");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    // 1. Tentar BrasilAPI v2 (que retorna coordenadas latitude e longitude!)
    try {
      const brasilApiUrl = `https://brasilapi.com.br/api/cep/v2/${cleanCep}`;
      const res = await fetch(brasilApiUrl, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });

      if (res.ok) {
        clearTimeout(timeoutId);
        const data = await res.json();
        const street = data.street || "";
        const neighborhood = data.neighborhood || "";
        const city = data.city || "";
        const state = (data.state || "").toUpperCase();

        let lat: number | null = null;
        let lng: number | null = null;

        if (data.location?.coordinates) {
          const rawLat = parseFloat(data.location.coordinates.latitude);
          const rawLng = parseFloat(data.location.coordinates.longitude);
          if (!isNaN(rawLat) && !isNaN(rawLng)) {
            lat = Number(rawLat.toFixed(6));
            lng = Number(rawLng.toFixed(6));
          }
        }

        // Se a BrasilAPI não retornou coordenadas para o CEP, buscar via Nominatim
        if (!lat || !lng) {
          const geo = await forwardGeocodeInternal(street, neighborhood, city, state);
          if (geo) {
            lat = geo.lat;
            lng = geo.lng;
          }
        }

        const fullAddress = [street, neighborhood, `${city} - ${state}`]
          .filter(Boolean)
          .join(", ");

        return {
          cep: cleanCep,
          street,
          neighborhood,
          city,
          state,
          latitude: lat,
          longitude: lng,
          fullAddress,
          provider: "brasilapi_v2",
        };
      }
    } catch {
      // Fallback para o ViaCEP
    } finally {
      clearTimeout(timeoutId);
    }

    // 2. Fallback resiliente: ViaCEP
    try {
      const viaCepRes = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`, {
        headers: { Accept: "application/json" },
      });

      if (viaCepRes.ok) {
        const viaData = await viaCepRes.json();
        if (!viaData.erro) {
          const street = viaData.logradouro || "";
          const neighborhood = viaData.bairro || "";
          const city = viaData.localidade || "";
          const state = (viaData.uf || "").toUpperCase();

          // Obter coordenadas no OpenStreetMap Nominatim
          const geo = await forwardGeocodeInternal(street, neighborhood, city, state);

          const fullAddress = [street, neighborhood, `${city} - ${state}`]
            .filter(Boolean)
            .join(", ");

          return {
            cep: cleanCep,
            street,
            neighborhood,
            city,
            state,
            latitude: geo?.lat || null,
            longitude: geo?.lng || null,
            fullAddress,
            provider: "viacep_fallback",
          };
        }
      }
    } catch (e: any) {
      console.warn("[lookupCep] Erro no fallback ViaCEP:", e.message);
    }

    throw new Error("Não foi possível localizar este CEP no banco nacional.");
  });

/**
 * Helper interno para Geocodificação OpenStreetMap Nominatim
 */
async function forwardGeocodeInternal(
  street: string,
  neighborhood: string,
  city: string,
  state: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const queryParts = [street, neighborhood, city, state, "Brasil"].filter(Boolean);
    if (queryParts.length < 2) return null;

    const query = queryParts.join(", ");
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query
    )}&limit=1`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": NOMINATIM_USER_AGENT,
        Accept: "application/json",
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
        }
      }
    }
  } catch {
    // Silencioso
  }
  return null;
}

/**
 * Consulta de dados cadastrais oficiais de empresas (CNPJ) via BrasilAPI Receita Federal
 */
export async function internalLookupCnpj(cnpj: string): Promise<CnpjCompanyDTO> {
  const clean = cleanDocument(cnpj);
  if (clean.length !== 14) {
    throw new Error("CNPJ deve conter exatamente 14 dígitos.");
  }

  if (!validateCnpjMod11(clean)) {
    throw new Error("CNPJ inválido (dígitos verificadores incorretos).");
  }

  const enriched = await enrichCnpj(clean);
  if (!enriched) {
    throw new Error("CNPJ não localizado na base pública da Receita Federal ou serviços indisponíveis.");
  }

  const street = enriched.endereco?.logradouro || "";
  const number = enriched.endereco?.numero || "S/N";
  const neighborhood = enriched.endereco?.bairro || "";
  const city = enriched.endereco?.municipio || "";
  const state = (enriched.endereco?.uf || "").toUpperCase();
  const zipCode = (enriched.endereco?.cep || "").replace(/\D/g, "");

  let geo: { lat: number; lng: number } | null = null;
  if (street && city) {
    try {
      geo = await forwardGeocodeInternal(
        `${street} ${number}`,
        neighborhood,
        city,
        state
      );
    } catch {
      // Degradação graciosa em caso de indisponibilidade de geocodificação
    }
  }

  return {
    cnpj: clean,
    corporateName: enriched.razao_social,
    tradeName: enriched.nome_fantasia || enriched.razao_social,
    registrationStatus: enriched.situacao_cadastral || "ATIVA",
    openingDate: enriched.data_inicio_atividade || "",
    mainCnae: {
      code: enriched.cnae_principal?.codigo || "",
      description: enriched.cnae_principal?.descricao || "Atividade comercial",
    },
    legalNature: enriched.natureza_juridica,
    capitalSocial: enriched.capital_social,
    phone: enriched.telefones?.[0],
    email: enriched.email,
    address: {
      street,
      number,
      complement: enriched.endereco?.complemento || "",
      neighborhood,
      city,
      state,
      cep: zipCode,
      latitude: geo?.lat || null,
      longitude: geo?.lng || null,
    },
    socios: enriched.socios,
    dataQualityScore: enriched.dataQualityScore,
    source: enriched.source,
  };
}

export const lookupCnpj = createServerFn({ method: "POST" })
  .validator(
    z.object({
      cnpj: z.string().min(14),
    })
  )
  .handler(async ({ data: { cnpj } }): Promise<CnpjCompanyDTO> => internalLookupCnpj(cnpj));

/**
 * Reverse geocoding de alta precisão ao mover o pino no mapa real (OpenStreetMap Nominatim)
 */
export const reverseGeocode = createServerFn({ method: "POST" })
  .validator(
    z.object({
      lat: z.number(),
      lng: z.number(),
    })
  )
  .handler(async ({ data: { lat, lng } }) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": NOMINATIM_USER_AGENT,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        throw new Error("Falha ao resolver endereço reverso.");
      }

      const data = await res.json();
      const addr = data.address || {};

      const street = addr.road || addr.street || "";
      const number = addr.house_number || "";
      const neighborhood = addr.suburb || addr.neighbourhood || addr.city_district || "";
      const city = addr.city || addr.town || addr.municipality || addr.village || "";
      const state = (addr.state || "").toUpperCase();
      const zipCode = addr.postcode || "";

      return {
        street,
        number,
        neighborhood,
        city,
        state,
        zipCode,
        fullAddress: data.display_name || `${street}, ${number} - ${city}`,
        latitude: lat,
        longitude: lng,
      };
    } catch (e: any) {
      throw new Error(e.message || "Erro no reverse geocode.");
    }
  });

/**
 * Autopreenchimento de Endereço Inteligente (IA Unificada + Geocodificação Real)
 * Decompõe qualquer texto livre/colado de endereço e valida com BrasilAPI v2 / ViaCEP e OpenStreetMap.
 */
export const parseAddressWithAI = createServerFn({ method: "POST" })
  .validator(
    z.object({
      rawText: z.string().min(5),
    })
  )
  .handler(async ({ data: { rawText } }): Promise<ResolvedAddressDTO> => {
    const text = rawText.trim();

    // 1. Extração preliminar de CEP via regex para fast-path
    const cepMatch = text.match(/\b\d{5}-?\d{3}\b/);
    let extractedCep = cepMatch ? cleanDocument(cepMatch[0]) : "";

    // Se temos CEP explícito de 8 dígitos, consultar diretamente a BrasilAPI v2 / ViaCEP
    if (extractedCep.length === 8) {
      try {
        const resolved = await lookupCep({ data: { cep: extractedCep } });
        const numMatch = text.match(/\b(?:n[º°.]?|número|num)\s*(\d+)\b/i) || text.match(/,\s*(\d{1,5})\b/);
        const number = numMatch ? numMatch[1] : undefined;

        return {
          ...resolved,
          number,
          fullAddress: number ? `${resolved.street}, ${number} - ${resolved.neighborhood}, ${resolved.city} - ${resolved.state}` : resolved.fullAddress,
        };
      } catch {
        // Prossegue com desconstrução inteligente
      }
    }

    // 2. Extração Estruturada via Orquestrador Universal de IA
    try {
      const aiRes = await executeUnifiedAiCall({
        systemInstruction: `Você é o Especialista em Normalização de Endereços Brasileiros da Waesy Platform.
Sua missão é decompor qualquer texto livre de endereço nas partes cadastrais canônicas do Brasil.
Retorne EXCLUSIVAMENTE um JSON estrito no formato:
{
  "street": "Logradouro (Rua, Avenida, Travessa, etc.) sem número nem complemento, ou null",
  "number": "Número predial ou null",
  "complement": "Complemento (Apto, Bloco, Sala, etc.) ou null",
  "neighborhood": "Bairro ou null",
  "city": "Município/Cidade ou null",
  "state": "Sigla da UF com 2 letras maiúsculas ou null",
  "cep": "CEP limpo de 8 dígitos se puder ser inferido ou null"
}`,
        prompt: `Endereço para normalização:\n"${text}"`,
        temperature: 0.1,
        expectJson: true,
      });

      const parsed = aiRes.parsedJson as any;

      if (parsed && (parsed.street || parsed.city)) {
        const aiCep = parsed.cep ? cleanDocument(String(parsed.cep)) : "";
        
        // Se a IA identificou ou deduziu o CEP, valida na BrasilAPI v2
        if (aiCep.length === 8) {
          try {
            const resolved = await lookupCep({ data: { cep: aiCep } });
            const finalNumber = parsed.number || undefined;
            return {
              ...resolved,
              number: finalNumber,
              complement: parsed.complement || undefined,
              fullAddress: finalNumber
                ? `${resolved.street}, ${finalNumber} - ${resolved.neighborhood}, ${resolved.city} - ${resolved.state}`
                : resolved.fullAddress,
            };
          } catch {
            // Segue com as partes extraídas pela IA
          }
        }

        const street = parsed.street || "";
        const number = parsed.number || "";
        const complement = parsed.complement || "";
        const neighborhood = parsed.neighborhood || "";
        const city = parsed.city || "";
        const state = (parsed.state || "").toUpperCase();

        // Tentar geocodificar com alta precisão via Nominatim
        const geo = await forwardGeocodeInternal(
          `${street} ${number}`.trim(),
          neighborhood,
          city,
          state
        );

        const fullAddress = [
          street ? `${street}${number ? `, ${number}` : ""}` : "",
          complement ? `(${complement})` : "",
          neighborhood,
          city ? `${city} - ${state}` : state,
        ].filter(Boolean).join(" - ");

        return {
          cep: aiCep || extractedCep,
          street,
          number: number || undefined,
          complement: complement || undefined,
          neighborhood,
          city,
          state,
          latitude: geo?.lat || null,
          longitude: geo?.lng || null,
          fullAddress: fullAddress || text,
          provider: geo ? "nominatim" : "manual",
        };
      }
    } catch (e: any) {
      console.warn("[parseAddressWithAI] IA indisponível, aplicando heurística de fallback:", e.message);
    }

    // 3. Heurística de Fallback com Regex + Nominatim
    const ufMatch = text.match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/i);
    const state = ufMatch ? ufMatch[1].toUpperCase() : "";

    const numMatch = text.match(/\b(?:n[º°.]?|número|num)\s*(\d+)\b/i) || text.match(/,\s*(\d{1,5})\b/);
    const number = numMatch ? numMatch[1] : undefined;

    let lat: number | null = null;
    let lng: number | null = null;
    let displayName = text;

    try {
      const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        text
      )}&limit=1&addressdetails=1`;

      const res = await fetch(geoUrl, {
        headers: {
          "User-Agent": NOMINATIM_USER_AGENT,
          Accept: "application/json",
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          lat = Number(parseFloat(data[0].lat).toFixed(6));
          lng = Number(parseFloat(data[0].lon).toFixed(6));
          displayName = data[0].display_name;

          const addr = data[0].address || {};
          return {
            cep: extractedCep || cleanDocument(addr.postcode) || "",
            street: addr.road || addr.street || "",
            number: number || addr.house_number || "",
            neighborhood: addr.suburb || addr.neighbourhood || "",
            city: addr.city || addr.town || addr.municipality || "",
            state: state || (addr.state || "").slice(0, 2).toUpperCase(),
            latitude: lat,
            longitude: lng,
            fullAddress: displayName,
            provider: "nominatim",
          };
        }
      }
    } catch {
      // Silencioso
    }

    return {
      cep: extractedCep,
      street: text,
      number,
      neighborhood: "",
      city: "",
      state,
      latitude: lat,
      longitude: lng,
      fullAddress: text,
      provider: "manual",
    };
  });

export interface ExchangeRateDTO {
  pair: string;
  code: string;
  codein: string;
  name: string;
  bid: number;
  ask: number;
  high: number;
  low: number;
  pctChange: number;
  updatedAt: string;
}

let exchangeRateCache: {
  timestamp: number;
  data: Record<string, ExchangeRateDTO>;
} | null = null;

const EXCHANGE_CACHE_TTL_MS = 60 * 1000; // 60 segundos de cache

/**
 * Consulta de Cotação de Câmbio Oficial em Tempo Real via AwesomeAPI (Regra 21)
 * Suporte a pares de moedas para Turismo, E-commerce e Alertas Econômicos.
 */
export async function internalGetRealtimeExchangeRates(
  customPairs?: string[]
): Promise<Record<string, ExchangeRateDTO>> {
  const pairs = customPairs || ["USD-BRL", "EUR-BRL", "GBP-BRL", "ARS-BRL", "CLP-BRL"];
  const pairsKey = pairs.join(",");

  // 1. Cache em memória para economia de rede
  if (exchangeRateCache && Date.now() - exchangeRateCache.timestamp < EXCHANGE_CACHE_TTL_MS) {
    return exchangeRateCache.data;
  }

    try {
      const url = `https://economia.awesomeapi.com.br/last/${pairsKey}`;
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        throw new Error(`AwesomeAPI retornou status HTTP ${res.status}`);
      }

      const json = await res.json();
      const result: Record<string, ExchangeRateDTO> = {};

      for (const [, item] of Object.entries(json as Record<string, any>)) {
        if (!item?.code || !item?.codein) continue;
        const pairName = `${item.code}-${item.codein}`;
        result[pairName] = {
          pair: pairName,
          code: item.code,
          codein: item.codein,
          name: item.name || pairName,
          bid: Number(parseFloat(item.bid || "0").toFixed(4)),
          ask: Number(parseFloat(item.ask || "0").toFixed(4)),
          high: Number(parseFloat(item.high || "0").toFixed(4)),
          low: Number(parseFloat(item.low || "0").toFixed(4)),
          pctChange: Number(parseFloat(item.pctChange || "0").toFixed(2)),
          updatedAt: item.create_date || new Date().toISOString(),
        };
      }

      exchangeRateCache = {
        timestamp: Date.now(),
        data: result,
      };

      return result;
    } catch (err: any) {
      console.warn("[getRealtimeExchangeRates] Falha ao obter cotações:", err.message);
      if (exchangeRateCache?.data) {
        return exchangeRateCache.data;
      }
      return {};
    }
}

export const getRealtimeExchangeRates = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        pairs: z
          .array(z.string())
          .default(["USD-BRL", "EUR-BRL", "GBP-BRL", "ARS-BRL", "CLP-BRL"])
          .optional(),
      })
      .optional()
  )
  .handler(async ({ data }): Promise<Record<string, ExchangeRateDTO>> => internalGetRealtimeExchangeRates(data?.pairs));

export interface ApiPingResult {
  id: string;
  name: string;
  category: "maps" | "cep" | "cnpj" | "geocoding" | "currency" | "weather";
  url: string;
  status: "online" | "degraded" | "offline";
  latencyMs: number;
  httpStatus: number;
  message?: string;
}

/**
 * Diagnóstico e Teste de Latência em Tempo Real (Ping Test) para todas as APIs Públicas Globais
 */
export const pingPublicApis = createServerFn({ method: "GET" }).handler(
  async (): Promise<ApiPingResult[]> => {
    const tests = [
      {
        id: "brasilapi_cep",
        name: "BrasilAPI (CEP v2 + Coordenadas)",
        category: "cep" as const,
        url: "https://brasilapi.com.br/api/cep/v2/01310100",
      },
      {
        id: "viacep",
        name: "ViaCEP (Fallback Nacional)",
        category: "cep" as const,
        url: "https://viacep.com.br/ws/01310100/json/",
      },
      {
        id: "brasilapi_cnpj",
        name: "BrasilAPI (Consulta Oficial CNPJ)",
        category: "cnpj" as const,
        url: "https://brasilapi.com.br/api/cnpj/v1/00000000000191",
      },
      {
        id: "awesomeapi_fx",
        name: "AwesomeAPI (Câmbio Comercial em Tempo Real)",
        category: "currency" as const,
        url: "https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL",
      },
      {
        id: "wttr_weather",
        name: "wttr.in (Meteorologia sem API Key)",
        category: "weather" as const,
        url: "https://wttr.in/Brasilia?format=j1&lang=pt",
      },
      {
        id: "carto_tiles",
        name: "CARTO Voyager / OSM Tile Server (Sem API Key)",
        category: "maps" as const,
        url: "https://a.basemaps.cartocdn.com/rastertiles/voyager/0/0/0.png",
      },
      {
        id: "osm_nominatim",
        name: "OpenStreetMap Nominatim (Geocodificador)",
        category: "geocoding" as const,
        url: "https://nominatim.openstreetmap.org/search?format=json&q=Chapeco+SC&limit=1",
      },
    ];

    const results = await Promise.all(
      tests.map(async (t) => {
        const start = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
          const res = await fetch(t.url, {
            signal: controller.signal,
            headers: {
              "User-Agent": NOMINATIM_USER_AGENT,
              Accept: "*/*",
            },
          });

          const latencyMs = Date.now() - start;
          clearTimeout(timeoutId);

          let status: "online" | "degraded" | "offline" = "online";
          if (!res.ok) {
            status = "offline";
          } else if (latencyMs > 1500) {
            status = "degraded";
          }

          return {
            id: t.id,
            name: t.name,
            category: t.category,
            url: t.url,
            status,
            latencyMs,
            httpStatus: res.status,
          };
        } catch (e: any) {
          clearTimeout(timeoutId);
          return {
            id: t.id,
            name: t.name,
            category: t.category,
            url: t.url,
            status: "offline" as const,
            latencyMs: Date.now() - start,
            httpStatus: 0,
            message: e.name === "AbortError" ? "Timeout (> 5000ms)" : e.message,
          };
        }
      })
    );

    return results;
  }
);

/**
 * Obtém as configurações de governança das APIs públicas
 */
export const getPublicApiGovernanceSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicApiGovernanceDTO> => {
    const supabase = getServerClient();

    // 1. Tentar ler de qualquer loja raiz da plataforma com governança salva
    try {
      const { data: rootStores } = await supabase
        .from("stores")
        .select("id, settings")
        .or("slug.eq.waesy-matriz,is_platform_root.eq.true")
        .order("updated_at", { ascending: false });

      if (rootStores && rootStores.length > 0) {
        for (const store of rootStores) {
          const rootGov = (store?.settings as any)?.public_apis_governance;
          if (rootGov && typeof rootGov === "object" && rootGov.defaultMapProvider) {
            return {
              ...DEFAULT_PUBLIC_API_GOVERNANCE,
              ...rootGov,
              isMapServiceActive: rootGov.isMapServiceActive ?? true,
            };
          }
        }
      }
    } catch {
      // Falha defensiva: prosseguir para fallback
    }

    // 2. Fallback para integration_credentials
    try {
      const { data: record } = await supabase
        .from("integration_credentials")
        .select("token_payload, is_active")
        .eq("provider", "public_apis_governance")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (record && record.token_payload) {
        return {
          ...DEFAULT_PUBLIC_API_GOVERNANCE,
          ...(record.token_payload as any),
          isMapServiceActive: record.is_active ?? true,
        };
      }
    } catch {
      // Ignora erro de RLS
    }

    return DEFAULT_PUBLIC_API_GOVERNANCE;
  }
);

/**
 * Salva as configurações de governança das APIs públicas
 */
export const savePublicApiGovernanceSettings = createServerFn({ method: "POST" })
  .validator(
    z.object({
      settings: z.object({
        defaultMapProvider: z.enum(["carto_voyager", "carto_dark", "osm_standard", "google_maps", "mapbox"]),
        isMapServiceActive: z.boolean(),
        isCepAutoFillActive: z.boolean(),
        isCnpjLookupActive: z.boolean(),
        isCpfValidationActive: z.boolean(),
        isBirthDateValidationActive: z.boolean(),
        isOsmGeocodingActive: z.boolean(),
        isAiAddressParserActive: z.boolean(),
        primaryCepProvider: z.enum(["brasilapi_v2", "viacep"]),
        timeoutMs: z.number().min(1000).max(15000),
        isSimLabsClassifiedTelemetryActive: z.boolean().default(false),
      }),
    })
  )
  .handler(async ({ data: { settings } }) => {
    const supabase = getServerClient();
    let storeId: string | null = null;
    try {
      const identity = await getServerIdentity();
      storeId = identity.store_id || null;
    } catch {
      // Admin master global sem store_id fixo na sessão
    }

    // 1. Atualizar todas as lojas raiz identificadas para sincronia total
    const { data: rootStores } = await supabase
      .from("stores")
      .select("id, settings")
      .or("slug.eq.waesy-matriz,is_platform_root.eq.true");

    if (rootStores && rootStores.length > 0) {
      if (!storeId) {
        storeId = rootStores[0].id;
      }
      for (const store of rootStores) {
        const existingSettings = (store.settings as Record<string, any>) || {};
        await supabase
          .from("stores")
          .update({
            settings: {
              ...existingSettings,
              public_apis_governance: settings,
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", store.id);
      }
    }

    // 2. Persistir em integration_credentials com o storeId do root ou do admin
    if (storeId) {
      await supabase
        .from("integration_credentials")
        .upsert(
          {
            store_id: storeId,
            provider: "public_apis_governance",
            is_active: settings.isMapServiceActive,
            token_payload: settings,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "store_id, provider" }
        );

      // Sincronizar também com a credencial legada map_service
      await supabase
        .from("integration_credentials")
        .upsert(
          {
            store_id: storeId,
            provider: "map_service",
            is_active: settings.isMapServiceActive,
            token_payload: { provider: settings.defaultMapProvider },
            updated_at: new Date().toISOString(),
          },
          { onConflict: "store_id, provider" }
        );
    }

    return { status: "success" };
  });

// ============================================================
// METEOROLOGIA & CLIMA REAL (BFF AUTHORITATIVE - REGRA 1 & 21)
// ============================================================

export interface WeatherDayDTO {
  day: string;
  date: string;
  maxTempC: number;
  minTempC: number;
  condition: "sun" | "cloud" | "rain" | "wind";
  conditionText: string;
  iconCode: number;
}

export interface WeatherForecastDTO {
  city: string;
  source: "wttr_in" | "open_meteo";
  updatedAt: string;
  days: WeatherDayDTO[];
}

interface CachedWeather {
  timestamp: number;
  data: WeatherForecastDTO;
}

const weatherMemoryCache = new Map<string, CachedWeather>();
const WEATHER_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos

const DAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function resolveWeatherCondition(weatherCode: number): "sun" | "cloud" | "rain" | "wind" {
  if (weatherCode >= 200 && weatherCode <= 299) return "rain"; // thunderstorm
  if (weatherCode >= 300 && weatherCode <= 399) return "rain"; // drizzle
  if (weatherCode >= 500 && weatherCode <= 599) return "rain"; // rain
  if (weatherCode >= 600 && weatherCode <= 699) return "cloud"; // snow
  if (weatherCode >= 700 && weatherCode <= 799) return "wind"; // atmosphere
  if (weatherCode === 800) return "sun"; // clear sky
  if (weatherCode >= 801) return "cloud"; // clouds
  return "sun";
}

function resolveOpenMeteoCondition(code: number): { condition: "sun" | "cloud" | "rain" | "wind"; text: string } {
  if (code === 0) return { condition: "sun", text: "Céu limpo" };
  if (code >= 1 && code <= 3) return { condition: "cloud", text: "Parcialmente nublado" };
  if (code >= 45 && code <= 48) return { condition: "cloud", text: "Nevoeiro" };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { condition: "rain", text: "Chuva" };
  if (code >= 71 && code <= 77) return { condition: "cloud", text: "Neve" };
  if (code >= 95) return { condition: "rain", text: "Tempestade com raios" };
  return { condition: "sun", text: "Ensolarado" };
}

/**
 * Consulta de Previsão do Tempo Real com Cache Server-Side e Failover Automático.
 * 1. Provedor Primário: wttr.in
 * 2. Provedor Secundário (Failover): Open-Meteo API
 */
/**
 * Consulta de Previsão do Tempo Real com Cache Server-Side e Failover Automático (Função Pura).
 * 1. Provedor Primário: wttr.in
 * 2. Provedor Secundário (Failover): Open-Meteo API
 */
export async function internalGetCityWeather(city: string): Promise<WeatherForecastDTO> {
  const cleanCity = city.trim();
  const cacheKey = cleanCity.toLowerCase();

  // 1. Verificar cache em memória
  const cached = weatherMemoryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < WEATHER_CACHE_TTL_MS) {
    return cached.data;
  }

  // 2. Provedor Primário: wttr.in
  try {
    const encoded = encodeURIComponent(cleanCity);
    const wttrRes = await fetch(`https://wttr.in/${encoded}?format=j1&lang=pt`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(4500),
    });

    if (wttrRes.ok) {
      const json = await wttrRes.json();
      const weather = json?.weather;
      if (Array.isArray(weather) && weather.length > 0) {
        const days: WeatherDayDTO[] = weather.slice(0, 3).map((w: any, idx: number) => {
          const date = w.date ? new Date(w.date) : new Date(Date.now() + idx * 86400000);
          const dayName = idx === 0 ? "Hoje" : idx === 1 ? "Amanhã" : DAYS_PT[date.getDay()];
          const hourly = w.hourly?.[4]; // meio-dia
          const code = parseInt(hourly?.weatherCode || "800", 10);
          return {
            day: dayName,
            date: w.date || date.toISOString().slice(0, 10),
            maxTempC: parseInt(w.maxtempC || "28", 10),
            minTempC: parseInt(w.mintempC || "22", 10),
            condition: resolveWeatherCondition(code),
            conditionText: hourly?.weatherDesc?.[0]?.value || "Parcialmente nublado",
            iconCode: code,
          };
        });

        const result: WeatherForecastDTO = {
          city: cleanCity,
          source: "wttr_in",
          updatedAt: new Date().toISOString(),
          days,
        };

        weatherMemoryCache.set(cacheKey, { timestamp: Date.now(), data: result });
        return result;
      }
    }
  } catch (err: any) {
    console.warn(`[getCityWeather] wttr.in falhou para "${cleanCity}":`, err?.message);
  }

  // 3. Provedor Secundário (Failover Resiliente): Open-Meteo
  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanCity)}&count=1&language=pt&format=json`;
    const geoRes = await fetch(geoUrl, { signal: AbortSignal.timeout(4000) });
    if (geoRes.ok) {
      const geoData = await geoRes.json();
      const first = geoData?.results?.[0];
      if (first?.latitude && first?.longitude) {
        const meteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${first.latitude}&longitude=${first.longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
        const meteoRes = await fetch(meteoUrl, { signal: AbortSignal.timeout(4000) });
        if (meteoRes.ok) {
          const meteoJson = await meteoRes.json();
          const daily = meteoJson?.daily;
          if (Array.isArray(daily?.time) && daily.time.length > 0) {
            const days: WeatherDayDTO[] = daily.time.slice(0, 3).map((dStr: string, idx: number) => {
              const date = new Date(dStr);
              const dayName = idx === 0 ? "Hoje" : idx === 1 ? "Amanhã" : DAYS_PT[date.getDay()];
              const code = daily.weather_code?.[idx] ?? 0;
              const info = resolveOpenMeteoCondition(code);
              return {
                day: dayName,
                date: dStr,
                maxTempC: Math.round(daily.temperature_2m_max?.[idx] ?? 26),
                minTempC: Math.round(daily.temperature_2m_min?.[idx] ?? 20),
                condition: info.condition,
                conditionText: info.text,
                iconCode: code,
              };
            });

            const result: WeatherForecastDTO = {
              city: cleanCity,
              source: "open_meteo",
              updatedAt: new Date().toISOString(),
              days,
            };

            weatherMemoryCache.set(cacheKey, { timestamp: Date.now(), data: result });
            return result;
          }
        }
      }
    }
  } catch (err: any) {
    console.warn(`[getCityWeather] Open-Meteo fallback falhou para "${cleanCity}":`, err?.message);
  }

  // Se ambos falharem e houver cache antigo, retornar cache mesmo vencido
  if (cached) {
    return cached.data;
  }

  throw new Error(`Dados de previsão do tempo temporariamente indisponíveis para "${cleanCity}".`);
}

export const getCityWeather = createServerFn({ method: "GET" })
  .validator(
    z.object({
      city: z.string().min(2, "Nome da cidade é obrigatório"),
    })
  )
  .handler(async ({ data: { city } }): Promise<WeatherForecastDTO> => internalGetCityWeather(city));

/**
 * Conversão de Câmbio em Tempo Real via AwesomeAPI com suporte a múltiplas moedas (Função Pura).
 */
export async function internalConvertCurrency(
  amount: number,
  from = "USD",
  to = "BRL"
): Promise<{ convertedAmount: number; rate: number; pair: string; updatedAt: string }> {
  const pair = `${from.toUpperCase()}-${to.toUpperCase()}`;
  const rates = await internalGetRealtimeExchangeRates([pair]);
  const exchange = rates[pair];
  if (!exchange || !exchange.bid) {
    throw new Error(`Taxa de câmbio para o par ${pair} indisponível no momento.`);
  }
  const rate = exchange.bid;
  const convertedAmount = Number((amount * rate).toFixed(2));
  return {
    convertedAmount,
    rate,
    pair,
    updatedAt: exchange.updatedAt,
  };
}

export const convertCurrency = createServerFn({ method: "GET" })
  .validator(
    z.object({
      amount: z.number().positive(),
      from: z.string().default("USD"),
      to: z.string().default("BRL"),
    })
  )
  .handler(async ({ data }) => internalConvertCurrency(data.amount, data.from, data.to));
