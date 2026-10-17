import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { assertStoreAccess, getServerIdentity } from "@/lib/server-access";
import { type Hotel, type Flight } from "@/services/proposals";
import { INFOTRAVEL_CONTRACT_VERSION, mapApiHotelToCanonical, mapApiFlightToCanonical, mapInfotravelV1BookingToNormalized, type NormalizedBooking, type ApiHotelAvail, type ApiFlightAvail, type InfotravelV1BookingDTO } from "@/types/infotravel";

// ── Erro estruturado para credenciais não configuradas ─────────────────────
// O conector retorna códigos estruturados também para respostas HTTP não-2xx;
// o BFF preserva o código para diferenciar onboarding de indisponibilidade.
export class InfotravelNotConfiguredError extends Error {
  readonly errorCode = "CREDENTIALS_NOT_CONFIGURED";
  constructor() {
    super(
      "As credenciais de acesso ao GDS Infotravel não foram configuradas para esta agência. " +
        "Acesse Configurações → Conexões → Infotravel para inserir suas credenciais de produção.",
    );
    this.name = "InfotravelNotConfiguredError";
  }
}

/**
 * BFF Server Function para despachar chamadas com segurança ao Edge Function ou conector GDS
 */
export const invokeInfotravelConnector = createServerFn({ method: "POST" })
  .validator(
    z.object({
      action: z.string(),
      agencyId: z.string().uuid(),
      params: z.record(z.any()).optional(),
    })
  )
  .handler(async ({ data: { action, agencyId, params } }) => {
    try {
      const identity = await getServerIdentity();
      assertStoreAccess(identity);
      const elevatedRoles = ["owner", "admin", "manager", "master", "platform_admin"];
      if (agencyId !== identity.store_id && !elevatedRoles.includes(identity.role)) {
        throw new Error("Acesso negado ao tenant solicitado.");
      }

      const supabase = getServerClient();
      const { data, error } = await supabase.functions.invoke("infotravel-connector", {
        body: { action, agencyId, params: params || {} },
      });

      if (error) {
        // supabase-js pode entregar o corpo estruturado em data ou no contexto
        // da FunctionsHttpError. Nunca descarte CREDENTIALS_NOT_CONFIGURED.
        let structured = data as any;
        if (!structured && (error as any)?.context?.json) {
          try { structured = await (error as any).context.json(); } catch { /* corpo ausente */ }
        }
        if (structured?.error_code) return structured;
        return { error_code: "CONNECTOR_UNAVAILABLE", error: error.message };
      }

      return data;
    } catch (e: any) {
      if (e?.message === "Acesso negado ao tenant solicitado.") throw e;
      return { error_code: "CONNECTOR_UNAVAILABLE", error: e?.message || "Falha no conector GDS" };
    }
  });

/**
 * Despacha uma chamada ao conector e trata o retorno estruturado.
 * Lança InfotravelNotConfiguredError quando credenciais estão ausentes
 * e um Error padrão para erros de API reais.
 */
async function invokeConnector<T = any>(
  action: string,
  agencyId: string,
  params?: Record<string, any>,
): Promise<T> {
  const data = await invokeInfotravelConnector({
    data: { action, agencyId, params: params || {} },
  });

  // Credenciais não configuradas — retorno estruturado
  if (data?.error_code === "CREDENTIALS_NOT_CONFIGURED") {
    throw new InfotravelNotConfiguredError();
  }

  if (data?.error_code === "CONNECTOR_UNAVAILABLE") {
    throw new Error(data.error || "Conector InfoTravel indisponível.");
  }

  // Erro de API retornado como JSON estruturado
  if (data?.success === false && data?.error) {
    throw new Error(data.error);
  }

  return data as T;
}

function requireV1Envelope(data: any, action: string): any {
  if (data?.contract_version !== INFOTRAVEL_CONTRACT_VERSION) {
    throw new Error(`Resposta InfoTravel incompatível com ${INFOTRAVEL_CONTRACT_VERSION} para ${action}.`);
  }
  return data;
}

