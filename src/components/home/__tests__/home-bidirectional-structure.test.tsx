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
  useLocation: () => ({ pathname: "/" }),
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

import { IFoodHeader } from "@/components/commerce/ifood/IFoodHeader";
import { checkHasCustomPageMobileHeader } from "@/components/shell/app-shell";

describe("Auditoria Estrutural Bidirecional & Cabeçalho Canônico Mobile", () => {
  it("checkHasCustomPageMobileHeader identifica a Home ('/') e rotas comerciais, prevenindo duplicação de cabeçalhos no AppShell", () => {
    expect(checkHasCustomPageMobileHeader("/")).toBe(true);
    expect(checkHasCustomPageMobileHeader("/gastronomia")).toBe(true);
    expect(checkHasCustomPageMobileHeader("/mercado")).toBe(true);
    expect(checkHasCustomPageMobileHeader("/farmacia")).toBe(true);
    expect(checkHasCustomPageMobileHeader("/classificados")).toBe(true);
  });

  it("renderiza IFoodHeader como cabeçalho principal móvel com busca integrada e piso de 44px", () => {
    const html = renderToStaticMarkup(
      <IFoodHeader
        userName="Camila Santos"
        activeAddress="Centro, Chapecó"
        unreadNotificationsCount={3}
        hasClubBenefit={true}
        showSearch={true}
        searchValue="Padaria"
        onSearchChange={vi.fn()}
      />
    );

    // Contrato de teste e presença dos blocos essenciais
    expect(html).toContain("ifood-canonical-header");
    expect(html).toContain("Camila");
    expect(html).toContain("Centro, Chapecó");
    expect(html).toContain("min-h-11");
    expect(html).toContain("pt-safe");
    // Campo de busca integrado ativo
    expect(html).toContain("Padaria");
    expect(html).toContain("input");
  });

  it("renderiza IFoodHeader com fallback gracioso para visitante quando não autenticado", () => {
    const html = renderToStaticMarkup(
      <IFoodHeader />
    );

    expect(html).toContain("ifood-canonical-header");
    expect(html).toContain("Visitante");
    expect(html).toContain("Escolher localização");
  });

  it("renderiza HomeDesktopWebApp com descompressão de grade (2 colunas) e sem casca redundante de card (Single Surface Rule)", async () => {
    const { HomeDesktopWebApp } = (await import("../HomeDesktopWebApp")) as { HomeDesktopWebApp: React.ComponentType<any> };
    const mockStores = [
      {
        id: "st-1",
        business_name: "11º Batalhão de Polícia Militar",
        category: "servicos",
        rating: 5,
        reviews_count: 10,
        address: "Centro",
      },
    ];

    const html = renderToStaticMarkup(
      <HomeDesktopWebApp
        homeSections={[
          {
            id: "sec-stores",
            section_key: "stores_feed_list",
            title: "Lojas",
            is_active: true,
          } as any,
        ]}
        filteredPlaces={mockStores as any}
      />
    );

    // Deve conter a grade ergonômica de 2 colunas para cards horizontais
    expect(html).toContain("grid-cols-1 lg:grid-cols-2 gap-4");
    // Não deve conter a grade espremida de 3 colunas
    expect(html).not.toContain("lg:grid-cols-3 gap-4");
    // Não deve conter o wrapper redundante com borda dupla
    expect(html).not.toContain("rounded-xl border border-border/60 bg-card px-2");
    // O card de loja deve estar presente
    expect(html).toContain("11º Batalhão de Polícia Militar");
  });
});