import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ROUTE_STATE = {
  equipeLoaderData: {} as any,
};

const { mockModuleProxy } = vi.hoisted(() => ({
  mockModuleProxy: () =>
    new Proxy(
      {},
      {
        has: (_target, prop) => prop !== "then" && typeof prop !== "symbol",
        getOwnPropertyDescriptor: (_target, prop) =>
          prop === "then" || typeof prop === "symbol"
            ? undefined
            : { configurable: true, enumerable: true, value: prop === "__esModule" ? true : () => null },
        get: (_target, prop) => {
          if (prop === "then" || typeof prop === "symbol") return undefined;
          if (prop === "__esModule") return true;
          return () => null;
        },
      },
    ),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: (routePath: string) => (config: any) => ({
    ...config,
    options: config,
    useLoaderData: () => {
      if (routePath === "/workspace/pedidos/gestor") {
        throw new Error("Invariant failed: Could not find an active match from '/workspace/pedidos/gestor'");
      }
      if (routePath === "/workspace/configuracoes/equipe") {
        return ROUTE_STATE.equipeLoaderData;
      }
      return {};
    },
    useSearch: () => ({}),
  }),
  Link: ({ children, to, ...rest }: any) => React.createElement("a", { href: to, ...rest }, children),
  useRouter: () => ({ invalidate: vi.fn(), navigate: vi.fn() }),
  useNavigate: () => vi.fn(),
  redirect: (opts: any) => opts,
  isRedirect: () => false,
}));

vi.mock("lucide-react", () => mockModuleProxy());
vi.mock("@phosphor-icons/react", () => mockModuleProxy());
vi.mock("@/services/logistics.functions", () => mockModuleProxy());
vi.mock("@/services/orders.functions", () => mockModuleProxy());
vi.mock("@/services/shipping.functions", () => mockModuleProxy());
vi.mock("@/services/admin-team.functions", () => mockModuleProxy());
vi.mock("@/services/jobs.functions", () => mockModuleProxy());
vi.mock("@/services/chat.functions", () => mockModuleProxy());
vi.mock("@/services/attendance-whatsapp.functions", () => mockModuleProxy());
vi.mock("@/services/store.functions", () => mockModuleProxy());
vi.mock("@/components/workspace/RolePermissionsMatrix", () => ({
  RolePermissionsMatrix: () => React.createElement("div", { "data-testid": "permissions-matrix" }),
}));
vi.mock("@/components/workspace/PartnerAgreementEditor", () => ({
  PartnerAgreementEditor: () => React.createElement("div", { "data-testid": "partner-agreement-editor" }),
}));
vi.mock("@/components/seo", () => ({
  SeoGeoOptimizationPanel: () => null,
}));
vi.mock("@/components/ui/image-upload", () => ({
  ImageUpload: () => null,
}));

import { KDSPage } from "@/routes/workspace.pedidos.gestor";
import WorkspaceTeamPage from "@/routes/workspace.configuracoes.equipe";

describe("Regressão /workspace/pedidos (KDSPage) & /workspace/configuracoes/equipe", () => {
  beforeEach(() => {
    ROUTE_STATE.equipeLoaderData = {};
  });

  it("renderiza KDSPage em /workspace/pedidos sem disparar Invariant failed do match /workspace/pedidos/gestor", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const html = renderToStaticMarkup(
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(KDSPage, {
          initialOrdersProp: [],
          storeIdProp: "32233049-07c6-49bf-a053-989824fef385",
          storeProp: {
            id: "32233049-07c6-49bf-a053-989824fef385",
            name: "Foodman",
            settings: { niche: "gastronomy", segment: "gastronomy" },
          },
        }),
      ),
    );

    expect(html).toContain("Gestor");
    expect(html).not.toContain("Invariant failed");
  });

  it("oculta Salão Parceiro e cards de regras internas na equipe do Delivery (Foodman) e exibe apenas membros da loja", () => {
    ROUTE_STATE.equipeLoaderData = {
      storeId: "32233049-07c6-49bf-a053-989824fef385",
      store: {
        id: "32233049-07c6-49bf-a053-989824fef385",
        name: "Foodman",
        settings: { niche: "gastronomy", segment: "gastronomy" },
      },
      members: [
        {
          id: "2ea9f0aa-8b04-4086-9e1d-e23105560302",
          full_name: "Eduardo Antônio Ramos",
          email: "meuwider@gmail.com",
          role: "owner",
          contract_type: "clt",
        },
      ],
      jobs: [],
      contractors: [],
      departments: [],
      whatsappInstances: [],
    };

    const foodmanHtml = renderToStaticMarkup(React.createElement(WorkspaceTeamPage));
    expect(foodmanHtml).toContain("Colaboradores (1)");
    expect(foodmanHtml).toContain("Eduardo Antônio Ramos");
    expect(foodmanHtml).not.toContain("Salão Parceiro");
    expect(foodmanHtml).not.toContain("Parceiro Comissionado");
    expect(foodmanHtml).not.toContain("Zero-Trust RLS");

    ROUTE_STATE.equipeLoaderData = {
      ...ROUTE_STATE.equipeLoaderData,
      store: {
        id: "44444444-4444-4444-8444-444444444444",
        name: "Salão Exemplo",
        primary_niche_id: "beauty_salon",
        settings: { niche: "beauty_salon" },
      },
    };
    const beautyHtml = renderToStaticMarkup(React.createElement(WorkspaceTeamPage));
    expect(beautyHtml).toContain("Salão Parceiro");
  });

  it("não contém avisos internos de desenvolvimento ou jargões técnicos nas telas limpas do workspace e conta", () => {
    const cleanedFiles = [
      "src/routes/_store.conta.lojas.nova.tsx",
      "src/routes/workspace.marketing.gift-cards.tsx",
      "src/routes/workspace.configuracoes.ai.tsx",
      "src/components/workspace/RolePermissionsMatrix.tsx",
      "src/routes/workspace.configuracoes.conformidade.tsx",
      "src/routes/workspace.financeiro.faturas.tsx",
      "src/routes/workspace.marketing.social.tsx",
      "src/routes/workspace.squads.tsx",
      "src/routes/_store.conta.seguranca.tsx",
      "src/routes/_store.conta.carnes.tsx",
    ];

    const forbiddenPhrases = [
      "Zero-Trust Compliance",
      "Garantia de Segurança Zero-Trust",
      "controle de acesso multi-tenant",
      "Invariante de Financiamento",
      "Emitindo no Ledger",
      "Arquitetura Dual",
      "Fallback BYOK Inativo",
      "comandos táteis em linha de 44px",
      "Segregação de Segurança",
      "registrados atomicamente com rastreabilidade auditável",
      "Orçamento e arbitragem fiscalizados por Supervisor Central",
      "No Ledger",
    ];

    for (const relPath of cleanedFiles) {
      const rawContent = fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
      const contentWithoutJsxComments = rawContent.replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
      for (const phrase of forbiddenPhrases) {
        expect(contentWithoutJsxComments, `${relPath} ainda contém "${phrase}"`).not.toContain(phrase);
      }
    }
  });
});
