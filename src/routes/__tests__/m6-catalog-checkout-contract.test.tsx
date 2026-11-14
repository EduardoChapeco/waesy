import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockLoaderData,
  mockRouterInvalidate,
  mockRouterNavigate,
  mockNavigate,
  mockListCollections,
  mockGetCollectionById,
  mockListAdminProducts,
  mockGetProductById,
  mockListCategories,
  mockListProductTypes,
  mockListOptionGroups,
  mockListStoreBrands,
  mockGetStoreSettings,
  mockGetCart,
  mockGetGlobalCarts,
  mockGetProfile,
  mockGetUserAddresses,
  mockGetPublicStoreProfile,
  mockGetPublicPaymentMethods,
  mockGetGatewayStatus,
  mockGetStoreCheckoutConfig,
} = vi.hoisted(() => ({
  mockLoaderData: vi.fn(),
  mockRouterInvalidate: vi.fn(),
  mockRouterNavigate: vi.fn(),
  mockNavigate: vi.fn(),
  mockListCollections: vi.fn(),
  mockGetCollectionById: vi.fn(),
  mockListAdminProducts: vi.fn(),
  mockGetProductById: vi.fn(),
  mockListCategories: vi.fn(),
  mockListProductTypes: vi.fn(),
  mockListOptionGroups: vi.fn(),
  mockListStoreBrands: vi.fn(),
  mockGetStoreSettings: vi.fn(),
  mockGetCart: vi.fn(),
  mockGetGlobalCarts: vi.fn(),
  mockGetProfile: vi.fn(),
  mockGetUserAddresses: vi.fn(),
  mockGetPublicStoreProfile: vi.fn(),
  mockGetPublicPaymentMethods: vi.fn(),
  mockGetGatewayStatus: vi.fn(),
  mockGetStoreCheckoutConfig: vi.fn(),
}));

const { createSmartModuleMock } = vi.hoisted(() => ({
  createSmartModuleMock: (overrides: Record<string, any> = {}) =>
    new Proxy(overrides, {
      get(target, prop) {
        if (prop === "__esModule") return true;
        if (prop === "default") return overrides.default ?? target;
        if (prop === "then" || typeof prop === "symbol") return undefined;
        if (prop in target) return target[prop as any];
        return ({ children }: any) => React.createElement("div", null, children);
      },
      has(target, prop) {
        if (prop === "__esModule" || prop === "default" || prop in target) return true;
        return typeof prop === "string";
      },
      getOwnPropertyDescriptor(target, prop) {
        if (prop === "then" || typeof prop === "symbol") return undefined;
        return {
          configurable: true,
          enumerable: true,
          writable: true,
          value:
            prop in target
              ? target[prop as any]
              : ({ children }: any) => React.createElement("div", null, children),
        };
      },
    }),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: (_path: string) => (config: any) => ({
    ...config,
    options: config,
    useLoaderData: () => mockLoaderData(),
  }),
  Link: ({ children, to, ...rest }: any) =>
    React.createElement("a", { href: to, ...rest }, children),
  useRouter: () => ({ invalidate: mockRouterInvalidate, navigate: mockRouterNavigate }),
  useNavigate: () => mockNavigate,
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: null, isLoading: false }),
}));

vi.mock("react-hook-form", () => ({
  useForm: () => ({
    register: () => ({}),
    handleSubmit: (fn: any) => fn,
    setValue: vi.fn(),
    watch: () => "",
    formState: { errors: {} },
  }),
}));

vi.mock("lucide-react", () =>
  new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === "__esModule") return true;
        if (prop === "then" || typeof prop === "symbol") return undefined;
        return () => React.createElement("span", { "data-icon": String(prop) });
      },
      has(_t, prop) {
        return prop === "__esModule" || typeof prop === "string";
      },
      getOwnPropertyDescriptor(_t, prop) {
        if (prop === "then" || typeof prop === "symbol") return undefined;
        return {
          configurable: true,
          enumerable: true,
          writable: true,
          value: () => React.createElement("span"),
        };
      },
    },
  ),
);

vi.mock("@/services/admin-catalog.functions", () =>
  createSmartModuleMock({
    listCollections: mockListCollections,
    updateCollection: vi.fn(),
    getCollectionById: mockGetCollectionById,
    listAdminProducts: mockListAdminProducts,
    getProductById: mockGetProductById,
    listCategories: mockListCategories,
    listProductTypes: mockListProductTypes,
    listOptionGroups: mockListOptionGroups,
    listStoreBrands: mockListStoreBrands,
  }),
);

