/**
 * multi-brand.functions.ts — BFF de Governança Multi-Marca, Planos & Desacoplamento de Marketplace
 *
 * Responsabilidades:
 * 1. Consultar estado de Opt-In de Marketplace e Vertical de Marca da empresa.
 * 2. Alternar soberanamente o canal Waesy Marketplace (Opt-In vs 100% Private SaaS).
 * 3. Alternar visibilidade individual ou em lote de produtos no Marketplace compartilhado.
 * 4. Configurar marca vertical (WowBook, TableWay, Turis, PassHub, LexCloud, etc.) e Tier do plano.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertManagerAccess, requireAdmin } from "@/lib/server-access";
import {
  type BrandVerticalId,
  type SubscriptionTierId,
  getBrandVerticalById,
  getTierModules,
  shouldPublishStoreToMarketplace,
  shouldPublishItemToMarketplace,
} from "@/lib/multi-brand-engine";

async function resolveAuthorizedStoreId(requestedStoreId?: string | null): Promise<string | null> {
  const identity = await getServerIdentity();
  if (requestedStoreId && identity) {
    assertManagerAccess(identity, requestedStoreId);
    return requestedStoreId;
  }
  const auth = await requireAdmin();
  return requestedStoreId || auth.store_id || null;
}

const BrandVerticalEnum = z.enum([
  "waesy",
  "wowbook",
  "tableway",
  "turis",
  "passhub",
  "lexcloud",
  "talentlink",
  "omnipage",
  "signflow",
  "waesy_news",
  "waesy_copilot",
  "waesy_studio",
]);

const SubscriptionTierEnum = z.enum(["starter", "pro", "enterprise"]);

const GetGovernanceSchema = z.object({
  storeId: z.string().uuid().optional(),
});

const UpdateMarketplaceOptInSchema = z.object({
  storeId: z.string().uuid().optional(),
  waesyMarketplaceEnabled: z.boolean(),
  publishToMarketplace: z.boolean().optional(),
  applyToAllProducts: z.boolean().optional(),
});

const UpdateBrandAndTierSchema = z.object({
  storeId: z.string().uuid().optional(),
  brandOrigin: BrandVerticalEnum,
  subscriptionTier: SubscriptionTierEnum.optional(),
  enabledModules: z.array(z.string()).optional(),
  customDomain: z.string().max(160).nullable().optional(),
});

const ToggleProductMarketplaceSchema = z.object({
  storeId: z.string().uuid().optional(),
  productIds: z.array(z.string().uuid()).min(1),
  isPublishedToMarketplace: z.boolean(),
});

export interface StoreMultiBrandGovernanceDTO {
  storeId: string;
  storeName: string;
  waesyMarketplaceEnabled: boolean;
  publishToMarketplace: boolean;
  isEffectivelyPublished: boolean;
  brandOrigin: BrandVerticalId;
  subscriptionTier: SubscriptionTierId;
  enabledModules: string[];
  customDomain: string | null;
  totalProducts: number;
  marketplaceProductsCount: number;
  privateOnlyProductsCount: number;
}

export const getStoreMultiBrandGovernanceFn = createServerFn({ method: "GET" })
  .validator((input?: unknown) => (input ? GetGovernanceSchema.parse(input) : undefined))
  .handler(async ({ data }): Promise<StoreMultiBrandGovernanceDTO | null> => {
    const requestedStoreId = data?.storeId;
    const targetStoreId = await resolveAuthorizedStoreId(requestedStoreId);
    if (!targetStoreId) return null;

    const db = getServerClient();
    const { data: store, error } = await db
      .from("stores")
      .select(
        "id, name, publish_to_marketplace, waesy_marketplace_enabled, brand_origin, subscription_tier, enabled_modules, custom_domain, settings",
      )
      .eq("id", targetStoreId)
      .maybeSingle();

    if (error || !store) return null;

    const settings = (store.settings ?? {}) as Record<string, any>;
    const brandOriginRaw =
      (store.brand_origin as string | null) ||
      (settings.brand_origin as string | null) ||
      "waesy";
    const brandConfig = getBrandVerticalById(brandOriginRaw);

    const tierRaw = (
      (store.subscription_tier as string | null) ||
      (settings.subscription_tier as string | null) ||
      "enterprise"
    ).toLowerCase() as SubscriptionTierId;

    const waesyMarketplaceEnabled =
      typeof store.waesy_marketplace_enabled === "boolean"
        ? store.waesy_marketplace_enabled
        : typeof settings.waesy_marketplace_enabled === "boolean"
          ? settings.waesy_marketplace_enabled
          : true;

    const publishToMarketplace =
      typeof store.publish_to_marketplace === "boolean"
        ? store.publish_to_marketplace
        : typeof settings.publish_to_marketplace === "boolean"
          ? settings.publish_to_marketplace
          : true;

    const enabledModules = Array.isArray(store.enabled_modules) && store.enabled_modules.length > 0
      ? store.enabled_modules
      : Array.isArray(settings.enabled_modules) && settings.enabled_modules.length > 0
        ? settings.enabled_modules
        : getTierModules(tierRaw, brandConfig.id);

    const { data: products } = await db
      .from("products")
      .select("id, is_published_to_marketplace, metadata")
      .eq("store_id", targetStoreId);

    const allProducts = products ?? [];
    let marketplaceProductsCount = 0;
    let privateOnlyProductsCount = 0;

    for (const item of allProducts) {
      if (shouldPublishItemToMarketplace(item)) {
        marketplaceProductsCount++;
      } else {
        privateOnlyProductsCount++;
      }
    }

    return {
      storeId: store.id,
      storeName: store.name || "Empresa",
      waesyMarketplaceEnabled,
      publishToMarketplace,
      isEffectivelyPublished: shouldPublishStoreToMarketplace(store),
      brandOrigin: brandConfig.id,
      subscriptionTier: tierRaw,
      enabledModules,
      customDomain: (store.custom_domain as string | null) ?? (settings.custom_domain as string | null) ?? null,
      totalProducts: allProducts.length,
      marketplaceProductsCount,
      privateOnlyProductsCount,
    };
  });

export const updateStoreMarketplaceOptInFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => UpdateMarketplaceOptInSchema.parse(input))
  .handler(async ({ data }) => {
    const {
      storeId: requestedStoreId,
      waesyMarketplaceEnabled,
      publishToMarketplace,
      applyToAllProducts,
    } = data;

    const targetStoreId = await resolveAuthorizedStoreId(requestedStoreId);
    if (!targetStoreId) {
      throw new Error("Loja não identificada para atualizar governança de marketplace.");
    }

    const effectivePublish = publishToMarketplace ?? waesyMarketplaceEnabled;
    const db = getServerClient();

    const { data: currentStore } = await db
      .from("stores")
      .select("settings")
      .eq("id", targetStoreId)
      .maybeSingle();

    const nextSettings = {
      ...((currentStore?.settings as Record<string, any>) ?? {}),
      waesy_marketplace_enabled: waesyMarketplaceEnabled,
      publish_to_marketplace: effectivePublish,
    };

    const { error: updateError } = await db
      .from("stores")
      .update({
        waesy_marketplace_enabled: waesyMarketplaceEnabled,
        publish_to_marketplace: effectivePublish,
        settings: nextSettings,
      })
      .eq("id", targetStoreId);

    if (updateError) {
      throw new Error(`Falha ao salvar configuração de marketplace: ${updateError.message}`);
    }

    // Sincroniza directory_listings para refletir imediatamente na vitrine pública
    await db
      .from("directory_listings")
      .update({
        is_published_to_marketplace: waesyMarketplaceEnabled && effectivePublish,
        updated_at: new Date().toISOString(),
      })
      .eq("store_id", targetStoreId);

    if (typeof applyToAllProducts === "boolean") {
      await db
        .from("products")
        .update({
          is_published_to_marketplace: applyToAllProducts ? waesyMarketplaceEnabled && effectivePublish : false,
        })
        .eq("store_id", targetStoreId);
    }

    return {
      success: true,
      storeId: targetStoreId,
      waesyMarketplaceEnabled,
      publishToMarketplace: effectivePublish,
    };
  });

export const updateStoreBrandAndTierFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => UpdateBrandAndTierSchema.parse(input))
  .handler(async ({ data }) => {
    const {
      storeId: requestedStoreId,
      brandOrigin,
      subscriptionTier,
      enabledModules,
      customDomain,
    } = data;

    const targetStoreId = await resolveAuthorizedStoreId(requestedStoreId);
    if (!targetStoreId) {
      throw new Error("Loja não identificada para atualizar marca vertical e plano.");
    }

    const brandConfig = getBrandVerticalById(brandOrigin);
    const effectiveTier: SubscriptionTierId = subscriptionTier || "enterprise";
    const resolvedModules =
      Array.isArray(enabledModules) && enabledModules.length > 0
        ? enabledModules
        : getTierModules(effectiveTier, brandConfig.id);

    const sanitizedDomain = customDomain
      ? customDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "")
      : null;

    const db = getServerClient();
    const { data: currentStore } = await db
      .from("stores")
      .select("settings")
      .eq("id", targetStoreId)
      .maybeSingle();

    const nextSettings = {
      ...((currentStore?.settings as Record<string, any>) ?? {}),
      brand_origin: brandConfig.id,
      subscription_tier: effectiveTier,
      enabled_modules: resolvedModules,
      custom_domain: sanitizedDomain,
    };

    const { error } = await db
      .from("stores")
      .update({
        brand_origin: brandConfig.id,
        subscription_tier: effectiveTier,
        enabled_modules: resolvedModules,
        custom_domain: sanitizedDomain,
        settings: nextSettings,
      })
      .eq("id", targetStoreId);

    if (error) {
      throw new Error(`Falha ao salvar vertical e plano da loja: ${error.message}`);
    }

    return {
      success: true,
      storeId: targetStoreId,
      brandOrigin: brandConfig.id,
      subscriptionTier: effectiveTier,
      enabledModules: resolvedModules,
      customDomain: sanitizedDomain,
    };
  });

export const toggleProductMarketplaceVisibilityFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => ToggleProductMarketplaceSchema.parse(input))
  .handler(async ({ data }) => {
    const {
      storeId: requestedStoreId,
      productIds,
      isPublishedToMarketplace,
    } = data;

    const targetStoreId = await resolveAuthorizedStoreId(requestedStoreId);
    if (!targetStoreId) {
      throw new Error("Loja não identificada para alterar visibilidade de itens.");
    }

    const db = getServerClient();
    const { error } = await db
      .from("products")
      .update({ is_published_to_marketplace: isPublishedToMarketplace })
      .eq("store_id", targetStoreId)
      .in("id", productIds);

    if (error) {
      throw new Error(`Falha ao atualizar visibilidade no marketplace: ${error.message}`);
    }

    return {
      success: true,
      updatedCount: productIds.length,
      isPublishedToMarketplace,
    };
  });
