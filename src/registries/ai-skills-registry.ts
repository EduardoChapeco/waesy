/**
 * ai-skills-registry.ts — Registry Canônico de Habilidades (Skills) do Waesy AI OS
 * Define o catálogo tipado de capacidades modulares, versionamento semântico,
 * contratos Zod de entrada/saída e governança em camadas de risco.
 */

import { z } from "zod";
import type { ToolRiskTier } from "./ai-tools-risk-registry";

export interface AiSkillDefinition {
  id: string;
  slug: string;
  name: string;
  description: string;
  version: string;
  isOfficial: boolean;
  status: "active" | "deprecated" | "experimental";
  riskTier: ToolRiskTier;
  capabilities: string[];
  inputSchema: z.ZodType<any>;
  outputSchema: z.ZodType<any>;
  defaultTools: string[];
}

export const AI_SKILLS_REGISTRY: Record<string, AiSkillDefinition> = {
  research_and_discovery: {
    id: "skill-research-discovery",
    slug: "research_and_discovery",
    name: "Pesquisa & Descoberta Local",
    description: "Varredura unificada em estabelecimentos, comércios, vagas de emprego e eventos locais.",
    version: "1.0.0",
    isOfficial: true,
    status: "active",
    riskTier: "READ",
    capabilities: ["full_text_search", "geo_lookup", "places_catalog"],
    inputSchema: z.object({
      query: z.string().min(1),
      category: z.string().optional(),
      city: z.string().optional(),
      limit: z.number().int().min(1).max(50).default(10),
    }),
    outputSchema: z.object({
      totalFound: z.number().int(),
      items: z.array(z.record(z.any())),
    }),
    defaultTools: ["search_catalog_products", "query_places_directory", "get_weather_forecast"],
  },

  spreadsheet_financial_modeling: {
    id: "skill-spreadsheet-financial",
    slug: "spreadsheet_financial_modeling",
    name: "Modelagem Financeira & Planilhas",
    description: "Criação de planilhas tabulares, projeções de custos, cronogramas e exportação CSV/XLSX.",
    version: "1.0.0",
    isOfficial: true,
    status: "active",
    riskTier: "WRITE",
    capabilities: ["tabular_data", "csv_export", "financial_formulas"],
    inputSchema: z.object({
      title: z.string().min(2),
      columns: z.array(z.string().min(1)),
      rows: z.array(z.array(z.any())),
      summaryNotes: z.string().optional(),
    }),
    outputSchema: z.object({
      artifactId: z.string().uuid().optional(),
      rowCount: z.number().int(),
      columnCount: z.number().int(),
      csvPreview: z.string(),
    }),
    defaultTools: ["generate_spreadsheet_artifact", "update_working_memory"],
  },

  travel_itinerary_planner: {
    id: "skill-travel-planner",
    slug: "travel_itinerary_planner",
    name: "Planejador de Roteiros de Viagem",
    description: "Estruturação de cronogramas turísticos com paradas diárias, atrações, cálculo logístico e orçamento.",
    version: "1.0.0",
    isOfficial: true,
    status: "active",
    riskTier: "READ",
    capabilities: ["itinerary_routing", "attraction_curation", "budgeting"],
    inputSchema: z.object({
      destination: z.string().min(2),
      daysCount: z.number().int().min(1).max(30),
      interests: z.array(z.string()).default([]),
      budgetTier: z.enum(["budget", "comfort", "premium"]).default("comfort"),
    }),
    outputSchema: z.object({
      destination: z.string(),
      days: z.array(z.record(z.any())),
      estimatedCostCents: z.number().int().nonnegative(),
    }),
    defaultTools: ["query_places_directory", "get_weather_forecast"],
  },

  commercial_proposal_drafter: {
    id: "skill-proposal-drafter",
    slug: "commercial_proposal_drafter",
    name: "Elaborador de Propostas Comerciais",
    description: "Formulação de propostas formais com entregáveis, marcos de pagamento, escopo e condições.",
    version: "1.0.0",
    isOfficial: true,
    status: "active",
    riskTier: "WRITE",
    capabilities: ["quote_generation", "milestone_scheduling", "terms_definition"],
    inputSchema: z.object({
      clientName: z.string().min(2),
      serviceType: z.string().min(2),
      milestones: z.array(z.string()),
      totalCents: z.number().int().positive(),
      validityDays: z.number().int().positive().default(15),
    }),
    outputSchema: z.object({
      proposalNumber: z.string(),
      title: z.string(),
      totalFormatted: z.string(),
      terms: z.string(),
    }),
    defaultTools: ["draft_commercial_proposal", "update_working_memory"],
  },

  omnibuilder_site_designer: {
    id: "skill-omnibuilder-designer",
    slug: "omnibuilder_site_designer",
    name: "Designer de Páginas OmniBuilder",
    description: "Aplicação de patches cirúrgicos e layout estruturado na árvore de nós do OmniBuilder sem reescrita destrutiva.",
    version: "1.0.0",
    isOfficial: true,
    status: "active",
    riskTier: "WRITE",
    capabilities: ["builder_ast_patching", "palette_harmonization", "component_binding"],
    inputSchema: z.object({
      pageDocumentId: z.string().uuid(),
      targetSectionId: z.string().optional(),
      instructions: z.string().min(5),
    }),
    outputSchema: z.object({
      nodesPatched: z.number().int(),
      changesSummary: z.string(),
    }),
    defaultTools: ["update_working_memory"],
  },

  document_report_generator: {
    id: "skill-document-generator",
    slug: "document_report_generator",
    name: "Gerador de Relatórios e Dossiês",
    description: "Compilação de relatórios técnicos paginados, resumos executivos e especificações em formato estruturado.",
    version: "1.0.0",
    isOfficial: true,
    status: "active",
    riskTier: "WRITE",
    capabilities: ["pagination", "structured_typography", "executive_summary"],
    inputSchema: z.object({
      title: z.string().min(2),
      sections: z.array(z.object({
        heading: z.string(),
        content: z.string(),
      })),
      authorName: z.string().optional(),
    }),
    outputSchema: z.object({
      documentTitle: z.string(),
      sectionsCompiled: z.number().int(),
      tokenEstimate: z.number().int(),
    }),
    defaultTools: ["read_document_content", "update_working_memory"],
  },

  outbound_communication_dispatcher: {
    id: "skill-outbound-comms",
    slug: "outbound_communication_dispatcher",
    name: "Despachante de Comunicações Externas",
    description: "Envio de mensagens ou disparos de webhooks com confirmação e autenticação pelo usuário.",
    version: "1.0.0",
    isOfficial: true,
    status: "active",
    riskTier: "EXTERNAL_WRITE",
    capabilities: ["webhook_dispatch", "email_relay"],
    inputSchema: z.object({
      recipient: z.string().min(3),
      subject: z.string().min(2),
      messageBody: z.string().min(5),
    }),
    outputSchema: z.object({
      dispatchId: z.string(),
      status: z.enum(["dispatched", "queued", "pending_confirmation"]),
    }),
    defaultTools: ["send_connector_email", "send_outbound_webhook"],
  },

  wallet_token_governor: {
    id: "skill-wallet-token-governor",
    slug: "wallet_token_governor",
    name: "Governador de Carteira & $WZ",
    description: "Cotação, verificação de elegibilidade e liquidação de saldo $WZ sem cruzamento com saldo promocional de lojistas.",
    version: "1.0.0",
    isOfficial: true,
    status: "active",
    riskTier: "FINANCIAL",
    capabilities: ["token_estimation", "ledger_reservation", "tollbooth_settlement"],
    inputSchema: z.object({
      amountWz: z.number().positive(),
      taskType: z.string(),
      purpose: z.string(),
    }),
    outputSchema: z.object({
      approved: z.boolean(),
      reservedWz: z.number().nonnegative(),
      currentBalance: z.number().nonnegative(),
    }),
    defaultTools: ["deduct_wz_tokens"],
  },
};

/**
 * Recupera uma habilidade do catálogo por slug
 */
export function getAiSkill(slug: string): AiSkillDefinition | undefined {
  return AI_SKILLS_REGISTRY[slug];
}

/**
 * Lista habilidades disponíveis com filtros opcionais
 */
export function listAiSkills(filter?: {
  riskTier?: ToolRiskTier;
  status?: "active" | "deprecated" | "experimental";
}): AiSkillDefinition[] {
  let list = Object.values(AI_SKILLS_REGISTRY);
  if (filter?.riskTier) {
    list = list.filter((s) => s.riskTier === filter.riskTier);
  }
  if (filter?.status) {
    list = list.filter((s) => s.status === filter.status);
  }
  return list;
}

/**
 * Valida os parâmetros de entrada de uma habilidade
 */
export function validateSkillInput(slug: string, input: unknown): {
  success: boolean;
  data?: any;
  error?: string;
} {
  const skill = getAiSkill(slug);
  if (!skill) {
    return { success: false, error: `Habilidade '${slug}' não encontrada no registry.` };
  }
  const result = skill.inputSchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ") };
  }
  return { success: true, data: result.data };
}
