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

function resolveClientContextDomainAttr(): string {
  if (typeof window === "undefined") return "";
  const host = (window?.location?.hostname || "").toLowerCase();
  if (host === "waesy.com.br" || host.endsWith(".waesy.com.br")) {
    return "; domain=.waesy.com.br";
  }
  if (host === "usewaesy.com" || host.endsWith(".usewaesy.com")) {
    return "; domain=.usewaesy.com";
  }
  return "";
}

/**
 * Define os cookies no cliente de forma idempotente e atômica.
 */
export function setClientContextCookies(payload: ContextPayload): void {
  if (typeof window === "undefined" || !window.document) return;

  const { context, storeId, creatorHandle } = payload;
  const domainAttr = resolveClientContextDomainAttr();
  const secAttr = window?.location?.protocol === "https:" ? "; Secure" : "";

  // 1. Contexto principal
  window.document.cookie = `waesy_active_context=${context}; path=/; max-age=${COOKIE_YEAR}; SameSite=Lax${domainAttr}${secAttr}`;

  if (context === "store" && storeId) {
    window.document.cookie = `waesy_active_tenant=${storeId}; path=/; max-age=${COOKIE_YEAR}; SameSite=Lax${domainAttr}${secAttr}`;
    window.document.cookie = `waesy_store_id=${storeId}; path=/; max-age=${COOKIE_YEAR}; SameSite=Lax${domainAttr}${secAttr}`;
    window.document.cookie = `waesy_active_creator=; path=/; max-age=0; SameSite=Lax${domainAttr}`;
  } else if (context === "creator" && creatorHandle) {
    const cleanHandle = encodeURIComponent(creatorHandle);
    window.document.cookie = `waesy_active_creator=${cleanHandle}; path=/; max-age=${COOKIE_YEAR}; SameSite=Lax${domainAttr}${secAttr}`;
    window.document.cookie = `waesy_active_tenant=; path=/; max-age=0; SameSite=Lax${domainAttr}`;
    window.document.cookie = `waesy_store_id=; path=/; max-age=0; SameSite=Lax${domainAttr}`;
  } else {
    // Modo Civil ou Courier: limpa contexto corporativo e criador
    window.document.cookie = `waesy_active_tenant=; path=/; max-age=0; SameSite=Lax${domainAttr}`;
    window.document.cookie = `waesy_store_id=; path=/; max-age=0; SameSite=Lax${domainAttr}`;
    window.document.cookie = `waesy_active_creator=; path=/; max-age=0; SameSite=Lax${domainAttr}`;
  }
}

/**
 * Purga atomicamente todos os cookies corporativos de tenant e redefine o contexto civil.
 * Garante que a vitrine pública opere sob Zero-Trust Civil Root.
 */
export function purgeCorporateContextCookies(): void {
  setClientContextCookies({ context: "civil" });
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