// ── Busca de Hotéis ────────────────────────────────────────────────────────
export async function infotravelSearchHotels(
  agencyId: string,
  params: {
    city: string;
    checkin: string;
    checkout: string;
    rooms?: number;
    quoteRequestId?: string;
    scenarioId?: string;
  },
): Promise<Hotel[]> {
  const data = await invokeConnector("search_hotels", agencyId, params);
  const envelope = requireV1Envelope(data, "search_hotels");
  return (Array.isArray(envelope.offers) ? envelope.offers : []).map((item: ApiHotelAvail) => mapApiHotelToCanonical(item));
}

// ── Busca de Voos ──────────────────────────────────────────────────────────
export async function infotravelSearchFlights(
  agencyId: string,
  params: {
    origin: string;
    destination: string;
    date: string;
    quoteRequestId?: string;
    scenarioId?: string;
  },
): Promise<Flight[]> {
  const data = await invokeConnector("search_flights", agencyId, params);
  const envelope = requireV1Envelope(data, "search_flights");
  return (Array.isArray(envelope.offers) ? envelope.offers : []).map((item: ApiFlightAvail) => mapApiFlightToCanonical(item));
}

// ── Busca de Traslados/Transfers ───────────────────────────────────────────
export async function infotravelSearchTransfers(
  agencyId: string,
  params: {
    destination?: string;
    city?: string;
    date?: string;
    checkin?: string;
    checkout?: string;
    rooms?: number;
    quoteRequestId?: string;
    scenarioId?: string;
  },
): Promise<any[]> {
  const data = await invokeConnector("search_transfers", agencyId, params);
  const envelope = requireV1Envelope(data, "search_transfers");
  return Array.isArray(envelope.offers) ? envelope.offers : [];
}

// ── Busca de Passeios e Atividades ─────────────────────────────────────────
export async function infotravelSearchActivities(
  agencyId: string,
  params: {
    destination?: string;
    city?: string;
    date?: string;
    checkin?: string;
    checkout?: string;
    rooms?: number;
    quoteRequestId?: string;
    scenarioId?: string;
  },
): Promise<any[]> {
  const data = await invokeConnector("search_activities", agencyId, params);
  const envelope = requireV1Envelope(data, "search_activities");
  return Array.isArray(envelope.offers) ? envelope.offers : [];
}

// ── Importação de Reserva ──────────────────────────────────────────────────
export async function infotravelImportBooking(
  agencyId: string,
  bookingId: string,
): Promise<NormalizedBooking> {
  const envelope = requireV1Envelope(
      await invokeConnector<any>("import_booking", agencyId, { bookingId }),
      "import_booking",
  );
  return mapInfotravelV1BookingToNormalized(envelope.normalized as InfotravelV1BookingDTO);
}

// ── Criação e Sincronização de Reservas (Trips) ───────────────────────────
export async function infotravelCreateBooking(agencyId: string, tripId: string): Promise<any> {
  return await invokeConnector("create_booking", agencyId, { tripId });
}

export async function infotravelSyncBooking(agencyId: string, tripId: string): Promise<any> {
  return requireV1Envelope(
      await invokeConnector<any>("run_periodic_sync", agencyId, { tripId }),
      "run_periodic_sync",
  );
}

export async function infotravelImportToTrip(
  agencyId: string,
  bookingId: string,
  tripId: string,
): Promise<any> {
  return await importInfotravelBookingToTrip({ data: { bookingId, tripId, agencyId } });
}

function toInfotravelSnapshot(providerResult: any, requestedBookingId: string): { bookingId: string; snapshot: Record<string, unknown> } {
  const normalized = providerResult?.normalized || providerResult || {};
  const bookingId = String(
    normalized.bookingCode || normalized.booking_id || normalized.bookingId || normalized.code || requestedBookingId,
  );
  const totalAmountCents = Number(normalized.totalAmountCents);
  const totalSale = Number.isFinite(totalAmountCents)
    ? totalAmountCents / 100
    : Number(normalized.total_sale ?? normalized.totalAmount ?? 0);
  return {
    bookingId,
    snapshot: {
      provider: "InfoTravel",
      contract_version: INFOTRAVEL_CONTRACT_VERSION,
      booking_id: bookingId,
      flights: Array.isArray(normalized.flights) ? normalized.flights : Array.isArray(providerResult?.bookingFlights) ? providerResult.bookingFlights : [],
      hotels: Array.isArray(normalized.hotels) ? normalized.hotels : Array.isArray(providerResult?.bookingHotels) ? providerResult.bookingHotels : [],
      transfers: Array.isArray(normalized.transfers) ? normalized.transfers : [],
      tours: Array.isArray(normalized.tours) ? normalized.tours : Array.isArray(normalized.activities) ? normalized.activities : [],
      passengers: Array.isArray(normalized.passengers) ? normalized.passengers : [],
      destination: normalized.destination || normalized.destination_city,
      travel_start: normalized.travel_start || normalized.travelStart,
      travel_end: normalized.travel_end || normalized.travelEnd,
      total_sale: Number.isFinite(totalSale) ? totalSale : undefined,
      client_name: normalized.clientName || normalized.client_name || normalized.client?.name,
      client_email: normalized.clientEmail || normalized.client_email || normalized.client?.email,
      client_phone: normalized.clientPhone || normalized.client_phone || normalized.client?.phone,
    },
  };
}

