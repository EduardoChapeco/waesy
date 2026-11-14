import fs from "fs";
import path from "path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

const state = {
  childMatches: [] as any[],
  loaderData: {} as any,
};

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: (_path: string) => (options: any) => ({
    ...options,
    options,
    useLoaderData: () => state.loaderData,
    useParams: () => ({ id: "id-1", slug: "minha-loja" }),
    useSearch: () => ({}),
  }),
  Outlet: () => React.createElement("div", { "data-testid": "m2-child-outlet" }, "CHILD_OUTLET_ACTIVE"),
  useChildMatches: () => state.childMatches,
  Link: ({ children, ...props }: any) => React.createElement("a", props, children),
  redirect: (opts: any) => opts,
  isRedirect: () => false,
  useRouter: () => ({
    navigate: vi.fn(),
    invalidate: vi.fn(),
    history: { back: vi.fn() },
    state: { location: { pathname: "/" } },
  }),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/" }),
  useRouterState: () => ({ location: { pathname: "/" } }),
  useParams: () => ({ id: "id-1", slug: "minha-loja" }),
  useSearch: () => ({}),
}));

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

vi.mock("lucide-react", () => mockModuleProxy());
vi.mock("@phosphor-icons/react", () => mockModuleProxy());
vi.mock("@/services/security.functions", () => mockModuleProxy());
vi.mock("@/services/events.functions", () => mockModuleProxy());
vi.mock("@/services/ads.functions", () => mockModuleProxy());
vi.mock("@/services/deep-core.functions", () => mockModuleProxy());
vi.mock("@/services/mcp-server.functions", () => mockModuleProxy());
vi.mock("@/services/mcp-orchestrator.functions", () => mockModuleProxy());
vi.mock("@/services/dashboard.functions", () => mockModuleProxy());
vi.mock("@/services/group-tours.functions", () => mockModuleProxy());
vi.mock("@/services/store.functions", () => mockModuleProxy());
vi.mock("@/services/identity.functions", () => mockModuleProxy());
vi.mock("@/services/onboarding.functions", () => mockModuleProxy());
vi.mock("@/services/public-apis.functions", () => mockModuleProxy());
vi.mock("@/services/storage.functions", () => mockModuleProxy());
vi.mock("@/services/auth.functions", () => mockModuleProxy());
vi.mock("@/services/master.functions", () => mockModuleProxy());
vi.mock("@/services/catalog.functions", () => mockModuleProxy());
vi.mock("@/services/jobs.functions", () => mockModuleProxy());
vi.mock("@/services/builder.functions", () => mockModuleProxy());
vi.mock("@/services/hotpage.functions", () => mockModuleProxy());
vi.mock("@/services/banner.functions", () => mockModuleProxy());
vi.mock("@/services/social.functions", () => mockModuleProxy());
vi.mock("@/services/cms.functions", () => mockModuleProxy());
vi.mock("@/services/news.functions", () => mockModuleProxy());
vi.mock("@/services/store-flyers.functions", () => mockModuleProxy());
vi.mock("@/services/classifieds.functions", () => mockModuleProxy());
vi.mock("@/services/association.functions", () => mockModuleProxy());

vi.mock("@/components/location/location-master-pill", () => ({
  useMasterLocation: () => ({ location: { city: "São Miguel do Oeste", state: "SC" } }),
}));

vi.mock("@/components/navigation/native-mobile-header", () => ({
  NativeMobileHeader: ({ title }: { title: string }) => React.createElement("header", null, title),
}));

vi.mock("@/components/commerce/canonical-store-profile-view", () => ({
  CanonicalStoreProfileView: () => React.createElement("div", null, "StoreProfile"),
}));

vi.mock("@/components/onboarding/fast-company-onboarding", () => ({
  FastCompanyOnboarding: () => React.createElement("div", null, "FastOnboarding"),
}));

