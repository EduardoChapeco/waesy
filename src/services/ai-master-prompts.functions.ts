/**
 * ai-master-prompts.functions.ts — Motor e Biblioteca de Prompts Master da Plataforma Waesy
 *
 * PROMPT 26: Biblioteca de Prompts Master (Governança, Versionamento Semântico e Fallback em Cascata)
 *
 * Princípios Fundamentais:
 * 1. Zero Prompts Órfãos: Nenhuma string multilinea de instrução solta no código.
 * 2. Validação Rigorosa: Interpolação tipada com Zod, impedindo quebra silenciosa por undefined.
 * 3. Cascata de Fallback em 3 Níveis: Tenant -> Global System -> Builtin Inabalável.
 * 4. Versionamento Semântico: SemVer (1.0.0), diff de versões e rollback em 1 clique.
 * 5. Telemetria e Auditoria: Registro append-only da versão exata que gerou cada resposta.
 *
 * Regras DL-01 / DL-04: Conformidade absoluta com design-lint, zero negação unária (!ident) e zero hex literais.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient, SupabaseUnconfiguredError } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess, requireAdmin, OWNER_ROLES } from "@/lib/server-access";

// ── 1. TIPOS E SCHEMAS CANÔNICOS DE VARIÁVEIS E VERSÕES ──

export type PromptCategory =
  | "commerce"
  | "operations"
  | "creative"
  | "legal"
  | "media"
  | "support"
  | "curation"
  | "builder";

export type ResolutionTier = "tenant" | "system" | "builtin";

export interface PromptVariableDefinition {
  name: string;
  type: "string" | "number" | "boolean" | "json";
  required: boolean;
  description?: string;
  defaultValue?: any;
  example?: any;
}

export interface MasterPromptDefinition {
  slug: string;
  version: string;
  title: string;
  description: string;
  category: PromptCategory;
  purpose: string;
  systemInstruction: string;
  promptTemplate: string;
  variablesSchema: PromptVariableDefinition[];
  recommendedProviders: string[];
  targetProvider: string;
  targetModel: string;
  temperature: number;
  maxTokens: number;
  visualReferenceUrl?: string;
  isDefault?: boolean;
}

export interface PromptResolutionResult {
  slug: string;
  version: string;
  title: string;
  category: PromptCategory;
  systemInstruction: string;
  userPrompt: string;
  resolvedTier: ResolutionTier;
  targetProvider: string;
  targetModel: string;
  temperature: number;
  maxTokens: number;
  resolutionTimeMs: number;
}

export class PromptVariableMissingError extends Error {
  constructor(public readonly missingVariables: string[], public readonly promptSlug: string) {
    super(`Variáveis obrigatórias ausentes para o prompt '${promptSlug}': ${missingVariables.join(", ")}`);
    this.name = "PromptVariableMissingError";
  }
}

// ── 2. CATÁLOGO CANÔNICO DE 12 PROMPTS MASTER EMBUTIDOS (TIER 3: BUILTIN) ──

export const BUILTIN_MASTER_PROMPTS_REGISTRY: Record<string, MasterPromptDefinition> = {
  product_importer_default: {
    slug: "product_importer_default",
    version: "1.0.0",
    title: "Importador & Normalizador de Produtos",
    description: "Extrai catálogo, precificação, atributos e dados estruturados de URLs e textos brutos.",
    category: "operations",
    purpose: "catalog",
    systemInstruction:
      "Você é o extrator mestre de dados de produtos da plataforma Waesy. Extraia título limpo, descrição semântica, preço em centavos, categoria e atributos obrigatórios em JSON rigoroso.",
    promptTemplate:
      "Analise a página ou texto a seguir e extraia o produto para a loja {{store_name}}:\nConteúdo Bruto:\n{{raw_content}}\nRetorne exclusivamente JSON com campos title, price_cents, description e sku.",
    variablesSchema: [
      { name: "store_name", type: "string", required: true, description: "Nome da loja destino" },
      { name: "raw_content", type: "string", required: true, description: "Texto ou HTML bruto raspado" },
    ],
    recommendedProviders: ["gemini", "groq", "openai"],
    targetProvider: "gemini",
    targetModel: "gemini-2.5-flash",
    temperature: 0.1,
    maxTokens: 2048,
    isDefault: true,
  },

  sdr_lead_qualifier: {
    slug: "sdr_lead_qualifier",
    version: "1.0.0",
    title: "Qualificador Comercial & SDR",
    description: "Atendimento consultivo e triagem rápida de leads com pontuação BANT.",
    category: "commerce",
    purpose: "lead_qualification",
    systemInstruction:
      "Você é o especialista comercial da loja {{store_name}}. Qualifique as necessidades do cliente com tom consultivo, objetivo e empático.",
    promptTemplate:
      "O cliente {{customer_name}} enviou a seguinte mensagem no contexto do nicho {{niche}}:\n\"{{customer_message}}\"\nResponda diretamente sem prolixidade e indique o próximo passo recomendado.",
    variablesSchema: [
      { name: "store_name", type: "string", required: true, description: "Nome da loja" },
      { name: "customer_name", type: "string", required: true, description: "Nome do cliente" },
      { name: "niche", type: "string", required: true, description: "Nicho da loja" },
      { name: "customer_message", type: "string", required: true, description: "Mensagem do cliente" },
    ],
    recommendedProviders: ["groq", "gemini", "openai"],
    targetProvider: "groq",
    targetModel: "llama-3.3-70b-versatile",
    temperature: 0.3,
    maxTokens: 1024,
    isDefault: true,
  },

  commerce_cart_assistant: {
    slug: "commerce_cart_assistant",
    version: "1.0.0",
    title: "Assistente de Compras & Carrinho",
    description: "Interpreta intenções de compra, adiciona itens ao carrinho e calcula totais.",
    category: "commerce",
    purpose: "cart_management",
    systemInstruction:
      "Você é o atendente de compras da loja {{store_name}}. Auxilie o cliente a encontrar itens, montar carrinhos e tirar dúvidas de entrega.",
    promptTemplate:
      "Catálogo disponível:\n{{catalog_context}}\nItens no carrinho:\n{{current_cart}}\nMensagem do cliente:\n\"{{user_query}}\"",
    variablesSchema: [
      { name: "store_name", type: "string", required: true, description: "Nome da loja" },
      { name: "catalog_context", type: "string", required: true, description: "Produtos em estoque" },
      { name: "current_cart", type: "string", required: false, defaultValue: "Vazio", description: "Estado atual do carrinho" },
      { name: "user_query", type: "string", required: true, description: "Pedido do usuário" },
    ],
    recommendedProviders: ["gemini", "openai", "anthropic"],
    targetProvider: "gemini",
    targetModel: "gemini-2.5-flash",
    temperature: 0.2,
    maxTokens: 1536,
    isDefault: true,
  },

  booking_appointment_concierge: {
    slug: "booking_appointment_concierge",
    version: "1.0.0",
    title: "Concierge de Agendamentos & Reservas",
    description: "Gerencia disponibilidade de agenda, slots livres e confirmação de horários.",
    category: "operations",
    purpose: "booking",
    systemInstruction:
      "Você gerencia os agendamentos da loja {{store_name}}. Confirme datas, profissionais disponíveis e requisitos do procedimento sem ambiguidades.",
    promptTemplate:
      "Serviço solicitado: {{service_name}}\nProfissional: {{staff_name}}\nHorários livres no dia {{target_date}}:\n{{available_slots}}\nSolicitação do cliente:\n\"{{user_input}}\"",
    variablesSchema: [
      { name: "store_name", type: "string", required: true, description: "Nome do estabelecimento" },
      { name: "service_name", type: "string", required: true, description: "Nome do serviço" },
      { name: "staff_name", type: "string", required: false, defaultValue: "Qualquer especialista", description: "Profissional" },
      { name: "target_date", type: "string", required: true, description: "Data solicitada" },
      { name: "available_slots", type: "string", required: true, description: "Lista de horários livres" },
      { name: "user_input", type: "string", required: true, description: "Mensagem do cliente" },
    ],
    recommendedProviders: ["groq", "gemini"],
    targetProvider: "groq",
    targetModel: "llama-3.3-70b-versatile",
    temperature: 0.2,
    maxTokens: 1024,
    isDefault: true,
  },

  builder_copy_generator: {
    slug: "builder_copy_generator",
    version: "1.0.0",
    title: "Redator Canônico para Omni-Builder",
    description: "Gera títulos concisos e textos de alta conversão para blocos do builder sem clichês de IA.",
    category: "builder",
    purpose: "site_composition",
    systemInstruction:
      "Você é o redator sênior do Waesy Omni-Builder. Crie títulos de no máximo 6 palavras, parágrafos objetivos e chamadas para ação claras. Jamais use clichês como 'soluções inovadoras' ou 'qualidade garantida'.",
    promptTemplate:
      "Escreva o conteúdo para o bloco {{block_type}} do nicho {{niche}} da empresa {{store_name}} com o seguinte objetivo:\n{{briefing}}",
    variablesSchema: [
      { name: "store_name", type: "string", required: true, description: "Nome da empresa" },
      { name: "niche", type: "string", required: true, description: "Nicho de atuação" },
      { name: "block_type", type: "string", required: true, description: "Tipo do bloco" },
      { name: "briefing", type: "string", required: true, description: "Objetivo do bloco" },
    ],
    recommendedProviders: ["gemini", "anthropic", "openai"],
    targetProvider: "gemini",
    targetModel: "gemini-2.5-flash",
    temperature: 0.3,
    maxTokens: 1024,
    isDefault: true,
  },

  travel_itinerary_architect: {
    slug: "travel_itinerary_architect",
    version: "1.0.0",
    title: "Arquiteto de Roteiros de Turismo",
    description: "Estrutura itinerários dia a dia com hospedagem, transfers e passeios credenciados.",
    category: "operations",
    purpose: "tourism",
    systemInstruction:
      "Você é o consultor de viagens credenciado da agência {{agency_name}}. Monte roteiros realistas com tempo de deslocamento, sugestões gastronômicas e suporte CADASTUR.",
    promptTemplate:
      "Destino: {{destination}}\nDuração: {{days_count}} dias\nPerfil dos viajantes: {{traveler_profile}}\nOrçamento estimado: {{budget_level}}\nMonte o roteiro cronológico dia a dia com destaques e recomendações.",
    variablesSchema: [
      { name: "agency_name", type: "string", required: true, description: "Nome da agência de turismo" },
      { name: "destination", type: "string", required: true, description: "Destino da viagem" },
      { name: "days_count", type: "number", required: true, description: "Quantidade de dias" },
      { name: "traveler_profile", type: "string", required: true, description: "Família, casal, solo, etc." },
      { name: "budget_level", type: "string", required: false, defaultValue: "Padrão", description: "Nível de orçamento" },
    ],
    recommendedProviders: ["gemini", "openai"],
    targetProvider: "gemini",
    targetModel: "gemini-2.5-flash",
    temperature: 0.4,
    maxTokens: 2500,
    isDefault: true,
  },

  legal_contract_reviewer: {
    slug: "legal_contract_reviewer",
    version: "1.0.0",
    title: "Revisor de Contratos & Conformidade",
    description: "Analisa instrumentos jurídicos, identificando cláusulas abusivas, prazos e penalidades.",
    category: "legal",
    purpose: "contract_review",
    systemInstruction:
      "Você é o auditor jurídico do escritório {{firm_name}}. Realize análise de conformidade de contratos apontando riscos, multas desproporcionais e omissões críticas.",
    promptTemplate:
      "Analise a seguinte minuta contratual sob as leis brasileiras:\nTipo: {{contract_type}}\nPartes: {{parties_overview}}\nMinuta:\n{{contract_text}}\nIdentifique 3 pontos fortes e 3 cláusulas de atenção imediata.",
    variablesSchema: [
      { name: "firm_name", type: "string", required: true, description: "Nome da sociedade de advogados" },
      { name: "contract_type", type: "string", required: true, description: "Tipo de contrato" },
      { name: "parties_overview", type: "string", required: true, description: "Resumo das partes" },
      { name: "contract_text", type: "string", required: true, description: "Texto da minuta" },
    ],
    recommendedProviders: ["anthropic", "openai", "gemini"],
    targetProvider: "anthropic",
    targetModel: "claude-3-7-sonnet",
    temperature: 0.1,
    maxTokens: 3000,
    isDefault: true,
  },

  simlab_marketing_campaign: {
    slug: "simlab_marketing_campaign",
    version: "1.0.0",
    title: "Estrategista de Campanhas SimLab",
    description: "Desenvolve planos de anúncios com ganchos, personas, canais e projeção de ROI.",
    category: "creative",
    purpose: "marketing",
    systemInstruction:
      "Você é o estrategista de crescimento do SimLab Marketing. Elabore planos de mídia mensuráveis com copies persuasivas e distribuição em múltiplos canais.",
    promptTemplate:
      "Produto/Oferta: {{product_name}}\nPreço: {{price_str}}\nObjetivo da campanha: {{campaign_goal}}\nPúblico-alvo: {{target_audience}}\nGere 3 ganchos para criativos e distribuição de orçamento recomendada.",
    variablesSchema: [
      { name: "product_name", type: "string", required: true, description: "Produto ou serviço em promoção" },
      { name: "price_str", type: "string", required: true, description: "Preço do item" },
      { name: "campaign_goal", type: "string", required: true, description: "Objetivo da campanha" },
      { name: "target_audience", type: "string", required: true, description: "Público-alvo" },
    ],
    recommendedProviders: ["gemini", "groq"],
    targetProvider: "gemini",
    targetModel: "gemini-2.5-flash",
    temperature: 0.4,
    maxTokens: 2048,
    isDefault: true,
  },

  rma_troubleshooter: {
    slug: "rma_troubleshooter",
    version: "1.0.0",
    title: "Especialista em Trocas & Devoluções (RMA)",
    description: "Orienta clientes no processo de garantia, estorno ou substituição com regras do CDC.",
    category: "support",
    purpose: "rma",
    systemInstruction:
      "Você atua no suporte ao cliente da loja {{store_name}}. Garanta que solicitações de troca e devolução sejam respondidas com agilidade e clareza nos prazos.",
    promptTemplate:
      "Pedido: #{{order_number}}\nItem reclamado: {{item_name}}\nMotivo relatado: {{issue_reason}}\nDias desde a entrega: {{days_since_delivery}}\nOriente o cliente sobre as opções válidas (troca imediata, crédito ou estorno).",
    variablesSchema: [
      { name: "store_name", type: "string", required: true, description: "Nome da loja" },
      { name: "order_number", type: "string", required: true, description: "Número do pedido" },
      { name: "item_name", type: "string", required: true, description: "Item do pedido" },
      { name: "issue_reason", type: "string", required: true, description: "Problema relatado" },
      { name: "days_since_delivery", type: "number", required: true, description: "Dias decorridos" },
    ],
    recommendedProviders: ["groq", "gemini"],
    targetProvider: "groq",
    targetModel: "llama-3.3-70b-versatile",
    temperature: 0.2,
    maxTokens: 1024,
    isDefault: true,
  },

  media_prompt_product_hero: {
    slug: "media_prompt_product_hero",
    version: "1.0.0",
    title: "Gerador de Mídia: Produto em Estúdio",
    description: "Criação de imagem fotográfica de produto em iluminação suave de estúdio e fundo neutro.",
    category: "media",
    purpose: "produto",
    systemInstruction:
      "Especialista em fotografia publicitária de produtos. Produza prompts descritivos com enquadramento macro, profundidade de campo e iluminação suave.",
    promptTemplate:
      "Fotografia comercial de alta resolução de {{product_name}}, material {{material_finish}}, posicionado em superfície clean, iluminação de estúdio difusa, fundo neutro minimalista, 8k, ultra-detalhado, sem artefatos.",
    variablesSchema: [
      { name: "product_name", type: "string", required: true, description: "Nome do produto" },
      { name: "material_finish", type: "string", required: true, description: "Acabamento/Material" },
    ],
    recommendedProviders: ["openai", "gemini"],
    targetProvider: "openai",
    targetModel: "dall-e-3",
    temperature: 0.2,
    maxTokens: 512,
    isDefault: true,
  },

  media_prompt_food_appetite: {
    slug: "media_prompt_food_appetite",
    version: "1.0.0",
    title: "Gerador de Mídia: Gastronomia Autoral",
    description: "Criação de fotografia de culinária artesanal com texturas apetitosas e ângulo de 45 graus.",
    category: "media",
    purpose: "comida",
    systemInstruction:
      "Especialista em food styling e fotografia gastronômica. Destaque textura fresca, vapor sutil e empratamento elegante.",
    promptTemplate:
      "Fotografia gastronômica profissional do prato {{dish_name}}, ingredientes visíveis {{key_ingredients}}, servido em louça cerâmica artesanal, ângulo de 45 graus, luz natural lateral suave, cores vibrantes apetitosas.",
    variablesSchema: [
      { name: "dish_name", type: "string", required: true, description: "Nome do prato ou receita" },
      { name: "key_ingredients", type: "string", required: true, description: "Principais ingredientes visíveis" },
    ],
    recommendedProviders: ["openai", "gemini"],
    targetProvider: "openai",
    targetModel: "dall-e-3",
    temperature: 0.2,
    maxTokens: 512,
    isDefault: true,
  },

  media_prompt_real_estate_luxury: {
    slug: "media_prompt_real_estate_luxury",
    version: "1.0.0",
    title: "Gerador de Mídia: Arquitetura & Imóvel Prime",
    description: "Criação de imagem de interiores ou fachadas de alto padrão com linhas limpas e iluminação dourada.",
    category: "media",
    purpose: "imovel",
    systemInstruction:
      "Especialista em visualização arquitetônica residencial de alto padrão. Destaque integração de ambientes, pé-direito duplo e acabamentos nobres.",
    promptTemplate:
      "Fotografia arquitetônica de {{property_type}} em estilo contemporâneo minimalista, piso nobre, iluminação crepuscular quente pelas janelas amplas, vista para {{scenery_view}}, acabamento impecável de revista de design.",
    variablesSchema: [
      { name: "property_type", type: "string", required: true, description: "Tipo de imóvel (cobertura, vila, studio)" },
      { name: "scenery_view", type: "string", required: true, description: "Cenário de fundo (vista mar, jardim, cidade)" },
    ],
    recommendedProviders: ["openai", "gemini"],
    targetProvider: "openai",
    targetModel: "dall-e-3",
    temperature: 0.2,
    maxTokens: 512,
    isDefault: true,
  },
};

// ── 3. INTERPOLAÇÃO SEGURA COM VALIDAÇÃO DE SCHEMA (FASE B) ──

export function interpolatePromptTemplate(
  template: string,
  variables: Record<string, any>,
  schema: PromptVariableDefinition[],
  slug: string
): string {
  const missing: string[] = [];

  for (const field of schema) {
    const val = variables[field.name];
    if (field.required && (val === undefined || val === null || val === "")) {
      missing.push(field.name);
    }
  }

  if (missing.length > 0) {
    throw new PromptVariableMissingError(missing, slug);
  }

  let interpolated = template;

  for (const field of schema) {
    const rawVal = variables[field.name];
    const val = rawVal !== undefined && rawVal !== null ? rawVal : field.defaultValue !== undefined ? field.defaultValue : "";
    const stringVal = typeof val === "object" ? JSON.stringify(val) : String(val);
    const pattern = new RegExp(`\\{\\{\\s*${field.name}\\s*\\}\\}`, "g");
    interpolated = interpolated.replace(pattern, stringVal);
  }

  return interpolated;
}

// ── 4. RESOLUÇÃO EM CASCATA DE 3 NÍVEIS COM CACHE EM MEMÓRIA (FASE C) ──

interface CacheEntry {
  data: MasterPromptDefinition;
  tier: ResolutionTier;
  expiresAt: number;
}

const promptMemoryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos de TTL para resolução sub-2ms

export async function resolveMasterPrompt(params: {
  slug: string;
  tenantId?: string;
  variables?: Record<string, any>;
  forceTier?: ResolutionTier;
}): Promise<PromptResolutionResult> {
  const startTime = Date.now();
  const slug = params.slug;
  const variables = params.variables || {};
  const cacheKey = `${params.tenantId || "global"}:${slug}`;

  let promptDef: MasterPromptDefinition | null = null;
  let resolvedTier: ResolutionTier = "builtin";

  // 1. Verificação do cache em memória
  if (params.forceTier === undefined) {
    const cached = promptMemoryCache.get(cacheKey);
    if (cached !== undefined && cached.expiresAt > Date.now()) {
      promptDef = cached.data;
      resolvedTier = cached.tier;
    }
  }

  // 2. Resolução através da cascata caso não esteja no cache
  if (promptDef === null) {
    try {
      const db = getServerClient();

      // Tier 1: Banco — Tenant Específico
      if (params.tenantId !== undefined && params.tenantId !== null && (params.forceTier === undefined || params.forceTier === "tenant")) {
        const { data: tenantPrompt } = await db
          .from("ai_master_prompts")
          .select("*")
          .eq("slug", slug)
          .eq("store_id", params.tenantId)
          .eq("is_active", true)
          .maybeSingle();

        if (tenantPrompt !== null && tenantPrompt !== undefined) {
          promptDef = {
            slug: tenantPrompt.slug,
            version: tenantPrompt.version || "1.0.0",
            title: tenantPrompt.title,
            description: tenantPrompt.description || "",
            category: (tenantPrompt.category as PromptCategory) || "operations",
            purpose: tenantPrompt.purpose || "general",
            systemInstruction: tenantPrompt.system_instruction,
            promptTemplate: tenantPrompt.prompt_template,
            variablesSchema: (tenantPrompt.variables_schema as PromptVariableDefinition[]) || [],
            recommendedProviders: (tenantPrompt.recommended_providers as string[]) || ["gemini", "groq"],
            targetProvider: tenantPrompt.target_provider || "gemini",
            targetModel: tenantPrompt.target_model || "gemini-2.5-flash",
            temperature: Number(tenantPrompt.temperature) || 0.2,
            maxTokens: tenantPrompt.max_tokens || 2048,
          };
          resolvedTier = "tenant";
        }
      }

      // Tier 2: Banco — Sistema Global
      if (promptDef === null && (params.forceTier === undefined || params.forceTier === "system")) {
        const { data: globalPrompt } = await db
          .from("ai_master_prompts")
          .select("*")
          .eq("slug", slug)
          .is("store_id", null)
          .eq("is_active", true)
          .maybeSingle();

        if (globalPrompt !== null && globalPrompt !== undefined) {
          promptDef = {
            slug: globalPrompt.slug,
            version: globalPrompt.version || "1.0.0",
            title: globalPrompt.title,
            description: globalPrompt.description || "",
            category: (globalPrompt.category as PromptCategory) || "operations",
            purpose: globalPrompt.purpose || "general",
            systemInstruction: globalPrompt.system_instruction,
            promptTemplate: globalPrompt.prompt_template,
            variablesSchema: (globalPrompt.variables_schema as PromptVariableDefinition[]) || [],
            recommendedProviders: (globalPrompt.recommended_providers as string[]) || ["gemini", "groq"],
            targetProvider: globalPrompt.target_provider || "gemini",
            targetModel: globalPrompt.target_model || "gemini-2.5-flash",
            temperature: Number(globalPrompt.temperature) || 0.2,
            maxTokens: globalPrompt.max_tokens || 2048,
          };
          resolvedTier = "system";
        }
      }
    } catch {
      // Falha ou indisponibilidade de banco aciona fallback automático para Tier 3
    }

    // Tier 3: Builtin Inabalável em Código
    if (promptDef === null) {
      const builtin = BUILTIN_MASTER_PROMPTS_REGISTRY[slug];
      if (builtin !== undefined) {
        promptDef = builtin;
        resolvedTier = "builtin";
      } else {
        // Fallback genérico de segurança máxima
        promptDef = BUILTIN_MASTER_PROMPTS_REGISTRY.sdr_lead_qualifier;
        resolvedTier = "builtin";
      }
    }

    // Armazenamento no cache
    promptMemoryCache.set(cacheKey, {
      data: promptDef,
      tier: resolvedTier,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
  }

  // 3. Interpolação e Validação de Variáveis
  const systemInstruction = interpolatePromptTemplate(
    promptDef.systemInstruction,
    variables,
    promptDef.variablesSchema,
    slug
  );

  const userPrompt = interpolatePromptTemplate(
    promptDef.promptTemplate,
    variables,
    promptDef.variablesSchema,
    slug
  );

  const resolutionTimeMs = Date.now() - startTime;

  return {
    slug: promptDef.slug,
    version: promptDef.version,
    title: promptDef.title,
    category: promptDef.category,
    systemInstruction,
    userPrompt,
    resolvedTier,
    targetProvider: promptDef.targetProvider,
    targetModel: promptDef.targetModel,
    temperature: promptDef.temperature,
    maxTokens: promptDef.maxTokens,
    resolutionTimeMs,
  };
}

// ── 5. DIFF E HISTÓRICO DE VERSÕES (FASE D) ──

export interface PromptVersionDiff {
  instructionChanged: boolean;
  templateChanged: boolean;
  temperatureChanged: boolean;
  modelChanged: boolean;
  variablesChanged: boolean;
  addedVariables: string[];
  removedVariables: string[];
}

export function diffPromptDefinitions(
  vOld: MasterPromptDefinition,
  vNew: MasterPromptDefinition
): PromptVersionDiff {
  const oldVars = new Set(vOld.variablesSchema.map((v) => v.name));
  const newVars = new Set(vNew.variablesSchema.map((v) => v.name));

  const addedVariables: string[] = [];
  const removedVariables: string[] = [];

  for (const v of newVars) {
    if (oldVars.has(v) === false) addedVariables.push(v);
  }
  for (const v of oldVars) {
    if (newVars.has(v) === false) removedVariables.push(v);
  }

  return {
    instructionChanged: vOld.systemInstruction !== vNew.systemInstruction,
    templateChanged: vOld.promptTemplate !== vNew.promptTemplate,
    temperatureChanged: vOld.temperature !== vNew.temperature,
    modelChanged: vOld.targetModel !== vNew.targetModel || vOld.targetProvider !== vNew.targetProvider,
    variablesChanged: addedVariables.length > 0 || removedVariables.length > 0,
    addedVariables,
    removedVariables,
  };
}

// ── 6. BFF SERVER FUNCTIONS PARA GOVERNANÇA DE PROMPTS ──

export const listMasterPromptsService = createServerFn({ method: "GET" })
  .validator(
    z.object({
      category: z.enum(["commerce", "operations", "creative", "legal", "media", "support", "curation", "builder"]).optional(),
      storeId: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data: input }) => {
    try {
      const identity = await getServerIdentity();
      if (identity.id === null || identity.id === undefined) {
        throw new Error("Não autenticado.");
      }

      const db = getServerClient();
      let query = db.from("ai_master_prompts").select("*").eq("is_active", true);

      if (input.category !== undefined && input.category !== null) {
        query = query.eq("category", input.category);
      }

      if (input.storeId !== undefined && input.storeId !== null) {
        query = query.or(`store_id.is.null,store_id.eq.${input.storeId}`);
      } else {
        query = query.is("store_id", null);
      }

      const { data, error } = await query.order("title", { ascending: true });
      if (error) throw error;

      return {
        status: "ok" as const,
        prompts: data || [],
        builtinCount: Object.keys(BUILTIN_MASTER_PROMPTS_REGISTRY).length,
      };
    } catch (e: unknown) {
      if (e instanceof SupabaseUnconfiguredError) throw e;
      // Fallback embutido caso o banco esteja indisponível
      const builtinList = Object.values(BUILTIN_MASTER_PROMPTS_REGISTRY);
      const filtered = input.category !== undefined && input.category !== null
        ? builtinList.filter((b) => b.category === input.category)
        : builtinList;

      return {
        status: "ok" as const,
        prompts: filtered,
        builtinCount: builtinList.length,
      };
    }
  });

export const testPromptInterpolationService = createServerFn({ method: "POST" })
  .validator(
    z.object({
      slug: z.string().min(2),
      variables: z.record(z.any()),
    })
  )
  .handler(async ({ data: input }) => {
    try {
      const resolved = await resolveMasterPrompt({
        slug: input.slug,
        variables: input.variables,
      });

      return {
        status: "ok" as const,
        resolved,
      };
    } catch (e: unknown) {
      if (e instanceof PromptVariableMissingError) {
        return {
          status: "validation_error" as const,
          missingVariables: e.missingVariables,
          message: e.message,
        };
      }
      throw new Error((e instanceof Error ? e.message : String(e)) || "Erro ao testar interpolação.");
    }
  });

export const rollbackMasterPromptVersionService = createServerFn({ method: "POST" })
  .validator(
    z.object({
      promptId: z.string().uuid(),
      targetVersion: z.string().min(5),
    })
  )
  .handler(async ({ data: input }) => {
    try {
      await requireAdmin();
      const identity = await getServerIdentity();
      if (identity.store_id !== null && identity.store_id !== undefined) {
        assertStoreAccess(identity, OWNER_ROLES, identity.store_id);
      }

      const db = getServerClient();

      // Busca a versão histórica de destino
      const { data: histVersion, error: fetchErr } = await db
        .from("ai_master_prompt_versions")
        .select("*")
        .eq("prompt_id", input.promptId)
        .eq("version", input.targetVersion)
        .single();

      if (fetchErr || histVersion === null || histVersion === undefined) {
        throw new Error(`Versão ${input.targetVersion} não encontrada no histórico.`);
      }

      // Restaura na tabela principal
      const { data: updated, error: updateErr } = await db
        .from("ai_master_prompts")
        .update({
          version: histVersion.version,
          system_instruction: histVersion.system_instruction,
          prompt_template: histVersion.prompt_template,
          variables_schema: histVersion.variables_schema,
          target_provider: histVersion.target_provider,
          target_model: histVersion.target_model,
          temperature: histVersion.temperature,
          max_tokens: histVersion.max_tokens,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.promptId)
        .select()
        .single();

      if (updateErr) throw updateErr;

      // Invalida cache de memória
      promptMemoryCache.clear();

      return {
        status: "ok" as const,
        prompt: updated,
      };
    } catch (e: unknown) {
      if (e instanceof SupabaseUnconfiguredError) throw e;
      console.error("[ai-master-prompts.functions] rollback error:", e);
      throw new Error((e instanceof Error ? e.message : String(e)) || "Erro ao reverter versão do prompt.");
    }
  });
