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
import {
  getUnifiedNicheSpec,
  resolveUnifiedNicheId,
  type UnifiedNicheId,
  type VerticalPlanSkuId,
} from "@/lib/niches/niche-ssot";

export type { UnifiedNicheId, VerticalPlanSkuId };

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

export interface VerticalPlanSkuDefinition {
  sku: VerticalPlanSkuId;
  name: string;
  tagline: string;
  verticalId: CanonicalVerticalId | "gastronomy";
  nicheIds: UnifiedNicheId[];
  baseTier: StorePlanTier;
  monthlyPriceCents: number;
  annualPriceCents: number;
  includedModules: CommercialModuleId[];
  includedCapabilities: string[];
  limits: {
    maxTeamMembers: number;
    maxWhatsappInstances: number;
    maxCatalogItems: number;
    maxMonthlyAiCalls: number;
  };
  isStandalone: boolean;
}

export const VERTICAL_PLAN_CATALOG: Record<VerticalPlanSkuId, VerticalPlanSkuDefinition> = {
  waesy_salon_beauty: {
    sku: "waesy_salon_beauty",
    name: "Waesy Salões & Estética",
    tagline: "Agenda de cadeiras, comandas, fórmulas químicas e repasse Salão-Parceiro.",
    verticalId: "services_specialists",
    nicheIds: ["beauty_salon", "aesthetics_clinic"],
    baseTier: "professional",
    monthlyPriceCents: 11900,
    annualPriceCents: 114000,
    includedModules: ["module_omnichannel_whatsapp", "module_financial_erp"],
    includedCapabilities: ["agenda_services", "crm_customers", "staff_permissions", "financial_ledger", "whatsapp_inbox"],
    limits: { maxTeamMembers: 12, maxWhatsappInstances: 2, maxCatalogItems: 300, maxMonthlyAiCalls: 1500 },
    isStandalone: true,
  },
  waesy_barbershop: {
    sku: "waesy_barbershop",
    name: "Waesy Barbearia Pro",
    tagline: "Agenda por barbeiro, assinaturas de clube de corte, comissões e WhatsApp.",
    verticalId: "services_specialists",
    nicheIds: ["barbershop"],
    baseTier: "starter",
    monthlyPriceCents: 8900,
    annualPriceCents: 85400,
    includedModules: ["module_omnichannel_whatsapp"],
    includedCapabilities: ["agenda_services", "crm_customers", "staff_permissions", "financial_ledger", "whatsapp_inbox"],
    limits: { maxTeamMembers: 6, maxWhatsappInstances: 1, maxCatalogItems: 150, maxMonthlyAiCalls: 600 },
    isStandalone: true,
  },
  waesy_health_clinic: {
    sku: "waesy_health_clinic",
    name: "Waesy Clínicas & Saúde",
    tagline: "Prontuário e anamnese, retorno preventivo, agenda multi-especialidades e IA SDR.",
    verticalId: "services_specialists",
    nicheIds: ["healthcare", "dental", "psychology", "vet_petshop"],
    baseTier: "professional",
    monthlyPriceCents: 16900,
    annualPriceCents: 162200,
    includedModules: ["module_omnichannel_whatsapp", "module_ai_copilot_voice", "module_financial_erp"],
    includedCapabilities: ["agenda_services", "crm_customers", "staff_permissions", "financial_ledger", "whatsapp_inbox", "ai_sdr_autonomous"],
    limits: { maxTeamMembers: 15, maxWhatsappInstances: 3, maxCatalogItems: 500, maxMonthlyAiCalls: 2500 },
    isStandalone: true,
  },
  waesy_gastro_delivery: {
    sku: "waesy_gastro_delivery",
    name: "Waesy Food & Delivery",
    tagline: "Cardápio digital QR, KDS de cozinha, mesas, adicionais e entrega Waesy Go.",
    verticalId: "gastronomy",
    nicheIds: ["gastronomy"],
    baseTier: "professional",
    monthlyPriceCents: 12900,
    annualPriceCents: 123800,
    includedModules: ["module_omnichannel_whatsapp", "module_food_delivery", "module_financial_erp"],
    includedCapabilities: ["storefront_cms", "crm_customers", "staff_permissions", "financial_ledger", "whatsapp_inbox", "delivery_logistics"],
    limits: { maxTeamMembers: 15, maxWhatsappInstances: 2, maxCatalogItems: 500, maxMonthlyAiCalls: 1500 },
    isStandalone: true,
  },
  waesy_automotive_workshop: {
    sku: "waesy_automotive_workshop",
    name: "Waesy Oficinas & Autocenters",
    tagline: "Ordens de Serviço (OS) com placa, chassi, odômetro, checklist e orçamentos.",
    verticalId: "automotive",
    nicheIds: ["automotive"],
    baseTier: "professional",
    monthlyPriceCents: 14900,
    annualPriceCents: 143000,
    includedModules: ["module_omnichannel_whatsapp", "module_financial_erp"],
    includedCapabilities: ["service_orders", "crm_customers", "staff_permissions", "financial_ledger", "whatsapp_inbox"],
    limits: { maxTeamMembers: 12, maxWhatsappInstances: 2, maxCatalogItems: 1000, maxMonthlyAiCalls: 1200 },
    isStandalone: true,
  },
  waesy_tourism_pro: {
    sku: "waesy_tourism_pro",
    name: "Waesy Turismo & Fretamento",
    tagline: "Roteiros multimídia, cotações, rooming list, mapa de poltronas e embarque.",
    verticalId: "tourism",
    nicheIds: ["tourism"],
    baseTier: "enterprise",
    monthlyPriceCents: 24900,
    annualPriceCents: 239000,
    includedModules: ["module_omnichannel_whatsapp", "module_ai_copilot_voice", "module_financial_erp", "module_tourism_studio"],
    includedCapabilities: ["tourism_ops", "storefront_cms", "crm_customers", "staff_permissions", "financial_ledger", "whatsapp_inbox", "ai_sdr_autonomous"],
    limits: { maxTeamMembers: 25, maxWhatsappInstances: 4, maxCatalogItems: 1000, maxMonthlyAiCalls: 5000 },
    isStandalone: true,
  },
  waesy_real_estate: {
    sku: "waesy_real_estate",
    name: "Waesy Imobiliária & Locações",
    tagline: "Catálogo de imóveis venda/locação, qualificação de leads e contratos digitais.",
    verticalId: "real_estate",
    nicheIds: ["real_estate"],
    baseTier: "professional",
    monthlyPriceCents: 15900,
    annualPriceCents: 152600,
    includedModules: ["module_omnichannel_whatsapp", "module_financial_erp"],
    includedCapabilities: ["storefront_cms", "crm_customers", "staff_permissions", "financial_ledger", "whatsapp_inbox"],
    limits: { maxTeamMembers: 15, maxWhatsappInstances: 2, maxCatalogItems: 800, maxMonthlyAiCalls: 2000 },
    isStandalone: true,
  },
  waesy_retail_commerce: {
    sku: "waesy_retail_commerce",
    name: "Waesy Varejo & Mercados",
    tagline: "Grade de variações, seções de mercado/farmácia, PDV e entregas locais.",
    verticalId: "retail",
    nicheIds: ["retail", "market_perishables", "pharmacy"],
    baseTier: "starter",
    monthlyPriceCents: 9900,
    annualPriceCents: 95000,
    includedModules: ["module_omnichannel_whatsapp", "module_food_delivery"],
    includedCapabilities: ["storefront_cms", "crm_customers", "staff_permissions", "financial_ledger", "delivery_logistics"],
    limits: { maxTeamMembers: 10, maxWhatsappInstances: 2, maxCatalogItems: 2000, maxMonthlyAiCalls: 800 },
    isStandalone: true,
  },
  waesy_legal_office: {
    sku: "waesy_legal_office",
    name: "Waesy Escritórios & B2B",
    tagline: "Honorários, clientes corporativos, prazos, ordens e contratos para escritórios.",
    verticalId: "services_specialists",
    nicheIds: ["law_firm", "accounting", "services", "education", "events", "organizations"],
    baseTier: "professional",
    monthlyPriceCents: 14900,
    annualPriceCents: 143000,
    includedModules: ["module_omnichannel_whatsapp", "module_financial_erp"],
    includedCapabilities: ["agenda_services", "service_orders", "crm_customers", "staff_permissions", "financial_ledger", "whatsapp_inbox"],
    limits: { maxTeamMembers: 12, maxWhatsappInstances: 2, maxCatalogItems: 500, maxMonthlyAiCalls: 1800 },
    isStandalone: true,
  },
  waesy_bundle_pro: {
    sku: "waesy_bundle_pro",
    name: "Waesy Ecossistema Full",
    tagline: "Todas as verticais desbloqueadas, múltiplos canais WhatsApp, IA SDR e NFS-e.",
    verticalId: "retail",
    nicheIds: [
      "beauty_salon", "barbershop", "aesthetics_clinic", "healthcare", "dental",
      "psychology", "vet_petshop", "gastronomy", "market_perishables", "pharmacy",
      "automotive", "tourism", "retail", "real_estate", "services", "law_firm",
      "accounting", "education", "events", "organizations",
    ],
    baseTier: "enterprise",
    monthlyPriceCents: 39900,
    annualPriceCents: 383000,
    includedModules: [
      "module_omnichannel_whatsapp",
      "module_ai_copilot_voice",
      "module_financial_erp",
      "module_tourism_studio",
      "module_food_delivery",
      "module_ads_booster",
    ],
    includedCapabilities: [
      "agenda_services", "service_orders", "tourism_ops", "storefront_cms",
      "crm_customers", "staff_permissions", "financial_ledger",
      "whatsapp_inbox", "delivery_logistics", "ai_sdr_autonomous", "nfse_fiscal",
    ],
    limits: { maxTeamMembers: 999, maxWhatsappInstances: 20, maxCatalogItems: 50000, maxMonthlyAiCalls: 25000 },
    isStandalone: false,
  },
};

