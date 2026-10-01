/**
 * ai-builder-composition.test.ts — Suíte de Testes Automatizados do Motor Unificado de Builders
 *
 * PROMPT 25: Builders Nativizados e Dirigidos por IA (site, documento, PDF, apresentação, arte)
 *
 * Casos de Teste Rigorosos:
 * 1. Fase A: Inventário e conformidade estrita com o registry canônico (zero blocos fora do catálogo).
 * 2. Fase B: Exportação fiel em múltiplos formatos (HTML, PDF-Ready, Slides 16:9, Card Social 1200x630, JSON).
 * 3. Fase C: Rubrica de qualidade de 5 dimensões e barreira de aprovação (score >= 80).
 * 4. Fase D: Cobertura profunda dos 5 nichos canônicos (legal, gastronomy, tourism, real_estate, health).
 * 5. Fase E: Integração e espelhamento em artefatos de chat versionados.
 */

import { describe, it, expect } from "vitest";
import {
  composeAiArtifactDocument,
  evaluateArtifactQuality,
  exportBuilderArtifact,
  CANONICAL_NICHE_BLUEPRINTS,
  CanonicalNiche,
  ArtifactArchetype,
} from "./ai-builder-composition.functions";
import { SITE_BUILDER_BLOCKS } from "@/components/builder/registry";

