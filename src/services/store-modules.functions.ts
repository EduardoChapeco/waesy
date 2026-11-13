import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { assertStoreAccess, getServerIdentity, requirePlatformAdmin } from "@/lib/server-access";
import { buildPlatformInvoiceInsertRow } from "./billing.functions";
import { resolveUnifiedNicheId, type VerticalPlanSkuId } from "@/lib/niches/niche-ssot";
import {
  COMMERCIAL_MODULE_CATALOG,
  STORE_PLANS,
  STAFF_MEMBER_ROLES,
  VERTICAL_PLAN_CATALOG,
  CommercialModuleId,
  StorePlanTier,
  isStoreModuleActive,
  isStorePlanExempt,
  calculateStoreMonthlyPlanTotalCents,
  resolveStoreWorkspaceCapabilities,
} from "@/lib/architecture/module-plan-governance";

const STORE_GOVERNANCE_SELECT =
  "id, name, slug, is_platform_root, plan_tier, subscription_tier, subscription_status, trial_ends_at, billing_cycle, vertical_sku, primary_niche_id, enabled_niches, enabled_modules, quota_overrides, settings, created_at";

const VERTICAL_SKU_ENUM = z.enum([
  "waesy_salon_beauty",
  "waesy_barbershop",
  "waesy_health_clinic",
  "waesy_gastro_delivery",
  "waesy_automotive_workshop",
  "waesy_tourism_pro",
  "waesy_real_estate",
  "waesy_retail_commerce",
  "waesy_legal_office",
  "waesy_bundle_pro",
]);

function buildImmediatePlanInvoiceRow(storeId: string, amountCents: number, description: string) {
  const start = new Date();
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return buildPlatformInvoiceInsertRow({
    storeId,
    periodStart: start.toISOString().slice(0, 10),
    periodEnd: end.toISOString().slice(0, 10),
    platformFeeCents: amountCents,
    description,
    notes: "Gerado automaticamente via autoatendimento de Assinaturas & Verticais.",
  });
}

