/**
 * @fileoverview GOVERNANÇA CANÔNICA DE PLANOS E MÓDULOS POR VERTICAL
 *
 * Define a matriz multi-tenant para cobrança e ativação modular do ecossistema Waesy:
 * - 7 Verticais de Negócio Independentes
 * - 6 Módulos Adicionais Contratáveis (Add-ons)
 * - 4 Tiers de Licenciamento (Free, Starter, Professional, Enterprise)
 * - Barreira Zero-Trust de acesso por loja e tenant
 */

import { CanonicalVerticalId } from "./vertical-manifest";

export type StorePlanTier = "free" | "starter" | "professional" | "enterprise";

export type CommercialModuleId =
  | "module_omnichannel_whatsapp"
  | "module_ai_copilot_voice"
  | "module_financial_erp"
  | "module_tourism_studio"
  | "module_food_delivery"
  | "module_ads_booster";

export interface CommercialModuleDefinition {
  id: CommercialModuleId;
  name: string;
  tagline: string;
  description: string;
  category: "omnichannel" | "ai" | "finance" | "vertical_studio" | "marketing";
  monthlyPriceCents: number;
  applicableVerticals: CanonicalVerticalId[] | "all";
  includedInTiers: StorePlanTier[];
  features: string[];
}

export interface StorePlanDefinition {
  tier: StorePlanTier;
  name: string;
  monthlyPriceCents: number;
  maxStaffUsers: number;
  maxWhatsAppInstances: number;
  includedModules: CommercialModuleId[];
  includedVerticalsCount: number;
  allowsCustomDomain: boolean;
  prioritySupport: boolean;
}

export const COMMERCIAL_MODULE_CATALOG: Record<CommercialModuleId, CommercialModuleDefinition> = {
  module_omnichannel_whatsapp: {
    id: "module_omnichannel_whatsapp",
    name: "Central Omnichannel WhatsApp",
    tagline: "Atendimento unificado com múltiplas instâncias e roteamento por setor",
    description: "Conecte múltiplos números WhatsApp na mesma caixa de entrada com filas departamentais e permissões restritas para equipe.",
    category: "omnichannel",
    monthlyPriceCents: 9900, // R$ 99,00/mês
    applicableVerticals: "all",
    includedInTiers: ["starter", "professional", "enterprise"],
    features: [
      "Instâncias ilimitadas de WhatsApp (Evolution API / Cloud)",
      "Setores e filas de atendimento com isolamento de acesso",
      "Histórico persistente e notas internas protegidas para gerentes",
      "Solicitações de exclusão de contato com fluxo de aprovação",
    ],
  },

  module_ai_copilot_voice: {
    id: "module_ai_copilot_voice",
    name: "Copilot IA & Estúdio de Voz PTT",
    tagline: "Respostas inteligentes com contexto 360 do cliente e áudios nativos",
    description: "Acelere as vendas com IA que lê o histórico de compras, cotações pendentes e regras de negócio, gerando respostas diretas e notas de voz ouvidas antes do envio.",
    category: "ai",
    monthlyPriceCents: 14900, // R$ 149,00/mês
    applicableVerticals: "all",
    includedInTiers: ["professional", "enterprise"],
    features: [
      "Escrever com IA lendo o perfil 360 do cliente e cotações",
      "Gerador de Nota de Voz IA com prévia antes do despacho no WhatsApp",
      "Detecção automática de promessas esquecidas (Anti-esquecimento)",
      "Transcrição sob demanda de áudios recebidos (Whisper)",
    ],
  },

  module_financial_erp: {
    id: "module_financial_erp",
    name: "ERP Financeiro & Gestão de Inadimplência",
    tagline: "Fechamento de caixa, conciliação Pix e cobrança por CPF",
    description: "Controle financeiro rigoroso com divisão de receitas, split Pix e barreira Zero-Trust de cobrança para clientes inadimplentes.",
    category: "finance",
    monthlyPriceCents: 8900, // R$ 89,00/mês
    applicableVerticals: "all",
    includedInTiers: ["professional", "enterprise"],
    features: [
      "Gestão de livro-caixa e comissões por colaborador",
      "Registro de inadimplência vinculado ao CPF em customer_debt_ledger",
      "Geração de chaves Pix dinâmicas com conciliação instantânea",
      "Relatórios de fechamento diário e DRE operacional",
    ],
  },

  module_tourism_studio: {
    id: "module_tourism_studio",
    name: "Studio Visual de Viagens & Pacotes ANAC",
    tagline: "Criação de itinerários interativos, propostas e bilhética",
    description: "Módulo especializado para agências de turismo emitirem propostas digitais interativas, roteiros dia a dia e vouchers homologados.",
    category: "vertical_studio",
    monthlyPriceCents: 12900, // R$ 129,00/mês
    applicableVerticals: ["tourism"],
    includedInTiers: ["professional", "enterprise"],
    features: [
      "Gerador visual de itinerários dia a dia e pontos turísticos",
      "Base normativa ANAC Resolução 400 (reembolso, bagagem e no-show)",
      "Propostas interativas com aprovação e pagamento em 1 clique",
      "Emissão automática de voucher Cadastur/Embratur",
    ],
  },

  module_food_delivery: {
    id: "module_food_delivery",
    name: "Cardápio Digital & Despacho Delivery",
    tagline: "Gestão de cozinha KDS, comandas e integração com motoboys",
    description: "Módulo gastronômico completo com cardápio 1:1, pedidos em tempo real e despacho direto para entregadores Waesy Go.",
    category: "vertical_studio",
    monthlyPriceCents: 7900, // R$ 79,00/mês
    applicableVerticals: ["market_perishables", "retail"],
    includedInTiers: ["starter", "professional", "enterprise"],
    features: [
      "Cardápio responsivo com fotos, adicionais e observações",
      "Fila KDS em tempo real para produção na cozinha",
      "Impressão térmica de comandas",
      "Chamada de motorista/motoboy via Waesy Go a R$ 0,99 taxa fixa",
    ],
  },

  module_ads_booster: {
    id: "module_ads_booster",
    name: "Booster de Anúncios & Tráfego Local",
    tagline: "Campanhas geolocalizadas na rede Waesy e vitrines públicas",
    description: "Impulsione produtos, serviços e pacotes diretamente no feed de descoberta da comunidade com medição de ROI em tempo real.",
    category: "marketing",
    monthlyPriceCents: 5900, // R$ 59,00/mês
    applicableVerticals: "all",
    includedInTiers: ["enterprise"],
    features: [
      "Destaque prioritário nas hotpages e superfícies da cidade",
      "Segmentação por raio de quilometragem e nicho de consumo",
      "Desconto progressivo por volume de orçamento",
      "Painel de métricas com impressões, cliques e conversões WhatsApp",
    ],
  },
};

