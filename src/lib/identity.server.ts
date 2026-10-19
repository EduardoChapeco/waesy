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

/** Invalida todo o cache em memória de identidades (chamado em logout ou troca de tenant). */
export function clearIdentityCache(): void {
  IDENTITY_MEMO_CACHE.clear();
}

function resolveMemoKey(): string {
  try {
    const raw = getRequestHeader("cookie") || "";
    const host = getRequestHeader("host") || "unknown-host";
    const sbPattern = new RegExp(["sb-", "[^;]+", "-auth-token", "[^;]*"].join(""), "g");
    const sb = [
      ...(raw.match(/waesy-auth-token[^;]*/g) || []),
      ...(raw.match(sbPattern) || []),
    ].join("&") || "guest";
    const ctx = raw.match(/waesy_[^;]+/g)?.join("&") || "";
    return `${host}|${sb}|${ctx}`;
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

  // ── Passo 1: Busca em paralelo de Perfil completo e Vínculos canônicos (1 roundtrip)
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
    if (wmRes?.error) {
      console.warn("[identity.server] Erro ao buscar workspace_members:", wmRes.error.message);
    }
  } catch (err) {
    console.warn("[identity.server] Erro ao buscar perfil ou workspace_members:", err);
  }

  if (memberRows && memberRows.length > 0) {
    const storeIds = Array.from(new Set(memberRows.map((m: any) => m.store_id).filter(Boolean)));
    if (storeIds.length > 0) {
      try {
        const { data: storesList, error: storesErr } = await serverClient
          .from("stores")
          .select(
            "id, name, slug, email, phone, cnpj, address, city, state, zip_code, settings, logo_url",
          )
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

  // ── Passo 3: Memberships são somente declarados no vínculo canônico.
  // Nunca inferir ownership por email/settings nem persistir auto-heal com service_role.
  // Usuários sem workspace_members permanecem no contexto civil e precisam passar
  // por onboarding/convite explícito antes de acessar superfícies de loja.

  // ── Passo 4: Resolver contexto ativo (Civil vs Creator vs Store)
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

  if (activeContext === "civil") {
    // Zero-Trust Civil Root (DEC-206): contexto civil pessoal NUNCA carrega store_id ativo
    activeStoreId = null;
  } else if (activeContext === "creator") {
    // Contexto de Criador: opera com personas de conteúdo e afiliação sem tenant de loja
    activeStoreId = null;
  } else if (activeContext === "store") {
    if (matchedMembership) {
      activeStoreId = matchedMembership.store_id;
    } else if (isPlatformAdmin && activeStoreId) {
      // Admin master com permissão de impersonação/acesso à loja ativa
    } else {
      activeStoreId = memberships[0]?.store_id || null;
    }
  } else if (matchedMembership) {
    activeStoreId = matchedMembership.store_id;
    activeContext = "store";
  } else if (isPlatformAdmin && activeStoreId) {
    activeContext = "store";
  } else {
    activeStoreId = null;
    activeContext = "civil";
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
    fullName:
      userProfile?.full_name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "Membro Waesy",
  };

  if (evt?.context) {
    evt.context.__server_identity__ = resolvedIdentity;
  }
  if (memoKey !== "unscoped") {
    IDENTITY_MEMO_CACHE.set(memoKey, {
      identity: resolvedIdentity,
      expiresAt: Date.now() + 10_000,
    });
  }

  return resolvedIdentity;
}
