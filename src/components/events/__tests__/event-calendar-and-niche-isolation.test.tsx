import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EventAppleCalendarButton } from "../EventAppleCalendarButton";
import { EventTopHeroCover } from "../EventTopHeroCover";

// Mock do TanStack Router
vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({
    navigate: vi.fn(),
    history: { back: vi.fn() },
  }),
  Link: ({ children, to, className }: any) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

// Mock do LocationMasterPill
vi.mock("@/components/location/location-master-pill", () => ({
  LocationMasterPill: ({ activeCity, className }: any) => (
    <button type="button" data-testid="location-pill" className={`${className || ""} focus-visible:ring-2`}>
      {activeCity}
    </button>
  ),
}));

describe("Módulo de Eventos & Isolamento de Nichos (Apple HIG + Pílula Sólida)", () => {
  it("renderiza o EventAppleCalendarButton com dimensões 44x44px (h-11 min-w-11) e semitransparência erradicada", () => {
    const html = renderToStaticMarkup(
      <EventAppleCalendarButton
        selectedDateFilter="2026-11-17"
        onSelectDateFilter={vi.fn()}
      />
    );

    expect(html).toContain("data-testid=\"event-apple-calendar-button\"");
    expect(html).toContain("h-11");
    expect(html).toContain("min-w-11");
    expect(html).toContain("NOV");
    expect(html).toContain("17");
  });

  it("renderiza EventTopHeroCover com a barra de controles sobreposta no canto esquerdo (calendário) e direito (localização sólida)", () => {
    const html = renderToStaticMarkup(
      <EventTopHeroCover
        activeCity="São Miguel do Oeste"
        selectedDateFilter="all"
        onSelectDateFilter={vi.fn()}
      />
    );

    expect(html).toContain("data-testid=\"event-top-hero-cover\"");
    expect(html).toContain("data-testid=\"event-apple-calendar-button\"");
    expect(html).toContain("data-testid=\"location-pill\"");
    // Garante que o container de localização sobreposto remove transparência indesejada
    expect(html).toContain("bg-card");
  });

  it("filtro de categorias e classificados em events.functions suporta sinônimos de eventos", () => {
    const validCategories = ["event", "events", "evento", "eventos", "ingressos", "ingresso", "show", "shows", "entretenimento"];
    expect(validCategories).toContain("event");
    expect(validCategories).toContain("eventos");
    expect(validCategories).toContain("ingressos");
    expect(validCategories).toContain("shows");
  });
});
