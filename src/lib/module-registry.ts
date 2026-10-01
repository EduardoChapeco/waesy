/**
 * module-registry.ts — Registro Universal de Módulos e Feature Flags (P31)
 *
 * Controla os módulos operacionais de cada organização/loja, suas rotas vinculadas,
 * permissões mínimas, dependências entre módulos e regras de ativação por nicho.
 *
 * Invariantes: M01, M08, M09 | Checks: C26, C40 | Prompt: P31
 */

import { NicheId, NicheModuleKey, NICHE_MANIFEST_REGISTRY, getNicheManifest } from "@/lib/niche-manifest";

export interface ModuleDefinition {
  id: NicheModuleKey;
  label: string;
  description: string;
  category: "operations" | "commercial" | "field" | "backoffice" | "growth";
  routes: string[];
  permissions: string[];
  dependencies: NicheModuleKey[];
  defaultEnabledNiches: NicheId[];
}

export const MODULE_REGISTRY: Record<NicheModuleKey, ModuleDefinition> = {
  catalog: {
    id: "catalog",
    label: "Catálogo de Produtos & Serviços",
    description: "Gestão de itens, variações, precificação, complementos e disponibilidade.",
    category: "operations",
    routes: [
      "/workspace/catalogo",
      "/workspace/catalogo/produtos",
      "/workspace/catalogo/categorias",
      "/workspace/catalogo/modificadores",
    ],
    permissions: ["owner", "admin", "manager", "seller"],
    dependencies: [],
    defaultEnabledNiches: [
      "generic",
      "gastronomy",
      "retail",
      "services",
      "tourism",
      "automotive",
      "healthcare",
      "real_estate",
      "events",
      "creator",
    ],
  },
  orders: {
    id: "orders",
    label: "Gestão de Pedidos e Vendas",
    description: "Recepção, faturamento, despacho e ciclo de vida de pedidos.",
    category: "operations",
    routes: ["/workspace/pedidos", "/workspace/vendas", "/workspace/pdv"],
    permissions: ["owner", "admin", "manager", "seller"],
    dependencies: ["catalog"],
    defaultEnabledNiches: ["generic", "gastronomy", "retail", "services", "creator"],
  },
  kds: {
    id: "kds",
    label: "Painel de Produção & Cozinha (KDS)",
    description: "Fila de preparo em tempo real para bares, restaurantes e confeitarias.",
    category: "field",
    routes: ["/workspace/kds", "/workspace/cozinha"],
    permissions: ["owner", "admin", "manager", "stock"],
    dependencies: ["orders"],
    defaultEnabledNiches: ["gastronomy"],
  },
  tables: {
    id: "tables",
    label: "Mapa de Mesas & Comandas",
    description: "Controle de salão, ocupação e consumo presencial.",
    category: "operations",
    routes: ["/workspace/mesas", "/workspace/comandas"],
    permissions: ["owner", "admin", "manager", "seller"],
    dependencies: ["orders"],
    defaultEnabledNiches: ["gastronomy"],
  },
  reservations: {
    id: "reservations",
    label: "Reservas & Agendamentos",
    description: "Controle de capacidade, agenda de horários e confirmação antecipada.",
    category: "commercial",
    routes: ["/workspace/reservas", "/workspace/agenda", "/workspace/turismo/reservas"],
    permissions: ["owner", "admin", "manager", "seller"],
    dependencies: [],
    defaultEnabledNiches: ["tourism", "gastronomy", "services", "healthcare", "events"],
  },
  crm: {
    id: "crm",
    label: "CRM & Funil de Oportunidades",
    description: "Gestão de contatos, pipeline de vendas, tarefas e histórico de interações.",
    category: "commercial",
    routes: ["/workspace/crm", "/workspace/leads", "/workspace/clientes"],
    permissions: ["owner", "admin", "manager", "seller"],
    dependencies: [],
    defaultEnabledNiches: [
      "generic",
      "tourism",
      "services",
      "real_estate",
      "automotive",
      "events",
      "creator",
    ],
  },
  proposals: {
    id: "proposals",
    label: "Gerador de Propostas Comerciais",
    description: "Criação, versionamento, visualização pública e aceite de propostas.",
    category: "commercial",
    routes: ["/workspace/turismo/propostas", "/workspace/orcamentos"],
    permissions: ["owner", "admin", "manager", "seller"],
    dependencies: ["crm"],
    defaultEnabledNiches: ["tourism", "services", "real_estate", "automotive", "events", "creator"],
  },
  quotes: {
    id: "quotes",
    label: "Motor de Cotações Rápidas",
    description: "Simulação de itinerários, pacotes, passagens e orçamentos dinâmicos.",
    category: "commercial",
    routes: ["/workspace/turismo/cotacoes"],
    permissions: ["owner", "admin", "manager", "seller"],
    dependencies: [],
    defaultEnabledNiches: ["tourism", "services"],
  },
  boarding: {
    id: "boarding",
    label: "Radar de Embarques e Logística",
    description: "Gestão de passageiros, rooming list, listas de presença e despachos no dia da viagem.",
    category: "field",
    routes: ["/workspace/turismo/embarques", "/workspace/turismo/radar"],
    permissions: ["owner", "admin", "manager"],
    dependencies: ["reservations"],
    defaultEnabledNiches: ["tourism", "events"],
  },
  fleet: {
    id: "fleet",
    label: "Frota & Transportes",
    description: "Veículos, ônibus, vans, motoristas, manutenções e rotas.",
    category: "field",
    routes: ["/workspace/turismo/frota"],
    permissions: ["owner", "admin", "manager"],
    dependencies: [],
    defaultEnabledNiches: ["tourism", "automotive"],
  },
  contracts: {
    id: "contracts",
    label: "Contratos & Assinaturas Digitais",
    description: "Criação, envio, rastreio e custódia segura de termos legais e contratos.",
    category: "backoffice",
    routes: ["/workspace/contratos", "/workspace/turismo/contratos"],
    permissions: ["owner", "admin", "manager", "finance"],
    dependencies: [],
    defaultEnabledNiches: [
      "tourism",
      "real_estate",
      "services",
      "events",
      "creator",
      "automotive",
    ],
  },
  financial: {
    id: "financial",
    label: "Financeiro & Contas Correntes",
    description: "Fluxo de caixa, contas a pagar e receber, conciliação e DRE.",
    category: "backoffice",
    routes: [
      "/workspace/financeiro",
      "/workspace/financeiro/caixa",
      "/workspace/financeiro/contas-pagar",
      "/workspace/financeiro/contas-receber",
    ],
    permissions: ["owner", "admin", "finance"],
    dependencies: [],
    defaultEnabledNiches: [
      "generic",
      "gastronomy",
      "retail",
      "services",
      "tourism",
      "real_estate",
      "healthcare",
      "automotive",
      "events",
      "creator",
    ],
  },
  tasks: {
    id: "tasks",
    label: "Tarefas & Gestão de Projetos",
    description: "Kanban, prazos, delegação interna e checklist operacional de equipes.",
    category: "backoffice",
    routes: ["/workspace/tarefas", "/workspace/projetos"],
    permissions: ["owner", "admin", "manager", "seller", "finance", "stock"],
    dependencies: [],
    defaultEnabledNiches: [
      "generic",
      "gastronomy",
      "retail",
      "services",
      "tourism",
      "real_estate",
      "healthcare",
      "automotive",
      "events",
      "creator",
    ],
  },
  support: {
    id: "support",
    label: "Atendimento & Tickets de Suporte",
    description: "Helpdesk, pós-venda, dúvidas de clientes e resolução de incidentes.",
    category: "commercial",
    routes: ["/workspace/suporte", "/workspace/atendimento"],
    permissions: ["owner", "admin", "manager", "support"],
    dependencies: [],
    defaultEnabledNiches: [
      "generic",
      "gastronomy",
      "retail",
      "services",
      "tourism",
      "real_estate",
      "healthcare",
      "automotive",
      "events",
      "creator",
    ],
  },
  inventory: {
    id: "inventory",
    label: "Estoque & Insumos",
    description: "Controle de saldo, movimentações, entradas por nota fiscal e alertas de baixa.",
    category: "operations",
    routes: ["/workspace/estoque"],
    permissions: ["owner", "admin", "manager", "stock"],
    dependencies: ["catalog"],
    defaultEnabledNiches: ["retail", "gastronomy", "automotive", "healthcare"],
  },
  marketing: {
    id: "marketing",
    label: "Marketing & Campanhas",
    description: "Cupons, fidelidade, automação de mensagens e campanhas sociais.",
    category: "growth",
    routes: [
      "/workspace/marketing",
      "/workspace/marketing/fidelidade",
      "/workspace/marketing/social",
      "/workspace/marketing/carrinhos",
    ],
    permissions: ["owner", "admin", "manager"],
    dependencies: [],
    defaultEnabledNiches: ["generic", "retail", "gastronomy", "services", "tourism", "creator"],
  },
  affiliates: {
    id: "affiliates",
    label: "Programa de Afiliados & Comissionamento",
    description: "Rede de parceiros, comissões por venda e links rastreados.",
    category: "growth",
    routes: ["/workspace/marketing/patrocinadores", "/workspace/afiliados"],
    permissions: ["owner", "admin"],
    dependencies: ["financial"],
    defaultEnabledNiches: ["tourism", "retail", "events", "creator"],
  },
  couriers: {
    id: "couriers",
    label: "Logística & Entregadores (MotoLink)",
    description: "Despacho de motoboys, rastreamento de entregas e cálculo de taxa de entrega.",
    category: "field",
    routes: ["/workspace/entregas", "/workspace/logistica"],
    permissions: ["owner", "admin", "manager"],
    dependencies: ["orders"],
    defaultEnabledNiches: ["gastronomy", "retail"],
  },
  simlab: {
    id: "simlab",
    label: "SimLab & Validação de Produtos por IA",
    description: "Simulação sintética de personas e testes de aceitação de mercado com LLM.",
    category: "growth",
    routes: ["/workspace/simlab/focus-group", "/workspace/squads"],
    permissions: ["owner", "admin"],
    dependencies: [],
    defaultEnabledNiches: [
      "generic",
      "tourism",
      "gastronomy",
      "retail",
      "services",
      "creator",
    ],
  },
};

