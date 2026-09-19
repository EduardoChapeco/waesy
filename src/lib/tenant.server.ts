import { getRequestHeader, getCookie } from "@tanstack/start-server-core";
import { getAnonServerClient } from "@/lib/supabase";

/**
 * Resolve o store_id do contexto ativo a partir do cookie de sessão ou subdomínio.
 *
 * SEGURANÇA: Esta função NÃO faz fallback para a primeira store disponível.
 * Se nenhum contexto puder ser determinado com certeza, retorna null.
 * Contexto organizacional é adquirido SOMENTE mediante ação explícita do usuário.
 */
export async function resolveTenantStoreId(): Promise<string | null> {
 // 1. Cookie de sessão de tenant (definido por setTenantContext ou após createBusinessProfile)
 let activeTenantCookie = getCookie("waesy_active_tenant") || getCookie("jah_active_tenant") || getCookie("waesy_active_tenant");
 if (!activeTenantCookie) {
 const rawCookie = getRequestHeader("cookie") || "";
 const match = rawCookie.match(/(?:waesy_active_tenant|jah_active_tenant|waesy_active_tenant)=([^;]+)/);
 if (match && match[1]) {
 activeTenantCookie = decodeURIComponent(match[1].trim());
 }
 }

 if (activeTenantCookie) {
 return activeTenantCookie;
 }

 // 2. Subdomínio (ex: "minha-loja.usewaesy.com" → slug = "minha-loja")
 const host = getRequestHeader("host");
 if (host) {
 const parts = host.split(".");
 if (parts.length > 1 && parts[0] !== "www" && parts[0] !== "waesy" && parts[0] !== "usewaesy") {
 const slugToMatch = parts[0];
 const db = getAnonServerClient();
 const { data: matchedStore } = await db
 .from("stores")
 .select("id")
 .eq("slug", slugToMatch)
 .limit(1)
 .maybeSingle();

 if (matchedStore) {
 return matchedStore.id as string;
 }
 }
 }

 // 3. Sem cookie e sem subdomínio reconhecido → sem contexto organizacional.
 // O usuário está operando no escopo pessoal.
 // NÃO fazer fallback para a primeira store — isso criaria contexto silencioso.
 return null;
}