async function applyInfotravelSnapshot(
  supabase: ReturnType<typeof getServerClient>,
  agencyId: string,
  tripId: string,
  providerResult: any,
  requestedBookingId: string,
) {
  const { bookingId, snapshot } = toInfotravelSnapshot(providerResult, requestedBookingId);
  const { data, error } = await supabase.rpc("apply_infotravel_booking", {
    p_trip_id: tripId,
    p_store_id: agencyId,
    p_booking_id: bookingId,
    p_snapshot: snapshot,
  });
  if (error || !data) throw new Error("Não foi possível aplicar a reserva InfoTravel de forma transacional: " + (error?.message || "retorno vazio"));
  const result = data as { booking_id?: unknown; passengers_applied?: unknown; confirmation_items_applied?: unknown };
  return {
    booking_id: String(result.booking_id || requestedBookingId),
    passengers_applied: Number(result.passengers_applied || 0),
    confirmation_items_applied: Number(result.confirmation_items_applied || 0),
  };
}

/** Importa e aplica a reserva inteira, incluindo passageiros e localizadores, em uma RPC idempotente. */
export const importInfotravelBookingToTrip = createServerFn({ method: "POST" })
  .validator(z.object({ agencyId: z.string().uuid(), bookingId: z.string().min(1), tripId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    const elevatedRoles = ["owner", "admin", "manager", "master", "platform_admin"];
    if (data.agencyId !== identity.store_id && !elevatedRoles.includes(identity.role)) throw new Error("Acesso negado ao tenant solicitado.");
    const providerResult = requireV1Envelope(
      await invokeConnector<any>("import_booking", data.agencyId, { bookingId: data.bookingId, tripId: data.tripId }),
      "import_booking",
    );
    const applied = await applyInfotravelSnapshot(getServerClient(), data.agencyId, data.tripId, providerResult, data.bookingId);
    return { success: true, ...applied };
  });

export const syncInfotravelTrip = createServerFn({ method: "POST" })
  .validator(z.object({ agencyId: z.string().uuid(), tripId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    const elevatedRoles = ["owner", "admin", "manager", "master", "platform_admin"];
    if (data.agencyId !== identity.store_id && !elevatedRoles.includes(identity.role)) throw new Error("Acesso negado ao tenant solicitado.");
    const providerResult = requireV1Envelope(
      await invokeConnector<any>("run_periodic_sync", data.agencyId, { tripId: data.tripId }),
      "run_periodic_sync",
    );
    const { data: trip, error: tripError } = await getServerClient().from("tourism_trips").select("external_booking_id").eq("id", data.tripId).eq("store_id", data.agencyId).maybeSingle();
    if (tripError || !trip?.external_booking_id) throw new Error("A viagem ainda não possui uma reserva InfoTravel vinculada para sincronizar.");
    const applied = await applyInfotravelSnapshot(getServerClient(), data.agencyId, data.tripId, providerResult, trip.external_booking_id);
    return { success: true, ...applied };
  });

// ── Teste de Conexão ───────────────────────────────────────────────────────
export async function infotravelTestConnection(agencyId: string): Promise<boolean> {
  try {
    const data = await invokeConnector("test_connection", agencyId);
    return data?.contract_version === INFOTRAVEL_CONTRACT_VERSION && data?.normalized?.status === "ok";
  } catch {
    return false;
  }
}

export const testInfotravelConnection = createServerFn({ method: "POST" })
  .validator(z.object({ agencyId: z.string().uuid() }))
  .handler(async ({ data }) => ({ success: await infotravelTestConnection(data.agencyId) }));

export const testCurrentInfotravelConnection = createServerFn({ method: "POST" })
  .handler(async () => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);
    return { success: await infotravelTestConnection(identity.store_id) };
  });

