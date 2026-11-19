import { describe, expect, it } from "vitest";
import {
  buildDeterministicProposalItinerary,
  normalizeExtractedQuoteResult,
  parseMoneyToCents,
} from "./quote-ocr-normalizer";
import {
  CORPUS_FORTALEZA_COMBINED_CITY_TOUR,
  CORPUS_JERI_4X4,
  CORPUS_ORC_PDF_SANTIAGO,
  CORPUS_PORTO_MULTI_TOURS,
} from "./__tests__/quote-corpus-fixtures";

describe("quote-ocr-normalizer (Corpus Real Downloads/orçamento)", () => {
  it("corrige conversão monetária: não multiplica _cents <= 50000 por 100", () => {
    expect(parseMoneyToCents(24306, { keyIsCents: true })).toBe(24306);
    expect(parseMoneyToCents(20833, { keyIsCents: true })).toBe(20833);
    expect(parseMoneyToCents("BRL 4.683,38")).toBe(468338);
    expect(parseMoneyToCents("R$ 844,32")).toBe(84432);
    expect(parseMoneyToCents(4749.77)).toBe(474977);
  });

  it("FRT Fortaleza: extrai City Tour combinado da linha do Transfer e mantém preços exatos", () => {
    const out = normalizeExtractedQuoteResult(CORPUS_FORTALEZA_COMBINED_CITY_TOUR);

    expect(out.destination).toBe("Fortaleza");
    expect(out.adults_count).toBe(2);
    expect(out.children_count).toBe(1);
    expect(out.gross_price_cents).toBe(1041508);
    expect(out.transfers).toHaveLength(1);
    expect(out.transfers[0].name).toBe(
      "Transporte Aeroporto de Fortaleza (FOR) / Hotel em Fortaleza / Aeroporto Fortaleza",
    );
    expect(out.transfers[0].price_cents).toBe(24306);
    expect(out.tours.map((t) => t.title)).toEqual([
      "Passeio a Praia do Beach Park",
      "Ingresso Combo-1 dia-Aqua Park - COMBO 2x Ingresso Adulto-1 dia-Aqua Park e 1x Ingresso Criança-1 dia-Aqua Park",
      "Passeio City Tour Fortaleza",
    ]);
    expect(out.tours[0].price_cents).toBe(20833);
    expect(out.tours[1].price_cents).toBe(89658);
    expect(out.confidence_by_field.pricing).toBeGreaterThanOrEqual(0.9);
  });

  it("FRT Jericoacoara: preserva veículo 4x4 e Transfer In+Out regular em Porto sem falso split", () => {
    const jeri = normalizeExtractedQuoteResult(CORPUS_JERI_4X4);
    expect(jeri.transfers).toHaveLength(1);
    expect(jeri.transfers[0].vehicle).toBe("Veículo 4x4");
    expect(jeri.transfers[0].price_cents).toBe(50000);
    expect(jeri.tours).toHaveLength(0);

    const porto = normalizeExtractedQuoteResult(CORPUS_PORTO_MULTI_TOURS);
    expect(porto.transfers).toHaveLength(1);
    expect(porto.transfers[0].name).toContain("Transfer In+Out regular");
    expect(porto.transfers[0].price_cents).toBe(58056);
    expect(porto.tours).toHaveLength(4);
    expect(porto.tours[0].date).toBe("2027-02-19");
    expect(porto.tours[3].date).toBe("2027-02-23");
  });

  it("Orcamento.pdf Santiago: extrai multi-escala Latam, Torremayor Lyon e gera roteiro completo de 7 dias", () => {
    const scl = normalizeExtractedQuoteResult(CORPUS_ORC_PDF_SANTIAGO);
    expect(scl.hotels[0].hotel_name).toBe("Torremayor Lyon");
    expect(scl.flights[0].stops_count).toBe(2);
    expect(scl.gross_price_cents).toBe(1049133);
    expect(scl.card_installments).toBe(10);

    const days = buildDeterministicProposalItinerary({
      destination: scl.destination,
      startDate: scl.travel_start,
      endDate: scl.travel_end,
      flights: scl.flights,
      hotels: scl.hotels,
      transfers: scl.transfers,
      tours: scl.tours,
    });

    expect(days).toHaveLength(7);
    expect(days[0].title).toContain("Dia 1");
    expect(days[0].description).toContain("Torremayor Lyon");
    expect(days[6].title).toContain("Retorno");
  });

  it("Porto de Galinhas: aloca cada passeio datado no dia exato do roteiro", () => {
    const porto = normalizeExtractedQuoteResult(CORPUS_PORTO_MULTI_TOURS);
    const days = buildDeterministicProposalItinerary({
      destination: porto.destination,
      startDate: porto.travel_start,
      endDate: porto.travel_end,
      flights: porto.flights,
      hotels: porto.hotels,
      transfers: porto.transfers,
      tours: porto.tours,
    });

    expect(days).toHaveLength(7);
    expect(days[1].date).toBe("2027-02-19");
    expect(days[1].title).toContain("Cabo de Sto Agostinho");
    expect(days[2].title).toContain("São José da Coroa Grande");
    expect(days[4].title).toContain("Praia dos Carneiros");
    expect(days[5].title).toContain("Maragogi/AL");
  });

  it("marca review_flags quando confiança < 0.6", () => {
    const weak = normalizeExtractedQuoteResult({ destination: "", hotels: [], transfers: [] });
    expect(weak.confidence_by_field.destination).toBeLessThan(0.6);
    expect(weak.confidence_by_field.pricing).toBeLessThan(0.6);
    expect(weak.review_flags.length).toBeGreaterThanOrEqual(2);
  });
});
