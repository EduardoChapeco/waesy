import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Onda 10: Eventos & Turismo Public Detail Parity (DEC-169)", () => {
  const eventRoutePath = path.resolve(process.cwd(), "src/routes/_store.evento.$id.tsx");
  const eventDesktopPath = path.resolve(process.cwd(), "src/components/events/event-detail-desktop.tsx");
  const eventMobilePath = path.resolve(process.cwd(), "src/components/events/event-detail-mobile.tsx");
  const tourismRoutePath = path.resolve(process.cwd(), "src/routes/_store.turismo.$id.tsx");
  const timelinePath = path.resolve(process.cwd(), "src/components/commerce/dynamic-sections/travel-itinerary-timeline.tsx");

  it("garante que a rota de eventos busca e propaga parceiros/patrocinadores oficiais do Supabase", () => {
    const routeContent = fs.readFileSync(eventRoutePath, "utf-8");
    expect(routeContent).toContain("partners: eventData?.partners || []");
    expect(routeContent).toContain("partners={partners}");
  });

  it("garante que EventDetailDesktop e EventDetailMobile possuem expositor de patrocinadores e foco visível", () => {
    const desktopContent = fs.readFileSync(eventDesktopPath, "utf-8");
    const mobileContent = fs.readFileSync(eventMobilePath, "utf-8");

    // Ambos renderizam o bloco de Patrocinadores & Apoio Oficial
    expect(desktopContent).toContain("Patrocinadores & Apoio Oficial");
    expect(mobileContent).toContain("Patrocinadores & Apoio Oficial");

    // Ambos suportam o ícone Handshake
    expect(desktopContent).toContain("Handshake");
    expect(mobileContent).toContain("Handshake");

    // Botões de RSVP com foco visível (DL-15)
    expect(desktopContent).toContain("focus-visible:ring-2");
    expect(mobileContent).toContain("focus-visible:ring-2");
  });

  it("garante que a rota de turismo detalhe renderiza timeline enriquecida de itinerário", () => {
    const tourismContent = fs.readFileSync(tourismRoutePath, "utf-8");
    expect(tourismContent).toContain("TravelItineraryTimeline");
    expect(tourismContent).toContain("canonicalItinerary");

    const timelineContent = fs.readFileSync(timelinePath, "utf-8");
    expect(timelineContent).toContain("TravelItineraryTimeline");
    expect(timelineContent).toContain("morning");
    expect(timelineContent).toContain("afternoon");
    expect(timelineContent).toContain("night");
  });

  it("garante que a rota de turismo detalhe possui cabeçalho inpage desktop com h1 canônico (DL-24)", () => {
    const tourismContent = fs.readFileSync(tourismRoutePath, "utf-8");
    // Presença de h1 explícito para paridade desktop/mobile
    expect(tourismContent).toContain("<h1");
    expect(tourismContent).toContain("focus-visible:ring-2");
  });
});
