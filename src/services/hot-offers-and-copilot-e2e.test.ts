import { describe, expect, it } from "vitest";
import {
  applyClientOverrideToInheritedProposal,
  assertHotOfferZeroPii,
  buildClientProposalFromMasterOffer,
  buildHotOfferWhatsAppGroupCopy,
  FORBIDDEN_HOT_OFFER_PII_KEYS,
  sanitizeProposalToHotOfferPayload,
  scrubLeadPiiFromText,
  type HotOfferDTO,
} from "@/lib/tourism/hot-offer-sanitizer";
import type { TravelProposalDTO } from "@/services/travel-proposal.functions";

describe("Hot Ofertas Black, Copilot @oferta & Herança E2E", () => {
  const mockClientPii = {
    clientName: "Carlos Eduardo Silva",
    clientWhatsapp: "49998887766",
    clientEmail: "carlos.silva@exemplo.com.br",
    clientDocument: "01234567890",
  };

  const mockProposal: TravelProposalDTO = {
    id: "prop-original-123",
    store_id: "store-456",
    quote_id: "quote-789",
    public_token: "token-abc",
    agency_name: "Excelência Viagens",
    title: "Pacote Natal em Família para Carlos Eduardo Silva",
    subtitle: "Roteiro exclusivo com voos e resort",
    cover_image_url: "https://example.com/natal.jpg",
    client_name: "Carlos Eduardo Silva",
    customer_name: "Carlos Eduardo Silva",
    client_whatsapp: "49998887766",
    client_email: "carlos.silva@exemplo.com.br",
    client_document: "01234567890",
    special_notes: "Cliente VIP, prefere andar alto e quarto silencioso.",
    access_pin: "9876",
    adults_count: 2,
    children_count: 0,
    destination_city: "Natal",
    travel_start_date: "2027-01-10",
    travel_end_date: "2027-01-17",
    flights: [
      {
        origin_city: "Chapecó",
        origin_code: "XAP",
        destination_city: "Natal",
        destination_code: "NAT",
        airline: "Azul",
        departure_date: "2027-01-10",
      },
    ],
    hotels: [
      {
        hotel_name: "Wish Natal Resort",
        room_type: "Superior Vista Mar",
        meal_plan: "Café da Manhã",
        nights: 7,
      },
    ],
    itinerary: [
      {
        day_number: 1,
        title: "Chegada em Natal",
        description: "Recepção no aeroporto para Carlos Eduardo Silva e traslado privativo.",
      },
    ],
    transfers: [
      {
        origin: "Aeroporto NAT",
        destination: "Wish Natal",
        date: "2027-01-10",
        pickup_time: "14:00",
      },
    ],
    tours: [],
    rooms: [],
    includes: ["Aéreo Ida e Volta", "Hospedagem 7 noites", "Traslados"],
    excludes: ["Passeios opcionais"],
    pricing: {
      currency: "BRL",
      subtotal_cents: 800000,
      discount_cents: 0,
      taxes_cents: 0,
      final_total_cents: 800000,
      price_per_person_cents: 400000,
      installments_max: 10,
      installment_value_cents: 80000,
      pix_discount_percent: 5,
      pix_total_cents: 760000,
    },
    canvas_format: "story",
    template_theme: "luxury",
    status: "approved",
    created_at: "2026-11-17T12:00:00Z",
    updated_at: "2026-11-17T12:00:00Z",
  };

  it("1. Higienização Zero-PII: sanitiza completamente proposta para Oferta-Mestre", () => {
    const sanitized = sanitizeProposalToHotOfferPayload({
      proposal: mockProposal,
      storeId: "store-456",
      storeSlug: "excelencia",
      historicalCheck: {
        sampleCount: 12,
        historicalMedianCents: 480000,
        historicalMinCents: 400000,
        historicalMaxCents: 550000,
        comparedUnitCents: 400000,
        historicalSavingsPct: 16.67,
        verdict: "great_deal",
        verdictLabelPt: "Excelente oportunidade histórica",
      },
    });

    // Validates zero PII forbidden keys
    for (const forbiddenKey of FORBIDDEN_HOT_OFFER_PII_KEYS) {
      expect((sanitized as any)[forbiddenKey]).toBeUndefined();
    }

    // Title and itinerary descriptions must not contain client's name or document
    expect(sanitized.title).not.toContain("Carlos Eduardo Silva");
    expect(sanitized.itinerary[0].description).not.toContain("Carlos Eduardo Silva");

    // Hard assert Zero-PII pass
    const audit = assertHotOfferZeroPii(sanitized as unknown as Record<string, unknown>, mockClientPii);
    expect(audit.valid).toBe(true);
    expect(audit.violations).toHaveLength(0);

    // Veredito histórico vantajoso ativa badge hot_black
    expect(sanitized.badge_kind).toBe("hot_black");
    expect(sanitized.flame_style).toBe("hot_black");
  });

  it("2. Copy de Grupo WhatsApp: formata resumo estruturado com link rastreado no App", () => {
    const { trackedUrl, summaryCopy } = buildHotOfferWhatsAppGroupCopy({
      title: "Pacote Natal Especial",
      destinationCity: "Natal",
      departureDate: "2027-01-10",
      returnDate: "2027-01-17",
      nightsCount: 7,
      adultsCount: 2,
      priceCents: 800000,
      installmentsMax: 10,
      badgeKind: "hot_black",
      historicalSavingsPct: 16.67,
      hotelHeadline: "Wish Natal Resort",
      includesHeadline: ["Aéreo Ida e Volta", "Hospedagem 7 noites"],
      appSlug: "excelencia",
      offerIdOrSlug: "oferta-natal-789",
    });

    expect(trackedUrl).toContain("/app/excelencia?offer=oferta-natal-789");
    expect(trackedUrl).toContain("utm_source=whatsapp_group");
    expect(summaryCopy).toContain("OFERTA HOT BLACK SELECIONADA");
    expect(summaryCopy).toContain("Wish Natal Resort");
    expect(summaryCopy).toContain("Até 10x de R$ 800,00");
  });

  it("3. Herança Bilateral: gera proposta por cliente vinculada à Oferta-Mestre sem mutar o Master", () => {
    const masterOffer: HotOfferDTO = {
      id: "master-offer-999",
      store_id: "store-456",
      slug: "natal-especial-999",
      title: "Pacote Natal Especial",
      subtitle: "Voos + Resort 7 noites",
      badge_kind: "hot_black",
      flame_style: "hot_black",
      destination_city: "Natal",
      nights_count: 7,
      adults_base_count: 2,
      children_base_count: 0,
      price_cents: 800000,
      historical_verdict: "great_deal",
      installments_max: 10,
      installment_value_cents: 80000,
      pix_discount_pct: 5,
      flights: mockProposal.flights,
      hotels: mockProposal.hotels,
      transfers: mockProposal.transfers,
      itinerary: mockProposal.itinerary,
      inclusions: mockProposal.includes,
      exclusions: mockProposal.excludes,
      media_urls: ["https://example.com/natal.jpg"],
      status: "active",
      is_published_in_app: true,
      views_count: 0,
      clicks_count: 0,
      leads_generated_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Client A: 2 adultos (preço base R$ 8.000)
    const clientAProposal = buildClientProposalFromMasterOffer({
      masterOffer,
      leadId: "lead-client-a",
      clientName: "Mariana Costa",
      clientWhatsapp: "49991112233",
    });

    expect(clientAProposal.source_offer_id).toBe(masterOffer.id);
    expect(clientAProposal.client_name).toBe("Mariana Costa");
    expect(clientAProposal.pricing.final_total_cents).toBe(800000);

    // Client B: 2 adultos + 1 criança de 4 anos
    const clientBProposal = buildClientProposalFromMasterOffer({
      masterOffer,
      leadId: "lead-client-b",
      clientName: "Roberto Lima",
      clientWhatsapp: "49994445566",
      adultsCount: 2,
      childrenCount: 1,
      childrenAges: [4],
    });

    // Child adds 65% of adult base (400000 * 0.65 = 260000) -> 800000 + 260000 = 1060000 (R$ 10.600)
    expect(clientBProposal.pricing.final_total_cents).toBe(1060000);
    expect(clientBProposal.children_count).toBe(1);

    // Master Offer remains unchanged at 800000
    expect(masterOffer.price_cents).toBe(800000);
    expect(masterOffer.adults_base_count).toBe(2);
  });

  it("4. Mutação Cirúrgica por Cliente: personalizar Proposta A não altera Proposta B nem a Oferta-Mestre", () => {
    const masterOffer: HotOfferDTO = {
      id: "master-offer-999",
      store_id: "store-456",
      slug: "natal-especial-999",
      title: "Pacote Natal Especial",
      destination_city: "Natal",
      nights_count: 7,
      adults_base_count: 2,
      children_base_count: 0,
      price_cents: 800000,
      badge_kind: "hot_offer",
      flame_style: "pixel_fire",
      historical_verdict: "great_deal",
      installments_max: 10,
      pix_discount_pct: 5,
      flights: mockProposal.flights,
      hotels: mockProposal.hotels,
      transfers: mockProposal.transfers,
      itinerary: mockProposal.itinerary,
      inclusions: mockProposal.includes,
      exclusions: mockProposal.excludes,
      media_urls: [],
      status: "active",
      is_published_in_app: true,
      views_count: 0,
      clicks_count: 0,
      leads_generated_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const propA = buildClientProposalFromMasterOffer({
      masterOffer,
      clientName: "Mariana Costa",
      clientWhatsapp: "49991112233",
    });

    const propB = buildClientProposalFromMasterOffer({
      masterOffer,
      clientName: "Roberto Lima",
      clientWhatsapp: "49994445566",
    });

    // Apply surgical override ONLY to Client A: change room to Suite Luxo and price
    const modifiedA = applyClientOverrideToInheritedProposal(
      propA,
      {
        roomType: "Suíte Luxo Frente Mar",
        overridePriceCents: 950000,
        overrideNotes: "Upgrade para Suíte Luxo concedido.",
      },
      400000
    );

    expect(modifiedA.hotels[0].room_type).toBe("Suíte Luxo Frente Mar");
    expect(modifiedA.pricing.final_total_cents).toBe(950000);
    expect(modifiedA.override_notes).toBe("Upgrade para Suíte Luxo concedido.");

    // Prop B and Master Offer are strictly unaffected
    expect(propB.hotels[0].room_type).toBe("Superior Vista Mar");
    expect(propB.pricing.final_total_cents).toBe(800000);
    expect(masterOffer.price_cents).toBe(800000);
  });
});