// ============================================================================
// 5. COBERTURA COMPLETA 100% INFOTRAVEL API v1 (PACOTES, BLOQUEIOS/GRUPOS,
//    SEGURO VIAGEM, LOCAÇÃO DE CARROS, IMPORTAÇÃO DE RESERVAS E CRÉDITO CRM)
// ============================================================================

export type InfoTravelOperatorSlug =
  | "infotravel_default"
  | "orinter"
  | "frt"
  | "incomum"
  | "cativa"
  | "befly"
  | "confianca";

export interface InfoTravelPackageAvailItem {
  id: string;
  operatorSlug: InfoTravelOperatorSlug;
  packageName: string;
  destinationName: string;
  departureDate: string;
  returnDate: string;
  nights: number;
  includesFlight: boolean;
  includesHotel: boolean;
  includesTransfer: boolean;
  hotelName: string;
  boardType: string;
  priceTotalBrl: number;
  taxesBrl: number;
  commissionPercent: number;
}

export interface InfoTravelAllotmentGroupItem {
  id: string;
  operatorSlug: InfoTravelOperatorSlug;
  groupCode: string;
  title: string;
  originCode: string;
  destinationCode: string;
  departureDate: string;
  returnDate: string;
  airline: string;
  seatsTotal: number;
  seatsRemaining: number;
  netTariffBrl: number;
  taxesBrl: number;
  timelimitHoldHours: number;
}

export interface InfoTravelInsuranceQuoteItem {
  id: string;
  providerName: string;
  planName: string;
  coverageMedicalUsd: number;
  coverageBaggageUsd: number;
  includesCovid: boolean;
  pricePerPassengerBrl: number;
  totalPriceBrl: number;
}

export interface InfoTravelCarRentalQuoteItem {
  id: string;
  rentalCompany: string;
  vehicleCategory: string;
  vehicleModelExample: string;
  transmission: "Automático" | "Manual";
  includesUnlimitedMileage: boolean;
  includesFullProtection: boolean;
  pickupLocation: string;
  dropoffLocation: string;
  dailyRateBrl: number;
  totalRateBrl: number;
}

export interface InfotravelIntegrationStatusDTO {
  isConfigured: boolean;
  configuredOperators: InfoTravelOperatorSlug[];
  hubSettingsUrl: string;
  recentErrors: Array<{
    id: string;
    createdAt: string;
    operatorSlug: string;
    endpoint: string;
    errorMessage: string;
  }>;
}

async function resolveStoreInfotravelCredentials(
  storeId: string,
  operatorSlug: InfoTravelOperatorSlug,
): Promise<{
  baseUrl: string;
  authHeader: Record<string, string>;
  rawPayload: Record<string, string>;
} | null> {
  const { getActiveIntegrationPayload } = await import("@/services/integrations.functions");
  const specific = await getActiveIntegrationPayload(storeId, `infotravel_${operatorSlug}`);
  const generic = specific || (await getActiveIntegrationPayload(storeId, "infotravel"));
  if (!generic) return null;

  const baseUrl = (generic.base_url || generic.apiUrl || "").trim().replace(/\/+$/, "");
  const token = (generic.token || generic.api_key || generic.password || "").trim();
  if (!baseUrl || !token) return null;

  const authType = (generic.auth || "bearer").toLowerCase();
  const authHeader: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authType === "api_key") {
    authHeader[generic.api_key_header || "x-api-key"] = token;
  } else if (authType === "basic" && generic.username) {
    const encoded = Buffer.from(`${generic.username}:${token}`).toString("base64");
    authHeader.Authorization = `Basic ${encoded}`;
  } else {
    authHeader.Authorization = `Bearer ${token}`;
  }

  return { baseUrl, authHeader, rawPayload: generic };
}

