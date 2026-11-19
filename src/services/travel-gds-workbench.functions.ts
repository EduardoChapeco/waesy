import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { assertStoreAccess, getServerIdentity } from "@/lib/server-access";
import { decryptSecret, encryptSecret } from "@/lib/crypto-vault.server";
import { calculateNormalizedPricing } from "@/lib/travel-pricing";
import { logAuditAction } from "@/services/audit.functions";
import {
  createCanonicalQuoteSession,
  finalizeCanonicalQuoteSession,
  persistCanonicalOfferSnapshots,
  recordCanonicalProviderExecution,
} from "@/services/travel-quote-session.service";
import {
  searchWoobaCars,
  searchWoobaFlights,
  WoobaCredentialsSchema,
} from "@/services/travel-wooba-connector.service";
import {
  infotravelSearchActivities,
  infotravelSearchCarRentals,
  infotravelSearchFlights,
  infotravelSearchHotels,
  infotravelSearchTransfers,
  resolveStoreInfotravelCredentials,
  sanitizeInfotravelSearchText,
  type InfoTravelOperatorSlug,
  INFOTRAVEL_OPERATOR_SLUGS as INFOTRAVEL_OPERATOR_SET,
  normalizeInfoTravelOperatorSlug as normalizeInfoTravelSlug,
} from "@/services/infotravel";
import type { TravelOfferDTO } from "@/types/corporate-travel";

export const TRAVEL_GDS_PROVIDER_CATALOG = [
  {
    code: "wooba",
    name: "Wooba Travellink GDS",
    kind: "wooba" as const,
    defaultBaseUrl: "https://api.travellink.com.br/v2",
    description: "Consolidado aéreo nacional/internacional, locadoras de veículos e rodoviário.",
  },
  {
    code: "infotravel_default",
    name: "InfoTravel Hub Padrão",
    kind: "infotravel" as const,
    defaultBaseUrl: "https://api.infotravel.com.br",
    description: "Gateway unificado InfoTravel v1 para pacotes, hotéis, transfers e passeios.",
  },
  {
    code: "orinter",
    name: "Orinter Tour & Travel",
    kind: "infotravel" as const,
    defaultBaseUrl: "https://api.infotravel.com.br",
    description: "Operadora InfoTravel para pacotes dinâmicos, hotelaria e receptivo.",
  },
  {
    code: "frt",
    name: "FRT Operadora",
    kind: "infotravel" as const,
    defaultBaseUrl: "https://api.infotravel.com.br",
    description: "Consolidadora e operadora multimodal integrada via InfoTravel v1.",
  },
  {
    code: "incomum",
    name: "Incomum Viagens",
    kind: "infotravel" as const,
    defaultBaseUrl: "https://api.infotravel.com.br",
    description: "Roteiros nacionais e internacionais integrados via InfoTravel v1.",
  },
  {
    code: "cativa",
    name: "Cativa Operadora",
    kind: "infotravel" as const,
    defaultBaseUrl: "https://api.infotravel.com.br",
    description: "Operadora turística conectada ao padrão InfoTravel v1.",
  },
  {
    code: "befly",
    name: "BeFly / Queensberry / Flytour",
    kind: "infotravel" as const,
    defaultBaseUrl: "https://api.infotravel.com.br",
    description: "Ecossistema BeFly integrado ao fluxo InfoTravel / GDS.",
  },
  {
    code: "confianca",
    name: "Confiança Consolidadora",
    kind: "infotravel" as const,
    defaultBaseUrl: "https://api.infotravel.com.br",
    description: "Consolidação aérea e pacotes operados no padrão InfoTravel v1.",
  },
] as const;

export type TravelGdsProviderCode = (typeof TRAVEL_GDS_PROVIDER_CATALOG)[number]["code"];

function parseVaultObject(vaultBlob: unknown): Record<string, any> {
  if (typeof vaultBlob !== "string" || !vaultBlob.trim()) return {};
  try {
    const parsed = JSON.parse(decryptSecret(vaultBlob));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export interface TravelGdsIntegrationStatusItem {
  providerCode: string;
  displayName: string;
  engineType: "infotravel_v1" | "manual_portal";
  isActive: boolean;
  sourceTable: "travel_operator_integrations" | "integration_credentials" | "both";
  baseUrl: string;
  username?: string;
  agencyCode?: string;
  clientCode?: string;
  defaultMarkupPercent: number;
  defaultFixedFeeCents: number;
  environment?: "production" | "homologation";
  authMode?: string;
  hasSecretConfigured: boolean;
  updatedAt?: string;
}

export const listTravelGdsIntegrationsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    storeId: string;
    items: TravelGdsIntegrationStatusItem[];
    isAnyApiConfigured: boolean;
  }> => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    const supabase = getServerClient();

    const [{ data: opRows }, { data: legacyRows }] = await Promise.all([
      (supabase.from("travel_operator_integrations") as any)
        .select(
          "provider_code, display_name, operator_slug, operator_display_name, engine_type, base_url, client_code, agency_code, username, vault_secret_id, config_payload, default_markup_percent, is_active, status, updated_at",
        )
        .eq("store_id", identity.store_id),
      supabase
        .from("integration_credentials")
        .select("provider, is_active, public_metadata, updated_at")
        .eq("store_id", identity.store_id),
    ]);

    const itemsMap = new Map<string, TravelGdsIntegrationStatusItem>();

    for (const row of Array.isArray(opRows) ? opRows : []) {
      const code = String(row.provider_code || "").toLowerCase();
      if (!code) continue;
      const cfg = row.config_payload && typeof row.config_payload === "object" ? row.config_payload : {};
      const vaultObj = parseVaultObject(row.vault_secret_id);
      const canonicalCode = code === "infotravel" ? "infotravel_default" : code.replace(/^infotravel_(?!default$)/, "");
      const catalogMeta = TRAVEL_GDS_PROVIDER_CATALOG.find((c) => c.code === canonicalCode);
      if (!catalogMeta && row.engine_type !== "infotravel_v1" && code !== "wooba") {
        continue;
      }

      const hasSecret = Boolean(
        (typeof row.vault_secret_id === "string" && row.vault_secret_id.trim()) ||
          vaultObj.token ||
          vaultObj.password ||
          vaultObj.api_key,
      );

      itemsMap.set(canonicalCode, {
        providerCode: canonicalCode,
        displayName: String(row.operator_display_name || row.display_name || catalogMeta?.name || canonicalCode),
        engineType: row.engine_type === "manual_portal" ? "manual_portal" : "infotravel_v1",
        isActive: Boolean(row.is_active ?? row.status === "active"),
        sourceTable: "travel_operator_integrations",
        baseUrl: String(row.base_url || vaultObj.endpoint_url || catalogMeta?.defaultBaseUrl || ""),
        username: row.username || vaultObj.username || undefined,
        agencyCode: row.agency_code || vaultObj.agency_code || undefined,
        clientCode: row.client_code || undefined,
        defaultMarkupPercent: Number(row.default_markup_percent ?? vaultObj.default_markup_percent ?? 10),
        defaultFixedFeeCents: Number(cfg.default_fixed_fee_cents ?? vaultObj.default_fixed_fee_cents ?? 0),
        environment: cfg.environment === "homologation" || vaultObj.environment === "homologation" ? "homologation" : "production",
        authMode: typeof cfg.auth === "string" ? cfg.auth : "bearer",
        hasSecretConfigured: hasSecret,
        updatedAt: row.updated_at || undefined,
      });
    }

    for (const leg of Array.isArray(legacyRows) ? legacyRows : []) {
      const rawCode = String(leg.provider || "").toLowerCase();
      if (rawCode !== "wooba" && rawCode !== "infotravel" && !rawCode.startsWith("infotravel_")) continue;
      const canonicalCode = rawCode === "infotravel" ? "infotravel_default" : rawCode.replace(/^infotravel_(?!default$)/, "");
      const meta = (leg.public_metadata && typeof leg.public_metadata === "object" ? leg.public_metadata : {}) as Record<string, any>;
      const existing = itemsMap.get(canonicalCode);
      if (existing) {
        existing.sourceTable = "both";
        existing.isActive = existing.isActive || Boolean(leg.is_active);
        existing.hasSecretConfigured = existing.hasSecretConfigured || Boolean(leg.is_active);
      } else {
        const catalogMeta = TRAVEL_GDS_PROVIDER_CATALOG.find((c) => c.code === canonicalCode);
        itemsMap.set(canonicalCode, {
          providerCode: canonicalCode,
          displayName: catalogMeta?.name || canonicalCode,
          engineType: canonicalCode === "wooba" ? "manual_portal" : "infotravel_v1",
          isActive: Boolean(leg.is_active),
          sourceTable: "integration_credentials",
          baseUrl: String(meta.base_url || catalogMeta?.defaultBaseUrl || ""),
          username: typeof meta.username === "string" ? meta.username : undefined,
          defaultMarkupPercent: Number(meta.default_markup_percent ?? 10),
          defaultFixedFeeCents: 0,
          authMode: typeof meta.auth === "string" ? meta.auth : "bearer",
          hasSecretConfigured: Boolean(leg.is_active),
          updatedAt: leg.updated_at || undefined,
        });
      }
    }

    const items = Array.from(itemsMap.values());
    const isAnyApiConfigured = items.some((i) => i.isActive && i.hasSecretConfigured);

    return { storeId: identity.store_id, items, isAnyApiConfigured };
  },
);