vi.mock("@/components/commerce/business-location-picker", () => ({
  BusinessLocationPicker: () => React.createElement("div", null, "LocationPicker"),
}));

vi.mock("@/components/commerce/neighborhoods-manager", () => ({
  NeighborhoodsManager: () => React.createElement("div", null, "NeighborhoodsManager"),
}));

vi.mock("@/components/commerce/business-hours-editor", () => ({
  BusinessHoursEditor: () => React.createElement("div", null, "BusinessHoursEditor"),
}));

vi.mock("@/components/tourism/promotional-flyer/travel-promo-flyer-modal", () => ({
  TravelPromoFlyerModal: () => React.createElement("div", null, "TravelPromoFlyerModal"),
}));

vi.mock("@/components/simlab/SimLabQuickTestSheet", () => ({
  SimLabQuickTestSheet: () => React.createElement("div", null, "SimLabQuickTestSheet"),
}));

vi.mock("@/components/marketing/campaign-dynamic-block", () => ({
  CampaignDynamicBlock: () => React.createElement("div", null, "CampaignDynamicBlock"),
}));

vi.mock("@/components/eventos/evento-kanban", () => ({ EventoKanban: () => null }));
vi.mock("@/components/eventos/evento-orcamentos", () => ({ EventoOrcamentos: () => null }));
vi.mock("@/components/eventos/evento-custos", () => ({ EventoCustos: () => null }));
vi.mock("@/components/eventos/evento-subpaineis", () => ({ EventoSubpaineis: () => null }));
vi.mock("@/components/eventos/evento-setores", () => ({ EventoSetores: () => null }));
vi.mock("@/components/eventos/evento-lineup", () => ({ EventoLineup: () => null }));
vi.mock("@/components/eventos/evento-parceiros", () => ({ EventoParceiros: () => null }));
vi.mock("@/components/eventos/evento-documentos", () => ({ EventoDocumentos: () => null }));
vi.mock("@/components/eventos/evento-auditoria", () => ({ EventoAuditoria: () => null }));
vi.mock("@/components/eventos/evento-credenciais", () => ({ EventoCredenciais: () => null }));
vi.mock("@/components/eventos/evento-loja", () => ({ EventoLoja: () => null }));
vi.mock("@/components/eventos/evento-pesquisas", () => ({ EventoPesquisas: () => null }));
vi.mock("@/components/eventos/ticket-preview", () => ({ TicketPreview: () => null }));
vi.mock("@/components/eventos/alocar-equipe-sheet", () => ({ AlocarEquipeSheet: () => null }));
vi.mock("@/components/tourism/groups/bus-fleet-selector-modal", () => ({ BusFleetSelectorModal: () => null }));
vi.mock("@/components/tourism/groups/bus-seat-map", () => ({ BusSeatMap: () => null }));
vi.mock("@/components/tourism/groups/rooming-list-manager", () => ({ RoomingListManager: () => null }));
vi.mock("@/components/tourism/groups/group-tour-budget", () => ({ GroupTourBudgetManager: () => null }));
vi.mock("@/components/tourism/groups/group-tour-cash-ledger", () => ({ GroupTourCashLedger: () => null }));
vi.mock("@/components/tourism/groups/generate-magic-link-modal", () => ({ GenerateMagicLinkModal: () => null }));
vi.mock("@/lib/pdf-export", () => ({ exportElementAsPdf: vi.fn() }));

import { Route as CertificadosRoute } from "@/routes/admin-master.seguranca.certificados";
import { Route as ColecoesRoute } from "@/routes/workspace.catalogo.colecoes";
import { Route as EventosIdRoute } from "@/routes/workspace.eventos.$id";
import { Route as AnunciosRoute } from "@/routes/workspace.marketing.anuncios";
import { Route as RelatoriosRoute } from "@/routes/workspace.relatorios";
import { Route as GruposIdRoute } from "@/routes/workspace.turismo.grupos.$id";
import { Route as ContaLojasRoute } from "@/routes/_store.conta.lojas";
import { Route as CriarNegocioRoute } from "@/routes/_store.criar-negocio";
import { Route as LojaSlugRoute } from "@/routes/_store.loja.$slug";

