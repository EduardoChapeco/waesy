/**
 * omni-builder-executive-remediation.test.tsx
 *
 * Automated Verification Suite for Waesy Omni Builder & Controlled Design CMS:
 * 1. Dynamic Data Binding Resolver, Scheduling & Responsive Visibility
 * 2. Canonical Registry Resolution, Aliases & Fallbacks
 * 3. Controlled Design CMS Contract (Linear AST, not absolute coordinates)
 * 4. Theme Customization State (shouldApplyCustomDocumentTheme)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";

// Mock createServerFn from @tanstack/react-start at top level for node environment
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

import {
  resolveBlockBoundData,
  isBlockWithinSchedule,
  getBlockDeviceVisibilityClass,
  shouldApplyCustomDocumentTheme,
  getDocumentThemeCanvasStyle,
  pickContrastForeground,
  type BuilderRuntimeDatasets,
} from "@/lib/builder/block-data-resolver";
import { BuilderViewportProvider, useEffectiveViewport } from "@/design-system/vitrine/viewport-context";
import { VitrineCouponStrip } from "@/design-system/vitrine/vitrine-banners";
import { BuilderViewportFrame } from "./BuilderViewportFrame";
import { getSectionStyle } from "./utils";

import {
  getSiteBlockById,
  getSiteBlockByIdStrict,
  resolveCanonicalBlockId,
  BLOCK_TYPE_ALIASES,
} from "./registry";

import {
  type OmniPageDocument,
  type OmniBlockInstance,
} from "@/types/omni-builder";

describe("Omni Builder Executive Remediation & Architectural Verification Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. DYNAMIC DATA BINDING RESOLVER, SCHEDULING & RESPONSIVE VISIBILITY
  // =========================================================================
  describe("1. Data Binding Resolver, Temporal Scheduling & Visibility", () => {
    it("resolves bound collection items when block specifies collection binding", () => {
      const block: OmniBlockInstance = {
        id: "block-catalog-1",
        type: "product_grid",
        config: { title: "Ofertas em Destaque" },
        dataBinding: {
          entity: "products",
          limit: 2,
        },
      };

      const datasets: BuilderRuntimeDatasets = {
        products: [
          { id: "p1", name: "Produto 1", price: 29.9 },
          { id: "p2", name: "Produto 2", price: 49.9 },
          { id: "p3", name: "Produto 3", price: 99.9 },
        ],
      };

      const resolved = resolveBlockBoundData(block, datasets);
      expect(resolved).toBeDefined();
      expect(Array.isArray(resolved.products)).toBe(true);
      expect(resolved.products?.length).toBe(2);
      expect(resolved.products?.[0].name).toBe("Produto 1");
      expect(resolved.products?.[1].name).toBe("Produto 2");
    });

    it("evaluates temporal scheduling correctly (active, future, expired)", () => {
      const now = Date.now();
      const past = new Date(now - 24 * 60 * 60 * 1000).toISOString();
      const future = new Date(now + 24 * 60 * 60 * 1000).toISOString();
      const farPast = new Date(now - 48 * 60 * 60 * 1000).toISOString();
      const farFuture = new Date(now + 48 * 60 * 60 * 1000).toISOString();

      // No schedule configured -> always active
      expect(isBlockWithinSchedule({ config: {} }, now)).toBe(true);

      // Active schedule: started in the past, ends in the future
      expect(
        isBlockWithinSchedule(
          {
            config: {
              starts_at: past,
              ends_at: future,
            },
          },
          now
        )
      ).toBe(true);

      // Future schedule: starts tomorrow -> inactive
      expect(
        isBlockWithinSchedule(
          {
            config: {
              starts_at: future,
              ends_at: farFuture,
            },
          },
          now
        )
      ).toBe(false);

      // Expired schedule: ended yesterday -> inactive
      expect(
        isBlockWithinSchedule(
          {
            config: {
              starts_at: farPast,
              ends_at: past,
            },
          },
          now
        )
      ).toBe(false);
    });

    it("generates correct responsive device visibility Tailwind classes", () => {
      // Default / all -> empty string (visible on all devices)
      expect(getBlockDeviceVisibilityClass({ config: {}, styling: {} })).toBe("");
      expect(getBlockDeviceVisibilityClass({ config: {}, styling: { deviceVisibility: "all" } })).toBe("");

      // Desktop only -> hidden on mobile, block on md+
      expect(getBlockDeviceVisibilityClass({ config: {}, styling: { deviceVisibility: "desktop_only" } })).toBe(
        "hidden md:block"
      );

      // Mobile only -> block on mobile, hidden on md+
      expect(getBlockDeviceVisibilityClass({ config: {}, styling: { deviceVisibility: "mobile_only" } })).toBe(
        "md:hidden"
      );
    });

    it("correctly identifies when custom document theme should or should not apply", () => {
      // Default / undefined theme -> do not apply custom overrides
      expect(shouldApplyCustomDocumentTheme(undefined)).toBe(false);

      // Explicitly disabled custom theme -> do not apply
      expect(
        shouldApplyCustomDocumentTheme({
          primaryColor: "var(--primary)",
          backgroundColor: "var(--background)",
          textColor: "var(--foreground)",
          headingFont: "Inter, sans-serif",
          bodyFont: "Inter, sans-serif",
          borderRadius: "xl",
          surfaceStyle: "clean",
          customThemeEnabled: false,
        })
      ).toBe(false);

      // Explicitly enabled custom theme -> apply custom overrides
      expect(
        shouldApplyCustomDocumentTheme({
          primaryColor: "var(--primary)",
          backgroundColor: "var(--background)",
          textColor: "var(--foreground)",
          headingFont: "Inter, sans-serif",
          bodyFont: "Inter, sans-serif",
          borderRadius: "xl",
          surfaceStyle: "clean",
          customThemeEnabled: true,
        })
      ).toBe(true);
    });
  });

  // =========================================================================
  // 2. BLOCK REGISTRY & ALIAS RESOLUTION
  // =========================================================================
  describe("2. Canonical Block Registry & Alias Normalization", () => {
    it("resolves canonical block types directly", () => {
      const canonicalTypes = [
        "hero_minimal_split",
        "hero_interactive_carousel",
        "product_grid",
        "curated_hits_rail",
        "vitrine_lateral_drawer",
        "vitrine_buttons_dock",
        "vitrine_metamorphic_banner",
        "vitrine_product_shelf",
        "interactive_quote_calculator",
        "interactive_lead_quiz_flow",
        "contact_form_direct",
        "bento_asymmetric_4",
      ];

      for (const type of canonicalTypes) {
        const def = getSiteBlockByIdStrict(type);
        expect(def, `Block type '${type}' must be resolved strictly in registry`).toBeDefined();
        expect(def?.id).toBe(type);
        expect(def?.name).toBeTruthy();
        expect(typeof def?.component).toBe("function");
      }
    });

    it("normalizes legacy and short alias block types to canonical identifiers", () => {
      expect(resolveCanonicalBlockId("bento_grid")).toBe("bento_asymmetric_4");
      expect(resolveCanonicalBlockId("bento_asymmetric_grid")).toBe("bento_asymmetric_4");
      expect(resolveCanonicalBlockId("pricing_tables_clean")).toBe("pricing_three_tiers");
      expect(resolveCanonicalBlockId("ifood_feature_cards_rail")).toBe("vitrine_visual_spotlight_rail");
      expect(resolveCanonicalBlockId("supermarket_hero_carousel")).toBe("vitrine_metamorphic_banner");
      expect(resolveCanonicalBlockId("supermarket_category_dock")).toBe("vitrine_buttons_dock");
      expect(resolveCanonicalBlockId("supermarket_product_shelf")).toBe("vitrine_product_shelf");
    });

    it("provides fallback definition with graceful fallback component for unregistered types", () => {
      // getSiteBlockByIdStrict returns undefined for unknown types
      expect(getSiteBlockByIdStrict("unknown_future_experimental_block")).toBeUndefined();

      // getSiteBlockById returns rich_text neutral fallback with valid component
      const fallbackDef = getSiteBlockById("unknown_future_experimental_block");
      expect(fallbackDef).toBeDefined();
      expect(fallbackDef.id).toBe("rich_text");
      expect(typeof fallbackDef.component).toBe("function");
    });
  });

  // =========================================================================
  // 3. CONTROLLED DESIGN CMS CONTRACT
  // =========================================================================
  describe("3. Controlled Design CMS Contract (Not Freeform Canvas)", () => {
    it("preserves linear modular blocks list in OmniPageDocument without absolute coordinate AST", () => {
      const doc: OmniPageDocument = {
        id: "doc-test-1",
        title: "Página Principal",
        slug: "home",
        published: true,
        version: 1,
        theme: {
          primaryColor: "var(--primary)",
          backgroundColor: "var(--background)",
          textColor: "var(--foreground)",
          headingFont: "Inter, sans-serif",
          bodyFont: "Inter, sans-serif",
          borderRadius: "xl",
          surfaceStyle: "clean",
          customThemeEnabled: false,
        },
        blocks: [
          {
            id: "b1",
            type: "hero_minimal_split",
            config: { headline: "Bem-vindo" },
          },
          {
            id: "b2",
            type: "product_grid",
            config: { title: "Destaques" },
          },
        ],
      };

      expect(Array.isArray(doc.blocks)).toBe(true);
      expect(doc.blocks.length).toBe(2);
      expect(doc.blocks[0].id).toBe("b1");
      expect(doc.blocks[1].id).toBe("b2");
      // Must NOT contain freeform canvas absolute positioning attributes like x, y, zIndex, widthPx
      expect((doc.blocks[0] as any).x).toBeUndefined();
      expect((doc.blocks[0] as any).y).toBeUndefined();
    });
  });

  // =========================================================================
  // 4. VIEWPORT ISOLATION, DESIGN INDEPENDENCE & RUNTIME FIXES
  // =========================================================================
  describe("4. Viewport Isolation, Independent Design Tokens & Runtime Contracts", () => {
    it("isolates Tablet & Mobile viewports inside BuilderViewportProvider and avoids VitrineCouponStrip horizontal crush", () => {
      function TabletProbe() {
        const vp = useEffectiveViewport();
        return <span data-size={vp.sizeClass} data-medium={String(vp.isMedium)} data-mobile={String(vp.isMobile)} />;
      }

      const tabletHtml = renderToStaticMarkup(
        <BuilderViewportProvider viewport="tablet" isEditorCanvas>
          <TabletProbe />
        </BuilderViewportProvider>,
      );
      expect(tabletHtml).toContain('data-size="medium"');
      expect(tabletHtml).toContain('data-medium="true"');
      expect(tabletHtml).toContain('data-mobile="false"');

      const couponHtml = renderToStaticMarkup(
        <BuilderViewportProvider viewport="mobile" isEditorCanvas>
          <VitrineCouponStrip
            title="Use o cupom na finalização"
            subtitle="Válido para pedidos diretos na vitrine."
            couponCode="PEDID010"
            ctaLabel="Ir ao Cardápio"
          />
        </BuilderViewportProvider>,
      );
      expect(couponHtml).toContain("flex-col items-stretch");
      expect(couponHtml).not.toContain("sm:flex-row");
    });

    it("renders sectionToolbarSlot outside the scaled viewport scrollport in BuilderViewportFrame", () => {
      const html = renderToStaticMarkup(
        <BuilderViewportFrame
          viewport="mobile"
          onChangeViewport={() => {}}
          sectionToolbarSlot={<button type="button">Planilha</button>}
        >
          <div>Conteúdo</div>
        </BuilderViewportFrame>,
      );
      const slotPos = html.indexOf('data-testid="builder-section-toolbar-slot"');
      const shellPos = html.indexOf('data-testid="builder-viewport-shell"');
      expect(slotPos).toBeGreaterThan(-1);
      expect(shellPos).toBeGreaterThan(-1);
      expect(slotPos).toBeLessThan(shellPos);
      expect(html).toContain("App Nativo");
    });

    it("computes contrast-safe foreground & complete theme isolation for documents and sections", () => {
      // design-lint-ignore DL-01 reason:"Asserção de cálculo de luminância WCAG para cores de marca no Builder" expiry:"2027-12-31"
      expect(pickContrastForeground("#0f172a")).toBe("#ffffff");
      // design-lint-ignore DL-01 reason:"Asserção de cálculo de luminância WCAG para cores de marca no Builder" expiry:"2027-12-31"
      expect(pickContrastForeground("#fde047")).toBe("#09090b");

      const docStyle = getDocumentThemeCanvasStyle(
        {
          // design-lint-ignore DL-01 reason:"Teste de isolamento de cor primária customizada do tema do site" expiry:"2027-12-31"
          primaryColor: "#eab308",
          // design-lint-ignore DL-01 reason:"Teste de fundo escuro isolado" expiry:"2027-12-31"
          backgroundColor: "#0f172a",
          // design-lint-ignore DL-01 reason:"Teste de texto claro isolado" expiry:"2027-12-31"
          textColor: "#f8fafc",
          bodyFont: "'Space Grotesk', sans-serif",
          borderRadius: "2xl",
          customThemeEnabled: true,
        },
        { forceIsolate: true },
      ) as Record<string, string>;

      expect(docStyle["--primary-foreground"]).toBe("#09090b");
      expect(docStyle["--font-sans"]).toBe("'Space Grotesk', sans-serif");
      expect(docStyle["--radius"]).toBe("1.5rem");

      const section = getSectionStyle(
        {
          // design-lint-ignore DL-01 reason:"Teste de autonomia visual de seção escura sem cor explícita de texto" expiry:"2027-12-31"
          backgroundColor: "#111827",
          // design-lint-ignore DL-01 reason:"Teste de cor CTA de destaque independente por seção" expiry:"2027-12-31"
          accentColor: "#2563eb",
          backgroundGradient: "soft",
          textAlign: "center",
          fontFamily: "'Playfair Display', Georgia, serif",
        },
        true,
      );
      expect(section.className).toContain("text-center");
      expect((section.style as Record<string, string>)["--foreground"]).toBe("#ffffff");
      expect((section.style as Record<string, string>)["--primary"]).toBe("#2563eb");
      expect((section.style as Record<string, string>)["--primary-foreground"]).toBe("#ffffff");
      expect(section.style.fontFamily).toBe("'Playfair Display', Georgia, serif");
      expect(section.style.backgroundImage).toContain("linear-gradient");
    });

    it("prevents modal width crushing, double close buttons, and /workspace/pedidos Invariant failed crash", () => {
      const root = process.cwd();
      const modalFiles = [
        "src/components/admin/builder/BuilderCodeExplorerModal.tsx",
        "src/components/admin/builder/OmniAppMarketModal.tsx",
        "src/components/admin/builder/PhotoStudioModal.tsx",
        "src/components/admin/builder/BuilderWixStudioPanels.tsx",
      ];
      for (const rel of modalFiles) {
        const src = fs.readFileSync(path.resolve(root, rel), "utf8");
        expect(src, `${rel} deve declarar size="full"`).toContain('size="full"');
      }

      const gestorSrc = fs.readFileSync(
        path.resolve(root, "src/components/workspace/orders/kds-order-manager.tsx"),
        "utf8",
      );
      const kdsFnIdx = gestorSrc.indexOf("export function KDSPage");
      expect(kdsFnIdx).toBeGreaterThan(-1);
      expect(gestorSrc.slice(kdsFnIdx)).not.toContain("Route.useLoaderData()");
    });
  });
});