const SaveTravelGdsIntegrationSchema = z.object({
  providerCode: z.enum([
    "wooba",
    "infotravel_default",
    "orinter",
    "frt",
    "incomum",
    "cativa",
    "befly",
    "confianca",
  ]),
  displayName: z.string().trim().max(120).optional(),
  baseUrl: z.string().trim().url("Informe uma URL base válida (https://...)"),
  username: z.string().trim().max(120).optional().default(""),
  secretToken: z.string().trim().optional().default(""),
  agencyCode: z.string().trim().max(80).optional().default(""),
  clientCode: z.string().trim().max(80).optional().default(""),
  authMode: z.enum(["bearer", "basic", "api_key"]).optional().default("bearer"),
  apiKeyHeader: z.string().trim().max(60).optional().default("x-api-key"),
  environment: z.enum(["production", "homologation"]).optional().default("production"),
  defaultMarkupPercent: z.number().min(0).max(100).optional().default(10),
  defaultFixedFeeCents: z.number().int().min(0).optional().default(0),
  isActive: z.boolean().default(true),
});

export const saveTravelGdsIntegrationFn = createServerFn({ method: "POST" })
  .validator(SaveTravelGdsIntegrationSchema)
  .handler(async ({ data }): Promise<{ success: boolean; providerCode: string }> => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    const supabase = getServerClient();

    const catalogMeta = TRAVEL_GDS_PROVIDER_CATALOG.find((c) => c.code === data.providerCode);
    const cleanBaseUrl = data.baseUrl.replace(/\/+$/, "");

    const { data: existingRow } = await (supabase.from("travel_operator_integrations") as any)
      .select("vault_secret_id")
      .eq("store_id", identity.store_id)
      .in(
        "provider_code",
        data.providerCode === "infotravel_default" ? ["infotravel_default", "infotravel"] : [data.providerCode],
      )
      .maybeSingle();

    const existingVault = parseVaultObject(existingRow?.vault_secret_id);
    const finalSecret = data.secretToken.trim() || String(existingVault.password || existingVault.token || existingVault.api_key || "");
    if (!finalSecret) {
      throw new Error("Informe o token ou senha de API para salvar a credencial no cofre criptografado.");
    }

    let encryptedVault = "";
    let configPayload: Record<string, unknown> = {};

    if (data.providerCode === "wooba") {
      const woobaPayload = WoobaCredentialsSchema.parse({
        agency_code: data.agencyCode.trim(),
        username: data.username.trim(),
        password: finalSecret,
        endpoint_url: cleanBaseUrl,
        environment: data.environment,
        default_markup_percent: data.defaultMarkupPercent,
        default_fixed_fee_cents: data.defaultFixedFeeCents,
      });
      encryptedVault = encryptSecret(JSON.stringify(woobaPayload));
      configPayload = {
        environment: woobaPayload.environment,
        default_fixed_fee_cents: woobaPayload.default_fixed_fee_cents,
      };
    } else {
      const infoPayload = {
        base_url: cleanBaseUrl,
        token: finalSecret,
        api_key: finalSecret,
        password: finalSecret,
        username: data.username.trim() || undefined,
        auth: data.authMode,
        api_key_header: data.apiKeyHeader || "x-api-key",
        agency_code: data.agencyCode.trim() || undefined,
        client_code: data.clientCode.trim() || undefined,
        default_markup_percent: data.defaultMarkupPercent,
      };
      encryptedVault = encryptSecret(JSON.stringify(infoPayload));
      configPayload = {
        auth: data.authMode,
        api_key_header: data.apiKeyHeader || "x-api-key",
      };
    }

    const dbProviderCode = data.providerCode === "infotravel_default" ? "infotravel" : data.providerCode;
    const nowIso = new Date().toISOString();

    const { error } = await (supabase.from("travel_operator_integrations") as any).upsert(
      {
        store_id: identity.store_id,
        provider_code: dbProviderCode,
        display_name: data.displayName || catalogMeta?.name || data.providerCode,
        adapter_kind: "gds_api",
        adapter_version: data.providerCode === "wooba" ? "wooba-v2" : "infotravel-v1",
        capabilities: { quote: true, reservation: true, receipt: true, voucher: true },
        config_payload: configPayload,
        status: data.isActive ? "active" : "paused",
        operator_slug: data.providerCode,
        operator_display_name: data.displayName || catalogMeta?.name || data.providerCode,
        engine_type: data.providerCode === "wooba" ? "manual_portal" : "infotravel_v1",
        base_url: cleanBaseUrl,
        client_code: data.clientCode.trim() || null,
        agency_code: data.agencyCode.trim() || null,
        username: data.username.trim() || null,
        vault_secret_id: encryptedVault,
        default_markup_percent: data.defaultMarkupPercent,
        is_active: data.isActive,
        updated_at: nowIso,
      },
      { onConflict: "store_id,provider_code" },
    );

    if (error) {
      throw new Error(`Falha ao gravar credencial GDS no cofre: ${error.message}`);
    }

    await logAuditAction(identity, "TRAVEL_GDS_INTEGRATION_SAVED", "travel_operator_integrations", data.providerCode, {
      providerCode: data.providerCode,
      baseUrl: cleanBaseUrl,
      isActive: data.isActive,
    }).catch(() => {});

    return { success: true, providerCode: data.providerCode };
  });