vi.mock("@/services/store.functions", () =>
  createSmartModuleMock({
    getStoreSettings: mockGetStoreSettings,
  }),
);

vi.mock("@/services/cart.functions", () =>
  createSmartModuleMock({
    getCart: mockGetCart,
    getGlobalCarts: mockGetGlobalCarts,
  }),
);
vi.mock("@/services/auth.functions", () =>
  createSmartModuleMock({
    getProfile: mockGetProfile,
  }),
);
vi.mock("@/services/addresses.functions", () =>
  createSmartModuleMock({
    getUserAddresses: mockGetUserAddresses,
  }),
);
vi.mock("@/services/catalog.functions", () =>
  createSmartModuleMock({
    getPublicStoreProfile: mockGetPublicStoreProfile,
  }),
);
vi.mock("@/services/payment.functions", () =>
  createSmartModuleMock({
    getPublicPaymentMethods: mockGetPublicPaymentMethods,
    getGatewayStatus: mockGetGatewayStatus,
  }),
);
vi.mock("@/services/checkout.functions", () =>
  createSmartModuleMock({
    getStoreCheckoutConfig: mockGetStoreCheckoutConfig,
    processCheckout: vi.fn(),
  }),
);
vi.mock("@/services/upsell.functions", () => createSmartModuleMock());
vi.mock("@/services/giftcard.functions", () => createSmartModuleMock());
vi.mock("@/services/wz-engine.functions", () => createSmartModuleMock());
vi.mock("@/services/shipping.functions", () => createSmartModuleMock());

vi.mock("@/lib/cart-context", () => ({
  useCartContext: () => ({ refreshCart: vi.fn() }),
}));
vi.mock("@/hooks/use-mobile", () => ({
  useWindowSizeClass: () => ({ isCompact: false, sizeClass: "expanded" }),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, asChild, ...rest }: any) =>
    asChild
      ? React.createElement("span", rest, children)
      : React.createElement("button", rest, children),
}));
vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, className }: any) =>
    React.createElement("span", { className }, children),
}));
vi.mock("@/components/ui/input", () => ({
  Input: (props: any) => React.createElement("input", props),
}));
vi.mock("@/components/ui/label", () => ({
  Label: ({ children, ...rest }: any) => React.createElement("label", rest, children),
}));
vi.mock("@/components/ui/textarea", () => ({
  Textarea: (props: any) => React.createElement("textarea", props),
}));
vi.mock("@/components/ui/select", () => createSmartModuleMock());
vi.mock("@/components/ui/switch", () => createSmartModuleMock());
vi.mock("@/components/ui/checkbox", () => createSmartModuleMock());
vi.mock("@/components/ui/tabs", () => createSmartModuleMock());
vi.mock("@/components/ui/table", () => createSmartModuleMock());
vi.mock("@/components/ui/dropdown-menu", () => createSmartModuleMock());
vi.mock("@/components/ui/surface", () => ({
  Surface: ({ children, className }: any) =>
    React.createElement("div", { className }, children),
}));
vi.mock("@/components/ui/currency-field", () => createSmartModuleMock());
vi.mock("@/components/ui/image-upload", () => createSmartModuleMock());
vi.mock("@/components/ui/native-back-button", () => createSmartModuleMock());
vi.mock("@/components/ui/module-tour-modal", () => createSmartModuleMock());
vi.mock("@/components/ui/crud-actions-menu", () => createSmartModuleMock());
vi.mock("@/components/ui/document-field", () => createSmartModuleMock());
vi.mock("@/components/ui/cep-field", () => createSmartModuleMock());
vi.mock("@/components/ui/phone-field", () => createSmartModuleMock());
vi.mock("@/components/ui/credit-card-field", () => createSmartModuleMock());
vi.mock("@/components/ui/canonical/page-layout", () => createSmartModuleMock());
vi.mock("@/components/commerce/page-header", () => createSmartModuleMock());
vi.mock("@/components/commerce/catalog-complements-tab", () => createSmartModuleMock());
vi.mock("@/components/commerce/delivery-location-policy-sheet", () => createSmartModuleMock());
vi.mock("@/components/commerce/gps-mismatch-modal", () => createSmartModuleMock());
vi.mock("@/components/commerce/travel/travel-package-form", () => createSmartModuleMock());
vi.mock("@/components/checkout/delivery-selector", () => createSmartModuleMock());
vi.mock("@/components/address/canonical-address-form", () => createSmartModuleMock());
vi.mock("@/components/address/address-card-hub", () => createSmartModuleMock());
vi.mock("@/components/workspace/workspace-canonical-toolbar", () => ({
  WorkspaceCanonicalToolbar: ({ tabs = [] }: any) =>
    React.createElement(
      "div",
      { "data-testid": "toolbar" },
      tabs.map((t: any) =>
        React.createElement("span", { key: t.id }, `${t.label}:${t.count ?? 0}`),
      ),
    ),
}));
vi.mock("@/components/workspace/classified-import-modal", () => createSmartModuleMock());
vi.mock("@/components/admin/catalog/import-catalog-modal", () => createSmartModuleMock());
vi.mock("@/components/admin/catalog/master-catalog-search-dialog", () => createSmartModuleMock());
vi.mock("@/components/admin/product-editor/product-editor-layout", () => createSmartModuleMock());
vi.mock("@/components/admin/product-editor/product-editor-sticky-bar", () => createSmartModuleMock());
vi.mock("@/components/admin/catalog/product-modifiers-card", () => createSmartModuleMock());
vi.mock("@/components/admin/catalog/product-upsell-card", () => createSmartModuleMock());
vi.mock("@/components/admin/catalog/product-bom-card", () => createSmartModuleMock());
vi.mock("@/components/admin/catalog/product-food-specs-card", () => createSmartModuleMock());
vi.mock("@/components/admin/catalog/product-editor/product-fiscal-tab", () => createSmartModuleMock());
vi.mock("@/components/admin/catalog/product-editor", () =>
  createSmartModuleMock({
    useProductEditor: () => ({
      formValues: {},
      form: { handleSubmit: () => vi.fn() },
      categories: [],
    }),
    useProductEdit: () => ({
      liveTitle: "Produto Teste",
      mediaUrls: [],
      variants: [],
      tags: [],
      collectionIds: [],
    }),
  }),
);
vi.mock("@/design-system/components", () => createSmartModuleMock());
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

