/**
 * cancellation-penalty-calculator.ts — Motor Determinístico de Cálculo de Multas Pós-Emissão
 * Governança Canônica:
 * 1. Comissão de Assessoria da Agência (30%): Serviço integralmente cumprido com a emissão do pacote.
 * 2. Regra das 24h ANAC (Aéreo): Isenção de multa da Cia Aérea se cancelado em até 24h da emissão com antecedência >= 7 dias.
 * 3. Taxa Administrativa da Operadora: 14% a 17% (padrão 15%) sobre o valor de serviços terrestres.
 * 4. Sentinela de Deadlines de Hospedagem: Estorno integral de hotel se cancelado antes do prazo limite gratuito.
 * 5. Transfers & Receptivo: Penalidade regressiva conforme antecedência (limiar de 48 horas).
 */

import { z } from "zod";

export const CancellationRequestSchema = z.object({
  totalPackageCents: z.number().int().positive("Valor total deve ser positivo em centavos"),
  issuedAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/)),
  requestedAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/)),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  // Componentes do pacote
  flights: z
    .object({
      baseFareCents: z.number().int().nonnegative().default(0),
      boardingTaxesCents: z.number().int().nonnegative().default(0),
      isRefundableFare: z.boolean().default(false),
      airlineCancellationPenaltyCents: z.number().int().nonnegative().default(0),
    })
    .optional(),
  hotel: z
    .object({
      totalHotelCents: z.number().int().nonnegative().default(0),
      freeCancellationUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/).optional().nullable(),
      penaltyIfAfterDeadlineCents: z.number().int().nonnegative().default(0),
      isNonRefundableRate: z.boolean().default(false),
    })
    .optional(),
  transfers: z
    .object({
      totalTransferCents: z.number().int().nonnegative().default(0),
    })
    .optional(),
  // Taxas e parâmetros contratuais
  agencyServiceFeePct: z.number().min(0).max(100).default(30), // Padrão: 30% retidos por serviço prestado
  operatorRefundFeePct: z.number().min(0).max(100).default(15), // Padrão: 15% taxa de estorno da operadora
  reason: z.enum(["voluntary_passenger_request", "medical_emergency", "airline_cancellation", "agency_reaccommodation"]).default("voluntary_passenger_request"),
});

export type CancellationRequestInput = z.input<typeof CancellationRequestSchema>;
export type CancellationRequestParsed = z.infer<typeof CancellationRequestSchema>;

export interface CancellationPenaltyCalculationResult {
  totalPackageCents: number;
  agencyRetainedServiceCents: number;
  agencyRetainedReason: string;
  operatorAdministrativeFeeCents: number;
  flightPenaltyCents: number;
  flightBoardingTaxesRefundedCents: number;
  isAnac24hFlightExemptionApplied: boolean;
  hotelPenaltyCents: number;
  isHotelFreeCancellationActive: boolean;
  hotelDeadlineDate: string | null;
  transferPenaltyCents: number;
  totalPenaltiesAndRetentionsCents: number;
  refundableToCustomerCents: number;
  calculatedAt: string;
}