export const deleteTravelGdsIntegrationFn = createServerFn({ method: "POST" })
  .validator(z.object({ providerCode: z.string().min(2) }))
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    const supabase = getServerClient();

    const opCodes =
      data.providerCode === "infotravel_default"
        ? ["infotravel_default", "infotravel"]
        : [data.providerCode, `infotravel_${data.providerCode}`];

    await Promise.all([
      (supabase.from("travel_operator_integrations") as any)
        .delete()
        .eq("store_id", identity.store_id)
        .in("provider_code", opCodes),
      supabase
        .from("integration_credentials")
        .delete()
        .eq("store_id", identity.store_id)
        .in("provider", opCodes),
    ]);

    return { success: true };
  });

export const testTravelGdsIntegrationFn = createServerFn({ method: "POST" })
  .validator(z.object({ providerCode: z.string().min(2) }))
  .handler(
    async ({
      data,
    }): Promise<{
      ok: boolean;
      configured: boolean;
      latencyMs: number;
      httpStatus?: number;
      message: string;
    }> => {
      const identity = await getServerIdentity();
      assertStoreAccess(identity);
      const startedAt = Date.now();

      if (data.providerCode === "wooba") {
        const supabase = getServerClient();
        const { data: row } = await (supabase.from("travel_operator_integrations") as any)
          .select("vault_secret_id, base_url, is_active")
          .eq("store_id", identity.store_id)
          .eq("provider_code", "wooba")
          .maybeSingle();

        if (!row?.vault_secret_id) {
          return {
            ok: false,
            configured: false,
            latencyMs: 0,
            message: "Wooba Travellink não configurado para esta agência.",
          };
        }

        const creds = parseVaultObject(row.vault_secret_id);
        const endpointUrl = String(creds.endpoint_url || row.base_url || "").replace(/\/+$/, "");
        if (!endpointUrl) {
          return { ok: false, configured: false, latencyMs: 0, message: "Endpoint Wooba ausente no cofre." };
        }

        try {
          const probeDate = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
          const res = await fetch(`${endpointUrl}/air/search`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
              Authentication: {
                AgencyCode: creds.agency_code,
                UserName: creds.username,
                Password: creds.password,
              },
              SearchParams: {
                Origin: "GRU",
                Destination: "CGH",
                DepartureDate: probeDate,
                Passengers: { Adults: 1, Children: 0, Infants: 0 },
                CabinClass: "Economy",
                Currency: "BRL",
              },
            }),
            signal: AbortSignal.timeout(10000),
          });
          const latencyMs = Date.now() - startedAt;
          if (res.status === 401 || res.status === 403) {
            return {
              ok: false,
              configured: true,
              latencyMs,
              httpStatus: res.status,
              message: `Credenciais Wooba recusadas (HTTP ${res.status}). Verifique código de agência, usuário e senha.`,
            };
          }
          return {
            ok: res.ok,
            configured: true,
            latencyMs,
            httpStatus: res.status,
            message: res.ok
              ? `Conexão ativa com Wooba Travellink (${latencyMs}ms · HTTP ${res.status}).`
              : `Servidor Wooba respondeu HTTP ${res.status} (${latencyMs}ms).`,
          };
        } catch (err: any) {
          return {
            ok: false,
            configured: true,
            latencyMs: Date.now() - startedAt,
            message: `Falha de rede ao alcançar endpoint Wooba: ${err?.message || "Timeout"}`,
          };
        }
      }

      const opSlug = normalizeInfoTravelSlug(data.providerCode);
      const creds = await resolveStoreInfotravelCredentials(identity.store_id, opSlug);
      if (!creds) {
        return {
          ok: false,
          configured: false,
          latencyMs: 0,
          message: `Credenciais InfoTravel (${opSlug.toUpperCase()}) não configuradas para esta agência.`,
        };
      }

      try {
        const res = await fetch(`${creds.baseUrl}/api/v1/utility/packageAvail`, {
          method: "POST",
          headers: creds.authHeader,
          body: JSON.stringify({
            destination: "GRU",
            departure: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
            arrival: new Date(Date.now() + 33 * 86400000).toISOString().slice(0, 10),
            occupancies: [{ adults: 2, childrenAges: [] }],
            operator: opSlug,
          }),
          signal: AbortSignal.timeout(10000),
        });
        const latencyMs = Date.now() - startedAt;
        if (res.status === 401 || res.status === 403) {
          return {
            ok: false,
            configured: true,
            latencyMs,
            httpStatus: res.status,
            message: `Token/autenticação InfoTravel (${opSlug.toUpperCase()}) recusado (HTTP ${res.status}).`,
          };
        }
        return {
          ok: res.ok,
          configured: true,
          latencyMs,
          httpStatus: res.status,
          message: res.ok
            ? `Conexão verificada com InfoTravel ${opSlug.toUpperCase()} (${latencyMs}ms).`
            : `API InfoTravel ${opSlug.toUpperCase()} respondeu HTTP ${res.status} (${latencyMs}ms).`,
        };
      } catch (err: any) {
        return {
          ok: false,
          configured: true,
          latencyMs: Date.now() - startedAt,
          message: `Erro de rede InfoTravel (${opSlug.toUpperCase()}): ${err?.message || "Timeout"}`,
        };
      }
    },
  );

export type PassHubSearchCategory = "packages" | "flights" | "hotels" | "transfers" | "activities" | "cars";

export interface PassHubProviderStatusDTO {
  providerCode: string;
  displayName: string;
  category: PassHubSearchCategory | "multi";
  status: "ok" | "empty" | "error" | "unconfigured";
  count: number;
  latencyMs: number;
  message?: string;
}

export interface PassHubFlightResultItem {
  id: string;
  providerCode: string;
  airline: string;
  airlineCode?: string;
  flightNumber: string;
  originIata: string;
  destinationIata: string;
  departureDate: string;
  departureTime: string;
  arrivalTime: string;
  stopsCount: number;
  cabinClass?: string;
  baggageSummary?: string;
  isRefundable?: boolean;
  netCents: number;
  taxCents: number;
  sellingCents: number;
  currency: string;
  expiresAt?: string;
}

export interface PassHubHotelResultItem {
  id: string;
  providerCode: string;
  source: "api_live" | "db_catalog";
  hotelName: string;
  city: string;
  stars?: number;
  roomType?: string;
  boardBasis?: string;
  checkinDate: string;
  checkoutDate: string;
  nightsCount: number;
  pricePerNightCents: number;
  totalPriceCents: number;
  amenities: string[];
  imageUrl?: string | null;
}

export interface PassHubTransferResultItem {
  id: string;
  providerCode: string;
  title: string;
  route: string;
  vehicleType?: string;
  isPrivate: boolean;
  date?: string;
  priceCents: number;
}

export interface PassHubActivityResultItem {
  id: string;
  providerCode: string;
  source: "api_live" | "db_catalog";
  title: string;
  description?: string;
  duration?: string;
  destination: string;
  priceCents: number;
  included: boolean;
  imageUrl?: string | null;
}

export interface PassHubPackageResultItem {
  id: string;
  providerCode: string;
  operatorSlug: string;
  source: "api_live" | "db_catalog";
  packageName: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  nights: number;
  hotelName?: string;
  boardType?: string;
  includesFlight: boolean;
  includesHotel: boolean;
  includesTransfer: boolean;
  priceTotalCents: number;
  taxesCents: number;
  commissionPercent: number;
  description?: string | null;
  imageUrl?: string | null;
  includedItems: string[];
}

export interface PassHubCarResultItem {
  id: string;
  providerCode: string;
  rentalCompany: string;
  vehicleCategory: string;
  vehicleModelExample: string;
  transmission: string;
  pickupLocation: string;
  dailyRateCents: number;
  totalPriceCents: number;
}

