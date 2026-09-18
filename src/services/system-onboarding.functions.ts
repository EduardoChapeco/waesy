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
