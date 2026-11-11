import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { getServerClient } from "@/lib/supabase";
import { requireOwner, requireStaff, getServerIdentity } from "@/lib/server-access";
import {
  INGEST_FEATURE_KEY,
  INFOTRAVEL_INGEST_FEATURE_KEY,
  hashToken,
  isExcelenciaTourStore,
} from "@/services/whatsapp-group-ingest.server";

export interface IngestStatusDTO {
  isFeatureGranted: boolean;
  hasActiveToken: boolean;
  activeTokenCount: number;
  lastUsedAt: string | null;
  storeName?: string | null;
  isAdminMasterBypass?: boolean;
}

/** Obtém o status de habilitação e tokens ativos do workspace atual com reconhecimento de Admin Master e Excelência Tour. */
export const getIngestStatusFn = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        featureKey: z.enum(["whatsapp_group_ingest", "infotravel_sync"]).optional(),
      })
      .optional(),
  )
  .handler(async ({ data }): Promise<IngestStatusDTO> => {
    const featureKey = data?.featureKey || INGEST_FEATURE_KEY;
  const staff = await requireStaff();
  const identity = await getServerIdentity();
  const supabase = getServerClient();

  const { data: store } = await supabase
    .from("stores")
    .select("id, name, slug, city, settings")
    .eq("id", staff.store_id)
    .maybeSingle();

  const { data: grant } = await supabase
    .from("workspace_feature_grants")
    .select("enabled")
    .eq("store_id", staff.store_id)
    .eq("feature_key", featureKey)
    .maybeSingle();

  const isAdminMaster = Boolean(
    identity.isPlatformAdmin ||
    identity.role === "platform_admin" ||
    identity.role === "master" ||
    (identity.role as string) === "admin_master" ||
    (staff.role as string) === "platform_admin" ||
    (staff.role as string) === "master" ||
    (staff.role as string) === "admin_master"
  );

  const isExcelencia = isExcelenciaTourStore(store);
  const storeSettings = (store?.settings || {}) as Record<string, any>;
  const authorizedExts = Array.isArray(storeSettings.authorized_extensions)
    ? (storeSettings.authorized_extensions as string[])
    : [];
  const isAuthorizedByStoreSettings =
    authorizedExts.includes("*") ||
    (featureKey === INGEST_FEATURE_KEY && authorizedExts.includes("whatsapp_extension")) ||
    (featureKey === INFOTRAVEL_INGEST_FEATURE_KEY &&
      (authorizedExts.includes("infotravel_extension") || authorizedExts.includes("infotravel_miner")));
  const isFeatureGranted = Boolean(grant?.enabled) || isAdminMaster || isExcelencia || isAuthorizedByStoreSettings;

  // Auto-cura: se o usuário ou loja possui direito mas o registro de grant ainda não constava na tabela, provisiona
  if (isFeatureGranted && !grant?.enabled && staff.store_id) {
    try {
      await supabase
        .from("workspace_feature_grants")
        .upsert(
          {
            store_id: staff.store_id,
            feature_key: featureKey,
            enabled: true,
            granted_at: new Date().toISOString(),
            granted_by: staff.id || identity.id || null,
          },
          { onConflict: "store_id,feature_key" }
        );
    } catch (err) {
      console.warn("[whatsapp-group-ingest] Falha ao auto-provisionar grant:", err);
    }
  }

  const { data: tokens } = await supabase
    .from("ingest_tokens")
    .select("id, last_used_at, expires_at, revoked_at")
    .eq("store_id", staff.store_id)
    .is("revoked_at", null);

  const now = new Date();
  const activeTokens = (tokens || []).filter(
    (t) => !t.revoked_at && (!t.expires_at || new Date(t.expires_at) > now)
  );

  let lastUsedAt: string | null = null;
  for (const t of tokens || []) {
    if (t.last_used_at) {
      if (!lastUsedAt || new Date(t.last_used_at) > new Date(lastUsedAt)) {
        lastUsedAt = t.last_used_at;
      }
    }
  }

  return {
    isFeatureGranted,
    hasActiveToken: activeTokens.length > 0,
    activeTokenCount: activeTokens.length,
    lastUsedAt,
    storeName: store?.name || null,
    isAdminMasterBypass: isAdminMaster && !isExcelencia,
  };
});

/** Emite um token de ingestão. O valor em claro é devolvido UMA vez; só o hash é salvo. */
export const issueIngestTokenFn = createServerFn({ method: "POST" })
  .validator(z.object({ label: z.string().trim().max(80).optional(), featureKey: z.enum(["whatsapp_group_ingest", "infotravel_sync"]).optional() }))
  .handler(async ({ data }) => {
    const featureKey = data?.featureKey || INGEST_FEATURE_KEY;
    const owner = await requireOwner();
    const identity = await getServerIdentity();
    const supabase = getServerClient();

    const { data: grant } = await supabase
      .from("workspace_feature_grants")
      .select("enabled")
      .eq("store_id", owner.store_id)
      .eq("feature_key", featureKey)
      .maybeSingle();

    let isGranted = Boolean(grant?.enabled);
    if (!isGranted) {
      const { data: store } = await supabase
        .from("stores")
        .select("id, name, slug, city, settings")
        .eq("id", owner.store_id)
        .maybeSingle();

      const isAdminMaster = Boolean(
        identity.isPlatformAdmin ||
        identity.role === "platform_admin" ||
        identity.role === "master" ||
        (identity.role as string) === "admin_master" ||
        (owner.role as string) === "platform_admin" ||
        (owner.role as string) === "master" ||
        (owner.role as string) === "admin_master"
      );

      const storeSettings = (store?.settings || {}) as Record<string, any>;
      const authorizedExts = Array.isArray(storeSettings.authorized_extensions)
        ? (storeSettings.authorized_extensions as string[])
        : [];
      const isAuthorizedByStoreSettings =
        authorizedExts.includes("*") ||
        (featureKey === INGEST_FEATURE_KEY && authorizedExts.includes("whatsapp_extension")) ||
        (featureKey === INFOTRAVEL_INGEST_FEATURE_KEY &&
          (authorizedExts.includes("infotravel_extension") || authorizedExts.includes("infotravel_miner")));

      if (isAdminMaster || isExcelenciaTourStore(store) || isAuthorizedByStoreSettings) {
        isGranted = true;
        try {
          await supabase
            .from("workspace_feature_grants")
            .upsert(
              {
                store_id: owner.store_id,
                feature_key: featureKey,
                enabled: true,
                granted_at: new Date().toISOString(),
                granted_by: owner.id || identity.id || null,
              },
              { onConflict: "store_id,feature_key" }
            );
        } catch (err) {
          console.warn("[whatsapp-group-ingest] Falha ao auto-provisionar grant na emissão:", err);
        }
      }
    }

    if (!isGranted) throw new Error("Recurso não habilitado para este workspace.");

    const token = `wae_${randomBytes(32).toString("hex")}`;
    const { error } = await supabase.from("ingest_tokens").insert({
      store_id: owner.store_id,
      token_hash: hashToken(token),
      label: data.label || "Extensão WhatsApp",
      created_by: owner.id,
      expires_at: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString(),
    });
    if (error) throw new Error("Falha ao emitir token.");
    return { token };
  });

export const revokeIngestTokensFn = createServerFn({ method: "POST" }).handler(async () => {
  const owner = await requireOwner();
  const { error } = await getServerClient()
    .from("ingest_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("store_id", owner.store_id)
    .is("revoked_at", null);
  if (error) throw new Error("Falha ao revogar tokens.");
  return { ok: true };
});