export interface PassHubLiveQuoteResponseDTO {
  quoteSessionId: string;
  isAnyApiConfigured: boolean;
  activeOperators: string[];
  providerStatuses: PassHubProviderStatusDTO[];
  packages: PassHubPackageResultItem[];
  flights: PassHubFlightResultItem[];
  hotels: PassHubHotelResultItem[];
  transfers: PassHubTransferResultItem[];
  activities: PassHubActivityResultItem[];
  cars: PassHubCarResultItem[];
}

const PassHubRoomSchema = z.object({
  adults: z.number().int().min(1).max(9),
  childrenAges: z.array(z.number().int().min(0).max(17)).max(8).default([]),
});

const SearchPassHubLiveQuoteSchema = z.object({
  originIata: z.string().trim().max(12).optional().default(""),
  destinationIata: z.string().trim().max(12).optional().default(""),
  destinationCity: z.string().trim().min(2, "Informe o destino da cotação").max(80),
  departureDate: z.string().min(8, "Informe a data de ida / check-in"),
  returnDate: z.string().optional().default(""),
  rooms: z.array(PassHubRoomSchema).min(1).max(8).default([{ adults: 2, childrenAges: [] }]),
  categories: z
    .array(z.enum(["packages", "flights", "hotels", "transfers", "activities", "cars"]))
    .min(1)
    .default(["flights", "hotels", "packages"]),
  operatorSlugs: z.array(z.string()).optional(),
  cabinClass: z.enum(["economy", "premium_economy", "business", "first"]).optional().default("economy"),
  includeOwnDbCatalog: z.boolean().default(true),
});

function computeNightsBetween(startIso: string, endIso?: string): number {
  if (!startIso || !endIso) return 1;
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
}