async function recordInfotravelApiError(
  identity: Awaited<ReturnType<typeof getServerIdentity>>,
  operatorSlug: string,
  endpoint: string,
  errorMessage: string,
  httpStatus?: number,
) {
  try {
    const { logAuditAction } = await import("@/services/audit.functions");
    await logAuditAction(identity, "INFOTRAVEL_API_ERROR", "integration_credentials", operatorSlug, {
      operatorSlug,
      endpoint,
      httpStatus: httpStatus ?? null,
      errorMessage,
      timestamp: new Date().toISOString(),
    });
  } catch {
    // Silencioso caso audit_logs indisponível
  }
}

export const getInfotravelIntegrationStatusFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<InfotravelIntegrationStatusDTO> => {
    try {
      const identity = await getServerIdentity();
      if (!identity?.store_id) {
        return {
          isConfigured: false,
          configuredOperators: [],
          hubSettingsUrl: "/workspace/configuracoes/integracoes",
          recentErrors: [],
        };
      }

      const supabase = getServerClient();
      const { data: creds } = await supabase
        .from("integration_credentials")
        .select("provider, is_active, public_metadata, token_payload")
        .eq("store_id", identity.store_id)
        .eq("is_active", true);

      const configuredOperators: InfoTravelOperatorSlug[] = [];
      const activeList = Array.isArray(creds) ? creds : [];

      for (const row of activeList) {
        const p = String(row.provider || "").toLowerCase();
        if (p === "infotravel") {
          configuredOperators.push("infotravel_default", "orinter", "frt", "incomum", "cativa", "befly", "confianca");
        } else if (p.startsWith("infotravel_")) {
          const slug = p.replace("infotravel_", "") as InfoTravelOperatorSlug;
          if (!configuredOperators.includes(slug)) {
            configuredOperators.push(slug);
          }
        }
      }

      const { data: errorLogs } = await supabase
        .from("audit_logs")
        .select("id, created_at, entity_id, payload_snapshot")
        .eq("store_id", identity.store_id)
        .eq("action", "INFOTRAVEL_API_ERROR")
        .order("created_at", { ascending: false })
        .limit(10);

      const recentErrors = (Array.isArray(errorLogs) ? errorLogs : []).map((log: any) => ({
        id: String(log.id),
        createdAt: String(log.created_at || ""),
        operatorSlug: String(log.payload_snapshot?.operatorSlug || log.entity_id || "infotravel"),
        endpoint: String(log.payload_snapshot?.endpoint || "/api/v1"),
        errorMessage: String(log.payload_snapshot?.errorMessage || "Erro de comunicação com a API InfoTravel"),
      }));

      return {
        isConfigured: configuredOperators.length > 0,
        configuredOperators: Array.from(new Set(configuredOperators)),
        hubSettingsUrl: "/workspace/configuracoes/integracoes",
        recentErrors,
      };
    } catch {
      return {
        isConfigured: false,
        configuredOperators: [],
        hubSettingsUrl: "/workspace/configuracoes/integracoes",
        recentErrors: [],
      };
    }
  },
);

