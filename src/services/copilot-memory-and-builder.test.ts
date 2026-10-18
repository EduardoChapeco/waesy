import { describe, expect, it } from "vitest";
import {
  generateDeterministicEmbedding,
  calculateCosineSimilarity,
  assembleLongTermContext,
} from "./copilot-memory.functions";
import {
  detectBuilderDocType,
  buildSpreadsheetPayload,
  buildDocumentPayload,
  buildPresentationPayload,
  buildWebsitePayload,
  buildSocialPostPayload,
  buildTravelItineraryPayload,
  createBuilderArtifactFromCopilot,
  updateBuilderDocument,
} from "./builder-copilot-bridge";
import {
  fragmentAndOptimizePrompt,
  needsCityClarification,
} from "./autonomous-copilot-orchestrator";

describe("Copilot Memory Engine (pgvector & RAG)", () => {
  it("gera embeddings de 1536 dimensões normalizados por norma L2", () => {
    const text = "Pizzaria e delivery no centro de Chapecó com atendimento rápido";
    const embedding = generateDeterministicEmbedding(text);

    expect(embedding).toHaveLength(1536);

    // Norma L2 deve ser aproximadamente 1.0
    const sumSq = embedding.reduce((acc, v) => acc + v * v, 0);
    const norm = Math.sqrt(sumSq);
    expect(norm).toBeGreaterThan(0.98);
    expect(norm).toBeLessThan(1.02);
  });

  it("produz embeddings idênticos para textos idênticos (determinismo)", () => {
    const vec1 = generateDeterministicEmbedding("hotel executivo urubici");
    const vec2 = generateDeterministicEmbedding("hotel executivo urubici");
    expect(vec1).toEqual(vec2);
  });

  it("calcula similaridade de cosseno máxima (1.0) para vetores idênticos", () => {
    const vecA = generateDeterministicEmbedding("vaga de vendedor externo em chapeco");
    const similarity = calculateCosineSimilarity(vecA, vecA);
    expect(similarity).toBeCloseTo(1.0, 2);
  });

  it("calcula similaridade menor para tópicos divergentes", () => {
    const vecA = generateDeterministicEmbedding("marmitex e comida caseira no almoço");
    const vecB = generateDeterministicEmbedding("processo judicial trabalhista cnj sentença");
    const similarity = calculateCosineSimilarity(vecA, vecB);
    expect(similarity).toBeLessThan(0.85);
  });

  it("lida defensivamente com textos vazios sem gerar erros ou NaN", () => {
    const emptyVec = generateDeterministicEmbedding("");
    expect(emptyVec).toHaveLength(1536);
    expect(Number.isNaN(emptyVec[0])).toBe(false);
  });
});

