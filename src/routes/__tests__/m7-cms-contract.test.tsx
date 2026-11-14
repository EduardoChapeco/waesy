import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";

const { createSmartModuleMock } = vi.hoisted(() => ({
  createSmartModuleMock: (overrides: Record<string, any> = {}) =>
    new Proxy(overrides, {
      get(target, prop) {
        if (prop === "__esModule") return true;
        if (prop === "default") return overrides.default ?? target;
        if (prop === "then" || typeof prop === "symbol") return undefined;
        if (prop in target) return target[prop as any];
        return ({ children, ...props }: any) =>
          React.createElement("span", { "data-icon": String(prop), ...props }, children);
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
              : ({ children, ...props }: any) =>
                  React.createElement("span", { "data-icon": String(prop), ...props }, children),
        };
      },
    }),
}));

vi.mock("lucide-react", () => createSmartModuleMock());
vi.mock("@phosphor-icons/react", () => createSmartModuleMock());
vi.mock("@/services/admin-home-cms.functions", () => createSmartModuleMock());
vi.mock("@/services/cms.functions", () => createSmartModuleMock());
vi.mock("@/services/surface-cms.functions", () => createSmartModuleMock());
vi.mock("@/services/builder.functions", () => createSmartModuleMock());
vi.mock("@/services/stories.functions", () => createSmartModuleMock());
vi.mock("@/services/creators.functions", () => createSmartModuleMock());
vi.mock("@/services/editorial.functions", () => createSmartModuleMock());
vi.mock("@/components/home/MetamorphicBannerSlider", () => createSmartModuleMock());
vi.mock("@/components/home/NoorNativeCategoryDock", () => createSmartModuleMock());
vi.mock("@/components/home/BentoGridTetris", () => createSmartModuleMock());
vi.mock("@/components/home/IFoodSquareCategoryButton", () => createSmartModuleMock());
vi.mock("@/components/ui/media-uploader", () => createSmartModuleMock());
vi.mock("@/components/ui/bidirectional-media-uploader", () => createSmartModuleMock());
vi.mock("@/components/ui/destination-picker", () => createSmartModuleMock());
vi.mock("@/lib/builder/omni-templates", () => ({
  NICHE_TEMPLATE_MATRIX: [],
  TOURISM_WIX_APP_PAGES: [],
  COMMERCE_WIX_APP_PAGES: [],
  SERVICES_WIX_APP_PAGES: [],
  FORM_LEAD_WIX_APP_PAGES: [],
  NEWS_WIX_APP_PAGES: [],
}));

const mockLoaderData: Record<string, any> = {};

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: (routePath: string) => (options: Record<string, unknown>) => ({
    ...options,
    options,
    useLoaderData: () => mockLoaderData[routePath],
    useSearch: () => ({}),
    useParams: () => ({}),
  }),
  Link: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <a {...props}>{children}</a>
  ),
  useNavigate: () => vi.fn(),
  useRouter: () => ({ invalidate: vi.fn(), history: { back: vi.fn() } }),
  redirect: (opts: unknown) => opts,
  isRedirect: () => false,
}));

const CMS_ROUTES = [
  "src/routes/admin-master.home-editor.tsx",
  "src/routes/workspace.cms.paginas.index.tsx",
  "src/routes/workspace.cms.avaliacoes.tsx",
  "src/routes/workspace.cms.bio.tsx",
  "src/routes/workspace.cms.calendario.tsx",
  "src/routes/workspace.cms.navegacao.tsx",
  "src/routes/workspace.cms.stories.tsx",
];