export const infotravelSearchPackages = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      destination: z.string().min(2),
      departureDate: z.string().min(8),
      returnDate: z.string().min(8),
      adults: z.number().min(1).default(2),
      childrenAges: z.array(z.number()).optional().default([]),
      operatorSlug: z
        .enum([
          "infotravel_default",
          "orinter",
          "frt",
          "incomum",
          "cativa",
          "befly",
          "confianca",
        ])
        .optional()
        .default("orinter"),
    }),
  )
  .handler(async ({ data }): Promise<InfoTravelPackageAvailItem[]> => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);

    const creds = await resolveStoreInfotravelCredentials(identity.store_id, data.operatorSlug);
    if (!creds) {
      await recordInfotravelApiError(
        identity,
        data.operatorSlug,
        "/api/v1/utility/packageAvail",
        `Credenciais InfoTravel (${data.operatorSlug.toUpperCase()}) não configuradas no Hub de Integrações.`,
      );
      throw new InfotravelNotConfiguredError();
    }

    const startDate = new Date(data.departureDate);
    const endDate = new Date(data.returnDate);
    const nights = Math.max(
      1,
      Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
    );

    const endpoint = `${creds.baseUrl}/api/v1/utility/packageAvail`;
    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: "POST",
        headers: creds.authHeader,
        body: JSON.stringify({
          destination: data.destination,
          departure: data.departureDate,
          arrival: data.returnDate,
          occupancies: [{ adults: data.adults, childrenAges: data.childrenAges }],
          operator: data.operatorSlug,
        }),
      });
    } catch (networkErr: any) {
      const msg = `Falha de conexão com InfoTravel (${data.operatorSlug.toUpperCase()}): ${networkErr?.message || "Erro de rede"}`;
      await recordInfotravelApiError(identity, data.operatorSlug, endpoint, msg);
      throw new Error(msg);
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      const msg = `Erro HTTP ${res.status} na API InfoTravel (${data.operatorSlug.toUpperCase()}): ${errText.slice(0, 180) || res.statusText}`;
      await recordInfotravelApiError(identity, data.operatorSlug, endpoint, msg, res.status);
      throw new Error(msg);
    }

    const json = await res.json();
    const list = Array.isArray(json?.packageAvail) ? json.packageAvail : [];
    return list.map((pkg: any, idx: number) => ({
      id: String(pkg.id || `PKG-${idx + 1}`),
      operatorSlug: data.operatorSlug,
      packageName: String(pkg.name || `Pacote ${data.destination}`),
      destinationName: data.destination,
      departureDate: data.departureDate,
      returnDate: data.returnDate,
      nights,
      includesFlight: Boolean(pkg.includesFlight ?? true),
      includesHotel: Boolean(pkg.includesHotel ?? true),
      includesTransfer: Boolean(pkg.includesTransfer ?? true),
      hotelName: String(pkg.hotel?.name || ""),
      boardType: String(pkg.board?.name || ""),
      priceTotalBrl: Number(pkg.price?.amount || 0),
      taxesBrl: Number(pkg.taxes?.amount || 0),
      commissionPercent: Number(pkg.commissionPercent || 0),
    }));
  });

export const infotravelSearchAllotments = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      originCode: z.string().min(3),
      destinationCode: z.string().min(3),
      monthYear: z.string().optional(),
      operatorSlug: z
        .enum([
          "infotravel_default",
          "orinter",
          "frt",
          "incomum",
          "cativa",
          "befly",
          "confianca",
        ])
        .optional()
        .default("orinter"),
    }),
  )
  .handler(async ({ data }): Promise<InfoTravelAllotmentGroupItem[]> => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);

    const creds = await resolveStoreInfotravelCredentials(identity.store_id, data.operatorSlug);
    if (!creds) {
      await recordInfotravelApiError(
        identity,
        data.operatorSlug,
        "/api/v1/avail/allotment",
        `Credenciais InfoTravel (${data.operatorSlug.toUpperCase()}) não configuradas no Hub de Integrações.`,
      );
      throw new InfotravelNotConfiguredError();
    }

    const endpoint = `${creds.baseUrl}/api/v1/avail/allotment`;
    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: "POST",
        headers: creds.authHeader,
        body: JSON.stringify({
          origin: data.originCode.toUpperCase().slice(0, 3),
          destination: data.destinationCode.toUpperCase().slice(0, 3),
          monthYear: data.monthYear,
          operator: data.operatorSlug,
        }),
      });
    } catch (networkErr: any) {
      const msg = `Falha de conexão com InfoTravel Bloqueios (${data.operatorSlug.toUpperCase()}): ${networkErr?.message || "Erro de rede"}`;
      await recordInfotravelApiError(identity, data.operatorSlug, endpoint, msg);
      throw new Error(msg);
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      const msg = `Erro HTTP ${res.status} em Bloqueios InfoTravel (${data.operatorSlug.toUpperCase()}): ${errText.slice(0, 180) || res.statusText}`;
      await recordInfotravelApiError(identity, data.operatorSlug, endpoint, msg, res.status);
      throw new Error(msg);
    }

    const json = await res.json();
    const list = Array.isArray(json?.allotments) ? json.allotments : [];
    return list.map((item: any, idx: number) => ({
      id: String(item.id || `BLK-${idx + 1}`),
      operatorSlug: data.operatorSlug,
      groupCode: String(item.groupCode || ""),
      title: String(item.title || ""),
      originCode: String(item.originCode || data.originCode),
      destinationCode: String(item.destinationCode || data.destinationCode),
      departureDate: String(item.departureDate || ""),
      returnDate: String(item.returnDate || ""),
      airline: String(item.airline || ""),
      seatsTotal: Number(item.seatsTotal || 0),
      seatsRemaining: Number(item.seatsRemaining || 0),
      netTariffBrl: Number(item.netTariffBrl || 0),
      taxesBrl: Number(item.taxesBrl || 0),
      timelimitHoldHours: Number(item.timelimitHoldHours || 0),
    }));
  });

