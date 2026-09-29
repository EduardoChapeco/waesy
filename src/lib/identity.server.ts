/**
 * Identidade canônica do usuário autenticado Commerce
 *
 * Fonte única de verdade para resolver identity + role + store_id em server functions.
 * Nunca duplicar esta lógica nos arquivos de service.
 *
 * SERVIDOR APENAS.
 */

import { getSSRClient } from "@/lib/supabase-ssr.server";
import { getServerClient } from "@/lib/supabase";
import { type ServerIdentity, STAFF_ROLES } from "@/lib/identity-core";

export type { ServerIdentity };
export { assertStoreAccess, STAFF_ROLES } from "@/lib/identity-core";

/**
 * Resolve a identidade completa do usuário autenticado no contexto do servidor.
 * Retorna id: null se não autenticado. NUNCA simula usuário mock em produção.
 */
export async function getServerIdentity(): Promise<ServerIdentity> {
 let user: any = null;
 try {
 const ssrClient = getSSRClient();
 const authRes = await ssrClient.auth.getUser();
 user = authRes?.data?.user || null;
 } catch {
 user = null;
 }

 const serverClient = getServerClient();
 let memberships: any[] = [];

 if (!user) {
 let activeStoreId: string | null = null;
 try {
 const { resolveTenantStoreId } = await import("@/lib/tenant.server");
 activeStoreId = (await resolveTenantStoreId()) ?? null;
 } catch {
 activeStoreId = null;
 }

 if (!activeStoreId) {
 try {
 const { data: firstStore } = await serverClient
 .from("stores")
 .select("id")
 .limit(1)
 .maybeSingle();
 activeStoreId = firstStore?.id ?? null;
 } catch {
 activeStoreId = null;
 }
 }

 return {
 id: null,
 role: "customer",
 store_id: activeStoreId,
 memberships: [],
 };
 }

 // ── Passo 1: Buscar memberships via workspace_members (única fonte canônica)
 try {
 const { data: memberRows, error: wmErr } = await serverClient
 .from("workspace_members")
 .select("store_id, role")
 .eq("profile_id", user.id);

 if (wmErr) {
 console.warn("[identity.server] Erro ao buscar workspace_members:", wmErr.message);
 }

 if (memberRows && memberRows.length > 0) {
 const storeIds = Array.from(new Set(memberRows.map((m: any) => m.store_id).filter(Boolean)));
 if (storeIds.length > 0) {
 const { data: storesList, error: storesErr } = await serverClient
 .from("stores")
 .select("id, name, slug, email, phone, cnpj, address, city, state, zip_code, settings, logo_url")
 .in("id", storeIds);

 if (storesErr) {
 console.warn("[identity.server] Erro ao buscar stores por ID:", storesErr.message);
 }

 const storeMap = new Map((storesList || []).map((s: any) => [s.id, s]));
 const uniqueMembershipMap = new Map<string, any>();

 memberRows.forEach((m: any) => {
 if (storeMap.has(m.store_id) && !uniqueMembershipMap.has(m.store_id)) {
 const s = storeMap.get(m.store_id)!;
 const settings = (s.settings as Record<string, any>) || {};
 uniqueMembershipMap.set(m.store_id, {
 store_id: s.id,
 role: m.role || "owner",
 name: s.name || "Minha Empresa",
 slug: s.slug || "loja",
 logo_url: s.logo_url || settings.logoUrl || settings.logo_url || null,
 segment: settings.segment || settings.type || settings.niche || null,
 type: settings.type || settings.segment || null,
 category: settings.category || settings.segment || null,
 city: s.city || null,
 state: s.state || null,
 settings: settings,
 });
 }
 });

 memberships = Array.from(uniqueMembershipMap.values());
 }
 }
 } catch (e) {
 console.warn("[identity.server] Erro ao buscar memberships:", e);
 }

 // ── Passo 2: Verificar role do perfil
 let userProfileRole = "customer";
 try {
 const { data: p } = await serverClient
 .from("profiles")
 .select("role")
 .eq("id", user.id)
 .maybeSingle();
 userProfileRole = p?.role || "customer";
 } catch (err) {
 console.error("[identity.server] Falha ao verificar role no banco:", err);
 }

 // isPlatformAdmin: derivado EXCLUSIVAMENTE do banco de dados.
 // NUNCA use emails hardcoded aqui — isso viola RLS e multi-tenancy.
 const isPlatformAdmin =
 userProfileRole === "platform_admin" ||
 userProfileRole === "master" ||
 userProfileRole === "superadmin";

 // ── Passo 3: Auto-Heal — Garante memberships corretos
 // Roda sempre que memberships estiver vazio (qualquer usuário), não apenas platform_admin.
 // Também roda para platform_admin para garantir acesso completo.
 if (memberships.length === 0 || isPlatformAdmin) {
 try {
 let ownedStores: any[] = [];
 if (isPlatformAdmin) {
 // Platform admin tem acesso a todas as lojas do ecossistema
 const { data: allStores } = await serverClient
 .from("stores")
 .select("id, name, slug, email, phone, cnpj, address, city, state, zip_code, settings, logo_url")
 .order("created_at", { ascending: false })
 .limit(50);
 ownedStores = allStores || [];
 } else {
 // Usuário comum sem memberships:
 // 1. Tenta re-buscar via workspace_members com service_role (evita RLS anon)
 try {
 const { data: retryRows } = await serverClient
 .from("workspace_members")
 .select("store_id, role")
 .eq("profile_id", user.id);

 if (retryRows && retryRows.length > 0) {
 const retryStoreIds = retryRows.map((r: any) => r.store_id).filter(Boolean);
 const { data: retryStores } = await serverClient
 .from("stores")
 .select("id, name, slug, email, phone, cnpj, address, city, state, zip_code, settings, logo_url")
 .in("id", retryStoreIds);

 if (retryStores && retryStores.length > 0) {
 const retryMap = new Map(retryRows.map((r: any) => [r.store_id, r.role]));
 const existingIds = new Set(memberships.map((m) => m.store_id));
 retryStores.forEach((s: any) => {
 if (!existingIds.has(s.id)) {
 const settings = (s.settings as Record<string, any>) || {};
 memberships.push({
 store_id: s.id,
 role: retryMap.get(s.id) || "owner",
 name: s.name || "Minha Empresa",
 slug: s.slug || "loja",
 logo_url: s.logo_url || settings.logoUrl || settings.logo_url || null,
 segment: settings.segment || settings.type || null,
 type: settings.type || settings.segment || null,
 category: settings.category || settings.segment || null,
 city: s.city || null,
 state: s.state || null,
 settings: settings,
 });
 existingIds.add(s.id);
 }
 });
 }

 // Se o retry com service_role já resolveu, não precisa buscar por email
 if (memberships.length > 0) {
 ownedStores = [];
 } else {
 // 2. Fallback: busca por email cadastrado na loja
 const userEmail = user?.email?.toLowerCase() || "";
 const { data: byEmail } = userEmail
 ? await serverClient
 .from("stores")
 .select("id, name, slug, email, phone, cnpj, address, city, state, zip_code, settings, logo_url")
 .ilike("email", userEmail)
 : { data: [] };
 ownedStores = byEmail || [];
 }
 } else {
 // workspace_members vazio para este usuário — busca por email da loja
 const userEmail = user?.email?.toLowerCase() || "";
 const { data: byEmail } = userEmail
 ? await serverClient
 .from("stores")
 .select("id, name, slug, email, phone, cnpj, address, city, state, zip_code, settings, logo_url")
 .ilike("email", userEmail)
 : { data: [] };
 ownedStores = byEmail || [];
 }
 } catch (retryErr) {
 console.warn("[identity.server] Erro no retry de workspace_members:", retryErr);
 // Último recurso: busca por email
 const userEmail = user?.email?.toLowerCase() || "";
 const { data: byEmail } = userEmail
 ? await serverClient
 .from("stores")
 .select("id, name, slug, email, phone, cnpj, address, city, state, zip_code, settings, logo_url")
 .ilike("email", userEmail)
 : { data: [] };
 ownedStores = byEmail || [];
 }
 }

 if (ownedStores && ownedStores.length > 0) {
 const existingIds = new Set(memberships.map((m) => m.store_id));
 const additional = ownedStores
 .filter((s: any) => !existingIds.has(s.id))
 .map((s: any) => {
 const settings = (s.settings as Record<string, any>) || {};
 return {
 store_id: s.id,
 role: "owner",
 name: s.name || "Minha Empresa",
 slug: s.slug || "loja",
 logo_url: s.logo_url || settings.logoUrl || settings.logo_url || null,
 segment: settings.segment || settings.type || settings.niche || null,
 type: settings.type || settings.segment || null,
 category: settings.category || settings.segment || null,
 city: s.city || null,
 state: s.state || null,
 settings: settings,
 };
 });

 memberships = [...memberships, ...additional];
 }
 } catch (e) {
 console.warn("[identity.server] Erro no auto-heal de lojas:", e);
 }
 }

 // ── Passo 4: Resolver contexto ativo (Civil vs Creator vs Store)
 let activeContext = "civil";
 let activeStoreId: string | null = null;

 try {
 const { getCookie, getRequestHeader } = await import("@tanstack/start-server-core");
 let ctxCookie = getCookie("waesy_active_context");
 if (!ctxCookie) {
 const rawCookie = getRequestHeader("cookie") || "";
 const match = rawCookie.match(/waesy_active_context=([^;]+)/);
 if (match && match[1]) {
 ctxCookie = decodeURIComponent(match[1].trim());
 }
 }
 if (ctxCookie) {
 activeContext = ctxCookie;
 }
 } catch {}

 // ── Resolução de store_id via cookie / subdomínio
 try {
 const { resolveTenantStoreId } = await import("@/lib/tenant.server");
 activeStoreId = (await resolveTenantStoreId()) ?? null;
 } catch {
 activeStoreId = null;
 }

 const matchedMembership = activeStoreId
 ? memberships.find((m) => m.store_id === activeStoreId)
 : null;

 if (activeContext === "creator") {
 activeStoreId = null;
 } else if (matchedMembership) {
 activeStoreId = matchedMembership.store_id;
 activeContext = "store";
 } else if (isPlatformAdmin && activeStoreId) {
 activeContext = "store";
 } else if (activeContext === "store") {
 activeStoreId = memberships[0]?.store_id || null;
 } else {
 activeStoreId = null;
 activeContext = activeContext || "civil";
 }

 const currentMembership = activeStoreId
 ? memberships.find((m) => m.store_id === activeStoreId)
 : null;
 const storeRole = (currentMembership?.role as any) || "customer";
 const finalRole = isPlatformAdmin ? "platform_admin" : storeRole;

 return {
 id: user.id,
 userId: user.id,
 role: finalRole,
 store_id: activeStoreId,
 storeId: activeStoreId,
 isPlatformAdmin,
 isCivilContext: activeStoreId === null || activeContext === "civil",
 activeContext: activeContext || (activeStoreId ? "store" : "civil"),
 memberships,
 };
}
