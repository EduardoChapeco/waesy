import { describe, expect, it } from "vitest";
import {
  GLOBAL_HOTELS_RESORTS_CATALOG,
  normalizeHotelName,
  searchHotelsCatalog,
  getHotelByNameOrSlug,
} from "@/lib/data/hotels-resorts-catalog";
import { CANONICAL_DESTINATIONS, searchCanonicalDestinations } from "@/lib/destinations-catalog";
import { MinedHotelStructuredSchema } from "@/services/hotel-mining.functions";

describe("Ecossistema Canônico de Hotéis, Resorts e Destinos (SSOT)", () => {
  it("normaliza nomes removendo acentuações, símbolos e espaços redundantes", () => {
    expect(normalizeHotelName("Salinas do Maragogi All Inclusive Resort")).toBe(
      "salinas do maragogi all inclusive resort",
    );
    expect(normalizeHotelName("Nannai Muro Alto Resort & Spa!")).toBe(
      "nannai muro alto resort spa",
    );
    expect(normalizeHotelName("Vila Galé Marés - Guarajuba")).toBe(
      "vila gale mares guarajuba",
    );
  });

  it("garante catálogo canônico com resorts renomados e dados estruturados", () => {
    expect(GLOBAL_HOTELS_RESORTS_CATALOG.length).toBeGreaterThanOrEqual(5);

    const salinas = GLOBAL_HOTELS_RESORTS_CATALOG.find((h) =>
      h.name.includes("Salinas do Maragogi"),
    );
    expect(salinas).toBeDefined();
    expect(salinas?.city).toBe("Maragogi");
    expect(salinas?.state).toBe("AL");
    expect(salinas?.stars).toBe(5);
    expect(salinas?.policies.check_in).toBe("15:00");
    expect(salinas?.policies.check_out).toBe("12:00");
    expect(salinas?.room_categories.length).toBeGreaterThanOrEqual(1);

    const nannai = GLOBAL_HOTELS_RESORTS_CATALOG.find((h) =>
      h.name.includes("Nannai Muro Alto"),
    );
    expect(nannai).toBeDefined();
    expect(nannai?.city).toContain("Ipojuca");
    expect(nannai?.state).toBe("PE");
  });

  it("executa busca de hotéis por texto tolerante a tokens e localização", () => {
    const resultsMaragogi = searchHotelsCatalog("maragogi");
    expect(resultsMaragogi.length).toBeGreaterThan(0);
    expect(resultsMaragogi[0].city).toBe("Maragogi");

    const resultsNannai = searchHotelsCatalog("nannai muro alto");
    expect(resultsNannai.length).toBeGreaterThan(0);
    expect(resultsNannai[0].name).toContain("Nannai");

    const resultsGramado = searchHotelsCatalog("gramado");
    expect(resultsGramado.length).toBeGreaterThan(0);
    expect(resultsGramado[0].city).toBe("Gramado");
  });

  it("recupera hotel por slug canônico ou nome aproximado", () => {
    const hotel = getHotelByNameOrSlug("carmel-taiba-exclusive-resort");
    expect(hotel).toBeDefined();
    expect(hotel?.city).toContain("Taíba");
    expect(hotel?.state).toBe("CE");
  });

  it("garante catálogo de destinos canônicos e busca por cidade e IATA", () => {
    expect(CANONICAL_DESTINATIONS.length).toBeGreaterThanOrEqual(10);

    const porto = searchCanonicalDestinations("Porto de Galinhas");
    expect(porto.length).toBeGreaterThan(0);
    expect(porto[0].iata).toBe("REC");

    const iataSearch = searchCanonicalDestinations("REC");
    expect(iataSearch.length).toBeGreaterThan(0);

    const gramado = searchCanonicalDestinations("gramado");
    expect(gramado.length).toBeGreaterThan(0);
  });

  it("valida schema de mineração estruturada de hotéis garantindo completude", () => {
    const mockMined = {
      name: "Resort Teste Beira Mar",
      city: "Porto de Galinhas",
      state: "PE",
      country: "Brasil",
      stars: 5,
      regime_options: ["All Inclusive"],
      description: "Resort de luxo pé na areia com infraestrutura completa.",
      bio_bullets: ["Complexo aquático", "Monitores infantis"],
      badges: ["All Inclusive", "Pé na Areia"],
      policies: {
        check_in_time: "15:00",
        check_out_time: "12:00",
        children_policy: "Até 2 crianças cortesia",
        pet_friendly: false,
        voltage: "220V",
        accessibility_pcd: true,
        cancellation_policy: "Até 7 dias antes sem custos",
        smoking_policy: "100% não fumante",
      },
      structure: {
        pools_count: 3,
        beach_setup: "Pé na areia com espreguiçadeiras e quiosque",
        kids_club: true,
        spa: true,
        gym: true,
        sports: ["Beach Tennis"],
        restaurants: [{ name: "Restaurante Central", cuisine: "Internacional", regime: "Incluso" }],
      },
      room_categories: [
        {
          id: "quarto-1",
          name: "Suíte Luxo Mar",
          description: "Vista frontal para o mar com varanda e hidromassagem.",
          capacity_adults: 2,
          capacity_children: 1,
          max_guests: 3,
          bedding: "1 Cama King",
          size_m2: 45,
          amenities: ["Ar Condicionado", "Hidromassagem", "Wi-Fi"],
          photos: [],
        },
      ],
      nearby_attractions: [
        { name: "Praia de Muro Alto", category: "Praia", distance_km: 0.5 },
      ],
      confidence_score: 0.95,
    };

    const parsed = MinedHotelStructuredSchema.parse(mockMined);
    expect(parsed.name).toBe("Resort Teste Beira Mar");
    expect(parsed.policies.check_in_time).toBe("15:00");
    expect(parsed.structure.pools_count).toBe(3);
    expect(parsed.room_categories[0].size_m2).toBe(45);
    expect(parsed.nearby_attractions[0].name).toBe("Praia de Muro Alto");
  });
});