const TIER_DEFAULT_CATALOG_LIMITS: Record<StorePlanTier, { maxCatalogItems: number; maxMonthlyAiCalls: number }> = {
  free: { maxCatalogItems: 40, maxMonthlyAiCalls: 100 },
  starter: { maxCatalogItems: 250, maxMonthlyAiCalls: 600 },
  professional: { maxCatalogItems: 1000, maxMonthlyAiCalls: 2500 },
  enterprise: { maxCatalogItems: 50000, maxMonthlyAiCalls: 25000 },
};

/**
 * Verifica se um módulo específico está ativo para a loja informada,
 * considerando plano base, SKU vertical standalone e add-ons avulsos contratados.
 */
export function isStoreModuleActive(
  store: StoreGovernanceSubject | null | undefined,
  moduleId: CommercialModuleId
): boolean {
  if (!store) return false;
  if (isStorePlanExempt(store)) return true;

  const rawTier = (store.plan_tier || store.settings?.plan_tier || "free").toLowerCase() as StorePlanTier;
  const currentPlan = STORE_PLANS[rawTier] || STORE_PLANS.free;

  if (currentPlan.includedModules.includes(moduleId)) {
    return true;
  }

  const skuKey = (store.vertical_sku || store.settings?.vertical_sku || "") as VerticalPlanSkuId;
  const skuPlan = skuKey ? VERTICAL_PLAN_CATALOG[skuKey] : undefined;
  if (skuPlan && skuPlan.includedModules.includes(moduleId)) {
    return true;
  }

  const activeModules: string[] = store.settings?.active_modules || [];
  if (activeModules.includes(moduleId)) {
    return true;
  }

  if (Array.isArray(store.enabled_modules) && store.enabled_modules.includes(moduleId)) {
    return true;
  }

  return false;
}

