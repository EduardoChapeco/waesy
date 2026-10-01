/**
 * ai-quality-rubrics.ts — Catálogo Normativo de Rubricas Ancoradas 0 a 5 por Tarefa
 *
 * PROMPT 28 (Plano #40): Avaliação Contínua e Benchmark de Qualidade 2.0 (Fase A)
 *
 * Princípios Fundamentais:
 * 1. Âncora Obrigatória: Toda nota de 0 a 5 possui uma âncora textual objetiva.
 * 2. 8 Critérios Universais: Fidelidade ao Dado, Ausência de Invenção, Aderência ao Tom,
 *    Estrutura, Densidade, Acionabilidade, Formato e Ausência de Promessa Vazia.
 * 3. 9 Tarefas Canônicas: chat, document, presentation, page, ad, classification, extraction, summary, code.
 * 4. Zero Mocks / Zero Falhas Silenciosas: Avaliação determinística e comparável.
 */

export type QualityTaskType =
  | "chat"
  | "document"
  | "presentation"
  | "page"
  | "ad"
  | "classification"
  | "extraction"
  | "summary"
  | "code";

export type QualityCriterionKey =
  | "fidelidade_ao_dado_interno"
  | "ausencia_de_invencao"
  | "aderencia_ao_tom"
  | "estrutura"
  | "densidade"
  | "acionabilidade"
  | "formato"
  | "ausencia_de_promessa_vazia";

export interface RubricAnchor {
  score: 0 | 1 | 2 | 3 | 4 | 5;
  title: string;
  description: string;
}

export interface QualityCriterionDefinition {
  key: QualityCriterionKey;
  label: string;
  weight: number; // Peso relativo (soma 1.0 por tarefa)
  description: string;
  anchors: Record<0 | 1 | 2 | 3 | 4 | 5, string>;
}

export interface TaskQualityRubricProfile {
  task: QualityTaskType;
  label: string;
  description: string;
  minAcceptableScore: number;
  criteria: Record<QualityCriterionKey, QualityCriterionDefinition>;
}

// ============================================================
// 1. Definições Universais das 8 Rubricas Ancoradas (0 a 5)
// ============================================================

