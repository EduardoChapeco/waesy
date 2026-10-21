/**
 * wz-quote-engine.ts — Motor Central Canônico de Câmbio, Conversão e Precificação $WZ
 *
 * SSOT (Single Source of Truth) para paridade econômica, orçamentos versionados
 * e precificação de utilidades (Checkout, IA, Impulsionamento e Vales-Presente).
 *
 * PROIBIDO espalhar constantes arbitrárias de conversão pelo frontend ou backend.
 */

export interface WzConversionRate {
  version: number;
  wzUnitsPerBrlCent: number; // Ex: ~14.2857 WZ por centavo de Real (ou ~14.285,7 WZ por R$ 1,00)
  brlCentsPerMillionWz: number; // Ex: 700 centavos (R$ 7,00) por 100.000 WZ -> 7.000 centavos (R$ 70,00) por 1.000.000 WZ
  effectiveFrom: string;
}

// Taxa Gênesis canônica da plataforma Waesy
export const CANONICAL_WZ_RATE_V1: WzConversionRate = {
  version: 1,
  wzUnitsPerBrlCent: 142.85714285714286, // 100.000 WZ / 700 centavos = 142.8571... WZ por centavo de BRL (14.285,71 WZ por R$ 1,00)
  brlCentsPerMillionWz: 7000, // R$ 70,00 por 1.000.000 WZ (ou R$ 7,00 por 100.000 WZ)
  effectiveFrom: "2026-10-20T00:00:00Z",
};

/**
 * Converte valor em centavos de Real (BRL cents) para unidades inteiras de $WZ
 * utilizando a taxa canônica versionada e arredondamento determinístico.
 */
export function brlCentsToWz(cents: number, rate = CANONICAL_WZ_RATE_V1): number {
  if (cents <= 0) return 0;
  // Math.round determinístico server-side (sem float residual)
  return Math.round(cents * rate.wzUnitsPerBrlCent);
}

/**
 * Converte valor em $WZ para centavos de Real de referência (apenas para exibição/entendimento comercial).
 * NUNCA implica direito de saque ou resgate em dinheiro.
 */
export function wzToBrlCentsReference(wzAmount: number, rate = CANONICAL_WZ_RATE_V1): number {
  if (wzAmount <= 0) return 0;
  return Math.round((wzAmount / 1_000_000) * rate.brlCentsPerMillionWz);
}

/**
 * Formata quantidade de $WZ para apresentação visual canônica com prefixo e separadores.
 * Exemplo: 1250000 -> "1.250.000 $WZ"
 */
export function formatWz(amount: number | string | bigint): string {
  const numeric = typeof amount === "string" ? Number(amount) : Number(amount || 0);
  return `${new Intl.NumberFormat("pt-BR").format(Math.floor(numeric))} $WZ`;
}

/**
 * Formata apenas o número com pontuação brasileira.
 * Exemplo: 1250000 -> "1.250.000"
 */
export function formatWzNumber(amount: number | string | bigint): string {
  const numeric = typeof amount === "string" ? Number(amount) : Number(amount || 0);
  return new Intl.NumberFormat("pt-BR").format(Math.floor(numeric));
}

/**
 * Tabela Canônica de Tarifas de Inteligência Artificial em $WZ
 * Converte chamadas técnicas e tarefas cognitivas em unidades econômicas $WZ.
 */
export const AI_WZ_PRICING = {
  // Operações Assistenciais / Copilot
  short_chat_turn: { wz: 3_500, label: "Mensagem Rápida com Assistente", estBrl: "R$ 0,25" },
  deep_analysis_turn: { wz: 15_000, label: "Análise Profunda e Diagnóstico", estBrl: "R$ 1,05" },
  
  // Geração de Ativos e Mídia
  image_generation_hd: { wz: 80_000, label: "Geração de Imagem Promocional HD", estBrl: "R$ 5,60" },
  document_pdf_synthesis: { wz: 40_000, label: "Dossiê Executivo e Relatório PDF", estBrl: "R$ 2,80" },
  spreadsheet_model_ai: { wz: 45_000, label: "Modelagem de Planilha Estruturada", estBrl: "R$ 3,15" },
  
  // Mineração e Enriquecimento Corporativo
  cnpj_curation_batch: { wz: 25_000, label: "Curadoria e Enriquecimento de CNPJ", estBrl: "R$ 1,75" },
  market_intelligence_bairro: { wz: 60_000, label: "Radar de Mercado e Concorrência Local", estBrl: "R$ 4,20" },

  // Omni-Builder de Sites
  site_full_generation: { wz: 250_000, label: "Geração de Site Completo com IA", estBrl: "R$ 17,50" },
  site_section_refinement: { wz: 30_000, label: "Refinamento Editorial de Seção", estBrl: "R$ 2,10" },
} as const;

export type AiWzOperation = keyof typeof AI_WZ_PRICING;

/**
 * Converte consumo técnico de LLM (input_tokens + output_tokens) em cobrança comercial $WZ.
 * Regra: Provedores e modelos de linguagem possuem custos em micro-centavos de USD.
 * A engine converte isso para a tarifa oficial da plataforma em $WZ, garantindo sustentabilidade.
 */
export function calculateLlmTokensToWz(inputTokens: number, outputTokens: number, multiplier = 1.0): number {
  // Média ponderada de modelo de produção (ex: Claude 3.5 Sonnet / GPT-4o Mini):
  // ~1.000 tokens técnicos = ~150 $WZ
  const technicalSum = (inputTokens * 0.8) + (outputTokens * 2.2);
  const baseWz = Math.ceil((technicalSum / 1_000) * 150 * multiplier);
  return Math.max(500, baseWz); // Piso mínimo de 500 $WZ por turno
}

export interface WzQuote {
  quoteId: string;
  operationType: string;
  brlAmountCents: number;
  wzAmount: number;
  rateVersion: number;
  expiresAt: string;
  isEligible: boolean;
  requiredFeatures: string[];
}

/**
 * Gera cotação oficial assinada/versionada para uma transação comercial
 */
export function generateWzQuote(
  operationType: string,
  brlAmountCents: number,
  requiredFeatures = ["CHECKOUT"]
): WzQuote {
  const wzAmount = brlCentsToWz(brlAmountCents);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString(); // Válido por 15 minutos
  const quoteId = `q_wz_${now.getTime()}_${Math.random().toString(36).substring(2, 8)}`;

  return {
    quoteId,
    operationType,
    brlAmountCents,
    wzAmount,
    rateVersion: CANONICAL_WZ_RATE_V1.version,
    expiresAt,
    isEligible: true,
    requiredFeatures,
  };
}
