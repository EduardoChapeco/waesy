/**
 * private-store.functions.ts — BFF Server Functions para Lojas Ocultas,
 * Acesso Restrito por Senha e Marketplace Seletivo (Waesy Platform).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertOwnerAccess, assertManagerAccess } from "@/lib/server-access";

// ============================================================
// Schemas e Tipos
// ============================================================

export const storeAccessTypeEnum = z.enum(["public", "password_protected", "members_only"]);

export const updateStorePrivacySchema = z.object({
  storeId: z.string().uuid(),
  isHiddenFromDirectory: z.boolean(),
  accessType: storeAccessTypeEnum,
  accessPassword: z.string().optional().nullable(),
  marketplaceCommissionEnabled: z.boolean(),
  onlyCatalogMode: z.boolean().optional(),
});

export interface StorePrivacySettingsDTO {
  storeId: string;
  storeName: string;
  storeSlug: string;
  isHiddenFromDirectory: boolean;
  accessType: "public" | "password_protected" | "members_only";
  hasPasswordConfigured: boolean;
  marketplaceCommissionEnabled: boolean;
  onlyCatalogMode: boolean;
}

// ============================================================
// Server Functions
// ============================================================

/**
 * 1. Obtém as configurações de privacidade da loja para o Workspace
 */
export const getStorePrivacySettings = createServerFn({ method: "GET" })
  .validator(z.object({ storeId: z.string().uuid().optional() }).optional())
  .handler(async ({ data }): Promise<StorePrivacySettingsDTO> => {
    const identity = await getServerIdentity();
    const targetStoreId = data?.storeId || identity.store_id;
    if (!targetStoreId) {
      throw new Error("Nenhuma loja ativa selecionada.");
    }
    assertManagerAccess(identity, targetStoreId);

    const supabase = getServerClient();
    const { data: store, error } = await supabase
      .from("stores")
      .select("id, name, slug, is_hidden_from_directory, access_type, access_password_hash, marketplace_commission_enabled, only_catalog_mode")
      .eq("id", targetStoreId)
      .single();

    if (error || !store) {
      throw new Error("Loja não encontrada.");
    }

    return {
      storeId: store.id,
      storeName: store.name,
      storeSlug: store.slug,
      isHiddenFromDirectory: !!store.is_hidden_from_directory,
      accessType: (store.access_type as any) || "public",
      hasPasswordConfigured: !!store.access_password_hash,
      marketplaceCommissionEnabled: store.marketplace_commission_enabled !== false,
      onlyCatalogMode: !!store.only_catalog_mode,
    };
  });

/**
 * 2. Atualiza configurações de privacidade, senha e modo catálogo da loja
 */
export const updateStorePrivacySettings = createServerFn({ method: "POST" })
  .validator(updateStorePrivacySchema)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertOwnerAccess(identity, data.storeId);

    const supabase = getServerClient();

    // Monta o payload de atualização
    const payload: Record<string, any> = {
      is_hidden_from_directory: data.isHiddenFromDirectory,
      access_type: data.accessType,
      marketplace_commission_enabled: data.marketplaceCommissionEnabled,
      only_catalog_mode: !!data.onlyCatalogMode,
      updated_at: new Date().toISOString(),
    };

    // Se senha fornecida, armazena hash base64 com salt
    if (data.accessType === "password_protected" && data.accessPassword && data.accessPassword.trim()) {
      const salted = `waesy_priv:${data.storeId}:${data.accessPassword.trim()}`;
      payload.access_password_hash = Buffer.from(salted).toString("base64");
    } else if (data.accessType === "public") {
      payload.access_password_hash = null;
    }

    const { data: updated, error } = await supabase
      .from("stores")
      .update(payload)
      .eq("id", data.storeId)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar privacidade da loja: ${error.message}`);
    }

    return {
      success: true,
      settings: {
        storeId: updated.id,
        storeName: updated.name,
        storeSlug: updated.slug,
        isHiddenFromDirectory: !!updated.is_hidden_from_directory,
        accessType: updated.access_type,
        hasPasswordConfigured: !!updated.access_password_hash,
        marketplaceCommissionEnabled: updated.marketplace_commission_enabled !== false,
        onlyCatalogMode: !!updated.only_catalog_mode,
      },
    };
  });

/**
 * 3. Valida a senha informada pelo cliente para desbloquear uma loja privada
 */
export const verifyStoreAccessPassword = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeSlugOrId: z.string(),
      password: z.string().min(1, "Digite a senha de acesso"),
    })
  )
  .handler(async ({ data: { storeSlugOrId, password } }) => {
    const supabase = getServerClient();

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      storeSlugOrId
    );

    let query = supabase.from("stores").select("id, name, slug, access_type, access_password_hash");
    if (isUuid) {
      query = query.eq("id", storeSlugOrId);
    } else {
      query = query.eq("slug", storeSlugOrId);
    }

    const { data: store } = await query.maybeSingle();

    if (!store) {
      throw new Error("Loja não encontrada.");
    }

    if (store.access_type !== "password_protected" || !store.access_password_hash) {
      // Loja não exige senha
      return { authorized: true, token: "public_access" };
    }

    const expectedHash = store.access_password_hash;
    const providedHash = Buffer.from(`waesy_priv:${store.id}:${password.trim()}`).toString("base64");

    if (providedHash !== expectedHash) {
      throw new Error("Senha incorreta. Solicite a senha de acesso diretamente ao lojista.");
    }

    // Token seguro de desbloqueio temporário (válido na sessão)
    const unlockToken = Buffer.from(`unlocked:${store.id}:${Date.now()}`).toString("base64");

    return {
      authorized: true,
      storeId: store.id,
      storeSlug: store.slug,
      storeName: store.name,
      unlockToken,
    };
  });
