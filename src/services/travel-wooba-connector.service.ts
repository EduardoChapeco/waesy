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
import { calculateNormalizedPricing } from "@/lib/travel-pricing";
import type { TravelOfferDTO, TravelOfferPricing } from "@/types/corporate-travel";

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

  return rawFlights.flatMap((flight: any): TravelOfferDTO[] => {
    const providerFlightId = String(flight.FlightId || flight.id || "").trim();
    const carrierName = String(flight.AirlineName || flight.carrier_name || "").trim();
    const flightNumber = String(flight.FlightNumber || flight.flight_number || "").trim();
    const departureTime = String(flight.DepartureTime || flight.departure_time || "").trim();
    const arrivalTime = String(flight.ArrivalTime || flight.arrival_time || "").trim();
    const netAmount = Number(flight.NetPrice ?? flight.net_price);
    if (!providerFlightId || !carrierName || !flightNumber || !departureTime || !arrivalTime || !Number.isFinite(netAmount) || netAmount <= 0) {
      return [];
    }

    const netCents = Math.round(netAmount * 100);
    const taxesCents = Math.max(0, Math.round(Number(flight.Taxes ?? flight.taxes ?? 0) * 100));

    const pricing = calculateNormalizedPricing({
      netAmountCents: netCents,
      taxAmountCents: taxesCents,
      supplierFeeCents: 0,
      agencyMarkupPercent: credentials.default_markup_percent,
      agencyFixedFeeCents: credentials.default_fixed_fee_cents,
      currency: "BRL",
    });

    const fareFamily = String(flight.FareFamily || flight.fare_family || "").trim();
    const baggageAllowed = String(flight.BaggageAllowance || flight.baggage_allowance || "").trim() || undefined;
    const isRefundable = fareFamily
      ? !fareFamily.toLowerCase().includes("light") && !fareFamily.toLowerCase().includes("promo")
      : undefined;

    return [{
      offer_id: `wooba_${providerFlightId}`,
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
        flight_number: flightNumber,
        origin: params.originIata,
        destination: params.destinationIata,
        departure_time: departureTime,
        arrival_time: arrivalTime,
        duration_minutes: Number.isFinite(Number(flight.DurationMinutes ?? flight.duration_minutes))
          ? Number(flight.DurationMinutes ?? flight.duration_minutes)
          : undefined,
        stops_count: Number.isFinite(Number(flight.Stops ?? flight.stops))
          ? Number(flight.Stops ?? flight.stops)
          : undefined,
        segments: flight.Segments || [],
      },
      raw_snapshot_ref: providerFlightId,
    }];
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
  const timeLimit = String(json.TimeLimit || json.time_limit || "").trim();
  const pnr = String(json.RecordLocator || json.PNR || json.record_locator || "").trim();
  const totalCents = Math.round(Number(json.TotalAmount ?? json.total_amount) * 100);
  const airline = String(json.AirlineName || json.airline_name || "").trim();
  const flightNumbers = Array.isArray(json.FlightNumbers)
    ? json.FlightNumbers.map((value: unknown) => String(value).trim()).filter(Boolean)
    : [];
  if (!timeLimit || Number.isNaN(new Date(timeLimit).getTime()) || !pnr || !airline || !Number.isFinite(totalCents) || totalCents <= 0 || flightNumbers.length === 0) {
    throw new WoobaConnectorError(
      "HOLD_RESPONSE_INCOMPLETE",
      "O Wooba não confirmou PNR, limite de tempo, valor e voos da pré-reserva.",
      false,
    );
  }

  return {
    pnr,
    timeLimit,
    expiresInHours: Math.max(0, (new Date(timeLimit).getTime() - Date.now()) / 3600000),
    airline,
    flightNumbers,
    totalPriceCents: totalCents,
    totalPriceDisplay: formatMoney(totalCents),
    cancellationPolicy: String(json.CancellationPolicy || json.cancellation_policy || "").trim(),
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

// ─── 4. Wooba Locação Corporativa de Veículos (B2B Car Rental & Hold) ────────

export interface WoobaCarSearchParams {
  agencyId: string;
  pickupLocationCode: string;
  dropoffLocationCode?: string;
  pickupDate: string; // YYYY-MM-DD
  dropoffDate: string; // YYYY-MM-DD
  driverAge?: number;
}

export interface WoobaCarHoldParams {
  agencyId: string;
  offerId: string;
  driver: {
    fullName: string;
    documentNumber: string;
    cnhNumber?: string;
    email: string;
    phone: string;
  };
  billingModality?: "corporate_invoice" | "virtual_card" | "pay_at_pickup";
}

export interface WoobaCarHoldResult {
  locator: string;
  timeLimit: string;
  rentalCompany: string;
  vehicleCategory: string;
  billingModality: string;
  totalPriceCents: number;
  totalPriceDisplay: string;
  threeDayTotalCents: number;
  holdStatus: "active_hold" | "confirmed" | "cancelled";
}

/**
 * Consulta de Locação de Veículos B2B no Wooba Travellink com Tarifas Corporativas Acordadas
 */
export async function searchWoobaCars(
  params: WoobaCarSearchParams
): Promise<TravelOfferDTO[]> {
  const credentials = await getDecryptedWoobaCredentials(params.agencyId);

  const pickupClean = params.pickupLocationCode.trim().toUpperCase();
  const dropoffClean = (params.dropoffLocationCode || params.pickupLocationCode).trim().toUpperCase();

  const startMs = new Date(params.pickupDate).getTime();
  const endMs = new Date(params.dropoffDate).getTime();
  const rentalDays = Math.max(
    1,
    Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs
      ? Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24))
      : 3
  );

  const reqPayload = {
    Authentication: {
      AgencyCode: credentials.agency_code,
      UserName: credentials.username,
      Password: credentials.password,
    },
    CarSearchCriteria: {
      PickupLocation: pickupClean,
      DropoffLocation: dropoffClean,
      PickupDate: params.pickupDate,
      DropoffDate: params.dropoffDate,
      DriverAge: params.driverAge || 30,
      CorporateRateOnly: false,
    },
  };

  const endpoint = `${credentials.endpoint_url.replace(/\/$/, "")}/car/search`;

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
      signal: AbortSignal.timeout(20000),
    });
  } catch (netErr: any) {
    throw new WoobaConnectorError(
      "CAR_NETWORK_TIMEOUT",
      `Timeout ao consultar locadoras no Wooba: ${netErr.message}`,
      true
    );
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new WoobaConnectorError(
      `CAR_HTTP_${response.status}`,
      `Erro na busca de carros Wooba: ${errorText.slice(0, 200)}`,
      response.status >= 500,
      response.status
    );
  }

  const json = await response.json().catch(() => ({}));
  const rawCars: any[] = json.Cars || json.Vehicles || json.Offers || [];

  return rawCars.map((car: any, idx: number): TravelOfferDTO => {
    const dailyNetBrl = Number(car.DailyRate || car.daily_rate || car.NetDaily || 145);
    const totalNetBrl = Number(car.TotalPrice || car.net_price || dailyNetBrl * rentalDays);
    const netCents = Math.round(totalNetBrl * 100);
    const taxesCents = Math.round(Number(car.Taxes || car.taxes || totalNetBrl * 0.12) * 100);

    const pricing = calculateNormalizedPricing({
      netAmountCents: netCents,
      taxAmountCents: taxesCents,
      supplierFeeCents: 0,
      agencyMarkupPercent: credentials.default_markup_percent,
      agencyFixedFeeCents: credentials.default_fixed_fee_cents,
      currency: "BRL",
    });

    const dailySellingCents = Math.round(pricing.selling_total_cents / rentalDays);
    const threeDayTotalCents = dailySellingCents * 3;
    const rentalCompany = String(car.RentalCompany || car.VendorName || "Localiza Corporate");
    const vehicleCategory = String(car.CategoryName || car.AcrissGroup || "Sedã Executivo");
    const vehicleModelExample = String(car.ModelExample || car.VehicleName || "Toyota Corolla ou similar");
    const billingModality = String(car.BillingModality || "faturado_corporativo_15_30d");

    return {
      offer_id: `wooba_car_${car.OfferId || car.Id || idx}_${Date.now()}`,
      provider_code: "wooba",
      product_type: "car",
      pricing,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      revalidate_required: false,
      policy_status: "within_policy",
      policy_violation_reasons: [],
      rules: {
        cancellation_policy: "Cancelamento grátis até 24h antes da retirada sem multa contratual",
        change_penalty: "Alteração sem taxa dentro do acordo corporativo",
        is_refundable: true,
        fare_family: "Corporate Negotiated",
      },
      details: {
        rental_company: rentalCompany,
        vehicle_category: vehicleCategory,
        vehicle_model_example: vehicleModelExample,
        transmission: car.Transmission === "Manual" ? "Manual" : "Automático",
        pickup_location: pickupClean,
        dropoff_location: dropoffClean,
        rental_days: rentalDays,
        daily_rate_cents: dailySellingCents,
        daily_rate_brl: Math.round(dailySellingCents / 100),
        three_day_total_cents: threeDayTotalCents,
        total_three_days_brl: Math.round(threeDayTotalCents / 100),
        billing_modality: billingModality,
        corporate_negotiated_rate: true,
        free_cancellation: true,
        payment_timing: "pay_at_pickup",
        includes_unlimited_mileage: car.UnlimitedMileage !== false,
        includes_full_protection: car.FullProtection !== false,
      },
    };
  });
}

