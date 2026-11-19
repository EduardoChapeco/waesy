/**
 * Catálogo Canônico de Permissões RBAC Multi-Nicho e Normalização de Cargos.
 * Alinha UI, Navegação, Guarda de Rota, Matriz `workspace_role_permissions` e BFF.
 */

export type CanonicalWorkspaceRole =
  | "owner"
  | "admin"
  | "manager"
  | "finance"
  | "rh"
  | "operations"
  | "seller"
  | "support"
  | "cashier"
  | "stock"
  | "content";

export const WORKSPACE_ROLE_ALIASES: Record<string, CanonicalWorkspaceRole> = {
  owner: "owner",
  store_owner: "owner",
  proprietario: "owner",
  master: "owner",
  platform_admin: "owner",
  admin: "admin",
  manager: "manager",
  gerente: "manager",
  diretor: "manager",
  gestor: "manager",
  finance: "finance",
  financeiro: "finance",
  contador: "finance",
  billing: "finance",
  rh: "rh",
  recruiter: "rh",
  dp: "rh",
  operations: "operations",
  operacional: "operations",
  embarques: "operations",
  seller: "seller",
  vendedor: "seller",
  atendente: "seller",
  agente: "seller",
  consultor: "seller",
  support: "support",
  suporte: "support",
  cashier: "cashier",
  caixa: "cashier",
  stock: "stock",
  stockkeeper: "stock",
  estoquista: "stock",
  kitchen: "operations",
  operator: "operations",
  cozinha: "operations",
  content: "content",
  marketing: "content",
};

export function normalizeWorkspaceRole(rawRole?: string | null): CanonicalWorkspaceRole {
  const key = String(rawRole || "")
    .trim()
    .toLowerCase();
  return WORKSPACE_ROLE_ALIASES[key] || "seller";
}

export function isManagerialRole(rawRole?: string | null): boolean {
  const role = normalizeWorkspaceRole(rawRole);
  return role === "owner" || role === "admin" || role === "manager";
}

export function isFinanceOrManagerRole(rawRole?: string | null): boolean {
  const role = normalizeWorkspaceRole(rawRole);
  return role === "owner" || role === "admin" || role === "manager" || role === "finance";
}

export function isHrOrManagerRole(rawRole?: string | null): boolean {
  const role = normalizeWorkspaceRole(rawRole);
  return role === "owner" || role === "admin" || role === "manager" || role === "rh" || role === "finance";
}

export interface RoleCatalogOption {
  key: CanonicalWorkspaceRole;
  name: string;
}

export function getAvailableRolesForNiche(nicheId?: string | null): RoleCatalogOption[] {
  const isTourism = nicheId === "tourism";
  const base: RoleCatalogOption[] = [
    { key: "manager", name: isTourism ? "Gerente Comercial" : "Gerente / Administrador" },
    { key: "finance", name: "Financeiro / Faturamento" },
    { key: "rh", name: "RH / Departamento Pessoal" },
    { key: "seller", name: isTourism ? "Agente / Consultor de Viagens" : "Vendedor / Comercial" },
    { key: "operations", name: isTourism ? "Operacional / Embarques" : "Operacional / Atendimento" },
    { key: "support", name: "Suporte / Pós-Venda" },
    { key: "content", name: "Marketing e Conteúdo" },
  ];

  if (!isTourism) {
    base.push(
      { key: "cashier", name: "Operador de Caixa / PDV" },
      { key: "stock", name: "Estoquista / Expedição" },
    );
  }
  return base;
}

/**
 * Verifica se a combinação (role, moduleKey, actionKey) está explicitamente bloqueada
 * na matriz `workspace_role_permissions`, aplicando também o piso de segurança hierárquico.
 */
export function evaluateWorkspacePermission(params: {
  rawRole?: string | null;
  moduleKey: string;
  actionKey: string;
  storedMatrix?: Record<string, Record<string, boolean>> | null;
}): boolean {
  const role = normalizeWorkspaceRole(params.rawRole);
  if (role === "owner" || role === "admin") return true;

  // Piso de segurança inviolável: funções operacionais jamais editam faixas, metas globais ou finanças da loja
  if (role === "seller" || role === "support" || role === "cashier" || role === "stock") {
    const forbiddenSellerModules = new Set([
      "comissoes_globais",
      "regras_metas",
      "financeiro",
      "folha_rh",
      "fornecedores_write",
    ]);
    if (
      forbiddenSellerModules.has(params.moduleKey) &&
      ["edit", "delete", "create", "pay", "edit_tiers", "edit_goals", "edit_salaries", "close_payroll"].includes(
        params.actionKey,
      )
    ) {
      return false;
    }
  }

  const configured = params.storedMatrix?.[params.moduleKey]?.[params.actionKey];
  if (typeof configured === "boolean") {
    return configured;
  }

  // Defaults seguros quando não customizado explicitamente na matriz
  if (role === "manager") return true;
  if (role === "finance") {
    return ["comissoes", "comissoes_globais", "financeiro", "clientes", "vendas", "metas"].includes(
      params.moduleKey,
    );
  }
  if (role === "rh") {
    return ["folha_rh", "ponto", "premiacoes_read"].includes(params.moduleKey);
  }
  if (role === "seller") {
    if (params.moduleKey === "minhas_vendas" || params.moduleKey === "metas_read") {
      return params.actionKey === "access" || params.actionKey === "view_own";
    }
    if (params.moduleKey === "comissoes") {
      return params.actionKey === "view_own";
    }
  }
  return false;
}