export const searchPassHubLiveQuoteFn = createServerFn({ method: "POST" })
  .validator(SearchPassHubLiveQuoteSchema)
  .handler(async ({ data }): Promise<PassHubLiveQuoteResponseDTO> => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    const supabase = getServerClient();

    const safeOriginIata = sanitizeInfotravelSearchText(data.originIata, 8).toUpperCase();
    const safeDestIata = sanitizeInfotravelSearchText(data.destinationIata, 8).toUpperCase();
    const safeDestCity = sanitizeInfotravelSearchText(data.destinationCity, 80);
    const totalAdults = data.rooms.reduce((acc, r) => acc + r.adults, 0);
    const totalChildren = data.rooms.reduce((acc, r) => acc + r.childrenAges.length, 0);
    const nightsCount = computeNightsBetween(data.departureDate, data.returnDate || undefined);

    const singleCat = data.categories.length === 1 ? data.categories[0] : "package";
    const sessionProductType: "flight" | "hotel" | "car" | "bus" | "transfer" | "package" =
      singleCat === "flights"
        ? "flight"
        : singleCat === "hotels"
          ? "hotel"
          : singleCat === "cars"
            ? "car"
            : singleCat === "transfers"
              ? "transfer"
              : "package";

    const quoteSessionId = await createCanonicalQuoteSession({
      agencyId: identity.store_id,
      userId: identity.id,
      productType: sessionProductType,
      payload: {
        originIata: safeOriginIata,
        destinationIata: safeDestIata,
        destinationCity: safeDestCity,
        departureDate: data.departureDate,
        returnDate: data.returnDate || null,
        rooms: data.rooms,
        categories: data.categories,
      },
    });

    const [{ data: opRows }, { data: legacyRows }] = await Promise.all([
      (supabase.from("travel_operator_integrations") as any)
        .select("provider_code, operator_slug, engine_type, default_markup_percent, vault_secret_id, is_active")
        .eq("store_id", identity.store_id)
        .eq("is_active", true),
      supabase
        .from("integration_credentials")
        .select("provider, is_active")
        .eq("store_id", identity.store_id)
        .eq("is_active", true),
    ]);

    const activeOpSlugs = new Set<InfoTravelOperatorSlug>();
    let woobaActive = false;

    for (const row of Array.isArray(opRows) ? opRows : []) {
      const code = String(row.provider_code || "").toLowerCase();
      if (code === "wooba" && row.vault_secret_id) {
        woobaActive = true;
      } else if (INFOTRAVEL_OPERATOR_SET.has(code) || code.startsWith("infotravel_") || row.engine_type === "infotravel_v1") {
        activeOpSlugs.add(normalizeInfoTravelSlug(String(row.operator_slug || code)));
      }
    }

    for (const leg of Array.isArray(legacyRows) ? legacyRows : []) {
      const p = String(leg.provider || "").toLowerCase();
      if (p === "wooba") {
        woobaActive = true;
      } else if (p === "infotravel") {
        (["infotravel_default", "orinter", "frt", "incomum", "cativa", "befly", "confianca"] as InfoTravelOperatorSlug[]).forEach(
          (slug) => activeOpSlugs.add(slug),
        );
      } else if (p.startsWith("infotravel_")) {
        activeOpSlugs.add(normalizeInfoTravelSlug(p));
      }
    }

    const filterSlugs = Array.isArray(data.operatorSlugs) && data.operatorSlugs.length > 0
      ? new Set(data.operatorSlugs.map((s) => s.toLowerCase()))
      : null;

    const selectedInfoSlugs = Array.from(activeOpSlugs).filter(
      (slug) => !filterSlugs || filterSlugs.has(slug) || filterSlugs.has("infotravel"),
    );
    const shouldQueryWooba = woobaActive && (!filterSlugs || filterSlugs.has("wooba"));
    const isAnyApiConfigured = woobaActive || activeOpSlugs.size > 0;

    const providerStatuses: PassHubProviderStatusDTO[] = [];
    const packages: PassHubPackageResultItem[] = [];
    const flights: PassHubFlightResultItem[] = [];
    const hotels: PassHubHotelResultItem[] = [];
    const transfers: PassHubTransferResultItem[] = [];
    const activities: PassHubActivityResultItem[] = [];
    const cars: PassHubCarResultItem[] = [];
    const snapshotsToPersist: TravelOfferDTO[] = [];

    const tasks: Array<Promise<void>> = [];

    // 1. Wooba Travellink (Aéreo + Locação de Carros)
    if (shouldQueryWooba && data.categories.includes("flights")) {
      if (safeOriginIata.length === 3 && safeDestIata.length === 3) {
        tasks.push(
          (async () => {
            const startedAt = Date.now();
            try {
              const woobaOffers = await searchWoobaFlights({
                agencyId: identity.store_id,
                originIata: safeOriginIata,
                destinationIata: safeDestIata,
                departureDate: data.departureDate,
                returnDate: data.returnDate || undefined,
                adultsCount: totalAdults,
                childrenCount: totalChildren,
                cabinClass: data.cabinClass,
              });
              const latencyMs = Date.now() - startedAt;
              for (const offer of woobaOffers) {
                const det = offer.details || {};
                const flightNumber = String(det.flight_number || det.flightNumber || "").trim();
                const airline = String(det.airline_name || det.airline || "").trim();
                if (!airline || offer.pricing.selling_total_cents <= 0) continue;
                snapshotsToPersist.push(offer);
                flights.push({
                  id: offer.offer_id,
                  providerCode: "wooba",
                  airline,
                  airlineCode: det.airline_code ? String(det.airline_code) : undefined,
                  flightNumber: flightNumber || offer.offer_id.slice(-6),
                  originIata: String(det.origin_iata || safeOriginIata),
                  destinationIata: String(det.destination_iata || safeDestIata),
                  departureDate: String(det.departure_date || data.departureDate),
                  departureTime: String(det.departure_time || ""),
                  arrivalTime: String(det.arrival_time || ""),
                  stopsCount: Number(det.stops_count ?? 0),
                  cabinClass: data.cabinClass,
                  baggageSummary: det.baggage_summary ? String(det.baggage_summary) : undefined,
                  isRefundable: offer.rules?.is_refundable,
                  netCents: offer.pricing.net_amount_cents,
                  taxCents: offer.pricing.tax_amount_cents,
                  sellingCents: offer.pricing.selling_total_cents,
                  currency: offer.pricing.currency || "BRL",
                  expiresAt: offer.expires_at,
                });
              }
              await recordCanonicalProviderExecution({
                quoteSessionId,
                providerCode: "wooba_flights",
                latencyMs,
                status: woobaOffers.length > 0 ? "success" : "no_availability",
              });
              providerStatuses.push({
                providerCode: "wooba",
                displayName: "Wooba Travellink GDS (Voos)",
                category: "flights",
                status: woobaOffers.length > 0 ? "ok" : "empty",
                count: woobaOffers.length,
                latencyMs,
              });
            } catch (err: any) {
              const latencyMs = Date.now() - startedAt;
              const msg = err?.message || "Erro na consulta Wooba Voos";
              await recordCanonicalProviderExecution({
                quoteSessionId,
                providerCode: "wooba_flights",
                latencyMs,
                status: "error",
                errorCode: msg.slice(0, 80),
              });
              providerStatuses.push({
                providerCode: "wooba",
                displayName: "Wooba Travellink GDS (Voos)",
                category: "flights",
                status: "error",
                count: 0,
                latencyMs,
                message: msg,
              });
            }
          })(),
        );
      } else {
        providerStatuses.push({
          providerCode: "wooba",
          displayName: "Wooba Travellink GDS (Voos)",
          category: "flights",
          status: "error",
          count: 0,
          latencyMs: 0,
          message: "Informe códigos IATA de origem e destino (ex: GRU -> MCO) para buscar voos.",
        });
      }
    }

    if (shouldQueryWooba && data.categories.includes("cars") && data.returnDate) {
      const pickupLoc = safeDestIata || safeDestCity;
      tasks.push(
        (async () => {
          const startedAt = Date.now();
          try {
            const carOffers = await searchWoobaCars({
              agencyId: identity.store_id,
              pickupLocationCode: pickupLoc,
              dropoffLocationCode: pickupLoc,
              pickupDate: data.departureDate,
              dropoffDate: data.returnDate,
            });
            const latencyMs = Date.now() - startedAt;
            for (const offer of carOffers) {
              const det = offer.details || {};
              if (offer.pricing.selling_total_cents <= 0) continue;
              snapshotsToPersist.push(offer);
              cars.push({
                id: offer.offer_id,
                providerCode: "wooba",
                rentalCompany: String(det.rental_company || ""),
                vehicleCategory: String(det.vehicle_category || ""),
                vehicleModelExample: String(det.vehicle_model_example || ""),
                transmission: String(det.transmission || "Automático"),
                pickupLocation: String(det.pickup_location || pickupLoc),
                dailyRateCents: Number(det.daily_rate_cents || Math.round(offer.pricing.selling_total_cents / Math.max(1, nightsCount))),
                totalPriceCents: offer.pricing.selling_total_cents,
              });
            }
            await recordCanonicalProviderExecution({
              quoteSessionId,
              providerCode: "wooba_cars",
              latencyMs,
              status: carOffers.length > 0 ? "success" : "no_availability",
            });
            providerStatuses.push({
              providerCode: "wooba",
              displayName: "Wooba Travellink GDS (Carros)",
              category: "cars",
              status: carOffers.length > 0 ? "ok" : "empty",
              count: carOffers.length,
              latencyMs,
            });
          } catch (err: any) {
            const latencyMs = Date.now() - startedAt;
            providerStatuses.push({
              providerCode: "wooba",
              displayName: "Wooba Travellink GDS (Carros)",
              category: "cars",
              status: "error",
              count: 0,
              latencyMs,
              message: err?.message || "Erro na busca de carros Wooba",
            });
          }
        })(),
      );
    }

    // 2. InfoTravel / Multi-Operadora Live Queries
    const destinationSearchTerm = safeDestIata || safeDestCity;
    if (selectedInfoSlugs.length > 0) {
      // 2.a Pacotes por cada operadora ativa
      if (data.categories.includes("packages") && data.returnDate) {
        for (const opSlug of selectedInfoSlugs) {
          tasks.push(
            (async () => {
              const startedAt = Date.now();
              const label = TRAVEL_GDS_PROVIDER_CATALOG.find((c) => c.code === opSlug)?.name || opSlug.toUpperCase();
              try {
                const creds = await resolveStoreInfotravelCredentials(identity.store_id, opSlug);
                if (!creds) {
                  providerStatuses.push({
                    providerCode: opSlug,
                    displayName: `${label} (Pacotes)`,
                    category: "packages",
                    status: "unconfigured",
                    count: 0,
                    latencyMs: 0,
                    message: "Credencial não configurada no cofre.",
                  });
                  return;
                }
                const res = await fetch(`${creds.baseUrl}/api/v1/utility/packageAvail`, {
                  method: "POST",
                  headers: creds.authHeader,
                  body: JSON.stringify({
                    destination: safeDestCity,
                    destinationIata: safeDestIata || undefined,
                    originIata: safeOriginIata || undefined,
                    departure: data.departureDate,
                    arrival: data.returnDate,
                    occupancies: data.rooms,
                    operator: opSlug,
                  }),
                  signal: AbortSignal.timeout(15000),
                });
                const latencyMs = Date.now() - startedAt;
                if (!res.ok) {
                  const errTxt = await res.text().catch(() => "");
                  await recordCanonicalProviderExecution({
                    quoteSessionId,
                    providerCode: `infotravel_${opSlug}_packages`,
                    latencyMs,
                    status: "error",
                    errorCode: `HTTP_${res.status}`,
                  });
                  providerStatuses.push({
                    providerCode: opSlug,
                    displayName: `${label} (Pacotes)`,
                    category: "packages",
                    status: "error",
                    count: 0,
                    latencyMs,
                    message: `HTTP ${res.status}: ${errTxt.slice(0, 120) || res.statusText}`,
                  });
                  return;
                }
                const json = await res.json().catch(() => ({}));
                const list = Array.isArray(json?.packageAvail) ? json.packageAvail : [];
                let validCount = 0;
                for (const pkg of list) {
                  const pkgId = String(pkg?.id || "").trim();
                  const pkgName = String(pkg?.name || pkg?.hotel?.name || "").trim();
                  const priceBrl = Number(pkg?.price?.amount);
                  if (!pkgId || !pkgName || !Number.isFinite(priceBrl) || priceBrl <= 0) continue;
                  validCount++;
                  const taxesBrl = Math.max(0, Number(pkg?.taxes?.amount) || 0);
                  const pricing = calculateNormalizedPricing({
                    netAmountCents: Math.max(0, Math.round((priceBrl - taxesBrl) * 100)),
                    taxAmountCents: Math.round(taxesBrl * 100),
                    agencyMarkupPercent: Number(creds.rawPayload.default_markup_percent ?? 0),
                  });
                  snapshotsToPersist.push({
                    offer_id: `${opSlug}_pkg_${pkgId}`,
                    provider_code: "infotravel",
                    product_type: "package",
                    pricing,
                    expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
                    revalidate_required: true,
                    policy_status: "within_policy",
                    policy_violation_reasons: [],
                    rules: {},
                    details: { package_name: pkgName, destination: safeDestCity, operator_slug: opSlug },
                  });
                  const includedItems: string[] = [];
                  if (pkg?.includesFlight === true) includedItems.push("Aéreo Ida e Volta");
                  if (pkg?.includesHotel === true || pkg?.hotel?.name) includedItems.push("Hospedagem");
                  if (pkg?.board?.name) includedItems.push(String(pkg.board.name));
                  if (pkg?.includesTransfer === true) includedItems.push("Transfer");
                  packages.push({
                    id: `${opSlug}_pkg_${pkgId}`,
                    providerCode: opSlug,
                    operatorSlug: opSlug,
                    source: "api_live",
                    packageName: pkgName,
                    destination: safeDestCity,
                    departureDate: data.departureDate,
                    returnDate: data.returnDate,
                    nights: nightsCount,
                    hotelName: typeof pkg?.hotel?.name === "string" ? pkg.hotel.name : undefined,
                    boardType: typeof pkg?.board?.name === "string" ? pkg.board.name : undefined,
                    includesFlight: pkg?.includesFlight === true,
                    includesHotel: pkg?.includesHotel === true || Boolean(pkg?.hotel?.name),
                    includesTransfer: pkg?.includesTransfer === true,
                    priceTotalCents: pricing.selling_total_cents,
                    taxesCents: Math.round(taxesBrl * 100),
                    commissionPercent: Math.max(0, Number(pkg?.commissionPercent) || 0),
                    description: typeof pkg?.description === "string" ? pkg.description : null,
                    imageUrl: typeof pkg?.hotel?.imageUrl === "string" ? pkg.hotel.imageUrl : typeof pkg?.imageUrl === "string" ? pkg.imageUrl : null,
                    includedItems,
                  });
                }
                await recordCanonicalProviderExecution({
                  quoteSessionId,
                  providerCode: `infotravel_${opSlug}_packages`,
                  latencyMs,
                  status: validCount > 0 ? "success" : "no_availability",
                });
                providerStatuses.push({
                  providerCode: opSlug,
                  displayName: `${label} (Pacotes)`,
                  category: "packages",
                  status: validCount > 0 ? "ok" : "empty",
                  count: validCount,
                  latencyMs,
                });
              } catch (err: any) {
                const latencyMs = Date.now() - startedAt;
                providerStatuses.push({
                  providerCode: opSlug,
                  displayName: `${label} (Pacotes)`,
                  category: "packages",
                  status: "error",
                  count: 0,
                  latencyMs,
                  message: err?.message || "Erro na API InfoTravel",
                });
              }
            })(),
          );
        }
      }

      // 2.b Hotéis InfoTravel
      if (data.categories.includes("hotels") && data.returnDate) {
        tasks.push(
          (async () => {
            const startedAt = Date.now();
            try {
              const apiHotels = await infotravelSearchHotels(identity.store_id, {
                city: destinationSearchTerm,
                checkin: data.departureDate,
                checkout: data.returnDate,
                rooms: data.rooms.length,
              });
              const latencyMs = Date.now() - startedAt;
              let count = 0;
              for (const h of apiHotels) {
                const hAny = h as any;
                const hotelName = String(hAny.name || hAny.hotel_name || "").trim();
                const nightly = Number(hAny.price_per_night ?? hAny.price);
                if (!hotelName || !Number.isFinite(nightly) || nightly <= 0) continue;
                count++;
                const pricePerNightCents = Math.round(nightly * 100);
                const totalPriceCents = pricePerNightCents * nightsCount;
                snapshotsToPersist.push({
                  offer_id: `infotravel_htl_${hAny.id || hotelName}`,
                  provider_code: "infotravel",
                  product_type: "hotel",
                  pricing: calculateNormalizedPricing({ netAmountCents: totalPriceCents, agencyMarkupPercent: 0 }),
                  expires_at: new Date(Date.now() + 25 * 60 * 1000).toISOString(),
                  revalidate_required: false,
                  policy_status: "within_policy",
                  policy_violation_reasons: [],
                  rules: {},
                  details: { hotel_name: hotelName, city: safeDestCity },
                });
                hotels.push({
                  id: String(hAny.id || `htl-${count}`),
                  providerCode: selectedInfoSlugs[0] || "infotravel",
                  source: "api_live",
                  hotelName,
                  city: String(hAny.city || safeDestCity),
                  stars: Number(hAny.stars) > 0 ? Number(hAny.stars) : undefined,
                  roomType: typeof hAny.room_type === "string" ? hAny.room_type : undefined,
                  boardBasis: typeof hAny.board_basis === "string" ? hAny.board_basis : undefined,
                  checkinDate: data.departureDate,
                  checkoutDate: data.returnDate,
                  nightsCount,
                  pricePerNightCents,
                  totalPriceCents,
                  amenities: Array.isArray(hAny.amenities) ? hAny.amenities.map(String) : [],
                  imageUrl: typeof hAny.image_url === "string" ? hAny.image_url : null,
                });
              }
              await recordCanonicalProviderExecution({
                quoteSessionId,
                providerCode: "infotravel_hotels",
                latencyMs,
                status: count > 0 ? "success" : "no_availability",
              });
              providerStatuses.push({
                providerCode: selectedInfoSlugs[0] || "infotravel",
                displayName: "InfoTravel GDS (Hotéis)",
                category: "hotels",
                status: count > 0 ? "ok" : "empty",
                count,
                latencyMs,
              });
            } catch (err: any) {
              const latencyMs = Date.now() - startedAt;
              providerStatuses.push({
                providerCode: selectedInfoSlugs[0] || "infotravel",
                displayName: "InfoTravel GDS (Hotéis)",
                category: "hotels",
                status: "error",
                count: 0,
                latencyMs,
                message: err?.message || "Erro ao consultar hotéis no InfoTravel",
              });
            }
          })(),
        );
      }

      // 2.c Voos InfoTravel (complementar ao Wooba)
      if (data.categories.includes("flights") && safeOriginIata.length === 3 && safeDestIata.length === 3) {
        tasks.push(
          (async () => {
            const startedAt = Date.now();
            try {
              const apiFlights = await infotravelSearchFlights(identity.store_id, {
                origin: safeOriginIata,
                destination: safeDestIata,
                date: data.departureDate,
              });
              const latencyMs = Date.now() - startedAt;
              let count = 0;
              for (const f of apiFlights) {
                const fAny = f as any;
                const priceNum = Number(fAny.price);
                if (!fAny.flight_number || !Number.isFinite(priceNum) || priceNum <= 0) continue;
                count++;
                const totalCents = Math.round(priceNum * 100);
                snapshotsToPersist.push({
                  offer_id: `infotravel_flt_${fAny.flight_number}`,
                  provider_code: "infotravel",
                  product_type: "flight",
                  pricing: calculateNormalizedPricing({ netAmountCents: totalCents, agencyMarkupPercent: 0 }),
                  expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
                  revalidate_required: true,
                  policy_status: "within_policy",
                  policy_violation_reasons: [],
                  rules: {},
                  details: { flight_number: fAny.flight_number, origin: fAny.origin, destination: fAny.destination },
                });
                flights.push({
                  id: `infotravel_flt_${fAny.flight_number}_${count}`,
                  providerCode: selectedInfoSlugs[0] || "infotravel",
                  airline: String(fAny.airline || ""),
                  flightNumber: String(fAny.flight_number),
                  originIata: String(fAny.origin || safeOriginIata),
                  destinationIata: String(fAny.destination || safeDestIata),
                  departureDate: data.departureDate,
                  departureTime: String(fAny.departure_time || ""),
                  arrivalTime: String(fAny.arrival_time || ""),
                  stopsCount: Number(fAny.stops ?? 0),
                  cabinClass: data.cabinClass,
                  netCents: totalCents,
                  taxCents: 0,
                  sellingCents: totalCents,
                  currency: "BRL",
                });
              }
              providerStatuses.push({
                providerCode: selectedInfoSlugs[0] || "infotravel",
                displayName: "InfoTravel GDS (Voos)",
                category: "flights",
                status: count > 0 ? "ok" : "empty",
                count,
                latencyMs,
              });
            } catch (err: any) {
              providerStatuses.push({
                providerCode: selectedInfoSlugs[0] || "infotravel",
                displayName: "InfoTravel GDS (Voos)",
                category: "flights",
                status: "error",
                count: 0,
                latencyMs: Date.now() - startedAt,
                message: err?.message || "Erro ao consultar voos no InfoTravel",
              });
            }
          })(),
        );
      }

      // 2.d Transfers InfoTravel
      if (data.categories.includes("transfers")) {
        tasks.push(
          (async () => {
            const startedAt = Date.now();
            try {
              const rawTransfers = await infotravelSearchTransfers(identity.store_id, {
                destination: destinationSearchTerm,
                city: safeDestCity,
                date: data.departureDate,
                checkin: data.departureDate,
                checkout: data.returnDate || undefined,
              });
              const latencyMs = Date.now() - startedAt;
              let count = 0;
              for (const tr of rawTransfers) {
                const title = String(tr?.name || tr?.title || tr?.route || "").trim();
                const amount = Number(tr?.price?.amount ?? tr?.price ?? tr?.total_price);
                if (!title || !Number.isFinite(amount) || amount <= 0) continue;
                count++;
                transfers.push({
                  id: String(tr?.id || `tr-${count}`),
                  providerCode: selectedInfoSlugs[0] || "infotravel",
                  title,
                  route: String(tr?.route || safeDestCity),
                  vehicleType: typeof tr?.vehicle === "string" ? tr.vehicle : undefined,
                  isPrivate: Boolean(tr?.is_private ?? tr?.private),
                  date: data.departureDate,
                  priceCents: Math.round(amount * 100),
                });
              }
              providerStatuses.push({
                providerCode: selectedInfoSlugs[0] || "infotravel",
                displayName: "InfoTravel GDS (Transfers)",
                category: "transfers",
                status: count > 0 ? "ok" : "empty",
                count,
                latencyMs,
              });
            } catch (err: any) {
              providerStatuses.push({
                providerCode: selectedInfoSlugs[0] || "infotravel",
                displayName: "InfoTravel GDS (Transfers)",
                category: "transfers",
                status: "error",
                count: 0,
                latencyMs: Date.now() - startedAt,
                message: err?.message || "Erro ao consultar transfers no InfoTravel",
              });
            }
          })(),
        );
      }

      // 2.e Passeios e Atividades InfoTravel
      if (data.categories.includes("activities")) {
        tasks.push(
          (async () => {
            const startedAt = Date.now();
            try {
              const rawActs = await infotravelSearchActivities(identity.store_id, {
                destination: destinationSearchTerm,
                city: safeDestCity,
                date: data.departureDate,
                checkin: data.departureDate,
                checkout: data.returnDate || undefined,
              });
              const latencyMs = Date.now() - startedAt;
              let count = 0;
              for (const act of rawActs) {
                const title = String(act?.name || act?.title || "").trim();
                const amount = Number(act?.price?.amount ?? act?.price ?? act?.total_price);
                if (!title || !Number.isFinite(amount) || amount <= 0) continue;
                count++;
                activities.push({
                  id: String(act?.id || `act-${count}`),
                  providerCode: selectedInfoSlugs[0] || "infotravel",
                  source: "api_live",
                  title,
                  description: typeof act?.description === "string" ? act.description : undefined,
                  duration: typeof act?.duration === "string" ? act.duration : undefined,
                  destination: safeDestCity,
                  priceCents: Math.round(amount * 100),
                  included: true,
                  imageUrl: typeof act?.image_url === "string" ? act.image_url : null,
                });
              }
              providerStatuses.push({
                providerCode: selectedInfoSlugs[0] || "infotravel",
                displayName: "InfoTravel GDS (Passeios)",
                category: "activities",
                status: count > 0 ? "ok" : "empty",
                count,
                latencyMs,
              });
            } catch (err: any) {
              providerStatuses.push({
                providerCode: selectedInfoSlugs[0] || "infotravel",
                displayName: "InfoTravel GDS (Passeios)",
                category: "activities",
                status: "error",
                count: 0,
                latencyMs: Date.now() - startedAt,
                message: err?.message || "Erro ao consultar passeios no InfoTravel",
              });
            }
          })(),
        );
      }

      // 2.f Locação de Carros InfoTravel (sem frota sintética)
      if (data.categories.includes("cars") && data.returnDate) {
        tasks.push(
          (async () => {
            const startedAt = Date.now();
            try {
              const infoCars = await infotravelSearchCarRentals({
                data: {
                  pickupAirportOrCity: destinationSearchTerm,
                  pickupDate: data.departureDate,
                  dropoffDate: data.returnDate,
                },
              });
              const latencyMs = Date.now() - startedAt;
              let count = 0;
              for (const car of infoCars) {
                const daily = Number(car.dailyRateBrl);
                const total = Number(car.totalRateBrl);
                if (!car.rentalCompany || !car.vehicleCategory || !Number.isFinite(daily) || daily <= 0) continue;
                count++;
                cars.push({
                  id: `infotravel_car_${car.id}`,
                  providerCode: selectedInfoSlugs[0] || "infotravel",
                  rentalCompany: car.rentalCompany,
                  vehicleCategory: car.vehicleCategory,
                  vehicleModelExample: car.vehicleModelExample || car.vehicleCategory,
                  transmission: car.transmission,
                  pickupLocation: car.pickupLocation || safeDestCity,
                  dailyRateCents: Math.round(daily * 100),
                  totalPriceCents: Math.round((Number.isFinite(total) && total > 0 ? total : daily * nightsCount) * 100),
                });
              }
              providerStatuses.push({
                providerCode: selectedInfoSlugs[0] || "infotravel",
                displayName: "InfoTravel GDS (Carros)",
                category: "cars",
                status: count > 0 ? "ok" : "empty",
                count,
                latencyMs,
              });
            } catch (err: any) {
              providerStatuses.push({
                providerCode: selectedInfoSlugs[0] || "infotravel",
                displayName: "InfoTravel GDS (Carros)",
                category: "cars",
                status: "error",
                count: 0,
                latencyMs: Date.now() - startedAt,
                message: err?.message || "Erro ao consultar carros no InfoTravel",
              });
            }
          })(),
        );
      }
    }

    // 3. Catálogo Real do Banco da Agência (global_hotels + tourism_experiences + products)
    if (data.includeOwnDbCatalog) {
      tasks.push(
        (async () => {
          const startedAt = Date.now();
          let dbCount = 0;
          try {
            const dbCalls: Array<Promise<any>> = [];
            if (data.categories.includes("hotels")) {
              dbCalls.push(
                (supabase
                  .from("global_hotels")
                  .select("id, name, city, state, country, stars, amenities")
                  .or(`city.ilike.%${safeDestCity}%,name.ilike.%${safeDestCity}%,country.ilike.%${safeDestCity}%`)
                  .limit(10) as unknown) as Promise<any>,
              );
            } else {
              dbCalls.push(Promise.resolve({ data: [] }));
            }

            if (data.categories.includes("packages") || data.categories.includes("activities")) {
              dbCalls.push(
                (supabase
                  .from("tourism_experiences")
                  .select("id, title, destination, departure_date, return_date, price_cents, duration, included_items, cover_image_url, category")
                  .eq("store_id", identity.store_id)
                  .neq("status", "cancelled")
                  .or(`destination.ilike.%${safeDestCity}%,title.ilike.%${safeDestCity}%`)
                  .limit(10) as unknown) as Promise<any>,
              );
              dbCalls.push(
                (supabase
                  .from("products")
                  .select("id, title, description, price_cents, attributes, product_media(url, sort_order)")
                  .eq("store_id", identity.store_id)
                  .in("status", ["active", "published"])
                  .or(`title.ilike.%${safeDestCity}%,description.ilike.%${safeDestCity}%`)
                  .limit(10) as unknown) as Promise<any>,
              );
            } else {
              dbCalls.push(Promise.resolve({ data: [] }), Promise.resolve({ data: [] }));
            }

            const [hotelsRes, expsRes, prodsRes] = await Promise.all(dbCalls);

            for (const h of Array.isArray(hotelsRes?.data) ? hotelsRes.data : []) {
              dbCount++;
              hotels.push({
                id: String(h.id),
                providerCode: "db_catalog",
                source: "db_catalog",
                hotelName: String(h.name),
                city: [h.city, h.state, h.country].filter(Boolean).join(", ") || safeDestCity,
                stars: Number(h.stars) > 0 ? Number(h.stars) : undefined,
                checkinDate: data.departureDate,
                checkoutDate: data.returnDate || data.departureDate,
                nightsCount,
                pricePerNightCents: 0,
                totalPriceCents: 0,
                amenities: Array.isArray(h.amenities) ? h.amenities.map(String) : [],
                imageUrl: null,
              });
            }

            for (const exp of Array.isArray(expsRes?.data) ? expsRes.data : []) {
              dbCount++;
              const includedList = Array.isArray(exp.included_items) ? exp.included_items.map(String) : [];
              if (data.categories.includes("activities")) {
                activities.push({
                  id: String(exp.id),
                  providerCode: "db_catalog",
                  source: "db_catalog",
                  title: String(exp.title),
                  duration: exp.duration ? String(exp.duration) : undefined,
                  destination: String(exp.destination || safeDestCity),
                  priceCents: Math.max(0, Number(exp.price_cents || 0)),
                  included: true,
                  imageUrl: exp.cover_image_url ? String(exp.cover_image_url) : null,
                });
              }
              if (data.categories.includes("packages")) {
                packages.push({
                  id: `exp_${exp.id}`,
                  providerCode: "db_catalog",
                  operatorSlug: "catalogo_proprio",
                  source: "db_catalog",
                  packageName: String(exp.title),
                  destination: String(exp.destination || safeDestCity),
                  departureDate: String(exp.departure_date || data.departureDate).slice(0, 10),
                  returnDate: String(exp.return_date || data.returnDate || data.departureDate).slice(0, 10),
                  nights: computeNightsBetween(String(exp.departure_date || data.departureDate), String(exp.return_date || data.returnDate)),
                  includesFlight: false,
                  includesHotel: false,
                  includesTransfer: false,
                  priceTotalCents: Math.max(0, Number(exp.price_cents || 0)),
                  taxesCents: 0,
                  commissionPercent: 0,
                  imageUrl: exp.cover_image_url ? String(exp.cover_image_url) : null,
                  includedItems: includedList,
                });
              }
            }

            for (const p of Array.isArray(prodsRes?.data) ? prodsRes.data : []) {
              dbCount++;
              const meta = (p.attributes && typeof p.attributes === "object" ? p.attributes : {}) as Record<string, any>;
              const media = Array.isArray(p.product_media)
                ? [...p.product_media].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                : [];
              const imgUrl = media[0]?.url ? String(media[0].url) : null;
              const inc = Array.isArray(meta.includes) ? meta.includes.map(String) : [];
              if (data.categories.includes("packages")) {
                packages.push({
                  id: `prod_${p.id}`,
                  providerCode: "db_catalog",
                  operatorSlug: "catalogo_proprio",
                  source: "db_catalog",
                  packageName: String(p.title),
                  destination: String(meta.destination || safeDestCity),
                  departureDate: data.departureDate,
                  returnDate: data.returnDate || data.departureDate,
                  nights: nightsCount,
                  includesFlight: Boolean(meta.flight_details),
                  includesHotel: Array.isArray(meta.lodgings) && meta.lodgings.length > 0,
                  includesTransfer: false,
                  priceTotalCents: Math.max(0, Number(p.price_cents || 0)),
                  taxesCents: 0,
                  commissionPercent: 0,
                  description: typeof p.description === "string" ? p.description : null,
                  imageUrl: imgUrl,
                  includedItems: inc,
                });
              }
            }

            providerStatuses.push({
              providerCode: "db_catalog",
              displayName: "Catálogo Real da Agência (Banco de Dados)",
              category: "multi",
              status: dbCount > 0 ? "ok" : "empty",
              count: dbCount,
              latencyMs: Date.now() - startedAt,
            });
          } catch (err: any) {
            providerStatuses.push({
              providerCode: "db_catalog",
              displayName: "Catálogo Real da Agência",
              category: "multi",
              status: "error",
              count: 0,
              latencyMs: Date.now() - startedAt,
              message: err?.message || "Erro ao consultar catálogo interno",
            });
          }
        })(),
      );
    }

    await Promise.allSettled(tasks);

    if (snapshotsToPersist.length > 0) {
      await persistCanonicalOfferSnapshots({ quoteSessionId, offers: snapshotsToPersist }).catch(() => {});
    }

    const successfulCount = providerStatuses.filter((s) => s.status === "ok" && s.providerCode !== "db_catalog").length;
    const failedCount = providerStatuses.filter((s) => s.status === "error").length;

    await finalizeCanonicalQuoteSession({
      quoteSessionId,
      providerCount: Math.max(1, providerStatuses.filter((s) => s.providerCode !== "db_catalog").length),
      successfulProviderCount: successfulCount,
      failedProviderCount: failedCount,
      status: successfulCount > 0 || dbCatalogHasItems(packages, hotels, activities) ? "completed" : "failed",
    }).catch(() => {});

    return {
      quoteSessionId,
      isAnyApiConfigured,
      activeOperators: [
        ...(shouldQueryWooba ? ["wooba"] : []),
        ...selectedInfoSlugs,
      ],
      providerStatuses,
      packages,
      flights,
      hotels,
      transfers,
      activities,
      cars,
    };
  });

function dbCatalogHasItems(
  packages: PassHubPackageResultItem[],
  hotels: PassHubHotelResultItem[],
  activities: PassHubActivityResultItem[],
): boolean {
  return packages.length > 0 || hotels.length > 0 || activities.length > 0;
}
