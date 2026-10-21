/**
 * ai-tools-risk-registry.ts — Registry Canônico de Classificação de Risco de Ferramentas de IA
 * Classifica todas as ferramentas em 5 níveis de risco estritos:
 * 1. READ: Execução automática e segura sem efeitos colaterais.
 * 2. WRITE: Operações internas reversíveis (ex: atualizar rascunho, salvar anotação).
 * 3. EXTERNAL_WRITE: Interação com APIs externas e serviços terceiros (ex: webhooks, envios).
 * 4. FINANCIAL: Movimentação de saldos, $WZ, pagamentos ou concessão de créditos (exige confirmação explícita).
 * 5. IRREVERSIBLE: Deleção de registros, cancelamento definitivo ou publicação ao vivo (exige 2-pass approval).
 */

export type ToolRiskTier = "READ" | "WRITE" | "EXTERNAL_WRITE" | "FINANCIAL" | "IRREVERSIBLE";

export interface ToolRiskDefinition {
  toolName: string;
  category: string;
  description: string;
  riskTier: ToolRiskTier;
  requiresExplicitConfirmation: boolean;
  requiresTwoPassApproval: boolean;
  estimatedTokens: number;
}

export const AI_TOOLS_RISK_REGISTRY: Record<string, ToolRiskDefinition> = {
  // ─── NÍVEL 1: READ ──────────────────────────────────────────────────────────
  search_catalog_products: {
    toolName: "search_catalog_products",
    category: "catalog",
    description: "Busca produtos e estoques públicos locais",
    riskTier: "READ",
    requiresExplicitConfirmation: false,
    requiresTwoPassApproval: false,
    estimatedTokens: 60,
  },
  query_places_directory: {
    toolName: "query_places_directory",
    category: "places",
    description: "Consulta estabelecimentos e locais do guia",
    riskTier: "READ",
    requiresExplicitConfirmation: false,
    requiresTwoPassApproval: false,
    estimatedTokens: 75,
  },
  read_document_content: {
    toolName: "read_document_content",
    category: "artifacts",
    description: "Lê o conteúdo textual de um documento ou relatório",
    riskTier: "READ",
    requiresExplicitConfirmation: false,
    requiresTwoPassApproval: false,
    estimatedTokens: 50,
  },
  get_weather_forecast: {
    toolName: "get_weather_forecast",
    category: "weather",
    description: "Consulta previsão climática local",
    riskTier: "READ",
    requiresExplicitConfirmation: false,
    requiresTwoPassApproval: false,
    estimatedTokens: 40,
  },

  // ─── NÍVEL 2: WRITE ─────────────────────────────────────────────────────────
  update_working_memory: {
    toolName: "update_working_memory",
    category: "memory",
    description: "Atualiza variáveis de contexto e rascunhos na memória de trabalho",
    riskTier: "WRITE",
    requiresExplicitConfirmation: false,
    requiresTwoPassApproval: false,
    estimatedTokens: 35,
  },
  generate_spreadsheet_artifact: {
    toolName: "generate_spreadsheet_artifact",
    category: "builder",
    description: "Gera ou atualiza planilha XLSX no painel",
    riskTier: "WRITE",
    requiresExplicitConfirmation: false,
    requiresTwoPassApproval: false,
    estimatedTokens: 120,
  },
  draft_commercial_proposal: {
    toolName: "draft_commercial_proposal",
    category: "proposals",
    description: "Cria um rascunho de proposta comercial",
    riskTier: "WRITE",
    requiresExplicitConfirmation: false,
    requiresTwoPassApproval: false,
    estimatedTokens: 180,
  },

  // ─── NÍVEL 3: EXTERNAL_WRITE ───────────────────────────────────────────────
  send_outbound_webhook: {
    toolName: "send_outbound_webhook",
    category: "integrations",
    description: "Envia requisição HTTP POST para webhook externo configurado",
    riskTier: "EXTERNAL_WRITE",
    requiresExplicitConfirmation: true,
    requiresTwoPassApproval: false,
    estimatedTokens: 100,
  },
  send_connector_email: {
    toolName: "send_connector_email",
    category: "connectors",
    description: "Envia e-mail através da conta conectada do usuário",
    riskTier: "EXTERNAL_WRITE",
    requiresExplicitConfirmation: true,
    requiresTwoPassApproval: false,
    estimatedTokens: 150,
  },

  // ─── NÍVEL 4: FINANCIAL ───────────────────────────────────────────────────
  deduct_wz_tokens: {
    toolName: "deduct_wz_tokens",
    category: "financial",
    description: "Dedução ou liquidação de tokens $WZ da carteira civil",
    riskTier: "FINANCIAL",
    requiresExplicitConfirmation: true,
    requiresTwoPassApproval: false,
    estimatedTokens: 80,
  },
  create_order_payment_intent: {
    toolName: "create_order_payment_intent",
    category: "financial",
    description: "Gera intenção de pagamento PIX ou cartão para pedido",
    riskTier: "FINANCIAL",
    requiresExplicitConfirmation: true,
    requiresTwoPassApproval: false,
    estimatedTokens: 90,
  },

  // ─── NÍVEL 5: IRREVERSIBLE ────────────────────────────────────────────────
  delete_thread_or_artifact: {
    toolName: "delete_thread_or_artifact",
    category: "storage",
    description: "Exclusão permanente de conversa, tarefa ou arquivo gerado",
    riskTier: "IRREVERSIBLE",
    requiresExplicitConfirmation: true,
    requiresTwoPassApproval: true,
    estimatedTokens: 40,
  },
  publish_live_omnibuilder_site: {
    toolName: "publish_live_omnibuilder_site",
    category: "builder",
    description: "Publica e substitui versão oficial de site ou biolink na internet",
    riskTier: "IRREVERSIBLE",
    requiresExplicitConfirmation: true,
    requiresTwoPassApproval: true,
    estimatedTokens: 110,
  },
};

/**
 * Avalia se uma ferramenta pode ser executada automaticamente ou exige confirmação prévia
 */
export function evaluateToolExecutionGate(toolName: string): {
  allowedAutoExecute: boolean;
  requiresUserPrompt: boolean;
  riskTier: ToolRiskTier;
} {
  const def = AI_TOOLS_RISK_REGISTRY[toolName];
  if (!def) {
    // Por segurança default, ferramenta desconhecida é tratada como WRITE com confirmação
    return {
      allowedAutoExecute: false,
      requiresUserPrompt: true,
      riskTier: "WRITE",
    };
  }

  if (def.riskTier === "READ") {
    return { allowedAutoExecute: true, requiresUserPrompt: false, riskTier: def.riskTier };
  }

  if (def.riskTier === "WRITE" && !def.requiresExplicitConfirmation) {
    return { allowedAutoExecute: true, requiresUserPrompt: false, riskTier: def.riskTier };
  }

  return {
    allowedAutoExecute: false,
    requiresUserPrompt: true,
    riskTier: def.riskTier,
  };
}