export const getStorePlanOverview = createServerFn({ method: "GET" })
  .validator(z.object({ storeId: z.string().uuid() }))
  .handler(async ({ data: { storeId } }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "platform_admin", "manager", "operator"], storeId);

    const db = getServerClient();
    const [{ data: store, error }, staffRes, instancesRes, catalogRes, invoicesRes] = await Promise.all([
      db
        .from("stores")
        .select(STORE_GOVERNANCE_SELECT)
        .eq("id", storeId)
        .single(),
      db
        .from("workspace_members")
        .select("profile_id", { count: "exact", head: true })
        .eq("store_id", storeId)
        .in("role", [...STAFF_MEMBER_ROLES]),
      db
        .from("whatsapp_channel_instances")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId)
        .eq("is_active", true),
      db
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId),
      db
        .from("platform_invoices")
        .select("id, description, amount_cents, status, due_date, paid_at, created_at")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

    if (error || !store) throw new Error("Loja não encontrada.");

    const rawTier = (store.plan_tier || store.settings?.plan_tier || "free").toLowerCase() as StorePlanTier;
    const currentPlan = STORE_PLANS[rawTier] || STORE_PLANS.free;
    const storeSettings = (store.settings && typeof store.settings === "object" ? store.settings : {}) as Record<string, any>;
    const activeAddons: string[] = Array.isArray(storeSettings.active_modules) ? storeSettings.active_modules : [];
    const exempt = isStorePlanExempt(store);
    const resolved = resolveStoreWorkspaceCapabilities(store);

    const modulesStatus = Object.values(COMMERCIAL_MODULE_CATALOG).map((mod) => {
      const isIncludedInPlan =
        currentPlan.includedModules.includes(mod.id) ||
        resolved.verticalPlan.includedModules.includes(mod.id);
      const isSubscribedAsAddon = activeAddons.includes(mod.id);
      const isActive = isStoreModuleActive(store, mod.id);

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
        planName: store.vertical_sku ? resolved.verticalPlan.name : currentPlan.name,
        isExempt: exempt,
        verticalSku: resolved.verticalSku,
        primaryNicheId: resolved.primaryNicheId,
        enabledNiches: resolved.enabledNiches,
        subscriptionStatus: resolved.subscriptionStatus,
        trialEndsAt: store.trial_ends_at || null,
        billingCycle: store.billing_cycle || "monthly",
      },
      plan: currentPlan,
      verticalPlan: resolved.verticalPlan,
      capabilities: resolved.capabilities,
      usage: {
        staffCount: staffRes.count || 0,
        maxStaffUsers: resolved.limits.maxTeamMembers,
        whatsAppInstancesCount: instancesRes.count || 0,
        maxWhatsAppInstances: resolved.limits.maxWhatsappInstances,
        catalogItemsCount: catalogRes.count || 0,
        maxCatalogItems: resolved.limits.maxCatalogItems,
        maxMonthlyAiCalls: resolved.limits.maxMonthlyAiCalls,
      },
      monthlyTotalCents: calculateStoreMonthlyPlanTotalCents(store),
      invoices: invoicesRes.data || [],
      modules: modulesStatus,
      availablePlans: Object.values(STORE_PLANS),
      availableVerticalPlans: Object.values(VERTICAL_PLAN_CATALOG),
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
    await requirePlatformAdmin();

    const db = getServerClient();
    const { data: store } = await db
      .from("stores")
      .select(STORE_GOVERNANCE_SELECT)
      .eq("id", storeId)
      .single();

    if (!store) throw new Error("Loja não encontrada.");

    const currentSettings = (store.settings && typeof store.settings === "object" ? store.settings : {}) as Record<string, any>;
    const currentActiveModules: string[] = Array.isArray(currentSettings.active_modules) ? [...currentSettings.active_modules] : [];
    const currentEnabledCols: string[] = Array.isArray(store.enabled_modules) ? [...store.enabled_modules] : [];

    let nextModules: string[];
    let nextEnabledCols: string[];
    if (active) {
      if (!currentActiveModules.includes(moduleId)) {
        currentActiveModules.push(moduleId);
      }
      if (!currentEnabledCols.includes(moduleId)) {
        currentEnabledCols.push(moduleId);
      }
      nextModules = currentActiveModules;
      nextEnabledCols = currentEnabledCols;
    } else {
      nextModules = currentActiveModules.filter((m) => m !== moduleId);
      nextEnabledCols = currentEnabledCols.filter((m) => m !== moduleId);
    }

    const nextSettings = {
      ...currentSettings,
      active_modules: nextModules,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await db
      .from("stores")
      .update({
        settings: nextSettings,
        enabled_modules: nextEnabledCols,
      })
      .eq("id", storeId);

    if (updateError) throw updateError;

    const addonDef = COMMERCIAL_MODULE_CATALOG[moduleId];
    const exempt = isStorePlanExempt(store);
    const resolved = resolveStoreWorkspaceCapabilities(store);
    const includedInCurrent =
      STORE_PLANS[resolved.tier].includedModules.includes(moduleId) ||
      resolved.verticalPlan.includedModules.includes(moduleId);

    if (active && !exempt && !includedInCurrent && addonDef.monthlyPriceCents > 0) {
      await db.from("platform_invoices").insert(
        buildImmediatePlanInvoiceRow(
          storeId,
          addonDef.monthlyPriceCents,
          `Add-on Avulso: ${addonDef.name}`
        )
      );
    }

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
    await requirePlatformAdmin();

    const db = getServerClient();
    const { data: store } = await db
      .from("stores")
      .select(STORE_GOVERNANCE_SELECT)
      .eq("id", storeId)
      .single();

    if (!store) throw new Error("Loja não encontrada.");

    const exempt = isStorePlanExempt(store);
    const planDef = STORE_PLANS[planTier];
    const currentSettings = (store.settings && typeof store.settings === "object" ? store.settings : {}) as Record<string, any>;
    const nextSettings = {
      ...currentSettings,
      plan_tier: planTier,
      subscription_status: exempt ? "exempt" : "active",
      updated_at: new Date().toISOString(),
    };

    const { error } = await db
      .from("stores")
      .update({
        plan_tier: planTier,
        subscription_tier: planTier === "professional" ? "pro" : planTier,
        subscription_status: exempt ? "exempt" : "active",
        settings: nextSettings,
      })
      .eq("id", storeId);

    if (error) throw error;

    if (!exempt && planDef.monthlyPriceCents > 0) {
      await db.from("platform_invoices").insert(
        buildImmediatePlanInvoiceRow(
          storeId,
          planDef.monthlyPriceCents,
          `Assinatura Plano ${planDef.name} (Mensal)`
        )
      );
    }

    return { success: true, storeId, planTier };
  });