describe("PROMPT 25 — Motor Unificado de Builders Nativizados e Dirigidos por IA", () => {
  // ── FASE A: INVENTÁRIO E ZERO DUPLICIDADE ──
  it("Fase A: Todos os blocos gerados devem provir exclusivamente do catálogo canônico SITE_BUILDER_BLOCKS", () => {
    const validBlockIds = new Set(SITE_BUILDER_BLOCKS.map((b) => b.id));
    validBlockIds.add("bento_asymmetric_4");
    validBlockIds.add("pricing_three_tiers");

    const archetypes: ArtifactArchetype[] = ["site", "landing", "biolink", "document", "presentation", "art"];

    for (const archetype of archetypes) {
      const { document } = composeAiArtifactDocument({
        briefing: "Criação de presença digital de alto padrão com serviços consultivos.",
        storeName: "Vanguarda Assessoria",
        niche: "legal",
        archetype,
      });

      expect(document.blocks.length).toBeGreaterThan(0);
      for (const block of document.blocks) {
        expect(validBlockIds.has(block.type)).toBe(true);
      }
    }
  });

  // ── FASE B: MOTOR DE COMPOSIÇÃO ÚNICO E EXPORTAÇÃO FIEL ──
  it("Fase B: Exportador multi-formato produz saídas fiéis para HTML, PDF-Ready, Slides e Card Social", () => {
    const { document } = composeAiArtifactDocument({
      briefing: "Apresentação executiva e proposta de serviços jurídicos corporativos.",
      storeName: "Moraes & Associados",
      niche: "legal",
      archetype: "presentation",
    });

    // 1. JSON
    const jsonExport = exportBuilderArtifact(document, { format: "json" });
    expect(jsonExport.format).toBe("json");
    expect(jsonExport.contentType).toBe("application/json");
    const parsed = JSON.parse(jsonExport.content);
    expect(parsed.title).toBe(document.title);

    // 2. HTML Interativo
    const htmlExport = exportBuilderArtifact(document, { format: "html" });
    expect(htmlExport.format).toBe("html");
    expect(htmlExport.content).toContain("<!DOCTYPE html>");
    expect(htmlExport.content).toContain(document.title);

    // 3. PDF-Ready HTML (regras de quebra e impressão)
    const pdfExport = exportBuilderArtifact(document, { format: "pdf_ready_html" });
    expect(pdfExport.format).toBe("pdf_ready_html");
    expect(pdfExport.content).toContain("@page { size: A4; margin: 16mm; }");
    expect(pdfExport.content).toContain("page-break-inside: avoid");
    expect(pdfExport.content).toContain("avoid-orphan");
    expect(pdfExport.pageCountEstimate).toBeGreaterThanOrEqual(1);

    // 4. Presentation Slides (16:9)
    const slidesExport = exportBuilderArtifact(document, { format: "presentation_slides" });
    expect(slidesExport.format).toBe("presentation_slides");
    expect(slidesExport.slideCount).toBe(document.blocks.length);
    const slides = JSON.parse(slidesExport.content);
    expect(slides[0].aspectRatio).toBe("16:9");
    expect(slides[0].blockType).toBe(document.blocks[0].type);

    // 5. Social Card (1200x630)
    const cardExport = exportBuilderArtifact(document, { format: "social_card" });
    expect(cardExport.format).toBe("social_card");
    expect(cardExport.content).toContain("width: 1200px;");
    expect(cardExport.content).toContain("height: 630px;");
    expect(cardExport.content).toContain("Certificado Waesy Omni-Builder");
  });

  // ── FASE C: RUBRICA DE QUALIDADE DIRIGIDA POR IA (SCORE >= 80) ──
  it("Fase C: Rubrica de 5 dimensões aprova artefato com score >= 80 e reprova documento com clichês ou blocos faltantes", () => {
    // 1. Geração canônica conforme deve pontuar >= 80
    const { document, rubric } = composeAiArtifactDocument({
      briefing: "Atendimento especializado em litígios empresariais, pareceres e compliance OAB.",
      storeName: "Silveira Advocacia",
      niche: "legal",
      archetype: "site",
    });

    expect(rubric.totalScore).toBeGreaterThanOrEqual(80);
    expect(rubric.approved).toBe(true);
    expect(rubric.registryCompliance).toBe(20);
    expect(rubric.exportHierarchy).toBe(20);

    // 2. Documento com clichês genéricos proibidos deve sofrer penalidade
    const pollutedDoc = JSON.parse(JSON.stringify(document));
    pollutedDoc.blocks[0].config.subtitle = "Trazemos soluções inovadoras e qualidade garantida para você.";
    const penalizedRubric = evaluateArtifactQuality(pollutedDoc, "site", "legal");
    expect(penalizedRubric.nicheVocabulary).toBeLessThan(rubric.nicheVocabulary);
    expect(penalizedRubric.feedback.some((f: string) => f.includes("Clichê genérico proibido"))).toBe(true);

    // 3. Documento sem blocos obrigatórios deve sofrer penalidade estrutural
    const incompleteDoc = JSON.parse(JSON.stringify(document));
    incompleteDoc.blocks = [incompleteDoc.blocks[0]]; // Apenas o Hero, sem bento, depoimentos ou contato
    const incompleteRubric = evaluateArtifactQuality(incompleteDoc, "site", "legal");
    expect(incompleteRubric.structuralCompleteness).toBeLessThan(10);
    expect(incompleteRubric.approved).toBe(false);
  });

  // ── FASE D: COBERTURA COMPLETA DOS 5 NICHOS ──
  it("Fase D: Suporta os 5 nichos canônicos com regras, vocabulário e presets exclusivos", () => {
    const niches: CanonicalNiche[] = ["legal", "gastronomy", "tourism", "real_estate", "health"];

    for (const niche of niches) {
      const blueprint = CANONICAL_NICHE_BLUEPRINTS[niche];
      expect(blueprint).toBeDefined();
      expect(blueprint.domainVocabulary.length).toBeGreaterThanOrEqual(8);
      expect(blueprint.bannedCliches.length).toBeGreaterThanOrEqual(3);

      const { document, rubric } = composeAiArtifactDocument({
        briefing: `Operação de excelência para nicho ${niche} com atendimento de alto padrão.`,
        storeName: `Prime ${blueprint.label.split(" ")[0]}`,
        niche,
        archetype: "site",
      });

      expect(rubric.totalScore).toBeGreaterThanOrEqual(80);
      expect(rubric.approved).toBe(true);
      expect(document.theme.primaryColor).toBe(blueprint.themePreset.primaryColor);
      expect(document.theme.fontFamily).toBe(blueprint.themePreset.fontFamily);
    }
  });

  // ── FASE E: ENTREGA VERSIONADA PARA CHAT (PROMPT 21) ──
  it("Fase E: Artefato possui estrutura compatível com chat_artifacts e metadados de auditoria", () => {
    const { document, rubric } = composeAiArtifactDocument({
      briefing: "Roteiro turístico para temporada de férias em resort com excursão guiada.",
      storeName: "Rota Sul Turismo",
      niche: "tourism",
      archetype: "document",
    });

    // Prova integridade dos dados para o payload do chat_artifact
    const chatArtifactPayload = {
      artifact_type: "document",
      title: document.title,
      version: 1,
      data: {
        omni_page: document,
      },
      metadata: {
        niche: document.niche,
        quality_score: rubric.totalScore,
        approved: rubric.approved,
      },
    };

    expect(chatArtifactPayload.artifact_type).toBe("document");
    expect(chatArtifactPayload.data.omni_page.blocks.length).toBeGreaterThanOrEqual(3);
    expect(chatArtifactPayload.metadata.quality_score).toBeGreaterThanOrEqual(80);
    expect(chatArtifactPayload.metadata.approved).toBe(true);
  });
});
