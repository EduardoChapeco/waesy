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
export const lookupCnpj = createServerFn({ method: "POST" })
  .validator(
    z.object({
      cnpj: z.string().min(14),
    })
  )
  .handler(async ({ data: { cnpj } }): Promise<CnpjCompanyDTO> => {
    const clean = cleanDocument(cnpj);
    if (clean.length !== 14) {
      throw new Error("CNPJ deve conter exatamente 14 dígitos.");
    }

    if (!validateCnpjMod11(clean)) {
      throw new Error("CNPJ inválido (dígitos verificadores incorretos).");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("CNPJ não localizado na base pública da Receita Federal.");
        }
        throw new Error(`Falha na consulta do CNPJ (código HTTP ${res.status}).`);
      }

      const data = await res.json();

      const street = [data.descricao_tipo_de_logradouro, data.logradouro]
        .filter(Boolean)
        .join(" ")
        .trim();
      const number = String(data.numero || "S/N").trim();
      const complement = data.complemento || "";
      const neighborhood = data.bairro || "";
      const city = data.municipio || "";
      const state = (data.uf || "").toUpperCase();
      const zipCode = data.cep || "";

      // Tenta geocodificar o endereço da empresa
      const geo = await forwardGeocodeInternal(
        `${street} ${number}`,
        neighborhood,
        city,
        state
      );

      return {
        cnpj: clean,
        corporateName: data.razao_social || "",
        tradeName: data.nome_fantasia || data.razao_social || "",
        registrationStatus: data.descricao_situacao_cadastral || "ATIVA",
        openingDate: data.data_inicio_atividade || "",
        mainCnae: {
          code: data.cnae_fiscal,
          description: data.cnae_fiscal_descricao || "Atividade comercial",
        },
        legalNature: data.natureza_juridica,
        capitalSocial: data.capital_social ? Number(data.capital_social) : undefined,
        phone: data.ddd_telefone_1 ? `(${data.ddd_telefone_1.slice(0, 2)}) ${data.ddd_telefone_1.slice(2)}` : undefined,
        email: data.email || undefined,
        address: {
          street,
          number,
          complement,
          neighborhood,
          city,
          state,
          cep: zipCode,
          latitude: geo?.lat || null,
          longitude: geo?.lng || null,
        },
      };
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new Error("Tempo limite esgotado ao consultar a Receita Federal via BrasilAPI.");
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  });

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
 * Autopreenchimento de Endereço Inteligente (IA / Heurística NLP)
 * Aceita qualquer texto livre de endereço colado e decompõe com precisão cirúrgica.
 */
export const parseAddressWithAI = createServerFn({ method: "POST" })
  .validator(
    z.object({
      rawText: z.string().min(5),
    })
  )
  .handler(async ({ data: { rawText } }): Promise<ResolvedAddressDTO> => {
    const text = rawText.trim();

    // 1. Extração de CEP
    const cepMatch = text.match(/\b\d{5}-?\d{3}\b/);
    let extractedCep = cepMatch ? cleanDocument(cepMatch[0]) : "";

    // Se temos CEP, já consultamos a BrasilAPI v2 para ancorar com extrema fidelidade
    if (extractedCep.length === 8) {
      try {
        const resolved = await lookupCep({ data: { cep: extractedCep } });
        // Tenta extrair número do texto original se não estava no CEP
        const numMatch = text.match(/\b(?:n[º°.]?|número|num)\s*(\d+)\b/i) || text.match(/,\s*(\d{1,5})\b/);
        const number = numMatch ? numMatch[1] : undefined;

        return {
          ...resolved,
          number,
          fullAddress: number ? `${resolved.street}, ${number} - ${resolved.neighborhood}, ${resolved.city} - ${resolved.state}` : resolved.fullAddress,
        };
      } catch {
        // Prossegue com parse manual/NLP
      }
    }

    // 2. Extração de Estado / UF
    const ufMatch = text.match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/i);
    const state = ufMatch ? ufMatch[1].toUpperCase() : "";

    // 3. Extração de Número
    const numMatch = text.match(/\b(?:n[º°.]?|número|num)\s*(\d+)\b/i) || text.match(/,\s*(\d{1,5})\b/);
    const number = numMatch ? numMatch[1] : undefined;

    // 4. Forward Geocoding da string completa no OpenStreetMap Nominatim
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
      // Fallback
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

export interface ApiPingResult {
  id: string;
  name: string;
  category: "maps" | "cep" | "cnpj" | "geocoding";
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

    // 1. Tentar ler da loja raiz da plataforma (Single Source of Truth para Governança Global)
    try {
      const { data: rootStore } = await supabase
        .from("stores")
        .select("settings")
        .or("slug.eq.waesy-matriz,is_platform_root.eq.true")
        .limit(1)
        .maybeSingle();

      const rootGov = (rootStore?.settings as any)?.public_apis_governance;
      if (rootGov && typeof rootGov === "object") {
        return {
          ...DEFAULT_PUBLIC_API_GOVERNANCE,
          ...rootGov,
          isMapServiceActive: rootGov.isMapServiceActive ?? true,
        };
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
      }),
    })
  )
  .handler(async ({ data: { settings } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();

    // 1. Persistir no root store da plataforma (Governança Global)
    const { data: rootStore } = await supabase
      .from("stores")
      .select("id, settings")
      .or("slug.eq.waesy-matriz,is_platform_root.eq.true")
      .limit(1)
      .maybeSingle();

    if (rootStore) {
      const existingSettings = (rootStore.settings as Record<string, any>) || {};
      const { error: rootUpdateErr } = await supabase
        .from("stores")
        .update({
          settings: {
            ...existingSettings,
            public_apis_governance: settings,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", rootStore.id);

      if (rootUpdateErr) {
        console.warn("[governance] Erro ao salvar na loja raiz:", rootUpdateErr.message);
      }
    }

    // 2. Persistir também em integration_credentials se houver store_id associado
    if (identity.store_id) {
      await supabase
        .from("integration_credentials")
        .upsert(
          {
            store_id: identity.store_id,
            provider: "public_apis_governance",
            is_active: settings.isMapServiceActive,
            token_payload: settings,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "store_id, provider" }
        );
    }

    return { status: "success" };
  });
