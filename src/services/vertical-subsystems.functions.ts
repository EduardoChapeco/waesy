/**
 * vertical-subsystems.functions.ts — Governanca Soberana de Subsistemas Verticais,
 * Aprovacoes de Empresas/Usuarios e Planos Individuais (Admin Master Exclusivo).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { requirePlatformAdmin } from "@/lib/server-access";
import {
  CANONICAL_VERTICAL_SUBSYSTEMS,
  LEGACY_SUBSYSTEM_SLUG_ALIASES,
  normalizeCanonicalSubsystemId,
  type RootExperienceMode,
  type VerticalSubsystemDescriptor,
} from "@/lib/vertical-subsystems";

export interface PublicEcosystemConfigDTO {
  rootExperienceMode: RootExperienceMode;
  requireCompanyApproval: boolean;
  requireUserApproval: boolean;
  subsystems: VerticalSubsystemDescriptor[];
  disabledModuleKeys: string[];
}

function mapDbRowToSubsystem(row: Record<string, any>): VerticalSubsystemDescriptor {
  const rawId = String(row.id || "");
  const normalizedId = normalizeCanonicalSubsystemId(rawId);
  const isLegacyRow = Boolean(LEGACY_SUBSYSTEM_SLUG_ALIASES[rawId.toLowerCase()]);
  const canonical = CANONICAL_VERTICAL_SUBSYSTEMS.find((s) => s.id === normalizedId);
  return {
    id: canonical?.id || normalizedId || rawId,
    name: isLegacyRow && canonical ? canonical.name : String(row.name || canonical?.name || rawId),
    shortName:
      isLegacyRow && canonical ? canonical.shortName : String(row.short_name || canonical?.shortName || rawId),
    category: (row.category || canonical?.category || "public_app") as VerticalSubsystemDescriptor["category"],
    subdomain:
      isLegacyRow && canonical ? canonical.subdomain : String(row.subdomain || canonical?.subdomain || rawId),
    canonicalDomain:
      isLegacyRow && canonical
        ? canonical.canonicalDomain
        : String(row.canonical_domain || canonical?.canonicalDomain || `${normalizedId}.waesy.com.br`),
    hostAliases: canonical?.hostAliases || [
      String(row.canonical_domain || `${normalizedId}.waesy.com.br`),
    ],
    targetPath:
      isLegacyRow && canonical ? canonical.targetPath : String(row.target_path || canonical?.targetPath || "/"),
    landingPath: canonical?.landingPath,
    brandVerticalId: canonical?.brandVerticalId,
    primaryNicheId: canonical?.primaryNicheId,
    defaultVerticalSku: canonical?.defaultVerticalSku,
    description: String(row.description || canonical?.description || ""),
    howItWorks: canonical?.howItWorks || String(row.description || ""),
    modulesIncluded: Array.isArray(row.modules_included)
      ? row.modules_included
      : canonical?.modulesIncluded || [],
    isActive: row.is_active !== false,
    showInHub: row.show_in_hub !== false,
    showOnLanding: row.show_on_landing !== false,
    isStandaloneApp: row.is_standalone_app !== false,
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : (canonical?.sortOrder ?? 100),
  };
}

function mergeSubsystemsWithCanonicalCatalog(rows: Record<string, any>[]): VerticalSubsystemDescriptor[] {
  if (!Array.isArray(rows) || rows.length === 0) {
    return CANONICAL_VERTICAL_SUBSYSTEMS;
  }
  const byId = new Map<string, VerticalSubsystemDescriptor>();
  for (const row of rows) {
    const mapped = mapDbRowToSubsystem(row);
    // Direct canonical match wins over legacy alias row
    const isDirect = String(row.id || "").toLowerCase() === mapped.id;
    if (!byId.has(mapped.id) || isDirect) {
      byId.set(mapped.id, mapped);
    }
  }
  const merged: VerticalSubsystemDescriptor[] = CANONICAL_VERTICAL_SUBSYSTEMS.map(
    (can) => byId.get(can.id) || can,
  );
  for (const [id, sub] of byId.entries()) {
    if (!merged.some((m) => m.id === id)) {
      merged.push(sub);
    }
  }
  return merged.sort((a, b) => a.sortOrder - b.sortOrder);
}

export const getPublicEcosystemSubsystemsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicEcosystemConfigDTO> => {
    const db = getServerClient();
    try {
      const [subRes, brandRes, modRes] = await Promise.all([
        db.from("platform_vertical_subsystems").select("*").order("sort_order", { ascending: true }),
        db
          .from("platform_brand_settings")
          .select("root_experience_mode, require_company_approval, require_user_approval")
          .limit(1)
          .maybeSingle(),
        db.from("platform_modules_config").select("module_key, enabled"),
      ]);

      const subsystems = mergeSubsystemsWithCanonicalCatalog(subRes.data || []);

      const disabledModuleKeys = (modRes.data || [])
        .filter((m: any) => m.enabled === false)
        .map((m: any) => String(m.module_key));

      const modeRaw = String(brandRes.data?.root_experience_mode || "landing_vendas");
      const rootExperienceMode: RootExperienceMode =
        modeRaw === "marketplace_local" ? "marketplace_local" : "landing_vendas";

      return {
        rootExperienceMode,
        requireCompanyApproval: Boolean(brandRes.data?.require_company_approval),
        requireUserApproval: Boolean(brandRes.data?.require_user_approval),
        subsystems,
        disabledModuleKeys,
      };
    } catch {
      return {
        rootExperienceMode: "landing_vendas",
        requireCompanyApproval: false,
        requireUserApproval: false,
        subsystems: CANONICAL_VERTICAL_SUBSYSTEMS,
        disabledModuleKeys: [],
      };
    }
  },
);

export const adminGetEcosystemGovernanceFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicEcosystemConfigDTO> => {
    await requirePlatformAdmin();
    return await getPublicEcosystemSubsystemsFn();
  },
);

export const adminUpdateEcosystemFlagsFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      rootExperienceMode: z.enum(["landing_vendas", "marketplace_local"]),
      requireCompanyApproval: z.boolean(),
      requireUserApproval: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    const admin = await requirePlatformAdmin();
    const db = getServerClient();
    const { data: existing } = await db
      .from("platform_brand_settings")
      .select("id")
      .limit(1)
      .maybeSingle();

    const payload = {
      root_experience_mode: data.rootExperienceMode,
      require_company_approval: data.requireCompanyApproval,
      require_user_approval: data.requireUserApproval,
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      const { error } = await db.from("platform_brand_settings").update(payload).eq("id", existing.id);
      if (error) throw new Error("Erro ao atualizar política global: " + error.message);
    } else {
      const { error } = await db.from("platform_brand_settings").insert(payload);
      if (error) throw new Error("Erro ao criar política global: " + error.message);
    }

    try {
      await db.from("forensic_audit_events").insert({
        actor_id: admin.id,
        actor_role: "platform_admin",
        target_entity_type: "platform_settings",
        target_entity_id: existing?.id || admin.id,
        action: "update_ecosystem_flags",
        payload_snapshot: payload,
      });
    } catch {}

    return { success: true, ...data };
  });

export const adminUpdateVerticalSubsystemFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(2).max(40),
      name: z.string().min(2).max(120),
      shortName: z.string().min(2).max(40),
      subdomain: z.string().min(1).max(60),
      canonicalDomain: z.string().min(4).max(160),
      targetPath: z.string().startsWith("/"),
      description: z.string().min(4).max(400),
      isActive: z.boolean(),
      showInHub: z.boolean(),
      showOnLanding: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    const admin = await requirePlatformAdmin();
    const db = getServerClient();
    const canonical = CANONICAL_VERTICAL_SUBSYSTEMS.find((s) => s.id === data.id);

    const { data: saved, error } = await db
      .from("platform_vertical_subsystems")
      .upsert({
        id: data.id,
        name: data.name.trim(),
        short_name: data.shortName.trim(),
        category: canonical?.category || "public_app",
        subdomain: data.subdomain.trim().toLowerCase(),
        canonical_domain: data.canonicalDomain.trim().toLowerCase(),
        target_path: data.targetPath.trim(),
        description: data.description.trim(),
        modules_included: canonical?.modulesIncluded || [],
        is_active: data.isActive,
        show_in_hub: data.showInHub,
        show_on_landing: data.showOnLanding,
        is_standalone_app: canonical?.isStandaloneApp ?? true,
        sort_order: canonical?.sortOrder ?? 100,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error("Erro ao salvar subsistema vertical: " + error.message);

    try {
      await db.from("forensic_audit_events").insert({
        actor_id: admin.id,
        actor_role: "platform_admin",
        target_entity_type: "vertical_subsystem",
        target_entity_id: data.id,
        action: data.isActive ? "subsystem_enabled" : "subsystem_disabled",
        payload_snapshot: data,
      });
    } catch {}

    return { success: true, subsystem: mapDbRowToSubsystem(saved) };
  });

export const adminSetCompanyApprovalFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid(),
      approvalStatus: z.enum(["pending", "approved", "rejected", "suspended"]),
      notes: z.string().max(400).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const admin = await requirePlatformAdmin();
    const db = getServerClient();

    const { data: targetStore } = await db
      .from("stores")
      .select("id, slug, is_platform_root")
      .eq("id", data.storeId)
      .single();

    if (!targetStore) throw new Error("Empresa não encontrada.");
    if ((targetStore.is_platform_root || targetStore.slug === "waesy") && data.approvalStatus !== "approved") {
      throw new Error("A empresa raiz da plataforma não pode ser bloqueada.");
    }

    const isActive = data.approvalStatus === "approved";
    const { error } = await db
      .from("stores")
      .update({
        approval_status: data.approvalStatus,
        is_active: isActive,
        approval_notes: data.notes || null,
        approved_at: isActive ? new Date().toISOString() : null,
        approved_by: admin.id,
      })
      .eq("id", data.storeId);

    if (error) throw new Error("Erro ao atualizar aprovação da empresa: " + error.message);

    try {
      await db.from("forensic_audit_events").insert({
        actor_id: admin.id,
        actor_role: "platform_admin",
        target_entity_type: "store",
        target_entity_id: data.storeId,
        action: `company_approval_${data.approvalStatus}`,
        payload_snapshot: { approvalStatus: data.approvalStatus, isActive, notes: data.notes || null },
      });
    } catch {}

    return { success: true, approvalStatus: data.approvalStatus, isActive };
  });

export const adminUpdateUserGovernanceFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      userId: z.string().uuid(),
      approvalStatus: z.enum(["pending", "approved", "rejected", "suspended"]),
      userPlanTier: z.enum(["free", "starter", "professional", "enterprise", "WAESY_MAX"]),
      enabledModules: z.array(z.string()).default([]),
      disabledModules: z.array(z.string()).default([]),
      notes: z.string().max(400).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const admin = await requirePlatformAdmin();
    const db = getServerClient();

    const { error } = await db
      .from("profiles")
      .update({
        approval_status: data.approvalStatus,
        user_plan_tier: data.userPlanTier,
        enabled_modules: data.enabledModules,
        disabled_modules: data.disabledModules,
        approval_notes: data.notes || null,
        approved_at: data.approvalStatus === "approved" ? new Date().toISOString() : null,
        approved_by: admin.id,
      })
      .eq("id", data.userId);

    if (error) throw new Error("Erro ao salvar governança do usuário: " + error.message);

    try {
      await db.from("forensic_audit_events").insert({
        actor_id: admin.id,
        actor_role: "platform_admin",
        target_entity_type: "user",
        target_entity_id: data.userId,
        action: "admin_update_user_governance",
        payload_snapshot: data,
      });
    } catch {}

    return { success: true };
  });
