import { describe, it, expect } from "vitest";
import { generateOmniPageSeo } from "./omni-page-seo";

describe("omni-page-seo generator", () => {
  it("deve retornar metadados padrão honestos quando o documento for nulo", () => {
    const seo = generateOmniPageSeo({
      document: null,
      slug: "inexistente",
    });

    expect(seo.title).toContain("Página não encontrada");
    expect(seo.links[0].rel).toBe("manifest");
  });

  it("deve gerar metadados de website, opengraph, twitter cards e webmcp endpoint", () => {
    const fakeDoc = {
      title: "Minha Barbearia Exclusiva",
      description: "Cortes modernos e barba tradicional.",
      store_id: "store_123",
      settings: {
        omni_page: {
          blocks: [
            {
              type: "hero_minimal_split",
              config: {
                title: "Estilo & Precisão",
                subtitle: "Atendimento premium com hora marcada.",
                imageUrl: "https://images.unsplash.com/photo-barber",
              },
            },
          ],
        },
      },
    };

    const storeData = {
      name: "Barbearia Imperial",
      city: "Chapecó",
      state: "SC",
      latitude: -27.1,
      longitude: -52.6,
    };

    const seo = generateOmniPageSeo({
      document: fakeDoc,
      storeData,
      slug: "barbearia-imperial",
    });

    expect(seo.title).toBe("Minha Barbearia Exclusiva • Barbearia Imperial");
    const metaMap = new Map(seo.meta.map((m) => [m.name || m.property, m.content]));

    expect(metaMap.get("description")).toBe("Cortes modernos e barba tradicional.");
    expect(metaMap.get("og:title")).toBe("Minha Barbearia Exclusiva • Barbearia Imperial");
    expect(metaMap.get("og:image")).toBe("https://images.unsplash.com/photo-barber");
    expect(metaMap.get("twitter:card")).toBe("summary_large_image");
    expect(metaMap.get("webmcp-endpoint")).toBe("/api/webmcp/pages/barbearia-imperial");
    expect(metaMap.get("geo.placename")).toBe("Chapecó, SC");
    expect(metaMap.get("geo.position")).toBe("-27.1;-52.6");
  });

  it("deve sintetizar Schema.org FAQPage quando houver blocos de FAQ na página", () => {
    const fakeDoc = {
      title: "FAQ Turismo & Pacotes",
      settings: {
        omni_page: {
          blocks: [
            {
              type: "faq_clean_accordion",
              config: {
                items: [
                  { question: "Qual a política de cancelamento?", answer: "Até 7 dias antes sem multas." },
                  { question: "Crianças pagam?", answer: "Crianças até 5 anos não pagam hospedagem." },
                ],
              },
            },
          ],
        },
      },
    };

    const seo = generateOmniPageSeo({
      document: fakeDoc,
      slug: "faq-turismo",
    });

    expect(seo.scripts.length).toBe(1);
    const schema = JSON.parse(seo.scripts[0].children);
    expect(schema["@context"]).toBe("https://schema.org");

    const faqSchema = schema["@graph"].find((node: any) => node["@type"] === "FAQPage");
    expect(faqSchema).toBeDefined();
    expect(faqSchema.mainEntity.length).toBe(2);
    expect(faqSchema.mainEntity[0].name).toBe("Qual a política de cancelamento?");
  });
});
