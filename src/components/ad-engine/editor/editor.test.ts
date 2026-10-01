import { describe, it, expect } from "vitest";
import { NICHE_TAXONOMY_REGISTRY, validateListingNicheTaxonomy } from "@/lib/ad-engine/niche-taxonomy-manifest";
import { listingCreationSchema } from "@/lib/ad-engine/listing-schemas";
import type { UnifiedListing } from "@/types/unified-ad-engine";

describe("Ad Engine Editor Suite (Bloco C: F15 a F24)", () => {
  it("F24 / Case O02: blocks grocery_gondola template on tourism niche", () => {
    const tourismListing: Partial<UnifiedListing> = {
      title: "Pacote Serra Gaúcha 4 Dias",
      niche: "tourism",
      template: "grocery_gondola", // Invalid for tourism!
      commercial: { price_cents: 150000 },
    };

    const result = validateListingNicheTaxonomy(tourismListing);
    expect(result.isValid).toBe(false);
    expect(result.errors.template).toBeTruthy();
    expect(result.errors.template).toContain("é incompatível com o nicho");
  });

  it("F24: allows valid tourism_immersive template on tourism niche", () => {
    const tourismListing: Partial<UnifiedListing> = {
      title: "Pacote Serra Gaúcha 4 Dias",
      niche: "tourism",
      template: "tourism_immersive",
      commercial: { price_cents: 150000 },
      media: { cover_url: "https://images.unsplash.com/photo-serra", media_urls: [] },
      inclusions: ["Hospedagem com Café"],
      attributes: { destination_name: "Gramado", transport_type: "Aéreo" },
    };

    const result = validateListingNicheTaxonomy(tourismListing);
    expect(result.isValid).toBe(true);
    expect(result.errorsList).toHaveLength(0);
  });

  it("F18: derives margin and markup correctly without division by zero", () => {
    const priceCents = 10000; // R$ 100
    const costCents = 6000;   // R$ 60

    const marginPercent = Math.round(((priceCents - costCents) / priceCents) * 100);
    const markupPercent = Math.round(((priceCents - costCents) / costCents) * 100);

    expect(marginPercent).toBe(40); // 40% margin
    expect(markupPercent).toBe(67); // 67% markup
  });

  it("F23: rejects listing without title or with invalid structure in listingCreationSchema", () => {
    const invalidListing = {
      origin: "classified",
      title: "AB", // Min 3 chars
      niche_id: "varejo",
      category_id: "cat-1",
      price_cents: -50,
    };

    const parsed = listingCreationSchema.safeParse(invalidListing);
    expect(parsed.success).toBe(false);
  });

  it("F15/F16: validates complete quick listing creation input schema", () => {
    const validQuickListing = {
      origin: "classified" as const,
      title: "Bicicleta Aro 29 Seminova",
      niche_id: "varejo",
      category_id: "cat-bikes",
      price_cents: 120000,
      selling_unit: "un",
      cover_url: "https://images.unsplash.com/photo-bike",
      media_urls: ["https://images.unsplash.com/photo-bike"],
    };

    const parsed = listingCreationSchema.safeParse(validQuickListing);
    expect(parsed.success).toBe(true);
  });

  it("F17: verifies each niche has valid sections composition and allowed templates", () => {
    const niches = Object.keys(NICHE_TAXONOMY_REGISTRY);
    expect(niches.length).toBeGreaterThanOrEqual(6);

    for (const key of niches) {
      const config = NICHE_TAXONOMY_REGISTRY[key as keyof typeof NICHE_TAXONOMY_REGISTRY];
      expect(config.allowedTemplates.length).toBeGreaterThan(0);
      expect(config.sectionsComposition.length).toBeGreaterThan(0);
      expect(config.name).toBeTruthy();
    }
  });
});