export const CANONICAL_QUALITY_CRITERIA: Record<QualityCriterionKey, QualityCriterionDefinition> = {
  fidelidade_ao_dado_interno: {
    key: "fidelidade_ao_dado_interno",
    label: "Fidelidade ao Dado Interno",
    weight: 0.15,
    description: "Aderência estrita às entidades, valores e restrições fornecidas no contexto.",
    anchors: {
      0: "Totalmente descolado dos dados fornecidos; inventa fatos contraditórios ou valores inexistentes.",
      1: "Contém mais de 50% de dados estranhos ou conflitantes com o contexto da organização.",
      2: "Apresenta dados corretos, mas distorce valores monetários, nomes ou termos essenciais.",
      3: "Fiel na maioria dos dados, mas com 1 imprecisão secundária não crítica.",
      4: "Quase perfeito; todos os dados essenciais preservados com fidelidade ao contexto.",
      5: "Fidelidade absoluta; 100% dos dados ancorados estritamente no contexto interno fornecido.",
    },
  },
  ausencia_de_invencao: {
    key: "ausencia_de_invencao",
    label: "Ausência de Invenção (Zero Alucinação)",
    weight: 0.15,
    description: "Imunidade completa à criação de entidades, regras ou fatos fictícios.",
    anchors: {
      0: "Inventa completamente políticas, telefones, CNPJs, preços ou dados cadastrais.",
      1: "Supõe regras ou fatos cruciais não mencionados em nenhuma fonte do contexto.",
      2: "Cria pequenos detalhes decorativos fictícios não solicitados pelo comando.",
      3: "Permanece no contexto com pequenas extrapolações genéricas aceitáveis.",
      4: "Zero invenção factual; apenas derivações lógicas estritas a partir das premissas.",
      5: "Zero alucinação provada; nenhuma entidade, valor ou promessa inventada.",
    },
  },
  aderencia_ao_tom: {
    key: "aderencia_ao_tom",
    label: "Aderência ao Tom e Silêncio Visual",
    weight: 0.10,
    description: "Conformidade com o tom sóbrio da marca (Apple/Linear HIG), sem clichês nem emojis.",
    anchors: {
      0: "Prolixo, usa clichês excessivos de IA ('Certamente!', 'Com prazer!'), emojis proibidos e tom artificial.",
      1: "Conversacional excessivo, explica a própria interface com saudações desnecessárias.",
      2: "Tom aceitável, mas com frases introdutórias ou conclusivas vazias.",
      3: "Direto, mas com 1 expressão de transição clichê menor.",
      4: "Conciso, profissional, respeitando a sobriedade e o silêncio visual.",
      5: "Padrão Apple HIG absoluto: direto, silencioso, elegante, sem introduções vazias nem emojis.",
    },
  },
  estrutura: {
    key: "estrutura",
    label: "Estrutura e Hierarquia",
    weight: 0.15,
    description: "Organização lógica em blocos semânticos, cabeçalhos e separação visual clara.",
    anchors: {
      0: "Bloco de texto monolítico ilegível sem quebras, títulos ou hierarquia.",
      1: "Hierarquia quebrada, títulos desordenados ou níveis saltados sem lógica.",
      2: "Títulos aceitáveis, mas listas confusas ou mal formatadas.",
      3: "Estrutura legível com seções claras e parágrafos curtos.",
      4: "Excelente hierarquia visual e separação lógica em blocos bem definidos.",
      5: "Estrutura modular canônica impecável; respeita perfeitamente o layout e a hierarquia.",
    },
  },
  densidade: {
    key: "densidade",
    label: "Densidade de Informação",
    weight: 0.10,
    description: "Relação sinal/ruído: maximização de utilidade por linha e eliminação de redundâncias.",
    anchors: {
      0: "Puro ruído e enrolação textual; zero valor informativo ou acionável.",
      1: "Mais de 60% de texto decorativo, floreios ou repetições vazias.",
      2: "Informação útil diluída em parágrafos longos com gordura textual.",
      3: "Densidade razoável com pequenas repetições pontuais.",
      4: "Alta densidade de informação por linha; enxuto e objetivo.",
      5: "Máxima densidade de sinal; cada palavra carrega significado e utilidade direta.",
    },
  },
  acionabilidade: {
    key: "acionabilidade",
    label: "Acionabilidade e Prontidão de Execução",
    weight: 0.15,
    description: "Capacidade da saída guiar ou disparar ações imediatas do operador ou sistema.",
    anchors: {
      0: "Puramente teórico ou genérico; usuário ou sistema não têm como agir.",
      1: "Sugere ações vagas e descontextualizadas ('otimize seus processos').",
      2: "Traz opções, mas sem botões, rotas, comandos ou passos concretos.",
      3: "Apresenta passos claros e sequenciais para prosseguir.",
      4: "Ações diretamente executáveis com parâmetros definidos e claros.",
      5: "100% acionável; gatilhos, botões, rotas e payloads prontos para execução imediata.",
    },
  },
  formato: {
    key: "formato",
    label: "Conformidade Sintática de Formato",
    weight: 0.10,
    description: "Validade estrita de JSON, Markdown, tipagem e schema sem necessidade de reparo.",
    anchors: {
      0: "Formato completamente inválido (ex: esperava JSON e retornou texto corrido com erro de parse).",
      1: "Formato quebrado com erros graves de sintaxe ou markdown corrompido.",
      2: "JSON ou Markdown sintaticamente válido, mas schema com chaves essenciais faltando.",
      3: "Schema válido com pequenas inconsistências não impeditivas de tipagem.",
      4: "Sintaxe e tipos estritamente em conformidade com o contrato esperado.",
      5: "Conformidade absoluta com o schema Zod e contrato esperado sem necessidade de sanitização.",
    },
  },
  ausencia_de_promessa_vazia: {
    key: "ausencia_de_promessa_vazia",
    label: "Ausência de Promessas Vazias",
    weight: 0.10,
    description: "Explicitação responsável de limites, prazos e condições reais sem exageros.",
    anchors: {
      0: "Faz promessas irrealistas ou garantias financeiras/jurídicas infundadas e perigosas.",
      1: "Promete entregas ou prazos sem qualquer checagem de viabilidade operacional.",
      2: "Utiliza frases como 'garantimos 100% de sucesso' ou afirmações superlativas.",
      3: "Sem promessas vazias graves, mas com otimismo infundado em estimativas.",
      4: "Afirmações ponderadas, fundamentadas nos dados e dentro dos limites operacionais.",
      5: "Transparência e precisão absolutas; explicita limites, prazos e condições reais.",
    },
  },
};

// ============================================================
// 2. Perfis de Rubricas Ponderadas por Tarefa Canônica
// ============================================================

