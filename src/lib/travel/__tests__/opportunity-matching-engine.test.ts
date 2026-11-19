import { describe, it, expect } from "vitest";
import {
  classifyChildAgeBand,
  evaluateHistoricalAdvantage,
  evaluateUnifiedOpportunityMatch,
  normalizeLegacyDemandToCanonical,
  normalizeLegacyOfferToCanonical,
  simulateFamilyPricingFromAdultBase,
  type CanonicalDemandLead,
  type CanonicalSupplyOffer,
} from "../opportunity-matching-engine";
import { computeOfferInterestMatch, type CommercialContact, type TravelInterest } from "../travel-commercial-intelligence";
import type { TravelOffer } from "../excelencia-offer-engine";

function makeBaseOffer(overrides: Partial<CanonicalSupplyOffer> = {}): CanonicalSupplyOffer {
  return {
    id: "offer-mcz-1",
    sourceType: "proposal",
    title: "Maceió Resort All Inclusive — Julho",
    originCity: "Chapecó",
    originIata: "XAP",
    destinationCity: "Maceió",
    destinationIata: "MCZ",
    departureDate: "2026-07-12",
    returnDate: "2026-07-19",
    quotedAdultsCount: 2,
    quotedChildrenCount: 0,
    quotedChildrenAges: [],
    rooms: [{ roomNumber: 1, adultsCount: 2, childrenCount: 0, childrenAges: [] }],
    totalPriceCents: 600000, // R$ 6.000 para 2 adultos (R$ 3.000/adt)
    productType: "pacote",
    ...overrides,
  };
}

function makeBaseDemand(overrides: Partial<CanonicalDemandLead> = {}): CanonicalDemandLead {
  return {
    id: "lead-1",
    demandSource: "lead_crm",
    leadId: "lead-crm-1",
    fullName: "Ana Paula Ferreira",
    destinations: [
      {
        label: "Maceió (MCZ)",
        normalized: "maceio",
        iata: "MCZ",
        gatewayIatas: ["MCZ"],
      },
    ],
    period: {
      mode: "month_list",
      targetMonths: ["2026-07"],
      seasonTags: [],
      flexibilityDays: 3,
      flexibleAnytime: false,
    },
    rooms: [{ roomNumber: 1, adultsCount: 2, childrenCount: 0, childrenAges: [] }],
    adultsCount: 2,
    childrenAges: [],
    maxTotalBudgetCents: 1000000,
    recentProposals: [],
    ...overrides,
  };
}

