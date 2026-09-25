import { createServerFn } from "@tanstack/react-start";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";

export interface SystemOnboardingStep {
  id: string;
  title: string;
  description: string | null;
  media_url: string | null;
  media_type: "image" | "video";
  step_order: number;
}

export const getSystemOnboardingSteps = createServerFn({ method: "GET" }).handler(async () => {
  const db = getServerClient();
  const identity = await getServerIdentity();
  
  if (!identity?.id) return { show: false, steps: [] };

  try {
    // Check if user already completed it
    const { data: profile } = await db
      .from("profiles")
      .select("onboarding_completed_at")
      .eq("id", identity.id)
      .single();

    if (profile?.onboarding_completed_at) {
      return { show: false, steps: [] };
    }

    // Fetch active steps
    const { data: steps, error } = await db
      .from("system_onboarding_steps")
      .select("id, title, description, media_url, media_type, step_order")
      .eq("is_active", true)
      .order("step_order", { ascending: true });

    if (error || !steps || steps.length === 0) {
      return { show: false, steps: [] };
    }

    return { show: true, steps: steps as SystemOnboardingStep[] };
  } catch (err) {
    console.error("[getSystemOnboardingSteps] Error:", err);
    return { show: false, steps: [] };
  }
});

export const completeSystemOnboarding = createServerFn({ method: "POST" }).handler(async () => {
  const db = getServerClient();
  const identity = await getServerIdentity();
  
  if (!identity?.id) throw new Error("Não autorizado");

  try {
    const { error } = await db.rpc("complete_user_onboarding");
    if (error) throw error;
    return true;
  } catch (err: any) {
    throw new Error(err?.message || "Erro ao concluir onboarding");
  }
});

/**
 * Lista todos os passos cadastrados para o Admin Master gerenciar.
 */
export const listAllSystemOnboardingSteps = createServerFn({ method: "GET" }).handler(async (): Promise<SystemOnboardingStep[]> => {
  const db = getServerClient();
  const identity = await getServerIdentity();

  const isPlatformAdmin =
    identity?.role === "platform_admin" ||
    identity?.role === "master" ||
    identity?.role === "superadmin";

  if (!isPlatformAdmin) {
    return [];
  }

  try {
    const { data: steps, error } = await db
      .from("system_onboarding_steps")
      .select("id, title, description, media_url, media_type, step_order, is_active")
      .order("step_order", { ascending: true });

    if (error || !steps) return [];
    return steps as SystemOnboardingStep[];
  } catch (err) {
    console.error("[listAllSystemOnboardingSteps] Erro ao listar passos:", err);
    return [];
  }
});

/**
 * Salva ou atualiza um passo de onboarding pelo Admin Master.
 */
export const saveSystemOnboardingStep = createServerFn({ method: "POST" })
  .validator((d: {
    id?: string;
    title: string;
    description?: string | null;
    media_url?: string | null;
    media_type?: "image" | "video";
    step_order?: number;
    is_active?: boolean;
  }) => d)
  .handler(async ({ data }) => {
    const db = getServerClient();
    const identity = await getServerIdentity();

    const isPlatformAdmin =
      identity?.role === "platform_admin" ||
      identity?.role === "master" ||
      identity?.role === "superadmin";

    if (!isPlatformAdmin) {
      throw new Error("Apenas administradores master podem gerenciar os passos de onboarding.");
    }

    const payload = {
      title: data.title.trim(),
      description: data.description?.trim() || null,
      media_url: data.media_url?.trim() || null,
      media_type: data.media_type || "image",
      step_order: data.step_order ?? 0,
      is_active: data.is_active ?? true,
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      const { data: updated, error } = await db
        .from("system_onboarding_steps")
        .update(payload)
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw new Error(`Falha ao atualizar passo: ${error.message}`);
      return updated;
    } else {
      const { data: inserted, error } = await db
        .from("system_onboarding_steps")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(`Falha ao criar passo: ${error.message}`);
      return inserted;
    }
  });