export const infotravelSearchInsurances = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      destinationRegion: z.enum([
        "brasil",
        "america_latina",
        "estados_unidos_canada",
        "europa_schengen",
        "mundo_inteiro",
      ]),
      departureDate: z.string().min(8),
      returnDate: z.string().min(8),
      passengersCount: z.number().min(1).default(2),
    }),
  )
  .handler(async ({ data }): Promise<InfoTravelInsuranceQuoteItem[]> => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);

    const creds = await resolveStoreInfotravelCredentials(identity.store_id, "infotravel_default");
    if (!creds) {
      await recordInfotravelApiError(
        identity,
        "infotravel_default",
        "/api/v1/avail/insurance",
        "Credenciais InfoTravel Seguro Viagem não configuradas no Hub de Integrações.",
      );
      throw new InfotravelNotConfiguredError();
    }

    const endpoint = `${creds.baseUrl}/api/v1/avail/insurance`;
    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: "POST",
        headers: creds.authHeader,
        body: JSON.stringify(data),
      });
    } catch (networkErr: any) {
      const msg = `Falha de conexão com InfoTravel Seguro Viagem: ${networkErr?.message || "Erro de rede"}`;
      await recordInfotravelApiError(identity, "infotravel_default", endpoint, msg);
      throw new Error(msg);
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      const msg = `Erro HTTP ${res.status} na API InfoTravel Seguro Viagem: ${errText.slice(0, 180) || res.statusText}`;
      await recordInfotravelApiError(identity, "infotravel_default", endpoint, msg, res.status);
      throw new Error(msg);
    }

    const json = await res.json();
    const list = Array.isArray(json?.insurances) ? json.insurances : [];
    return list.map((item: any, idx: number) => ({
      id: String(item.id || `INS-${idx + 1}`),
      providerName: String(item.providerName || ""),
      planName: String(item.planName || ""),
      coverageMedicalUsd: Number(item.coverageMedicalUsd || 0),
      coverageBaggageUsd: Number(item.coverageBaggageUsd || 0),
      includesCovid: Boolean(item.includesCovid),
      pricePerPassengerBrl: Number(item.pricePerPassengerBrl || 0),
      totalPriceBrl: Number(item.totalPriceBrl || 0),
    }));
  });

export const infotravelSearchCarRentals = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      pickupAirportOrCity: z.string().min(2),
      pickupDate: z.string().min(8),
      dropoffDate: z.string().min(8),
    }),
  )
  .handler(async ({ data }): Promise<InfoTravelCarRentalQuoteItem[]> => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);

    const creds = await resolveStoreInfotravelCredentials(identity.store_id, "infotravel_default");
    if (!creds) {
      await recordInfotravelApiError(
        identity,
        "infotravel_default",
        "/api/v1/avail/car",
        "Credenciais InfoTravel Locação de Carros não configuradas no Hub de Integrações.",
      );
      throw new InfotravelNotConfiguredError();
    }

    const endpoint = `${creds.baseUrl}/api/v1/avail/car`;
    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: "POST",
        headers: creds.authHeader,
        body: JSON.stringify(data),
      });
    } catch (networkErr: any) {
      const msg = `Falha de conexão com InfoTravel Carros: ${networkErr?.message || "Erro de rede"}`;
      await recordInfotravelApiError(identity, "infotravel_default", endpoint, msg);
      throw new Error(msg);
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      const msg = `Erro HTTP ${res.status} na API InfoTravel Carros: ${errText.slice(0, 180) || res.statusText}`;
      await recordInfotravelApiError(identity, "infotravel_default", endpoint, msg, res.status);
      throw new Error(msg);
    }

    const json = await res.json();
    const list = Array.isArray(json?.cars) ? json.cars : [];
    return list.map((item: any, idx: number) => ({
      id: String(item.id || `CAR-${idx + 1}`),
      rentalCompany: String(item.rentalCompany || ""),
      vehicleCategory: String(item.vehicleCategory || ""),
      vehicleModelExample: String(item.vehicleModelExample || ""),
      transmission: item.transmission === "Manual" ? "Manual" : "Automático",
      includesUnlimitedMileage: Boolean(item.includesUnlimitedMileage),
      includesFullProtection: Boolean(item.includesFullProtection),
      pickupLocation: String(item.pickupLocation || data.pickupAirportOrCity),
      dropoffLocation: String(item.dropoffLocation || data.pickupAirportOrCity),
      dailyRateBrl: Number(item.dailyRateBrl || 0),
      totalRateBrl: Number(item.totalRateBrl || 0),
    }));
  });

