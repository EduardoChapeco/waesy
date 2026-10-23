import { describe, it, expect } from "vitest";
import {
  computeOfferInterestMatch,
  generatePersonalizedOpportunityApproach,
  evaluateInterestBacklogAgainstOffer,
  buildCrmPromotionPayload,
  type CommercialContact,
  type TravelInterest,
} from "./travel-commercial-intelligence";
import type { TravelOffer } from "./excelencia-offer-engine";

describe("Travel Commercial Intelligence / Opportunity Engine Suite", () => {
  const mockContact: CommercialContact = {
    id: "contact-1",
    name: "Mariana Silva",
    phone: "49999887766",
    preferredChannel: "whatsapp",
    status: "active",
    createdAt: "2026-10-01T10:00:00Z",
    updatedAt: "2026-10-01T10:00:00Z",
  };

  const mockInterest: TravelInterest = {
    id: "interest-1",
    contactId: "contact-1",
    title: "Férias Punta Cana com a família",
    destinations: ["Punta Cana", "Caribe"],
    destinationCategories: ["resort", "praia", "all_inclusive"],
    preferredOrigins: ["XAP", "FLN"],
    dates: {
      flexibility: "specific_month",
      targetMonths: ["2026-08"],
    },
    party: {
      adults: 2,
      children: 0,
      infants: 0,
      childAges: [],
      labelMode: "couple",
    },
    budget: {
      maxInstallmentCents: 30000, // R$ 300,00
      maxTotalBudgetCents: 500000, // R$ 5.000,00
      preferredInstallments: 15,
    },
    inclusionsWanted: ["all_inclusive", "aereo_incluso", "transfer"],
    urgency: "moderate",
    status: "open",
    expiresAt: "2027-04-01T00:00:00Z",
    createdAt: "2026-10-01T10:00:00Z",
    updatedAt: "2026-10-01T10:00:00Z",
  };

  const mockOffer: TravelOffer = {
    id: "offer-punta-cana",
    slug: "punta-cana-15x",
    status: "published",
    offerType: "quick_quote",
    sourceArtifacts: [],
    extractedFields: {},
    destination: {
      title: "PUNTA CANA",
      city: "Punta Cana",
      country: "República Dominicana",
      originCity: "Chapecó",
      originIata: "XAP",
      destinationIata: "PUJ",
    },
    dates: {
      departureDate: "2026-08-19",
      returnDate: "2026-08-24",
      displayRangeText: "19 a 24 de agosto",
      nightsCount: 5,
    },
    party: {
      adults: 2,
      children: 0,
      infants: 0,
      childAges: [],
      labelMode: "couple",
    },
    rooms: [
      {
        roomIndex: 0,
        roomTypeLabel: "Standard",
        boardBasisLabel: "All Inclusive",
        adults: 2,
        children: 0,
      },
    ],
    flights: [],
    hotels: [
      {
        hotelCatalogId: "hotel-occidental-punta-cana",
        hotelName: "Occidental Punta Cana",
        city: "Punta Cana",
        country: "República Dominicana",
        roomTypeLabel: "Standard",
        mealPlanLabel: "All Inclusive",
      },
    ],
    transfers: { included: true, summary: "in/out" },
    experiences: [],
    inclusions: [],
    exclusions: [],
    pricing: {
      currency: "BRL",
      displayMode: "installments_primary",
      priceBasis: "per_person",
      priceBasisLabel: "Por pessoa",
      occupancySummaryLabel: "Em apartamento duplo",
      totalPackagePriceCents: 426000,
      installmentCount: 15,
      installmentAmountCents: 28400, // R$ 284,00 <= R$ 300,00 budget
      paymentMethods: ["boleto", "card"],
      paymentTermsLabel: "no boleto e cartão",
    },
    paymentTermsSnapshot: {
      installmentCount: 15,
      installmentAmountCents: 28400,
      totalAmountCents: 426000,
      methods: ["boleto", "card"],
      entryRequired: false,
      interestMode: "interest_free",
      shortStoryLabel: "no boleto e cartão",
      shortWhatsAppLabel: "15x de R$ 284,00 no boleto ou cartão",
      legalText: "Sem juros",
      recalculatedFromTotal: true,
    },
    validity: {
      createdAt: "2026-10-21T10:00:00Z",
      expiresAt: "2026-10-21T23:59:59Z",
      expiredBehavior: "keep_page_show_expired_banner",
      isSameDayClosingOnly: true,
    },
    publicPage: {
      url: "https://waesy.com/store/oferta/punta-cana",
      includeFlightTimes: false,
    },
    whatsappCopy: { text: "", includeFlightTimes: false },
    storyDocument: {} as any,
    reviewFlags: [],
  };

  it("computes deterministic match with score >= 85 for fully compatible opportunity", () => {
    const match = computeOfferInterestMatch(mockOffer, mockInterest, mockContact);

    expect(match).not.toBeNull();
    expect(match!.isHighPriority).toBe(true);
    expect(match!.matchScore).toBeGreaterThanOrEqual(85);

    const destDim = match!.dimensions.find((d) => d.dimension === "destination");
    expect(destDim?.score).toBe(35); // Exact destination match (35/35)

    const budgetDim = match!.dimensions.find((d) => d.dimension === "budget");
    expect(budgetDim?.score).toBe(25); // Within installment & total budget (25/25)

    const datesDim = match!.dimensions.find((d) => d.dimension === "dates");
    expect(datesDim?.score).toBe(20); // August 2026 matches targetMonths (20/20)
  });

  it("generates personalized, consultive WhatsApp approach copy", () => {
    const approach = generatePersonalizedOpportunityApproach(
      mockContact,
      mockInterest,
      mockOffer
    );

    expect(approach).toContain("Olá, Mariana!");
    expect(approach).toContain("PUNTA CANA");
    expect(approach).toContain("Occidental Punta Cana");
    expect(approach).toContain("All Inclusive");
    expect(approach).toMatch(/15x de \*?R\$[\s\u00a0]?284,00\*?/);
    expect(approach).toContain("https://waesy.com/store/oferta/punta-cana");
  });

  it("filters out opted-out contacts and cancelled interests in backlog scan", () => {
    const optedOutContact: CommercialContact = {
      ...mockContact,
      id: "contact-2",
      status: "opted_out",
    };
    const cancelledInterest: TravelInterest = {
      ...mockInterest,
      id: "interest-2",
      contactId: "contact-1",
      status: "cancelled",
    };

    const contacts = {
      "contact-1": mockContact,
      "contact-2": optedOutContact,
    };

    const matches = evaluateInterestBacklogAgainstOffer(
      mockOffer,
      [mockInterest, cancelledInterest],
      contacts
    );

    expect(matches.length).toBe(1);
    expect(matches[0].interestId).toBe("interest-1");
  });

  it("builds clean CRM Lead promotion payload with origin and provenance", () => {
    const match = computeOfferInterestMatch(mockOffer, mockInterest, mockContact)!;
    const payload = buildCrmPromotionPayload(match, mockContact);

    expect(payload.contactId).toBe("contact-1");
    expect(payload.name).toBe("Mariana Silva");
    expect(payload.phone).toBe("49999887766");
    expect(payload.origin).toBe("commercial_opportunity_match");
    expect(payload.matchScore).toBeGreaterThanOrEqual(85);
    expect(payload.notes).toContain("PUNTA CANA");
  });
});
