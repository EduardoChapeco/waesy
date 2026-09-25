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

 if (!isGlobalAdmin && !(allowedRoles as readonly string[]).includes(identity.role)) {
 throw new Error(`Forbidden: Insufficient privileges (${identity.role}). Required one of: ${allowedRoles.join(", ")}`);
 }

 if (!identity.store_id) {
 throw new Error("Forbidden: No active store context associated with this identity.");
 }

 return { id: identity.id, role: identity.role as Role, store_id: identity.store_id };
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

export async function requireAdmin() {
  return requireRole([
    "owner",
    "admin",
    "manager",
    "finance",
    "seller",
    "content",
    "support",
    "stock",
    "platform_admin",
    "master",
  ]);
}

/**
 * Exige acesso global de plataforma (master/platform_admin).
 */
export async function requirePlatformAdmin() {
  return requireRole(["platform_admin", "master"]);
}
