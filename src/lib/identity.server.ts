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
import { getEvent } from "vinxi/http";
import { getRequestHeader } from "@tanstack/start-server-core";

export type { ServerIdentity };
export { assertStoreAccess, STAFF_ROLES } from "@/lib/identity-core";

interface CacheEntry {
  identity: ServerIdentity;
  expiresAt: number;
}
const IDENTITY_MEMO_CACHE = new Map<string, CacheEntry>();

function resolveMemoKey(): string {
  try {
    const raw = getRequestHeader("cookie") || "";
    const sbPattern = new RegExp(["sb-", "[^;]+", "-auth-token", "[^;]*"].join(""), "g");
    const authCookies = [
      ...(raw.match(/waesy-auth-token[^;]*/g) || []),
      ...(raw.match(sbPattern) || []),
    ].join("&") || "guest";
    const ctx = (raw.match(/waesy_[^;]+/g) || []).join("&");
    return `${authCookies}|${ctx}`;
  } catch {
    return "unscoped";
  }
}

/**
 * Resolve a identidade completa do usuário autenticado no contexto do servidor.
 * Retorna id: null se não autenticado. NUNCA simula usuário mock em produção.
 */
export async function getServerIdentity(): Promise<ServerIdentity> {
  // 1. Contexto de requisição Vinxi (0ms - isolado por requisição HTTP)
  let evt: any = null;
  try {
    evt = getEvent();
    if (evt?.context?.__server_identity__) {
      return evt.context.__server_identity__;
    }
  } catch {}

  // 2. Micro-cache em memória de 10 segundos para Server Functions concorrentes
  const memoKey = resolveMemoKey();
  const now = Date.now();
  if (memoKey !== "unscoped") {
    const cached = IDENTITY_MEMO_CACHE.get(memoKey);
    if (cached && cached.expiresAt > now) {
      if (evt?.context) evt.context.__server_identity__ = cached.identity;
      return cached.identity;
    }
  }

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

    const guestIdentity: ServerIdentity = {
      id: null,
      role: "customer",
      store_id: activeStoreId,
      memberships: [],
    };
    if (evt?.context) evt.context.__server_identity__ = guestIdentity;
    if (memoKey !== "unscoped") {
      IDENTITY_MEMO_CACHE.set(memoKey, { identity: guestIdentity, expiresAt: now + 5_000 });
    }
    return guestIdentity;
  }

  // ── Passo 1: Busca em paralelo de Perfil completo e Vínculos de trabalho (1 roundtrip)
  let userProfile: any = null;
  let userProfileRole = "customer";
  let memberRows: any[] = [];

  try {
    const [profileRes, wmRes] = await Promise.all([
      serverClient
        .from("profiles")
        .select("id, full_name, username, avatar_url, role, phone, cpf")
        .eq("id", user.id)
        .maybeSingle(),
      serverClient
        .from("workspace_members")
        .select("store_id, role")
        .eq("profile_id", user.id),
    ]);

    userProfile = profileRes?.data || null;
    userProfileRole = userProfile?.role || "customer";
    memberRows = wmRes?.data || [];
  } catch (err) {
    console.warn("[identity.server] Erro ao buscar perfil ou workspace_members:", err);
  }

  if (memberRows && memberRows.length > 0) {
    const storeIds = Array.from(new Set(memberRows.map((m: any) => m.store_id).filter(Boolean)));
    if (storeIds.length > 0) {
      try {
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
      } catch (e) {
        console.warn("[identity.server] Erro ao montar memberships de lojas:", e);
      }
    }
  }

  // isPlatformAdmin: derivado EXCLUSIVAMENTE do banco de dados.
  // NUNCA use emails hardcoded aqui — isso viola RLS e multi-tenancy.
  const isPlatformAdmin =
    userProfileRole === "platform_admin" ||
    userProfileRole === "master" ||
    userProfileRole === "superadmin";

  // Platform admin tem acesso a todas as lojas do ecossistema
  if (isPlatformAdmin) {
    try {
      const { data: allStores } = await serverClient
        .from("stores")
        .select("id, name, slug, email, phone, cnpj, address, city, state, zip_code, settings, logo_url")
        .order("created_at", { ascending: false })
        .limit(50);

      if (allStores && allStores.length > 0) {
        const existingIds = new Set(memberships.map((m) => m.store_id));
        allStores.forEach((s: any) => {
          if (!existingIds.has(s.id)) {
            const settings = (s.settings as Record<string, any>) || {};
            memberships.push({
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
            });
            existingIds.add(s.id);
          }
        });
      }
    } catch (e) {
      console.warn("[identity.server] Erro ao buscar lojas para platform_admin:", e);
    }
  }

  // ── Passo 2: Resolver contexto ativo (Civil vs Creator vs Store)
  let activeContext = "civil";
  let activeStoreId: string | null = null;

  try {
    const { getCookie, getRequestHeader: getHeader } = await import("@tanstack/start-server-core");
    let ctxCookie = getCookie("waesy_active_context");
    if (!ctxCookie) {
      const rawCookie = getHeader("cookie") || "";
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

  const resolvedIdentity: ServerIdentity = {
    id: user.id,
    userId: user.id,
    role: finalRole,
    store_id: activeStoreId,
    storeId: activeStoreId,
    isPlatformAdmin,
    isCivilContext: activeStoreId === null || activeContext === "civil",
    activeContext: activeContext || (activeStoreId ? "store" : "civil"),
    memberships,
    email: user.email,
    fullName: userProfile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Membro Waesy",
    user: {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
    },
    profile: userProfile,
  };

  if (evt?.context) {
    evt.context.__server_identity__ = resolvedIdentity;
  }
  if (memoKey !== "unscoped") {
    IDENTITY_MEMO_CACHE.set(memoKey, { identity: resolvedIdentity, expiresAt: Date.now() + 10_000 });
  }

  return resolvedIdentity;
}