/**
 * Resolve os módulos habilitados para uma loja considerando:
 * 1. O nicho base da loja (definido no manifesto)
 * 2. Overrides explícitos salvos em `store.settings.active_modules`
 * 3. Overrides explícitos desligados em `store.settings.disabled_modules`
 */
export function getActiveModulesForStore(
  nicheId: NicheId,
  storeSettings?: Record<string, any>
): NicheModuleKey[] {
  const manifest = getNicheManifest(nicheId);
  const baseModules = new Set<NicheModuleKey>(manifest.activeModules);

  // Overrides de ativação manual
  if (Array.isArray(storeSettings?.active_modules)) {
    storeSettings.active_modules.forEach((mod: string) => {
      if (mod in MODULE_REGISTRY) {
        baseModules.add(mod as NicheModuleKey);
      }
    });
  }

  // Overrides de desativação manual
  if (Array.isArray(storeSettings?.disabled_modules)) {
    storeSettings.disabled_modules.forEach((mod: string) => {
      baseModules.delete(mod as NicheModuleKey);
    });
  }

  return Array.from(baseModules);
}

/**
 * Verifica se um módulo específico está ativo no contexto da loja
 */
export function isModuleEnabled(
  moduleId: NicheModuleKey,
  nicheId: NicheId,
  storeSettings?: Record<string, any>
): boolean {
  const active = getActiveModulesForStore(nicheId, storeSettings);
  return active.includes(moduleId);
}

