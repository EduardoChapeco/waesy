import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { assertStoreAccess, getServerIdentity } from "@/lib/server-access";
import { type Hotel, type Flight } from "@/services/proposals";
import { mapApiHotelToCanonical, mapApiFlightToCanonical, mapApiBookingToNormalized, type NormalizedBooking, type ApiHotelAvail, type ApiFlightAvail, type ApiBooking } from "@/types/infotravel";

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

  // Resposta do cenário de cotação (ofertas já normalizadas e salvas no banco)
  if (Array.isArray(data?.offers)) {
    return data.offers as Hotel[];
  }

  // Resposta direta da API GDS (sem scenarioId)
  if (data?.hotelAvail) {
    return (data.hotelAvail as ApiHotelAvail[]).map(mapApiHotelToCanonical);
  }

  return data?.hotels || [];
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

  if (Array.isArray(data?.offers)) {
    return data.offers as Flight[];
  }

  if (data?.flightAvail) {
    return (data.flightAvail as ApiFlightAvail[]).map(mapApiFlightToCanonical);
  }

  return data?.flights || [];
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

  if (Array.isArray(data?.offers)) {
    return data.offers;
  }

  return data?.transfers || data?.transferAvail || [];
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

  if (Array.isArray(data?.offers)) {
    return data.offers;
  }

  return data?.activities || data?.tourAvail || [];
}

// ── Importação de Reserva ──────────────────────────────────────────────────
export async function infotravelImportBooking(
  agencyId: string,
  bookingId: string,
): Promise<NormalizedBooking> {
  const data = await invokeConnector("import_booking", agencyId, { bookingId });

  // Se for a reserva crua do GDS real (contém estruturas de hotéis ou voos da API), normalizamos
  if (data && (data.client || data.bookingHotels || data.bookingFlights)) {
    return mapApiBookingToNormalized(data as ApiBooking);
  }

  return data as NormalizedBooking;
}

// ── Criação e Sincronização de Reservas (Trips) ───────────────────────────
export async function infotravelCreateBooking(agencyId: string, tripId: string): Promise<any> {
  return await invokeConnector("create_booking", agencyId, { tripId });
}

export async function infotravelSyncBooking(agencyId: string, tripId: string): Promise<any> {
  return await invokeConnector("run_periodic_sync", agencyId, { tripId });
}

export async function infotravelImportToTrip(
  agencyId: string,
  bookingId: string,
  tripId: string,
): Promise<any> {
  return await importInfotravelBookingToTrip({ data: { bookingId, tripId, agencyId } });
}

/**
 * Importa uma reserva real do provider e aplica os serviços retornados na
 * `tourism_trips` da agência. A mutação é idempotente por tripId: repetir a
 * importação substitui apenas os arrays provenientes do GDS e não duplica a
 * viagem nem cria dados comerciais fictícios.
 */
export const importInfotravelBookingToTrip = createServerFn({ method: "POST" })
  .validator(z.object({
    agencyId: z.string().uuid(),
    bookingId: z.string().min(1),
    tripId: z.string().uuid(),
  }))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    const elevatedRoles = ["owner", "admin", "manager", "master", "platform_admin"];
    if (data.agencyId !== identity.store_id && !elevatedRoles.includes(identity.role)) {
      throw new Error("Acesso negado ao tenant solicitado.");
    }
    const supabase = getServerClient();
    const { data: trip, error: tripError } = await supabase
      .from("tourism_trips")
      .select("id, store_id")
      .eq("id", data.tripId)
      .eq("store_id", data.agencyId)
      .maybeSingle();
    if (tripError || !trip) throw new Error("Viagem não encontrada para a agência autenticada.");

    const providerResult = await invokeConnector<any>("import_booking", data.agencyId, {
      bookingId: data.bookingId,
      tripId: data.tripId,
    });
    const normalized = providerResult?.normalized || providerResult;
    const flights = Array.isArray(normalized?.flights)
      ? normalized.flights
      : Array.isArray(providerResult?.bookingFlights) ? providerResult.bookingFlights : [];
    const hotels = Array.isArray(normalized?.hotels)
      ? normalized.hotels
      : Array.isArray(providerResult?.bookingHotels) ? providerResult.bookingHotels : [];
    const transfers = Array.isArray(normalized?.transfers) ? normalized.transfers : [];
    const tours = Array.isArray(normalized?.activities) ? normalized.activities : [];
    const passengers = Array.isArray(normalized?.passengers) ? normalized.passengers : [];
    const update: Record<string, unknown> = {
      flights,
      hotels,
      transfers,
      tours,
      reservation_state: "reserved_pending_issuance",
      updated_at: new Date().toISOString(),
    };
    if (normalized?.destination) update.destination_city = normalized.destination;
    if (normalized?.travel_start) update.travel_start_date = normalized.travel_start;
    if (normalized?.travel_end) update.travel_end_date = normalized.travel_end;
    if (Number.isFinite(Number(normalized?.total_sale))) update.total_cents = Math.round(Number(normalized.total_sale) * 100);
    if (normalized?.client_name) update.client_name = normalized.client_name;
    if (normalized?.client_email) update.client_email = normalized.client_email;
    if (normalized?.client_phone) update.client_whatsapp = normalized.client_phone;

    const { data: updatedTrip, error: updateError } = await supabase
      .from("tourism_trips")
      .update(update)
      .eq("id", data.tripId)
      .eq("store_id", data.agencyId)
      .select()
      .single();
    if (updateError || !updatedTrip) throw new Error("Reserva importada, mas não foi possível atualizar a viagem: " + (updateError?.message || "erro desconhecido"));

    return { success: true, trip: updatedTrip, passengersImported: passengers.length, providerResult };
  });

export const syncInfotravelTrip = createServerFn({ method: "POST" })
  .validator(z.object({ agencyId: z.string().uuid(), tripId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    const elevatedRoles = ["owner", "admin", "manager", "master", "platform_admin"];
    if (data.agencyId !== identity.store_id && !elevatedRoles.includes(identity.role)) throw new Error("Acesso negado ao tenant solicitado.");
    const providerResult = await invokeConnector<any>("run_periodic_sync", data.agencyId, { tripId: data.tripId });
    return { success: true, providerResult };
  });

// ── Teste de Conexão ───────────────────────────────────────────────────────
export async function infotravelTestConnection(agencyId: string): Promise<boolean> {
  try {
    const data = await invokeConnector("test_connection", agencyId);
    return data?.success === true;
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