describe("Unified Opportunity Matching Engine — Hard-Gates, Child Simulation & Historical Check", () => {
  it("REQ-M01 / F-OPP-03: rejects mismatched destination even when budget is open and dates are flexible", () => {
    const offer = makeBaseOffer({ destinationCity: "Porto Seguro", destinationIata: "BPS" });
    const demand = makeBaseDemand({
      destinations: [{ label: "Gramado", normalized: "gramado", gatewayIatas: ["POA", "CXJ"] }],
      period: {
        mode: "flexible_anytime",
        targetMonths: [],
        seasonTags: [],
        flexibilityDays: 3,
        flexibleAnytime: true,
      },
      maxTotalBudgetCents: null,
    });

    const res = evaluateUnifiedOpportunityMatch(offer, demand);
    expect(res.isMatch).toBe(false);
    expect(res.matchScore).toBe(0);
    expect(res.rejectionCode).toBe("DESTINATION_MISMATCH");
  });

  it("F-OPP-03 adapter regression: computeOfferInterestMatch never leaks mismatched destinations above threshold", () => {
    const contact: CommercialContact = {
      id: "c-1",
      name: "Carlos Mendes",
      phone: "49999112233",
      preferredChannel: "whatsapp",
      status: "active",
      createdAt: "2026-10-01T00:00:00Z",
      updatedAt: "2026-10-01T00:00:00Z",
    };
    const interest: TravelInterest = {
      id: "i-1",
      contactId: "c-1",
      title: "Gramado Inverno",
      destinations: ["Gramado"],
      dates: { flexibility: "flexible_anytime" },
      party: { adults: 2, children: 0, infants: 0, childAges: [], labelMode: "couple" },
      budget: {},
      inclusionsWanted: [],
      urgency: "moderate",
      status: "open",
      expiresAt: "2027-05-01T00:00:00Z",
      createdAt: "2026-10-01T00:00:00Z",
      updatedAt: "2026-10-01T00:00:00Z",
    };
    const mismatchedOffer = {
      id: "o-cancun",
      slug: "cancun",
      status: "published",
      offerType: "pacote",
      sourceArtifacts: [],
      extractedFields: {},
      destination: { title: "Cancún All Inclusive", city: "Cancún", country: "México", destinationIata: "CUN" },
      dates: { departureDate: "2026-08-10", returnDate: "2026-08-17", displayRangeText: "10 a 17 ago", nightsCount: 7 },
      party: { adults: 2, children: 0, infants: 0, childAges: [], labelMode: "couple" },
      rooms: [],
      flights: [],
      hotels: [],
      transfers: { included: true, summary: "" },
      experiences: [],
      inclusions: [],
      exclusions: [],
      pricing: {
        currency: "BRL",
        displayMode: "total_primary",
        priceBasis: "total_package",
        priceBasisLabel: "Total",
        occupancySummaryLabel: "Duplo",
        totalPackagePriceCents: 900000,
        installmentCount: 10,
        installmentAmountCents: 90000,
        paymentMethods: ["card"],
        paymentTermsLabel: "10x",
      },
      paymentTermsSnapshot: {
        installmentCount: 10,
        installmentAmountCents: 90000,
        totalAmountCents: 900000,
        methods: ["card"],
        entryRequired: false,
        interestMode: "interest_free",
        shortStoryLabel: "",
        shortWhatsAppLabel: "",
        legalText: "",
        recalculatedFromTotal: false,
      },
      validity: { createdAt: "", expiresAt: "", expiredBehavior: "keep", isSameDayClosingOnly: false },
      publicPage: { url: "https://waesy.com/x", includeFlightTimes: false },
      whatsappCopy: { text: "", includeFlightTimes: false },
      storyDocument: {} as any,
      reviewFlags: [],
    } as unknown as TravelOffer;

    const match = computeOfferInterestMatch(mismatchedOffer, interest, contact);
    expect(match).toBeNull();
  });

  it("REQ-M01: matches regional gateway flight for Gramado (POA) and keeps Porto Seguro vs Salvador distinct", () => {
    const flightToPoa = makeBaseOffer({
      destinationCity: "Porto Alegre",
      destinationIata: "POA",
      productType: "aereo_only",
      totalPriceCents: 180000,
    });
    const gramadoLead = makeBaseDemand({
      destinations: [{ label: "Gramado e Canela", normalized: "gramado", gatewayIatas: ["POA", "CXJ"] }],
    });

    const gatewayMatch = evaluateUnifiedOpportunityMatch(flightToPoa, gramadoLead);
    expect(gatewayMatch.isMatch).toBe(true);
    expect(gatewayMatch.matchedViaGateway).toBe(true);
    expect(gatewayMatch.scoreBreakdown.destination).toBeGreaterThanOrEqual(28);

    const salvadorResort = makeBaseOffer({ destinationCity: "Salvador", destinationIata: "SSA" });
    const portoSeguroLead = makeBaseDemand({
      destinations: [{ label: "Porto Seguro", normalized: "porto seguro", iata: "BPS", gatewayIatas: ["BPS"] }],
    });
    const badBahiaMatch = evaluateUnifiedOpportunityMatch(salvadorResort, portoSeguroLead);
    expect(badBahiaMatch.isMatch).toBe(false);
    expect(badBahiaMatch.rejectionCode).toBe("DESTINATION_MISMATCH");
  });

  it("REQ-M02 / F-OPP-05: rejects leads with unspecified dates (never fabricates match) and validates date tolerance", () => {
    const offer = makeBaseOffer({ departureDate: "2026-07-15" });
    const noDatesLead = makeBaseDemand({
      period: {
        mode: "unspecified",
        startDate: null,
        endDate: null,
        targetMonths: [],
        seasonTags: [],
        flexibilityDays: 0,
        flexibleAnytime: false,
      },
    });
    const resNoDates = evaluateUnifiedOpportunityMatch(offer, noDatesLead);
    expect(resNoDates.isMatch).toBe(false);
    expect(resNoDates.rejectionCode).toBe("MISSING_DATES_NO_FLEX");

    const tightDateLead = makeBaseDemand({
      period: {
        mode: "exact",
        startDate: "2026-07-10",
        endDate: "2026-07-17",
        targetMonths: [],
        seasonTags: [],
        flexibilityDays: 3,
        flexibleAnytime: false,
      },
    });
    const resWithinRange = evaluateUnifiedOpportunityMatch(offer, tightDateLead);
    expect(resWithinRange.isMatch).toBe(true);

    const septOffer = makeBaseOffer({ departureDate: "2026-09-10" });
    const resOutOfWindow = evaluateUnifiedOpportunityMatch(septOffer, tightDateLead);
    expect(resOutOfWindow.isMatch).toBe(false);
    expect(resOutOfWindow.rejectionCode).toBe("DATES_OUT_OF_WINDOW");
  });

  it("REQ-M03: simulates 0-1 colo, 2-11 CHD (itemized airfare + transfer), and 12-17 adult tariff accurately", () => {
    expect(classifyChildAgeBand(1).band).toBe("infant_0_1");
    expect(classifyChildAgeBand(11).band).toBe("chd_2_11");
    expect(classifyChildAgeBand(12).band).toBe("teen_adult_12_17");

    // Oferta cotada para 2 adultos com aéreo discriminado (R$ 1.400) + transfer (R$ 200) = R$ 1.600 por adulto/CHD
    const itemizedOffer = makeBaseOffer({
      quotedAdultsCount: 2,
      quotedChildrenCount: 0,
      totalPriceCents: 600000, // R$ 3.000 por adulto
      airfarePerAdultCents: 140000,
      transferPerAdultCents: 20000,
    });

    // Família com 2 adultos + 2 crianças (5 anos e 13 anos)
    const familySim = simulateFamilyPricingFromAdultBase(itemizedOffer, 2, [5, 13]);
    expect(familySim.applied).toBe(true);
    expect(familySim.requiresChildRequote).toBe(true);
    expect(familySim.chd2to11Count).toBe(1);
    expect(familySim.teens12to17Count).toBe(1);
    expect(familySim.simulationSource).toBe("itemized_air_transfer");
    // 2 adultos (600.000) + 1 teen 13a tarifa adulto (300.000) + 1 chd 5a aéreo+transfer (160.000) = 1.060.000
    expect(familySim.simulatedTotalCents).toBe(1060000);

    // Se o teto do cliente é R$ 900.000 (9.000 reais) com tolerancia 10% (990.000), 1.060.000 estoura e deve rejeitar
    const tightFamilyLead = makeBaseDemand({
      adultsCount: 2,
      childrenAges: [5, 13],
      rooms: [{ roomNumber: 1, adultsCount: 2, childrenCount: 2, childrenAges: [5, 13] }],
      maxTotalBudgetCents: 900000,
    });
    const overCap = evaluateUnifiedOpportunityMatch(itemizedOffer, tightFamilyLead);
    expect(overCap.isMatch).toBe(false);
    expect(overCap.rejectionCode).toBe("OVER_BUDGET_CAP");

    // Se o teto for R$ 11.000 (1.100.000), aprova como conditional_child_requote!
    const comfortableFamilyLead = { ...tightFamilyLead, maxTotalBudgetCents: 1100000 };
    const conditionalMatch = evaluateUnifiedOpportunityMatch(itemizedOffer, comfortableFamilyLead);
    expect(conditionalMatch.isMatch).toBe(true);
    expect(conditionalMatch.requiresChildRequote).toBe(true);
    expect(conditionalMatch.matchTier).toBe("conditional_child_requote");
    expect(conditionalMatch.effectiveOfferTotalCents).toBe(1060000);
  });

  it("REQ-M04: compares against historical quotes to flag great promotional deals even with children", () => {
    const promoOffer = makeBaseOffer({
      destinationCity: "Maceió",
      totalPriceCents: 440000, // R$ 2.200 / adulto
      airfarePerAdultCents: 90000,
      transferPerAdultCents: 15000,
    });
    const observations = [
      { destination: "Maceió", totalCents: 680000, adultsCount: 2 }, // 3.400/adt
      { destination: "Maceió", totalCents: 720000, adultsCount: 2 }, // 3.600/adt
      { destination: "Maceió", totalCents: 700000, adultsCount: 2 }, // 3.500/adt
    ];
    const demandWithChd = makeBaseDemand({
      adultsCount: 2,
      childrenAges: [5, 11],
      rooms: [{ roomNumber: 1, adultsCount: 2, childrenCount: 2, childrenAges: [5, 11] }],
      maxTotalBudgetCents: null, // orçamento aberto -> não rejeita por 0
    });

    const result = evaluateUnifiedOpportunityMatch(promoOffer, demandWithChd, {
      historicalObservations: observations,
    });
    expect(result.isMatch).toBe(true);
    expect(result.budgetStatus).toBe("open_to_validate");
    expect(result.historicalCheck.verdict).toBe("great_deal");
    expect(result.historicalCheck.historicalSavingsPct).toBeGreaterThan(25);
    expect(result.effectiveOfferTotalCents).toBe(440000 + 2 * (90000 + 15000)); // 650.000
  });

  it("REQ-B01 & REQ-B02: skips self-lead and marks 30-day cooldown duplicates", () => {
    const offer = makeBaseOffer({ targetLeadId: "lead-owner-A" });
    const selfLead = makeBaseDemand({ id: "lead-owner-A", leadId: "lead-owner-A" });
    const selfRes = evaluateUnifiedOpportunityMatch(offer, selfLead);
    expect(selfRes.isMatch).toBe(false);
    expect(selfRes.rejectionCode).toBe("SELF_LEAD");

    const now = new Date("2026-11-16T12:00:00Z");
    const otherLeadWithHistory = makeBaseDemand({
      id: "lead-B",
      leadId: "lead-B",
      recentProposals: [
        {
          id: "prev-prop-1",
          title: "Maceió Julho Anterior",
          destinationNormalized: "maceio",
          departureDate: "2026-07-10",
          createdAt: "2026-11-01T12:00:00Z",
        },
      ],
    });
    const resOther = evaluateUnifiedOpportunityMatch(offer, otherLeadWithHistory, { now });
    expect(resOther.isMatch).toBe(true);
    expect(resOther.alreadyProposedRecently).toBe(true);
    expect(resOther.recentProposalInfo?.title).toBe("Maceió Julho Anterior");
  });

  it("Zero-loss legacy normalization: preserves comma pax_ages, string destination & rooms", () => {
    const demand = normalizeLegacyDemandToCanonical({
      id: "legacy-lead-99",
      full_name: "Fernanda Costa",
      destination: "Gramado e Canela",
      interest_period: "Férias de Julho",
      pax_adults: 2,
      pax_children: 2,
      pax_ages: "5, 11",
      budget_cents: 800000,
    });

    expect(demand.destinations[0]?.normalized).toContain("gramado");
    expect(demand.period.seasonTags).toContain("ferias_julho");
    expect(demand.childrenAges).toEqual([5, 11]);
    expect(demand.rooms).toHaveLength(1);
    expect(demand.rooms[0]?.childrenAges).toEqual([5, 11]);

    const offer = normalizeLegacyOfferToCanonical({
      id: "prop-1",
      destination_city: "Gramado",
      travel_start: "2027-07-15",
      adults_count: 2,
      children_count: 0,
      pricing: { totalCents: 450000 },
    });
    const res = evaluateUnifiedOpportunityMatch(offer, demand);
    expect(res.isMatch).toBe(true);
  });

  it("evaluateHistoricalAdvantage handles insufficient samples gracefully", () => {
    const sim = simulateFamilyPricingFromAdultBase(makeBaseOffer(), 2, []);
    const hist = evaluateHistoricalAdvantage(makeBaseOffer(), sim, [
      { destination: "Maceió", totalCents: 700000, adultsCount: 2 },
    ]);
    expect(hist.verdict).toBe("insufficient_history");
    expect(hist.sampleCount).toBe(1);
  });

  it("Red Team regressions: São Paulo != Morro de São Paulo, Ilha do Mel != MEL, unordered ages, teen fallback, self-ID exclusion, total_price_cents & season hints", () => {
    // 1. Conflicting destination clusters: São Paulo vs Morro de São Paulo
    const spOffer = makeBaseOffer({ destinationCity: "São Paulo", destinationIata: "GRU" });
    const morroDemand = makeBaseDemand({
      destinations: [{ label: "Morro de São Paulo", normalized: "morro de sao paulo", iata: null, gatewayIatas: ["SSA"] }],
    });
    const spVsMorro = evaluateUnifiedOpportunityMatch(spOffer, morroDemand);
    expect(spVsMorro.isMatch).toBe(false);
    expect(spVsMorro.rejectionCode).toBe("DESTINATION_MISMATCH");

    // 2. "Ilha do Mel" must not trigger IATA "MEL" (Melbourne)
    const melbourneOffer = makeBaseOffer({ destinationCity: "Melbourne", destinationIata: "MEL" });
    const ilhaDoMelDemand = normalizeLegacyDemandToCanonical({
      id: "lead-ilha-mel",
      full_name: "Lucas",
      destination: "Ilha do Mel",
      interest_period: "Julho 2026",
      pax_adults: 2,
    });
    expect(ilhaDoMelDemand.destinations[0]?.iata || null).toBeNull();
    const melCheck = evaluateUnifiedOpportunityMatch(melbourneOffer, ilhaDoMelDemand);
    expect(melCheck.isMatch).toBe(false);
    const ilhaMatch = evaluateUnifiedOpportunityMatch(
      makeBaseOffer({ destinationCity: "Ilha do Mel - Paraná", destinationIata: null }),
      ilhaDoMelDemand
    );
    expect(ilhaMatch.isMatch).toBe(true);
    const ilhaBoiCheck = evaluateUnifiedOpportunityMatch(
      makeBaseOffer({ destinationCity: "Ilha do Boi", destinationIata: null }),
      ilhaDoMelDemand
    );
    expect(ilhaBoiCheck.isMatch).toBe(false);

    // 3. Sorted child ages comparison ([10, 1] vs [1, 10]) -> zero false child requote warning
    const exactFamilyOffer = makeBaseOffer({
      quotedAdultsCount: 2,
      quotedChildrenCount: 2,
      quotedChildrenAges: [10, 1],
      totalPriceCents: 720000,
    });
    const unorderedSim = simulateFamilyPricingFromAdultBase(exactFamilyOffer, 2, [1, 10]);
    expect(unorderedSim.applied).toBe(false);
    expect(unorderedSim.requiresChildRequote).toBe(false);
    expect(unorderedSim.simulatedTotalCents).toBe(720000);

    // 4. 12-17 teen charges full adult tariff when offer has childrenCount > 0 without explicit child ages
    const opaqueChdOffer = makeBaseOffer({
      quotedAdultsCount: 2,
      quotedChildrenCount: 1,
      quotedChildrenAges: [],
      totalPriceCents: 600000, // 2 adultos + 1 CHD (2 + 0.55 = 2.55 eq. => ~235.294/adt)
    });
    const teenSim = simulateFamilyPricingFromAdultBase(opaqueChdOffer, 2, [14]);
    expect(teenSim.requiresChildRequote).toBe(true);
    expect(teenSim.teens12to17Count).toBe(1);
    expect(teenSim.simulatedTotalCents).toBeGreaterThan(opaqueChdOffer.totalPriceCents);
    expect(teenSim.simulatedTotalCents).toBe(705882);

    // 5. Historical observation excludes offer's own ID and skips short <4-char names
    const offerSelf = makeBaseOffer({ id: "prop-self-99", totalPriceCents: 500000 });
    const selfSim = simulateFamilyPricingFromAdultBase(offerSelf, 2, []);
    const histFiltered = evaluateHistoricalAdvantage(offerSelf, selfSim, [
      { id: "prop-self-99", destination: "Maceió", totalCents: 900000, adultsCount: 2 },
      { id: "obs-short", destination: "Sol", totalCents: 900000, adultsCount: 2 },
      { id: "obs-valid-1", destination: "Maceió", totalCents: 650000, adultsCount: 2 },
    ]);
    expect(histFiltered.sampleCount).toBe(1);
    expect(histFiltered.verdict).toBe("insufficient_history");

    // 6. Legacy offer total_price_cents + travel_start_date + summer/winter period hints
    const legacyProposalOffer = normalizeLegacyOfferToCanonical({
      id: "prop-price-key",
      destination_city: "Florianópolis",
      travel_start_date: "2027-01-12",
      travel_end_date: "2027-01-19",
      adults_count: 2,
      pricing: { total_price_cents: 540000 },
    });
    expect(legacyProposalOffer.totalPriceCents).toBe(540000);
    expect(legacyProposalOffer.departureDate).toBe("2027-01-12");

    const summerLead = normalizeLegacyDemandToCanonical({
      id: "lead-verao",
      full_name: "Beatriz",
      destination: "Florianópolis",
      interest_period: "Férias de Verão",
      pax_adults: 2,
      budget_cents: 700000,
    });
    expect(evaluateUnifiedOpportunityMatch(legacyProposalOffer, summerLead).isMatch).toBe(true);
  });
});