export const updateStoreVerticalSubscription = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid(),
      verticalSku: VERTICAL_SKU_ENUM,
      primaryNicheId: z.string().optional(),
      enabledNiches: z.array(z.string()).optional(),
      billingCycle: z.enum(["monthly", "annual"]).optional().default("monthly"),
      subscriptionStatus: z.enum(["trialing", "active", "past_due", "cancelled", "exempt"]).optional(),
    })
  )
  .handler(async ({ data }) => {
    await requirePlatformAdmin();

    const db = getServerClient();
    const { data: store, error: fetchError } = await db
      .from("stores")
      .select(STORE_GOVERNANCE_SELECT)
      .eq("id", data.storeId)
      .single();

    if (fetchError || !store) throw new Error("Loja não encontrada.");

    const skuDef = VERTICAL_PLAN_CATALOG[data.verticalSku as VerticalPlanSkuId];
    if (!skuDef) throw new Error("SKU vertical inválido.");

    const exempt = isStorePlanExempt(store);
    const resolvedPrimaryNiche = resolveUnifiedNicheId(
      data.primaryNicheId || store.primary_niche_id || skuDef.nicheIds[0] || store
    );
    const resolvedNiches = Array.from(
      new Set([
        resolvedPrimaryNiche,
        ...(Array.isArray(data.enabledNiches)
          ? data.enabledNiches.map((n) => resolveUnifiedNicheId(n))
          : skuDef.nicheIds),
      ])
    );

    const nextStatus = exempt
      ? "exempt"
      : data.subscriptionStatus || (store.subscription_status === "trialing" ? "active" : store.subscription_status || "active");

    const currentSettings = (store.settings && typeof store.settings === "object" ? store.settings : {}) as Record<string, any>;
    const existingAddons = Array.isArray(currentSettings.active_modules) ? currentSettings.active_modules : [];
    const mergedModules = Array.from(new Set([...skuDef.includedModules, ...skuDef.includedCapabilities, ...existingAddons]));

    const nextSettings = {
      ...currentSettings,
      plan_tier: skuDef.baseTier,
      vertical_sku: skuDef.sku,
      primary_niche_id: resolvedPrimaryNiche,
      segment: resolvedPrimaryNiche,
      niche: resolvedPrimaryNiche,
      type: resolvedPrimaryNiche,
      subscription_status: nextStatus,
      billing_cycle: data.billingCycle,
      updated_at: new Date().toISOString(),
    };

    const { error: updateErr } = await db
      .from("stores")
      .update({
        vertical_sku: skuDef.sku,
        primary_niche_id: resolvedPrimaryNiche,
        enabled_niches: resolvedNiches,
        plan_tier: skuDef.baseTier,
        subscription_tier: skuDef.isStandalone ? "vertical_standalone" : "enterprise",
        subscription_status: nextStatus,
        billing_cycle: data.billingCycle,
        enabled_modules: mergedModules,
        settings: nextSettings,
      })
      .eq("id", data.storeId);

    if (updateErr) throw new Error("Erro ao ativar plano vertical: " + updateErr.message);

    const priceCents = data.billingCycle === "annual" ? skuDef.annualPriceCents : skuDef.monthlyPriceCents;
    if (!exempt && nextStatus === "active" && priceCents > 0) {
      await db.from("platform_invoices").insert(
        buildImmediatePlanInvoiceRow(
          data.storeId,
          priceCents,
          `Sistema Vertical ${skuDef.name} (${data.billingCycle === "annual" ? "Anual" : "Mensal"})`
        )
      );
    }

    return {
      success: true,
      storeId: data.storeId,
      verticalSku: skuDef.sku,
      primaryNicheId: resolvedPrimaryNiche,
      enabledNiches: resolvedNiches,
      subscriptionStatus: nextStatus,
    };
  });
