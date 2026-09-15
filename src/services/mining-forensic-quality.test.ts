import { describe, it, expect } from "vitest";
import {
  validateMechanicalCompleteness,
  isHealthyImageUrl,
  getFallbackThematicImage,
  calculateTitleSimilarity,
} from "./mining/integrity-gate";
import {
  resolveImageUrl,
  sanitizeParagraphs,
} from "./mining/mechanical-extractor";

describe("Mining Pipeline — Forensic Integrity Gate & Sanitization", () => {
  describe("1. Image Health & Thematic Fallbacks", () => {
    it("recognizes healthy image URLs and rejects 1x1 tracking pixels and spacers", () => {
      expect(isHealthyImageUrl("https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200")).toBe(true);
      expect(isHealthyImageUrl("https://portal.com.br/wp-content/uploads/2026/09/foto.jpg")).toBe(true);
      
      // Broken / tracking / spacer patterns
      expect(isHealthyImageUrl("https://example.com/spacer.gif")).toBe(false);
      expect(isHealthyImageUrl("https://example.com/1x1.png")).toBe(false);
      expect(isHealthyImageUrl("https://analytics.portal.com/pixel.gif?id=99")).toBe(false);
      expect(isHealthyImageUrl("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7")).toBe(false);
      expect(isHealthyImageUrl("")).toBe(false);
      expect(isHealthyImageUrl(null)).toBe(false);
    });

    it("provides curated high-definition CDN fallback images by category", () => {
      const cityImage = getFallbackThematicImage("cidade");
      const sportsImage = getFallbackThematicImage("esportes");
      const cultureImage = getFallbackThematicImage("cultura");
      const economyImage = getFallbackThematicImage("economia");
      const nullFallback = getFallbackThematicImage(null);

      expect(cityImage).toContain("https://images.unsplash.com");
      expect(sportsImage).toContain("https://images.unsplash.com");
      expect(cultureImage).toContain("https://images.unsplash.com");
      expect(economyImage).toContain("https://images.unsplash.com");
      expect(nullFallback).toContain("https://images.unsplash.com");
    });
  });

  describe("2. URL Resolution & Paragraph Sanitization", () => {
    it("resolves relative image URLs against base domain", () => {
      const baseUrl = "https://g1.globo.com/sc/santa-catarina/noticia/2026/09/chapeco-obras.ghtml";
      expect(resolveImageUrl("/assets/capa.jpg", baseUrl)).toBe("https://g1.globo.com/assets/capa.jpg");
      expect(resolveImageUrl("https://cdn.globo.com/foto.jpg", baseUrl)).toBe("https://cdn.globo.com/foto.jpg");
      expect(resolveImageUrl("//static.globo.com/foto.png", baseUrl)).toBe("https://static.globo.com/foto.png");
    });

    it("sanitizes paragraphs purging tracking, Telegram/WhatsApp CTAs and cookie banners", () => {
      const raw = [
        "A Prefeitura de Chapecó iniciou nesta semana um novo programa de pavimentação asfáltica em quatro bairros.",
        "Clique aqui para entrar no nosso canal do Telegram e receber notícias diárias.",
        "Este site utiliza cookies para personalizar anúncios. Ao continuar navegando você concorda com nossos termos.",
        "O secretário de obras ressaltou que mais de 25 mil moradores serão beneficiados diretamente pela intervenção.",
        "Siga o portal no WhatsApp: https://chat.whatsapp.com/12345",
      ];

      const cleaned = sanitizeParagraphs(raw);
      expect(cleaned).toHaveLength(2);
      expect(cleaned[0]).toContain("pavimentação asfáltica");
      expect(cleaned[1]).toContain("secretário de obras");
    });
  });

  describe("3. Mechanical Completeness Validation (Anti-Shallow Gate)", () => {
    it("approves complete articles with rich content and rejects shallow stubs", () => {
      const completeArticle = {
        title: "Abertura de novas conexões aéreas fortalece turismo no Oeste Catarinense",
        lead: "Voos diretos conectam Chapecó a novos destinos com projeção de crescimento de 30% na malha.",
        bodyMarkdown: "O aeroporto regional de Chapecó anunciou a expansão das rotas comerciais regulares com conexões diretas para novos polos industriais e turísticos do Sul do país.\n\nA medida atende a uma demanda histórica de entidades empresariais e agências de viagens que articulavam a ampliação da capacidade de atendimento aos passageiros.\n\nSegundo dados da concessionária aeroportuária, a expectativa é atingir mais de 80 mil embarques e desembarques mensais durante a alta temporada.",
        wordCount: 88,
        paragraphCount: 3,
        coverImageUrl: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200",
        galleryImages: [],
        author: "Assessoria Regional",
        publishedAt: new Date().toISOString(),
        extractionMethod: "css_selector",
      };

      const validResult = validateMechanicalCompleteness(completeArticle as any);
      expect(validResult.isValid).toBe(true);
      expect(validResult.qualityScore).toBeGreaterThanOrEqual(70);

      // Shallow article (e.g. paywall stub or headline only)
      const shallowArticle = {
        title: "Notícia Rápida",
        lead: "",
        bodyMarkdown: "Texto curto de apenas dez palavras que não contém nada relevante.",
        wordCount: 11,
        paragraphCount: 1,
        coverImageUrl: null,
        galleryImages: [],
        author: null,
        publishedAt: null,
        extractionMethod: "readability",
      };

      const shallowResult = validateMechanicalCompleteness(shallowArticle as any);
      expect(shallowResult.isValid).toBe(false);
      expect(shallowResult.flags).toContain("EMPTY_BODY_DETECTED");
    });

    it("accurately computes title similarity to cluster related reports", () => {
      const t1 = "Prefeitura de Chapecó anuncia novo hospital na Grande Efapi";
      const t2 = "Prefeitura anuncia novo hospital regional na Efapi em Chapecó";
      const t3 = "Chuva forte causa alagamentos em Florianópolis";

      const simHigh = calculateTitleSimilarity(t1, t2);
      const simLow = calculateTitleSimilarity(t1, t3);

      expect(simHigh).toBeGreaterThan(0.5);
      expect(simLow).toBeLessThan(0.2);
    });
  });
});
