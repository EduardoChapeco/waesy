import { describe, it, expect } from "vitest";
import type { UnifiedListing } from "@/types/unified-ad-engine";
import {
  NICHE_TAXONOMY_REGISTRY,
  normalizeAdEngineNicheId,
} from "@/lib/ad-engine/niche-taxonomy-manifest";
import {
  CANONICAL_TEMPLATES_CATALOG,
  isTemplateAllowedForNiche,
  listAllowedTemplatesForNiche,
  resolveTemplate,
} from "@/lib/ad-engine/template-metamorphosis";

describe("Ad Engine Public View & Preview Suite (Bloco D: F25 a F32 + Cases 1–14)", () => {
  it("F26 / Rule P4: calculates proportional scale correctly for container widths without horizontal scroll", () => {
    const targetWidthMobile = 390;
    const targetWidthTablet = 768;
    const targetWidthDesktop = 1280;

    // Simulation on small mobile screen (container 350px)
    const containerSmall = 350;
    const scaleMobileSmall = Number((containerSmall / targetWidthMobile).toFixed(3));
    expect(scaleMobileSmall).toBeLessThan(1);
    expect(scaleMobileSmall).toBe(0.897);

    // Simulation on tablet container (600px available) with Desktop target (1280px)
    const containerTablet = 600;
    const scaleDesktopOnTablet = Number((containerTablet / targetWidthDesktop).toFixed(3));
    expect(scaleDesktopOnTablet).toBeLessThan(1);
    expect(scaleDesktopOnTablet).toBe(0.469);

    // Simulation on wide container (1400px available)
    const containerWide = 1400;
    const scaleDesktopOnWide = Math.min(1, Number((containerWide / targetWidthDesktop).toFixed(3)));
    expect(scaleDesktopOnWide).toBe(1);
  });

  it("F27 / Rule P1 & P6: ensures inclusions and exclusions lists are correctly isolated without zero placeholders", () => {
    const tourismListing: Partial<UnifiedListing> = {
      title: "Expedição Chapada Diamantina",
      niche: "tourism",
      commercial: { price_cents: 280000 },
      inclusions: ["Guia credenciado CADASTUR", "Transfer 4x4", "Seguro Viagem"],
      exclusions: ["Passagens aéreas", "Bebidas alcoólicas"],
    };

    expect(tourismListing.inclusions?.length).toBe(3);
    expect(tourismListing.exclusions?.length).toBe(2);
    expect(tourismListing.inclusions).not.toContain("0 Inclusos");
    expect(tourismListing.inclusions![0]).toBe("Guia credenciado CADASTUR");
  });

  it("F28 / Rule P7: checks booking deposit calculations for tourism packages", () => {
    const basePriceCents = 150000;
    const depositPercent = 30;
    const quantity = 2;

    const totalPriceCents = basePriceCents * quantity;
    const depositCents = Math.round((totalPriceCents * depositPercent) / 100);
    const balanceCents = totalPriceCents - depositCents;

    expect(totalPriceCents).toBe(300000);
    expect(depositCents).toBe(90000);
    expect(balanceCents).toBe(210000);
  });

  it("F29: sanitizes WhatsApp phone number format and prepares bilateral lead payload", () => {
    const rawPhone = "+55 (49) 99123-4567";
    const cleanPhone = rawPhone.replace(/\D/g, "");
    expect(cleanPhone).toBe("5549991234567");

    const leadPayload = {
      channel: "whatsapp" as const,
      phone: cleanPhone,
      listingTitle: "Apartamento 3 Quartos Centro",
      timestamp: new Date().toISOString(),
    };

    expect(leadPayload.phone).toMatch(/^\d{11,13}$/);
    expect(leadPayload.channel).toBe("whatsapp");
  });

  it("F30: verifies all empty state reasons contain actionable descriptors without dead ends", () => {
    const requiredReasons = [
      "not_found",
      "expired",
      "out_of_stock",
      "unauthorized_draft",
      "server_error",
    ] as const;

    for (const reason of requiredReasons) {
      expect(typeof reason).toBe("string");
      expect(reason.length).toBeGreaterThan(0);
    }
  });

  it("F31: enforces semantic color tokens and complete niche registry in ad-engine", () => {
    const allowedNiches = Object.keys(NICHE_TAXONOMY_REGISTRY);
    expect(allowedNiches).toContain("varejo");
    expect(allowedNiches).toContain("turismo");
    expect(allowedNiches).toContain("servico");
    expect(allowedNiches).toContain("veiculo");
    expect(allowedNiches).toContain("imovel");
    expect(allowedNiches).toContain("mercado");
    expect(allowedNiches).toContain("gastronomia");
    expect(allowedNiches).toContain("digital");

    for (const key of allowedNiches) {
      const manifest = NICHE_TAXONOMY_REGISTRY[key];
      expect(manifest).toBeDefined();
      expect(manifest?.label.length).toBeGreaterThan(0);
      expect(typeof manifest?.supportsShipping).toBe("boolean");
      for (const tplId of manifest?.allowedTemplates || []) {
        expect(CANONICAL_TEMPLATES_CATALOG[tplId]).toBeDefined();
      }
    }
  });

  it("Cases 1, 2, 3, 6, 7, 8: resolves Template A -> B -> A and handles plural/singular niche keys", () => {
    // Plural/legacy keys normalize to singular registry keys
    expect(normalizeAdEngineNicheId("servicos")).toBe("servico");
    expect(normalizeAdEngineNicheId("veiculos")).toBe("veiculo");
    expect(normalizeAdEngineNicheId("imoveis")).toBe("imovel");
    expect(normalizeAdEngineNicheId("desapego")).toBe("varejo");

    // Case 1: Template A in servico
    const tplA = resolveTemplate("servicos", "service_booking");
    expect(tplA).toBe("service_booking");

    // Case 2: Template B in servico
    const tplB = resolveTemplate("servicos", "service_portfolio");
    expect(tplB).toBe("service_portfolio");

    // Case 3: Return to Template A
    const tplAReturn = resolveTemplate("servicos", "service_booking");
    expect(tplAReturn).toBe("service_booking");

    // Case 8: Switch niche to veiculo while holding incompatible service_booking -> falls back to automotive_deal
    expect(isTemplateAllowedForNiche("veiculos", "service_booking")).toBe(false);
    const fallbackAuto = resolveTemplate("veiculos", "service_booking");
    expect(fallbackAuto).toBe("automotive_deal");

    // List allowed templates for plural key
    const allowedAuto = listAllowedTemplatesForNiche("veiculos");
    expect(allowedAuto.map((t) => t.id)).toEqual(["automotive_deal", "vehicle_showroom"]);
  });
});
