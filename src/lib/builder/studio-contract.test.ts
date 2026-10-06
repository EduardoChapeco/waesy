import { describe, expect, it } from "vitest";
import { createEmptyOmniPage, OmniPageDocumentSchema } from "@/types/omni-builder";
import { BuilderAssetRefSchema, isAssetPublicationReady } from "./asset-contract";
import {
  getStudioTemplate,
  listStudioTemplates,
  materializeStudioTemplate,
  STUDIO_TEMPLATE_CATALOG,
} from "./studio-catalog";
import { resolveStudioMotionClasses } from "./motion-runtime";
import { getSiteBlockByIdStrict } from "@/components/builder/registry";

describe("Waesy Studio canonical contracts", () => {
  it("indexa os templates existentes sem duplicar a árvore de blocos", () => {
    expect(STUDIO_TEMPLATE_CATALOG).toHaveLength(9);
    const legal = getStudioTemplate("template_legal_jus");
    expect(legal?.goal).toBe("lead_capture");
    expect(legal?.sourceTemplateId).toBe("template_legal_jus");
    expect(legal?.assetSlots).toContain("hero_portrait");
  });

  it("filtra o catálogo por objetivo e nicho", () => {
    const bookingTemplates = listStudioTemplates({ goal: "booking" });
    expect(bookingTemplates.length).toBeGreaterThanOrEqual(3);
    expect(bookingTemplates.every((template) => template.status === "ready")).toBe(true);
    const deliveryTemplates = listStudioTemplates({ niche: "gastronomy", tag: "delivery" });
    expect(deliveryTemplates.map((template) => template.id)).toEqual(
      expect.arrayContaining(["template_gastronomy", "template_dark_kitchen"]),
    );
  });

  it("materializa uma instância com origem e schema versionado", () => {
    const page = createEmptyOmniPage("studio-demo", "Studio Demo", "general");
    const hydrated = materializeStudioTemplate(page, "template_tourism");
    const parsed = OmniPageDocumentSchema.parse(hydrated);

    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.source_template_id).toBe("template_tourism");
    expect(parsed.source_template_version).toBe("1.0.0");
    expect(parsed.blocks.length).toBeGreaterThan(0);
    expect(hydrated.blocks).not.toBe(page.blocks);
  });

  it("não aceita asset externo sem provenance suficiente para publicação", () => {
    const draft = BuilderAssetRefSchema.parse({
      asset_id: "asset_draft",
      provider: "unsplash",
      source_url: "https://images.unsplash.com/photo-example",
      provenance_state: "provider-reported",
    });
    expect(isAssetPublicationReady(draft)).toBe(false);

    const ready = BuilderAssetRefSchema.parse({
      asset_id: "asset_ready",
      provider: "unsplash",
      source_url: "https://images.unsplash.com/photo-example",
      source_page_url: "https://unsplash.com/photos/example",
      creator: "Fotógrafo verificado",
      attribution_text: "Foto por Fotógrafo verificado no Unsplash",
      provenance_state: "provider-reported",
    });
    expect(isAssetPublicationReady(ready)).toBe(true);
  });

  it("mantém motion não essencial dentro de motion-safe", () => {
    const classes = resolveStudioMotionClasses({ trigger: "fade_up", hover: "lift" });
    expect(classes).toContain("motion-safe:animate-in");
    expect(classes).toContain("motion-safe:hover:-translate-y-1.5");
    expect(classes).not.toContain("animate-in fade-in");
    expect(resolveStudioMotionClasses({ trigger: "none" })).toBe("");
  });

  it("não resolve bloco desconhecido para o primeiro bloco do catálogo", () => {
    expect(getSiteBlockByIdStrict("bloco-que-nao-existe")).toBeUndefined();
  });
});
