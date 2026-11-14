import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetOnboardingStatus = vi.fn();
const mockLoaderData = vi.fn();
const mockRouterInvalidate = vi.fn();

const { createSmartModuleMock } = vi.hoisted(() => ({
  createSmartModuleMock: (overrides: Record<string, any> = {}) =>
    new Proxy(overrides, {
      get(target, prop) {
        if (prop === "__esModule") return true;
        if (prop === "default") return overrides.default ?? target;
        if (prop === "then" || typeof prop === "symbol") return undefined;
        if (prop in target) return target[prop as any];
        return () => null;
      },
      has(target, prop) {
        if (prop === "__esModule" || prop === "default" || prop in target) return true;
        return typeof prop === "string";
      },
      getOwnPropertyDescriptor(target, prop) {
        if (prop === "then" || typeof prop === "symbol") {
          return undefined;
        }
        return {
          configurable: true,
          enumerable: true,
          writable: true,
          value: prop in target ? target[prop as any] : () => null,
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
  Link: ({ children, to, ...rest }: any) => React.createElement("a", { href: to, ...rest }, children),
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
          value: () => React.createElement("span", { "data-icon": String(prop) }),
        };
      },
    },
  ),
);

vi.mock("@/services/onboarding.functions", () =>
  createSmartModuleMock({
    getOnboardingStatus: (...args: any[]) => mockGetOnboardingStatus(...args),
  }),
);

vi.mock("@/components/onboarding/magic-onboarding-card", () =>
  createSmartModuleMock({
    MagicOnboardingCard: () => React.createElement("div", { "data-testid": "magic-onboarding" }),
  }),
);

vi.mock("@/lib/niches/niche-ssot", () =>
  createSmartModuleMock({
    getUnifiedNicheSpec: () => ({
      id: "retail",
      onboardingBlueprint: {
        badgeLabel: "Ativação de Varejo",
        title: "Ativação da Loja",
        subtitle: "Configure catálogo e formas de pagamento.",
        multimodalTitle: "Importação Documental",
        multimodalDescription: "Importe catálogo a partir de arquivo.",
        stepsSectionTitle: "Etapas de Configuração",
      },
    }),
  }),
);

describe("M4 Onboarding Contract & Error Propagation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna loadError explícito (sem estado falso de 0%) quando getOnboardingStatus falha", async () => {
    mockGetOnboardingStatus.mockRejectedValue(new Error("Supabase connection refused"));
    const { Route } = await import("../workspace.onboarding.index");

    const loaderRes = await (Route as any).options.loader();
    expect(loaderRes.onboarding).toBeNull();
    expect(loaderRes.loadError).toContain("Supabase connection refused");

    mockLoaderData.mockReturnValue(loaderRes);
    const Comp = (Route as any).options.component;
    const html = renderToStaticMarkup(React.createElement(Comp));

    expect(html).toContain("Erro ao carregar checklist de ativação");
    expect(html).toContain("Supabase connection refused");
    expect(html).not.toContain("0%");
  });

  it("retorna loadError quando todas as etapas retornam technical_error", async () => {
    mockGetOnboardingStatus.mockResolvedValue({
      steps: [
        { id: "profile", category: "fundamentos", label: "Perfil", description: "Desc", status: "technical_error", targetRoute: "/workspace/configuracoes" },
        { id: "first_product", category: "catalogo", label: "Produto", description: "Desc", status: "technical_error", targetRoute: "/workspace/catalogo" },
      ],
      totalSteps: 2,
      completedSteps: 0,
      partiallyConfiguredSteps: 0,
      progressPercentage: 0,
      isStoreReadyToSell: false,
    });

    const { Route } = await import("../workspace.onboarding.index");
    const loaderRes = await (Route as any).options.loader();
    expect(loaderRes.onboarding).toBeNull();
    expect(loaderRes.loadError).toContain("banco de dados");
  });

  it("diferencia etapa com technical_error de Pendente na renderização parcial", async () => {
    const partialData = {
      steps: [
        {
          id: "profile",
          category: "fundamentos",
          label: "Perfil e Dados da Loja",
          description: "Nome e contato",
          status: "completed",
          targetRoute: "/workspace/configuracoes",
          details: "Perfil completo",
        },
        {
          id: "shipping",
          category: "fundamentos",
          label: "Tabelas de Frete",
          description: "Opções de envio",
          status: "technical_error",
          targetRoute: "/workspace/logistica/tabelas",
          details: "Timeout RLS",
        },
      ],
      totalSteps: 2,
      completedSteps: 1,
      partiallyConfiguredSteps: 0,
      progressPercentage: 50,
      isStoreReadyToSell: false,
      storeCategory: "retail",
    };

    mockGetOnboardingStatus.mockResolvedValue(partialData);
    const { Route } = await import("../workspace.onboarding.index");
    const loaderRes = await (Route as any).options.loader();
    expect(loaderRes.loadError).toBeNull();

    mockLoaderData.mockReturnValue(loaderRes);
    const Comp = (Route as any).options.component;
    const html = renderToStaticMarkup(React.createElement(Comp));

    expect(html).toContain("50%");
    expect(html).toContain("Concluído");
    expect(html).toContain("Erro");
    expect(html).toContain("Timeout RLS");
    expect(html).not.toContain("1-Clique");
    expect(html).not.toContain("Cortex 360 + IBGE");
    expect(html).not.toContain("font-black");
  });

  it("elimina font-black/font-extrabold, bordas literais e mantém rollback atômico no BFF", () => {
    const m4UiFiles = [
      "src/routes/workspace.onboarding.index.tsx",
      "src/components/onboarding/magic-onboarding-card.tsx",
      "src/components/onboarding/fast-company-onboarding.tsx",
      "src/routes/_store.criar-negocio.tsx",
      "src/routes/_store.criar-negocio.avancado.tsx",
    ];

    for (const relPath of m4UiFiles) {
      const content = fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
      expect(content).not.toContain("font-black");
      expect(content).not.toContain("font-extrabold");
      expect(content).not.toContain("border-black");
    }

    const provisionFn = fs.readFileSync(
      path.resolve(process.cwd(), "src/services/onboarding.functions.ts"),
      "utf8",
    );
    expect(provisionFn).toContain('from("organizations").delete().eq("id", org.id)');
    expect(provisionFn).toContain('from("stores").delete().eq("id", store.id)');

    const fastRegisterFn = fs.readFileSync(
      path.resolve(process.cwd(), "src/services/company-mvp.functions.ts"),
      "utf8",
    );
    expect(fastRegisterFn).toContain('from("organizations").delete().eq("id", org.id)');
    expect(fastRegisterFn).toContain('from("stores").delete().eq("id", store.id)');
  });
});
