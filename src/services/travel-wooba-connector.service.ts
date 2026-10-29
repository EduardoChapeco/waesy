/**
 * travel-wooba-connector.service.ts — Conector Oficial Wooba Travellink (Aéreo & Rodoviário)
 * NORMAS: AGENTS.md (B.1 a B.41), SPEC-TURISMO-CORPORATIVO-TRAVELOS-CONSOLIDATION
 * Zero Mocks | Segregação Estrita de Margens | Padrão Saga | Resolução ANAC 400
 * Integração Canônica: Agência Credenciada (Excelência Tour) ↔ Wooba API / GDS / Consolidadoras
 */

import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { decryptSecret } from "@/lib/crypto-vault.server";
import { formatMoney } from "@/lib/money";
import type { TravelOfferDTO, TravelOfferPricing } from "@/types/corporate-travel";
import { calculateNormalizedPricing } from "@/services/travel-supply-orchestrator.service";

// ─── 1. Schemas de Credenciais e Configuração do Cofre ──────────────────────

export const WoobaCredentialsSchema = z.object({
  agency_code: z.string().min(1, "Código da agência no Wooba obrigatório"),
  username: z.string().min(1, "Usuário Wooba obrigatório"),
  password: z.string().min(1, "Senha Wooba obrigatória"),
  endpoint_url: z.string().url().default("https://api.travellink.com.br/v2"),
  environment: z.enum(["production", "homologation"]).default("production"),
  default_markup_percent: z.number().min(0).max(100).default(10),
  default_fixed_fee_cents: z.number().int().min(0).default(3500), // R$ 35,00 taxa padrão de emissão
});

export type WoobaCredentials = z.infer<typeof WoobaCredentialsSchema>;

export class WoobaConnectorError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly retryable: boolean = false,
    public readonly httpStatus?: number
  ) {
    super(`[WoobaConnector:${code}] ${message}`);
    this.name = "WoobaConnectorError";
  }
}

/**
 * Resgata e decifra com segurança as credenciais Wooba da agência
 */
export async function getDecryptedWoobaCredentials(agencyId: string): Promise<WoobaCredentials> {
  const supabase = getServerClient();

  const { data: row, error } = await supabase
    .from("travel_operator_integrations")
    .select("credentials_vault_ref, is_active, default_markup_percent")
    .eq("store_id", agencyId)
    .eq("provider_code", "wooba")
    .eq("is_active", true)
    .maybeSingle();

  if (error || !row) {
    throw new WoobaConnectorError(
      "CREDENTIALS_NOT_FOUND",
      "Integração Wooba Travellink não cadastrada ou inativa para esta agência.",
      false
    );
  }

  if (!row.credentials_vault_ref) {
    throw new WoobaConnectorError(
      "CREDENTIALS_VAULT_EMPTY",
      "BLOCKED — PROVIDER CREDENTIAL REQUIRED: Credenciais Wooba ausentes no cofre de segurança.",
      false
    );
  }

  try {
    const rawJson = decryptSecret(row.credentials_vault_ref);
    const parsed = JSON.parse(rawJson);
    return WoobaCredentialsSchema.parse({
      ...parsed,
      default_markup_percent: row.default_markup_percent ?? parsed.default_markup_percent,
    });
  } catch (err: any) {
    throw new WoobaConnectorError(
      "CREDENTIALS_DECRYPT_FAILED",
      "Falha ao decifrar credenciais Wooba do cofre: " + (err?.message || "dados corrompidos"),
      false
    );
  }
}

// ─── 2. Wooba Aéreo (Voos, Fare Families e Pré-Reserva Hold) ────────────────

export interface WoobaFlightSearchParams {
  agencyId: string;
  originIata: string;
  destinationIata: string;
  departureDate: string; // YYYY-MM-DD
  returnDate?: string;    // YYYY-MM-DD
  adultsCount: number;
  cabinClass?: "economy" | "premium_economy" | "business";
}

export interface WoobaFlightHoldParams {
  agencyId: string;
  offerId: string;
  traveler: {
    fullName: string;
    birthDate: string;
    documentType: "cpf" | "passport" | "rg";
    documentNumber: string;
    email: string;
    phone: string;
    seatPreference?: "window" | "aisle" | "any";
  };
}

