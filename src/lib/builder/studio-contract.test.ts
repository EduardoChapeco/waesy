import { describe, expect, it } from "vitest";
import { createEmptyOmniPage, OmniPageDocumentSchema } from "@/types/omni-builder";
import { BuilderAssetRefSchema, isAssetPublicationReady } from "./asset-contract";
import {
  getStudioTemplate,
  listStudioTemplates,
  materializeStudioManifest,
  materializeStudioTemplate,
  STUDIO_TEMPLATE_CATALOG,
} from "./studio-catalog";
import { STUDIO_PILOT_TEMPLATES } from "./studio-pilot-templates";
import { StudioTemplateManifestSchema } from "./studio-manifest";
import { resolveStudioMotionClasses } from "./motion-runtime";
import { getSiteBlockByIdStrict } from "@/components/builder/registry";

describe("Waesy Studio canonical contracts", () => {
  it("indexa 9 templates legados e 3 pilotos como manifests versionados sem duplicar a árvore de blocos", () => {
    expect(STUDIO_TEMPLATE_CATALOG).toHaveLength(12);
    expect(STUDIO_TEMPLATE_CATALOG.filter((template) => template.isPilot)).toHaveLength(3);
    const legal = getStudioTemplate("template_legal_jus");
    expect(legal?.goal).toBe("lead_capture");
    expect(legal?.sourceTemplateId).toBe("template_legal_jus");
    expect(legal?.assetSlots.some((slot) => slot.id === "hero_portrait")).toBe(true);
    expect(legal?.status).toBe("review_required");
  });

  it("filtra o catálogo por objetivo e nicho sem declarar templates prontos sem revisão", () => {
    const bookingTemplates = listStudioTemplates({ goal: "booking" });
    expect(bookingTemplates.length).toBeGreaterThanOrEqual(3);
    expect(bookingTemplates.every((template) => template.status === "review_required")).toBe(true);
    const deliveryTemplates = listStudioTemplates({ niche: "gastronomy", tag: "delivery" });
    expect(deliveryTemplates.map((template) => template.id)).toEqual(
      expect.arrayContaining(["template_gastronomy", "template_dark_kitchen", "pilot_gastronomy_orders"]),
    );
    expect(listStudioTemplates({ pilotsOnly: true })).toHaveLength(3);
  });

  it("materializa uma cópia com origem e versão do conteúdo preservadas", () => {
    const page = createEmptyOmniPage("studio-demo", "Studio Demo", "general");
    const hydrated = materializeStudioTemplate(page, "template_tourism");
    const parsed = OmniPageDocumentSchema.parse(hydrated);

    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.source_template_id).toBe("template_tourism");
    expect(parsed.source_template_version).toBe("1.0.0");
    expect(parsed.blocks.length).toBeGreaterThan(0);
    expect(hydrated.blocks).not.toBe(page.blocks);
    expect(hydrated.blocks[0].id).not.toBe(getStudioTemplate("template_tourism")?.blocks[0].sectionKey);
  });

  it("materializa os pilots sem mutar o manifesto fonte e preserva anchors e versão", () => {
    const page = createEmptyOmniPage("studio-pilot", "Página piloto", "general");
    const pilot = STUDIO_PILOT_TEMPLATES[0];
    const hydrated = materializeStudioManifest(page, pilot);
    const parsed = OmniPageDocumentSchema.parse(hydrated);
    expect(parsed.source_template_id).toBe(pilot.id);
    expect(parsed.source_template_version).toBe(pilot.version);
    expect(parsed.blocks[0].sectionAnchorId).toBe("topo");
    expect(pilot.blocks[0].config).toMatchObject({ imageUrl: "" });
  });

  it("recusa href executável e URL de imagem arbitrária em manifests", () => {
    const unsafe = structuredClone(STUDIO_PILOT_TEMPLATES[0]) as any;
    unsafe.blocks[0].config.primaryCta.href = "javascript:alert(1)";
    expect(() => StudioTemplateManifestSchema.parse(unsafe)).toThrow();
  });

  it("não aceita asset Unsplash sem origem, licença, autoria e evento de seleção", () => {
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
      source_asset_id: "photo-example",
      source_url: "https://images.unsplash.com/photo-example",
      source_page_url: "https://unsplash.com/photos/example?utm_source=waesy&utm_medium=referral",
      creator: "Fotógrafo verificado",
      creator_profile_url: "https://unsplash.com/@fotografo?utm_source=waesy&utm_medium=referral",
      attribution_text: "Foto por Fotógrafo verificado no Unsplash",
      license_id: "unsplash-license",
      license_url: "https://unsplash.com/license",
      usage_slot: "hero-ambience",
      download_event_status: "tracked",
      provenance_state: "provider-reported",
    });
    expect(isAssetPublicationReady(ready)).toBe(true);
  });

  it("mantém motion não essencial dentro de motion-safe", () => {
    const classes = resolveStudioMotionClasses({ trigger: "fade_up", hover: "lift" });
    expect(classes).toContain("motion-safe:animate-in");
    expect(classes).toContain("motion-safe:hover:-translate-y-1");
    expect(classes).toContain("motion-safe:hover:ring-2");
    expect(classes).not.toContain("animate-in fade-in");
    expect(resolveStudioMotionClasses({ trigger: "none" })).toBe("");
  });

  it("não resolve bloco desconhecido para o primeiro bloco do catálogo", () => {
    expect(getSiteBlockByIdStrict("bloco-que-nao-existe")).toBeUndefined();
  });
});
