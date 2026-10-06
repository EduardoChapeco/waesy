/**
 * Ponte cliente-segura para helpers de servidor Commerce
 *
 * O TanStack Start bloqueia qualquer aresta ESTÁTICA para módulos `*.server.ts`
 * (ou para `@tanstack/react-start/server`) a partir de módulos alcançáveis pelo
 * grafo do cliente — e os arquivos `*.functions.ts` são alcançáveis porque as
 * rotas os importam.
 *
 * Este módulo resolve esses helpers com `await import(...)`, o que mantém a
 * aresta fora do grafo do cliente. Todos os services devem importar daqui.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Role } from "@/types/domain";
import type { ServerIdentity } from "@/lib/identity-core";

export type { ServerIdentity };
export {
  assertStoreAccess,
  assertOwnerAccess,
  assertManagerAccess,
  STAFF_ROLES,
  OWNER_ROLES,
  MANAGER_ROLES,
} from "@/lib/identity-core";

/** Cliente Supabase SSR (anon key + cookies do usuário). Servidor apenas. */
export async function getSSRClient(): Promise<SupabaseClient> {
 const mod = await import("@/lib/supabase-ssr.server");
 return mod.getSSRClient();
}

/** Identidade completa do usuário autenticado. Servidor apenas. */
export async function getServerIdentity(): Promise<ServerIdentity> {
 const mod = await import("@/lib/identity.server");
 return mod.getServerIdentity();
}

/** Resolve o tenant ativo sem criar aresta estática para tenant.server. */
export async function resolveTenantStoreId(): Promise<string | null> {
 const mod = await import("@/lib/tenant.server");
 return mod.resolveTenantStoreId();
}

/** Helpers de sessão resolvidos apenas dentro do handler server-side. */
export async function getGuestSession(): Promise<string | null> {
 const mod = await import("@/lib/session");
 return mod.getGuestSession();
}

export async function getOrCreateGuestSession(): Promise<string> {
 const mod = await import("@/lib/session");
 return mod.getOrCreateGuestSession();
}

export async function getSellerRefCookie(): Promise<string | null> {
 const mod = await import("@/lib/session");
 return mod.getSellerRefCookie();
}

export async function setSellerRefCookie(sellerId: string): Promise<void> {
 const mod = await import("@/lib/session");
 return mod.setSellerRefCookie(sellerId);
}

/** Exige um dos papéis informados. Lança se não autorizado. Servidor apenas. */
export async function requireRole(allowedRoles: Role[]): Promise<{ id: string; role: Role; store_id: string }> {
 const mod = await import("@/lib/auth-guards.server");
 return mod.requireRole(allowedRoles);
}

/** Exige acesso estrito de proprietário / administrador societário. Servidor apenas. */
export async function requireOwner(): Promise<{ id: string; role: Role; store_id: string }> {
  const mod = await import("@/lib/auth-guards.server");
  return mod.requireOwner();
}

/** Exige acesso gerencial ou superior. Servidor apenas. */
export async function requireManager(): Promise<{ id: string; role: Role; store_id: string }> {
  const mod = await import("@/lib/auth-guards.server");
  return mod.requireManager();
}

/** Exige acesso administrativo/gerencial. Servidor apenas. */
export async function requireAdmin(): Promise<{ id: string; role: Role; store_id: string }> {
  const mod = await import("@/lib/auth-guards.server");
  return mod.requireAdmin();
}

/** Exige acesso financeiro ou superior. Servidor apenas. */
export async function requireFinance(): Promise<{ id: string; role: Role; store_id: string }> {
  const mod = await import("@/lib/auth-guards.server");
  return mod.requireFinance();
}

/** Exige que o usuário seja membro ativo de staff da loja. Servidor apenas. */
export async function requireStaff(): Promise<{ id: string; role: Role; store_id: string }> {
  const mod = await import("@/lib/auth-guards.server");
  return mod.requireStaff();
}

/** Exige acesso administrativo global (master). Servidor apenas. */
export async function requirePlatformAdmin(): Promise<{ id: string; role: Role; store_id: string }> {
  const mod = await import("@/lib/auth-guards.server");
  return mod.requirePlatformAdmin();
}
