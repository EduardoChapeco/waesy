import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { drawerStore } from "@/lib/drawer-store";

// Mock @tanstack/react-router
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  useRouter: () => ({
    history: { back: vi.fn() },
    navigate: vi.fn(),
  }),
  Link: ({ children, ...props }: any) => React.createElement("a", props, children),
}));

// Mock @/components/ui/sheet for Node SSR static markup testing
vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open }: any) => (open ? <div data-testid="sheet-open">{children}</div> : null),
  SheetContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SheetHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SheetTitle: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
}));

import { AccountSwitcherDrawer } from "./AccountSwitcherDrawer";

describe("AccountSwitcherDrawer & Global Drawer Store", () => {
  beforeEach(() => {
    drawerStore.closeSuperApp();
    drawerStore.closeAccountSwitcher();
  });

  it("toggles superAppOpen and accountSwitcherOpen state cleanly", () => {
    expect(drawerStore.getState().superAppOpen).toBe(false);
    expect(drawerStore.getState().accountSwitcherOpen).toBe(false);

    drawerStore.openSuperApp();
    expect(drawerStore.getState().superAppOpen).toBe(true);

    drawerStore.closeSuperApp();
    expect(drawerStore.getState().superAppOpen).toBe(false);

    drawerStore.openAccountSwitcher();
    expect(drawerStore.getState().accountSwitcherOpen).toBe(true);

    drawerStore.closeAccountSwitcher();
    expect(drawerStore.getState().accountSwitcherOpen).toBe(false);
  });

  it("renders AccountSwitcherDrawer with multi-tenant contexts when open", () => {
    drawerStore.openAccountSwitcher();
    const mockSession = {
      user: {
        id: "usr-123",
        email: "joao.pedro@waesy.com",
        user_metadata: { name: "João Pedro", username: "joaopedro" },
      },
    };

    const html = renderToStaticMarkup(
      <AccountSwitcherDrawer session={mockSession} userRole="platform_admin" />
    );

    // Header & identity
    expect(html).toContain("Minha Conta e Perfis");
    expect(html).toContain("João Pedro");
    expect(html).toContain("@joaopedro");

    // Context options
    expect(html).toContain("Conta Civil");
    expect(html).toContain("Empresas");
    expect(html).toContain("Waesy Go");
    expect(html).toContain("Criadores");

    // TetrisGrid / Grade Modular Services & shortcuts
    expect(html).toContain("Carteira &amp; Saldo");
    expect(html).toContain("Pedidos &amp; Compras");
    expect(html).toContain("Clube &amp; Cupons");
    expect(html).toContain("Mensagens");
    expect(html).toContain("Favoritos");
    expect(html).toContain("Endereços");
    expect(html).toContain("Anúncios");
    expect(html).toContain("Ingressos");
    expect(html).toContain("Viagens");
    expect(html).toContain("Agendas");
    expect(html).toContain("Currículo");
    expect(html).toContain("Tokens WZ");
    expect(html).toContain("Carnês");
    expect(html).toContain("Gift Cards");
    expect(html).toContain("Trocas");
    expect(html).toContain("Segurança &amp; Senha");
    expect(html).toContain("Verificação Civil");
    expect(html).toContain("Central de Ajuda");
    expect(html).toContain("Sair da Conta");
  });

  it("renders logged-out prompt when session is null", () => {
    drawerStore.openAccountSwitcher();
    const html = renderToStaticMarkup(
      <AccountSwitcherDrawer session={null} />
    );

    expect(html).toContain("Identifique-se no Waesy");
    expect(html).toContain("Entrar");
    expect(html).toContain("Criar uma Conta");
  });
});
