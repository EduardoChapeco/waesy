import { createServerFn } from "@tanstack/react-start";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, requirePlatformAdmin } from "@/lib/server-access";
import { isPlatformAdminIdentity } from "@/lib/identity-core";
import { z } from "zod";

export interface PlatformModuleDTO {
  module_key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  is_public: boolean;
  badge: string | null;
  order_index: number;
  category?: "public_discovery" | "store_operation" | "ai_intelligence" | string;
  updated_at: string;
}

/**
 * Consulta cruzada de módulos ativos para uma loja específica e opcionalmente usuário.
 * Um módulo está ativo somente se:
 * 1) A loja estiver ativa e aprovada (ou for root)
 * 2) O módulo estiver habilitado globalmente em platform_modules_config
 * 3) Não estiver bloqueado na lista da loja ou nas restrições do usuário
 */
export const getStoreActiveModules = createServerFn({ method: "GET" })
  .validator(z.object({ storeId: z.string().uuid() }))
  .handler(async ({ data: { storeId } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity().catch(() => null);
    try {
      const [platformRes, storeRes, profileRes] = await Promise.all([
        supabase.from("platform_modules_config").select("*"),
        supabase
          .from("stores")
          .select("enabled_modules, plan_tier, is_active, is_platform_root, approval_status, settings")
          .eq("id", storeId)
          .single(),
        identity?.id
          ? supabase
              .from("profiles")
              .select("approval_status, user_plan_tier, enabled_modules, disabled_modules")
              .eq("id", identity.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const allPlatformModules = (platformRes.data || []) as PlatformModuleDTO[];
      const globalModules = allPlatformModules.filter((m) => m.enabled);
      const storeRow = storeRes.data as Record<string, any> | null;
      const storeDisabled =
        storeRow &&
        !storeRow.is_platform_root &&
        (storeRow.is_active === false ||
          (storeRow.approval_status && storeRow.approval_status !== "approved"));
      const profileRow = (profileRes as any)?.data as Record<string, any> | null;
      const userSuspended =
        profileRow?.approval_status && profileRow.approval_status !== "approved";

      const rawStoreModules = storeRow?.enabled_modules;
      const storeDisabledArr: string[] = Array.isArray(storeRow?.settings?.disabled_modules)
        ? storeRow!.settings!.disabled_modules
        : [];
      const userDisabledArr: string[] = Array.isArray(profileRow?.disabled_modules)
        ? profileRow!.disabled_modules
        : [];

      const activeMap: Record<string, boolean> = {};
      for (const m of allPlatformModules) {
        if (!m.enabled || storeDisabled || userSuspended) {
          activeMap[m.module_key] = false;
          continue;
        }
        if (storeDisabledArr.includes(m.module_key) || userDisabledArr.includes(m.module_key)) {
          activeMap[m.module_key] = false;
          continue;
        }
        if (rawStoreModules && !Array.isArray(rawStoreModules) && typeof rawStoreModules === "object") {
          activeMap[m.module_key] = (rawStoreModules as Record<string, boolean>)[m.module_key] !== false;
        } else {
          activeMap[m.module_key] = true;
        }
      }

      return {
        activeMap,
        globalModules,
        allPlatformModules,
        planTier: storeRow?.plan_tier || "free",
        approvalStatus: storeRow?.approval_status || "approved",
        userApprovalStatus: profileRow?.approval_status || "approved",
        isStoreActive: storeRow?.is_active !== false,
      };
    } catch (err) {
      console.error("[modules] Erro ao obter módulos da loja:", err);
      return {
        activeMap: {},
        globalModules: [],
        allPlatformModules: [],
        planTier: "free",
        approvalStatus: "approved",
        userApprovalStatus: "approved",
        isStoreActive: true,
      };
    }
  });

/**
 * Consulta pública de módulos ativos na plataforma Waesy.
 */
export const getPublicPlatformModules = createServerFn({ method: "GET" }).handler(
  async (): Promise<PlatformModuleDTO[]> => {
    const supabase = getServerClient();
    try {
      const { data, error } = await supabase
        .from("platform_modules_config")
        .select("*")
        .eq("is_public", true)
        .order("order_index", { ascending: true });

      if (error || !data) {
        console.warn("[modules] Falha ao consultar módulos públicos:", error);
        return [];
      }

      return data as PlatformModuleDTO[];
    } catch (err) {
      console.error("[modules] Erro em getPublicPlatformModules:", err);
      return [];
    }
  },
);

/**
 * Consulta completa de governança para o Admin Master.
 */
export const adminListPlatformModules = createServerFn({ method: "GET" }).handler(
  async (): Promise<PlatformModuleDTO[]> => {
    await requirePlatformAdmin();
    const supabase = getServerClient();

    const { data, error } = await supabase
      .from("platform_modules_config")
      .select("*")
      .order("order_index", { ascending: true });

    if (error) {
      console.error("[modules] adminListPlatformModules error:", error);
      throw new Error("Erro ao listar módulos de governança.");
    }

    return (data || []) as PlatformModuleDTO[];
  },
);

/**
 * Ativa ou desativa um módulo da plataforma em tempo real.
 */
export const adminTogglePlatformModule = createServerFn({ method: "POST" })
  .validator(
    z.object({
      moduleKey: z.string().min(1),
      enabled: z.boolean(),
    }),
  )
  .handler(async ({ data: { moduleKey, enabled } }) => {
    const identity = await requirePlatformAdmin();
    if (!isPlatformAdminIdentity({ ...identity, isPlatformAdmin: true })) {
      throw new Error("Não autorizado.");
    }
    const supabase = getServerClient();

    const { data, error } = await supabase
      .from("platform_modules_config")
      .update({
        enabled,
        updated_by: identity.id,
        updated_at: new Date().toISOString(),
      })
      .eq("module_key", moduleKey)
      .select()
      .single();

    if (error) {
      console.error("[modules] adminTogglePlatformModule error:", error);
      throw new Error("Erro ao alternar status do módulo.");
    }

    return { success: true, module: data };
  });

/**
 * Atualiza metadados do módulo (Nome, Descrição, Badge).
 */
export const adminUpdatePlatformModule = createServerFn({ method: "POST" })
  .validator(
    z.object({
      moduleKey: z.string().min(1),
      name: z.string().min(2),
      description: z.string().optional(),
      badge: z.string().optional(),
      orderIndex: z.number().int().optional(),
    }),
  )
  .handler(async ({ data: { moduleKey, name, description, badge, orderIndex } }) => {
    const identity = await requirePlatformAdmin();
    const supabase = getServerClient();

    const updatePayload: Record<string, any> = {
      name: name.trim(),
      description: description?.trim() || null,
      badge: badge?.trim() || null,
      updated_by: identity.id,
      updated_at: new Date().toISOString(),
    };

    if (orderIndex !== undefined) {
      updatePayload.order_index = orderIndex;
    }

    const { data, error } = await supabase
      .from("platform_modules_config")
      .update(updatePayload)
      .eq("module_key", moduleKey)
      .select()
      .single();

    if (error) {
      console.error("[modules] adminUpdatePlatformModule error:", error);
      throw new Error("Erro ao atualizar módulo.");
    }

    return { success: true, module: data };
  });