export interface InfoTravelHistoricalBookingSyncedItem {
  externalBookingCode: string;
  operatorSlug: InfoTravelOperatorSlug;
  clientFullName: string;
  clientDocumentCpf: string;
  clientPhone: string;
  clientEmail: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  totalSaleBrl: number;
  supplierNetBrl: number;
  agencyCommissionBrl: number;
  approvedCreditLimitBrl: number;
  financingStatus: string;
}

export const infotravelImportHistoricalBookingsBatch = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      operatorSlug: z
        .enum([
          "infotravel_default",
          "orinter",
          "frt",
          "incomum",
          "cativa",
          "befly",
          "confianca",
        ])
        .default("orinter"),
      dateFrom: z.string().min(8),
      dateTo: z.string().min(8),
    }),
  )
  .handler(async ({ data }): Promise<{
    operatorSlug: InfoTravelOperatorSlug;
    syncedCount: number;
    bookings: InfoTravelHistoricalBookingSyncedItem[];
  }> => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);

    const creds = await resolveStoreInfotravelCredentials(identity.store_id, data.operatorSlug);
    if (!creds) {
      await recordInfotravelApiError(
        identity,
        data.operatorSlug,
        "/api/v1/booking/search",
        `Tentativa de sincronizar reservas históricas sem chave InfoTravel (${data.operatorSlug.toUpperCase()}) configurada no Hub de Integrações.`,
      );
      throw new InfotravelNotConfiguredError();
    }

    const endpoint = `${creds.baseUrl}${creds.rawPayload.import_booking_path || "/api/v1/booking/search"}`;
    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: "POST",
        headers: creds.authHeader,
        body: JSON.stringify({
          operator: data.operatorSlug,
          dateFrom: data.dateFrom,
          dateTo: data.dateTo,
        }),
      });
    } catch (networkErr: any) {
      const msg = `Falha de conexão com a API da operadora ${data.operatorSlug.toUpperCase()}: ${networkErr?.message || "Erro de rede"}`;
      await recordInfotravelApiError(identity, data.operatorSlug, endpoint, msg);
      throw new Error(msg);
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      const msg = `Erro HTTP ${res.status} ao sincronizar base histórica da operadora ${data.operatorSlug.toUpperCase()}: ${errText.slice(0, 180) || res.statusText}`;
      await recordInfotravelApiError(identity, data.operatorSlug, endpoint, msg, res.status);
      throw new Error(msg);
    }

    const json = await res.json();
    const rawBookings = Array.isArray(json?.bookings) ? json.bookings : [];
    const bookings: InfoTravelHistoricalBookingSyncedItem[] = rawBookings.map((b: any) => ({
      externalBookingCode: String(b.externalBookingCode || b.bookingCode || ""),
      operatorSlug: data.operatorSlug,
      clientFullName: String(b.clientFullName || b.client?.name || ""),
      clientDocumentCpf: String(b.clientDocumentCpf || b.client?.cpf || ""),
      clientPhone: String(b.clientPhone || b.client?.phone || ""),
      clientEmail: String(b.clientEmail || b.client?.email || ""),
      destination: String(b.destination || ""),
      departureDate: String(b.departureDate || ""),
      returnDate: String(b.returnDate || ""),
      totalSaleBrl: Number(b.totalSaleBrl || 0),
      supplierNetBrl: Number(b.supplierNetBrl || 0),
      agencyCommissionBrl: Number(b.agencyCommissionBrl || 0),
      approvedCreditLimitBrl: Number(b.approvedCreditLimitBrl || 0),
      financingStatus: String(b.financingStatus || "Sincronizado via API InfoTravel"),
    }));

    return {
      operatorSlug: data.operatorSlug,
      syncedCount: bookings.length,
      bookings,
    };
  });
