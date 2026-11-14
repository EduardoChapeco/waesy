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
import {
  inspectCanonicalSessionFromCookies,
  parseRawCookieStringPreservingDuplicates,
} from "@/lib/auth-cookie-sanitizer";

export type { ServerIdentity };
export { assertStoreAccess, STAFF_ROLES } from "@/lib/identity-core";

interface CacheEntry {
  identity: ServerIdentity;
  expiresAt: number;
}
const IDENTITY_MEMO_CACHE = new Map<string, CacheEntry>();
const IDENTITY_INFLIGHT_MAP = new Map<string, Promise<ServerIdentity>>();

/** Invalida todo o cache em memória de identidades (chamado em logout ou troca de tenant). */
export function clearIdentityCache(): void {
  IDENTITY_MEMO_CACHE.clear();
  IDENTITY_INFLIGHT_MAP.clear();
}

function resolveMemoKey(rawCookie: string, host: string): string {
  try {
    if (!rawCookie && host === "unknown-host") return "unscoped";
    const sbPattern = new RegExp(["sb-", "[^;]+", "-auth-token", "[^;]*"].join(""), "g");
    const sb = [
      ...(rawCookie.match(/waesy-auth-token[^;]*/g) || []),
      ...(rawCookie.match(sbPattern) || []),
    ].join("&") || "guest";
    const ctx = rawCookie.match(/waesy_[^;]+/g)?.join("&") || "";
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
  // 0. Captura síncrona de evento e headers ANTES de qualquer await (proteção contra queda de unctx)
  let evt: any = null;
  let capturedCookie = "";
  let capturedHost = "unknown-host";
  try {
    evt = getEvent();
    if (evt?.context?.__server_identity__) {
      return evt.context.__server_identity__;
    }
  } catch {}

  try {
    capturedCookie = getRequestHeader("cookie") || "";
  } catch {}
  try {
    const host = getRequestHeader("host") || "unknown-host";
    capturedHost = host;
  } catch {}

  // 1. Micro-cache em memória de 10 segundos para Server Functions concorrentes
  const memoKey = resolveMemoKey(capturedCookie, capturedHost);
  const now = Date.now();
  if (memoKey !== "unscoped") {
    const cached = IDENTITY_MEMO_CACHE.get(memoKey);
    if (cached && cached.expiresAt > now && cached.identity?.id) {
      if (evt?.context) evt.context.__server_identity__ = cached.identity;
      return cached.identity;
    }

    // Deduplicação de Promises em voo: impede que N chamadas simultâneas disparem N refreshes concorrentes
    const inflight = IDENTITY_INFLIGHT_MAP.get(memoKey);
    if (inflight) {
      const resolved = await inflight;
      if (evt?.context) evt.context.__server_identity__ = resolved;
      return resolved;
    }
  }

  const ssrClient = getSSRClient();
  const cookieSessionMeta = capturedCookie
    ? inspectCanonicalSessionFromCookies(parseRawCookieStringPreservingDuplicates(capturedCookie))
    : null;
  const hasAnyAuthCookie =
    Boolean(cookieSessionMeta?.refreshToken) ||
    capturedCookie.includes("waesy-auth-token") ||
    capturedCookie.includes("-auth-token");

  const withAuthTimeout = <T>(p: Promise<T>, ms = 4500): Promise<T | null> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return Promise.race([
      p.catch(() => null),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms);
      }),
    ]).finally(() => {
      if (timer !== undefined) clearTimeout(timer);
    });
  };

  const resolutionPromise = (async (): Promise<ServerIdentity> => {
    let user: any = null;
    try {
      const authRes = await withAuthTimeout(ssrClient.auth.getUser(), 4500);
      user = authRes?.data?.user || null;

      // Se getUser retornou null (ex: token de acesso de 1h expirou ou storage foi limpo por _removeSession),
      // tenta refresh automático passando explicitamente o refresh_token extraído do cookie canônico.
      if (!user && hasAnyAuthCookie) {
        try {
          const refreshRes = await withAuthTimeout(
            cookieSessionMeta?.refreshToken
              ? ssrClient.auth.refreshSession({
                  refresh_token: cookieSessionMeta.refreshToken,
                })
              : ssrClient.auth.refreshSession(),
            4500,
          );
          if (refreshRes?.data?.user) {
            user = refreshRes.data.user;
          } else if (typeof ssrClient.auth.getSession === "function") {
            const sessionRes = await withAuthTimeout(ssrClient.auth.getSession(), 2500);
            if (sessionRes?.data?.session?.user) {
              user = sessionRes.data.session.user;
            }
          }
        } catch {
          // Ignora falha de refresh silenciosamente
        }
      }
    } catch {
      user = null;
    }

    const serverClient = getServerClient();
    let memberships: any[] = [];

    if (!user) {
      let activeStoreId: string | null = null;
      try {
        const { resolveTenantStoreId } = await import("@/lib/tenant.server");
        activeStoreId =
          (await resolveTenantStoreId({ rawCookie: capturedCookie, host: capturedHost })) ?? null;
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
      return guestIdentity;
    }

    // ── Passo 1: Busca em paralelo de Perfil completo e Vínculos canônicos (1 roundtrip)
    let userProfile: any = null;
    let userProfileRole = "customer";
    let memberRows: any[] = [];

    try {
      const profilePromise = serverClient
        .from("profiles")
        .select("id, full_name, username, avatar_url, role, phone, cpf")
        .eq("id", user.id)
        .maybeSingle();

      const wmProfilePromise = serverClient
        .from("workspace_members")
        .select("store_id, role")
        .eq("profile_id", user.id);

      const wmUserPromise = Promise.resolve(
        serverClient
          .from("workspace_members")
          .select("store_id, role")
          .eq("user_id", user.id),
      ).catch(() => ({ data: [] }));

      const directStoresPromise = Promise.resolve(
        serverClient
          .from("stores")
          .select("id")
          .eq("context_profile_id", user.id),
      ).catch(() => ({ data: [] }));

      const [profileRes, wmRes, wmUserRes, directStoresRes] = await Promise.all([
        profilePromise,
        wmProfilePromise,
        wmUserPromise,
        directStoresPromise,
      ]);

      userProfile = profileRes?.data || null;
      userProfileRole = userProfile?.role || "customer";
      const rawRows = [...(wmRes?.data || []), ...(wmUserRes?.data || [])];
      const seenStoreRoles = new Set<string>();
      memberRows = [];
      rawRows.forEach((r: any) => {
        if (r && r.store_id) {
          const key = `${r.store_id}:${r.role || "owner"}`;
          if (!seenStoreRoles.has(key)) {
            seenStoreRoles.add(key);
            memberRows.push(r);
          }
        }
      });

      const directStoreRows = directStoresRes?.data || [];
      if (directStoreRows.length > 0) {
        const existingStoreIds = new Set(memberRows.map((m: any) => m.store_id));
        directStoreRows.forEach((ds: any) => {
          if (ds.id && !existingStoreIds.has(ds.id)) {
            memberRows.push({ store_id: ds.id, role: "owner" });
            existingStoreIds.add(ds.id);
          }
        });
      }
      if (wmRes?.error) {
        console.warn("[identity.server] Erro ao buscar workspace_members:", wmRes.error.message);
      }

      // Fallback defensivo de vínculo (DEC-446): se workspace_members não retornou linhas
      // mas o profile possui store_id associado, inclui como vínculo canônico de lojista.
      if ((!memberRows || memberRows.length === 0) && (userProfile as any)?.store_id) {
        memberRows = [{ store_id: (userProfile as any).store_id, role: userProfileRole || "owner" }];
      }

      // Fallback secundário: verifica se o usuário é organizador proprietário cadastrado na tabela stores
      if (!memberRows || memberRows.length === 0) {
        try {
          const { data: ownedStores } = await serverClient
            .from("stores")
            .select("id")
            .eq("organization_id", user.id)
            .limit(5);
          if (ownedStores && ownedStores.length > 0) {
            memberRows = ownedStores.map((s: any) => ({ store_id: s.id, role: "owner" }));
          }
        } catch {}
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

    const isPlatformAdmin =
      userProfileRole === "platform_admin" ||
      userProfileRole === "master" ||
      userProfileRole === "admin_master" ||
      userProfileRole === "superadmin" ||
      user?.app_metadata?.role === "platform_admin" ||
      user?.app_metadata?.role === "master" ||
      Boolean(user?.app_metadata?.is_master);

    // ── Passo 4: Resolver contexto ativo (Civil vs Creator vs Store) a partir do cookie capturado
    let activeContext = "civil";
    let activeStoreId: string | null = null;

    try {
      if (capturedCookie) {
        const matches = [...capturedCookie.matchAll(/waesy_active_context=([^;]+)/g)];
        if (matches.length > 0) {
          activeContext = decodeURIComponent(matches[matches.length - 1][1].trim());
        }
      }
    } catch {}

    // ── Resolução de store_id via cookie capturado / subdomínio
    try {
      const { resolveTenantStoreId } = await import("@/lib/tenant.server");
      activeStoreId =
        (await resolveTenantStoreId({ rawCookie: capturedCookie, host: capturedHost })) ?? null;
    } catch {
      activeStoreId = null;
    }

    // Se o usuário for platform admin e tiver activeStoreId (ex: via waesy_active_tenant) ou memberships vazio,
    // carrega a loja explicitamente para assegurar contexto de gestão no Workspace sem falso-positivo.
    if (isPlatformAdmin) {
      if (activeStoreId && !memberships.some((m) => m.store_id === activeStoreId)) {
        try {
          const { data: adminTargetStore } = await serverClient
            .from("stores")
            .select("id, name, slug, email, phone, cnpj, address, city, state, zip_code, settings, logo_url")
            .eq("id", activeStoreId)
            .maybeSingle();
          if (adminTargetStore) {
            const settings = (adminTargetStore.settings as Record<string, any>) || {};
            memberships.unshift({
              store_id: adminTargetStore.id,
              role: "owner",
              name: adminTargetStore.name || "Minha Empresa",
              slug: adminTargetStore.slug || "loja",
              logo_url: adminTargetStore.logo_url || settings.logoUrl || settings.logo_url || null,
              segment: settings.segment || settings.type || settings.niche || null,
              type: settings.type || settings.segment || null,
              category: settings.category || settings.segment || null,
              city: adminTargetStore.city || null,
              state: adminTargetStore.state || null,
              settings: settings,
            });
          }
        } catch {}
      } else if (memberships.length === 0) {
        try {
          const { data: latestStore } = await serverClient
            .from("stores")
            .select("id, name, slug, email, phone, cnpj, address, city, state, zip_code, settings, logo_url")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (latestStore) {
            const settings = (latestStore.settings as Record<string, any>) || {};
            memberships.push({
              store_id: latestStore.id,
              role: "owner",
              name: latestStore.name || "Minha Empresa",
              slug: latestStore.slug || "loja",
              logo_url: latestStore.logo_url || settings.logoUrl || settings.logo_url || null,
              segment: settings.segment || settings.type || settings.niche || null,
              type: settings.type || settings.segment || null,
              category: settings.category || settings.segment || null,
              city: latestStore.city || null,
              state: latestStore.state || null,
              settings: settings,
            });
            if (!activeStoreId && activeContext !== "civil") {
              activeStoreId = latestStore.id;
            }
          }
        } catch {}
      }
    }

    const matchedMembership = activeStoreId
      ? memberships.find((m) => m.store_id === activeStoreId)
      : null;

    if (activeContext === "civil") {
      // Se houver tenant explicitamente selecionado e o usuário for membro ou admin master, preserva a loja
      if (matchedMembership) {
        activeStoreId = matchedMembership.store_id;
      } else if (isPlatformAdmin && activeStoreId) {
        // Preserva tenant selecionado por admin master
      } else {
        activeStoreId = null;
      }
    } else if (activeContext === "creator") {
      activeStoreId = null;
    } else if (activeContext === "store") {
      if (matchedMembership) {
        activeStoreId = matchedMembership.store_id;
      } else if (isPlatformAdmin && activeStoreId) {
        // Admin master com permissão de acesso à loja ativa
      } else {
        activeStoreId = memberships[0]?.store_id || null;
      }
    } else {
      activeStoreId = matchedMembership ? matchedMembership.store_id : null;
      activeContext = activeStoreId ? "store" : "civil";
    }

    const currentMembership = activeStoreId
      ? memberships.find((m) => m.store_id === activeStoreId)
      : null;
    const storeRole = (currentMembership?.role as any) || "customer";
    const finalRole = isPlatformAdmin ? "platform_admin" : storeRole;

    const identityData = user.identities?.[0]?.identity_data as Record<string, any> | undefined;
    const resolvedAvatarUrl =
      userProfile?.avatar_url ||
      user.user_metadata?.avatar_url ||
      user.user_metadata?.picture ||
      identityData?.avatar_url ||
      identityData?.picture ||
      null;
    const resolvedUsername = userProfile?.username || user.user_metadata?.username || null;

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
      avatar_url: resolvedAvatarUrl,
      avatarUrl: resolvedAvatarUrl,
      username: resolvedUsername,
      user: user,
      profile: userProfile,
    };

    if (evt?.context) {
      evt.context.__server_identity__ = resolvedIdentity;
    }
    if (memoKey !== "unscoped" && resolvedIdentity?.id) {
      IDENTITY_MEMO_CACHE.set(memoKey, {
        identity: resolvedIdentity,
        expiresAt: Date.now() + 10_000,
      });
    }

    return resolvedIdentity;
  })();

  if (memoKey !== "unscoped") {
    IDENTITY_INFLIGHT_MAP.set(memoKey, resolutionPromise);
  }

  try {
    return await resolutionPromise;
  } finally {
    if (memoKey !== "unscoped") {
      IDENTITY_INFLIGHT_MAP.delete(memoKey);
    }
  }
}