describe("M6 — Catálogo & Checkout: ErrorState sem falsos vazios & conformidade C.22", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("colecoes.index exibe ErrorState quando listCollections falha e conta status inactive corretamente", async () => {
    mockListCollections.mockRejectedValueOnce(new Error("Erro SQL colecoes"));
    const mod = await import("../workspace.catalogo.colecoes.index");

    const errLoader = await (mod.Route as any).options.loader();
    expect(errLoader.loadError).toContain("Erro SQL colecoes");
    expect(errLoader.collections).toEqual([]);

    const Page = (mod.Route as any).options.component;
    mockLoaderData.mockReturnValue(errLoader);
    const errHtml = renderToStaticMarkup(React.createElement(Page));
    expect(errHtml).toContain("Erro ao carregar coleções");
    expect(errHtml).toContain("Tentar novamente");

    mockLoaderData.mockReturnValue({
      collections: [
        { id: "c1", name: "Ativa 1", slug: "ativa-1", status: "active" },
        { id: "c2", name: "Inativa 1", slug: "inativa-1", status: "inactive" },
      ],
      loadError: null,
    });
    const okHtml = renderToStaticMarkup(React.createElement(Page));
    expect(okHtml).toContain("Ativas:1");
    expect(okHtml).toContain("Inativas / Arquivo:1");
  });

  it("colecoes.$id exibe ErrorState em erro de banco em vez de Coleção não encontrada", async () => {
    mockGetCollectionById.mockRejectedValueOnce(new Error("Timeout colecao"));
    const mod = await import("../workspace.catalogo.colecoes.$id");

    const loaderRes = await (mod.Route as any).options.loader({ params: { id: "col-1" } });
    expect(loaderRes.loadError).toContain("Timeout colecao");

    const Page = (mod.Route as any).options.component;
    mockLoaderData.mockReturnValue(loaderRes);
    const errHtml = renderToStaticMarkup(React.createElement(Page));
    expect(errHtml).toContain("Erro ao carregar coleção");
    expect(errHtml).not.toContain("Coleção não encontrada");

    mockLoaderData.mockReturnValue({ collection: null, loadError: null });
    const notFoundHtml = renderToStaticMarkup(React.createElement(Page));
    expect(notFoundHtml).toContain("Coleção não encontrada");
  });

  it("produtos.index, produtos.novo e produtos.$id renderizam ErrorState quando o loader falha", async () => {
    mockListAdminProducts.mockRejectedValueOnce(new Error("DB offline produtos"));
    mockGetStoreSettings.mockResolvedValueOnce({ id: "s1", name: "Loja" });
    const idxMod = await import("../workspace.catalogo.produtos.index");
    const idxData = await (idxMod.Route as any).options.loader();
    mockLoaderData.mockReturnValue(idxData);
    const idxHtml = renderToStaticMarkup(
      React.createElement((idxMod.Route as any).options.component),
    );
    expect(idxHtml).toContain("Erro ao carregar produtos");

    mockListCategories.mockRejectedValueOnce(new Error("Falha categorias"));
    mockListProductTypes.mockResolvedValueOnce([]);
    mockListOptionGroups.mockResolvedValueOnce([]);
    mockGetStoreSettings.mockResolvedValueOnce(null);
    mockListStoreBrands.mockResolvedValueOnce([]);
    const novoMod = await import("../workspace.catalogo.produtos.novo");
    const novoData = await (novoMod.Route as any).options.loader({ context: {} });
    mockLoaderData.mockReturnValue(novoData);
    const novoHtml = renderToStaticMarkup(
      React.createElement((novoMod.Route as any).options.component),
    );
    expect(novoHtml).toContain("Erro ao iniciar novo produto");

    mockGetProductById.mockRejectedValueOnce(new Error("Falha produto detalhe"));
    mockListCategories.mockResolvedValueOnce([]);
    mockListProductTypes.mockResolvedValueOnce([]);
    mockListOptionGroups.mockResolvedValueOnce([]);
    mockGetStoreSettings.mockResolvedValueOnce(null);
    mockListStoreBrands.mockResolvedValueOnce([]);
    const idMod = await import("../workspace.catalogo.produtos.$id");
    const idData = await (idMod.Route as any).options.loader({ params: { id: "p-1" } });
    mockLoaderData.mockReturnValue(idData);
    const idHtml = renderToStaticMarkup(
      React.createElement((idMod.Route as any).options.component),
    );
    expect(idHtml).toContain("Erro ao carregar produto");
  });

  it("_store.checkout propaga erro do getCart com ErrorState sem exibir sacola vazia falsa e não falha sem loja em sacola vazia", async () => {
    mockGetCart.mockRejectedValueOnce(new Error("Supabase indisponivel no checkout"));
    mockGetGlobalCarts.mockResolvedValueOnce([]);
    mockGetProfile.mockResolvedValueOnce(null);
    mockGetUserAddresses.mockResolvedValueOnce([]);

    const mod = await import("../_store.checkout");
    const errLoader = await (mod.Route as any).options.loader({ deps: { store: undefined } });
    expect(errLoader.loadError).toContain("Supabase indisponivel");

    mockLoaderData.mockReturnValue(errLoader);
    const errHtml = renderToStaticMarkup(React.createElement(mod.CheckoutPage));
    expect(errHtml).toContain("Erro ao carregar checkout");
    expect(errHtml).not.toContain("Sua sacola está vazia");

    // Empty guest cart with healthy backend does NOT crash on missing storeId
    mockGetCart.mockResolvedValueOnce(null);
    mockGetGlobalCarts.mockResolvedValueOnce([]);
    mockGetProfile.mockResolvedValueOnce(null);
    mockGetUserAddresses.mockResolvedValueOnce([]);
    const emptyLoader = await (mod.Route as any).options.loader({ deps: { store: undefined } });
    expect(emptyLoader.loadError).toBeNull();
    expect(mockGetStoreCheckoutConfig).not.toHaveBeenCalled();

    mockLoaderData.mockReturnValue(emptyLoader);
    const emptyHtml = renderToStaticMarkup(React.createElement(mod.CheckoutPage));
    expect(emptyHtml).toContain("Sua sacola está vazia");
  });

  it("checkout respeita C.22 (sem font-black, sem z-40 mobile sticky bar e zero catches mudos no loader)", () => {
    const checkoutSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/routes/_store.checkout.tsx"),
      "utf-8",
    );
    expect(checkoutSrc).not.toContain("font-black");
    expect(checkoutSrc).not.toContain("z-40 sm:hidden");
    expect(checkoutSrc).toContain("z-30 sm:hidden");
    expect(checkoutSrc).not.toContain("getGlobalCarts().catch(() => [])");
    expect(checkoutSrc).not.toContain(
      "getStoreCheckoutConfig({ data: { storeId: store || undefined } }).catch(() => null)",
    );
  });
});
