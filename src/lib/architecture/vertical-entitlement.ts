/**
 * @fileoverview GOVERNANÇA ESTRITA DE ISOLAMENTO DE PLANOS POR VERTICAL (Zero-Trust)
 *
 * Regra de Ouro:
 * - Admin Master / Loja Raiz -> acesso irrestrito.
 * - Plano Waesy Pro All-in-One (`waesy_bundle_pro` ou `enterprise`, ou `pro` sem trava de vertical única)
 *   -> acesso a TODAS as verticais e portais.
 * - Plano Vertical Específico (ex: apenas Turismo, apenas Talk, apenas Copilot, apenas Wider, etc.)
 *   -> acesso restrito à sua própria vertical e módulos core universais (`/workspace`, `/workspace/tarefas`, `/workspace/configuracoes`, `/workspace/assinatura`).
 *   -> bloqueado ao tentar acessar outro portal (subdomínio) ou rota de outra vertical.
 */

import { resolveSubsystemFromHost } from "@/lib/vertical-subsystems";

export type VerticalAccessScope =
  | "all"
  | "pro"
  | "tourism"
  | "talk"
  | "copilot"
  | "gastronomy"
  | "events"
  | "legal"
  | "jobs"
  | "real_estate"
  | "retail"
  | "services"
  | "automotive"
  | "news"
  | "omnipage"
  | "signflow";

export interface VerticalAccessCheckResult {
  allowed: boolean;
  requiresProUpgrade: boolean;
  storeScope: VerticalAccessScope;
  targetVertical: VerticalAccessScope;
  storePlanLabel: string;
  targetLabel: string;
  reason?: string;
}

const VERTICAL_LABELS: Record<VerticalAccessScope, string> = {
  all: "Waesy Pro (All-in-One)",
  pro: "Waesy Pro (All-in-One)",
  tourism: "Waesy Turis (Turismo)",
  talk: "Waesy Talk (Atendimento & CRM)",
  copilot: "Waesy Copilot (IA Autônoma)",
  gastronomy: "Waesy Wider (Gastronomia)",
  events: "Waesy Eventio (Eventos)",
  legal: "Waesy Juris (Jurídico)",
  jobs: "Waesy TalentLink (Empregos)",
  real_estate: "Waesy Imóveis",
  retail: "Waesy Varejo & Loja",
  services: "Waesy WowBook (Serviços)",
  automotive: "Waesy Oficinas & Auto",
  news: "Waesy Notícias",
  omnipage: "Waesy OmniPage",
  signflow: "Waesy SignFlow (Contratos)",
};

const BRAND_OR_SUBSYSTEM_TO_SCOPE: Record<string, VerticalAccessScope> = {
  pro: "all",
  waesy: "all",
  waesy_studio: "all",
  waesy_bundle_pro: "all",
  turis: "tourism",
  tourism: "tourism",
  waesy_tourism_pro: "tourism",
  talk: "talk",
  atendimento: "talk",
  chat: "talk",
  waesy_talk: "talk",
  copilot: "copilot",
  waesy_copilot: "copilot",
  ia: "copilot",
  wider: "gastronomy",
  tableway: "gastronomy",
  gastronomy: "gastronomy",
  gastronomia: "gastronomy",
  waesy_gastro_delivery: "gastronomy",
  eventio: "events",
  passhub: "events",
  events: "events",
  eventos: "events",
  juris: "legal",
  lexcloud: "legal",
  legal: "legal",
  juridico: "legal",
  waesy_legal_office: "legal",
  talentlink: "jobs",
  jobs: "jobs",
  empregos: "jobs",
  imoveis: "real_estate",
  real_estate: "real_estate",
  waesy_real_estate: "real_estate",
  wowbook: "services",
  services: "services",
  servicos: "services",
  waesy_salon_beauty: "services",
  waesy_barbershop: "services",
  waesy_health_clinic: "services",
  oficinas: "automotive",
  autocenter: "automotive",
  automotive: "automotive",
  waesy_automotive_workshop: "automotive",
  store: "retail",
  retail: "retail",
  mercado: "retail",
  waesy_retail_commerce: "retail",
  noticias: "news",
  waesy_news: "news",
  news: "news",
  omnipage: "omnipage",
  signflow: "signflow",
};

