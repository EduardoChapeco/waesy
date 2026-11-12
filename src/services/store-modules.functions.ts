import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { assertStoreAccess, getServerIdentity } from "@/lib/server-access";
import {
  COMMERCIAL_MODULE_CATALOG,
  STORE_PLANS,
  CommercialModuleId,
  StorePlanTier,
  isStoreModuleActive,
} from "@/lib/architecture/module-plan-governance";

export const getStorePlanOverview = createServerFn({ method: "GET" })
  .validator(z.object({ storeId: z.string().uuid() }))
  .handler(async ({ data: { storeId } }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "platform_admin", "manager", "operator"], storeId);

    const db = getServerClient();
    const { data: store, error } = await db
      .from("stores")
      .select("id, name, slug, plan_tier, settings, created_at")
      .eq("id", storeId)
      .single();

    if (error || !store) throw new Error("Loja não encontrada.");

    const rawTier = (store.plan_tier || store.settings?.plan_tier || "free").toLowerCase() as StorePlanTier;
    const currentPlan = STORE_PLANS[rawTier] || STORE_PLANS.free;
    const storeSettings = (store.settings && typeof store.settings === "object" ? store.settings : {}) as Record<string, any>;
    const activeAddons: string[] = Array.isArray(storeSettings.active_modules) ? storeSettings.active_modules : [];

    const modulesStatus = Object.values(COMMERCIAL_MODULE_CATALOG).map((mod) => {
      const isIncludedInPlan = currentPlan.includedModules.includes(mod.id);
      const isSubscribedAsAddon = activeAddons.includes(mod.id);
      const isActive = isIncludedInPlan || isSubscribedAsAddon || Boolean(storeSettings.all_modules_enabled);

      return {
        ...mod,
        isActive,
        isIncludedInPlan,
        isSubscribedAsAddon,
      };
    });

    return {
      store: {
        id: store.id,
        name: store.name,
        slug: store.slug,
        tier: currentPlan.tier,
        planName: currentPlan.name,
      },
      plan: currentPlan,
      modules: modulesStatus,
      availablePlans: Object.values(STORE_PLANS),
    };
  });

export const toggleStoreModuleAddon = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid(),
      moduleId: z.enum([
        "module_omnichannel_whatsapp",
        "module_ai_copilot_voice",
        "module_financial_erp",
        "module_tourism_studio",
        "module_food_delivery",
        "module_ads_booster",
      ]),
      active: z.boolean(),
    })
  )
  .handler(async ({ data: { storeId, moduleId, active } }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "platform_admin"], storeId);

    const db = getServerClient();
    const { data: store } = await db
      .from("stores")
      .select("id, settings")
      .eq("id", storeId)
      .single();

    if (!store) throw new Error("Loja não encontrada.");

    const currentSettings = (store.settings && typeof store.settings === "object" ? store.settings : {}) as Record<string, any>;
    const currentActiveModules: string[] = Array.isArray(currentSettings.active_modules) ? [...currentSettings.active_modules] : [];

    let nextModules: string[];
    if (active) {
      if (!currentActiveModules.includes(moduleId)) {
        currentActiveModules.push(moduleId);
      }
      nextModules = currentActiveModules;
    } else {
      nextModules = currentActiveModules.filter((m) => m !== moduleId);
    }

    const nextSettings = {
      ...currentSettings,
      active_modules: nextModules,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await db
      .from("stores")
      .update({ settings: nextSettings })
      .eq("id", storeId);

    if (updateError) throw updateError;

    return {
      success: true,
      moduleId,
      active,
      activeModules: nextModules,
    };
  });

export const updateStorePlanTier = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid(),
      planTier: z.enum(["free", "starter", "professional", "enterprise"]),
    })
  )
  .handler(async ({ data: { storeId, planTier } }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "platform_admin"], storeId);

    const db = getServerClient();
    const { data: store } = await db
      .from("stores")
      .select("id, settings")
      .eq("id", storeId)
      .single();

    if (!store) throw new Error("Loja não encontrada.");

    const currentSettings = (store.settings && typeof store.settings === "object" ? store.settings : {}) as Record<string, any>;
    const nextSettings = {
      ...currentSettings,
      plan_tier: planTier,
      updated_at: new Date().toISOString(),
    };

    const { error } = await db
      .from("stores")
      .update({ plan_tier: planTier, settings: nextSettings })
      .eq("id", storeId);

    if (error) throw error;
    return { success: true, storeId, planTier };
  });
