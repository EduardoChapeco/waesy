import { describe, expect, it } from "vitest";
import {
  calculateInlineSaleSpreadsheetRow,
  detectDestinationArchetype,
  expandAirportCode,
  generateDynamicTravelPresentation,
  parseAndMapUniversalCrmSpreadsheet,
  resolveAgentCommissionTier,
  simulateTripCancellationAndCredit,
} from "./travel-pre-boarding-and-commissions.functions";

describe("Intelligent Modular Travel Presentation & Inline Sales Engine", () => {
  it("expands IATA airport codes automatically into Full City + Airport Name (IATA)", () => {
    expect(expandAirportCode("GRU")).toBe(
      "São Paulo — Aeroporto Internacional de Guarulhos (GRU)",
    );
    expect(expandAirportCode("PUJ")).toBe(
      "Punta Cana — Aeroporto Internacional de Punta Cana (PUJ)",
    );
    expect(expandAirportCode("PTY")).toBe(
      "Cidade do Panamá — Aeroporto Internacional de Tocumen (PTY)",
    );
  });

  it("generates a Commercial Quote Presentation distinctly from a Pre-Boarding Guide", () => {
    const quotePres = generateDynamicTravelPresentation({
      presentationType: "commercial_quote",
      agencyName: "Excelência Tour",
      agencyEmergencyPhone: "+55 49 99999-8888",
      tripTitle: "Proposta Comercial — Cancún & Riviera Maya",
      conceptSubtitle: "Cancún em Casal — All-Inclusive",
      travelerProfileType: "casal",
      passengersNames: ["Carlos Eduardo", "Mariana Silva"],
      adultsCount: 2,
      childrenCount: 0,
      startDate: "2026-11-10",
      endDate: "2026-11-17",
      originCity: "Chapecó",
      destinations: ["Cancún"],
      countries: ["México"],
      flights: [
        {
          direction: "ida",
          date: "2026-11-10",
          airline: "Copa Airlines",
          flightNumber: "CM 702",
          originIata: "GRU",
          destinationIata: "CUN",
          departureTime: "03:15",
          arrivalTime: "12:40",
          durationText: "9h25m",
          sameTicket: true,
          carryOnBagRule: "1 mala de mão de 10kg",
          checkedBagRule: "1 mala despachada de 23kg",
        },
      ],
      hotels: [
        {
          name: "Hard Rock Hotel Cancun",
          city: "Cancún",
          neighborhood: "Zona Hoteleira",
          address: "Blvd. Kukulcan Km 14.5",
          mealPlan: "All-Inclusive",
          checkInTime: "15:00",
          checkOutTime: "12:00",
          nearbyHighlights: [
            {
              name: "La Isla Shopping Village",
              distanceText: "5 min de táxi",
              practicalNote: "Shopping aberto na lagoa com lojas internacionais",
            },
          ],
        },
      ],
      hasReceptiveTransfer: true,
      commercialPriceTotalCents: 1850000,
      commercialPaymentConditions: "10x de R$ 1.850,00 sem juros",
    });

    expect(quotePres.presentationType).toBe("commercial_quote");
    expect(quotePres.pages.length).toBeGreaterThanOrEqual(5);
    const paymentPage = quotePres.pages.find((p) => p.moduleKey === "payments");
    expect(paymentPage?.subtitle).toContain("10x de R$ 1.850,00");
  });

  it("adapts 41-module Pre-Boarding Presentation for Punta Cana (Caribe Resort) with E-Ticket, Febre Amarela and Panama connection", () => {
    const pres = generateDynamicTravelPresentation({
      presentationType: "pre_boarding_guide",
      agencyName: "Excelência Tour",
      agencyEmergencyPhone: "+55 49 99999-0000",
      tripTitle: "Guia de Embarque — Punta Cana",
      conceptSubtitle: "Caribe entre Amigas — Punta Cana",
      travelerProfileType: "amigos_grupo",
      passengersNames: ["Fernanda", "Camila", "Juliana"],
      adultsCount: 3,
      childrenCount: 0,
      startDate: "2026-12-05",
      endDate: "2026-12-12",
      originCity: "Chapecó",
      destinations: ["Punta Cana"],
      countries: ["República Dominicana"],
      flights: [
        {
          direction: "ida",
          date: "2026-12-05",
          airline: "Copa Airlines",
          flightNumber: "CM 758",
          originIata: "GRU",
          destinationIata: "PTY",
          departureTime: "01:50",
          arrivalTime: "06:45",
          durationText: "6h55m",
          connectionWaitText: "1h35m no Panamá",
          connectionHubIata: "PTY",
          sameTicket: true,
        },
        {
          direction: "ida",
          date: "2026-12-05",
          airline: "Copa Airlines",
          flightNumber: "CM 108",
          originIata: "PTY",
          destinationIata: "PUJ",
          departureTime: "08:20",
          arrivalTime: "12:05",
          durationText: "2h45m",
          sameTicket: true,
        },
      ],
      hotels: [
        {
          name: "Barceló Bávaro Palace",
          city: "Punta Cana",
          neighborhood: "Playa Bávaro",
          address: "Carretera Bávaro Km 1",
          mealPlan: "All-Inclusive 24h",
          checkInTime: "15:00",
          checkOutTime: "12:00",
          nearbyHighlights: [
            {
              name: "Coco Bongo Punta Cana",
              distanceText: "15 min de transfer",
              practicalNote: "Show noturno com traslado incluso no ingresso",
            },
          ],
        },
      ],
      hasReceptiveTransfer: true,
      receptiveCompanyName: "Transatour Receptivo",
      receptiveMeetingPoint: "Portão B do desembarque com placa nominal",
      insuranceProvider: "Assist Card AC 60",
      insurancePolicyNumber: "AC-998877",
    });

    expect(pres.detectedArchetype).toBe("caribe_resort");
    expect(pres.selectedModules).not.toContain("parks");
    expect(pres.selectedModules).not.toContain("train");

    const docsPage = pres.pages.find((p) => p.moduleKey === "documents");
    const docsLabels = (docsPage?.cards || []).map((c) => c.label).join(" ");
    expect(docsLabels).toContain("E-Ticket República Dominicana");
    expect(docsLabels).toContain("Febre Amarela");

    const connectionPage = pres.pages.find((p) => p.moduleKey === "connection");
    expect(connectionPage?.title).toContain("Cidade do Panamá");
    expect(connectionPage?.title).toContain("(PTY)");
  });

  it("adapts Pre-Boarding Presentation for Itália Multicidade (trains, 1 page per hotel, city tax) and Europa Multi-País (GBP vs EUR, UK plug Type G)", () => {
    const italyPres = generateDynamicTravelPresentation({
      presentationType: "pre_boarding_guide",
      agencyName: "Excelência Tour",
      agencyEmergencyPhone: "+55 49 99999-0000",
      tripTitle: "Roteiro Clássico — Roma, Florença e Veneza",
      conceptSubtitle: "Itália Romântica — Roma, Florença e Veneza",
      travelerProfileType: "casal",
      passengersNames: ["Paulo", "Beatriz"],
      adultsCount: 2,
      childrenCount: 0,
      startDate: "2026-10-10",
      endDate: "2026-10-20",
      originCity: "Chapecó",
      destinations: ["Roma", "Florença", "Veneza"],
      countries: ["Itália"],
      flights: [],
      hotels: [
        {
          name: "Hotel Artemide Roma",
          city: "Roma",
          neighborhood: "Via Nazionale / Centro",
          address: "Via Nazionale 22, Roma",
          mealPlan: "Café da Manhã",
          checkInTime: "14:00",
          checkOutTime: "11:00",
          hasCityTax: true,
          cityTaxNote: "EUR 6 por pessoa/noite (Tassa di Soggiorno)",
          nearbyHighlights: [
            {
              name: "Fontana di Trevi",
              distanceText: "12 min a pé",
              practicalNote: "Caminhada plana pelo centro histórico",
            },
          ],
        },
        {
          name: "Hotel Brunelleschi",
          city: "Florença",
          neighborhood: "Piazza Santa Elisabetta (Centro Histórico)",
          address: "Piazza Santa Elisabetta 3, Florença",
          mealPlan: "Café da Manhã",
          checkInTime: "14:00",
          checkOutTime: "11:00",
          hasCityTax: true,
          cityTaxNote: "EUR 5,50 por pessoa/noite",
          nearbyHighlights: [
            {
              name: "Catedral Duomo di Firenze",
              distanceText: "3 min a pé (200 metros)",
              practicalNote: "Ao lado da cúpula de Brunelleschi",
            },
          ],
        },
      ],
      hasReceptiveTransfer: true,
      trains: [
        {
          originStation: "Roma Termini",
          destinationStation: "Firenze Santa Maria Novella",
          operatorName: "Trenitalia Frecciarossa",
          departureTime: "10:20",
          arrivalTime: "11:56",
          seatAndCarriageInfo: "Carrozza 3, Posti 4A/4B",
        },
      ],
    });

    expect(italyPres.detectedArchetype).toBe("italia_multicidade");
    expect(italyPres.selectedModules).toContain("train");
    const hotelPages = italyPres.pages.filter((p) => p.moduleKey === "hotel");
    expect(hotelPages.length).toBe(2);

    const euroMulti = detectDestinationArchetype({
      presentationType: "pre_boarding_guide",
      agencyName: "Excelência Tour",
      agencyEmergencyPhone: "49999990000",
      tripTitle: "Europa Clássica",
      conceptSubtitle: "Paris, Londres e Amsterdã",
      travelerProfileType: "casal",
      passengersNames: ["Ana", "Bruno"],
      adultsCount: 2,
      childrenCount: 0,
      startDate: "2026-11-01",
      endDate: "2026-11-15",
      originCity: "Chapecó",
      destinations: ["Paris", "Londres", "Amsterdã"],
      countries: ["França", "Inglaterra", "Holanda"],
      flights: [],
      hotels: [],
      hasReceptiveTransfer: false,
    });
    expect(euroMulti).toBe("europa_multipais");
  });

  it("calculates Inline Sale Spreadsheet Row with Gross Monthly Goals (<100k = 1.0% on Net; >=100k = 1.5% on Net) + 30% on Net Over and Dynamic Operator vs Pix Over Retention", () => {
    const tierRules = [
      {
        tierName: "Faixa 1 (Até R$ 99.999,99 Bruto)",
        minMonthlyRevenueCents: 0,
        maxMonthlyRevenueCents: 9999999,
        commissionPct: 1.0,
        overCommissionPct: 30.0,
        bonusFixedCents: 0,
      },
      {
        tierName: "Faixa 2 (Acima de R$ 100.000,00 Bruto)",
        minMonthlyRevenueCents: 10000000,
        maxMonthlyRevenueCents: null,
        commissionPct: 1.5,
        overCommissionPct: 30.0,
        bonusFixedCents: 0,
      },
    ];

    // Caso A: Consultora na Faixa 1 (R$ 85.000 Bruto no mês < R$ 100k) -> 1.0% s/ Líquido + 30% s/ Over Líquido (Financiado na Operadora com 16% retenção)
    const agentTier1 = {
      agentId: "agent-01",
      agentName: "Juliana Consultora",
      baseCommissionPct: 1.0,
      defaultOverCommissionPct: 30.0,
      commissionCalculationBasis: "net_sale_plus_over" as const,
      currentMonthAgencyRevenueCents: 8500000, // R$ 85.000,00 Bruto
      tiers: tierRules,
    };

    const rowOperatorOver = calculateInlineSaleSpreadsheetRow(
      {
        id: "sale-101",
        saleDate: "2026-10-17",
        clientName: "Família Oliveira",
        passengersCount: 4,
        operatorName: "Orinter Tour & Travel",
        operatorPackageCode: "ORT-99281",
        contractSigned: true,
        bookingStatus: "emitida",
        grossSaleCents: 2000000, // R$ 20.000,00 Bruto
        taxesAndFeesCents: 100000, // R$ 1.000,00 Taxas
        operatorTablePriceCents: 1900000, // R$ 19.000,00 Tabela -> Valor Líquido = R$ 18.000,00
        baseCommissionPct: 10,
        overRetentionFeePct: 16,
        paid100PctViaOperator: true,
        overPaymentMethod: "operadora_financiado",
        agentId: "agent-01",
        agentName: "Juliana Consultora",
        agentCommissionPctOverride: null,
        agentOverCommissionPctOverride: null,
        agentCommissionCentsOverride: null,
      },
      agentTier1,
    );

    expect(rowOperatorOver.netCommissionableBaseCents).toBe(1800000); // R$ 18.000,00 Líquido
    expect(rowOperatorOver.overGrossCents).toBe(100000); // R$ 1.000,00 Over Bruto
    expect(rowOperatorOver.effectiveOverRetentionPct).toBe(16);
    expect(rowOperatorOver.overRetentionDeductionCents).toBe(16000); // R$ 160,00 retido pela operadora
    expect(rowOperatorOver.overNetCents).toBe(84000); // R$ 840,00 Over Líquido
    expect(rowOperatorOver.appliedAgentTierName).toBe("Faixa 1 (Até R$ 99.999,99 Bruto)");
    expect(rowOperatorOver.effectiveAgentCommissionPct).toBe(1.0);
    expect(rowOperatorOver.effectiveAgentOverCommissionPct).toBe(30.0);
    // 1.0% de R$ 18.000,00 = R$ 180,00 (18000 cents)
    expect(rowOperatorOver.agentBaseCommissionCents).toBe(18000);
    // 30% de R$ 840,00 = R$ 252,00 (25200 cents)
    expect(rowOperatorOver.agentOverCommissionCents).toBe(25200);
    // Total Vendedor = R$ 180 + R$ 252 = R$ 432,00 (43200 cents)
    expect(rowOperatorOver.agentCommissionTotalCents).toBe(43200);

    // Caso B: Consultora bateu R$ 100.000,00+ Bruto no mês (Faixa 2 -> 1.5% s/ Líquido) E Over pago via Pix Direto à Agência (0% retenção da operadora)
    const agentTier2 = {
      ...agentTier1,
      currentMonthAgencyRevenueCents: 12000000, // R$ 120.000,00 Bruto
    };

    const rowPixOver = calculateInlineSaleSpreadsheetRow(
      {
        id: "sale-102",
        saleDate: "2026-10-18",
        clientName: "Casal Mendes",
        passengersCount: 2,
        operatorName: "FRT Operadora",
        operatorPackageCode: "FRT-55120",
        contractSigned: true,
        bookingStatus: "emitida",
        grossSaleCents: 2000000, // R$ 20.000,00
        taxesAndFeesCents: 100000, // R$ 1.000,00
        operatorTablePriceCents: 1900000, // R$ 19.000,00 -> Líquido R$ 18.000,00
        baseCommissionPct: 10,
        overRetentionFeePct: 15, // Configurado 15%, mas como é Pix Direto deve zerar a retenção!
        paid100PctViaOperator: false,
        overPaymentMethod: "pix_direto_agencia",
        agentId: "agent-01",
        agentName: "Juliana Consultora",
        agentCommissionPctOverride: null,
        agentOverCommissionPctOverride: null,
        agentCommissionCentsOverride: null,
      },
      agentTier2,
    );

    expect(rowPixOver.effectiveOverRetentionPct).toBe(0);
    expect(rowPixOver.overRetentionDeductionCents).toBe(0);
    expect(rowPixOver.overNetCents).toBe(100000); // R$ 1.000,00 Over Líquido integral (sem retenção)
    expect(rowPixOver.appliedAgentTierName).toBe("Faixa 2 (Acima de R$ 100.000,00 Bruto)");
    expect(rowPixOver.effectiveAgentCommissionPct).toBe(1.5);
    // 1.5% sobre R$ 18.000,00 Líquido = R$ 270,00 (27000 cents)
    expect(rowPixOver.agentBaseCommissionCents).toBe(27000);
    // 30% sobre R$ 1.000,00 Over Líquido = R$ 300,00 (30000 cents)
    expect(rowPixOver.agentOverCommissionCents).toBe(30000);
    // Total Vendedor = R$ 270 + R$ 300 = R$ 570,00 (57000 cents)
    expect(rowPixOver.agentCommissionTotalCents).toBe(57000);

    // Caso C: Cancelamento/Multa NÃO desconta comissão por padrão (deductCommissionOnCancel = false), exceto se o gestor ativar estorno manual
    const rowCancelledProtected = calculateInlineSaleSpreadsheetRow(
      {
        ...rowPixOver,
        bookingStatus: "cancelada",
        deductCommissionOnCancel: false,
      },
      agentTier2,
    );
    expect(rowCancelledProtected.agentCommissionTotalCents).toBe(57000);

    const rowCancelledWithAdminClawback = calculateInlineSaleSpreadsheetRow(
      {
        ...rowPixOver,
        bookingStatus: "cancelada",
        deductCommissionOnCancel: true,
        managerCommissionClawbackCents: 20000, // Gestor descontou R$ 200,00 manualmente
      },
      agentTier2,
    );
    expect(rowCancelledWithAdminClawback.agentCommissionTotalCents).toBe(37000);

    const resolved = resolveAgentCommissionTier(agentTier2);
    expect(resolved.tierName).toBe("Faixa 2 (Acima de R$ 100.000,00 Bruto)");
  });

  it("localizes Travel Presentations into Commercial English (en-US) and Spanish (es-ES)", () => {
    const enPres = generateDynamicTravelPresentation({
      presentationType: "pre_boarding_guide",
      locale: "en-US",
      agencyName: "Excelência Tour",
      agencyEmergencyPhone: "+55 49 99999-0000",
      tripTitle: "Guia de Embarque — Punta Cana",
      conceptSubtitle: "Punta Cana All-Inclusive",
      travelerProfileType: "casal",
      passengersNames: ["John", "Mary"],
      adultsCount: 2,
      childrenCount: 0,
      startDate: "2026-12-05",
      endDate: "2026-12-12",
      originCity: "Chapecó",
      destinations: ["Punta Cana"],
      countries: ["República Dominicana"],
      flights: [],
      hotels: [],
      hasReceptiveTransfer: true,
    });

    expect(enPres.locale).toBe("en-US");
    expect(enPres.pages[0]?.eyebrow).toContain("Official Pre-Departure & Boarding Guide");

    const esPres = generateDynamicTravelPresentation({
      presentationType: "commercial_quote",
      locale: "es-ES",
      agencyName: "Excelência Tour",
      agencyEmergencyPhone: "+55 49 99999-0000",
      tripTitle: "Proposta Cancún",
      conceptSubtitle: "Cancún Todo Incluido",
      travelerProfileType: "casal",
      passengersNames: ["Juan", "Maria"],
      adultsCount: 2,
      childrenCount: 0,
      startDate: "2026-12-05",
      endDate: "2026-12-12",
      originCity: "Chapecó",
      destinations: ["Cancún"],
      countries: ["México"],
      flights: [],
      hotels: [],
      hasReceptiveTransfer: true,
    });

    expect(esPres.locale).toBe("es-ES");
    expect(esPres.pages[0]?.eyebrow).toContain("Propuesta Comercial de Viaje Personalizada");
  });

  it("simulates Trip Cancellation, Non-Refundable Retention, Credit Letter and Active Financing Continuity", () => {
    const sim = simulateTripCancellationAndCredit({
      clientName: "Marcos Vinícius",
      operatorName: "FRT Operadora",
      locatorCode: "FRT-7721",
      grossSaleCents: 2000000, // R$ 20.000
      alreadyPaidByClientCents: 400000, // R$ 4.000 pagos de entrada
      remainingFinancedBalanceCents: 1600000, // R$ 16.000 financiados no boleto
      supplierNonRefundableCents: 650000, // R$ 6.500 tarifa aérea não reembolsável
      agencyContractFinePct: 20, // 20% = R$ 4.000
      convertBalanceToOperatorCredit: true,
      daysBeforeDeparture: 10,
    });

    // 4000 + 6500 = R$ 10.500,00 (1050000 cents)
    expect(sim.totalPenaltiesAndRetentionsCents).toBe(1050000);
    expect(sim.clientMustKeepPayingFinancing).toBe(true);
    expect(sim.unpaidPenaltyBalanceCents).toBe(650000);
    expect(sim.operatorCreditLetterCents).toBe(950000); // R$ 9.500 de carta de crédito
    expect(sim.formalStatementPt).toContain("FINANCIAMENTO ATIVO");
  });

  it("parses Universal CRM Spreadsheets and preserves 100% of unknown columns inside structured notes", () => {
    const rawTsv = [
      "Nome Completo\tCPF\tTelefone WhatsApp\tCidade\tLimite Credito Aprovado\tScore Financiamento\tPreferência de Assento\tPassaporte Vencimento",
      "João Pedro Alves\t123.456.789-00\t(49) 99911-2233\tChapecó\tR$ 35.000,00\tAprovado Orinter\tJanela Executiva\t12/2029",
    ].join("\n");

    const parsed = parseAndMapUniversalCrmSpreadsheet(rawTsv);
    expect(parsed.totalRows).toBe(1);
    expect(parsed.unmappedHeadersConvertedToNotes).toContain(
      "Preferência de Assento",
    );
    expect(parsed.unmappedHeadersConvertedToNotes).toContain(
      "Passaporte Vencimento",
    );
    expect(parsed.rows[0]?.fullName).toBe("João Pedro Alves");
    expect(parsed.rows[0]?.operatorCreditLimitCents).toBe(3500000);
    expect(parsed.rows[0]?.operatorCreditStatus).toBe("Aprovado Orinter");
    expect(parsed.rows[0]?.structuredNotesFromUnmappedColumns).toContain(
      "Preferência de Assento: Janela Executiva",
    );
    expect(parsed.rows[0]?.structuredNotesFromUnmappedColumns).toContain(
      "Passaporte Vencimento: 12/2029",
    );
  });
});
