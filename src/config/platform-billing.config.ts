/**
 * platform-billing.config.ts — Configuração Canônica Central de Cobrança e Moeda da Plataforma
 * 
 * SSOT (Single Source of Truth) para custos de serviços debitados em Tokens Waesy (user_balances / store_token_wallets).
 * Proibido declarar valores literais soltos no código ou componentes.
 */

/**
 * Custo em Tokens Waesy para execução completa do Onboarding Guiado por IA:
 * Pipeline com Crawler Real (Firecrawl/Steel) + Concílio de IAs em 4 etapas
 * + Persistência em Brand Kit, Brand DNA, SWOT, Business Model Canvas e 7 Pecados.
 */
export const ONBOARDING_AI_COST = 20_000;

/**
 * Estimativa de tempo humano economizado (em minutos) para o ledger auditável
 */
export const ONBOARDING_AI_TIME_SAVED_MINUTES = 360; // 6 horas de consultoria sênior de branding e estruturação de catálogo

/**
 * Formata quantidade de tokens para exibição humana na interface
 */
export function formatPlatformTokens(tokens: number): string {
  return new Intl.NumberFormat("pt-BR").format(tokens);
}
