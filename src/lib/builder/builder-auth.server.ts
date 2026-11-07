/**
 * builder-auth.server.ts — Autorização Zero-Trust e Isolamento Multi-Tenant para Builder Omni & CMS
 *
 * SERVIDOR APENAS. Importar via `@/lib/server-access` em módulos `.functions.ts`.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/identity.server";

export const CANONICAL_PLATFORM_ROOT_ORG_ID = "00000000-0000-0000-0000-000000000001";
export const CANONICAL_PLATFORM_ROOT_STORE_ID = "00000000-0000-0000-0000-000000000002";

export const BUILDER_EDITOR_ROLES = [
  "owner",
  "admin",
  "proprietario",
  "manager",
  "gerente",
  "content",
  "platform_admin",
  "master",
] as const;

const ALLOWED_ROLE_SET = new Set<string>(BUILDER_EDITOR_ROLES);

export interface AuthorizedBuilderContext {
  actorId: string;
  actorRole: string;
  storeId: string;
  isPlatformAdmin: boolean;
  isPlatformRootStore: boolean;
  document?: Record<string, any> | null;
}

export function isPlatformAdminIdentity(identity: {
  id?: string | null;
  role?: string | null;
  isPlatformAdmin?: boolean;
  profile?: { role?: string | null } | null;
  user?: { app_metadata?: Record<string, any> | null } | null;
}): boolean {
  if (!identity?.id) return false;
  const profileRole = identity.profile?.role;
  const appMeta = identity.user?.app_metadata;
  return (
    identity.role === "platform_admin" ||
    identity.role === "master" ||
    identity.role === "admin_master" ||
    identity.role === "superadmin" ||
    identity.role === "super_admin" ||
    profileRole === "platform_admin" ||
    profileRole === "master" ||
    profileRole === "admin_master" ||
    profileRole === "superadmin" ||
    appMeta?.role === "platform_admin" ||
    appMeta?.role === "master" ||
    Boolean(appMeta?.is_master) ||
    Boolean(identity.isPlatformAdmin)
  );
}

/**
 * Resolve apenas para leitura (sem mutação em banco) o ID da loja raiz institucional da plataforma.
 */
export async function findPlatformRootStoreIdReadOnly(
  supabase?: SupabaseClient,
): Promise<string | null> {
  const db = supabase ?? getServerClient();

  try {
    const { data: flaggedRoot } = await db
      .from("stores")
      .select("id")
      .eq("is_platform_root", true)
      .limit(1)
      .maybeSingle();
    if (flaggedRoot?.id) return flaggedRoot.id;
  } catch {}

  try {
    const { data: canonicalUuid } = await db
      .from("stores")
      .select("id")
      .eq("id", CANONICAL_PLATFORM_ROOT_STORE_ID)
      .maybeSingle();
    if (canonicalUuid?.id) return canonicalUuid.id;
  } catch {}

  try {
    const { data: bySlug } = await db
      .from("stores")
      .select("id")
      .in("slug", ["waesy-platform-root", "waesy-matriz", "waesy"])
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (bySlug?.id) return bySlug.id;
  } catch {}

  return null;
}

/**
 * Resolve ou materializa de forma idempotente a loja raiz institucional da plataforma.
 * NUNCA faz fallback para lojas privadas de terceiros.
 */
