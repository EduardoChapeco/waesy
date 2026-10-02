import { describe, it, expect } from "vitest";
import {
  OmniPageDocumentSchema,
  OmniBlockStylingSchema,
  createEmptyOmniPage,
  addBlockToPage,
  updateBlockInPage,
  removeBlockFromPage,
  moveBlockInPage,
  duplicateBlockInPage,
} from "./types";
import { SITE_BUILDER_BLOCKS, getSiteBlockById, getSiteBlocksByCategory } from "./registry";
import { NICHE_TEMPLATE_MATRIX, applyTemplateToPage, getTemplateByNiche } from "./templates";

describe("Omni-Block Engine & State Tree Audit (MASTER PROMPT V129)", () => {
  it("1. Deve validar documento de página estrito via Zod Schema", () => {
    const page = createEmptyOmniPage("minha-clinica", "Clínica Integrada", "services");

    const validated = OmniPageDocumentSchema.parse(page);
    expect(validated.slug).toBe("minha-clinica");
    expect(validated.title).toBe("Clínica Integrada");
    expect(validated.blocks).toEqual([]);
    expect(validated.theme.primaryColor).toBeDefined();
  });

  it("2. Deve adicionar blocos mantendo a imutabilidade do estado", () => {
    const page0 = createEmptyOmniPage("consultoria", "Consultoria VIP");
    const page1 = addBlockToPage(page0, "hero_minimal_split", {
      title: "Consultoria Financeira de Alto Impacto",
      subtitle: "Resultados comprovados para empresas em crescimento.",
      primaryCta: { label: "Contratar", href: "#" },
    });

    expect(page0.blocks.length).toBe(0); // Imutável
    expect(page1.blocks.length).toBe(1);
    expect(page1.blocks[0].type).toBe("hero_minimal_split");
    expect(page1.blocks[0].config.title).toBe("Consultoria Financeira de Alto Impacto");
  });

  it("3. Prova de Isolamento: atualizar o Bloco A não deve sofrer vazamento ou alterar o Bloco B", () => {
    let page = createEmptyOmniPage("loja-moda", "Vitrine de Moda");
    page = addBlockToPage(page, "hero_minimal_split", { title: "Coleção de Verão" });
    page = addBlockToPage(page, "pricing_three_tiers", { title: "Tabela de Preços Original" });

    const heroId = page.blocks[0].id;
    const pricingId = page.blocks[1].id;

    // Atualizar apenas o bloco de pricing
    const updatedPage = updateBlockInPage(
      page,
      pricingId,
      { title: "Planos Atualizados 2027" },
      { backgroundColor: "#f4f4f5", paddingY: "lg" }
    );

    // O Bloco Hero deve permanecer estritamente inalterado
    expect(updatedPage.blocks[0].id).toBe(heroId);
    expect(updatedPage.blocks[0].config.title).toBe("Coleção de Verão");
    expect(updatedPage.blocks[0].styling).toBeUndefined();

    // O Bloco Pricing deve refletir a nova configuração e personalização profunda
    expect(updatedPage.blocks[1].id).toBe(pricingId);
    expect(updatedPage.blocks[1].config.title).toBe("Planos Atualizados 2027");
    expect(updatedPage.blocks[1].styling?.backgroundColor).toBe("#f4f4f5");
    expect(updatedPage.blocks[1].styling?.paddingY).toBe("lg");
  });

  it("4. Deve mover blocos para cima e para baixo de forma atômica", () => {
    let page = createEmptyOmniPage("teste-move", "Teste Reordenação");
    page = addBlockToPage(page, "hero_minimal_split", { title: "Bloco 1" });
    page = addBlockToPage(page, "bento_asymmetric_4", { title: "Bloco 2" });
    page = addBlockToPage(page, "faq_clean_accordion", { title: "Bloco 3" });

    expect(page.blocks[0].config.title).toBe("Bloco 1");
    expect(page.blocks[1].config.title).toBe("Bloco 2");
    expect(page.blocks[2].config.title).toBe("Bloco 3");

    // Mover o bloco 2 para a primeira posição
    const moved = moveBlockInPage(page, 1, 0);
    expect(moved.blocks[0].config.title).toBe("Bloco 2");
    expect(moved.blocks[1].config.title).toBe("Bloco 1");
    expect(moved.blocks[2].config.title).toBe("Bloco 3");
  });

  it("5. Deve duplicar e remover blocos sem corromper a árvore de estado", () => {
    let page = createEmptyOmniPage("teste-duplica", "Teste Duplicação");
    page = addBlockToPage(page, "contact_form_direct", { title: "Fale Conosco" });
    const originalId = page.blocks[0].id;

    // Duplicar
    const duplicated = duplicateBlockInPage(page, originalId);
    expect(duplicated.blocks.length).toBe(2);
    expect(duplicated.blocks[1].id).not.toBe(originalId);
    expect(duplicated.blocks[1].config.title).toBe("Fale Conosco");

    // Remover original
    const removed = removeBlockFromPage(duplicated, originalId);
    expect(removed.blocks.length).toBe(1);
    expect(removed.blocks[0].id).toBe(duplicated.blocks[1].id);
  });

  it("6. Deve conter todos os 8 blocos canônicos da Omni-Block Library registrados", () => {
    expect(SITE_BUILDER_BLOCKS.length).toBe(8);

    const blockIds = SITE_BUILDER_BLOCKS.map((b) => b.id);
    expect(blockIds).toContain("hero_minimal_split");
    expect(blockIds).toContain("hero_interactive_carousel");
    expect(blockIds).toContain("bento_asymmetric_4");
    expect(blockIds).toContain("media_gallery_mosaic");
    expect(blockIds).toContain("pricing_three_tiers");
    expect(blockIds).toContain("testimonials_social_proof");
    expect(blockIds).toContain("contact_form_direct");
    expect(blockIds).toContain("faq_clean_accordion");

    const heroDef = getSiteBlockById("hero_minimal_split");
    expect(heroDef.name).toBe("Apresentação");
  });

  it("7. Deve aplicar templates da Niche Template Matrix injetando os blocos corretos", () => {
    expect(NICHE_TEMPLATE_MATRIX.length).toBeGreaterThanOrEqual(4);

    const basePage = createEmptyOmniPage("dr-silva", "Dr. Silva Advocacia", "legal");
    const hydratedPage = applyTemplateToPage(basePage, "template_legal_jus");

    expect(hydratedPage.blocks.length).toBe(5);
    expect(hydratedPage.blocks[0].type).toBe("hero_minimal_split");
    expect(hydratedPage.blocks[0].config.title).toContain("Defesa estratégica de direitos");
    expect(hydratedPage.blocks[1].type).toBe("bento_asymmetric_4");
    expect(hydratedPage.blocks[2].type).toBe("testimonials_social_proof");
    expect(hydratedPage.blocks[3].type).toBe("faq_clean_accordion");
    expect(hydratedPage.blocks[4].type).toBe("contact_form_direct");

    // Cada bloco no template deve ter ID único gerado
    const ids = hydratedPage.blocks.map((b) => b.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(5);
  });

  it("8. Deve isolar o estilo de bloco via getSectionStyle sem vazamento", async () => {
    const { getSectionStyle } = await import("./utils");

    // Estilo padrão (sem styling informado)
    const defaultStyle = getSectionStyle(undefined);
    expect(defaultStyle.className).toContain("py-20");
    expect(defaultStyle.style).toEqual({});

    // Estilo com padding customizado, borderRadius e cores
    const customStyle = getSectionStyle({
      paddingY: "xl",
      borderRadius: "2xl",
      backgroundColor: "#0f172a",
      textColor: "#f8fafc",
    });

    expect(customStyle.className).toContain("py-28");
    expect(customStyle.className).toContain("rounded-lg");
    expect(customStyle.style.backgroundColor).toBe("#0f172a");
    expect(customStyle.style.color).toBe("#f8fafc");
  });

  it("9. Deve conter a matriz canônica expandida com 9 templates de nicho (V137 Niche Matrix)", () => {
    expect(NICHE_TEMPLATE_MATRIX.length).toBe(9);

    const templateIds = NICHE_TEMPLATE_MATRIX.map((t) => t.id);
    expect(templateIds).toContain("template_legal_jus");
    expect(templateIds).toContain("template_gastronomy");
    expect(templateIds).toContain("template_tourism");
    expect(templateIds).toContain("template_creators");
    expect(templateIds).toContain("template_real_estate");
    expect(templateIds).toContain("template_services_wellness");
    // Novos templates V137
    expect(templateIds).toContain("template_creator_biolink");
    expect(templateIds).toContain("template_clinic_premium");
    expect(templateIds).toContain("template_dark_kitchen");
  });

  it("10. Deve garantir validação estrita via OmniPageDocumentSchema para páginas geradas por templates", () => {
    const realEstateBase = createEmptyOmniPage("cobertura-balneario", "Villa Prime", "real_estate");
    const realEstatePage = applyTemplateToPage(realEstateBase, "template_real_estate");

    const validated = OmniPageDocumentSchema.parse(realEstatePage);
    expect(validated.blocks.length).toBe(4);
    expect(validated.blocks[0].type).toBe("hero_minimal_split");
    expect(validated.blocks[1].type).toBe("media_gallery_mosaic");
    expect(validated.blocks[2].type).toBe("bento_asymmetric_4");
    expect(validated.blocks[3].type).toBe("contact_form_direct");
  });

  it("11. Deve validar o schema Zod e contrato estrito de HeroCarouselBlockData (V132 Omni-Block)", async () => {
    const { HeroCarouselBlockDataSchema } = await import("./types");

    const validCarouselData = {
      autoPlay: true,
      intervalSeconds: 6,
      slides: [
        {
          id: "slide-a",
          badgeText: "DESTAQUE 2027",
          title: "Coleção de Inverno",
          subtitle: "Peças exclusivas com frete expresso.",
          primaryCta: { label: "Comprar Agora", href: "#produtos" },
          highlightTag: "Lançamento",
          floatingStat: { label: "ESTOQUE", value: "Últimas 10 un", statusDot: true },
        },
      ],
    };

    const parsed = HeroCarouselBlockDataSchema.parse(validCarouselData);
    expect(parsed.slides.length).toBe(1);
    expect(parsed.autoPlay).toBe(true);
    expect(parsed.intervalSeconds).toBe(6);
    expect(parsed.slides[0].title).toBe("Coleção de Inverno");
  });

  it("12. Deve conter hero_interactive_carousel registrado no catálogo canônico do Builder", () => {
    const def = getSiteBlockById("hero_interactive_carousel");
    expect(def).toBeDefined();
    expect(def.name).toBe("Carrossel de Destaques");
    expect(def.category).toBe("hero");
    expect(def.defaultProps.slides.length).toBeGreaterThanOrEqual(1);

    // Integrar a uma página vazia e validar a serialização do schema da página
    let page = createEmptyOmniPage("loja-principal", "Loja Matriz");
    page = addBlockToPage(page, "hero_interactive_carousel", def.defaultProps);

    const validatedPage = OmniPageDocumentSchema.parse(page);
    expect(validatedPage.blocks.length).toBe(1);
    expect(validatedPage.blocks[0].type).toBe("hero_interactive_carousel");
    expect((validatedPage.blocks[0].config as any).slides.length).toBe(2);
  });

  it("13. Deve validar a taxonomia de categorias estilo Wix (V133 Benchmark)", async () => {
    const { BLOCK_TO_WIX_CATEGORY, WIX_CATEGORY_CONFIG } = await import("./registry");

    expect(WIX_CATEGORY_CONFIG.length).toBe(5);
    const categoryIds = WIX_CATEGORY_CONFIG.map((c) => c.id);
    expect(categoryIds).toEqual(["all", "basic", "layout", "sections", "interactive"]);

    // Todos os 8 blocos registrados devem ter categoria mapeada
    const registeredBlockIds = SITE_BUILDER_BLOCKS.map((b) => b.id);
    for (const blockId of registeredBlockIds) {
      const category = BLOCK_TO_WIX_CATEGORY[blockId];
      expect(category).toBeDefined();
      expect(["basic", "layout", "sections", "interactive"]).toContain(category);
    }
  });

  it("14. Deve validar integridade estrutural e tipagem de todos os templates de nicho (V133 Niche Matrix)", () => {
    const registeredBlockIds = new Set(SITE_BUILDER_BLOCKS.map((b) => b.id));

    for (const template of NICHE_TEMPLATE_MATRIX) {
      expect(template.id).toBeDefined();
      expect(template.name).toBeDefined();
      expect(template.niche).toBeDefined();
      expect(template.blocks.length).toBeGreaterThanOrEqual(3);

      for (const block of template.blocks) {
        // Todo bloco do template deve ser um bloco canônico existente
        expect(registeredBlockIds.has(block.type)).toBe(true);
        expect(block.config).toBeDefined();
      }
    }
  });

  it("15. Deve exportar o componente LiveTemplatePreviewModal e suportar montagem de visualização", async () => {
    const { LiveTemplatePreviewModal } = await import("./LiveTemplatePreviewModal");
    expect(LiveTemplatePreviewModal).toBeDefined();
    expect(typeof LiveTemplatePreviewModal).toBe("function");
  }, 20000);

  it("16. Deve validar a expansão revolucionária de templates por nicho V137 (Creator Pro, Clínica Premium, Dark Kitchen)", () => {
    // 1. Creator Pro
    const creatorBase = createEmptyOmniPage("creator-bio", "Lucas Silva", "creators");
    const creatorPage = applyTemplateToPage(creatorBase, "template_creator_biolink");
    expect(creatorPage.blocks.length).toBe(4);
    expect(creatorPage.blocks[0].type).toBe("hero_minimal_split");
    expect(creatorPage.blocks[0].styling?.borderRadius).toBe("full");
    expect(creatorPage.blocks[1].type).toBe("bento_asymmetric_4");
    expect(creatorPage.blocks[2].type).toBe("media_gallery_mosaic");
    expect(creatorPage.blocks[3].type).toBe("contact_form_direct");

    // 2. Clínica Premium
    const clinicBase = createEmptyOmniPage("clinica-vida", "Instituto Médico", "clinica");
    const clinicPage = applyTemplateToPage(clinicBase, "template_clinic_premium");
    expect(clinicPage.blocks.length).toBe(5);
    expect(clinicPage.blocks[0].type).toBe("hero_minimal_split");
    expect(clinicPage.blocks[1].type).toBe("testimonials_social_proof");
    expect(clinicPage.blocks[2].type).toBe("bento_asymmetric_4");
    expect(clinicPage.blocks[3].type).toBe("faq_clean_accordion");
    expect(clinicPage.blocks[4].type).toBe("contact_form_direct");

    // 3. Dark Kitchen Express
    const darkKitchenBase = createEmptyOmniPage("smash-co", "Smash Burger Co.", "gastronomy");
    const darkKitchenPage = applyTemplateToPage(darkKitchenBase, "template_dark_kitchen");
    expect(darkKitchenPage.blocks.length).toBe(4);
    expect(darkKitchenPage.blocks[0].type).toBe("hero_minimal_split");
    expect(darkKitchenPage.blocks[1].type).toBe("media_gallery_mosaic");
    expect(darkKitchenPage.blocks[2].type).toBe("pricing_three_tiers");
    expect(darkKitchenPage.blocks[3].type).toBe("contact_form_direct");

    // Validar integridade via Zod Schema em todas as 3 páginas
    expect(() => OmniPageDocumentSchema.parse(creatorPage)).not.toThrow();
    expect(() => OmniPageDocumentSchema.parse(clinicPage)).not.toThrow();
    expect(() => OmniPageDocumentSchema.parse(darkKitchenPage)).not.toThrow();
  });
});