export const TASK_QUALITY_RUBRIC_PROFILES: Record<QualityTaskType, TaskQualityRubricProfile> = {
  chat: {
    task: "chat",
    label: "Resposta de Chat e Concierge",
    description: "Avaliação de interações conversacionais e atendimento a clientes no chat.",
    minAcceptableScore: 4.5,
    criteria: CANONICAL_QUALITY_CRITERIA,
  },
  document: {
    task: "document",
    label: "Documento Formal (Contrato, Proposta, Laudo)",
    description: "Avaliação de documentos formais de alta complexidade e valor legal.",
    minAcceptableScore: 4.6,
    criteria: CANONICAL_QUALITY_CRITERIA,
  },
  presentation: {
    task: "presentation",
    label: "Apresentação de Slides (16:9)",
    description: "Avaliação de slides e propostas visuais estruturadas.",
    minAcceptableScore: 4.4,
    criteria: CANONICAL_QUALITY_CRITERIA,
  },
  page: {
    task: "page",
    label: "Página e Vitrine Digital",
    description: "Avaliação de páginas de builder, biolinks e vitrines de produtos.",
    minAcceptableScore: 4.5,
    criteria: CANONICAL_QUALITY_CRITERIA,
  },
  ad: {
    task: "ad",
    label: "Anúncio e Campanha Criativa",
    description: "Avaliação de textos publicitários, copywriting e campanhas de marketing.",
    minAcceptableScore: 4.5,
    criteria: CANONICAL_QUALITY_CRITERIA,
  },
  classification: {
    task: "classification",
    label: "Classificação Categórica e Triagem",
    description: "Avaliação de rotulagem determinística de categorias, intenções e status.",
    minAcceptableScore: 4.7,
    criteria: CANONICAL_QUALITY_CRITERIA,
  },
  extraction: {
    task: "extraction",
    label: "Extração de Dados Estruturados",
    description: "Avaliação de extração de tabelas, recibos, cardápios e atributos.",
    minAcceptableScore: 4.7,
    criteria: CANONICAL_QUALITY_CRITERIA,
  },
  summary: {
    task: "summary",
    label: "Resumo Executivo e Síntese",
    description: "Avaliação de condensação fiel de dados financeiros, reuniões e histórico.",
    minAcceptableScore: 4.6,
    criteria: CANONICAL_QUALITY_CRITERIA,
  },
  code: {
    task: "code",
    label: "Geração de Código e Schemas",
    description: "Avaliação de scripts utilitários, validações Zod e regras de negócio puras.",
    minAcceptableScore: 4.8,
    criteria: CANONICAL_QUALITY_CRITERIA,
  },
};

// ============================================================
// 3. Funções de Cálculo e Validação
// ============================================================

export interface TaskEvaluationInput {
  task: QualityTaskType;
  outputContent: string;
  outputJson?: any;
  groundTruthData?: Record<string, any>;
  context?: Record<string, any>;
  prompt: string;
}

export interface TaskEvaluationScoreResult {
  task: QualityTaskType;
  scores: Record<QualityCriterionKey, number>; // 0 a 5
  overallScore: number; // 0.00 a 5.00 ponderado
  passed: boolean;
  minAcceptableScore: number;
  weakRubrics: QualityCriterionKey[];
  justifications: Record<QualityCriterionKey, string>;
}

/**
 * Calcula a nota ponderada de uma saída com base nas 8 rubricas e seus pesos.
 */
export function calculateWeightedQualityScore(
  task: QualityTaskType,
  scores: Record<QualityCriterionKey, number>
): { overallScore: number; passed: boolean; weakRubrics: QualityCriterionKey[] } {
  const profile = TASK_QUALITY_RUBRIC_PROFILES[task] || TASK_QUALITY_RUBRIC_PROFILES.chat;
  let weightedSum = 0;
  let totalWeight = 0;
  const weakRubrics: QualityCriterionKey[] = [];

  for (const key of Object.keys(CANONICAL_QUALITY_CRITERIA) as QualityCriterionKey[]) {
    const criterion = CANONICAL_QUALITY_CRITERIA[key];
    const score = Math.max(0, Math.min(5, scores[key] !== undefined ? scores[key] : 0));
    weightedSum += score * criterion.weight;
    totalWeight += criterion.weight;

    if (score < 4) {
      weakRubrics.push(key);
    }
  }

  const overallScore = Number((weightedSum / (totalWeight > 0 ? totalWeight : 1)).toFixed(2));
  const passed = overallScore >= profile.minAcceptableScore && weakRubrics.length <= 1;

  return {
    overallScore,
    passed,
    weakRubrics,
  };
}
