import { getRequestHeader, getCookie } from "@tanstack/start-server-core";
import { getAnonServerClient } from "@/lib/supabase";

/**
 * Resolve o store_id do contexto ativo a partir do cookie de sessão ou subdomínio.
 *
 * SEGURANÇA: Esta função NÃO faz fallback para a primeira store disponível.
 * Se nenhum contexto puder ser determinado com certeza, retorna null.
 * Contexto organizacional é adquirido SOMENTE mediante ação explícita do usuário.
 */
export async function resolveTenantStoreId(capturedContext?: {
  rawCookie?: string;
  host?: string;
}): Promise<string | null> {
 // 1. Cookie de sessão de tenant (definido por setTenantContext ou após createBusinessProfile)
 let activeTenantCookie: string | null = null;
 let rawCookie = capturedContext?.rawCookie ?? "";
 if (!rawCookie) {
   try {
     rawCookie = getRequestHeader("cookie") || "";
   } catch {
     rawCookie = "";
   }
 }
 if (rawCookie) {
   const matches = [...rawCookie.matchAll(/(?:waesy_active_tenant|jah_active_tenant|waesy_store_id)=([^;]+)/g)];
   if (matches.length > 0) {
     activeTenantCookie = decodeURIComponent(matches[matches.length - 1][1].trim());
   }
 }
 if (!activeTenantCookie) {
   try {
     activeTenantCookie = getCookie("waesy_active_tenant") || getCookie("jah_active_tenant") || getCookie("waesy_store_id") || null;
   } catch {
     activeTenantCookie = null;
   }
 }

 if (activeTenantCookie) {
 return activeTenantCookie;
 }

 // 2. Subdomínio (ex: "minha-loja.usewaesy.com" → slug = "minha-loja")
 let host = capturedContext?.host ?? "";
 if (!host) {
   try {
     host = getRequestHeader("host") || "";
   } catch {
     host = "";
   }
 }
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
