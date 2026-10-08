import { describe, expect, it } from "vitest";
import { createEmptyOmniPage, type OmniPageDocument } from "@/types/omni-builder";
import { auditAllStudioTemplates, auditOmniDocument, auditStudioTemplate, getPublicationBlockingFindings } from "./studio-template-audit";
import { omniPageToExperienceNodes, OMNI_EXPERIENCE_NODE_PREFIX } from "./omni-experience-adapter";

function fixture(blocks: any[]) {
  return { id: "audit-fixture", name: "Fixture", blocks };
}

describe("Omni AST → ExperienceNode adapter", () => {
  it("preserva identidade, ordem, configuração, estilo, visibilidade e assets", () => {
    const page: OmniPageDocument = {
      ...createEmptyOmniPage("adapter-test", "Teste"),
      blocks: [
        {
          id: "hero-1",
          type: "hero_minimal_split",
          config: { title: "Título", imageUrl: "https://cdn.example.test/hero.webp", imageAlt: "Montanha ao amanhecer" },
          styling: { backgroundColor: "var(--background)", textColor: "var(--foreground)", scrollAnimation: "fade", animationDelayMs: 300 },
          assetRefs: [{ asset_id: "asset-1", provider: "upload", provenance_state: "user-provided" }],
          isHidden: false,
        },
        { id: "faq-1", type: "faq_clean_accordion", config: { items: [] }, isHidden: true },
      ],
    };

    const nodes = omniPageToExperienceNodes(page);
    expect(nodes.map((node) => node.id)).toEqual(["hero-1", "faq-1"]);
    expect(nodes[0].block_type).toBe(`${OMNI_EXPERIENCE_NODE_PREFIX}hero_minimal_split`);
    expect(nodes[0].sort_order).toBe(0);
    expect(nodes[0].content.title).toBe("Título");
    expect(nodes[0].design_tokens.omniStyling.backgroundColor).toBe("var(--background)");
    expect(nodes[0].design_tokens.animation.trigger).toBe("fade_up");
    expect((nodes[0] as any).asset_refs[0].asset_id).toBe("asset-1");
    expect(nodes[1].is_hidden).toBe(true);
  });

  it("não muta o documento fonte e suporta documento sem blocos", () => {
    const page = createEmptyOmniPage("empty", "Vazio");
    expect(omniPageToExperienceNodes(page)).toEqual([]);
    expect(page.blocks).toEqual([]);
  });
});

