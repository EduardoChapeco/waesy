import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Mock do TanStack Router
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, className, ...props }: any) => (
    <a href={typeof to === "string" ? to : "/"} className={className} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/gastronomia" }),
}));

// Mock do drawer store
vi.mock("@/lib/drawer-store", () => ({
  useSuperAppDrawer: () => ({
    isOpen: false,
    open: vi.fn(),
    close: vi.fn(),
    toggle: vi.fn(),
  }),
}));

import { IFoodHeader } from "../IFoodHeader";
import { MultiVitrineDock } from "../MultiVitrineDock";
import { IFoodFeatureMiniBannersRail } from "../IFoodFeatureMiniBannersRail";
import { IFoodRecentStoresRail } from "../IFoodRecentStoresRail";
import { IFoodFilterChipsBar } from "../IFoodFilterChipsBar";
import { IFoodStoreFeedCard } from "../IFoodStoreFeedCard";
import { IFoodSubcategoryPillRail } from "../IFoodSubcategoryPillRail";
import { IFoodVisualSpotlightRail } from "../IFoodVisualSpotlightRail";

describe("Suíte Canônica de Componentes de Vitrine Comercial (Design System)", () => {
  it("renderiza IFoodHeader com botão de menu, saudação e cluster de ações", () => {
    const html = renderToStaticMarkup(
      <IFoodHeader userName="Eduardo Ramos" activeAddress="R. La Salle, 1917" />
    );
    expect(html).toContain("ifood-canonical-header");
    expect(html).toContain("Eduardo");
    expect(html).toContain("R. La Salle, 1917");
    expect(html).toContain("min-h-11");
  });

  it("renderiza MultiVitrineDock com os nichos comerciais e detecta o nicho ativo", () => {
    const html = renderToStaticMarkup(<MultiVitrineDock activeId="gastronomia" />);
    expect(html).toContain("multi-vitrine-dock");
    expect(html).toContain("Restaurantes");
    expect(html).toContain("Mercados");
    expect(html).toContain("Farmácias");
    expect(html).toContain("min-h-11");
  });

  it("renderiza IFoodFeatureMiniBannersRail com os mini-banners verticais", () => {
    const items = [
      {
        id: "fb-1",
        title: "Burguer com entrega grátis",
        targetUrl: "/gastronomia",
        badgeText: "DESTAQUE",
        actionText: "Ver ofertas",
        bgColor: "#ea580c",
      },
    ];
    const html = renderToStaticMarkup(<IFoodFeatureMiniBannersRail items={items} />);
    expect(html).toContain("ifood-feature-mini-banners-rail");
    expect(html).toContain("Burguer com entrega grátis");
    expect(html).toContain("Ver ofertas");
  });

  it("renderiza IFoodRecentStoresRail com lojas recentes e badges de benefício", () => {
    const stores = [
      {
        id: "st-1",
        name: "Corujão Lanches",
        slug: "corujao-lanches",
        badge: "Grátis",
      },
    ];
    const html = renderToStaticMarkup(<IFoodRecentStoresRail stores={stores} />);
    expect(html).toContain("ifood-recent-stores-rail");
    expect(html).toContain("Corujão Lanches");
    expect(html).toContain("Grátis");
  });

  it("renderiza IFoodFilterChipsBar com chips de filtro canônicos", () => {
    const html = renderToStaticMarkup(
      <IFoodFilterChipsBar activeFilters={["turbo"]} />
    );
    expect(html).toContain("ifood-filter-chips-bar");
    expect(html).toContain("Turbo");
    expect(html).toContain("Entrega grátis");
  });

  it("renderiza IFoodStoreFeedCard no formato spotlight com nota e tempo de entrega", () => {
    const store = {
      id: "st-bee",
      name: "Bee Pizzaria",
      slug: "bee-pizzaria",
      rating: 4.8,
      deliveryTime: "40-50 min",
      deliveryFee: "Grátis",
      couponBadge: "Cupom de R$ 5",
    };
    const html = renderToStaticMarkup(<IFoodStoreFeedCard store={store} variant="spotlight" />);
    expect(html).toContain("ifood-store-spotlight-card");
    expect(html).toContain("Bee Pizzaria");
    expect(html).toContain("4.8");
    expect(html).toContain("Cupom de R$ 5");
  });

  it("renderiza IFoodSubcategoryPillRail com posicionamento de texto", () => {
    const subcats = [
      { id: "burgers", label: "Lanches" },
      { id: "pizzas", label: "Pizzas" },
    ];
    const html = renderToStaticMarkup(
      <IFoodSubcategoryPillRail
        items={subcats}
        activeId="burgers"
        onSelect={() => {}}
        showText={true}
        textPosition="below"
      />
    );
    expect(html).toContain("ifood-subcategory-pill-rail");
    expect(html).toContain("Lanches");
    expect(html).toContain("Pizzas");
  });

  it("renderiza IFoodVisualSpotlightRail com cards visuais grandes, badge Ad e link Ver mais", () => {
    const stores = [
      {
        id: "st-corujao",
        name: "Corujão Lanches",
        slug: "corujao-lanches",
        rating: 4.6,
        deliveryTime: "35 min",
        deliveryFee: "Grátis",
        couponBadge: "Cupom de R$ 5",
        hasHighlightCrown: true,
      },
      {
        id: "st-zanardi",
        name: "Zanardi Bistrô & Sushi",
        slug: "zanardi-sushi",
        rating: 4.8,
        deliveryTime: "60 min",
        deliveryFee: "R$ 6,00",
        couponBadge: "Cupom de R$ 5",
      },
    ];
    const html = renderToStaticMarkup(
      <IFoodVisualSpotlightRail
        title="Restaurantes com Cupom"
        isAd={true}
        viewMoreTo="/gastronomia"
        stores={stores}
      />
    );
    expect(html).toContain("ifood-visual-spotlight-rail");
    expect(html).toContain("Restaurantes com Cupom");
    expect(html).toContain("Ad");
    expect(html).toContain("Ver mais");
    expect(html).toContain("Corujão Lanches");
    expect(html).toContain("Zanardi Bistrô &amp; Sushi");
    expect(html).toContain("4.6");
    expect(html).toContain("35 min");
    expect(html).toContain("Grátis");
  });
});