export async function ensureCanonicalPlatformRootStoreId(
  supabase?: SupabaseClient,
): Promise<string> {
  const db = supabase ?? getServerClient();
  const existing = await findPlatformRootStoreIdReadOnly(db);
  if (existing) return existing;

  let orgId: string | null = null;
  try {
    const { data: existingOrg } = await db
      .from("organizations")
      .select("id")
      .or(`id.eq.${CANONICAL_PLATFORM_ROOT_ORG_ID},slug.in.(waesy-org,waesy-institucional,waesy)`)
      .limit(1)
      .maybeSingle();

    if (existingOrg?.id) {
      orgId = existingOrg.id;
    } else {
      const { data: insertedOrg } = await db
        .from("organizations")
        .upsert(
          {
            id: CANONICAL_PLATFORM_ROOT_ORG_ID,
            name: "Waesy Organization",
            slug: "waesy-org",
          },
          { onConflict: "id" },
        )
        .select("id")
        .maybeSingle();
      if (insertedOrg?.id) {
        orgId = insertedOrg.id;
      } else {
        const { data: fallbackOrg } = await db
          .from("organizations")
          .upsert(
            {
              id: CANONICAL_PLATFORM_ROOT_ORG_ID,
              name: "Waesy Organization",
              slug: "waesy-platform-org",
            },
            { onConflict: "id" },
          )
          .select("id")
          .maybeSingle();
        if (fallbackOrg?.id) orgId = fallbackOrg.id;
      }
    }
  } catch {}

  if (!orgId) {
    try {
      const { data: anyOrg } = await db
        .from("organizations")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (anyOrg?.id) orgId = anyOrg.id;
    } catch {}
  }

  const resolvedOrgId = orgId || CANONICAL_PLATFORM_ROOT_ORG_ID;

  try {
    const { data: upserted, error: upsertErr } = await db
      .from("stores")
      .upsert(
        {
          id: CANONICAL_PLATFORM_ROOT_STORE_ID,
          organization_id: resolvedOrgId,
          name: "Waesy Matriz",
          slug: "waesy-matriz",
          is_active: true,
          is_platform_root: true,
          settings: {
            is_platform_root: true,
            show_name: true,
            show_logo: true,
            description: "Hub Global Waesy Community",
          },
        },
        { onConflict: "id" },
      )
      .select("id")
      .maybeSingle();
    if (!upsertErr && upserted?.id) return upserted.id;
  } catch {}

  // Fallback compatível com schema mínimo e slug exclusivo anti-colisão
  try {
    const { data: minimalStore } = await db
      .from("stores")
      .upsert(
        {
          id: CANONICAL_PLATFORM_ROOT_STORE_ID,
          organization_id: resolvedOrgId,
          name: "Waesy Matriz",
          slug: "waesy-platform-root",
          settings: { is_platform_root: true },
        },
        { onConflict: "id" },
      )
      .select("id")
      .maybeSingle();
    if (minimalStore?.id) return minimalStore.id;
  } catch {}

  const verifiedAfterUpsert = await findPlatformRootStoreIdReadOnly(db);
  if (verifiedAfterUpsert) return verifiedAfterUpsert;

  throw new Error(
    "Falha estrutural ao materializar a loja institucional raiz (Waesy Matriz) no banco de dados.",
  );
}

async function verifyActorHasStoreEditorRole(
  db: SupabaseClient,
  actorId: string,
  storeId: string,
  identityMemberships?: Array<{ store_id?: string; role?: string }>,
): Promise<boolean> {
  // 1. Verifica memberships já carregadas na identidade do request
  if (Array.isArray(identityMemberships)) {
    const matched = identityMemberships.find(
      (m) => m?.store_id === storeId && m?.role && ALLOWED_ROLE_SET.has(String(m.role).toLowerCase()),
    );
    if (matched) return true;
  }

  // 2. Verifica em workspace_members no banco
  const { data: wmRow } = await db
    .from("workspace_members")
    .select("role")
    .eq("profile_id", actorId)
    .eq("store_id", storeId)
    .maybeSingle();

  if (wmRow?.role && ALLOWED_ROLE_SET.has(String(wmRow.role).toLowerCase())) {
    return true;
  }

  // 3. Verifica propriedade direta da loja (stores.owner_id)
  const { data: storeRow } = await db
    .from("stores")
    .select("id, owner_id, is_platform_root")
    .eq("id", storeId)
    .maybeSingle();

  if (storeRow?.is_platform_root) {
    return false;
  }

  if (storeRow?.owner_id && storeRow.owner_id === actorId) {
    return true;
  }

  return false;
}

/**
 * Valida autenticação real e autorização de edição para uma loja ou documento específico.
 * Bloqueia visitantes anônimos (mesmo com cookie/subdomínio de loja), clientes civis,
 * cargos operacionais sem permissão editorial (driver, seller, stock, support) e acessos cruzados entre tenants.
 */