describe("M7 Contract — CMS & Home Editor Routes (ErrorState, Zero Silent Catch, C.22)", () => {
  it("eliminates silent .catch(() => []) and includes loadError + ErrorState in all 7 CMS routes", () => {
    for (const relPath of CMS_ROUTES) {
      const src = fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
      expect(src, `${relPath} must not contain .catch(() => [])`).not.toContain(".catch(() => [])");
      expect(src, `${relPath} must not contain .catch(() => null)`).not.toContain(".catch(() => null)");
      expect(src, `${relPath} must propagate loadError`).toContain("loadError");
      expect(src, `${relPath} must render ErrorState`).toContain("ErrorState");
      expect(src, `${relPath} must support router.invalidate()`).toContain("router.invalidate()");
      expect(src, `${relPath} must not use font-black`).not.toContain("font-black");
    }

    const leadFormsSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/services/lead-forms.functions.ts"),
      "utf8",
    );
    expect(leadFormsSrc).toContain(
      'throw new Error(error.message || "Não foi possível carregar os formulários de captura.");',
    );
  });

  it("renders ErrorState on loadError in admin-master.home-editor.tsx without violating React Rules of Hooks", async () => {
    mockLoaderData["/admin-master/home-editor"] = {
      sections: [],
      menus: [],
      loadError: "Falha de conexão com home_page_sections",
    };

    const mod = await import("@/routes/admin-master.home-editor");
    const Comp = (mod.Route as any).component;
    const html = renderToStaticMarkup(<Comp />);

    expect(html).toContain("Erro ao carregar editor da Home");
    expect(html).toContain("Falha de conexão com home_page_sections");
    expect(html).toContain("Tentar novamente");
  }, 60000);

  it("renders ErrorState on loadError in workspace.cms.paginas.index.tsx and workspace.cms.stories.tsx", async () => {
    mockLoaderData["/workspace/cms/paginas/"] = {
      pages: [],
      loadError: "Erro de permissão em experience_documents",
    };
    mockLoaderData["/workspace/cms/stories"] = {
      stories: [],
      collabs: [],
      loadError: "Timeout ao listar stories",
    };

    const paginasMod = await import("@/routes/workspace.cms.paginas.index");
    const PaginasComp = (paginasMod.Route as any).component;
    const paginasHtml = renderToStaticMarkup(<PaginasComp />);
    expect(paginasHtml).toContain("Erro ao carregar páginas");
    expect(paginasHtml).toContain("Erro de permissão em experience_documents");

    const storiesMod = await import("@/routes/workspace.cms.stories");
    const StoriesComp = (storiesMod.Route as any).component;
    const storiesHtml = renderToStaticMarkup(<StoriesComp />);
    expect(storiesHtml).toContain("Erro ao carregar stories");
    expect(storiesHtml).toContain("Timeout ao listar stories");
  }, 60000);

  it("renders ErrorState on loadError in avaliacoes, bio, calendario, and navegacao", async () => {
    mockLoaderData["/workspace/cms/avaliacoes"] = {
      reviews: [],
      loadError: "Erro em product_reviews",
    };
    mockLoaderData["/workspace/cms/bio"] = {
      loadError: "Erro ao abrir Biolink",
    };
    mockLoaderData["/workspace/cms/calendario"] = {
      posts: [],
      loadError: "Erro em scheduled_posts",
    };
    mockLoaderData["/workspace/cms/navegacao"] = {
      menus: null,
      loadError: "Erro em navigation_menus",
    };

    const avalMod = await import("@/routes/workspace.cms.avaliacoes");
    const AvalComp = (avalMod.Route as any).component;
    expect(renderToStaticMarkup(<AvalComp />)).toContain("Erro em product_reviews");

    const bioMod = await import("@/routes/workspace.cms.bio");
    const BioComp = (bioMod.Route as any).component;
    expect(renderToStaticMarkup(<BioComp />)).toContain("Erro ao abrir Biolink");

    const calMod = await import("@/routes/workspace.cms.calendario");
    const CalComp = (calMod.Route as any).component;
    expect(renderToStaticMarkup(<CalComp />)).toContain("Erro em scheduled_posts");

    const navMod = await import("@/routes/workspace.cms.navegacao");
    const NavComp = (navMod.Route as any).component;
    expect(renderToStaticMarkup(<NavComp />)).toContain("Erro em navigation_menus");
  }, 60000);
});
