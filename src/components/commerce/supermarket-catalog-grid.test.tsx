import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Mock TanStack Router Link
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

// Mock Sheet for SSR
vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open }: any) => (open ? <div data-testid="sheet-open">{children}</div> : null),
  SheetContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SheetHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SheetTitle: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
}));

// Mock Cart Context
vi.mock("@/lib/cart-context", () => ({
  useCart: () => ({
    cart: { items: [] },
    refreshCart: vi.fn(),
    updateQty: vi.fn(),
  }),
}));

import { SupermarketCatalogGrid } from "./SupermarketCatalogGrid";

describe("Commerce — SupermarketCatalogGrid ('O Super' Parity)", () => {
  it("renderiza a barra de busca com leitor de código de barras, departamentos e produtos", () => {
    const products = [
      {
        id: "prod-1",
        slug: "arroz-tipo-1-5kg",
        title: "Arroz Tipo 1 5kg",
        brand: "Tio João",
        priceCents: 2490,
        compareAtCents: 2990,
        coverUrl: "https://example.com/arroz.jpg",
        isOutOfStock: false,
      },
      {
        id: "prod-2",
        slug: "feijao-carioca-1kg",
        title: "Feijão Carioca 1kg",
        brand: "Camil",
        priceCents: 890,
        coverUrl: "https://example.com/feijao.jpg",
        isOutOfStock: false,
      },
    ];

    const departments = [
      { id: "todos", label: "Tudo" },
      { id: "mercearia", label: "Mercearia", badge: "Ofertas" },
      { id: "hortifruti", label: "Hortifrúti" },
    ];

    const html = renderToStaticMarkup(
      <SupermarketCatalogGrid
        products={products as any}
        departments={departments}
        activeDepartment="mercearia"
        availableStores={["Supermercado Compre Bem", "Atacadão"]}
        selectedStore="todos"
      />
    );

    expect(html).toContain("Buscar por nome, marca ou código de barras...");
    expect(html).toContain("Escanear Código de Barras");
    expect(html).toContain("Tudo");
    expect(html).toContain("Mercearia");
    expect(html).toContain("Ofertas");
    expect(html).toContain("Supermercado Compre Bem");
    expect(html).toContain("Arroz Tipo 1 5kg");
    expect(html).toContain("Feijão Carioca 1kg");
  });
});
