import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Mock TanStack Router
vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({
    navigate: vi.fn(),
  }),
}));

// Mock @/components/ui/sheet
vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open }: any) => (open ? <div data-testid="cart-sheet">{children}</div> : null),
  SheetContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SheetHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SheetTitle: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
}));

// Mock Cart Context
vi.mock("@/lib/cart-context", () => ({
  useCartContext: () => ({
    globalCarts: [
      {
        id: "cart-1",
        storeId: "store-a",
        storeName: "Supermercado Compre Bem",
        itemCount: 2,
        totalCents: 15000,
        shippingCents: 0,
        items: [
          {
            id: "item-1",
            variantId: "v-1",
            productTitle: "Café Torrado 500g",
            priceCents: 2500,
            qty: 2,
          },
          {
            id: "item-2",
            variantId: "v-2",
            productTitle: "Azeite Extra Virgem 500ml",
            priceCents: 5000,
            qty: 2,
          },
        ],
      },
      {
        id: "cart-2",
        storeId: "store-b",
        storeName: "Drogaria Central",
        itemCount: 1,
        totalCents: 4500,
        shippingCents: 0,
        items: [
          {
            id: "item-3",
            variantId: "v-3",
            productTitle: "Protetor Solar FPS 50",
            priceCents: 4500,
            qty: 1,
          },
        ],
      },
    ],
    isCartOpen: true,
    setIsCartOpen: vi.fn(),
    updateQty: vi.fn(),
    removeItem: vi.fn(),
    isCartUpdating: false,
    refreshCart: vi.fn(),
  }),
}));

import { CartSheet } from "./cart-sheet";

describe("Commerce — CartSheet Multi-Store (Mercado Livre Parity)", () => {
  it("renderiza o cabeçalho multiloja, pacotes e barra de frete grátis", () => {
    const html = renderToStaticMarkup(<CartSheet />);

    expect(html).toContain("Carrinho Multiloja");
    expect(html).toContain("Supermercado Compre Bem");
    expect(html).toContain("Drogaria Central");
    expect(html).toContain("Pacote 1");
    expect(html).toContain("Pacote 2");
    expect(html).toContain("Você ganhou frete grátis nesta loja!");
    expect(html).toContain("Faltam");
    expect(html).toContain("para frete grátis");
    expect(html).toContain("Finalizar Pedido");
  });
});
