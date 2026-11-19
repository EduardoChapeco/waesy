/**
 * Guardas de autorização — SERVIDOR APENAS.
 *
 * Consumidores devem importar de `@/lib/server-access`, que resolve este
 * módulo de forma preguiçosa e mantém o grafo do cliente limpo.
 */

import type { Role } from "@/types/domain";

/**
 * Ensures the caller is authenticated and has one of the allowed roles.
 * Supports multi-store memberships automatically.
 */
export async function requireRole(allowedRoles: Role[]): Promise<{ id: string; role: Role; store_id: string }> {
  const { getServerIdentity } = await import("./identity.server");
  const identity = await getServerIdentity();

  if (!identity.id) {
    throw new Error("Unauthorized: User not authenticated.");
  }

  const isGlobalAdmin = identity.role === "platform_admin" || identity.role === "master";

  if (isGlobalAdmin) {
    if (!identity.store_id) {
      if (identity.memberships && identity.memberships.length > 0 && identity.memberships[0]?.store_id) {
        identity.store_id = identity.memberships[0].store_id;
      }
    }
    return { id: identity.id, role: identity.role as Role, store_id: (identity.store_id || "") as string };
  }

  if ((allowedRoles as readonly string[]).includes(identity.role)) {
    if (!identity.store_id) {
      if (identity.memberships && identity.memberships.length > 0 && identity.memberships[0]?.store_id) {
        identity.store_id = identity.memberships[0].store_id;
      } else {
        throw new Error("Forbidden: No active store context associated with this identity.");
      }
    }
    return { id: identity.id, role: identity.role as Role, store_id: identity.store_id };
  }

  // Recuperação de contexto para staff corporativo (DEC-514): se identity.role foi rebaixado para "customer"
  // por resíduo de cookie civil de vitrine, inspeciona os vínculos verificados em workspace_members.
  if (identity.memberships && identity.memberships.length > 0) {
    const targetMembership =
      (identity.store_id ? identity.memberships.find((m) => m.store_id === identity.store_id) : null) ||
      identity.memberships.find((m) => (allowedRoles as readonly string[]).includes(m.role || "owner")) ||
      identity.memberships[0];

    const effectiveRole = (targetMembership?.role as Role) || "owner";
    if ((allowedRoles as readonly string[]).includes(effectiveRole)) {
      return {
        id: identity.id,
        role: effectiveRole,
        store_id: targetMembership.store_id,
      };
    }
  }

  throw new Error(`Forbidden: Insufficient privileges (${identity.role}). Required one of: ${allowedRoles.join(", ")}`);
}

/**
 * Exige acesso estrito de proprietário / administrador legal (owner / proprietario / admin / master).
 * Bloqueia gerentes, vendedores e operadores para ações societárias e financeiras críticas (dados bancários de repasse, chaves secretas).
 */
export async function requireOwner(): Promise<{ id: string; role: Role; store_id: string }> {
  return requireRole(["owner", "admin", "proprietario" as any, "platform_admin", "master"]);
}

/**
 * Exige acesso gerencial ou superior (owner, admin, manager, gerente, master).
 * Bloqueia operadores de caixa, estoque e atendentes para gestão tática da loja.
 */
export async function requireManager(): Promise<{ id: string; role: Role; store_id: string }> {
  return requireRole([
    "owner",
    "admin",
    "proprietario" as any,
    "manager",
    "gerente" as any,
    "platform_admin",
    "master",
  ]);
}

/**
 * Exige acesso financeiro ou superior (owner, admin, manager, finance, master).
 * Bloqueia operadores operacionais de vendas, atendimento e estoque.
 */
export async function requireFinance(): Promise<{ id: string; role: Role; store_id: string }> {
  return requireRole([
    "owner",
    "admin",
    "proprietario" as any,
    "manager",
    "gerente" as any,
    "finance",
    "platform_admin",
    "master",
  ]);
}

/**
 * Exige acesso administrativo ou gerencial estrito.
 * Proibido para funções operacionais isoladas (vendedor, suporte, estoque).
 */
export async function requireAdmin(): Promise<{ id: string; role: Role; store_id: string }> {
  return requireRole([
    "owner",
    "admin",
    "proprietario" as any,
    "manager",
    "gerente" as any,
    "finance",
    "platform_admin",
    "master",
  ]);
}

/**
 * Exige que o usuário seja membro ativo de staff da loja (qualquer cargo operacional autorizado).
 */
export async function requireStaff(): Promise<{ id: string; role: Role; store_id: string }> {
  return requireRole([
    "owner",
    "admin",
    "proprietario" as any,
    "manager",
    "gerente" as any,
    "finance",
    "seller",
    "cashier" as any,
    "waiter" as any,
    "driver" as any,
    "content",
    "support",
    "stock",
    "platform_admin",
    "master",
  ]);
}

/**
 * Exige acesso global de plataforma (master/platform_admin).
 * Inclui verificação fallback na tabela `profiles` e promoção idempotente de e-mail bootstrap allowlisted.
 */
export async function requirePlatformAdmin(): Promise<{ id: string; role: Role; store_id: string | null }> {
  const { getServerIdentity, isBootstrapPlatformAdminEmail } = await import("./identity.server");
  const identity = await getServerIdentity();

  if (!identity.id) {
    throw new Error("Não autenticado. Por favor, faça login.");
  }

  const isGlobalAdmin =
    identity.role === "platform_admin" ||
    identity.role === "master" ||
    Boolean((identity as any).isPlatformAdmin);

  if (isGlobalAdmin) {
    return {
      ...identity,
      id: identity.id,
      role: (identity.role === "master" ? "master" : "platform_admin") as Role,
      store_id: identity.store_id || null,
    };
  }

  const { getServerClient } = await import("@/lib/supabase");
  const db = getServerClient();
  const { data: profile } = await db
    .from("profiles")
    .select("role")
    .eq("id", identity.id)
    .maybeSingle();

  if (profile?.role === "platform_admin" || profile?.role === "master") {
    return {
      ...identity,
      id: identity.id,
      role: "platform_admin" as Role,
      store_id: identity.store_id || null,
    };
  }

  const { data: userData, error: userFetchError } = await db.auth.admin.getUserById(identity.id);
  if (userFetchError) {
    console.warn("[auth-guards] Falha ao consultar e-mail do usuário na auth admin:", userFetchError.message);
  }
  const email = userData?.user?.email?.toLowerCase();

  if (email && isBootstrapPlatformAdminEmail(email)) {
    const { error: promotionError } = await db
      .from("profiles")
      .update({ role: "platform_admin" })
      .eq("id", identity.id);
    if (promotionError) {
      console.error("[auth-guards] Falha ao persistir promoção para platform_admin:", promotionError);
      throw new Error("Não foi possível confirmar a autorização administrativa.");
    }
    return {
      ...identity,
      id: identity.id,
      role: "platform_admin" as Role,
      store_id: identity.store_id || null,
    };
  }

  throw new Error(`Acesso negado. Apenas administradores globais master podem realizar esta ação (${identity.role}).`);
}