export const STAFF_MEMBER_ROLES = [
  "owner",
  "admin",
  "manager",
  "seller",
  "cashier",
  "finance",
  "content",
  "stock",
  "support",
] as const;

export type StaffMemberRole = (typeof STAFF_MEMBER_ROLES)[number];

export type StoreGovernanceSubject = {
  id?: string | null;
  name?: string | null;
  slug?: string | null;
  is_platform_root?: boolean | null;
  plan_tier?: string | null;
  subscription_tier?: string | null;
  subscription_status?: string | null;
  trial_ends_at?: string | null;
  billing_cycle?: string | null;
  vertical_sku?: string | null;
  primary_niche_id?: string | null;
  enabled_niches?: string[] | null;
  enabled_modules?: string[] | Record<string, boolean> | null;
  quota_overrides?: Record<string, any> | null;
  settings?: Record<string, any> | null;
  segment?: string | null;
  type?: string | null;
  category?: string | null;
  niche?: string | null;
};

/**
 * Identifica se uma loja possui isenção operacional irrestrita (Root, Demo ou Excelência Tour SSOT).
 */
export function isStorePlanExempt(store: StoreGovernanceSubject | null | undefined): boolean {
  if (!store) return false;
  if (store.is_platform_root) return true;
  if (store.subscription_status === "exempt") return true;
  if (store.settings?.is_platform_demo || store.settings?.all_modules_enabled) return true;

  const slug = String(store.slug || "").toLowerCase().trim();
  const normalizedName = String(store.name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return (
    slug === "excelencia-tour-smo" ||
    slug === "excelencia-tour" ||
    slug === "waesy" ||
    normalizedName.includes("excelencia tour")
  );
}

/**
 * Resolve o plano comercial canônico atribuído à loja.
 */
export function resolveStorePlanDefinition(store: StoreGovernanceSubject | null | undefined): StorePlanDefinition {
  if (!store) return STORE_PLANS.free;
  const rawTier = String(store.plan_tier || store.settings?.plan_tier || "free").toLowerCase();
  if (rawTier === "waesy_max") return STORE_PLANS.enterprise;
  if (rawTier === "free_mvp") return STORE_PLANS.free;
  return STORE_PLANS[rawTier as StorePlanTier] || STORE_PLANS.free;
}

export interface ResolvedStoreCapabilities {
  exempt: boolean;
  primaryNicheId: UnifiedNicheId;
  enabledNiches: UnifiedNicheId[];
  verticalSku: VerticalPlanSkuId;
  verticalPlan: VerticalPlanSkuDefinition;
  tier: StorePlanTier;
  subscriptionStatus: "trialing" | "active" | "past_due" | "cancelled" | "exempt";
  isSuspended: boolean;
  activeModules: CommercialModuleId[];
  capabilities: string[];
  limits: {
    maxTeamMembers: number;
    maxWhatsappInstances: number;
    maxCatalogItems: number;
    maxMonthlyAiCalls: number;
  };
}

/**
 * Resolve todas as capacidades operacionais, nichos habilitados, SKU standalone e cotas reais do tenant.
 */
export function resolveStoreWorkspaceCapabilities(
  store: StoreGovernanceSubject | null | undefined
): ResolvedStoreCapabilities {
  const exempt = isStorePlanExempt(store);
  const primaryNicheId = resolveUnifiedNicheId(store || {});
  const nicheSpec = getUnifiedNicheSpec(primaryNicheId);

  const plan = resolveStorePlanDefinition(store);
  const rawSku = (store?.vertical_sku || store?.settings?.vertical_sku || "") as VerticalPlanSkuId;
  const verticalPlan =
    (rawSku && VERTICAL_PLAN_CATALOG[rawSku]) ||
    (exempt || plan.tier === "enterprise"
      ? VERTICAL_PLAN_CATALOG.waesy_bundle_pro
      : VERTICAL_PLAN_CATALOG[nicheSpec.defaultVerticalSku]) ||
    VERTICAL_PLAN_CATALOG.waesy_retail_commerce;

  const rawStatus = String(
    store?.subscription_status || store?.settings?.subscription_status || (exempt ? "exempt" : "active")
  ).toLowerCase();
  const subscriptionStatus = (
    ["trialing", "active", "past_due", "cancelled", "exempt"].includes(rawStatus)
      ? rawStatus
      : "active"
  ) as ResolvedStoreCapabilities["subscriptionStatus"];
  const isSuspended = !exempt && (subscriptionStatus === "past_due" || subscriptionStatus === "cancelled");

  const extraNiches = Array.isArray(store?.enabled_niches) ? store!.enabled_niches : [];
  const enabledNichesSet = new Set<UnifiedNicheId>([primaryNicheId]);
  for (const n of extraNiches) {
    if (typeof n === "string" && n.trim()) {
      enabledNichesSet.add(resolveUnifiedNicheId(n));
    }
  }
  if (verticalPlan.sku === "waesy_bundle_pro" || exempt) {
    for (const n of VERTICAL_PLAN_CATALOG.waesy_bundle_pro.nicheIds) {
      enabledNichesSet.add(n);
    }
  }

  const activeAddons: string[] = Array.isArray(store?.settings?.active_modules)
    ? store!.settings!.active_modules
    : [];
  const enabledModulesArray = Array.isArray(store?.enabled_modules) ? store!.enabled_modules : [];

  const activeModulesSet = new Set<CommercialModuleId>([
    ...plan.includedModules,
    ...verticalPlan.includedModules,
  ]);
  for (const m of [...activeAddons, ...enabledModulesArray]) {
    if (m in COMMERCIAL_MODULE_CATALOG) {
      activeModulesSet.add(m as CommercialModuleId);
    }
  }

  const capSet = new Set<string>(["crm_customers", "staff_permissions", "financial_ledger"]);
  if (rawSku && VERTICAL_PLAN_CATALOG[rawSku]) {
    for (const c of VERTICAL_PLAN_CATALOG[rawSku].includedCapabilities) {
      capSet.add(c);
    }
  } else {
    // Herança contextual natural do nicho principal quando SKU standalone explícito ainda não foi selecionado
    for (const c of verticalPlan.includedCapabilities) {
      capSet.add(c);
    }
  }
  if (nicheSpec.capabilities.hasAgenda) capSet.add("agenda_services");
  if (nicheSpec.capabilities.hasServiceOrders) capSet.add("service_orders");
  if (nicheSpec.capabilities.hasTravelItinerary) capSet.add("tourism_ops");
  if (activeModulesSet.has("module_omnichannel_whatsapp")) capSet.add("whatsapp_inbox");
  if (activeModulesSet.has("module_ai_copilot_voice")) capSet.add("ai_sdr_autonomous");
  if (activeModulesSet.has("module_tourism_studio")) capSet.add("tourism_ops");
  if (activeModulesSet.has("module_food_delivery")) capSet.add("delivery_logistics");
  for (const rawCap of enabledModulesArray) {
    capSet.add(rawCap);
  }
  if (exempt) {
    for (const c of VERTICAL_PLAN_CATALOG.waesy_bundle_pro.includedCapabilities) {
      capSet.add(c);
    }
  }

  const hasCustomSkuOrQuota = Boolean(rawSku && VERTICAL_PLAN_CATALOG[rawSku]) || Boolean(store?.quota_overrides);
  const tierCatalogDefaults = TIER_DEFAULT_CATALOG_LIMITS[plan.tier] || TIER_DEFAULT_CATALOG_LIMITS.starter;
  const overrides = (store?.quota_overrides || {}) as Record<string, any>;

  const pickLimit = (overrideKey: string, skuVal: number, tierVal: number) => {
    const rawOverride = overrides[overrideKey];
    if (typeof rawOverride === "number" && Number.isFinite(rawOverride) && rawOverride >= 0) {
      return rawOverride;
    }
    if (hasCustomSkuOrQuota && rawSku && VERTICAL_PLAN_CATALOG[rawSku]) {
      return skuVal;
    }
    return tierVal;
  };

  return {
    exempt,
    primaryNicheId,
    enabledNiches: Array.from(enabledNichesSet),
    verticalSku: verticalPlan.sku,
    verticalPlan,
    tier: plan.tier,
    subscriptionStatus: exempt ? "exempt" : subscriptionStatus,
    isSuspended,
    activeModules: Array.from(activeModulesSet),
    capabilities: Array.from(capSet),
    limits: {
      maxTeamMembers: exempt ? 999 : pickLimit("maxTeamMembers", verticalPlan.limits.maxTeamMembers, plan.maxStaffUsers),
      maxWhatsappInstances: exempt ? 999 : pickLimit("maxWhatsappInstances", verticalPlan.limits.maxWhatsappInstances, plan.maxWhatsAppInstances),
      maxCatalogItems: exempt ? 999999 : pickLimit("maxCatalogItems", verticalPlan.limits.maxCatalogItems, tierCatalogDefaults.maxCatalogItems),
      maxMonthlyAiCalls: exempt ? 999999 : pickLimit("maxMonthlyAiCalls", verticalPlan.limits.maxMonthlyAiCalls, tierCatalogDefaults.maxMonthlyAiCalls),
    },
  };
}

/**
 * Verifica cota de usuários/membros de equipe permitida pelo plano ou SKU vertical da loja.
 */
export function checkStoreStaffSeatLimit(
  store: StoreGovernanceSubject | null | undefined,
  currentStaffCount: number,
  options?: { isExistingStoreMember?: boolean }
) {
  const plan = resolveStorePlanDefinition(store);
  const resolved = resolveStoreWorkspaceCapabilities(store);
  const maxStaff = resolved.limits.maxTeamMembers;
  const isUnlimited = maxStaff >= 999 || resolved.exempt;
  const allowed = Boolean(options?.isExistingStoreMember) || isUnlimited || currentStaffCount < maxStaff;
  return {
    allowed,
    current: currentStaffCount,
    max: maxStaff,
    isUnlimited,
    planTier: plan.tier,
    planName: store?.vertical_sku ? resolved.verticalPlan.name : plan.name,
  };
}

/**
 * Lança erro explícito caso a loja tente adicionar colaborador além do limite do plano.
 */
export function assertStoreStaffSeatAvailable(
  store: StoreGovernanceSubject | null | undefined,
  currentStaffCount: number,
  options?: { isExistingStoreMember?: boolean }
): void {
  const status = checkStoreStaffSeatLimit(store, currentStaffCount, options);
  if (!status.allowed) {
    throw new Error(
      `Limite de ${status.max} usuário(s) de equipe do plano ${status.planName} atingido (${status.current}/${status.max}). Acesse Configurações > Planos para fazer upgrade.`
    );
  }
}

/**
 * Verifica cota de instâncias WhatsApp permitida pelo plano ou SKU vertical da loja.
 */
export function checkStoreWhatsAppInstanceLimit(
  store: StoreGovernanceSubject | null | undefined,
  currentInstanceCount: number,
  options?: { isUpdatingExistingInstance?: boolean }
) {
  const plan = resolveStorePlanDefinition(store);
  const resolved = resolveStoreWorkspaceCapabilities(store);
  const maxInstances = resolved.limits.maxWhatsappInstances;
  const isUnlimited = maxInstances >= 999 || resolved.exempt;
  const allowed =
    Boolean(options?.isUpdatingExistingInstance) ||
    isUnlimited ||
    currentInstanceCount < maxInstances;

  return {
    allowed,
    current: currentInstanceCount,
    max: maxInstances,
    isUnlimited,
    planTier: plan.tier,
    planName: store?.vertical_sku ? resolved.verticalPlan.name : plan.name,
  };
}

/**
 * Lança erro explícito caso a loja exceda o número de instâncias WhatsApp contratadas.
 */
export function assertStoreWhatsAppInstanceAvailable(
  store: StoreGovernanceSubject | null | undefined,
  currentInstanceCount: number,
  options?: { isUpdatingExistingInstance?: boolean }
): void {
  const status = checkStoreWhatsAppInstanceLimit(store, currentInstanceCount, options);
  if (!status.allowed) {
    throw new Error(
      `Limite de ${status.max} instância(s) WhatsApp do plano ${status.planName} atingido (${status.current}/${status.max}). Acesse Configurações > Planos para ampliar sua cota.`
    );
  }
}

/**
 * Verifica cota de itens de catálogo / serviços da assinatura ativa.
 */
export function checkStoreCatalogQuota(
  store: StoreGovernanceSubject | null | undefined,
  currentCatalogCount: number,
  increment = 1
) {
  const resolved = resolveStoreWorkspaceCapabilities(store);
  const maxItems = resolved.limits.maxCatalogItems;
  const isUnlimited = maxItems >= 50000 || resolved.exempt;
  const allowed =
    !resolved.isSuspended &&
    (isUnlimited || currentCatalogCount + Math.max(increment, 0) <= maxItems);

  return {
    allowed,
    current: currentCatalogCount,
    max: maxItems,
    isUnlimited,
    isSuspended: resolved.isSuspended,
  };
}

/**
 * Calcula o valor mensal consolidado do plano base ou SKU vertical somado aos add-ons extras.
 */
export function calculateStoreMonthlyPlanTotalCents(store: StoreGovernanceSubject | null | undefined): number {
  const plan = resolveStorePlanDefinition(store);
  const rawSku = (store?.vertical_sku || store?.settings?.vertical_sku || "") as VerticalPlanSkuId;
  const skuPlan = rawSku ? VERTICAL_PLAN_CATALOG[rawSku] : undefined;
  const basePriceCents = skuPlan ? skuPlan.monthlyPriceCents : plan.monthlyPriceCents;
  const includedSet = new Set<CommercialModuleId>([
    ...(skuPlan ? skuPlan.includedModules : plan.includedModules),
  ]);

  const activeModules: string[] = Array.isArray(store?.settings?.active_modules)
    ? store!.settings!.active_modules
    : [];
  const addonTotal = activeModules.reduce((acc, modId) => {
    const def = COMMERCIAL_MODULE_CATALOG[modId as CommercialModuleId];
    if (!def || includedSet.has(def.id)) {
      return acc;
    }
    return acc + def.monthlyPriceCents;
  }, 0);
  return basePriceCents + addonTotal;
}

/**
 * Barreira Zero-Trust unificada de assinatura, módulos, capacidades verticais e cotas no BFF.
 */
export function assertStoreEntitlement(
  store: StoreGovernanceSubject | null | undefined,
  requirement: {
    capability?: string;
    moduleId?: CommercialModuleId;
    resourceQuota?: {
      resource: "catalog_items" | "team_members" | "whatsapp_instances" | "ai_calls";
      currentCount: number;
      increment?: number;
    };
  }
): void {
  if (isStorePlanExempt(store)) return;

  const resolved = resolveStoreWorkspaceCapabilities(store);

  if (resolved.isSuspended) {
    throw new Error(
      `Sua assinatura (${resolved.verticalPlan.name}) está com status "${resolved.subscriptionStatus}". Regularize a fatura em Configurações > Planos para continuar operando.`
    );
  }

  if (requirement.moduleId && !isStoreModuleActive(store, requirement.moduleId)) {
    const modDef = COMMERCIAL_MODULE_CATALOG[requirement.moduleId];
    throw new Error(
      `O módulo "${modDef?.name || requirement.moduleId}" não está ativo no seu plano. Acesse Configurações > Planos para contratá-lo.`
    );
  }

  if (requirement.capability && !resolved.capabilities.includes(requirement.capability)) {
    throw new Error(
      `O recurso "${requirement.capability}" não está incluído no pacote "${resolved.verticalPlan.name}". Faça upgrade para Waesy Ecossistema Full ou contrate a vertical correspondente.`
    );
  }

  if (requirement.resourceQuota) {
    const { resource, currentCount, increment = 1 } = requirement.resourceQuota;
    if (resource === "team_members") {
      assertStoreStaffSeatAvailable(store, currentCount);
    } else if (resource === "whatsapp_instances") {
      assertStoreWhatsAppInstanceAvailable(store, currentCount);
    } else if (resource === "catalog_items") {
      const quota = checkStoreCatalogQuota(store, currentCount, increment);
      if (!quota.allowed) {
        throw new Error(
          `Limite de ${quota.max} itens de catálogo do plano ${resolved.verticalPlan.name} atingido (${quota.current}/${quota.max}). Faça upgrade em Configurações > Planos.`
        );
      }
    } else if (resource === "ai_calls") {
      if (currentCount + increment > resolved.limits.maxMonthlyAiCalls) {
        throw new Error(
          `Cota mensal de ${resolved.limits.maxMonthlyAiCalls} atendimentos de IA atingida neste ciclo. Amplie seu plano em Configurações > Planos.`
        );
      }
    }
  }
}

/**
 * Validação rigorosa de acesso a módulo (lança erro se o módulo não estiver contratado)
 */
export function assertStoreModuleAccess(
  store: StoreGovernanceSubject | null | undefined,
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