export const STORE_PLANS: Record<StorePlanTier, StorePlanDefinition> = {
  free: {
    tier: "free",
    name: "Gratuito",
    monthlyPriceCents: 0,
    maxStaffUsers: 1,
    maxWhatsAppInstances: 1,
    includedModules: [],
    includedVerticalsCount: 1,
    allowsCustomDomain: false,
    prioritySupport: false,
  },
  starter: {
    tier: "starter",
    name: "Starter",
    monthlyPriceCents: 9900,
    maxStaffUsers: 3,
    maxWhatsAppInstances: 2,
    includedModules: ["module_omnichannel_whatsapp"],
    includedVerticalsCount: 1,
    allowsCustomDomain: false,
    prioritySupport: false,
  },
  professional: {
    tier: "professional",
    name: "Professional",
    monthlyPriceCents: 24900,
    maxStaffUsers: 10,
    maxWhatsAppInstances: 5,
    includedModules: [
      "module_omnichannel_whatsapp",
      "module_ai_copilot_voice",
      "module_financial_erp",
      "module_tourism_studio",
    ],
    includedVerticalsCount: 2,
    allowsCustomDomain: true,
    prioritySupport: true,
  },
  enterprise: {
    tier: "enterprise",
    name: "Enterprise",
    monthlyPriceCents: 59900,
    maxStaffUsers: 999,
    maxWhatsAppInstances: 50,
    includedModules: [
      "module_omnichannel_whatsapp",
      "module_ai_copilot_voice",
      "module_financial_erp",
      "module_tourism_studio",
      "module_food_delivery",
      "module_ads_booster",
    ],
    includedVerticalsCount: 7,
    allowsCustomDomain: true,
    prioritySupport: true,
  },
};

/**
 * Verifica se um módulo específico está ativo para a loja informada,
 * considerando tanto os módulos incluídos no tier quanto add-ons avulsos contratados.
 */
export function isStoreModuleActive(
  store: { plan_tier?: string | null; settings?: Record<string, any> | null } | null | undefined,
  moduleId: CommercialModuleId
): boolean {
  if (!store) return false;

  const rawTier = (store.plan_tier || store.settings?.plan_tier || "free").toLowerCase() as StorePlanTier;
  const currentPlan = STORE_PLANS[rawTier] || STORE_PLANS.free;

  // 1. Módulo incluso no plano contratado
  if (currentPlan.includedModules.includes(moduleId)) {
    return true;
  }

  // 2. Módulo ativado como add-on avulso em settings.active_modules
  const activeModules: string[] = store.settings?.active_modules || [];
  if (activeModules.includes(moduleId)) {
    return true;
  }

  // 3. Fallback permissivo para desenvolvimento local / superadmin
  if (store.settings?.is_platform_demo || store.settings?.all_modules_enabled) {
    return true;
  }

  return false;
}

/**
 * Validação rigorosa de acesso a módulo (lança erro se o módulo não estiver contratado)
 */
export function assertStoreModuleAccess(
  store: { name?: string; plan_tier?: string | null; settings?: Record<string, any> | null } | null | undefined,
  moduleId: CommercialModuleId
): void {
  if (!isStoreModuleActive(store, moduleId)) {
    const modDef = COMMERCIAL_MODULE_CATALOG[moduleId];
    const modName = modDef?.name || moduleId;
    throw new Error(
      `O módulo "${modName}" não está ativo no plano da sua loja. Acesse Configurações > Planos para contratá-lo.`
    );
  }
}
