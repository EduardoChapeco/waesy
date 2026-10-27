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
});
