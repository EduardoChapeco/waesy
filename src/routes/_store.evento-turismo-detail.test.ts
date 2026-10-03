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
    expect(desktopContent).toContain("focus-visible:ring-primary");
    expect(mobileContent).toContain("focus-visible:ring-primary");

    // Touch targets >= 44px (DL-14) no mobile
    expect(mobileContent).not.toContain("h-10 text-xs rounded-lg");
    expect(mobileContent).toContain("h-11 text-xs rounded-lg");
  });

  it("garante que a rota de turismo não possui imagens sintéticas do Unsplash (M01 Zero Mocks)", () => {
    const tourismContent = fs.readFileSync(tourismRoutePath, "utf-8");
    expect(tourismContent).not.toContain("images.unsplash.com");
  });

  it("garante que a rota de turismo integra ActionAuthGuardModal para proteger a emissão de voucher", () => {
    const tourismContent = fs.readFileSync(tourismRoutePath, "utf-8");
    expect(tourismContent).toContain("useActionAuthGuard");
    expect(tourismContent).toContain("<ActionAuthGuardModal");
    expect(tourismContent).toContain("handleOpenBooking");
  });

  it("garante que o TravelItineraryTimeline não renderiza dias sintéticos falsos por padrão (M01)", () => {
    const timelineContent = fs.readFileSync(timelinePath, "utf-8");
    expect(timelineContent).toContain("days = []");
    expect(timelineContent).toContain("if (!days || days.length === 0) return null;");
    expect(timelineContent).not.toContain("Recepção no aeroporto");
  });

  it("garante conformidade com o design system sem classes arbitrárias de 100dvh ou text-[Xpx] nas rotas auditadas", () => {
    const desktopContent = fs.readFileSync(eventDesktopPath, "utf-8");
    const mobileContent = fs.readFileSync(eventMobilePath, "utf-8");
    const tourismContent = fs.readFileSync(tourismRoutePath, "utf-8");
    const timelineContent = fs.readFileSync(timelinePath, "utf-8");

    expect(desktopContent).not.toMatch(/text-\[\d+px\]/);
    expect(mobileContent).not.toMatch(/text-\[\d+px\]/);
    expect(mobileContent).not.toContain("min-h-[100dvh]");
    expect(tourismContent).not.toContain("min-h-[100dvh]");
    expect(tourismContent).not.toMatch(/text-\[\d+px\]/);
    expect(timelineContent).not.toMatch(/text-\[\d+px\]/);
  });
});