/** Resolve o escopo vertical efetivo do plano da empresa. */
export function resolveStorePlanScope(store: Record<string, any> | null | undefined): {
  scope: VerticalAccessScope;
  hasAllAccess: boolean;
  label: string;
} {
  if (!store) {
    return { scope: "retail", hasAllAccess: false, label: "Sem Plano Ativo" };
  }
  const raw = (store as any).store || store;
  const settings = raw.settings || {};

  if (raw.is_platform_root === true) {
    return { scope: "all", hasAllAccess: true, label: VERTICAL_LABELS.all };
  }

  const tier = String(
    raw.subscription_tier || raw.plan_tier || settings.subscription_tier || settings.plan_tier || "",
  )
    .trim()
    .toLowerCase();
  const sku = String(raw.vertical_sku || settings.vertical_sku || "")
    .trim()
    .toLowerCase();
  const brand = String(raw.brand_origin || settings.brand_origin || "")
    .trim()
    .toLowerCase();
  const niche = String(raw.niche || raw.primary_niche || settings.niche || "")
    .trim()
    .toLowerCase();

  // Somente plano Enterprise, SKU All-in-One (waesy_bundle_pro) ou Pro da vertical raiz/studio libera tudo
  const isDedicatedVerticalBrand = Boolean(
    brand && brand !== "waesy" && brand !== "waesy_studio" && brand !== "pro",
  );

  if (
    tier === "enterprise" ||
    tier === "waesy_max" ||
    sku === "waesy_bundle_pro" ||
    brand === "waesy_studio" ||
    brand === "pro" ||
    ((tier === "pro" || tier === "professional") && !isDedicatedVerticalBrand)
  ) {
    return { scope: "all", hasAllAccess: true, label: VERTICAL_LABELS.pro };
  }

  // Caso contrário, resolve estritamente pela marca/SKU/nicho contratado
  const resolved =
    BRAND_OR_SUBSYSTEM_TO_SCOPE[sku] ||
    BRAND_OR_SUBSYSTEM_TO_SCOPE[brand] ||
    BRAND_OR_SUBSYSTEM_TO_SCOPE[niche] ||
    "retail";

  return {
    scope: resolved,
    hasAllAccess: resolved === "all",
    label: VERTICAL_LABELS[resolved] || "Plano Vertical",
  };
}

/** Mapeia uma rota de workspace/copilot para a vertical exigida (ou null se for rota core universal). */
export function resolveTargetVerticalFromPath(pathname: string): VerticalAccessScope | null {
  const p = String(pathname || "").toLowerCase();
  if (!p) return null;

  // Rotas core universais disponíveis em qualquer plano de empresa
  if (
    p === "/workspace" ||
    p === "/workspace/" ||
    p.startsWith("/workspace/tarefas") ||
    p.startsWith("/workspace/configuracoes") ||
    p.startsWith("/workspace/assinatura") ||
    p.startsWith("/workspace/faturamento") ||
    p.startsWith("/workspace/notificacoes") ||
    p.startsWith("/workspace/onboarding") ||
    p.startsWith("/workspace/suporte")
  ) {
    return null;
  }

  if (p.startsWith("/workspace/turismo")) return "tourism";
  if (p.startsWith("/workspace/atendimento") || p.startsWith("/workspace/whatsapp") || p === "/workspace/crm") {
    return "talk";
  }
  if (p === "/copilot" || p.startsWith("/copilot/") || p.startsWith("/workspace/copilot") || p.startsWith("/workspace/squads") || p.startsWith("/workspace/skills")) {
    return "copilot";
  }
  if (p.startsWith("/workspace/gastronomia") || p.startsWith("/workspace/cozinha") || p.startsWith("/workspace/mesas")) {
    return "gastronomy";
  }
  if (p.startsWith("/workspace/eventos")) return "events";
  if (p.startsWith("/workspace/advocacia")) return "legal";
  if (p.startsWith("/workspace/empregos")) return "jobs";
  if (p.startsWith("/workspace/imoveis")) return "real_estate";
  if (p.startsWith("/workspace/oficina") || p.startsWith("/workspace/veiculos")) return "automotive";
  if (p.startsWith("/workspace/agenda")) return "services";
  if (p.startsWith("/workspace/pdv") || p.startsWith("/workspace/catalogo") || p.startsWith("/workspace/estoque") || p.startsWith("/workspace/pedidos")) {
    return "retail";
  }

  return null;
}