export async function authorizeBuilderStoreContext(options?: {
  requestedStoreId?: string | null;
  documentId?: string | null;
  allowPlatformRootForGlobalAdmin?: boolean;
}): Promise<AuthorizedBuilderContext> {
  const identity = await getServerIdentity();
  if (!identity.id) {
    throw new Error("Unauthorized: Autenticação obrigatória para operar o Builder e CMS.");
  }

  const db = getServerClient();
  const isPlatformAdmin = isPlatformAdminIdentity(identity as any);
  const platformRootId = await findPlatformRootStoreIdReadOnly(db);

  // Caso 1: Autorização ancorada em um documento existente
  if (options?.documentId) {
    const { data: doc, error: docErr } = await db
      .from("experience_documents")
      .select("*")
      .eq("id", options.documentId)
      .maybeSingle();

    if (docErr) throw docErr;
    if (!doc) {
      throw new Error("NotFound: Documento não encontrado.");
    }

    const docStoreId = String(doc.store_id || "");
    if (!docStoreId) {
      throw new Error("Forbidden: Documento sem escopo de loja válido.");
    }

    const docSettings = (doc.settings || {}) as Record<string, any>;
    const isPlatformSurfaceDoc =
      Boolean(docSettings.is_platform_surface) ||
      Boolean(docSettings.platform_page_slug) ||
      docStoreId === CANONICAL_PLATFORM_ROOT_STORE_ID ||
      (Boolean(platformRootId) && docStoreId === platformRootId);

    if (isPlatformSurfaceDoc) {
      if (!isPlatformAdmin) {
        throw new Error("Forbidden: Apenas administradores Master podem acessar documentos globais da plataforma.");
      }
      return {
        actorId: identity.id,
        actorRole: identity.role,
        storeId: docStoreId,
        isPlatformAdmin: true,
        isPlatformRootStore: true,
        document: doc,
      };
    }

    if (isPlatformAdmin) {
      return {
        actorId: identity.id,
        actorRole: identity.role,
        storeId: docStoreId,
        isPlatformAdmin: true,
        isPlatformRootStore: false,
        document: doc,
      };
    }

    const allowed = await verifyActorHasStoreEditorRole(
      db,
      identity.id,
      docStoreId,
      (identity as any).memberships,
    );
    if (!allowed) {
      throw new Error("Forbidden: Acesso negado ao documento desta empresa.");
    }

    return {
      actorId: identity.id,
      actorRole: identity.role,
      storeId: docStoreId,
      isPlatformAdmin: false,
      isPlatformRootStore: false,
      document: doc,
    };
  }

  // Caso 2: Autorização ancorada em loja solicitada ou loja ativa da sessão
  const candidateStoreId = options?.requestedStoreId || identity.store_id || null;

  if (!candidateStoreId) {
    if (isPlatformAdmin && options?.allowPlatformRootForGlobalAdmin !== false) {
      const rootId = await ensureCanonicalPlatformRootStoreId(db);
      return {
        actorId: identity.id,
        actorRole: identity.role,
        storeId: rootId,
        isPlatformAdmin: true,
        isPlatformRootStore: true,
        document: null,
      };
    }
    throw new Error("Forbidden: Nenhuma empresa ativa associada a esta conta.");
  }

  const isCandidatePlatformRoot =
    candidateStoreId === CANONICAL_PLATFORM_ROOT_STORE_ID ||
    (Boolean(platformRootId) && candidateStoreId === platformRootId);

  if (isCandidatePlatformRoot) {
    if (!isPlatformAdmin) {
      throw new Error("Forbidden: Apenas administradores Master podem operar na loja raiz da plataforma.");
    }
    const resolvedRootId = platformRootId || (await ensureCanonicalPlatformRootStoreId(db));
    return {
      actorId: identity.id,
      actorRole: identity.role,
      storeId: resolvedRootId,
      isPlatformAdmin: true,
      isPlatformRootStore: true,
      document: null,
    };
  }

  if (isPlatformAdmin) {
    return {
      actorId: identity.id,
      actorRole: identity.role,
      storeId: candidateStoreId,
      isPlatformAdmin: true,
      isPlatformRootStore: false,
      document: null,
    };
  }

  const allowed = await verifyActorHasStoreEditorRole(
    db,
    identity.id,
    candidateStoreId,
    (identity as any).memberships,
  );
  if (!allowed) {
    throw new Error("Forbidden: Permissão insuficiente para gerenciar páginas desta empresa.");
  }

  return {
    actorId: identity.id,
    actorRole: identity.role,
    storeId: candidateStoreId,
    isPlatformAdmin: false,
    isPlatformRootStore: false,
    document: null,
  };
}
