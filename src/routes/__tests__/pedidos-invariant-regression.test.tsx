import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

let activeRoutePath = "/workspace/pedidos/";
let mockPedidosLoaderData: any = {
  orders: [],
  store: { id: "store-gastro-1", name: "Burger House", niche: "gastronomy", category: "food" },
  loadError: null,
};
let mockReservasLoaderData: any = {
  store: { id: "store-gastro-1", name: "Burger House", niche: "gastronomy", category: "food" },
};

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: (routePath: string) => (config: any) => ({
    ...config,
    options: config,
    useLoaderData: () => {
      if (activeRoutePath !== routePath) {
        throw new Error(`Invariant failed: Route "${routePath}" does not match active route "${activeRoutePath}"`);
      }
      if (routePath === "/workspace/pedidos/") return mockPedidosLoaderData;
      if (routePath === "/workspace/reservas") return mockReservasLoaderData;
      return {};
    },
    useSearch: () => ({}),
  }),
  Link: ({ children, to, ...rest }: any) => React.createElement("a", { href: typeof to === "string" ? to : "#", ...rest }, children),
  useRouter: () => ({ invalidate: vi.fn(), navigate: vi.fn() }),
  useNavigate: () => vi.fn(),
  redirect: (opts: any) => Object.assign(new Error("ROUTER_REDIRECT"), { isRedirect: true, ...opts }),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useWindowSizeClass: () => ({ isCompact: false, isMedium: false, isExpanded: true }),
}));

vi.mock("@/services/realtime-channel", () => ({
  getRealtimeChannel: () => ({ channel: null, unsubscribe: vi.fn() }),
}));

vi.mock("@/services/order.functions", () => ({
  listOrders: vi.fn(async () => []),
  updateOrderStatus: vi.fn(async () => ({ status: "ok" })),
  openTableComanda: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/services/payment.functions", () => ({
  approvePayment: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/services/store.functions", () => ({
  getStoreSettings: vi.fn(async () => null),
}));

vi.mock("@/services/kitchen-prep.functions", () => ({
  assignOrderCourier: vi.fn(async () => ({ success: true })),
}));

vi.mock("@/services/shipping.functions", () => ({
  listDrivers: vi.fn(async () => []),
}));

vi.mock("@/services/contracts.functions", () => ({
  generateContractFromOrder: vi.fn(async () => ({})),
}));

vi.mock("@/services/reservations.functions", () => ({
  listStoreReservations: vi.fn(async () => []),
  createStoreReservation: vi.fn(async () => ({})),
  updateReservationStatus: vi.fn(async () => ({})),
  getStoreFloorPlan: vi.fn(async () => ({ tables: [] })),
  saveStoreFloorPlan: vi.fn(async () => ({})),
}));

vi.mock("@/services/crm.functions", () => ({
  listCustomers: vi.fn(async () => []),
}));

vi.mock("@/lib/audio-chimes", () => ({
  playNewOrderAlert: vi.fn(),
  unlockAudioContext: vi.fn(),
}));

import { Route as PedidosRoute } from "@/routes/workspace.pedidos.index";
import TableReservationsPage from "@/routes/workspace.reservas";

function renderToHtml(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderToStaticMarkup(React.createElement(QueryClientProvider, { client }, ui));
}

describe("Regressao Estrita anti-Invariant em rotas embutidas", () => {
  beforeEach(() => {
    activeRoutePath = "/workspace/pedidos/";
    mockPedidosLoaderData = {
      orders: [
        {
          id: "ord-1111-2222",
          order_number: "PED-101",
          status: "paid",
          channel_origin: "ifood",
          total_cents: 4590,
          created_at: new Date().toISOString(),
          customer_snapshot: { name: "Cliente Teste", phone: "49999999999" },
          items_snapshot: [{ title: "X-Burger", quantity: 1 }],
        },
      ],
      store: { id: "store-gastro-1", name: "Burger House", niche: "gastronomy", category: "food" },
      loadError: null,
    };
  });

  it("renderiza /workspace/pedidos/ para gastronomia com KDS embutido sem invocar Route.useLoaderData do gestor", () => {
    activeRoutePath = "/workspace/pedidos/";
    const PedidosPage = PedidosRoute.options.component as React.ComponentType;
    const html = renderToHtml(React.createElement(PedidosPage));

    expect(html).toContain("Painel de Pedidos");
    expect(html).toContain("Gestor de Pedidos");
    expect(html).not.toContain("fixed inset-0 z-50");
  });

  it("renderiza /workspace/pedidos/ para varejo sem erros de invariante", () => {
    activeRoutePath = "/workspace/pedidos/";
    mockPedidosLoaderData = {
      orders: [],
      store: { id: "store-retail-1", name: "Loja Variedades", niche: "retail", category: "ecommerce" },
      loadError: null,
    };
    const PedidosPage = PedidosRoute.options.component as React.ComponentType;
    const html = renderToHtml(React.createElement(PedidosPage));
    expect(html).toContain("Separação");
  });

  it("renderiza TableReservationsPage embutido em /workspace/pdv/comandas sem invocar Route.useLoaderData de /workspace/reservas", () => {
    activeRoutePath = "/workspace/pdv/comandas";
    const html = renderToHtml(
      React.createElement(TableReservationsPage, {
        embedded: true,
        storeProp: { id: "store-gastro-1", name: "Burger House", niche: "gastronomy", category: "food" },
      }),
    );
    expect(html).toContain("Reservas");
  });
});