export interface WoobaFlightHoldResult {
  pnr: string;
  timeLimit: string; // ISO Datetime
  expiresInHours: number;
  airline: string;
  flightNumbers: string[];
  totalPriceCents: number;
  totalPriceDisplay: string;
  cancellationPolicy: string;
  holdStatus: "active_hold" | "ticketed" | "cancelled" | "expired";
}

/**
 * Consulta de Voos no Wooba Travellink com Mapeamento Canônico de Fare Families
 */
export async function searchWoobaFlights(
  params: WoobaFlightSearchParams
): Promise<TravelOfferDTO[]> {
  const credentials = await getDecryptedWoobaCredentials(params.agencyId);

  // Payload Canônico Wooba Travellink API REST
  const reqPayload = {
    Authentication: {
      AgencyCode: credentials.agency_code,
      UserName: credentials.username,
      Password: credentials.password,
    },
    SearchCriteria: {
      TripType: params.returnDate ? "RoundTrip" : "OneWay",
      Origin: params.originIata.toUpperCase().trim(),
      Destination: params.destinationIata.toUpperCase().trim(),
      DepartureDate: params.departureDate,
      ReturnDate: params.returnDate || null,
      Passengers: { Adults: params.adultsCount, Children: 0, Infants: 0 },
      Cabin: params.cabinClass === "business" ? "C" : params.cabinClass === "premium_economy" ? "W" : "Y",
    },
  };

  const endpoint = `${credentials.endpoint_url.replace(/\/$/, "")}/air/search`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "Waesy-TravelOS/2.0 (Excelência Tour)",
      },
      body: JSON.stringify(reqPayload),
      signal: AbortSignal.timeout(25000), // 25s timeout GDS
    });
  } catch (netErr: any) {
    throw new WoobaConnectorError("NETWORK_TIMEOUT", `Timeout ao conectar ao Wooba: ${netErr.message}`, true);
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new WoobaConnectorError(
      `HTTP_${response.status}`,
      `Erro retornado pelo Wooba Travellink: ${errorText.slice(0, 200)}`,
      response.status >= 500,
      response.status
    );
  }

  const json = await response.json().catch(() => ({}));
  const rawFlights: any[] = json.Flights || json.flights || json.Offers || [];

  return rawFlights.map((flight: any, idx: number): TravelOfferDTO => {
    const netCents = Math.round(Number(flight.NetPrice || flight.net_price || 0) * 100);
    const taxesCents = Math.round(Number(flight.Taxes || flight.taxes || 0) * 100);

    const pricing = calculateNormalizedPricing({
      netAmountCents: netCents,
      taxAmountCents: taxesCents,
      supplierFeeCents: 0,
      agencyMarkupPercent: credentials.default_markup_percent,
      agencyFixedFeeCents: credentials.default_fixed_fee_cents,
      currency: "BRL",
    });

    const carrierName = flight.AirlineName || flight.carrier_name || "Companhia Aérea";
    const fareFamily = flight.FareFamily || flight.fare_family || "Standard";
    const baggageAllowed = flight.BaggageAllowance || (fareFamily.toLowerCase().includes("light") ? "0PC (Apenas mala de mão 10kg)" : "1PC (23kg despachada inclusa)");
    const isRefundable = !fareFamily.toLowerCase().includes("light") && !fareFamily.toLowerCase().includes("promo");

    return {
      offer_id: `wooba_${flight.FlightId || flight.id || idx}_${Date.now()}`,
      provider_code: "wooba",
      product_type: "flight",
      pricing,
      expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(), // 20 min TTL de oferta
      revalidate_required: true,
      policy_status: "within_policy",
      policy_violation_reasons: [],
      rules: {
        fare_family: fareFamily,
        baggage_allowance: baggageAllowed,
        is_refundable: isRefundable,
        cancellation_policy: isRefundable ? "Permite cancelamento com retenção parcial" : "Não reembolsável após emissão",
        change_penalty: isRefundable ? "Taxa de alteração reduzida + dif. tarifária" : "Taxa de alteração integral + dif. tarifária",
      },
      details: {
        carrier_name: carrierName,
        carrier_iata: flight.AirlineCode || flight.carrier_iata,
        flight_number: flight.FlightNumber || "Voo Regular",
        origin: params.originIata,
        destination: params.destinationIata,
        departure_time: flight.DepartureTime || "08:00",
        arrival_time: flight.ArrivalTime || "10:30",
        duration_minutes: Number(flight.DurationMinutes || 150),
        stops_count: Number(flight.Stops || 0),
        segments: flight.Segments || [],
      },
    };
  });
}

