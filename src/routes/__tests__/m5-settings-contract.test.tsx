import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockLoaderData,
  mockRouterInvalidate,
  mockGetStoreSettings,
  mockGetWorkingHours,
  mockGetPolicies,
  mockListManualPaymentMethods,
} = vi.hoisted(() => ({
  mockLoaderData: vi.fn(),
  mockRouterInvalidate: vi.fn(),
  mockGetStoreSettings: vi.fn(),
  mockGetWorkingHours: vi.fn(),
  mockGetPolicies: vi.fn(),
  mockListManualPaymentMethods: vi.fn(),
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
  useRouter: () => ({ invalidate: mockRouterInvalidate }),
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

vi.mock("@/services/store.functions", () =>
  createSmartModuleMock({
    getStoreSettings: mockGetStoreSettings,
    saveStoreSettings: vi.fn(),
    getWorkingHours: mockGetWorkingHours,
    saveWorkingHours: vi.fn(),
    getPolicies: mockGetPolicies,
    savePolicies: vi.fn(),
  }),
);

vi.mock("@/services/public-apis.functions", () => createSmartModuleMock());
vi.mock("@/services/payment.functions", () =>
  createSmartModuleMock({
    listManualPaymentMethods: mockListManualPaymentMethods,
  }),
);
vi.mock("@/services/storage.functions", () => createSmartModuleMock());

vi.mock("@/components/commerce/page-header", () => ({
  PageHeader: ({ eyebrow, title, actions }: any) =>
    React.createElement(
      "header",
      null,
      eyebrow && React.createElement("span", null, eyebrow),
      React.createElement("h1", null, title),
      actions,
    ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, asChild, ...rest }: any) =>
    asChild
      ? React.createElement("span", rest, children)
      : React.createElement("button", rest, children),
}));
vi.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: any) =>
    React.createElement("section", { className }, children),
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
vi.mock("@/components/ui/image-upload", () => createSmartModuleMock());
vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children, className }: any) =>
    React.createElement("div", { className }, children),
  TabsList: ({ children, className }: any) =>
    React.createElement("div", { role: "tablist", className }, children),
  TabsTrigger: ({ children, className }: any) =>
    React.createElement("button", { role: "tab", className }, children),
  TabsContent: ({ children, className }: any) =>
    React.createElement("div", { role: "tabpanel", className }, children),
}));
vi.mock("@/components/ui/city-select", () => createSmartModuleMock());
vi.mock("@/components/ui/address-field", () => createSmartModuleMock());
vi.mock("@/components/commerce/business-hours-editor", () => createSmartModuleMock());
vi.mock("@/components/commerce/neighborhoods-manager", () => createSmartModuleMock());
vi.mock("@/components/commerce/delivery-time-and-radius-matrix", () => createSmartModuleMock());
vi.mock("@/components/workspace/multi-brand-ecosystem-governance-card", () =>
  createSmartModuleMock(),
);
vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, className }: any) =>
    React.createElement("span", { className }, children),
}));
vi.mock("@/components/ui/switch", () => ({
  Switch: ({ checked }: any) =>
    React.createElement("input", { type: "checkbox", checked: Boolean(checked), readOnly: true }),
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("M5 — Configurações da Loja: ErrorState, C.22 & Remoção do ThemeSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("propaga loadError no loader e renderiza ErrorState quando a loja falha ao carregar", async () => {
    mockGetStoreSettings.mockRejectedValueOnce(new Error("Supabase timeout configuracoes"));
    mockGetWorkingHours.mockResolvedValueOnce({});
    mockGetPolicies.mockResolvedValueOnce({ policies: {} });
    mockListManualPaymentMethods.mockResolvedValueOnce([]);

    const mod = await import("../workspace.configuracoes.index");
    const loaderResult = await (mod.Route as any).options.loader();

    expect(loaderResult.store).toBeNull();
    expect(loaderResult.loadError).toContain("Supabase timeout");

    mockLoaderData.mockReturnValue(loaderResult);
    const html = renderToStaticMarkup(React.createElement(mod.default));

    expect(html).toContain("Erro ao carregar configurações da loja");
    expect(html).toContain("Supabase timeout configuracoes");
    expect(html).toContain("Tentar novamente");
  });

  it("renderiza configurações válidas sem ThemeSelector e em conformidade com C.22", async () => {
    mockLoaderData.mockReturnValue({
      store: {
        id: "store-1",
        name: "Padaria Central",
        description: "Pães artesanais",
        city: "Chapecó",
        state: "SC",
        settings: { segment: "gastronomy", enabled_modules: ["catalog", "orders"] },
      },
      workingHours: {},
      policies: { terms: "Termos padrão" },
      manualMethods: [],
      loadError: null,
    });

    const mod = await import("../workspace.configuracoes.index");
    const html = renderToStaticMarkup(React.createElement(mod.default));

    expect(html).toContain("Configurações");
    expect(html).not.toContain("Tema do Painel");
    expect(html).not.toContain("font-black");
    expect(html).not.toContain("font-extrabold");
    expect(html).toContain("min-h-11");
  });

  it("não silencia falhas em loader ou handleSaveAll com .catch(() => null)", () => {
    const fileContent = fs.readFileSync(
      path.resolve(process.cwd(), "src/routes/workspace.configuracoes.index.tsx"),
      "utf-8",
    );

    expect(fileContent).not.toContain("ThemeSelector");
    expect(fileContent).not.toContain("savePolicies({\n        data: {\n          privacy_policy: privacyPolicy,\n          return_policy: returnPolicy,\n          terms,\n        },\n      }).catch(() => null)");
    expect(fileContent).not.toContain("saveWorkingHours({ data: hours }).catch(() => null)");
    expect(fileContent).not.toContain("getStoreSettings().catch(() => null)");
  });
});