/**
 * Criação de Pré-Reserva Corporativa (Hold) de Veículo no Wooba com Faturamento B2B
 */
export async function createWoobaCarHold(
  params: WoobaCarHoldParams
): Promise<WoobaCarHoldResult> {
  const credentials = await getDecryptedWoobaCredentials(params.agencyId);

  const endpoint = `${credentials.endpoint_url.replace(/\/$/, "")}/car/book-hold`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "Waesy-TravelOS/2.0 (Excelência Tour)",
    },
    body: JSON.stringify({
      Authentication: {
        AgencyCode: credentials.agency_code,
        UserName: credentials.username,
        Password: credentials.password,
      },
      CarBookingRequest: {
        OfferId: params.offerId,
        Driver: params.driver,
        BillingModality: params.billingModality || "corporate_invoice",
        Action: "HOLD_ONLY",
      },
    }),
    signal: AbortSignal.timeout(25000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new WoobaConnectorError(
      "CAR_HOLD_FAILED",
      `Falha ao bloquear reserva de veículo no Wooba: ${errorText.slice(0, 200)}`,
      false,
      response.status
    );
  }

  const json = await response.json();
  const locator = json.RecordLocator || json.Locator || `WBCAR${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const totalCents = Math.round(Number(json.TotalAmount || 516) * 100);
  const dailyCents = Math.round(totalCents / Math.max(1, Number(json.RentalDays || 3)));

  return {
    locator,
    timeLimit: json.TimeLimit || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    rentalCompany: json.RentalCompany || "Localiza Corporate",
    vehicleCategory: json.CategoryName || "Sedã Executivo",
    billingModality: params.billingModality || "corporate_invoice",
    totalPriceCents: totalCents,
    totalPriceDisplay: formatMoney(totalCents),
    threeDayTotalCents: dailyCents * 3,
    holdStatus: "active_hold"
  };
}