/**
 * Avalia se a loja tem direito de operar no alvo informado (host/subdomínio ou rota).
 * Admin Master tem acesso total.
 */
export function checkStoreVerticalAccess(
  store: Record<string, any> | null | undefined,
  opts: {
    host?: string | null;
    pathname?: string | null;
    targetSubsystemId?: string | null;
    isPlatformAdmin?: boolean;
  },
): VerticalAccessCheckResult {
  if (opts.isPlatformAdmin) {
    return {
      allowed: true,
      requiresProUpgrade: false,
      storeScope: "all",
      targetVertical: "all",
      storePlanLabel: "Admin Master",
      targetLabel: "Acesso Master",
    };
  }

  const plan = resolveStorePlanScope(store);

  // Determina a vertical exigida pelo host OU pelo caminho
  let targetVertical: VerticalAccessScope | null = null;
  if (opts.targetSubsystemId) {
    targetVertical = BRAND_OR_SUBSYSTEM_TO_SCOPE[opts.targetSubsystemId.toLowerCase()] || null;
  }
  if (!targetVertical && opts.host) {
    const sub = resolveSubsystemFromHost(opts.host);
    if (sub && sub.id !== "waesy" && (sub.category === "vertical_workspace" || sub.category === "saas_brand")) {
      targetVertical = BRAND_OR_SUBSYSTEM_TO_SCOPE[sub.id.toLowerCase()] || null;
    }
  }
  if (!targetVertical && opts.pathname) {
    targetVertical = resolveTargetVerticalFromPath(opts.pathname);
  }

  if (!targetVertical || targetVertical === "all") {
    return {
      allowed: true,
      requiresProUpgrade: false,
      storeScope: plan.scope,
      targetVertical: targetVertical || "all",
      storePlanLabel: plan.label,
      targetLabel: VERTICAL_LABELS[targetVertical || "all"],
    };
  }

  // Waesy Pro (All-in-One) acessa qualquer vertical
  if (plan.hasAllAccess) {
    return {
      allowed: true,
      requiresProUpgrade: false,
      storeScope: plan.scope,
      targetVertical,
      storePlanLabel: plan.label,
      targetLabel: VERTICAL_LABELS[targetVertical],
    };
  }

  // Compatibilidade intra-domínio: Gastronomia (Wider) opera cardápio/pedidos/PDV além de KDS/Mesas.
  const COMPATIBLE_VERTICALS: Partial<Record<VerticalAccessScope, VerticalAccessScope[]>> = {
    gastronomy: ["gastronomy", "retail"],
  };
  const allowedTargets = COMPATIBLE_VERTICALS[plan.scope] || [plan.scope];
  const allowed = allowedTargets.includes(targetVertical);
  const targetLabel = VERTICAL_LABELS[targetVertical] || targetVertical;

  return {
    allowed,
    requiresProUpgrade: !allowed,
    storeScope: plan.scope,
    targetVertical,
    storePlanLabel: plan.label,
    targetLabel,
    reason: allowed
      ? undefined
      : `Sua empresa possui plano ativo apenas para ${plan.label}. Para operar no ${targetLabel}, ative esta vertical ou faça upgrade para o Waesy Pro.`,
  };
}