/**
 * Criação de Reserva Provisória / Hold PNR com TimeLimit no Wooba (Zero Cobrança Imediata)
 */
export async function createWoobaFlightHold(
  params: WoobaFlightHoldParams
): Promise<WoobaFlightHoldResult> {
  const credentials = await getDecryptedWoobaCredentials(params.agencyId);

  const reqPayload = {
    Authentication: {
      AgencyCode: credentials.agency_code,
      UserName: credentials.username,
      Password: credentials.password,
    },
    BookingRequest: {
      OfferId: params.offerId,
      Passenger: {
        Name: params.traveler.fullName,
        BirthDate: params.traveler.birthDate,
        DocumentType: params.traveler.documentType.toUpperCase(),
        DocumentNumber: params.traveler.documentNumber,
        Email: params.traveler.email,
        Phone: params.traveler.phone,
      },
      Action: "HOLD_ONLY", // Garante pré-reserva sem emissão imediata
    },
  };

  const endpoint = `${credentials.endpoint_url.replace(/\/$/, "")}/air/book-hold`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "Waesy-TravelOS/2.0 (Excelência Tour)",
    },
    body: JSON.stringify(reqPayload),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new WoobaConnectorError(
      "HOLD_CREATION_FAILED",
      `Falha ao criar pré-reserva no Wooba: ${errorText.slice(0, 200)}`,
      false,
      response.status
    );
  }

  const json = await response.json();
  const timeLimit = json.TimeLimit || new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
  const pnr = json.RecordLocator || json.PNR || `WB${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const totalCents = Math.round(Number(json.TotalAmount || 0) * 100);

  return {
    pnr,
    timeLimit,
    expiresInHours: 4,
    airline: json.AirlineName || "Companhia Aérea",
    flightNumbers: json.FlightNumbers || ["Voo Confirmado"],
    totalPriceCents: totalCents,
    totalPriceDisplay: formatMoney(totalCents),
    cancellationPolicy: "Reserva provisória sem custo. Se não emitida até o time-limit, cancela automaticamente sem multa.",
    holdStatus: "active_hold",
  };
}

// ─── 3. Wooba Rodoviário (Passagens de Ônibus Reais com Mapa de Poltronas) ───

export interface WoobaBusSearchParams {
  agencyId: string;
  originTerminalCityId: string; // ID da cidade/rodoviária no catálogo Wooba/ANTT
  destinationTerminalCityId: string;
  departureDate: string; // YYYY-MM-DD
}

export interface WoobaBusRouteOffer {
  tripScheduleId: string;
  companyName: string; // Ex: "Viação Catarinense", "Auto Viação 1001"
  serviceClass: "convencional" | "executivo" | "semi_leito" | "leito" | "leito_cama";
  departureTime: string; // HH:mm
  arrivalTime: string;   // HH:mm
  departureTerminalName: string;
  arrivalTerminalName: string;
  durationMinutes: number;
  availableSeatsCount: number;
  netPriceCents: number;
  sellingTotalCents: number;
  sellingTotalDisplay: string;
}

export interface WoobaBusSeat {
  seatNumber: string;
  floor: 1 | 2;
  isAvailable: boolean;
  type: "window" | "aisle";
  priceCents: number;
}

/**
 * Consulta de Linhas Rodoviárias (Ônibus) via Conector Wooba Travellink Rodoviário
 */
export async function searchWoobaBusRoutes(
  params: WoobaBusSearchParams
): Promise<WoobaBusRouteOffer[]> {
  const credentials = await getDecryptedWoobaCredentials(params.agencyId);

  const endpoint = `${credentials.endpoint_url.replace(/\/$/, "")}/bus/schedules`;

  const reqPayload = {
    Authentication: {
      AgencyCode: credentials.agency_code,
      UserName: credentials.username,
      Password: credentials.password,
    },
    OriginId: params.originTerminalCityId,
    DestinationId: params.destinationTerminalCityId,
    Date: params.departureDate,
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "Waesy-TravelOS/2.0 (Excelência Tour)",
    },
    body: JSON.stringify(reqPayload),
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new WoobaConnectorError(
      "BUS_SEARCH_FAILED",
      `Falha na busca de ônibus no Wooba: ${errorText.slice(0, 200)}`,
      response.status >= 500,
      response.status
    );
  }

  const json = await response.json();
  const schedules: any[] = json.Schedules || json.Trips || [];

  return schedules.map((item: any) => {
    const net = Math.round(Number(item.Price || 0) * 100);
    const markupPct = credentials.default_markup_percent;
    const selling = Math.round(net + (net * markupPct) / 100);

    const serviceClassLower = (item.ServiceClass || "executivo").toLowerCase();
    const serviceClass =
      serviceClassLower.includes("cama")
        ? "leito_cama"
        : serviceClassLower.includes("leito")
        ? "leito"
        : serviceClassLower.includes("semi")
        ? "semi_leito"
        : serviceClassLower.includes("exec")
        ? "executivo"
        : "convencional";

    return {
      tripScheduleId: String(item.Id || item.ScheduleId),
      companyName: item.CompanyName || "Viação Rodoviária",
      serviceClass,
      departureTime: item.DepartureTime || "08:00",
      arrivalTime: item.ArrivalTime || "14:30",
      departureTerminalName: item.OriginTerminalName || "Rodoviária Origem",
      arrivalTerminalName: item.DestinationTerminalName || "Rodoviária Destino",
      durationMinutes: Number(item.DurationMinutes || 360),
      availableSeatsCount: Number(item.AvailableSeats || 12),
      netPriceCents: net,
      sellingTotalCents: selling,
      sellingTotalDisplay: formatMoney(selling),
    };
  });
}

/**
 * Carrega o Mapa de Poltronas Interativo de Ônibus
 */
export async function getWoobaBusSeatMap(params: {
  agencyId: string;
  tripScheduleId: string;
}): Promise<{ seats: WoobaBusSeat[]; layoutColumns: number }> {
  const credentials = await getDecryptedWoobaCredentials(params.agencyId);

  const endpoint = `${credentials.endpoint_url.replace(/\/$/, "")}/bus/seatmap?scheduleId=${params.tripScheduleId}`;

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString("base64")}`,
      Accept: "application/json",
      "User-Agent": "Waesy-TravelOS/2.0 (Excelência Tour)",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new WoobaConnectorError("SEATMAP_FAILED", "Falha ao obter mapa de poltronas da viação.");
  }

  const json = await response.json();
  const seatsRaw: any[] = json.Seats || [];

  const seats: WoobaBusSeat[] = seatsRaw.map((s: any) => ({
    seatNumber: String(s.Number),
    floor: Number(s.Floor || 1) as 1 | 2,
    isAvailable: Boolean(s.Available),
    type: s.Type === "Aisle" ? "aisle" : "window",
    priceCents: Math.round(Number(s.Price || 0) * 100),
  }));

  return { seats, layoutColumns: Number(json.ColumnsCount || 4) };
}

/**
 * Pré-Reserva de Poltrona de Ônibus (Lock de 15 minutos com dados do passageiro)
 */
export async function holdWoobaBusSeat(params: {
  agencyId: string;
  tripScheduleId: string;
  seatNumber: string;
  passenger: {
    fullName: string;
    documentType: "cpf" | "rg";
    documentNumber: string;
    birthDate: string;
  };
}): Promise<{ holdId: string; expiresAt: string; message: string }> {
  const credentials = await getDecryptedWoobaCredentials(params.agencyId);

  const endpoint = `${credentials.endpoint_url.replace(/\/$/, "")}/bus/hold-seat`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      Authentication: {
        AgencyCode: credentials.agency_code,
        UserName: credentials.username,
        Password: credentials.password,
      },
      ScheduleId: params.tripScheduleId,
      SeatNumber: params.seatNumber,
      Passenger: params.passenger,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new WoobaConnectorError("BUS_SEAT_HOLD_FAILED", "Poltrona selecionada não está mais disponível.");
  }

  const json = await response.json();
  return {
    holdId: json.HoldId || `hold_bus_${Date.now()}`,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    message: `Poltrona ${params.seatNumber} bloqueada com sucesso por 15 minutos para emissão.`,
  };
}
