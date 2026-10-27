import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EventTopHeroCover } from "../EventTopHeroCover";
import { EventCategoryButtonsGrid } from "../EventCategoryButtonsGrid";
import { EventHorizontalCard } from "../EventHorizontalCard";
import { EventSpotlightCard } from "../EventSpotlightCard";
import { EventFeatureMiniBannersRail } from "../EventFeatureMiniBannersRail";
import { EventProducersRail } from "../EventProducersRail";
import { EventSubvitrineView } from "../EventSubvitrineView";
import { EventsShowcaseMobileView } from "../EventsShowcaseMobileView";

// Mocks de TanStack Router
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to || "#"} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({
    history: { back: vi.fn() },
    navigate: vi.fn(),
  }),
}));

// Mock do LocationMasterPill para isolamento do teste
vi.mock("@/components/location/location-master-pill", () => ({
  LocationMasterPill: ({ className }: any) => (
    <button type="button" data-testid="location-pill" className={className}>
      São Miguel do Oeste
    </button>
  ),
}));

// Mock do ProceduralInfiniteFeed
vi.mock("@/components/commerce/procedural-infinite-feed", () => ({
  ProceduralInfiniteFeed: () => <div data-testid="procedural-feed" />,
}));

describe("Nova Vitrine de Eventos iFood + Sympla", () => {
  it("renderiza EventTopHeroCover com botão voltar de 44px e pílula de localização", () => {
    const html = renderToStaticMarkup(
      <EventTopHeroCover
        activeCity="São Miguel do Oeste"
        calloutTitle="Aqui tem desconto pra quem é Clube!"
      />
    );

    expect(html).toContain("Aqui tem desconto pra quem é Clube!");
    expect(html).toContain("São Miguel do Oeste");
    expect(html).toContain("size-11"); // Piso de 44x44px
    expect(html).toContain("Waesy + Ingressos");
  });

  it("renderiza EventCategoryButtonsGrid com 8 botões squircles", () => {
    const html = renderToStaticMarkup(
      <EventCategoryButtonsGrid
        activeCategory="todos"
        categoryCounts={{ shows: 5 }}
      />
    );

    expect(html).toContain("Desconto Clube");
    expect(html).toContain("Família");
    expect(html).toContain("Festas e Shows");
    expect(html).toContain("Ver mais");
    expect(html).toContain("grid-cols-4");
  });

  it("renderiza EventHorizontalCard com formato compacto e metadados", () => {
    const html = renderToStaticMarkup(
      <EventHorizontalCard
        id="ev-1"
        title="Baile Linha Emboaba - Bailão da Terceira Idade"
        eventDate="2026-12-12T20:00:00Z"
        endDate="2026-12-13T04:00:00Z"
        venue="Pavilhão Comunitário"
        location="Linha Emboaba"
        coverImage="https://example.com/banner.jpg"
      />
    );

    expect(html).toContain("Baile Linha Emboaba - Bailão da Terceira Idade");
    expect(html).toContain("Pavilhão Comunitário");
    expect(html).toContain("12 a 13 de dez");
  });

  it("renderiza EventSpotlightCard com proporção 16:10 e botão tátil Garantir", () => {
    const html = renderToStaticMarkup(
      <EventSpotlightCard
        id="ev-spotlight"
        title="Mirada Tour Foz do Iguaçu: Vintage Culture"
        eventDate="2026-11-21T22:00:00Z"
        endDate="2026-11-22T06:00:00Z"
        venue="Arena Grand Hall"
        priceMinCents={5000}
        category="Shows"
      />
    );

    expect(html).toContain("Mirada Tour Foz do Iguaçu: Vintage Culture");
    expect(html).toContain("Arena Grand Hall");
    expect(html).toContain("Garantir");
    expect(html).toContain("R$ 50.00");
  });

  it("omite EventFeatureMiniBannersRail quando não há banners configurados (Regra B.33)", () => {
    const html = renderToStaticMarkup(<EventFeatureMiniBannersRail items={[]} />);
    expect(html).toBe("");
  });

  it("renderiza EventProducersRail com organizadores reais e omite estrelas quando não há review", () => {
    const realProducers = [
      {
        id: "prod-1",
        name: "Mirada Produções",
        activeEventsCount: 3,
        city: "São Miguel do Oeste",
        isVerified: true,
        rating: null, // Sem review cadastrada
      },
    ];

    const html = renderToStaticMarkup(<EventProducersRail producers={realProducers} />);
    expect(html).toContain("Mirada Produções");
    expect(html).toContain("3 eventos");
    // Não deve conter nota falsa
    expect(html).not.toContain("4.9");
  });

  it("renderiza EventSubvitrineView com filtros específicos do nicho e botão voltar", () => {
    const mockEvents = [
      {
        id: "show-1",
        title: "Show Nacional de Rock Acústico",
        event_date: "2026-11-10T21:00:00Z",
        venue: "Teatro Municipal",
        category: "shows",
      },
    ];

    const html = renderToStaticMarkup(
      <EventSubvitrineView
        categorySlug="shows"
        activeCity="São Miguel do Oeste"
        events={mockEvents}
        onBackToAll={() => {}}
      />
    );

    expect(html).toContain("Shows, Festivais e Música ao Vivo");
    expect(html).toContain("Voltar para Todos os Eventos");
    expect(html).toContain("Rock &amp; Pop");
    expect(html).toContain("Show Nacional de Rock Acústico");
  });

  it("renderiza EventsShowcaseMobileView completo sem falhas", () => {
    const html = renderToStaticMarkup(
      <EventsShowcaseMobileView
        activeCity="São Miguel do Oeste"
        activeCategory="todos"
      />
    );

    expect(html).toContain("event-top-hero-cover");
    expect(html).toContain("event-category-buttons-grid");
  });
});