export function calculateTripCancellationPenalties(
  input: CancellationRequestInput
): CancellationPenaltyCalculationResult {
  const data = CancellationRequestSchema.parse(input);

  const issuedDate = new Date(data.issuedAt);
  const requestedDate = new Date(data.requestedAt);
  const departureDate = new Date(`${data.departureDate}T00:00:00Z`);

  const hoursSinceIssuance = (requestedDate.getTime() - issuedDate.getTime()) / (1000 * 60 * 60);
  const daysUntilDeparture = (departureDate.getTime() - requestedDate.getTime()) / (1000 * 60 * 60 * 24);

  // 1. Comissão de Assessoria da Agência (Regra: 30% retidos como serviço efetivamente prestado na emissão)
  const agencyRetainedServiceCents = Math.round(
    (data.totalPackageCents * data.agencyServiceFeePct) / 100
  );
  const agencyRetainedReason =
    "Honorários de assessoria turística e intermediação integralmente cumpridos na emissão da viagem (CDC / Não reembolsável).";

  // 2. Análise de Voo e Regra das 24h da ANAC
  let flightPenaltyCents = 0;
  let flightBoardingTaxesRefundedCents = 0;
  let isAnac24hFlightExemptionApplied = false;

  if (data.flights && data.flights.baseFareCents > 0) {
    // Regra ANAC: Cancelamento até 24h da compra com pelo menos 7 dias de antecedência do voo
    if (hoursSinceIssuance <= 24 && daysUntilDeparture >= 7) {
      isAnac24hFlightExemptionApplied = true;
      flightPenaltyCents = 0;
      flightBoardingTaxesRefundedCents = data.flights.boardingTaxesCents;
    } else if (data.flights.isRefundableFare) {
      flightPenaltyCents = data.flights.airlineCancellationPenaltyCents;
      flightBoardingTaxesRefundedCents = data.flights.boardingTaxesCents;
    } else {
      // Tarifa promocional / não reembolsável: perde a tarifa base, mas recupera 100% das taxas de embarque
      flightPenaltyCents = data.flights.baseFareCents;
      flightBoardingTaxesRefundedCents = data.flights.boardingTaxesCents;
    }
  }

  // 3. Análise de Hospedagem e Sentinela de Prazos (Hotel Deadlines)
  let hotelPenaltyCents = 0;
  let isHotelFreeCancellationActive = false;
  let hotelDeadlineDate: string | null = null;

  if (data.hotel && data.hotel.totalHotelCents > 0) {
    if (data.hotel.isNonRefundableRate) {
      hotelPenaltyCents = data.hotel.totalHotelCents;
      isHotelFreeCancellationActive = false;
    } else if (data.hotel.freeCancellationUntil) {
      hotelDeadlineDate = data.hotel.freeCancellationUntil;
      const deadline = new Date(data.hotel.freeCancellationUntil);
      if (requestedDate.getTime() <= deadline.getTime()) {
        // Cancelou antes do prazo do hotel: R$ 0,00 de multa de hotel!
        isHotelFreeCancellationActive = true;
        hotelPenaltyCents = 0;
      } else {
        // Cancelou após o prazo: aplica a penalidade configurada ou o total
        isHotelFreeCancellationActive = false;
        hotelPenaltyCents = data.hotel.penaltyIfAfterDeadlineCents || data.hotel.totalHotelCents;
      }
    } else {
      // Sem deadline explícito: penalidade se cancelado com menos de 7 dias
      if (daysUntilDeparture < 7) {
        hotelPenaltyCents = data.hotel.penaltyIfAfterDeadlineCents || data.hotel.totalHotelCents;
      } else {
        isHotelFreeCancellationActive = true;
        hotelPenaltyCents = 0;
      }
    }
  }

  // 4. Análise de Transfers e Terrestres
  let transferPenaltyCents = 0;
  if (data.transfers && data.transfers.totalTransferCents > 0) {
    if (daysUntilDeparture < 2) {
      // Menos de 48h do embarque: retenção de 100% do transfer
      transferPenaltyCents = data.transfers.totalTransferCents;
    } else if (daysUntilDeparture < 7) {
      // Entre 2 e 7 dias: 50% de retenção
      transferPenaltyCents = Math.round(data.transfers.totalTransferCents * 0.5);
    } else {
      transferPenaltyCents = 0;
    }
  }

  // 5. Taxa de Reembolso Administrativo da Operadora (B2B)
  // Aplica sobre a porção terrestre que tiver direito a reembolso
  const eligibleLandServicesCents =
    (data.hotel ? Math.max(0, data.hotel.totalHotelCents - hotelPenaltyCents) : 0) +
    (data.transfers ? Math.max(0, data.transfers.totalTransferCents - transferPenaltyCents) : 0);

  const operatorAdministrativeFeeCents = Math.round(
    (eligibleLandServicesCents * data.operatorRefundFeePct) / 100
  );

  // 6. Consolidação Financeira
  const totalPenaltiesAndRetentionsCents =
    agencyRetainedServiceCents +
    flightPenaltyCents +
    hotelPenaltyCents +
    transferPenaltyCents +
    operatorAdministrativeFeeCents;

  const refundableToCustomerCents = Math.max(
    0,
    data.totalPackageCents - totalPenaltiesAndRetentionsCents
  );

  return {
    totalPackageCents: data.totalPackageCents,
    agencyRetainedServiceCents,
    agencyRetainedReason,
    operatorAdministrativeFeeCents,
    flightPenaltyCents,
    flightBoardingTaxesRefundedCents,
    isAnac24hFlightExemptionApplied,
    hotelPenaltyCents,
    isHotelFreeCancellationActive,
    hotelDeadlineDate,
    transferPenaltyCents,
    totalPenaltiesAndRetentionsCents,
    refundableToCustomerCents,
    calculatedAt: new Date().toISOString(),
  };
}

export interface CancellationPenaltyInput {
  totalTripCents: number;
  airfareCents: number;
  hotelCents: number;
  transferCents: number;
  bookingDate: string;
  cancellationDate: string;
  departureDate: string;
  operatorRatePct: number;
  hotelFreeCancellationUntil: string;
  airfareRefundable: boolean;
  hotelRefundable: boolean;
  hasTransfer: boolean;
}

export interface CancellationPenaltyResult {
  totalPenaltyCents: number;
  netRefundCents: number;
  breakdown: {
    agencyFeeCents: number;
    airlinePenaltyCents: number;
    anacRuleApplied: boolean;
    operatorFeeCents: number;
    hotelPenaltyCents: number;
    transferPenaltyCents: number;
  };
}

export function calculateCancellationPenalty(
  input: CancellationPenaltyInput
): CancellationPenaltyResult {
  const result = calculateTripCancellationPenalties({
    totalPackageCents: input.totalTripCents,
    issuedAt: input.bookingDate,
    requestedAt: input.cancellationDate,
    departureDate: input.departureDate,
    flights: {
      baseFareCents: input.airfareCents,
      boardingTaxesCents: 0,
      isRefundableFare: input.airfareRefundable,
      airlineCancellationPenaltyCents: input.airfareRefundable ? 0 : input.airfareCents,
    },
    hotel: {
      totalHotelCents: input.hotelCents,
      freeCancellationUntil: input.hotelFreeCancellationUntil,
      penaltyIfAfterDeadlineCents: input.hotelCents,
      isNonRefundableRate: !input.hotelRefundable,
    },
    transfers: {
      totalTransferCents: input.transferCents,
    },
    operatorRefundFeePct: input.operatorRatePct,
  });

  return {
    totalPenaltyCents: result.totalPenaltiesAndRetentionsCents,
    netRefundCents: result.refundableToCustomerCents,
    breakdown: {
      agencyFeeCents: result.agencyRetainedServiceCents,
      airlinePenaltyCents: result.flightPenaltyCents,
      anacRuleApplied: result.isAnac24hFlightExemptionApplied,
      operatorFeeCents: result.operatorAdministrativeFeeCents,
      hotelPenaltyCents: result.hotelPenaltyCents,
      transferPenaltyCents: result.transferPenaltyCents,
    },
  };
}
