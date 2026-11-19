import { describe, expect, it } from "vitest";
import {
  buildDefaultWebPageConfig,
  extractImageUrlsFromMedia,
  normalizeEntityMediaList,
  normalizeHotelsList,
  normalizeProposalOptionsAndHotels,
  normalizeToursList,
  normalizeTransfersList,
  resolveTransferDisplayTitle,
} from "./proposal-normalization";
import { CORPUS_FORTALEZA_JERI_MULTI_TRANSFER_AND_LEGACY_OPTIONS } from "./__tests__/quote-corpus-fixtures";

describe("proposal-normalization (D1–D5 Root Causes)", () => {
  it("D1/D2: colapsa opções clonadas erroneamente de hotéis do mesmo pacote mantendo hospedagens únicas", () => {
    const res = normalizeProposalOptionsAndHotels(
      CORPUS_FORTALEZA_JERI_MULTI_TRANSFER_AND_LEGACY_OPTIONS.hotels,
      CORPUS_FORTALEZA_JERI_MULTI_TRANSFER_AND_LEGACY_OPTIONS.options,
    );

    expect(res.collapsedAccidentalHotelOptions).toBe(true);
    expect(res.options).toHaveLength(0);
    // Hotel Diogo clonado nas mesmas datas foi unificado sem perder suas 3 imagens; Pousada Angélica preservada
    expect(res.hotels).toHaveLength(2);
    expect(res.hotels[0].hotel_name).toBe("Hotel Diogo");
    expect(res.hotels[0].images).toHaveLength(3);
    expect(res.hotels[1].hotel_name).toBe("Pousada Angélica");
  });

  it("D1: preserva opções comparativas reais com preços diferentes ou pacotes vinculados", () => {
    const realOptions = [
      {
        id: "prop-a",
        source_proposal_id: "uuid-a",
        name: "Pacote Econômico — Pousada",
        hotel_name: "Pousada Angélica",
        pricing: { total_price_cents: 520000, base_price_cents: 520000, boarding_tax_cents: 0, other_taxes_cents: 0, discount_cents: 0, currency: "BRL", installments_options: [] },
      },
      {
        id: "prop-b",
        source_proposal_id: "uuid-b",
        name: "Pacote Premium — Resort",
        hotel_name: "Beach Park Resort",
        pricing: { total_price_cents: 940000, base_price_cents: 940000, boarding_tax_cents: 0, other_taxes_cents: 0, discount_cents: 0, currency: "BRL", installments_options: [] },
      },
    ];

    const res = normalizeProposalOptionsAndHotels([], realOptions);
    expect(res.collapsedAccidentalHotelOptions).toBe(false);
    expect(res.options).toHaveLength(2);
    expect(res.options[0].name).toBe("Pacote Econômico — Pousada");
  });

  it("D2: preserva Split Stay no mesmo hotel quando as datas de check-in/out são diferentes", () => {
    const hotels = normalizeHotelsList([
      { hotel_name: "Hotel Diogo", checkin_date: "2027-03-16", checkout_date: "2027-03-18" },
      { hotel_name: "Pousada Angélica", checkin_date: "2027-03-18", checkout_date: "2027-03-21" },
      { hotel_name: "Hotel Diogo", checkin_date: "2027-03-21", checkout_date: "2027-03-22" },
    ]);

    expect(hotels).toHaveLength(3);
    expect(hotels[0].checkin_date).toBe("2027-03-16");
    expect(hotels[2].checkin_date).toBe("2027-03-21");
  });

  it("D3: preserva múltiplos transfers nomeados sem exibir raw 'in_out' como título", () => {
    const normalized = normalizeTransfersList(
      CORPUS_FORTALEZA_JERI_MULTI_TRANSFER_AND_LEGACY_OPTIONS.transfers,
    );

    expect(normalized).toHaveLength(4);
    expect(normalized[0].name).toBe("Traslado Aeroporto Fortaleza / Hotel Diogo (Ida)");
    expect(normalized[0].type).not.toBe("in_out");
    expect(normalized[1].kind).toBe("intercity");
    expect(normalized[2].price_cents).toBe(15000);
    expect(resolveTransferDisplayTitle({ type: "in_out" }, 0)).toBe("Transfer Aeroporto ↔ Hotel");
  });

  it("D5: normaliza galeria multi-mídia (imagens + vídeos + crops individuais) sem fallbacks fake", () => {
    const media = normalizeEntityMediaList({
      media: [
        { id: "m1", url: "https://cdn.waesy.com/photo1.jpg", type: "image", aspectPreset: "4:3", caption: "Piscina" },
        { id: "m2", url: "https://cdn.waesy.com/tour.mp4", type: "video", aspectPreset: "16:9" },
      ],
      images: ["https://cdn.waesy.com/photo1.jpg", "https://cdn.waesy.com/photo2.jpg", ""],
    });

    expect(media).toHaveLength(3);
    expect(media[0].aspectPreset).toBe("4:3");
    expect(media[1].type).toBe("video");
    expect(extractImageUrlsFromMedia(media)).toEqual([
      "https://cdn.waesy.com/photo1.jpg",
      "https://cdn.waesy.com/photo2.jpg",
    ]);
  });

  it("R5: hidrata configuração padrão de Página Web editável e normaliza passeios", () => {
    const tours = normalizeToursList([
      "City Tour Fortaleza",
      { title: "Praia dos Carneiros", date: "2027-02-22", price_cents: 35000, images: ["https://cdn.waesy.com/carneiros.jpg"] },
    ]);
    expect(tours).toHaveLength(2);
    expect(tours[0].title).toBe("City Tour Fortaleza");
    expect(tours[1].price_cents).toBe(35000);

    const webCfg = buildDefaultWebPageConfig({
      id: "prop-1",
      title: "Fortaleza e Jericoacoara",
      destination_city: "Fortaleza e Jericoacoara",
      options: [],
    });
    expect(webCfg.is_published).toBe(true);
    expect(webCfg.show_option_tabs).toBe(false);
    expect(webCfg.blocks.some((b) => b.type === "hotels")).toBe(true);
    expect(webCfg.blocks.some((b) => b.type === "transfers")).toBe(true);
    expect(webCfg.blocks.some((b) => b.type === "tours")).toBe(true);
  });
});