/**
 * Descobre a qual módulo uma rota específica pertence
 */
export function getModuleForRoute(pathname: string): NicheModuleKey | null {
  for (const [modId, def] of Object.entries(MODULE_REGISTRY)) {
    for (const route of def.routes) {
      if (pathname === route || pathname.startsWith(route + "/")) {
        return modId as NicheModuleKey;
      }
    }
  }
  return null;
}

/**
 * Avalia se o acesso à rota é permitido com base nos módulos ativos da loja
 */
export function canAccessRoute(
  pathname: string,
  nicheId: NicheId,
  storeSettings?: Record<string, any>
): { allowed: boolean; moduleId?: NicheModuleKey; reason?: string } {
  const moduleId = getModuleForRoute(pathname);
  if (!moduleId) {
    // Rotas de sistema/gerais (ex: /workspace, /workspace/perfil, /workspace/configuracoes) são universais
    return { allowed: true };
  }

  const enabled = isModuleEnabled(moduleId, nicheId, storeSettings);
  if (!enabled) {
    const modDef = MODULE_REGISTRY[moduleId];
    return {
      allowed: false,
      moduleId,
      reason: `O módulo "${modDef.label}" está inativo para o nicho atual ou configuração desta loja.`,
    };
  }

  return { allowed: true, moduleId };
}

/**
 * Valida se todas as dependências de uma lista de módulos estão satisfeitas
 */
export function validateModuleDependencies(enabledModules: NicheModuleKey[]): {
  valid: boolean;
  missingDependencies: Record<NicheModuleKey, NicheModuleKey[]>;
} {
  const activeSet = new Set(enabledModules);
  const missing: Record<string, NicheModuleKey[]> = {};
  let valid = true;

  for (const modId of enabledModules) {
    const def = MODULE_REGISTRY[modId];
    if (def?.dependencies && def.dependencies.length > 0) {
      const unfulfilled = def.dependencies.filter((dep) => !activeSet.has(dep));
      if (unfulfilled.length > 0) {
        missing[modId] = unfulfilled;
        valid = false;
      }
    }
  }

  return { valid, missingDependencies: missing as Record<NicheModuleKey, NicheModuleKey[]> };
}
