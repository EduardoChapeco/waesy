import { describe, it, expect } from "vitest";
import {
  formatOccupancyAndBasisSummary,
  resolveHotelCatalogMatch,
  computePaymentTermsSnapshot,
  selectStoryInclusions,
  fitStoryTitle,
  parseNaturalLanguageStoryCommand,
  applyStoryEditOperations,
  buildStoryDocumentFromOffer,
  isOfferClosingTodayInTimezone,
  evaluateOfferLifecycleState,
  generateWhatsAppOfferCopy,
  buildPartySignature,
  buildPriceObservation,
  CANONICAL_PAYMENT_CAMPAIGNS,
  type TravelParty,
  type RoomOccupancy,
  type TravelOffer,
} from "./excelencia-offer-engine";
import {
  getGlassPreset,
  normalizeGlassMaterial,
  computeGlassOptics,
  type GlassMaterial,
} from "./liquid-glass-engine";

describe("Excelência Tour Offer Engine & Liquid Glass Test Suite", () => {
  // ==========================================================================
  // 1. COMMERCIAL OCCUPANCY & PRICE BASIS RECONCILIATION
  // ==========================================================================
  describe("Occupancy & Price Basis Reconciliation", () => {
    it("formats 2 adults in double apartment with per_person basis", () => {
      const party: TravelParty = {
        adults: 2,
        children: 0,
        infants: 0,
        childAges: [],
        labelMode: "couple",
      };
      const rooms: RoomOccupancy[] = [
        {
          roomIndex: 0,
          roomTypeLabel: "Standard Duplo",
          adults: 2,
          children: 0,
        },
      ];

      const { priceBasisLabel, occupancySummaryLabel } =
        formatOccupancyAndBasisSummary(party, rooms, "per_person");

      expect(priceBasisLabel).toBe("Por pessoa");
      expect(occupancySummaryLabel).toBe("Em apartamento duplo");
    });

    it("formats 1 adult in single apartment with per_person basis", () => {
      const party: TravelParty = {
        adults: 1,
        children: 0,
        infants: 0,
        childAges: [],
        labelMode: "single",
      };
      const rooms: RoomOccupancy[] = [
        {
          roomIndex: 0,
          roomTypeLabel: "Standard Individual",
          adults: 1,
          children: 0,
        },
      ];

      const { priceBasisLabel, occupancySummaryLabel } =
        formatOccupancyAndBasisSummary(party, rooms, "per_person");

      expect(priceBasisLabel).toBe("Por pessoa");
      expect(occupancySummaryLabel).toBe("Em apartamento individual (Single)");
    });

    it("formats family occupancy with child ages and per_family basis", () => {
      const party: TravelParty = {
        adults: 2,
        children: 1,
        infants: 0,
        childAges: [8],
        labelMode: "family",
      };
      const rooms: RoomOccupancy[] = [
        {
          roomIndex: 0,
          roomTypeLabel: "Suíte Família",
          adults: 2,
          children: 1,
          childAges: [8],
        },
      ];

      const { priceBasisLabel, occupancySummaryLabel } =
        formatOccupancyAndBasisSummary(party, rooms, "per_family");

      expect(priceBasisLabel).toBe("Para 2 adultos + 1 criança(s)");
      expect(occupancySummaryLabel).toBe("2 adulto(s) + 1 criança(s) (8 anos)");
    });

    it("formats total_package basis for couple without ambivalence", () => {
      const party: TravelParty = {
        adults: 2,
        children: 0,
        infants: 0,
        childAges: [],
        labelMode: "couple",
      };
      const rooms: RoomOccupancy[] = [
        {
          roomIndex: 0,
          roomTypeLabel: "Standard",
          adults: 2,
          children: 0,
        },
      ];

      const { priceBasisLabel } = formatOccupancyAndBasisSummary(
        party,
        rooms,
        "total_package"
      );

      expect(priceBasisLabel).toBe("Total para 2 adultos");
    });

    it("formats multiple rooms cleanly", () => {
      const party: TravelParty = {
        adults: 4,
        children: 0,
        infants: 0,
        childAges: [],
        labelMode: "group",
      };
      const rooms: RoomOccupancy[] = [
        { roomIndex: 0, roomTypeLabel: "Duplo 1", adults: 2, children: 0 },
        { roomIndex: 1, roomTypeLabel: "Duplo 2", adults: 2, children: 0 },
      ];

      const { occupancySummaryLabel } = formatOccupancyAndBasisSummary(
        party,
        rooms,
        "per_person"
      );

      expect(occupancySummaryLabel).toBe("2 quartos • 4 adulto(s)");
    });
  });

  // ==========================================================================
  // 2. CENTRAL HOTEL & DESTINATION CATALOG RESOLVER
  // ==========================================================================
  describe("Hotel Catalog Alias Resolver", () => {
    it("resolves canonical 'Occidental Punta Cana' with high confidence", () => {
      const result = resolveHotelCatalogMatch("Occidental Punta Cana", "Punta Cana");

      expect(result.matched).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.82);
      expect(result.entity?.id).toBe("hotel-occidental-punta-cana");
      expect(result.entity?.canonicalName).toBe("Occidental Punta Cana");
    });

    it("resolves operator variant 'Barceló Occidental Punta Cana' via alias table", () => {
      const result = resolveHotelCatalogMatch(
        "Barceló Occidental Punta Cana",
        "Punta Cana"
      );

      expect(result.matched).toBe(true);
      expect(result.entity?.id).toBe("hotel-occidental-punta-cana");
    });

    it("resolves abbreviation 'Occidental P. Cana' with destination hint", () => {
      const result = resolveHotelCatalogMatch("Occidental P. Cana", "Punta Cana");

      expect(result.matched).toBe(true);
      expect(result.entity?.id).toBe("hotel-occidental-punta-cana");
    });

    it("resolves 'Vila Galé Cumbuco' correctly to canonical Ceará resort", () => {
      const result = resolveHotelCatalogMatch("Vila Galé Cumbuco", "Fortaleza");

      expect(result.matched).toBe(true);
      expect(result.entity?.canonicalName).toBe("Vila Galé Resort Cumbuco");
    });

    it("returns requiresConfirmation: true for an uncataloged hotel", () => {
      const result = resolveHotelCatalogMatch(
        "Pousada Encanto das Águas Desconhecida 99",
        "Lugar Nenhum"
      );

      expect(result.matched).toBe(false);
      expect(result.requiresConfirmation).toBe(true);
    });

    it("handles null and empty input safely", () => {
      const result = resolveHotelCatalogMatch(null);
      expect(result.matched).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.entity).toBeNull();
    });
  });

  // ==========================================================================
  // 3. PAYMENT CAMPAIGNS & SNAPSHOT RECALCULATION
  // ==========================================================================
  describe("Payment Campaigns & Installment Recalculation", () => {
    it("recalculates 15x campaign from total amount (R$ 4.260 -> 15x R$ 284)", () => {
      const campaign = CANONICAL_PAYMENT_CAMPAIGNS.find(
        (c) => c.id === "camp-excelencia-15x"
      );
      expect(campaign).toBeDefined();

      const snapshot = computePaymentTermsSnapshot({
        totalAmountCents: 426000,
        campaign,
      });

      expect(snapshot.installmentCount).toBe(15);
      expect(snapshot.installmentAmountCents).toBe(28400); // R$ 284,00
      expect(snapshot.totalAmountCents).toBe(426000);
      expect(snapshot.recalculatedFromTotal).toBe(true);
      expect(snapshot.shortStoryLabel).toBe("no boleto e cartão");
    });

    it("recalculates 12x campaign with custom stated installments", () => {
      const snapshot = computePaymentTermsSnapshot({
        totalAmountCents: 426000,
        statedInstallmentCount: 12,
      });

      expect(snapshot.installmentCount).toBe(12);
      expect(snapshot.installmentAmountCents).toBe(35500); // 426000 / 12 = 35500 (R$ 355,00)
    });

    it("derives total amount when only installment is provided", () => {
      const snapshot = computePaymentTermsSnapshot({
        statedInstallmentAmountCents: 28400,
        statedInstallmentCount: 15,
      });

      expect(snapshot.totalAmountCents).toBe(426000);
      expect(snapshot.recalculatedFromTotal).toBe(false);
    });
  });

  // ==========================================================================
  // 4. STORY INCLUSION SELECTOR (NEVER INVENTS MEAL PLANS OR FLIGHTS)
  // ==========================================================================
  describe("Story Content Selector & Inclusion Hierarchy", () => {
    it("never invents breakfast when mealPlan is null or empty", () => {
      const result = selectStoryInclusions({
        hasHotel: true,
        hotelName: "Hotel Central",
        mealPlan: null,
      });

      const hotelInclusion = result.selectedInclusions.find(
        (inc) => inc.category === "hotel_meal_plan"
      );
      expect(hotelInclusion).toBeDefined();
      expect(hotelInclusion?.label).toBe("Hospedagem inclusa");
      expect(hotelInclusion?.label).not.toContain("café");
    });

    it("labels All Inclusive with utensils icon when confirmed", () => {
      const result = selectStoryInclusions({
        hasHotel: true,
        hotelName: "Occidental Punta Cana",
        mealPlan: "All Inclusive",
      });

      const hotelInclusion = result.selectedInclusions.find(
        (inc) => inc.category === "hotel_meal_plan"
      );
      expect(hotelInclusion?.label).toBe("Resort All Inclusive");
      expect(hotelInclusion?.iconKey).toBe("utensils");
    });

    it("labels breakfast with coffee icon when confirmed", () => {
      const result = selectStoryInclusions({
        hasHotel: true,
        hotelName: "Hotel Mar",
        mealPlan: "Café da Manhã",
      });

      const hotelInclusion = result.selectedInclusions.find(
        (inc) => inc.category === "hotel_meal_plan"
      );
      expect(hotelInclusion?.label).toBe("Hospedagem com café");
      expect(hotelInclusion?.iconKey).toBe("coffee");
    });

    it("caps selections to maxSlots (default 4)", () => {
      const result = selectStoryInclusions({
        hasAirfare: true,
        originCity: "Chapecó",
        hasHotel: true,
        hotelName: "Resort Luxo",
        mealPlan: "All Inclusive",
        hasTransfer: true,
        transferLabel: "Traslados in/out",
        majorExperiences: ["Passeio de Barco", "Tour Histórico"],
        hasInsurance: true,
        hasCheckedBaggage: true,
      });

      expect(result.selectedInclusions.length).toBeLessThanOrEqual(4);
      expect(result.selectedInclusions.length).toBeGreaterThanOrEqual(2);
      expect(result.selectedInclusions[0].category).toBe("airfare");
      expect(result.selectedInclusions[1].category).toBe("hotel_meal_plan");
    });

    it("respects hidden labels and excludes them", () => {
      const result = selectStoryInclusions({
        hasAirfare: true,
        originCity: "Chapecó",
        hasHotel: true,
        hiddenLabels: ["Aéreos desde Chapecó"],
      });

      const airfareItem = result.selectedInclusions.find(
        (i) => i.category === "airfare"
      );
      expect(airfareItem).toBeUndefined();
      const decision = result.decisions.find(
        (d) => d.label === "Aéreos desde Chapecó"
      );
      expect(decision?.selected).toBe(false);
      expect(decision?.reasonCode).toBe("USER_HIDDEN");
    });
  });

  // ==========================================================================
  // 5. DYNAMIC STORY TITLE TEXT-FIT
  // ==========================================================================
  describe("Story Title Text-Fit & Double Shadow Layer", () => {
    it("fits short titles in 1 line with large font", () => {
      const fitted = fitStoryTitle("CHILE");
      expect(fitted.lineCount).toBe(1);
      expect(fitted.lines).toEqual(["CHILE"]);
      expect(fitted.fontSizePx).toBe(136);
      expect(fitted.cssVariables["--title-shadow-x"]).toBe("-5px");
      expect(fitted.cssVariables["--title-shadow-y"]).toBe("4px");
    });

    it("fits medium titles in 1 line with proportional font", () => {
      const fitted = fitStoryTitle("PUNTA CANA");
      expect(fitted.lineCount).toBe(1);
      expect(fitted.lines).toEqual(["PUNTA CANA"]);
      expect(fitted.fontSizePx).toBe(114);
    });

    it("splits compound titles (+ separator) into 2 lines", () => {
      const fitted = fitStoryTitle("RECIFE + PORTO DE GALINHAS");
      expect(fitted.lineCount).toBe(2);
      expect(fitted.lines[0]).toBe("RECIFE +");
      expect(fitted.lines[1]).toBe("PORTO DE GALINHAS");
      expect(fitted.fontSizePx).toBeLessThanOrEqual(84);
    });
  });

  // ==========================================================================
  // 6. LIQUID GLASS ENGINE & OPTICAL COMPUTATIONS
  // ==========================================================================
  describe("Liquid Glass Engine & Optical Parameter Calculations", () => {
    it("returns valid 'saved_offer_glass' preset with 19-20% fill and optics", () => {
      const preset = getGlassPreset("saved_offer_glass");
      expect(preset.fill.opacity).toBeGreaterThanOrEqual(0.18);
      expect(preset.fill.opacity).toBeLessThanOrEqual(0.22);
      expect(preset.radius).toBe(30);
      expect(preset.optics.frost).toBe(32);
      expect(preset.optics.refraction).toBe(80);
      expect(preset.optics.dispersion).toBe(34);
    });

    it("normalizes arbitrary glass input defensively", () => {
      const partial: Partial<GlassMaterial> = {
        fill: { color: "var(--background)", opacity: 0.15 },
      };
      const normalized = normalizeGlassMaterial(partial);

      expect(normalized.fill.color).toBeDefined();
      expect(normalized.radius).toBeDefined();
      expect(normalized.backdrop.blurPx).toBeGreaterThan(0);
      expect(normalized.border.color).toBeDefined();
    });

    it("computes complete CSS and optics bundle", () => {
      const preset = getGlassPreset("saved_offer_glass");
      const computed = computeGlassOptics(preset);

      expect(computed.backdropFilterCss).toContain("blur");
      expect(computed.boxShadowCss).toBeDefined();
      expect(computed.displacementScale).toBeGreaterThan(0);
      expect(computed.fillRgbaCss).toBeDefined();
      expect(computed.borderRgbaCss).toBeDefined();
      expect(computed.cssVariables).toBeDefined();
    });
  });

  // ==========================================================================
  // 7. AI NATURAL LANGUAGE EDIT COMMANDS
  // ==========================================================================
  describe("Natural Language AI Edit Commands", () => {
    it("parses 'aumentar título' and increases title font size", () => {
      const dummyDoc = buildStoryDocumentFromOffer({
        offerId: "test-1",
        destinationTitle: "PUNTA CANA",
        datesDisplayText: "19 a 24 de agosto",
        inclusions: [],
        installmentCount: 15,
        installmentCents: 28400,
        priceBasisLabel: "Por pessoa",
        paymentTermsLabel: "no boleto e cartão",
        backgroundImageUrl: "/brand-logo.png",
      });

      const { operations, explanation } = parseNaturalLanguageStoryCommand(
        "Aumentar o título",
        dummyDoc
      );

      expect(operations.length).toBeGreaterThan(0);
      expect(operations[0].op).toBe("set");
      expect(explanation).toContain("Título aumentado");

      const updatedDoc = applyStoryEditOperations(dummyDoc, operations);
      const titleNode = updatedDoc.nodes.find((n) => n.id === "title");
      expect(titleNode?.style?.fontSize).toBeGreaterThan(114);
    });

    it("parses 'trocar para 12x' and recalculates installments", () => {
      const dummyDoc = buildStoryDocumentFromOffer({
        offerId: "test-2",
        destinationTitle: "CHILE",
        datesDisplayText: "Setembro",
        inclusions: [],
        installmentCount: 15,
        installmentCents: 28400,
        totalPriceCents: 426000,
        priceBasisLabel: "Por pessoa",
        paymentTermsLabel: "no boleto e cartão",
        backgroundImageUrl: "/brand-logo.png",
      });

      const { operations } = parseNaturalLanguageStoryCommand(
        "Trocar de 15x para 12x sem mudar o total",
        dummyDoc
      );

      expect(operations.length).toBeGreaterThan(0);
      expect(operations[0].op).toBe("recalculateInstallments");

      const updatedDoc = applyStoryEditOperations(dummyDoc, operations);
      const priceNode = updatedDoc.nodes.find((n) => n.id === "price-glass-card");
      expect(priceNode?.content?.installmentCount).toBe(12);
      expect(priceNode?.content?.installmentCents).toBe(35500); // 426000 / 12 = 35500
    });

    it("parses 'vidro dark' and applies dark_glass preset", () => {
      const dummyDoc = buildStoryDocumentFromOffer({
        offerId: "test-3",
        destinationTitle: "DISNEY",
        datesDisplayText: "Outubro",
        inclusions: [],
        installmentCount: 10,
        installmentCents: 50000,
        priceBasisLabel: "Por pessoa",
        paymentTermsLabel: "no boleto e cartão",
        backgroundImageUrl: "/brand-logo.png",
      });

      const { operations } = parseNaturalLanguageStoryCommand(
        "Deixar o vidro dark",
        dummyDoc
      );

      const updatedDoc = applyStoryEditOperations(dummyDoc, operations);
      const priceNode = updatedDoc.nodes.find((n) => n.id === "price-glass-card");
      expect(priceNode?.glass?.presetId).toBe("dark_glass");
      expect(priceNode?.glass?.fill.color).toBeDefined();
    });
  });

  // ==========================================================================
  // 8. 24H RAPID-OFFER EXPIRATION & LIFECYCLE
  // ==========================================================================
  describe("24h Rapid Offer Lifecycle & Expiration", () => {
    it("identifies offers closing today in timezone", () => {
      const now = new Date("2026-10-21T14:00:00-03:00");
      const expiresToday = "2026-10-21T23:59:59-03:00";
      const expiresTomorrow = "2026-10-22T23:59:59-03:00";

      expect(
        isOfferClosingTodayInTimezone(expiresToday, true, now, "America/Sao_Paulo")
      ).toBe(true);

      expect(
        isOfferClosingTodayInTimezone(expiresTomorrow, true, now, "America/Sao_Paulo")
      ).toBe(false);
    });

    it("returns active state with remaining time for future expiration", () => {
      const now = new Date("2026-10-21T12:00:00-03:00");
      const expiresAt = "2026-10-21T22:00:00-03:00";

      const evalResult = evaluateOfferLifecycleState({ expiresAt }, now);

      expect(evalResult.isExpired).toBe(false);
      expect(evalResult.publicBannerMessage).toBeNull();
      expect(evalResult.ctaLabel).toBe("Garantir Vaga pelo WhatsApp");
      expect(evalResult.remainingHoursText).toContain("10h");
    });

    it("returns expired state with banner and WhatsApp CTA for past expiration", () => {
      const now = new Date("2026-10-22T08:00:00-03:00");
      const expiresAt = "2026-10-21T23:59:59-03:00";

      const evalResult = evaluateOfferLifecycleState({ expiresAt }, now);

      expect(evalResult.isExpired).toBe(true);
      expect(evalResult.publicBannerMessage).toContain("Oferta expirada");
      expect(evalResult.ctaLabel).toBe("Consultar valor atualizado no WhatsApp");
    });
  });

  // ==========================================================================
  // 9. WHATSAPP OFFER COPY GENERATOR & STRICT "HOJE" RULE
  // ==========================================================================
  describe("WhatsApp Offer Copy Generator", () => {
    it("generates structured WhatsApp text with strict HOJE disclaimer when closing today", () => {
      const copy = generateWhatsAppOfferCopy({
        destinationTitle: "PUNTA CANA",
        datesDisplayText: "19 a 24 de agosto",
        originCity: "Chapecó",
        hasAirfare: true,
        hotelName: "Occidental Punta Cana",
        mealPlanLabel: "All Inclusive",
        hasTransfer: true,
        installmentCount: 15,
        installmentCents: 28400,
        totalPriceCents: 426000,
        priceBasisLabel: "Por pessoa",
        occupancySummaryLabel: "Em apartamento duplo",
        paymentMethodsLabel: "no boleto ou cartão",
        expiresAt: "2026-10-21T23:59:59-03:00",
        referenceNow: new Date("2026-10-21T14:00:00-03:00"),
        publicOfferUrl: "https://waesy.com/store/oferta/punta-cana",
      });

      expect(copy).toContain("*PUNTA CANA* — 19 a 24 de agosto");
      expect(copy).toContain("Aéreos de ida e volta desde Chapecó");
      expect(copy).toContain("Occidental Punta Cana");
      expect(copy).toContain("All Inclusive");
      expect(copy).toContain("Traslados de chegada e saída");
      expect(copy).toMatch(/15x de \*R\$[\s\u00a0]284,00\* no boleto ou cartão/);
      expect(copy).toContain("Valor disponível para fechamento HOJE.");
      expect(copy).toContain("https://waesy.com/store/oferta/punta-cana");
      expect(copy).not.toContain("Voos:"); // Flight times omitted by default
    });

    it("omits strict HOJE when offer expires tomorrow", () => {
      const copy = generateWhatsAppOfferCopy({
        destinationTitle: "CHILE",
        datesDisplayText: "Setembro",
        installmentCount: 12,
        installmentCents: 35500,
        priceBasisLabel: "Por pessoa",
        paymentMethodsLabel: "no boleto ou cartão",
        expiresAt: "2026-10-25T18:00:00-03:00",
        referenceNow: new Date("2026-10-21T14:00:00-03:00"),
        publicOfferUrl: "https://waesy.com/store/oferta/chile",
      });

      expect(copy).not.toContain("Valor disponível para fechamento HOJE.");
      expect(copy).toContain("Cotação válida até");
    });
  });

  // ==========================================================================
  // 10. GLOBAL PRICE OBSERVATION & PARTY SIGNATURE
  // ==========================================================================
  describe("Global Price Observation & Signature", () => {
    it("builds deterministic party signature", () => {
      const sig1 = buildPartySignature({
        adults: 2,
        children: 0,
        infants: 0,
        childAges: [],
        labelMode: "couple",
      });
      expect(sig1).toBe("2A-0C-0I");

      const sig2 = buildPartySignature({
        adults: 2,
        children: 1,
        infants: 0,
        childAges: [8],
        labelMode: "family",
      });
      expect(sig2).toBe("2A-1C(8)-0I");
    });

    it("builds complete PriceObservation without loss of context", () => {
      const mockOffer: TravelOffer = {
        id: "offer-test-123",
        slug: "punta-cana-15x",
        status: "published",
        offerType: "quick_quote",
        sourceArtifacts: [
          {
            id: "art-1",
            kind: "screenshot",
            extractedAt: "2026-10-21T10:00:00Z",
          },
        ],
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
          installmentAmountCents: 28400,
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
          url: "https://waesy.com/store/oferta/punta-cana-15x",
          includeFlightTimes: false,
        },
        whatsappCopy: {
          text: "",
          includeFlightTimes: false,
        },
        storyDocument: {} as any,
        reviewFlags: [],
      };

      const obs = buildPriceObservation(mockOffer, "CVC Corp");
      expect(obs.destination).toBe("Punta Cana");
      expect(obs.partySignature).toBe("2A-0C-0I");
      expect(obs.supplierName).toBe("CVC Corp");
      expect(obs.installmentCount).toBe(15);
      expect(obs.installmentAmountCents).toBe(28400);
      expect(obs.totalPriceCents).toBe(426000);
    });
  });
});