describe("Studio template automated quality pipeline", () => {
  it("bloqueia imagem remota sem provenance/licença e imagem sem alt", () => {
    const result = auditStudioTemplate(fixture([
      {
        id: "hero",
        type: "hero_minimal_split",
        config: { title: "Olá", imageUrl: "https://cdn.example.test/hero.webp", primaryCta: { href: "/contato", label: "" } },
      },
    ]));
    expect(result.status).toBe("fail");
    expect(result.findings.map((finding) => finding.ruleId)).toEqual(expect.arrayContaining([
      "LICENSE_PROVENANCE_MISSING",
      "A11Y_IMAGE_ALT",
      "A11Y_ACTION_NAME",
    ]));
  });

  it.each(["javascript:alert(1)", "data:text/html,<svg/onload=alert(1)>", "blob:https://example.test/id", "//evil.example/path"])("bloqueia publicação com href inseguro: %s", (href) => {
    const result = auditStudioTemplate(fixture([{
      id: "hero",
      type: "hero_minimal_split",
      config: { title: "Abrir", primaryCta: { label: "Ação", href } },
    }]));
    expect(result.findings.map((finding) => finding.ruleId)).toContain("SECURITY_UNSAFE_HREF");
    expect(getPublicationBlockingFindings(result).map((finding) => finding.ruleId)).toContain("SECURITY_UNSAFE_HREF");
  });

  it("bloqueia imagem data/blob em vez de omiti-la da auditoria", () => {
    const result = auditStudioTemplate(fixture([{
      id: "hero",
      type: "hero_minimal_split",
      config: { title: "Imagem inline", imageUrl: "data:image/png;base64,AAAA", imageAlt: "Imagem de teste" },
    }]));
    expect(result.findings.map((finding) => finding.ruleId)).toContain("LICENSE_EPHEMERAL_IMAGE");
    expect(getPublicationBlockingFindings(result).map((finding) => finding.ruleId)).toContain("LICENSE_EPHEMERAL_IMAGE");
  });

  it("não permite disfarçar images.unsplash.com como asset de upload do usuário", () => {
    const imageUrl = "https://images.unsplash.com/photo-example";
    const result = auditStudioTemplate(fixture([{
      id: "hero",
      type: "hero_minimal_split",
      config: { title: "Ambiente", imageUrl, imageAlt: "Espaço com luz natural" },
      assetRefs: [{ asset_id: "falsely-uploaded", provider: "upload", source_url: imageUrl, provenance_state: "user-provided" }],
    }]));
    expect(result.findings.map((finding) => finding.ruleId)).toContain("LICENSE_PROVIDER_MISMATCH");
  });

  it("aprova imagem Unsplash com atribuição verificável e alt, se dentro do orçamento", () => {
    const imageUrl = "https://images.unsplash.com/photo-example";
    const result = auditStudioTemplate(fixture([
      {
        id: "hero",
        type: "hero_minimal_split",
        config: { title: "Um lugar melhor", imageUrl, imageAlt: "Fachada iluminada ao entardecer" },
        assetRefs: [{
          asset_id: "photo-1",
          provider: "unsplash",
          source_asset_id: "photo-example",
          source_url: imageUrl,
          source_page_url: "https://unsplash.com/photos/example",
          creator: "Autoria confirmada",
          creator_profile_url: "https://unsplash.com/@autoria",
          attribution_text: "Foto por Autoria confirmada no Unsplash",
          license_id: "unsplash-license",
          license_url: "https://unsplash.com/license",
          usage_slot: "hero-ambience",
          download_event_status: "tracked",
          provenance_state: "provider-reported",
          byte_size: 300_000,
        }],
      },
    ]));
    expect(result.status).toBe("pass");
    expect(result.findings.some((finding) => finding.category === "license" && finding.severity === "error")).toBe(false);
    expect(result.findings.some((finding) => finding.ruleId === "PERF_ASSET_SIZE_UNKNOWN")).toBe(false);
  });

  it("bloqueia documento acima do limite estrutural e não alega medição de Core Web Vitals", () => {
    const blocks = Array.from({ length: 3 }, (_, index) => ({
      id: `block-${index}`,
      type: "faq_clean_accordion",
      config: { title: "FAQ", items: Array.from({ length: 10 }, (__, item) => ({ id: `q-${item}`, question: "P".repeat(100), answer: "R".repeat(100) })) },
    }));
    const result = auditStudioTemplate(fixture(blocks), { thresholds: { maxBlocks: 2, maxSerializedBytes: 1000 } });
    expect(result.status).toBe("fail");
    expect(result.findings.map((finding) => finding.ruleId)).toEqual(expect.arrayContaining(["PERF_BLOCK_BUDGET", "PERF_DOCUMENT_BYTES"]));
    expect(result.limitations[0]).toContain("não executa navegador");
  });

  it("gera relatório determinístico por catálogo com resultado de cada template", () => {
    const report = auditAllStudioTemplates();
    expect(report.summary.total).toBe(12);
    expect(report.templates).toHaveLength(12);
    expect(report.templates.every((template) => template.findings && template.metrics)).toBe(true);
    expect(report.summary.failed + report.summary.warnings + report.summary.passed).toBe(report.summary.total);
    expect(report.summary.reviewRequired).toBe(12);
    expect(report.summary.publishableFailed).toBe(0);
    expect(report.templates.filter((template) => template.templateId.startsWith("pilot_")).every((template) => template.findings.some((finding) => finding.ruleId === "CONTENT_PLACEHOLDER_UNRESOLVED"))).toBe(true);
  });

  it("bloqueia FAQ/depoimentos vazios e formulário sem destino de lead", () => {
    const result = auditStudioTemplate(fixture([
      { id: "faq", type: "faq_clean_accordion", config: { items: [] } },
      { id: "proof", type: "testimonials_social_proof", config: { testimonials: [] } },
      { id: "contact", type: "contact_form_direct", config: { whatsappNumber: "" } },
    ]));
    expect(result.findings.map((finding) => finding.ruleId)).toEqual(expect.arrayContaining([
      "CONTENT_FAQ_EMPTY",
      "CONTENT_SOCIAL_PROOF_EMPTY",
      "CONTENT_FORM_DESTINATION_MISSING",
    ]));
  });

  it("bloqueia planos de pricing sem destino CTA e não usa rota interna genérica", () => {
    const result = auditStudioTemplate(fixture([{
      id: "pricing",
      type: "pricing_three_tiers",
      config: { tiers: [{ id: "starter", name: "Inicial", ctaLabel: "Contratar" }] },
    }]));
    expect(result.findings.map((finding) => finding.ruleId)).toContain("CONTENT_PRICING_CTA_MISSING");
    expect(getPublicationBlockingFindings(result).map((finding) => finding.ruleId)).toContain("CONTENT_PRICING_CTA_MISSING");
  });

  it("bloqueia placeholders não resolvidos e âncoras duplicadas ou inválidas", () => {
    const result = auditStudioTemplate(fixture([
      { id: "hero", type: "hero_minimal_split", sectionAnchorId: "hero", config: { title: "[[NOME_REAL]]", primaryCta: { label: "Saiba mais", href: "#ausente" } } },
      { id: "faq", type: "faq_clean_accordion", sectionAnchorId: "hero", config: { title: "Dúvidas", items: [] } },
    ]));
    const ruleIds = result.findings.map((finding) => finding.ruleId);
    expect(ruleIds).toEqual(expect.arrayContaining([
      "CONTENT_PLACEHOLDER_UNRESOLVED",
      "LINK_DUPLICATE_SECTION_ANCHOR",
      "LINK_BROKEN_SECTION_ANCHOR",
    ]));
    expect(getPublicationBlockingFindings(result).length).toBeGreaterThanOrEqual(3);
  });

  it("expõe findings bloqueantes ao serviço de publicação para um documento Omni", () => {
    const page = {
      ...createEmptyOmniPage("publish-gate", "Página de publicação"),
      blocks: [{
        id: "hero",
        type: "hero_minimal_split",
        config: { title: "Página", imageUrl: "https://cdn.example.test/hero.webp" },
      }],
    };
    const result = auditOmniDocument(page);
    expect(getPublicationBlockingFindings(result).map((finding) => finding.ruleId)).toContain("LICENSE_PROVENANCE_MISSING");
  });
});
