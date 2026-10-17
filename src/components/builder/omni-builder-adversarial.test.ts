/**
 * omni-builder-adversarial.test.ts
 * 
 * Adversarial Empirical Challenge Suite for Milestone 1:
 * Omni-Builder Block Resolution, Tourism Dynamic Blocks & Resilience under Adversarial/Malformed Inputs.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Mock createServerFn from @tanstack/react-start at top level so server functions can be tested in node runtime
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
  SITE_BUILDER_BLOCKS,
  BLOCK_TO_WIX_CATEGORY,
  WIX_CATEGORY_CONFIG,
  getSiteBlockById,
  getSiteBlockByIdStrict,
  getSiteBlocksByCategory,
} from "./registry";

import {
  OmniPageDocumentSchema,
  createEmptyOmniPage,
  addBlockToPage,
  updateBlockInPage,
  removeBlockFromPage,
  moveBlockInPage,
  duplicateBlockInPage,
  type OmniPageDocument,
} from "./types";

import { OmniPageRenderer } from "./OmniPageRenderer";

// Direct imports of the actual components from dynamic-sections to verify name parity
import * as dynamicBookingHeroModule from "@/components/commerce/dynamic-sections/dynamic-booking-hero";
import * as categoryIconGridModule from "@/components/commerce/dynamic-sections/category-icon-grid";
import * as dynamicProductCarouselModule from "@/components/commerce/dynamic-sections/dynamic-product-carousel";
import * as travelProductDetailModule from "@/components/commerce/dynamic-sections/travel-product-detail";
import * as customerTravelPortalModule from "@/components/commerce/dynamic-sections/customer-travel-portal";

describe("Milestone 1 Challenger: Empirical Omni-Builder & Dynamic Blocks Stress Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. Tourism Blocks Registry Categorization & Contracts
  // =========================================================================
  describe("1. Tourism Dynamic Blocks Verification in Registry", () => {
    const tourismBlockIds = [
      "dynamic_booking_hero",
      "category_icon_grid",
      "dynamic_product_carousel",
      "travel_product_detail",
      "customer_travel_portal",
    ] as const;

    it("verifies all 5 tourism block IDs are registered with category 'tourism' in SITE_BUILDER_BLOCKS", () => {
      for (const blockId of tourismBlockIds) {
        const strictDef = getSiteBlockByIdStrict(blockId);
        expect(strictDef, `Block '${blockId}' must be strictly found in registry`).toBeDefined();
        expect(strictDef?.category).toBe("tourism");
        expect(strictDef?.component, `Block '${blockId}' must have a wrapper component`).toBeDefined();
        expect(typeof strictDef?.component).toBe("function");
        expect(strictDef?.defaultProps, `Block '${blockId}' must have defaultProps`).toBeDefined();
      }
    });

    it("verifies all 5 tourism blocks are mapped to category 'tourism' in BLOCK_TO_WIX_CATEGORY", () => {
      for (const blockId of tourismBlockIds) {
        const wixCategory = BLOCK_TO_WIX_CATEGORY[blockId];
        expect(
          wixCategory,
          `BLOCK_TO_WIX_CATEGORY['${blockId}'] must equal 'tourism'`
        ).toBe("tourism");
      }
    });

    it("verifies getSiteBlocksByCategory('tourism') returns all 5 tourism blocks", () => {
      const tourismBlocks = getSiteBlocksByCategory("tourism");
      const returnedIds = tourismBlocks.map((b) => b.id);

      for (const blockId of tourismBlockIds) {
        expect(
          returnedIds,
          `getSiteBlocksByCategory('tourism') must include '${blockId}'`
        ).toContain(blockId);
      }
    });

    it("verifies getSiteBlockById strictly resolves the exact tourism block without fallback to block 0", () => {
      for (const blockId of tourismBlockIds) {
        const block = getSiteBlockById(blockId);
        expect(block.id).toBe(blockId);
        expect(block.category).toBe("tourism");
      }
    });

    it("verifies getSiteBlockByIdStrict returns undefined for unknown block IDs (zero silent fallback)", () => {
      const unknownResult = getSiteBlockByIdStrict("unknown_malicious_block_type_xyz");
      expect(unknownResult).toBeUndefined();
    });

    it("verifies category 'tourism' is in WIX_CATEGORY_CONFIG taxonomy", () => {
      const tourismConfig = WIX_CATEGORY_CONFIG.find((c) => c.id === "tourism");
      expect(tourismConfig).toBeDefined();
      expect(tourismConfig?.label).toBe("Turismo");
      expect(tourismConfig?.icon).toBeDefined();
    });

    it("verifies all 5 tourism blocks export valid component functions matching registry imports", () => {
      // Verify both canonical and alias names are exported as valid React components
      expect(dynamicBookingHeroModule.DynamicBookingHero).toBeDefined();
      expect(typeof dynamicBookingHeroModule.DynamicBookingHero).toBe("function");
      expect((dynamicBookingHeroModule as any).DynamicBookingHeroSection).toBeDefined();

      expect(categoryIconGridModule.CategoryIconGrid).toBeDefined();
      expect(typeof categoryIconGridModule.CategoryIconGrid).toBe("function");
      expect((categoryIconGridModule as any).CategoryIconGridSection).toBeDefined();

      expect(dynamicProductCarouselModule.DynamicProductCarousel).toBeDefined();
      expect(typeof dynamicProductCarouselModule.DynamicProductCarousel).toBe("function");
      expect((dynamicProductCarouselModule as any).DynamicProductCarouselSection).toBeDefined();

      expect(travelProductDetailModule.TravelProductDetail).toBeDefined();
      expect(typeof travelProductDetailModule.TravelProductDetail).toBe("function");
      expect((travelProductDetailModule as any).TravelProductDetailSection).toBeDefined();

      expect(customerTravelPortalModule.CustomerTravelPortal).toBeDefined();
      expect(typeof customerTravelPortalModule.CustomerTravelPortal).toBe("function");
      expect((customerTravelPortalModule as any).CustomerTravelPortalSection).toBeDefined();
    });
  });

  // =========================================================================
  // 2. Omni-Builder Document Resolution Logic & Tree Lookup Bypass
  // =========================================================================
  describe("2. Omni-Builder Resolution Bypass Contract in getPublicExperienceDocumentBySlug", () => {
    it("empirically verifies bypass logic: when omni_page.blocks exists and has items, tree is empty array and legacy queries are skipped", async () => {
      const { getPublicExperienceDocumentBySlug } = await import("@/services/builder.functions");

      const versionsSpy = vi.fn();
      const nodesSpy = vi.fn();

      const mockDocWithOmni = {
        id: "doc-omni-123",
        store_id: "550e8400-e29b-41d4-a716-446655440000",
        slug: "turismo-pacotes",
        document_type: "storefront",
        title: "Pacotes de Viagem",
        is_active: true,
        settings: {
          omni_page: {
            schemaVersion: 1,
            page_id: "page-789",
            slug: "turismo-pacotes",
            title: "Pacotes de Viagem",
            blocks: [
              {
                id: "blk-1",
                type: "dynamic_booking_hero",
                config: { headline: "Reserve Sua Viagem" },
              },
            ],
          },
        },
      };

      const createChainableQuery = (finalData: any, spy?: Function) => {
        const query: any = {
          select: () => query,
          eq: () => query,
          order: () => query,
          limit: () => query,
          maybeSingle: async () => {
            if (spy) spy();
            return { data: finalData, error: null };
          },
        };
        return query;
      };

      const mockSupabaseClient = {
        from: (table: string) => {
          if (table === "stores") {
            return createChainableQuery({ id: "550e8400-e29b-41d4-a716-446655440000" });
          }
          if (table === "experience_documents") {
            return createChainableQuery(mockDocWithOmni);
          }
          if (table === "experience_versions") {
            return createChainableQuery([], versionsSpy);
          }
          if (table === "experience_nodes") {
            return createChainableQuery([], nodesSpy);
          }
          return createChainableQuery(null);
        },
      };

      const supabaseModule = await import("@/lib/supabase");
      vi.spyOn(supabaseModule, "getServerClient").mockReturnValue(mockSupabaseClient as any);

      const result = await getPublicExperienceDocumentBySlug({
        data: {
          slug: "turismo-pacotes",
          document_type: "storefront",
          storeId: "550e8400-e29b-41d4-a716-446655440000",
        },
      });

      expect(result.status).toBe("ok");
      if (result.status === "ok") {
        expect(result.data.document.id).toBe("doc-omni-123");
        expect(result.data.tree).toEqual([]);
      }

      // Invariant: tree lookup tables must NEVER have been called when omni_page.blocks exists!
      expect(versionsSpy, "experience_versions must NOT be queried when omni_page.blocks exists").not.toHaveBeenCalled();
      expect(nodesSpy, "experience_nodes must NOT be queried when omni_page.blocks exists").not.toHaveBeenCalled();

      vi.restoreAllMocks();
    });

    it("empirically verifies fallback logic: when omni_page.blocks is empty or absent, legacy tree lookup is triggered", async () => {
      const { getPublicExperienceDocumentBySlug } = await import("@/services/builder.functions");

      const versionsSpy = vi.fn();
      const nodesSpy = vi.fn();

      const mockLegacyDoc = {
        id: "doc-legacy-123",
        store_id: "550e8400-e29b-41d4-a716-446655440000",
        slug: "pagina-antiga",
        document_type: "storefront",
        title: "Página Clássica",
        is_active: true,
        settings: {
          omni_page: {
            blocks: [],
          },
        },
      };

      const createChainableQuery = (finalData: any, spy?: Function) => {
        const query: any = {
          select: () => query,
          eq: () => query,
          order: () => query,
          limit: () => {
            if (spy) spy();
            return Promise.resolve({ data: finalData, error: null });
          },
          maybeSingle: async () => {
            if (spy) spy();
            return { data: finalData, error: null };
          },
        };
        return query;
      };

      const mockSupabaseClient = {
        from: (table: string) => {
          if (table === "stores") {
            return createChainableQuery({ id: "550e8400-e29b-41d4-a716-446655440000" });
          }
          if (table === "experience_documents") {
            return createChainableQuery(mockLegacyDoc);
          }
          if (table === "experience_versions") {
            return createChainableQuery(
              [{ id: "ver-1", document_id: "doc-legacy-123", status: "published" }],
              versionsSpy
            );
          }
          if (table === "experience_nodes") {
            const q = createChainableQuery([], nodesSpy);
            q.order = async () => ({ data: [], error: null });
            return q;
          }
          return createChainableQuery(null);
        },
      };

      const supabaseModule = await import("@/lib/supabase");
      vi.spyOn(supabaseModule, "getServerClient").mockReturnValue(mockSupabaseClient as any);

      const result = await getPublicExperienceDocumentBySlug({
        data: {
          slug: "pagina-antiga",
          document_type: "storefront",
          storeId: "550e8400-e29b-41d4-a716-446655440000",
        },
      });

      expect(result.status).toBe("ok");
      // Because omni_page.blocks was empty, experience_versions WAS queried
      expect(versionsSpy, "experience_versions must be queried when omni_page.blocks is empty").toHaveBeenCalled();

      vi.restoreAllMocks();
    });
  });

  // =========================================================================
  // 3. OmniPageRenderer Resilience under Malformed / Empty / Adversarial Inputs
  // =========================================================================
  describe("3. OmniPageRenderer Defensive Resilience", () => {
    it("handles null and undefined document gracefully without crashing", () => {
      const htmlNull = renderToStaticMarkup(
        React.createElement(OmniPageRenderer, { document: null as any })
      );
      expect(htmlNull).toBe("");

      const htmlUndefined = renderToStaticMarkup(
        React.createElement(OmniPageRenderer, { document: undefined as any })
      );
      expect(htmlUndefined).toBe("");
    });

    it("handles document with empty blocks array gracefully without crashing", () => {
      const emptyDoc: OmniPageDocument = {
        schemaVersion: 1,
        page_id: "page-empty",
        slug: "empty",
        title: "Vazia",
        theme: {
          primaryColor: "var(--primary)",
          backgroundColor: "var(--background)",
          textColor: "var(--foreground)",
          fontFamily: "Inter",
          borderRadius: "xl",
        },
        blocks: [],
      };

      const html = renderToStaticMarkup(
        React.createElement(OmniPageRenderer, { document: emptyDoc })
      );
      expect(html).toBe("");
    });

    it("skips unregistered/corrupted block types without crashing the entire page", () => {
      const pageWithCorruptedBlock: OmniPageDocument = {
        schemaVersion: 1,
        page_id: "page-corrupted",
        slug: "test-corrupted",
        title: "Página com Bloco Corrompido",
        theme: {
          primaryColor: "var(--primary)",
          backgroundColor: "var(--background)",
          textColor: "var(--foreground)",
          fontFamily: "Inter",
          borderRadius: "xl",
        },
        blocks: [
          {
            id: "bad-block-1",
            type: "malicious_injected_non_existent_type",
            config: { someCorruptedField: 123 },
          },
          {
            id: "good-block-1",
            type: "hero_minimal_split",
            config: {
              title: "Título Válido",
              primaryCta: { label: "Ação", href: "#" },
            },
          },
        ],
      };

      const html = renderToStaticMarkup(
        React.createElement(OmniPageRenderer, { document: pageWithCorruptedBlock })
      );
      expect(html).toContain("Título Válido");
      expect(html).not.toContain("bad-block-1");
    });

    it("skips blocks with isHidden: true", () => {
      const pageWithHiddenBlock: OmniPageDocument = {
        schemaVersion: 1,
        page_id: "page-hidden",
        slug: "test-hidden",
        title: "Página com Bloco Oculto",
        theme: {
          primaryColor: "var(--primary)",
          backgroundColor: "var(--background)",
          textColor: "var(--foreground)",
          fontFamily: "Inter",
          borderRadius: "xl",
        },
        blocks: [
          {
            id: "hidden-hero",
            type: "hero_minimal_split",
            isHidden: true,
            config: {
              title: "Título Que Não Deve Aparecer",
              primaryCta: { label: "Ação", href: "#" },
            },
          },
          {
            id: "visible-hero",
            type: "hero_minimal_split",
            isHidden: false,
            config: {
              title: "Título Que Deve Aparecer",
              primaryCta: { label: "Ação", href: "#" },
            },
          },
        ],
      };

      const html = renderToStaticMarkup(
        React.createElement(OmniPageRenderer, { document: pageWithHiddenBlock })
      );
      expect(html).toContain("Título Que Deve Aparecer");
      expect(html).not.toContain("Título Que Não Deve Aparecer");
    });

    it("handles adversarial scrollAnimation values without crashing", () => {
      const pageWithAdversarialAnim: OmniPageDocument = {
        schemaVersion: 1,
        page_id: "page-anim",
        slug: "test-anim",
        title: "Página com Animação Desconhecida",
        theme: {
          primaryColor: "var(--primary)",
          backgroundColor: "var(--background)",
          textColor: "var(--foreground)",
          fontFamily: "Inter",
          borderRadius: "xl",
        },
        blocks: [
          {
            id: "blk-anim",
            type: "hero_minimal_split",
            styling: {
              scrollAnimation: "non_existent_exploit_anim" as any,
            },
            config: {
              title: "Título com Animação Estranha",
              primaryCta: { label: "Ação", href: "#" },
            },
          },
        ],
      };

      expect(() => {
        renderToStaticMarkup(
          React.createElement(OmniPageRenderer, { document: pageWithAdversarialAnim })
        );
      }).not.toThrow();
    });

    it("verifies all 5 tourism blocks render successfully via OmniPageRenderer without runtime errors", () => {
      const tourismBlockIds = [
        "dynamic_booking_hero",
        "category_icon_grid",
        "dynamic_product_carousel",
        "travel_product_detail",
        "customer_travel_portal",
      ];

      for (const blockId of tourismBlockIds) {
        const testDoc: OmniPageDocument = {
          schemaVersion: 1,
          page_id: `page-test-${blockId}`,
          slug: `test-${blockId}`,
          title: `Teste ${blockId}`,
          theme: {
            primaryColor: "var(--primary)",
            backgroundColor: "var(--background)",
            textColor: "var(--foreground)",
            fontFamily: "Inter",
            borderRadius: "xl",
          },
          blocks: [
            {
              id: `blk-${blockId}`,
              type: blockId,
              config: getSiteBlockById(blockId).defaultProps,
            },
          ],
        };

        // All 5 blocks must render valid HTML markup without throwing Element type is invalid
        expect(() => {
          const html = renderToStaticMarkup(
            React.createElement(OmniPageRenderer, { document: testDoc })
          );
          expect(html).toBeTruthy();
          expect(html.length).toBeGreaterThan(0);
        }).not.toThrow();
      }
    });
  });

  // =========================================================================
  // 4. Immutable State Operations with Tourism Blocks
  // =========================================================================
  describe("4. State Machine Operations on Tourism Blocks", () => {
    it("dynamically manages tourism blocks in immutable state tree", () => {
      let page = createEmptyOmniPage("viagens-sul", "Agência Serra & Mar", "tourism");
      expect(page.blocks.length).toBe(0);

      // Add dynamic_booking_hero
      page = addBlockToPage(
        page,
        "dynamic_booking_hero",
        getSiteBlockById("dynamic_booking_hero").defaultProps
      );
      expect(page.blocks.length).toBe(1);
      expect(page.blocks[0].type).toBe("dynamic_booking_hero");

      // Add category_icon_grid
      page = addBlockToPage(
        page,
        "category_icon_grid",
        getSiteBlockById("category_icon_grid").defaultProps
      );
      expect(page.blocks.length).toBe(2);

      // Add travel_product_detail
      page = addBlockToPage(
        page,
        "travel_product_detail",
        getSiteBlockById("travel_product_detail").defaultProps
      );
      expect(page.blocks.length).toBe(3);

      const heroId = page.blocks[0].id;
      const detailId = page.blocks[2].id;

      // Update travel_product_detail config
      page = updateBlockInPage(
        page,
        detailId,
        { title: "Hotel Fazenda das Araucárias" },
        { backgroundColor: "var(--muted)" }
      );
      expect(page.blocks[2].config.title).toBe("Hotel Fazenda das Araucárias");
      expect(page.blocks[2].styling?.backgroundColor).toBe("var(--muted)");
      // Other blocks must remain untouched
      expect(page.blocks[0].id).toBe(heroId);

      // Duplicate travel_product_detail
      page = duplicateBlockInPage(page, detailId);
      expect(page.blocks.length).toBe(4);
      expect(page.blocks[3].config.title).toBe("Hotel Fazenda das Araucárias");
      expect(page.blocks[3].id).not.toBe(detailId);

      // Move duplicated block to top (index 0)
      page = moveBlockInPage(page, 3, 0);
      expect(page.blocks[0].config.title).toBe("Hotel Fazenda das Araucárias");
      expect(page.blocks[1].id).toBe(heroId);

      // Remove the original detail block
      page = removeBlockFromPage(page, detailId);
      expect(page.blocks.length).toBe(3);

      // Edge case resilience: operations on non-existent IDs must be no-op
      const unchangedPage1 = updateBlockInPage(page, "non_existent_id", { foo: "bar" });
      expect(unchangedPage1.blocks.length).toBe(3);

      const unchangedPage2 = removeBlockFromPage(page, "non_existent_id");
      expect(unchangedPage2.blocks.length).toBe(3);

      const unchangedPage3 = duplicateBlockInPage(page, "non_existent_id");
      expect(unchangedPage3.blocks.length).toBe(3);

      // Out-of-bounds move must be safe
      const safeMoved = moveBlockInPage(page, -1, 99);
      expect(safeMoved.blocks.length).toBe(3);
    });
  });
});
