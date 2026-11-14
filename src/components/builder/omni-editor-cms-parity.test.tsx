import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator: (schema: any) => ({
      handler: (fn: any) => async (args: any) => {
        const validated = schema ? schema.parse(args?.data) : args?.data;
        return fn({ data: validated });
      },
    }),
    handler: (fn: any) => async (args: any) => fn(args || {}),
  }),
}));

import { BuilderViewportProvider } from "@/design-system/vitrine/viewport-context";
import { BuilderViewportFrame } from "./BuilderViewportFrame";
import { OmniPageRenderer } from "./OmniPageRenderer";
import { SiteHeaderBlock } from "./blocks/SiteHeaderBlock";
import { SiteFooterBlock } from "./blocks/SiteFooterBlock";
import { CmsCollectionGridBlock } from "./blocks/CmsCollectionGridBlock";
import {
  BLOCK_TO_WIX_CATEGORY,
  getSiteBlockByIdStrict,
  WIX_CATEGORY_CONFIG,
} from "./registry";
import {
  OmniPageDocumentSchema,
  createEmptyOmniPage,
  type OmniBlockInstance,
  type OmniPageDocument,
} from "@/types/omni-builder";
import {
  resolveBlockBoundData,
  getBlockDeviceVisibilityClass,
  getDocumentThemeCanvasStyle,
} from "@/lib/builder/block-data-resolver";
import { IFoodHeader } from "@/components/commerce/ifood/IFoodHeader";
import { CANONICAL_PLATFORM_MENUS } from "@/services/cms.functions";
import * as cmsCollectionsFunctions from "@/services/cms-collections.functions";

const WORKSPACE_ROOT = process.cwd();

function readRepoFile(relPath: string): string {
  return fs.readFileSync(path.join(WORKSPACE_ROOT, relPath), "utf8");
}

