/**
 * context-auth.ts — Governança Canônica de Alternância de Contextos & Cookies
 *
 * Sincroniza atomicamente os 4 cookies soberanos do ecossistema Waesy:
 * - `waesy_active_context`: 'civil' | 'store' | 'creator' | 'courier'
 * - `waesy_active_tenant`: ID do tenant/loja ativo
 * - `waesy_store_id`: Espelho legado para retrocompatibilidade
 * - `waesy_active_creator`: @handle ou ID do criador ativo
 */

export type ContextType = "civil" | "store" | "creator" | "courier";

export interface ContextPayload {
  context: ContextType;
  storeId?: string | null;
  creatorHandle?: string | null;
}

const COOKIE_YEAR = 60 * 60 * 24 * 365;

/**
 * Define os cookies no cliente de forma idempotente e atômica.
 */
export function setClientContextCookies(payload: ContextPayload): void {
  if (typeof window === "undefined") return;

  const { context, storeId, creatorHandle } = payload;

  // 1. Contexto principal
  window.document.cookie = `waesy_active_context=${context}; path=/; max-age=${COOKIE_YEAR}; SameSite=Lax`;

  if (context === "store" && storeId) {
    window.document.cookie = `waesy_active_tenant=${storeId}; path=/; max-age=${COOKIE_YEAR}; SameSite=Lax`;
    window.document.cookie = `waesy_store_id=${storeId}; path=/; max-age=${COOKIE_YEAR}; SameSite=Lax`;
    window.document.cookie = "waesy_active_creator=; path=/; max-age=0; SameSite=Lax";
  } else if (context === "creator" && creatorHandle) {
    const cleanHandle = encodeURIComponent(creatorHandle);
    window.document.cookie = `waesy_active_creator=${cleanHandle}; path=/; max-age=${COOKIE_YEAR}; SameSite=Lax`;
    window.document.cookie = "waesy_active_tenant=; path=/; max-age=0; SameSite=Lax";
    window.document.cookie = "waesy_store_id=; path=/; max-age=0; SameSite=Lax";
  } else {
    // Modo Civil ou Courier: limpa contexto corporativo e criador
    window.document.cookie = "waesy_active_tenant=; path=/; max-age=0; SameSite=Lax";
    window.document.cookie = "waesy_store_id=; path=/; max-age=0; SameSite=Lax";
    window.document.cookie = "waesy_active_creator=; path=/; max-age=0; SameSite=Lax";
  }
}

/**
 * Lê o contexto ativo atual a partir do document.cookie (última ocorrência mais recente).
 */
export function getClientActiveContext(): ContextType {
  if (typeof window === "undefined") return "civil";
  const matches = [...document.cookie.matchAll(/waesy_active_context=([^;]+)/g)];
  if (!matches || matches.length === 0) return "civil";
  const lastMatch = matches[matches.length - 1];
  const val = decodeURIComponent(lastMatch[1].trim());
  if (val === "store" || val === "creator" || val === "courier") return val;
  return "civil";
}

/**
 * Lê o ID do tenant ativo atual a partir do document.cookie (última ocorrência mais recente).
 */
export function getClientActiveTenant(): string | null {
  if (typeof window === "undefined") return null;
  const matches = [...document.cookie.matchAll(/(?:waesy_active_tenant|waesy_store_id)=([^;]*)/g)];
  if (!matches || matches.length === 0) return null;
  const lastMatch = matches[matches.length - 1];
  const val = decodeURIComponent(lastMatch[1].trim());
  return val || null;
}

/**
 * Lê o handle do criador ativo atual a partir do document.cookie (última ocorrência mais recente).
 */
export function getClientActiveCreator(): string | null {
  if (typeof window === "undefined") return null;
  const matches = [...document.cookie.matchAll(/waesy_active_creator=([^;]*)/g)];
  if (!matches || matches.length === 0) return null;
  const lastMatch = matches[matches.length - 1];
  const val = decodeURIComponent(lastMatch[1].trim());
  return val || null;
}
