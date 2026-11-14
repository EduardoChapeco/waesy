import { describe, expect, it } from "vitest";
import { proposalToEditorialClassified } from "./proposal-editorial-mapper";
import type { TravelProposalDTO } from "@/services/travel-proposal.functions";

function makeSampleProposal(overrides?: Partial<TravelProposalDTO>): TravelProposalDTO {
  return {
    id: "prop-token-123",
    store_id: null,
    agency_name: "Excelência Tour SMO",
    agency_logo_url: "https://cdn.waesy.com/agency-logo.png",
    agency_whatsapp: "49999998888",
    quote_id: null,
    public_token: "prop-token-123",
    title: "Porto de Galinhas Premium",
    subtitle: "Férias em família no litoral pernambucano",
    cover_image_url: "https://cdn.waesy.com/porto-cover.jpg",
    client_name: "Marciana",
    client_whatsapp: "49988887777",
    client_email: "marciana@example.com",
    adults_count: 2,
    children_count: 1,
    destination_city: "Porto de Galinhas",
    travel_start_date: "2027-01-30",
    travel_end_date: "2027-02-03",
    flights: [
      {
        type: "outbound",
        airline: "Azul",
        flight_number: "AD 4120",
        origin_iata: "XAP",
        origin_city: "Chapecó",
        destination_iata: "REC",
        destination_city: "Recife",
        departure_date: "2027-01-30",
        departure_time: "06:15",
        arrival_time: "11:40",
        baggage: "1 mala de mão 10kg + 1 despachada 23kg",
        stops_count: 1,
      },
      {
        type: "return",
        airline: "Azul",
        flight_number: "AD 4121",
        origin_iata: "REC",
        origin_city: "Recife",
        destination_iata: "XAP",
        destination_city: "Chapecó",
        departure_date: "2027-02-03",
        departure_time: "15:20",
        arrival_time: "20:50",
        stops_count: 1,
      },
    ],
    hotels: [
      {
        id: "h-1",
        hotel_name: "Summerville Resort",
        destination: "Porto de Galinhas",
        checkin_date: "2027-01-30",
        checkout_date: "2027-02-03",
        nights_count: 4,
        room_type: "Suíte Luxo Família",
        board_basis: "All Inclusive",
        stars: 5,
        featured_image_url: "https://cdn.waesy.com/hotel-1.jpg",
        amenities: ["Piscina térmica", "Frente mar"],
      },
    ],
    itinerary: [
      {
        day_number: 1,
        date: "2027-01-30",
        title: "Chegada e Check-in",
        description: "Recepção no aeroporto do Recife e traslado até o resort.",
        location: "Summerville Resort",
        included_meals: ["Jantar", "Café da manhã"],
      },
    ],
    transfers: [
      {
        id: "tr-1",
        type: "Privativo",
        vehicle: "Van Executiva Luxo",
        route: "Aeroporto Recife <-> Porto de Galinhas",
        is_private: true,
        pickup_time: "12:15",
      },
    ],
    tours: [
      {
        id: "tour-1",
        title: "Passeio de Jangada às Piscinas Naturais",
        description: "Saída pela manhã na maré baixa",
        duration: "3h",
        is_included: true,
      },
    ],
    includes: ["Passagem aérea ida e volta", "Traslados privativos", "4 noites All Inclusive"],
    excludes: ["Despesas pessoais", "Passeios opcionais não listados"],
    pricing: {
      currency: "BRL",
      base_price_cents: 1366062,
      boarding_tax_cents: 100000,
      other_taxes_cents: 0,
      discount_cents: 0,
      total_price_cents: 1466062,
      installments_options: [
        { installments_count: 10, installment_value_cents: 146606, method: "Cartão de Crédito", has_interest: false },
      ],
      payment_terms: "10x sem juros no cartão ou PIX com confirmação imediata",
    },
    template_id: "clean-apple",
    canvas_format: "a4-portrait",
    special_notes: "SEGREDO INTERNO: comissão extra",
    status: "sent",
    valid_until: "2026-12-15T23:59:59.000Z",
    created_at: "2026-11-14T10:00:00.000Z",
    updated_at: "2026-11-14T10:00:00.000Z",
    ...overrides,
  };
}

