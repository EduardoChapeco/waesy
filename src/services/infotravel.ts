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
