import { describe, expect, it } from "vitest";
import {
  resolveDestinationGatewayEngine,
  calculateMultiRoomQuoteBreakdown,
  autoMatchCustomerReceiptToInstallment,
  getOperatorPaymentGuidance,
  buildAutomaticTripItineraryFallback,
  answerTripCopilotGroundedQuestion,
  parseAndValidatePassportMrz,
  evaluateUsVisaDs160ConsularTies,
  calculateHybridSaleSplitAndTaxShield,
  type TripInstallmentBoletoDTO,
  type TripGroundedCopilotContext,
} from "./travel-ecosystem-engines.functions";

describe("Travel Ecosystem Engines (Ondas 2 a 5)", () => {
  it("resolveDestinationGatewayEngine identifica aeroportos gateways primários e secundários + transfer para destinos sem aeroporto próprio", () => {
    const gramado = resolveDestinationGatewayEngine("Gramado e Canela");
    expect(gramado).not.toBeNull();
    expect(gramado?.hasOwnCommercialAirport).toBe(false);
    expect(gramado?.primaryAirportIata).toBe("POA");
    expect(gramado?.secondaryAirportIata).toBe("CXJ");
    expect(gramado?.recommendedTransferType).toBe("transfer_regular");

    const jeri = resolveDestinationGatewayEngine("Jericoacoara");
    expect(jeri?.primaryAirportIata).toBe("JJD");
    expect(jeri?.secondaryAirportIata).toBe("FOR");
    expect(jeri?.recommendedTransferType).toBe("transfer_4x4");

    const bue = resolveDestinationGatewayEngine("Buenos Aires");
    expect(bue?.hasOwnCommercialAirport).toBe(true);
    expect(bue?.primaryAirportIata).toBe("AEP");
    expect(bue?.secondaryAirportIata).toBe("EZE");
  });

  it("calculateMultiRoomQuoteBreakdown calcula múltiplos quartos (Casal + CHD c/ Bebê Conforto, Duplo, Single) e campanhas 15x Boleto / 10x Cartão", () => {
    const result = calculateMultiRoomQuoteBreakdown(
      [
        {
          roomNumber: 1,
          roomLabel: "Quarto 1 — Casal + 1 Criança",
          roomCategory: "Superior",
          mealPlan: "Café da Manhã",
          adultsCount: 2,
          childrenCount: 1,
          childrenAges: [4],
          baseAdultPriceCents: 350000, // R$ 3.500 por adulto
          baseChildPriceCents: 150000, // R$ 1.500 criança
          addons: [
            {
              code: "child_seat",
              label: "Bebê Conforto / Cadeirinha no Transfer",
              priceCents: 18000, // R$ 180,00
            },
          ],
        },
        {
          roomNumber: 2,
          roomLabel: "Quarto 2 — Duplo Solteiro",
          roomCategory: "Standard",
          mealPlan: "Café da Manhã",
          adultsCount: 2,
          childrenCount: 0,
          childrenAges: [],
          baseAdultPriceCents: 320000, // R$ 3.200 por adulto
          baseChildPriceCents: 0,
          addons: [],
        },
      ],
      {
        operatorSlug: "incomum",
        operatorDisplayName: "Incomum Operadora",
        maxBoletoInstallments: 15,
        boletoMinDownpaymentPct: 20,
        maxCardInstallments: 10,
        pixCashDiscountPct: 5,
      }
    );

    expect(result.totalAdults).toBe(4);
    expect(result.totalChildren).toBe(1);
    expect(result.totalPassengers).toBe(5);
    // Quarto 1: (2 * 350000 + 150000) + 18000 = 868000 (R$ 8.680,00)
    expect(result.rooms[0].roomBaseCents).toBe(850000);
    expect(result.rooms[0].roomAddonsCents).toBe(18000);
    expect(result.rooms[0].roomTotalCents).toBe(868000);
    // Quarto 2: 2 * 320000 = 640000 (R$ 6.400,00)
    expect(result.rooms[1].roomTotalCents).toBe(640000);
    // Total Geral: R$ 15.080,00
    expect(result.grandTotalCents).toBe(1508000);
    expect(result.campaignSummary.maxBoletoInstallments).toBe(15);
    expect(result.campaignSummary.maxCardInstallments).toBe(10);
    expect(result.campaignSummary.cardMonthlyInstallmentCents).toBe(150800);
  });

  it("autoMatchCustomerReceiptToInstallment concilia comprovante enviado pelo cliente via OCR automaticamente na parcela correta", () => {
    const installments: TripInstallmentBoletoDTO[] = [
      {
        id: "inst-1",
        tripId: "trip-13725136",
        installmentNumber: 1,
        totalInstallments: 10,
        dueDate: "2026-10-15",
        amountCents: 78364,
        currency: "BRL",
        operatorSlug: "orinter",
        paymentChannel: "orinter_portal",
        boletoPdfUrl: "/boletos/1.pdf",
        digitableLine: "23793381286008301352856000063307789840000078364",
        pixCopiaECola: null,
        externalPaymentLink: null,
        status: "reconciled",
        receiptFileUrl: "/recibos/1.pdf",
        ocrExtractedAmountCents: 78364,
        ocrExtractedDate: "2026-10-14",
        ocrExtractedPayer: "VALDECY PEDROZO DA CRUZ",
        ocrMatchConfidence: 99,
      },
      {
        id: "inst-2",
        tripId: "trip-13725136",
        installmentNumber: 2,
        totalInstallments: 10,
        dueDate: "2026-11-15",
        amountCents: 78364,
        currency: "BRL",
        operatorSlug: "orinter",
        paymentChannel: "orinter_portal",
        boletoPdfUrl: "/boletos/2.pdf",
        digitableLine: "23793381286008301352856000063307789840000078364",
        pixCopiaECola: null,
        externalPaymentLink: null,
        status: "pending",
        receiptFileUrl: null,
        ocrExtractedAmountCents: null,
        ocrExtractedDate: null,
        ocrExtractedPayer: null,
        ocrMatchConfidence: null,
      },
    ];

    const match = autoMatchCustomerReceiptToInstallment(
      {
        amountCents: 78364,
        paymentDate: "2026-11-14",
        payerName: "VALDECY PEDROZO DA CRUZ",
      },
      installments
    );

    expect(match.matchedInstallmentId).toBe("inst-2");
    expect(match.matchedInstallmentNumber).toBe(2);
    expect(match.newStatus).toBe("reconciled");
    expect(match.confidence).toBeGreaterThanOrEqual(90);

    const incomumGuidance = getOperatorPaymentGuidance("incomum_chat", "Incomum");
    expect(incomumGuidance.badgeLabel).toContain("Incomum");
    const frtGuidance = getOperatorPaymentGuidance("frt_funpay", "FRT");
    expect(frtGuidance.badgeLabel).toContain("Funpay");
  });

  it("buildAutomaticTripItineraryFallback e answerTripCopilotGroundedQuestion geram roteiro diário e respondem cláusulas reais de contrato/ANAC", () => {
    const itinerary = buildAutomaticTripItineraryFallback({
      destination: "Buenos Aires",
      startDate: "2027-01-09",
      endDate: "2027-01-14",
      hotelName: "560 Hotel Viamonte Buenos Aires",
      arrivalTime: "14:20",
      departureTime: "18:05",
      includedTours: ["City Tour Clássico portenho", "Noite de Tango e Puerto Madero"],
    });

    expect(itinerary.length).toBe(6);
    expect(itinerary[0].title).toContain("Buenos Aires");
    expect(itinerary[1].title).toContain("City Tour");

    const ctx: TripGroundedCopilotContext = {
      tripCode: "13725136",
      destination: "Buenos Aires",
      travelStartDate: "09/01/2027",
      travelEndDate: "14/01/2027",
      operatorName: "Orinter Tour & Travel",
      reservationCode: "13725136",
      hotelName: "560 Hotel Viamonte Buenos Aires",
      hotelAddress: "Viamonte 650, CABA",
      hotelConfirmationId: "HT-13725136",
      mealPlan: "Café da Manhã",
      roomDescription: "Standard Double",
      flights: [
        {
          direction: "ida",
          airline: "GOL / Aerolíneas",
          flightNumber: "G3 7420",
          originIata: "XAP",
          destinationIata: "AEP",
          departureTime: "09:10",
          arrivalTime: "14:20",
          pnr: "ORINT9",
          handBaggageKg: 10,
          checkedBaggageCount: 1,
        },
      ],
      transferDetails: "Transfer Regular Aeroparque (AEP) / Hotel Viamonte / Aeroparque",
      transferConfirmationId: "TR-13725136",
      emergencyPhone24h: "+55 11 4000-1372",
      cancellationRulesText: "Cancelamento até 30 dias antes do embarque: retenção de 20% + multa de tarifa aérea não reembolsável.",
      fineSchedule: [{ daysBeforeDeparture: 30, penaltyPct: 20 }],
      requiredDocuments: ["RG Civil original emitido há menos de 10 anos ou Passaporte válido"],
    };

    const cancelReply = answerTripCopilotGroundedQuestion(
      "Se eu precisar cancelar minha viagem, qual é a regra de multa do contrato e da ANAC?",
      ctx
    );
    expect(cancelReply.answerPt).toContain("13725136");
    expect(cancelReply.answerPt).toContain("ANAC");
    expect(cancelReply.citations.length).toBeGreaterThanOrEqual(2);
  });

  it("parseAndValidatePassportMrz valida passaporte ICAO 9303 (regra 6 meses) e evaluateUsVisaDs160ConsularTies analisa vínculos INA 214b", () => {
    const mrz = parseAndValidatePassportMrz(
      "P<BRACRUZ<<ALISSON<RICARDO<SOARES<DA<<<<<<<<",
      "GH123456<8BRA9005144M3110202<<<<<<<<<<<<<<02",
      "2027-01-14"
    );
    expect(mrz.isValidMrz).toBe(true);
    expect(mrz.passportNumber).toBe("GH123456");
    expect(mrz.meetsSixMonthValidityRule).toBe(true);

    const strongVisa = evaluateUsVisaDs160ConsularTies({
      applicantName: "Valdecy Pedrozo da Cruz",
      destinationCountry: "Estados Unidos",
      visaType: "B1/B2",
      monthlyIncomeCents: 1850000, // R$ 18.500/mês
      occupationType: "empresario",
      employmentTenureMonths: 72,
      hasIncomeTaxReturn: true,
      hasPropertyInBrazil: true,
      hasDependentsInBrazil: true,
      previousInternationalTrips: ["Argentina", "Uruguai", "Portugal"],
      hasRelativesInDestination: false,
      relativesLegalStatus: "none",
      previousVisaRefusal: false,
      tripSponsorType: "self",
      estimatedTripCostCents: 2200000,
      plannedStayDays: 10,
    });

    expect(strongVisa.consularTiesScore).toBeGreaterThanOrEqual(75);
    expect(strongVisa.readinessTier).toBe("strong_ties");
  });

  it("calculateHybridSaleSplitAndTaxShield fecha exatamente a venda de R$ 20.000 (15k financiado + 5k Pix -> retém 2.4k comissão -> repassa 2.6k à operadora)", () => {
    const split = calculateHybridSaleSplitAndTaxShield({
      grossSaleCents: 2000000, // R$ 20.000,00
      supplierNetCents: 1760000, // R$ 17.600,00
      financedByOperatorCents: 1500000, // R$ 15.000,00 no boleto da operadora
      pixReceivedByAgencyCents: 500000, // R$ 5.000,00 recebidos no Pix da agência
      agentCommissionRatePct: 15, // 15% para o vendedor sobre a receita da agência
    });

    expect(split.agencyCommissionCents).toBe(240000); // R$ 2.400,00
    expect(split.taxableIntermediationBaseCents).toBe(240000); // Escudo Fiscal NF-e sobre R$ 2.400,00
    expect(split.retainedCommissionFromPixCents).toBe(240000); // Retém R$ 2.400,00 do Pix
    expect(split.netRemittanceToOperatorCents).toBe(260000); // Repassa R$ 2.600,00 para a operadora
    expect(split.agentCommissionCents).toBe(36000); // R$ 360,00 de comissão do vendedor
    expect(split.accountingBalanced).toBe(true);
  });
});