describe("proposalToEditorialClassified", () => {
  it("synchronizes flights, hotels, itinerary, transfers, tours, includes/excludes, and pricing into EditorialShowcaseView shape", () => {
    const proposal = makeSampleProposal();
    const mapped = proposalToEditorialClassified(proposal);

    expect(mapped.id).toBe("prop-token-123");
    expect(mapped.title).toBe("Porto de Galinhas Premium");
    expect(mapped.price_cents).toBe(1466062);
    expect(mapped.is_custom_quote).toBe(true);
    expect(mapped.images).toEqual([
      "https://cdn.waesy.com/porto-cover.jpg",
      "https://cdn.waesy.com/hotel-1.jpg",
    ]);

    expect(mapped.store.name).toBe("Excelência Tour SMO");
    expect(mapped.store.is_verified).toBe(true);
    expect(mapped.contact_whatsapp).toBe("49999998888");

    expect(mapped.attributes.destination_city).toBe("Porto de Galinhas");
    expect(mapped.attributes.departure_city).toBe("Chapecó");
    expect(mapped.attributes.duration_days).toBe(5);
    expect(mapped.attributes.duration_nights).toBe(4);
    expect(mapped.attributes.duration_text).toBe("5 dias / 4 noites");
    expect(mapped.attributes.guests_text).toBe("2 adultos + 1 criança");
    expect(mapped.attributes.meal_plan).toBe("All Inclusive");
    expect(mapped.attributes.max_installments).toBe(10);
    expect(mapped.attributes.card_interest_free).toBe(true);
    expect(mapped.attributes.offer_expires_at).toBe("2026-12-15T23:59:59.000Z");

    expect(mapped.attributes.flight_details?.departure_iata).toBe("XAP");
    expect(mapped.attributes.flight_details?.arrival_iata).toBe("REC");
    expect(mapped.attributes.flight_details?.segments).toHaveLength(2);
    expect(mapped.attributes.flight_details?.segments?.[0]?.direction).toBe("ida");
    expect(mapped.attributes.flight_details?.segments?.[0]?.baggage?.checked_bag_count).toBe(1);
    expect(mapped.attributes.flight_details?.segments?.[1]?.direction).toBe("volta");

    expect(mapped.attributes.lodgings).toHaveLength(1);
    expect(mapped.attributes.lodgings[0].name).toBe("Summerville Resort");
    expect(mapped.attributes.lodgings[0].images).toEqual(["https://cdn.waesy.com/hotel-1.jpg"]);

    expect(mapped.attributes.transfers_and_tours).toHaveLength(2);
    expect(mapped.attributes.transfers_and_tours[0].title).toBe("Aeroporto Recife <-> Porto de Galinhas");
    expect(mapped.attributes.transfers_and_tours[1].type).toBe("included");

    expect(mapped.attributes.itinerary_days).toHaveLength(1);
    expect(mapped.attributes.itinerary_days[0].meals_included).toEqual(["dinner", "breakfast"]);

    expect(mapped.attributes.inclusions).toEqual(proposal.includes);
    expect(mapped.attributes.exclusions).toEqual(proposal.excludes);
  });

  it("enforces B.33 zero fake stock images when proposal has no media URLs", () => {
    const proposal = makeSampleProposal({
      cover_image_url: null,
      hotels: [
        {
          hotel_name: "Hotel Sem Foto",
          featured_image_url: "",
          image_url: "",
        },
      ],
      itinerary: [
        {
          day_number: 1,
          title: "Dia 1",
          description: "Chegada",
          image_url: "",
        },
      ],
      tours: [],
    });

    const mapped = proposalToEditorialClassified(proposal);
    expect(mapped.images).toEqual([]);
    expect(mapped.feed_media).toEqual([]);
    expect(mapped.attributes.lodgings[0].images).toEqual([]);
    expect(mapped.attributes.itinerary_days[0].images).toEqual([]);
  });

  it("never leaks private client PII (whatsapp, email, special_notes) into serialized showcase fields", () => {
    const proposal = makeSampleProposal();
    const mapped = proposalToEditorialClassified(proposal);
    const serialized = JSON.stringify(mapped);

    expect(serialized).not.toContain("49988887777");
    expect(serialized).not.toContain("marciana@example.com");
    expect(serialized).not.toContain("SEGREDO INTERNO");
  });
});
