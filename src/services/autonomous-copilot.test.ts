import { describe, it, expect } from "vitest";
import { fragmentAndOptimizePrompt, hashQueryTask, needsCityClarification } from "./autonomous-copilot-orchestrator";
import { hashCanonicalUrl } from "./mining/automated-harvest";

describe("Autonomous Copilot & Mining Pipeline", () => {
  it("fragmenta prompt de leads e identifica intenção lead_mining", () => {
    const task = fragmentAndOptimizePrompt("Gere uma planilha com leads de restaurantes em Chapecó");
    expect(task.domain).toBe("lead_mining");
    expect(task.requestedFormat).toBe("spreadsheet");
    expect(task.city).toBe("Chapecó");
  });

  it("fragmenta prompt com CNPJ e identifica intenção cnpj_company", () => {
    const task = fragmentAndOptimizePrompt("Consulte a empresa do CNPJ 00.000.000/0001-91");
    expect(task.domain).toBe("cnpj_company");
    expect(task.cnpj).toBe("00000000000191");
    expect(task.requestedFormat).toBe("spreadsheet");
  });

  it("fragmenta prompt com processo judicial e identifica legal_research", () => {
    const task = fragmentAndOptimizePrompt("Qual o status do processo 5001234-56.2024.8.24.0018 no TJSC?");
    expect(task.domain).toBe("legal_research");
    expect(task.processNumber).toBe("5001234-56.2024.8.24.0018");
    expect(task.requestedFormat).toBe("document");
  });

  it("fragmenta prompt de builder/site e identifica builder_composition", () => {
    const task = fragmentAndOptimizePrompt("Crie uma landing page moderna para uma cafeteria");
    expect(task.domain).toBe("builder_composition");
    expect(task.archetype).toBe("landing");
    expect(task.requestedFormat).toBe("builder");
  });

  it("fragmenta prompt de hotéis e identifica lodging_tourism", () => {
    const task = fragmentAndOptimizePrompt("Quero uma lista de hotéis e resorts em Florianópolis");
    expect(task.domain).toBe("lodging_tourism");
    expect(task.requestedFormat).toBe("spreadsheet");
    expect(task.city).toBe("Florianópolis");
  });

  it("fragmenta prompt de empregos e identifica job_opportunities", () => {
    const task = fragmentAndOptimizePrompt("Quero ver vagas de emprego em Chapecó");
    expect(task.domain).toBe("job_opportunities");
    expect(task.requestedFormat).toBe("spreadsheet");
    expect(task.city).toBe("Chapecó");
  });

  it("fragmenta prompt de eventos culturais e identifica events_harvest", () => {
    const task = fragmentAndOptimizePrompt("Quais são os shows e eventos em Chapecó no próximo fim de semana?");
    expect(task.domain).toBe("events_harvest");
    expect(task.requestedFormat).toBe("document");
    expect(task.city).toBe("Chapecó");
  });

  it("não fabrica cidade quando prompt e contexto não informam", () => {
    const task = fragmentAndOptimizePrompt("Gere uma planilha com leads de padarias");
    expect(task.city).toBeUndefined();
    expect(needsCityClarification(task)).toBe(true);
  });

  it("usa cidade ativa do contexto quando o prompt não informa", () => {
    const task = fragmentAndOptimizePrompt("Gere uma planilha com leads de padarias", { city: "Xanxerê" });
    expect(task.city).toBe("Xanxerê");
    expect(needsCityClarification(task)).toBe(false);
  });

  it("cidade explícita no prompt prevalece sobre a cidade ativa", () => {
    const task = fragmentAndOptimizePrompt("Quero hotéis em Florianópolis", { city: "Chapecó" });
    expect(task.city).toBe("Florianópolis");
  });

  it("domínios não geográficos não exigem cidade", () => {
    const task = fragmentAndOptimizePrompt("Consulte a empresa do CNPJ 00.000.000/0001-91");
    expect(needsCityClarification(task)).toBe(false);
  });

  it("gera hashes determinísticos para deduplicação e token cache", () => {
    const task1 = fragmentAndOptimizePrompt("Gere uma planilha com leads de restaurantes em Chapecó");
    const task2 = fragmentAndOptimizePrompt("Gere uma planilha com leads de restaurantes em Chapecó");
    expect(hashQueryTask(task1)).toBe(hashQueryTask(task2));

    const url1 = "https://g1.globo.com/sc/santa-catarina/noticia/2026/09/chapeco.ghtml?utm_source=twitter&ref=share";
    const url2 = "https://g1.globo.com/sc/santa-catarina/noticia/2026/09/chapeco.ghtml?utm_medium=cpc";
    expect(hashCanonicalUrl(url1)).toBe(hashCanonicalUrl(url2));
  });

  it("vincula deterministicamente ingredientes de receita com produtos do catálogo (BOM)", async () => {
    const { linkRecipeIngredientsToInventory } = await import("./mining/specialized-extractors");
    const ingredients = [
      "500g de farinha de trigo especial",
      "200g manteiga sem sal gelada",
      "3 ovos caipiras",
    ];
    const catalog = [
      { id: "prod-1", name: "Farinha de Trigo Premium 1kg" },
      { id: "prod-2", name: "Manteiga Extra com Sal 200g" },
      { id: "prod-3", name: "Ovos Caipiras Orgânicos Dúzia" },
      { id: "prod-4", name: "Açúcar Refinado 1kg" },
    ];

    const matches = linkRecipeIngredientsToInventory(ingredients, catalog);
    expect(matches).toHaveLength(3);
    expect(matches[0].matchedProductId).toBe("prod-1");
    expect(matches[0].suggestedQty).toBe(500);
    expect(matches[0].suggestedUnit).toBe("g");
    expect(matches[2].matchedProductId).toBe("prod-3");
  });

  it("extrai vaga de emprego a partir de Schema.org JobPosting em JSON-LD", async () => {
    const { extractJobFromJsonLd } = await import("./mining/specialized-extractors");
    const sampleHtml = `
      <html>
        <head>
          <script type="application/ld+json">
          {
            "@context": "https://schema.org/",
            "@type": "JobPosting",
            "title": "Desenvolvedor Full Stack Senior",
            "description": "Desenvolvimento de aplicações web em React e Node.js.",
            "hiringOrganization": { "@type": "Organization", "name": "Waesy Tech" },
            "employmentType": "FULL_TIME",
            "jobLocation": {
              "@type": "Place",
              "address": {
                "@type": "PostalAddress",
                "addressLocality": "Chapecó",
                "addressRegion": "SC"
              }
            },
            "baseSalary": {
              "@type": "MonetaryAmount",
              "currency": "BRL",
              "value": { "@type": "QuantitativeValue", "value": 8500, "unitText": "MONTH" }
            }
          }
          </script>
        </head>
      </html>
    `;

    const job = extractJobFromJsonLd(sampleHtml, "https://vagas.example.com/vaga-123");
    expect(job).not.toBeNull();
    expect(job?.title).toBe("Desenvolvedor Full Stack Senior");
    expect(job?.companyName).toBe("Waesy Tech");
    expect(job?.city).toBe("Chapecó");
    expect(job?.state).toBe("SC");
    expect(job?.salaryMinCents).toBe(850000);
  });

  it("extrai dados de hotel e hospedagem a partir de Schema.org LodgingBusiness", async () => {
    const { extractLodgingFromJsonLd } = await import("./mining/specialized-extractors");
    const sampleHtml = `
      <html>
        <head>
          <script type="application/ld+json">
          {
            "@context": "https://schema.org/",
            "@type": "Resort",
            "name": "Pratas Thermas Resort",
            "description": "Resort de águas termais com spa, piscinas aquecidas e restaurante internacional.",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "Rua das Termas, 100",
              "addressLocality": "São Carlos",
              "addressRegion": "SC"
            },
            "starRating": { "@type": "Rating", "ratingValue": 4 },
            "amenityFeature": ["Piscina Aquecida", "Wi-Fi Grátis", "Café da Manhã Incluso"],
            "telephone": "(49) 3325-0000"
          }
          </script>
        </head>
      </html>
    `;

    const lodging = extractLodgingFromJsonLd(sampleHtml, "https://resort.example.com");
    expect(lodging).not.toBeNull();
    expect(lodging?.name).toBe("Pratas Thermas Resort");
    expect(lodging?.lodgingType).toBe("resort");
    expect(lodging?.city).toBe("São Carlos");
    expect(lodging?.starRating).toBe(4);
    expect(lodging?.amenities).toContain("Piscina Aquecida");
  });
});