describe("M2 Contract — Desbloqueio de 9 rotas pai (13 rotas filhas) com <Outlet />", () => {
  beforeEach(() => {
    state.childMatches = [];
    state.loaderData = {};
  });

  it("invariante estrutural: zero rotas pai em src/routeTree.gen.ts com filhos estão sem <Outlet>", () => {
    const genTxt = fs.readFileSync(path.resolve("src/routeTree.gen.ts"), "utf8");
    const missing: string[] = [];

    for (const m of genTxt.matchAll(/import \{ Route as (\w+)Import \} from '([^']+)'/g)) {
      const varBase = m[1].replace(/Import$/, "");
      if (genTxt.includes(`${varBase}_addFileChildren`) || genTxt.includes(`${varBase}._addFileChildren`)) {
        const relFile = `src/${m[2].slice(2)}.tsx`;
        const absFile = path.resolve(relFile);
        if (!fs.existsSync(absFile)) continue;
        const src = fs.readFileSync(absFile, "utf8");
        const hasOutlet = src.includes("<Outlet");
        const hasComponent = /component\s*:/.test(src);
        if (!hasOutlet && hasComponent) {
          missing.push(relFile);
        }
      }
    }

    expect(missing).toEqual([]);
  });

  const parentRoutes = [
    { name: "admin-master.seguranca.certificados (desbloqueia .$id)", route: CertificadosRoute },
    { name: "workspace.catalogo.colecoes (desbloqueia .index, .novo, .$id)", route: ColecoesRoute },
    { name: "workspace.eventos.$id (desbloqueia .checkin, .subpaineis)", route: EventosIdRoute },
    { name: "workspace.marketing.anuncios (desbloqueia .novo)", route: AnunciosRoute },
    { name: "workspace.relatorios (desbloqueia .gastronomia, .metas)", route: RelatoriosRoute },
    { name: "workspace.turismo.grupos.$id (desbloqueia .embarque)", route: GruposIdRoute },
    { name: "_store.conta.lojas (desbloqueia .nova)", route: ContaLojasRoute },
    { name: "_store.criar-negocio (desbloqueia .avancado)", route: CriarNegocioRoute },
    { name: "_store.loja.$slug (desbloqueia .senha)", route: LojaSlugRoute },
  ];

  it.each(parentRoutes)(
    "$name renderiza <Outlet /> imediatamente quando existe rota filha ativa",
    ({ route }) => {
      state.childMatches = [{ id: "active-child-route", routeId: "child" }];
      const Comp = (route as any).options?.component || (route as any).component;
      expect(typeof Comp).toBe("function");

      const html = renderToStaticMarkup(React.createElement(Comp));
      expect(html).toContain("CHILD_OUTLET_ACTIVE");
    },
  );

  it("_store.conta.lojas renderiza ErrorState (sem crash em stores.length) quando stores === null", () => {
    state.childMatches = [];
    state.loaderData = { stores: null, loadError: "Falha temporária no servidor." };
    const Comp = (ContaLojasRoute as any).options?.component;

    const html = renderToStaticMarkup(React.createElement(Comp));
    expect(html).toContain("Erro ao carregar lojas");
    expect(html).toContain("Falha temporária no servidor.");
  });

  it("_store.conta.lojas renderiza estado vazio real quando stores === [] e sem filhos", () => {
    state.childMatches = [];
    state.loaderData = { stores: [], loadError: null };
    const Comp = (ContaLojasRoute as any).options?.component;

    const html = renderToStaticMarkup(React.createElement(Comp));
    expect(html).toContain("Nenhum negócio vinculado ao seu perfil");
    expect(html).not.toContain("CHILD_OUTLET_ACTIVE");
  });
});
