/**
 * Identity core Commerce
 *
 * Tipos e validações puras de identidade. Este módulo NÃO importa nada de
 * servidor, portanto pode ser importado com segurança de qualquer lugar
 * (inclusive de módulos alcançáveis pelo grafo do cliente).
 */

export interface ServerIdentity {
  /** auth.users.id — null se não autenticado */
  id: string | null;
  /** role do perfil no contexto ativo — 'customer' como fallback */
  role: string;
  /** store_id do contexto ativo (loja sendo acessada) — null se puramente pessoal */
  store_id: string | null;
  /** Lista de lojas/workspaces que o usuário faz parte e seus respectivos papéis */
  memberships: {
    store_id: string;
    role: string;
    name?: string;
    slug?: string;
    logo_url?: string;
  }[];
  // Extended optional fields used by legacy/extended services
  empresa_id?: string | null;
  tenant_id?: string | null;
  user_id?: string | null;
  customer_id?: string | null;
  storeId?: string | null;
  name?: string | null;
  email?: string | null;
  fullName?: string | null;
  /** @deprecated use (identity.role === "platform_admin") instead */
  isPlatformAdmin?: boolean;
  /** @deprecated use identity.id instead */
  userId?: string | null;
}

export const STAFF_ROLES = [
 "owner",
 "admin",
 "manager",
 "seller",
 "finance",
 "content",
 "support",
 "stock",
] as const;

export const OWNER_ROLES = [
  "owner",
  "admin",
  "proprietario",
  "platform_admin",
  "master",
] as const;

export const MANAGER_ROLES = [
  "owner",
  "admin",
  "proprietario",
  "manager",
  "gerente",
  "platform_admin",
  "master",
] as const;

/**
 * Asserts que o usuário tem acesso de staff à loja ou é platform_admin global.
 * Lança Error se não autorizado.
 */
export function assertStoreAccess(
  identity: ServerIdentity,
  allowedRoles: readonly string[] | string[] = STAFF_ROLES,
  targetStoreId?: string | null,
): asserts identity is ServerIdentity & { id: string; store_id: string } {
  if (!identity.id) {
    throw new Error("Unauthorized: User not authenticated.");
  }

  if (identity.role === "platform_admin" || identity.role === "master") {
    if (targetStoreId) {
      (identity as any).store_id = targetStoreId;
    }
    return; // Global admins have access
  }

  // If targetStoreId is provided, enforce cross-tenant isolation
  const effectiveStoreId = targetStoreId || identity.store_id;

  if (!effectiveStoreId) {
    if (identity.memberships?.[0]?.store_id) {
      (identity as any).store_id = identity.memberships[0].store_id;
    } else {
      throw new Error("Unauthorized: No active store context found.");
    }
  } else {
    (identity as any).store_id = effectiveStoreId;
  }

  // Enforce that user actually has an authorized membership in the effective store
  const targetMembership = (identity.memberships || []).find(
    (m) => m.store_id === (identity as any).store_id
  );

  const effectiveRole = targetMembership?.role || identity.role;

  if (!targetMembership && !targetStoreId && (allowedRoles as readonly string[]).includes(identity.role)) {
    return;
  }

  if (!targetMembership || !(allowedRoles as readonly string[]).includes(effectiveRole)) {
    throw new Error(
      `Unauthorized: Insufficient permissions for store ${(identity as any).store_id}. Required one of: ${allowedRoles.join(", ")}`
    );
  }

  (identity as any).role = effectiveRole;
}

/**
 * Asserts que o usuário possui acesso estrito de proprietário / titular da loja.
 * Bloqueia gerentes, operadores e terceiros para ações societárias, bancárias e destrutivas.
 */
export function assertOwnerAccess(
  identity: ServerIdentity,
  targetStoreId?: string | null,
): asserts identity is ServerIdentity & { id: string; store_id: string } {
  assertStoreAccess(identity, OWNER_ROLES, targetStoreId);
}

/**
 * Asserts que o usuário possui acesso gerencial ou superior (owner/admin/manager).
 * Bloqueia operadores operacionais (vendedor, caixa, estoque) para gestão tática da loja.
 */
export function assertManagerAccess(
  identity: ServerIdentity,
  targetStoreId?: string | null,
): asserts identity is ServerIdentity & { id: string; store_id: string } {
  assertStoreAccess(identity, MANAGER_ROLES, targetStoreId);
}