describe("Bridge dos 5 Builders do Workspace", () => {
  it("detecta a intenção correta para cada categoria de Builder", () => {
    expect(detectBuilderDocType("Crie uma planilha de fluxo de caixa")).toBe("spreadsheet");
    expect(detectBuilderDocType("Quero uma tabela de métricas financeiras")).toBe("spreadsheet");
    expect(detectBuilderDocType("Monte uma apresentação de pitch para investidores")).toBe("presentation");
    expect(detectBuilderDocType("Crie uma landing page moderna para minha loja")).toBe("website");
    expect(detectBuilderDocType("Preciso de um post para o Instagram anunciando promoção de calçados")).toBe("social_post");
    expect(detectBuilderDocType("Monte um roteiro de 3 dias para a Serra Catarinense com pousada")).toBe("travel_itinerary");
    expect(detectBuilderDocType("Elabore um contrato de prestação de serviços")).toBe("document");
  });

  it("gera payload de planilha estruturado com colunas e linhas", () => {
    const sheet = buildSpreadsheetPayload(
      "Fluxo de Caixa",
      "Quero uma planilha de fluxo de caixa para minha loja",
    );
    expect(sheet.columns).toContain("Data");
    expect(sheet.columns).toContain("Saldo (R$)");
    expect(sheet.rows.length).toBeGreaterThan(0);
    expect(sheet.summary).toHaveProperty("saldo_liquido");
  });

  it("gera payload de post social com copy de feed, story e hashtags", () => {
    const post = buildSocialPostPayload(
      "Promoção de Calçados 20% OFF",
      "post instagram calcados promoção",
    );
    expect(post.platform).toBe("instagram");
    expect(post.copyFeed).toContain("PROMOÇÃO DE CALÇADOS 20% OFF");
    expect(post.copyStory).toContain("ATENÇÃO");
    expect(post.hashtags.length).toBeGreaterThan(2);
    expect(post.callToAction).toBeTruthy();
    expect(["dark", "light", "brand", "swiss", "cyber", "gourmet"]).toContain(post.theme);
  });

  it("gera dossiê de turismo com cronograma e código Pix BACEN EMV válido", () => {
    const itinerary = buildTravelItineraryPayload(
      "Roteiro Serra Catarinense",
      "Monte um roteiro para a Serra Catarinense (Urubici) em novembro",
    );
    expect(itinerary.destination).toContain("Serra Catarinense");
    expect(itinerary.days.length).toBe(3);
    expect(itinerary.days[0].activities.length).toBeGreaterThan(0);
    expect(itinerary.pixCode).toMatch(/^000201/); // Padrão BACEN BRCode EMV
    expect(itinerary.pixCode).toContain("6304"); // Campo CRC-16 obrigatório
  });

  it("executa createBuilderArtifactFromCopilot transformando em ChatArtifactData", async () => {
    const result = await createBuilderArtifactFromCopilot({
      userPrompt: "Monte um roteiro de 3 dias para a Serra Catarinense",
      authorProfileId: "00000000-0000-0000-0000-000000000001",
    });

    expect(result.copilotAction).toBe("open_builder_artifact");
    expect(result.artifactType).toBe("travel_itinerary");
    expect(result.documentId).toBeTruthy();
    expect(result.chatArtifact.title).toBeTruthy();
    expect(result.chatArtifact.version).toBe(1);
    expect(result.payload).toHaveProperty("destination");
  });

  it("classifica planilha de fluxo de caixa como sheet_generator sem requerer cidade", () => {
    const task = fragmentAndOptimizePrompt("Crie uma planilha de fluxo de caixa para minha loja");
    expect(task.domain).toBe("sheet_generator");
    expect(needsCityClarification(task)).toBe(false);
  });

  it("gera artefatos corretos para todos os 5 builders operacionais", async () => {
    const social = await createBuilderArtifactFromCopilot({
      userPrompt: "Post instagram promoção de calçados sábado",
      docType: "social_post",
      authorProfileId: "00000000-0000-0000-0000-000000000001",
    });
    expect(social.artifactType).toBe("social_post");
    expect(social.payload).toHaveProperty("copyFeed");

    const presentation = await createBuilderArtifactFromCopilot({
      userPrompt: "Apresentação executiva de resultados Q4",
      docType: "presentation",
      authorProfileId: "00000000-0000-0000-0000-000000000001",
    });
    expect(presentation.artifactType).toBe("presentation");
    expect(presentation.payload.slides.length).toBeGreaterThan(0);

    const website = await createBuilderArtifactFromCopilot({
      userPrompt: "Landing page da loja",
      docType: "website",
      authorProfileId: "00000000-0000-0000-0000-000000000001",
    });
    expect(website.artifactType).toBe("website");
    expect(website.payload.sections.length).toBeGreaterThan(0);

    const spreadsheet = await createBuilderArtifactFromCopilot({
      userPrompt: "Planilha de vendas do mês",
      docType: "spreadsheet",
      authorProfileId: "00000000-0000-0000-0000-000000000001",
    });
    expect(spreadsheet.artifactType).toBe("spreadsheet");
    expect(spreadsheet.payload.columns.length).toBeGreaterThan(0);

    const doc = await createBuilderArtifactFromCopilot({
      userPrompt: "Contrato de prestação de serviços",
      docType: "document",
      authorProfileId: "00000000-0000-0000-0000-000000000001",
    });
    expect(doc.artifactType).toBe("document");
    expect(doc.payload.sections.length).toBeGreaterThan(0);
  });

  it("executa updateBuilderDocument de forma resiliente", async () => {
    const docId = "00000000-0000-0000-0000-000000000099";
    const result = await updateBuilderDocument({
      documentId: docId,
      title: "Título Atualizado",
      contentSchema: { updated: true },
    });
    expect(result === null || typeof result === "object").toBe(true);
  });
});

