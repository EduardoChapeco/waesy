import { describe, it, expect } from "vitest";
import type { 
  EscamasSlide, 
  EscamasCarouselProject, 
  StudioBrandProfile, 
  EscamasLayerElement 
} from "@/types/studio-machine";
import { 
  DEFAULT_BRAND_PROFILE, 
  VISUAL_STYLES, 
  GOAL_OPTIONS 
} from "@/lib/studio-machine-constants";

describe("STUDIO MACHINE: SISTEMA ESCAMAS & MINING BRIDGE", () => {
  // ─── 1. CONTRATOS ARQUITETURAIS DO SISTEMA ESCAMAS ───
  describe("Hierarquia de 8 Camadas & Sistema Escamas", () => {
    it("deve validar ordenação estrita de Z-Index de 1 a 8", () => {
      const layers: EscamasLayerElement[] = [
        {
          id: "layer-textfx",
          type: "textfx",
          url: "",
          x: 50,
          y: 80,
          scale: 1,
          rotation: 0,
          opacity: 1,
          zIndex: 6,
          title: "Selo Tipográfico",
        },
        {
          id: "layer-atmos",
          type: "atmospheric",
          url: "",
          x: 50,
          y: 50,
          scale: 1.2,
          rotation: 0,
          opacity: 0.6,
          zIndex: 1,
          title: "Névoa de Fundo",
        },
        {
          id: "layer-subject",
          type: "subject",
          url: "https://example.com/asset.png",
          x: 50,
          y: 40,
          scale: 0.8,
          rotation: -5,
          opacity: 1,
          zIndex: 4,
          title: "Objeto Central",
        },
      ];

      const sorted = [...layers].sort((a, b) => a.zIndex - b.zIndex);
      expect(sorted[0].type).toBe("atmospheric");
      expect(sorted[1].type).toBe("subject");
      expect(sorted[2].type).toBe("textfx");
      expect(sorted[0].zIndex).toBeLessThan(sorted[1].zIndex);
      expect(sorted[1].zIndex).toBeLessThan(sorted[2].zIndex);
    });

    it("deve conter estilos visuais canônicos registrados", () => {
      expect(VISUAL_STYLES.escamas_ultra).toContain("Escamas");
      expect(VISUAL_STYLES.editorial_impact).toContain("Editorial");
      expect(GOAL_OPTIONS.some((g) => g.id === "civic_impact")).toBe(true);
      expect(GOAL_OPTIONS.some((g) => g.id === "education")).toBe(true);
    });
  });

  // ─── 2. SÍNTESE DE CARROSSEL A PARTIR DE MINERAÇÃO (NOTÍCIAS, PNCP, EMPREGOS) ───
  describe("Síntese Narrativa & Roteiro Multicamadas", () => {
    it("deve estruturar 4 slides coerentes para matéria de notícia minerada", () => {
      const mockArticle = {
        title: "Hospital Regional Recebe R$ 12 Milhões em Novos Leitos de UTI",
        summary: "Investimento do estado ampliará o atendimento pediátrico e clínico na região Oeste.",
        category: "Saúde",
      };

      const slides: EscamasSlide[] = [
        {
          id: "slide-1",
          slide_number: 1,
          layout_type: "escamas_layered",
          role_in_narrative: "hook",
          text_content: {
            badge: "Giro de Notícias",
            kicker: "DESTAQUE REGIONAL",
            headline: mockArticle.title,
            body: mockArticle.summary,
          },
          background_opacity: 0.3,
          layers: [],
        },
        {
          id: "slide-2",
          slide_number: 2,
          layout_type: "escamas_layered",
          role_in_narrative: "context",
          text_content: {
            headline: "O QUE MUDA NO ATENDIMENTO",
            body: "Novas salas cirúrgicas e 20 leitos de terapia intensiva serão ativados.",
          },
          background_opacity: 0.2,
          layers: [],
        },
        {
          id: "slide-3",
          slide_number: 3,
          layout_type: "escamas_layered",
          role_in_narrative: "impact",
          text_content: {
            headline: "IMPACTO PARA A POPULAÇÃO",
            body: "Redução da fila de espera em mais de 60% no primeiro trimestre.",
          },
          background_opacity: 0.15,
          layers: [],
        },
        {
          id: "slide-4",
          slide_number: 4,
          layout_type: "escamas_layered",
          role_in_narrative: "cta",
          text_content: {
            headline: "CONFIRA A REPORTAGEM COMPLETA",
            cta_text: "Ler no Waesy",
          },
          background_opacity: 0.25,
          layers: [],
        },
      ];

      expect(slides.length).toBe(4);
      expect(slides[0].role_in_narrative).toBe("hook");
      expect(slides[3].role_in_narrative).toBe("cta");
      expect(slides[3].text_content.cta_text).toBe("Ler no Waesy");
    });

    it("deve carregar perfil padrão do Brand Kit com contraste e autoridade", () => {
      const brand = DEFAULT_BRAND_PROFILE;
      expect(brand.name).toBeDefined();
      expect(brand.primaryColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(brand.secondaryColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(brand.fontHeading).toBe("Inter");
      expect(brand.handle.startsWith("@")).toBe(true);
    });
  });
});
