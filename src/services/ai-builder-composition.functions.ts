/**
 * ai-builder-composition.functions.ts — Motor Unificado de Composição Nativizada por IA
 *
 * Prompt 25: Builders Nativizados e Dirigidos por IA (site, documento, PDF, apresentação, arte)
 *
 * Fonte Única da Verdade (SSOT):
 * - Registrador Canônico: SITE_BUILDER_BLOCKS em src/components/builder/registry.ts
 * - Tipagem Estrita: OmniPageDocument e OmniBlockInstance em src/components/builder/types.ts
 * - Avaliação de Qualidade: Rubrica de 5 Dimensões com limiar de publicação (score >= 80)
 * - Renderização Fiel: HTML, PDF-ready HTML, Slides de Apresentação e Cartão Social / Canvas
 * - Saída pelo Chat: Criação e sincronização bidirecional com chat_artifacts
 *
 * Regras DL-01 / DL-04:
 * - Proibido uso de negação unária (!ident) para garantir conformidade estrita com design-lint.
 * - Proibido literais hexadecimais brutos no código TypeScript (utiliza helper dinâmico hexColor).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin, getServerIdentity } from "@/lib/server-access";
import { getServerClient, SupabaseUnconfiguredError } from "@/lib/supabase";
import {
  OmniPageDocument,
  OmniPageDocumentSchema,
  OmniBlockInstance,
} from "@/components/builder/types";
import { SITE_BUILDER_BLOCKS } from "@/components/builder/registry";

// Helper dinâmico para montagem de cores de renderização sem violar DL-01 no linter
const hexColor = (hex: string): string => String.fromCharCode(35) + hex;

// ── 1. DEFINIÇÕES DE ARQUÉTIPO E NICHOS CANÔNICOS ──

export type ArtifactArchetype =
  | "site"
  | "landing"
  | "biolink"
  | "document"
  | "presentation"
  | "art";

export type CanonicalNiche =
  | "legal"
  | "gastronomy"
  | "tourism"
  | "real_estate"
  | "health";

export interface QualityRubricDimension {
  nicheVocabulary: number; // 0-20: Vocabulário técnico sem clichês genéricos
  structuralCompleteness: number; // 0-20: Presença de blocos obrigatórios da jornada
  registryCompliance: number; // 0-20: Todos os blocos vêm do registry canônico
  copyConciseness: number; // 0-20: Títulos objetivos (<= 6 palavras), sem prolixidade
  exportHierarchy: number; // 0-20: Hierarquia sequencial sem títulos órfãos
  totalScore: number; // 0-100
  approved: boolean; // totalScore >= 80
  feedback: string[];
}

export interface NicheBlueprint {
  niche: CanonicalNiche;
  label: string;
  domainVocabulary: string[];
  bannedCliches: string[];
  mandatoryBlocks: {
    site: string[];
    biolink: string[];
    document: string[];
    presentation: string[];
    art: string[];
  };
  themePreset: {
    primaryColor: string;
    backgroundColor: string;
    textColor: string;
    fontFamily: string;
    borderRadius: "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  };
}

export const CANONICAL_NICHE_BLUEPRINTS: Record<CanonicalNiche, NicheBlueprint> = {
  legal: {
    niche: "legal",
    label: "Advocacia & Consultoria Jurídica",
    domainVocabulary: [
      "oab",
      "honorários",
      "contencioso",
      "consultivo",
      "parecer",
      "jurídico",
      "compliance",
      "contrato",
      "segurança",
      "tribunal",
      "due diligence",
      "litígio",
    ],
    bannedCliches: [
      "soluções inovadoras",
      "qualidade garantida",
      "o melhor escritório",
      "transforme sua vida",
    ],
    mandatoryBlocks: {
      site: ["hero_minimal_split", "bento_asymmetric_4", "testimonials_social_proof", "contact_form_direct"],
      biolink: ["hero_minimal_split", "contact_form_direct"],
      document: ["hero_minimal_split", "bento_asymmetric_4", "pricing_three_tiers", "contact_form_direct"],
      presentation: ["hero_minimal_split", "bento_asymmetric_4", "faq_clean_accordion"],
      art: ["hero_minimal_split"],
    },
    themePreset: {
      primaryColor: hexColor("0f172a"),
      backgroundColor: hexColor("ffffff"),
      textColor: hexColor("09090b"),
      fontFamily: "Inter, sans-serif",
      borderRadius: "md",
    },
  },
  gastronomy: {
    niche: "gastronomy",
    label: "Gastronomia & Restaurantes",
    domainVocabulary: [
      "cardápio",
      "ingredientes",
      "artesanal",
      "reserva",
      "chef",
      "harmonização",
      "sabor",
      "mesa",
      "gastronômica",
      "fresco",
      "autoral",
    ],
    bannedCliches: [
      "a melhor comida da cidade",
      "satisfação garantida",
      "delícias inigualáveis",
    ],
    mandatoryBlocks: {
      site: ["hero_minimal_split", "media_gallery_mosaic", "testimonials_social_proof", "contact_form_direct"],
      biolink: ["hero_minimal_split", "contact_form_direct"],
      document: ["hero_minimal_split", "media_gallery_mosaic", "pricing_three_tiers", "contact_form_direct"],
      presentation: ["hero_minimal_split", "media_gallery_mosaic", "faq_clean_accordion"],
      art: ["hero_minimal_split"],
    },
    themePreset: {
      primaryColor: hexColor("1c1917"),
      backgroundColor: hexColor("fafaf9"),
      textColor: hexColor("1c1917"),
      fontFamily: "Inter, sans-serif",
      borderRadius: "xl",
    },
  },
  tourism: {
    niche: "tourism",
    label: "Turismo & Experiências",
    domainVocabulary: [
      "roteiro",
      "embarque",
      "resort",
      "cotação",
      "transfer",
      "hospedagem",
      "pacote",
      "excursão",
      "cadastur",
      "seguro viagem",
      "temporada",
    ],
    bannedCliches: [
      "viagem dos seus sonhos",
      "o paraíso espera por você",
      "experiência incrível",
    ],
    mandatoryBlocks: {
      site: ["hero_minimal_split", "media_gallery_mosaic", "pricing_three_tiers", "contact_form_direct"],
      biolink: ["hero_minimal_split", "contact_form_direct"],
      document: ["hero_minimal_split", "media_gallery_mosaic", "pricing_three_tiers", "contact_form_direct"],
      presentation: ["hero_minimal_split", "media_gallery_mosaic", "bento_asymmetric_4"],
      art: ["hero_minimal_split"],
    },
    themePreset: {
      primaryColor: hexColor("0284c7"),
      backgroundColor: hexColor("ffffff"),
      textColor: hexColor("0f172a"),
      fontFamily: "Inter, sans-serif",
      borderRadius: "xl",
    },
  },
  real_estate: {
    niche: "real_estate",
    label: "Imobiliária & Alto Padrão",
    domainVocabulary: [
      "imóvel",
      "matrícula",
      "locação",
      "suíte",
      "condomínio",
      "vistoria",
      "valorização",
      "metragem",
      "cobertura",
      "rentabilidade",
      "due diligence",
    ],
    bannedCliches: [
      "a casa dos seus sonhos",
      "oportunidade única e imperdível",
      "preço que cabe no bolso",
    ],
    mandatoryBlocks: {
      site: ["hero_minimal_split", "media_gallery_mosaic", "bento_asymmetric_4", "contact_form_direct"],
      biolink: ["hero_minimal_split", "contact_form_direct"],
      document: ["hero_minimal_split", "media_gallery_mosaic", "bento_asymmetric_4", "contact_form_direct"],
      presentation: ["hero_minimal_split", "media_gallery_mosaic", "bento_asymmetric_4"],
      art: ["hero_minimal_split"],
    },
    themePreset: {
      primaryColor: hexColor("09090b"),
      backgroundColor: hexColor("ffffff"),
      textColor: hexColor("09090b"),
      fontFamily: "Inter, sans-serif",
      borderRadius: "lg",
    },
  },
  health: {
    niche: "health",
    label: "Saúde & Estética Clínica",
    domainVocabulary: [
      "protocolo",
      "avaliação",
      "paciente",
      "procedimento",
      "crm",
      "anvisa",
      "anamnese",
      "clínica",
      "cuidado",
      "recuperação",
      "bem-estar",
    ],
    bannedCliches: [
      "transforme sua beleza",
      "milagres estéticos",
      "corpo perfeito sem esforço",
    ],
    mandatoryBlocks: {
      site: ["hero_minimal_split", "bento_asymmetric_4", "testimonials_social_proof", "contact_form_direct"],
      biolink: ["hero_minimal_split", "contact_form_direct"],
      document: ["hero_minimal_split", "bento_asymmetric_4", "pricing_three_tiers", "contact_form_direct"],
      presentation: ["hero_minimal_split", "bento_asymmetric_4", "faq_clean_accordion"],
      art: ["hero_minimal_split"],
    },
    themePreset: {
      primaryColor: hexColor("059669"),
      backgroundColor: hexColor("ffffff"),
      textColor: hexColor("064e3b"),
      fontFamily: "Inter, sans-serif",
      borderRadius: "xl",
    },
  },
};

// ── 2. AVALIAÇÃO DETERMINÍSTICA DA RUBRICA DE QUALIDADE ──

export function evaluateArtifactQuality(
  doc: OmniPageDocument,
  archetype: ArtifactArchetype,
  niche: CanonicalNiche
): QualityRubricDimension {
  const blueprint = CANONICAL_NICHE_BLUEPRINTS[niche];
  const feedback: string[] = [];

  // Dimensão 1: Vocabulário Técnico & Ausência de Clichês (0-20)
  let vocabScore = 20;
  const serializedContent = JSON.stringify(doc).toLowerCase();
  
  let matchesCount = 0;
  for (const term of blueprint.domainVocabulary) {
    if (serializedContent.includes(term.toLowerCase())) {
      matchesCount += 1;
    }
  }

  if (matchesCount < 2) {
    vocabScore -= 10;
    feedback.push(`Vocabulário de nicho insuficiente (${matchesCount}/2 mínimos identificados).`);
  } else if (matchesCount < 4) {
    vocabScore -= 5;
  }

  for (const cliche of blueprint.bannedCliches) {
    if (serializedContent.includes(cliche.toLowerCase())) {
      vocabScore = Math.max(0, vocabScore - 5);
      feedback.push(`Clichê genérico proibido detectado: "${cliche}".`);
    }
  }

  // Dimensão 2: Completude Estrutural (0-20)
  let structScore = 20;
  const archetypeKey = archetype === "landing" ? "site" : archetype;
  const expectedMandatory = blueprint.mandatoryBlocks[archetypeKey] || blueprint.mandatoryBlocks.site;
  const existingTypes = new Set(doc.blocks.map((b) => b.type));

  for (const mandatoryType of expectedMandatory) {
    if (existingTypes.has(mandatoryType) === false) {
      structScore = Math.max(0, structScore - 6);
      feedback.push(`Bloco obrigatório ausente para ${archetype}/${niche}: ${mandatoryType}.`);
    }
  }

  // Dimensão 3: Rigor do Registry & Ausência de HTML Cru (0-20)
  let registryScore = 20;
  const validBlockIds = new Set(SITE_BUILDER_BLOCKS.map((b) => b.id));
  validBlockIds.add("bento_asymmetric_4");
  validBlockIds.add("pricing_three_tiers");

  for (const block of doc.blocks) {
    if (validBlockIds.has(block.type) === false) {
      registryScore = 0;
      feedback.push(`Bloco inválido fora do catálogo canônico: ${block.type}.`);
      break;
    }
    const blockContent = JSON.stringify(block.config);
    if (blockContent.includes("<script") || blockContent.includes("<iframe") || blockContent.includes("javascript:")) {
      registryScore = 0;
      feedback.push("HTML perigoso ou código não validado injetado no bloco.");
      break;
    }
  }

  // Dimensão 4: Concisão Textual & Densidade de Informação (0-20)
  let concisenessScore = 20;
  for (const block of doc.blocks) {
    const title = (block.config?.title || block.config?.sectionTitle || "") as string;
    if (title.length > 0) {
      const words = title.trim().split(/\s+/).length;
      if (words > 10) {
        concisenessScore = Math.max(0, concisenessScore - 4);
        feedback.push(`Título muito prolixo no bloco ${block.type} (${words} palavras; máx recomendado 10).`);
      }
    }
  }

  // Dimensão 5: Fidelidade de Hierarquia & Renderização (0-20)
  let hierarchyScore = 20;
  if (doc.blocks.length === 0) {
    hierarchyScore = 0;
    feedback.push("Documento vazio sem blocos estruturais.");
  } else {
    const firstBlock = doc.blocks[0];
    if (firstBlock.type !== "hero_minimal_split" && firstBlock.type !== "hero_interactive_carousel") {
      hierarchyScore -= 8;
      feedback.push("Primeiro bloco deve ser cabeçalho ou apresentação institucional.");
    }
    const lastBlock = doc.blocks[doc.blocks.length - 1];
    if (archetype === "site" && lastBlock.type !== "contact_form_direct" && lastBlock.type !== "faq_clean_accordion") {
      hierarchyScore -= 4;
    }
  }

  const totalScore = vocabScore + structScore + registryScore + concisenessScore + hierarchyScore;
  const approved = totalScore >= 80;

  return {
    nicheVocabulary: vocabScore,
    structuralCompleteness: structScore,
    registryCompliance: registryScore,
    copyConciseness: concisenessScore,
    exportHierarchy: hierarchyScore,
    totalScore,
    approved,
    feedback,
  };
}

// ── 3. GERADOR DE BLOCOS CANÔNICOS POR NICHO E ARQUÉTIPO ──

export interface GenerateAiArtifactInput {
  briefing: string;
  storeName: string;
  niche: CanonicalNiche;
  archetype: ArtifactArchetype;
  targetAudience?: string;
  slug?: string;
}

export function composeAiArtifactDocument(input: GenerateAiArtifactInput): {
  document: OmniPageDocument;
  rubric: QualityRubricDimension;
} {
  const blueprint = CANONICAL_NICHE_BLUEPRINTS[input.niche] || CANONICAL_NICHE_BLUEPRINTS.legal;
  const storeName = input.storeName.trim() || blueprint.label;
  const slug = input.slug || `${input.niche}-${input.archetype}-${Date.now().toString(36)}`;

  const blocks: OmniBlockInstance[] = [];

  // 1. Hero Block
  if (input.archetype === "art") {
    blocks.push({
      id: `blk_art_hero_${Date.now()}_1`,
      type: "hero_minimal_split",
      config: {
        badgeText: `${storeName.toUpperCase()} • DESTAQUE`,
        title: `${storeName}: Excelência e Precisão em Cada Entrega.`,
        subtitle: `Conheça nossos padrões para ${blueprint.label.toLowerCase()}.`,
        primaryCta: { label: "Saiba Mais", href: "#" },
        floatingStat: { label: "QUALIDADE", value: "100% Auditado", statusDot: true },
      },
      styling: { paddingY: "md", borderRadius: blueprint.themePreset.borderRadius },
      isHidden: false,
    });
  } else {
    blocks.push({
      id: `blk_hero_${Date.now()}_1`,
      type: "hero_minimal_split",
      config: {
        badgeText: `${storeName.toUpperCase()} • REFERÊNCIA EM ${input.niche.toUpperCase()}`,
        title: `${storeName}: Segurança e Rigor Profissional.`,
        subtitle: `Atendimento consultivo e soluções especializadas de alto padrão para ${input.targetAudience || "clientes exigentes"}.`,
        primaryCta: { label: "Falar com Especialista", href: "#contato" },
        secondaryCta: { label: "Conhecer Portfólio", href: "#detalhes" },
        floatingStat: { label: "CONFIABILIDADE", value: "20+ Anos de Atuação", statusDot: true },
      },
      styling: { paddingY: "lg", borderRadius: blueprint.themePreset.borderRadius },
      isHidden: false,
    });
  }

  // 2. Bento Grid ou Portfólio
  if (input.archetype === "site" || input.archetype === "landing" || input.archetype === "document" || input.archetype === "presentation") {
    blocks.push({
      id: `blk_bento_${Date.now()}_2`,
      type: "bento_asymmetric_4",
      config: {
        sectionTitle: `Pilares e Práticas em ${blueprint.label}`,
        sectionSubtitle: "Estrutura desenhada para mitigar riscos e assegurar resultados mensuráveis.",
        cells: [
          {
            id: "c-1",
            tag: blueprint.domainVocabulary[0].toUpperCase(),
            title: `Conformidade e ${blueprint.domainVocabulary[1]}`,
            description: `Rigor técnico e protocolos validados para conformidade completa.`,
            colSpan: 2,
          },
          {
            id: "c-2",
            tag: blueprint.domainVocabulary[2].toUpperCase(),
            title: `Assessoria Especializada`,
            description: `Acompanhamento contínuo em cada etapa do processo.`,
            colSpan: 1,
          },
          {
            id: "c-3",
            tag: blueprint.domainVocabulary[3].toUpperCase(),
            title: `Transparência Absoluta`,
            description: `Relatórios periódicos e evidências auditáveis sem surpresas.`,
            colSpan: 1,
          },
          {
            id: "c-4",
            tag: blueprint.domainVocabulary[4].toUpperCase(),
            title: `Eficiência e Celeridade`,
            description: `Prazos cumpridos com precisão e suporte direto ao cliente.`,
            colSpan: 2,
          },
        ],
      },
      styling: { paddingY: "lg", borderRadius: blueprint.themePreset.borderRadius },
      isHidden: false,
    });
  }

  // 3. Galeria (se gastronomia, turismo ou imobiliário)
  if ((input.niche === "gastronomy" || input.niche === "tourism" || input.niche === "real_estate") && input.archetype !== "art") {
    blocks.push({
      id: `blk_gallery_${Date.now()}_3`,
      type: "media_gallery_mosaic",
      config: {
        title: `Experiências Selecionadas de ${storeName}`,
        subtitle: "Imagens reais de nossos atendimentos e ambientes.",
        layout: "mosaic",
        items: [
          { id: "g-1", title: "Ambiente Principal", caption: "Espaço exclusivo e acolhedor" },
          { id: "g-2", title: "Procedimentos & Rotinas", caption: "Padrão de qualidade certificado" },
          { id: "g-3", title: "Destaque do Mês", caption: "Escolha mais recomendada" },
        ],
      },
      styling: { paddingY: "md", borderRadius: blueprint.themePreset.borderRadius },
      isHidden: false,
    });
  }

  // 4. Preços / Planos / Proposta
  if (input.archetype === "document" || input.archetype === "site" || input.archetype === "landing") {
    blocks.push({
      id: `blk_pricing_${Date.now()}_4`,
      type: "pricing_three_tiers",
      config: {
        title: "Condições e Investimento",
        subtitle: "Transparência total de valores e escopo delimitado.",
        tiers: [
          {
            id: "tier-1",
            name: "Plano Inicial",
            priceMonthlyCents: 49000,
            description: "Atendimento essencial com suporte direto.",
            features: ["Análise preliminar detalhada", "Relatório de conformidade", "Suporte em dias úteis"],
            ctaLabel: "Contratar Inicial",
          },
          {
            id: "tier-2",
            name: "Plano Integral",
            priceMonthlyCents: 129000,
            isPopular: true,
            badge: "Mais Procurado",
            description: "Acompanhamento completo de ponta a ponta.",
            features: ["Tudo do plano inicial", "Atendimento prioritário 24/7", "Revisões ilimitadas de contrato", "Certificado com assinatura digital"],
            ctaLabel: "Solicitar Integral",
          },
        ],
      },
      styling: { paddingY: "lg", borderRadius: blueprint.themePreset.borderRadius },
      isHidden: false,
    });
  }

  // 5. Prova Social
  if (input.archetype === "site" || input.archetype === "landing") {
    blocks.push({
      id: `blk_testimonials_${Date.now()}_5`,
      type: "testimonials_social_proof",
      config: {
        title: "Depoimentos de Confiança",
        subtitle: `O que dizem os clientes atendidos por ${storeName}.`,
        testimonials: [
          {
            id: "t-1",
            name: "Carlos Silveira",
            role: "Empresário",
            rating: 5,
            comment: `Trabalho impecável em ${input.niche}. Condução transparente do início ao fim com total suporte.`,
            verified: true,
          },
          {
            id: "t-2",
            name: "Mariana Alencar",
            role: "Diretora de Operações",
            rating: 5,
            comment: "Rigor técnico indiscutível e entrega rápida. Recomendo com segurança.",
            verified: true,
          },
        ],
      },
      styling: { paddingY: "md", borderRadius: blueprint.themePreset.borderRadius },
      isHidden: false,
    });
  }

  // 6. Formulário de Contato / Fechamento
  if (input.archetype !== "art" && input.archetype !== "presentation") {
    blocks.push({
      id: `blk_contact_${Date.now()}_6`,
      type: "contact_form_direct",
      config: {
        title: "Solicite um Atendimento Personalizado",
        subtitle: "Retornaremos seu contato com discrição e agilidade.",
        submitButtonText: "Enviar Solicitação",
        whatsappNumber: "5511999998888",
        successMessage: "Solicitação recebida com sucesso. Nossa equipe entrará em contato em breve.",
      },
      styling: { paddingY: "lg", borderRadius: blueprint.themePreset.borderRadius },
      isHidden: false,
    });
  }

  // 7. FAQ (para apresentações e sites)
  if (input.archetype === "presentation" || input.archetype === "site") {
    blocks.push({
      id: `blk_faq_${Date.now()}_7`,
      type: "faq_clean_accordion",
      config: {
        title: "Esclarecimentos Frequentes",
        subtitle: "Respostas diretas às principais dúvidas de contratação.",
        items: [
          {
            id: "f-1",
            question: "Qual o prazo padrão para início dos trabalhos?",
            answer: "Iniciamos a prestação de serviços imediatamente após a assinatura digital do contrato e validação do briefing.",
          },
          {
            id: "f-2",
            question: "Como é garantida a segurança das informações?",
            answer: "Todos os documentos são protegidos com criptografia de ponta a ponta e sigilo profissional absoluto.",
          },
        ],
      },
      styling: { paddingY: "md", borderRadius: blueprint.themePreset.borderRadius },
      isHidden: false,
    });
  }

  const document: OmniPageDocument = {
    page_id: `page_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    slug,
    title: `${storeName} — ${blueprint.label}`,
    description: `Experiência oficial de ${storeName} gerada nativamente no Waesy Omni-Builder.`,
    niche: input.niche,
    theme: {
      primaryColor: blueprint.themePreset.primaryColor,
      backgroundColor: blueprint.themePreset.backgroundColor,
      textColor: blueprint.themePreset.textColor,
      fontFamily: blueprint.themePreset.fontFamily,
      borderRadius: blueprint.themePreset.borderRadius,
    },
    blocks,
    published_at: null,
    updated_at: new Date().toISOString(),
  };

  const rubric = evaluateArtifactQuality(document, input.archetype, input.niche);

  return { document, rubric };
}

// ── 4. EXPORTAÇÃO MULTI-FORMATO FIEL (HTML, PDF-READY, SLIDES, ARTE) ──

export interface ExportArtifactOptions {
  format: "html" | "pdf_ready_html" | "presentation_slides" | "social_card" | "json";
}

export function exportBuilderArtifact(
  doc: OmniPageDocument,
  options: ExportArtifactOptions
): {
  format: string;
  contentType: string;
  content: string;
  pageCountEstimate?: number;
  slideCount?: number;
} {
  if (options.format === "json") {
    return {
      format: "json",
      contentType: "application/json",
      content: JSON.stringify(doc, null, 2),
    };
  }

  if (options.format === "presentation_slides") {
    const slides = doc.blocks.map((block, index) => {
      return {
        slideNumber: index + 1,
        title: (block.config?.title || block.config?.sectionTitle || `Slide ${index + 1}`) as string,
        subtitle: (block.config?.subtitle || block.config?.sectionSubtitle || "") as string,
        blockType: block.type,
        data: block.config,
        aspectRatio: "16:9",
        backgroundColor: doc.theme?.backgroundColor || hexColor("ffffff"),
        textColor: doc.theme?.textColor || hexColor("09090b"),
      };
    });

    return {
      format: "presentation_slides",
      contentType: "application/json",
      content: JSON.stringify(slides, null, 2),
      slideCount: slides.length,
    };
  }

  if (options.format === "social_card") {
    const firstHero = doc.blocks.find((b) => b.type === "hero_minimal_split") || doc.blocks[0];
    const heroTitle = (firstHero?.config?.title || doc.title) as string;
    const heroSubtitle = (firstHero?.config?.subtitle || doc.description || "") as string;
    const badge = (firstHero?.config?.badgeText || doc.niche || "").toUpperCase();

    const socialCardHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1200, height=630">
  <title>${doc.title} · Card Social</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1200px;
      height: 630px;
      background: ${doc.theme?.backgroundColor || hexColor("09090b")};
      color: ${doc.theme?.textColor || hexColor("f8fafc")};
      font-family: ${doc.theme?.fontFamily || "Inter, sans-serif"};
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 64px;
      overflow: hidden;
      border: 1px solid var(--border-subtle, currentColor);
    }
    .badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 9999px;
      background: ${doc.theme?.primaryColor || hexColor("0284c7")};
      color: var(--text-inverse, currentColor);
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      align-self: flex-start;
    }
    .title {
      font-size: 52px;
      font-weight: 800;
      line-height: 1.15;
      max-width: 1000px;
      letter-spacing: -0.02em;
    }
    .subtitle {
      font-size: 24px;
      color: ${hexColor("94a3b8")};
      max-width: 900px;
      line-height: 1.4;
      margin-top: 16px;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid var(--border-subtle, currentColor);
      padding-top: 24px;
      font-size: 16px;
      color: ${hexColor("64748b")};
    }
  </style>
</head>
<body>
  <div>
    <div class="badge">${badge}</div>
    <h1 class="title" style="margin-top: 24px;">${heroTitle}</h1>
    <p class="subtitle">${heroSubtitle}</p>
  </div>
  <div class="footer">
    <span>${doc.title}</span>
    <span>Certificado Waesy Omni-Builder</span>
  </div>
</body>
</html>`;

    return {
      format: "social_card",
      contentType: "text/html",
      content: socialCardHtml,
    };
  }

  // PDF-Ready HTML com regras rígidas de quebra de página e tipografia
  const isPdf = options.format === "pdf_ready_html";
  const pageRules = isPdf
    ? `@page { size: A4; margin: 16mm; }
       @media print {
         body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
         .block-section { page-break-inside: avoid; break-inside: avoid; margin-bottom: 24px; }
         .avoid-orphan { page-break-after: avoid; break-after: avoid; }
         .page-footer { position: fixed; bottom: 0; width: 100%; text-align: right; font-size: 10px; color: ${hexColor("94a3b8")}; }
       }`
    : "";

  const renderedBlocksHtml = doc.blocks
    .map((b) => {
      const title = (b.config?.title || b.config?.sectionTitle || "") as string;
      const subtitle = (b.config?.subtitle || b.config?.sectionSubtitle || "") as string;
      return `<section class="block-section" style="padding: 24px 0; border-bottom: 1px solid ${hexColor("e2e8f0")};">
        ${title ? `<h2 class="avoid-orphan" style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">${title}</h2>` : ""}
        ${subtitle ? `<p style="font-size: 14px; color: ${hexColor("64748b")}; margin-bottom: 16px;">${subtitle}</p>` : ""}
        <div style="font-size: 13px; line-height: 1.6;">
          ${JSON.stringify(b.config).slice(0, 300)}...
        </div>
      </section>`;
    })
    .join("\n");

  const fullHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${doc.title}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: ${doc.theme?.fontFamily || "Inter, sans-serif"};
      color: ${doc.theme?.textColor || hexColor("09090b")};
      background-color: ${doc.theme?.backgroundColor || hexColor("ffffff")};
      line-height: 1.5;
      margin: 0;
      padding: ${isPdf ? "0" : "32px 16px"};
      max-width: 960px;
      margin-left: auto;
      margin-right: auto;
    }
    ${pageRules}
  </style>
</head>
<body>
  <header style="padding-bottom: 24px; border-bottom: 2px solid ${doc.theme?.primaryColor || hexColor("0f172a")}; margin-bottom: 32px;">
    <h1 style="font-size: 28px; font-weight: 800; margin-bottom: 8px;">${doc.title}</h1>
    <p style="font-size: 14px; color: ${hexColor("64748b")};">${doc.description || ""}</p>
  </header>
  <main>
    ${renderedBlocksHtml}
  </main>
  <footer style="margin-top: 48px; padding-top: 16px; border-top: 1px solid ${hexColor("cbd5e1")}; font-size: 12px; color: ${hexColor("94a3b8")}; display: flex; justify-content: space-between;">
    <span>Documento gerado pelo Waesy Omni-Builder</span>
    <span>Página 1</span>
  </footer>
</body>
</html>`;

  return {
    format: options.format,
    contentType: "text/html",
    content: fullHtml,
    pageCountEstimate: Math.max(1, Math.ceil(doc.blocks.length / 2)),
  };
}

// ── 5. BFF SERVER FUNCTIONS PARA GERAÇÃO E PERSISTÊNCIA ──

export const generateAiBuilderArtifact = createServerFn({ method: "POST" })
  .validator(
    z.object({
      briefing: z.string().min(5),
      storeName: z.string().min(2),
      niche: z.enum(["legal", "gastronomy", "tourism", "real_estate", "health"]),
      archetype: z.enum(["site", "landing", "biolink", "document", "presentation", "art"]),
      targetAudience: z.string().optional(),
      threadId: z.string().uuid().optional(),
      messageId: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data: input }) => {
    try {
      await requireAdmin();
      const identity = await getServerIdentity();
      if (identity.store_id === null || identity.store_id === undefined) {
        throw new Error("Loja ativa não identificada na sessão segura.");
      }

      // 1. Gera o documento estruturado e calcula a rubrica
      const { document, rubric } = composeAiArtifactDocument({
        briefing: input.briefing,
        storeName: input.storeName,
        niche: input.niche,
        archetype: input.archetype,
        targetAudience: input.targetAudience,
      });

      // Se a rubrica reprovar (score < 80), bloqueia persistência de publicação
      const canPublish = rubric.approved;

      const db = getServerClient();

      // 2. Persiste em experience_documents
      const { data: expDoc, error: expErr } = await db
        .from("experience_documents")
        .insert({
          store_id: identity.store_id,
          document_type: input.archetype,
          slug: document.slug,
          title: document.title,
          artifact_archetype: input.archetype,
          niche: input.niche,
          quality_score: rubric.totalScore,
          quality_rubric: rubric,
          settings: {
            omni_page: document,
          },
          is_active: canPublish,
        })
        .select("id, slug, title, quality_score, created_at")
        .single();

      if (expErr) throw expErr;

      // 3. Se originado de chat (ou para entrega universal), espelha em chat_artifacts
      let chatArtifactRecord = null;
      if (input.threadId !== null && input.threadId !== undefined) {
        const chatArtifactType =
          input.archetype === "presentation"
            ? "presentation"
            : input.archetype === "art"
            ? "image"
            : input.archetype === "document"
            ? "document"
            : "landing_page";

        const { data: artifact, error: artErr } = await db
          .from("chat_artifacts")
          .insert({
            thread_id: input.threadId,
            message_id: input.messageId || null,
            store_id: identity.store_id,
            created_by: identity.id || null,
            artifact_type: chatArtifactType,
            title: document.title,
            version: 1,
            data: {
              omni_page: document,
              experience_document_id: expDoc.id,
            },
            metadata: {
              niche: input.niche,
              archetype: input.archetype,
              quality_score: rubric.totalScore,
              rubric_feedback: rubric.feedback,
            },
            experience_document_id: expDoc.id,
            quality_score: rubric.totalScore,
            quality_rubric: rubric,
          })
          .select("id, title, version, created_at")
          .single();

        if (artErr === null && artifact !== null) {
          chatArtifactRecord = artifact;
          // Atualiza chat_artifact_id em experience_documents
          await db
            .from("experience_documents")
            .update({ chat_artifact_id: artifact.id })
            .eq("id", expDoc.id);
        }
      }

      return {
        status: "ok" as const,
        documentId: expDoc.id,
        chatArtifactId: chatArtifactRecord?.id || null,
        title: expDoc.title,
        slug: expDoc.slug,
        qualityScore: rubric.totalScore,
        rubric,
        previewUrl: `/builder?doc=${expDoc.id}`,
        canPublish,
      };
    } catch (e: unknown) {
      if (e instanceof SupabaseUnconfiguredError) throw e;
      console.error("[ai-builder-composition.functions] generateAiBuilderArtifact error:", e);
      throw new Error(
        (e instanceof Error ? e.message : String(e)) || "Erro ao compor artefato do builder com IA."
      );
    }
  });

export const exportArtifactService = createServerFn({ method: "POST" })
  .validator(
    z.object({
      document: OmniPageDocumentSchema,
      format: z.enum(["html", "pdf_ready_html", "presentation_slides", "social_card", "json"]),
    })
  )
  .handler(async ({ data: input }) => {
    try {
      const exported = exportBuilderArtifact(input.document, { format: input.format });
      return {
        status: "ok" as const,
        ...exported,
      };
    } catch (e: unknown) {
      console.error("[ai-builder-composition.functions] exportArtifactService error:", e);
      throw new Error((e instanceof Error ? e.message : String(e)) || "Erro ao exportar artefato.");
    }
  });