describe("Omni Editor & CMS Wix Studio Parity Verification Suite", () => {
  describe("1. Viewport Frame Containment & Responsive Simulation", () => {
    it("contains viewport children inside a transform-isolated overflow-y-auto scrollport with fixed logical width", () => {
      const htmlDesktop = renderToStaticMarkup(
        <BuilderViewportFrame viewport="desktop" showControlsBar>
          <div className="fixed inset-x-0 top-0">Header Fixo</div>
        </BuilderViewportFrame>,
      );

      expect(htmlDesktop).toContain('data-testid="builder-viewport-host"');
      expect(htmlDesktop).toContain('data-testid="builder-viewport-shell"');
      expect(htmlDesktop).toContain('data-builder-viewport="desktop"');
      expect(htmlDesktop).toContain('data-testid="builder-viewport-scrollport"');
      expect(htmlDesktop).toContain("overflow-y-auto overflow-x-hidden");
      expect(htmlDesktop).toContain("width:1280px");
      expect(htmlDesktop).toContain("translateZ(0)");

      const htmlMobile = renderToStaticMarkup(
        <BuilderViewportFrame viewport="mobile" showControlsBar={false}>
          <p>Conteúdo Mobile</p>
        </BuilderViewportFrame>,
      );
      expect(htmlMobile).toContain('data-builder-viewport="mobile"');
      expect(htmlMobile).toContain("width:390px");
    });

    it("renders IFoodHeader compact mobile header inside forced mobile BuilderViewportProvider without leaking host desktop header", () => {
      const mobileHtml = renderToStaticMarkup(
        <BuilderViewportProvider viewport="mobile" isEditorCanvas>
          <IFoodHeader
            userName="Carlos Silva"
            activeAddress="Centro · SMO"
            unreadNotificationsCount={3}
          />
        </BuilderViewportProvider>,
      );

      const desktopHtml = renderToStaticMarkup(
        <BuilderViewportProvider viewport="desktop" isEditorCanvas>
          <IFoodHeader
            userName="Carlos Silva"
            activeAddress="Centro · SMO"
            unreadNotificationsCount={3}
          />
        </BuilderViewportProvider>,
      );

      expect(mobileHtml).toContain("Carlos");
      expect(mobileHtml).toContain("Centro · SMO");
      expect(mobileHtml).toContain("pt-safe flex");
      expect(desktopHtml).toContain("hidden");
      expect(mobileHtml).not.toBe(desktopHtml);
    });

    it("evaluates device visibility explicitly against the forced preview viewport", () => {
      const mobileOnlyBlock: Pick<OmniBlockInstance, "config" | "styling"> = {
        config: {},
        styling: { deviceVisibility: "mobile_only" },
      };
      const desktopOnlyBlock: Pick<OmniBlockInstance, "config" | "styling"> = {
        config: {},
        styling: { deviceVisibility: "desktop_only" },
      };

      expect(getBlockDeviceVisibilityClass(mobileOnlyBlock, "mobile")).toBe("block");
      expect(getBlockDeviceVisibilityClass(mobileOnlyBlock, "desktop")).toBe("hidden");
      expect(getBlockDeviceVisibilityClass(desktopOnlyBlock, "mobile")).toBe("hidden");
      expect(getBlockDeviceVisibilityClass(desktopOnlyBlock, "desktop")).toBe("block");
    });
  });

  describe("2. Schema Preservation (Theme Fonts, Button Tokens, Settings & CMS Bindings)", () => {
    it("preserves headingFont, bodyFont, surfaceStyle, appNavConfig, buttonStyler and cms_collection binding through Zod round-trip", () => {
      const base = createEmptyOmniPage("sobre-nos", "Sobre Nós", "institutional");
      const candidate: OmniPageDocument = {
        ...base,
        theme: {
          ...base.theme,
          headingFont: "Playfair Display, serif",
          bodyFont: "Plus Jakarta Sans, sans-serif",
          surfaceStyle: "elevated",
          customThemeEnabled: true,
        },
        settings: {
          appNavConfig: {
            barPosition: "top",
            showLabelsUnderIcons: false,
            tabs: ["Início", "Cardápio", "Pedidos", "Perfil"],
          },
          buttonStyler: {
            activeRole: "primary",
            shape: "pill",
            uppercase: true,
            borderWidthPx: 2,
          },
        },
        blocks: [
          {
            id: "blk_header_1",
            type: "site_header",
            config: { brandName: "Waesy Tour", menuHandle: "header_nav" },
          },
          {
            id: "blk_cms_1",
            type: "cms_collection_grid",
            config: { title: "Roteiros Especiais", collectionSlug: "roteiros" },
            dataBinding: {
              entity: "cms_collection",
              cmsCollectionSlug: "roteiros",
              limit: 6,
            },
          },
          {
            id: "blk_footer_1",
            type: "site_footer",
            config: { brandName: "Waesy Tour", menuHandle: "footer_menu" },
          },
        ],
      };

      const parsed = OmniPageDocumentSchema.parse(candidate);
      expect(parsed.theme.headingFont).toBe("Playfair Display, serif");
      expect(parsed.theme.bodyFont).toBe("Plus Jakarta Sans, sans-serif");
      expect(parsed.theme.surfaceStyle).toBe("elevated");
      expect(parsed.settings?.appNavConfig?.barPosition).toBe("top");
      expect(parsed.settings?.buttonStyler?.shape).toBe("pill");
      expect(parsed.blocks[1].dataBinding?.entity).toBe("cms_collection");
      expect(parsed.blocks[1].dataBinding?.cmsCollectionSlug).toBe("roteiros");

      const themeVars = getDocumentThemeCanvasStyle(parsed.theme, {
        forceIsolate: true,
        settings: parsed.settings,
      }) as Record<string, string>;
      expect(themeVars["--builder-heading-font"]).toContain("Playfair Display");
      expect(themeVars["--builder-btn-radius"]).toBe("9999px");
      expect(themeVars["--builder-btn-transform"]).toBe("uppercase");
    });
  });

  describe("3. Registry, SiteHeaderBlock, SiteFooterBlock, CmsCollectionGridBlock & OmniPageRenderer", () => {
    it("registers site_header, site_footer and cms_collection_grid with valid Wix categories", () => {
      const catIds = new Set(WIX_CATEGORY_CONFIG.map((c) => c.id));
      for (const blockId of ["site_header", "site_footer", "cms_collection_grid"]) {
        const def = getSiteBlockByIdStrict(blockId);
        expect(def).toBeDefined();
        expect(def?.id).toBe(blockId);
        expect(catIds.has(BLOCK_TO_WIX_CATEGORY[blockId])).toBe(true);
      }
    });

    it("resolves dynamic cms_collection items excluding drafts and renders full OmniPageRenderer with nav menus", () => {
      const sampleMenus = [
        {
          id: "menu-header",
          handle: "header_nav",
          location: "header_nav",
          title: "Menu Topo",
          items: [
            { id: "1", label: "Pacotes", href: "/paginas/pacotes" },
            { id: "2", label: "Frota", href: "/paginas/frota" },
          ],
        },
        {
          id: "menu-footer",
          handle: "footer_menu",
          location: "footer_menu",
          title: "Menu Rodapé",
          items: [
            { id: "3", label: "Termos de Uso", href: "/termos" },
            { id: "4", label: "Privacidade", href: "/privacidade" },
          ],
        },
      ];

      const sampleCollections = [
        {
          id: "col-1",
          store_id: "store-1",
          name: "Roteiros",
          slug: "roteiros",
          is_public: true,
          fields: [
            { id: "f1", key: "titulo", label: "Título", field_type: "text" },
            { id: "f2", key: "destino", label: "Destino", field_type: "text" },
          ],
          items: [
            {
              id: "item-1",
              collection_id: "col-1",
              status: "published",
              data: { titulo: "Serra Catarinense", destino: "Urubici - SC" },
            },
            {
              id: "item-2",
              collection_id: "col-1",
              status: "draft",
              data: { titulo: "Rascunho Secreto", destino: "Oculto" },
            },
          ],
        },
      ];

      const doc: OmniPageDocument = {
        ...createEmptyOmniPage("vitrine-agencia", "Agência Teste", "store_home"),
        settings: {
          buttonStyler: { activeRole: "primary", shape: "pill", uppercase: false, borderWidthPx: 1 },
        },
        blocks: [
          {
            id: "b-hdr",
            type: "site_header",
            config: { brandName: "Excelência Tour", menuHandle: "header_nav" },
          },
          {
            id: "b-cms",
            type: "cms_collection_grid",
            config: { title: "Nossos Roteiros", collectionSlug: "roteiros" },
            dataBinding: {
              entity: "cms_collection",
              cmsCollectionSlug: "roteiros",
              limit: 6,
            },
          },
          {
            id: "b-ftr",
            type: "site_footer",
            config: { brandName: "Excelência Tour", menuHandle: "footer_menu" },
          },
        ],
      };

      const bound = resolveBlockBoundData(doc.blocks[1], {
        cmsCollections: sampleCollections,
        navigationMenus: sampleMenus,
      });
      expect(bound.activeCmsCollection?.slug).toBe("roteiros");
      expect(bound.cmsItems).toHaveLength(1);
      expect(bound.cmsItems[0]?.data?.titulo).toBe("Serra Catarinense");

      const html = renderToStaticMarkup(
        <BuilderViewportProvider viewport="desktop">
          <OmniPageRenderer
            document={doc}
            navigationMenus={sampleMenus}
            cmsCollections={sampleCollections}
          />
        </BuilderViewportProvider>,
      );

      expect(html).toContain("Excelência Tour");
      expect(html).toContain("Pacotes");
      expect(html).toContain("Frota");
      expect(html).toContain("Serra Catarinense");
      expect(html).not.toContain("Rascunho Secreto");
      expect(html).toContain("Termos de Uso");
      expect(html).toContain("Privacidade");
    });

    it("renders standalone SiteHeaderBlock, SiteFooterBlock and CmsCollectionGridBlock cleanly in mobile viewport", () => {
      const headerHtml = renderToStaticMarkup(
        <BuilderViewportProvider viewport="mobile">
          <SiteHeaderBlock
            id="h1"
            data={{ brandName: "Padaria Central", showSearch: true, links: [{ label: "Menu", href: "/menu" }] }}
          />
        </BuilderViewportProvider>,
      );
      expect(headerHtml).toContain("Padaria Central");

      const footerHtml = renderToStaticMarkup(
        <BuilderViewportProvider viewport="mobile">
          <SiteFooterBlock
            id="f1"
            data={{ brandName: "Padaria Central", email: "oi@padaria.local", links: [{ label: "Contato", href: "/contato" }] }}
          />
        </BuilderViewportProvider>,
      );
      expect(footerHtml).toContain("Padaria Central");
      expect(footerHtml).toContain("oi@padaria.local");

      const cmsHtml = renderToStaticMarkup(
        <BuilderViewportProvider viewport="mobile">
          <CmsCollectionGridBlock
            id="c1"
            data={{ title: "Equipe", showEmptyState: true }}
            cmsItems={[]}
          />
        </BuilderViewportProvider>,
      );
      expect(cmsHtml).toContain("Equipe");
    });
  });

  describe("4. Four-Layer Persistence, Zero-Leak Security & Anti-Mock Parity", () => {
    it("exports complete multi-tenant CMS server functions and includes canonical footer_menu definition", () => {
      expect(typeof cmsCollectionsFunctions.listStoreCmsDashboardData).toBe("function");
      expect(typeof cmsCollectionsFunctions.createCmsCollection).toBe("function");
      expect(typeof cmsCollectionsFunctions.deleteCmsCollection).toBe("function");
      expect(typeof cmsCollectionsFunctions.upsertCmsCollectionField).toBe("function");
      expect(typeof cmsCollectionsFunctions.deleteCmsCollectionField).toBe("function");
      expect(typeof cmsCollectionsFunctions.upsertCmsCollectionItem).toBe("function");
      expect(typeof cmsCollectionsFunctions.deleteCmsCollectionItem).toBe("function");
      expect(typeof cmsCollectionsFunctions.getPublicCmsCollectionsForStore).toBe("function");

      const hasFooterFallback = CANONICAL_PLATFORM_MENUS.some(
        (m: any) => m.location === "footer_menu" || m.handle === "footer_menu",
      );
      expect(hasFooterFallback).toBe(true);
    });

    it("ships unified SQL migration with cms_collections, cms_collection_fields and cms_collection_items + RLS", () => {
      const sql = readRepoFile("supabase/migrations/20270402000000_cms_collections_unified_schema.sql");
      expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.cms_collections");
      expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.cms_collection_fields");
      expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.cms_collection_items");
      expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
      expect(sql).toContain("CREATE POLICY");
    });

    it("prevents omni_page_draft exposure on public _store.paginas.$slug route and renders PublicFooter fallback", () => {
      const routeSrc = readRepoFile("src/routes/_store.paginas.$slug.tsx");
      expect(routeSrc).not.toContain("omni_page_draft");
      expect(routeSrc).toContain("getPublicCmsCollectionsForStore");
      expect(routeSrc).toContain("getNavigationMenus");
      expect(routeSrc).toContain("PublicFooter");
    });

    it("removes hardcoded mock rows/counts from WixCmsCollectionManagerModal and BuilderCmsPanel", () => {
      const modalSrc = readRepoFile("src/components/admin/builder/BuilderWixStudioPanels.tsx");
      const panelSrc = readRepoFile("src/components/admin/builder/builder-cms-panel.tsx");

      expect(modalSrc).not.toContain("SUV Automático");
      expect(modalSrc).not.toContain("Pacote Foz do Iguaçu");
      expect(modalSrc).toContain("listStoreCmsDashboardData");
      expect(modalSrc).toContain("upsertCmsCollectionItem");
      expect(panelSrc).not.toContain("count: 12");
      expect(panelSrc).toContain("cmsCollections");
      expect(panelSrc).toContain("nativeCounts");
    });

    it("supports multi-menu location editing and accessible Up/Down reordering in workspace.cms.navegacao", () => {
      const navSrc = readRepoFile("src/routes/workspace.cms.navegacao.tsx");
      expect(navSrc).toContain("header_nav");
      expect(navSrc).toContain("footer_menu");
      expect(navSrc).toContain("main-menu");
      expect(navSrc).toContain("bottom_nav");
      expect(navSrc).toContain("explore_menu");
      expect(navSrc).toContain("moveItem");
    });
  });
});
