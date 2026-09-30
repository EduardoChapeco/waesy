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
  extractContentMechanically,
} from "./mining/mechanical-extractor";
import { cleanHtmlText } from "@/lib/mining/scraper-utils";
import { curateWithEditorialSquad } from "./mining/editorial-squad";

describe("V143 Mining Pipeline — Forensic Integrity Gate, Anti-Unsplash & Deep Curation", () => {
  describe("1. Image Health & Zero Unsplash Fallbacks", () => {
    it("recognizes authentic publisher image URLs and rejects Unsplash stock photos and 1x1 pixels", () => {
      expect(isHealthyImageUrl("https://s2-g1.glbimg.com/foto-real-chapeco.jpg")).toBe(true);
      expect(isHealthyImageUrl("https://static.ndmais.com.br/2026/09/weg-investimento.jpg")).toBe(true);

      // V143 Truth Engine: Unsplash stock photos and tracking pixels must be rejected
      expect(isHealthyImageUrl("https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200")).toBe(false);
      expect(isHealthyImageUrl("https://example.com/spacer.gif")).toBe(false);
      expect(isHealthyImageUrl("https://example.com/1x1.png")).toBe(false);
      expect(isHealthyImageUrl("https://analytics.portal.com/pixel.gif?id=99")).toBe(false);
      expect(isHealthyImageUrl("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7")).toBe(false);
      expect(isHealthyImageUrl("")).toBe(false);
      expect(isHealthyImageUrl(null)).toBe(false);
    });

    it("returns empty string from getFallbackThematicImage instead of synthetic Unsplash URLs", () => {
      expect(getFallbackThematicImage("cidade")).toBe("");
      expect(getFallbackThematicImage("economia")).toBe("");
      expect(getFallbackThematicImage(null)).toBe("");
    });
  });

  describe("2. HTML Entity Decoding & Paragraph Sanitization", () => {
    it("decodes numeric, hexadecimal and named HTML entities in titles and body text", () => {
      const rawTitle = "Policial homenageado morre aos 37 anos em SC: &#8216;Coração bondoso&#8217; &amp; exemplo";
      expect(cleanHtmlText(rawTitle)).toBe(
        "Policial homenageado morre aos 37 anos em SC: ‘Coração bondoso’ & exemplo"
      );
    });

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

  describe("3. Mechanical Completeness Validation (Anti-Shallow & Anti-Live-Stream Stub Gate)", () => {
    it("approves complete multi-paragraph articles with publisher image and rejects shallow or live-stream stubs", () => {
      const completeArticle = {
        title: "Abertura de novas conexões aéreas fortalece turismo no Oeste Catarinense",
        lead: "Voos diretos conectam Chapecó a novos destinos com projeção de crescimento de 30% na malha.",
        bodyMarkdown:
          "O aeroporto regional de Chapecó anunciou a expansão das rotas comerciais regulares com conexões diretas para novos polos industriais e turísticos do Sul do país, ampliando a oferta de assentos para empresários e viajantes.\n\nA medida atende a uma demanda histórica de entidades empresariais e agências de viagens que articulavam a ampliação da capacidade de atendimento aos passageiros durante todo o ano.\n\nSegundo dados da concessionária aeroportuária, a expectativa é atingir mais de 80 mil embarques e desembarques mensais durante a alta temporada, impulsionando a hotelaria e o setor de eventos.",
        bodyText:
          "O aeroporto regional de Chapecó anunciou a expansão das rotas comerciais regulares com conexões diretas para novos polos industriais e turísticos do Sul do país, ampliando a oferta de assentos para empresários e viajantes. A medida atende a uma demanda histórica de entidades empresariais e agências de viagens que articulavam a ampliação da capacidade de atendimento aos passageiros durante todo o ano. Segundo dados da concessionária aeroportuária, a expectativa é atingir mais de 80 mil embarques e desembarques mensais durante a alta temporada, impulsionando a hotelaria e o setor de eventos.",
        wordCount: 92,
        paragraphCount: 3,
        coverImageUrl: "https://s2-g1.glbimg.com/aeroporto-chapeco.jpg",
        galleryImages: [],
        author: "Redação Regional",
        publishedAt: new Date().toISOString(),
        method: "css_selector",
        contentType: "noticia",
      };

      const validResult = validateMechanicalCompleteness(completeArticle as any);
      expect(validResult.isValid).toBe(true);
      expect(validResult.hasCoverImage).toBe(true);
      expect(validResult.qualityScore).toBeGreaterThanOrEqual(75);

      // Live stream TV schedule stub must be blocked
      const liveStreamStub = {
        ...completeArticle,
        title: "AO VIVO: assista à programação da NSC TV",
      };
      const stubResult = validateMechanicalCompleteness(liveStreamStub as any);
      expect(stubResult.isValid).toBe(false);
      expect(stubResult.flags).toContain("LIVE_STREAM_OR_VIDEO_INDEX_STUB");

      // Single-paragraph article repeating the lead must be blocked
      const repeatingBodyArticle = {
        ...completeArticle,
        paragraphCount: 1,
        bodyText: completeArticle.lead,
      };
      const repeatingResult = validateMechanicalCompleteness(repeatingBodyArticle as any);
      expect(repeatingResult.isValid).toBe(false);
    });

    it("extracts all paragraphs from JSON-LD @graph and DOM without repeating subtitle in mobile_sections", async () => {
      const html = `
        <html>
          <head>
            <meta property="og:title" content="WEG anuncia investimento de R$ 840 milhões em geradores" />
            <meta property="og:description" content="Aporte milionário ampliará capacidade fabril para 50 unidades diárias." />
            <meta property="og:image" content="https://static.ndmais.com.br/weg-fabrica.jpg" />
          </head>
          <body>
            <article>
              <p>A multinacional catarinense WEG confirmou nesta semana um pacote de investimentos de R$ 840 milhões voltado à expansão da produção de geradores de grande porte.</p>
              <p>O plano estratégico contempla novas linhas automatizadas de montagem e testes, mirando atender à crescente demanda de data centers e infraestrutura energética.</p>
              <p>Com a ampliação, a capacidade instalada passará a entregar até 50 unidades por dia até o final do próximo ciclo operacional.</p>
            </article>
          </body>
        </html>
      `;

      const extracted = await extractContentMechanically("https://ndmais.com.br/economia/weg-investimento/", html);
      expect(extracted.paragraphCount).toBe(3);
      expect(extracted.coverImageUrl).toBe("https://static.ndmais.com.br/weg-fabrica.jpg");

      const curated = await curateWithEditorialSquad({
        rawTitle: extracted.title,
        rawText: extracted.bodyMarkdown,
        sourceName: "ND Mais",
        sourceUrl: "https://ndmais.com.br/economia/weg-investimento/",
      });

      expect(curated.mobile_sections.length).toBeGreaterThanOrEqual(2);
      // Subtitle must NOT be identical to mobile_sections[0].content
      expect(calculateTitleSimilarity(curated.subtitle, curated.mobile_sections[0].content)).toBeLessThan(0.65);
    });
  });
});
