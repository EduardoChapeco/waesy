import { getServerClient } from "@/lib/supabase";

export interface AiCurationAccessResult {
  allowed: boolean;
  isPremium: boolean;
  hasByok: boolean;
  message?: string;
}

/**
 * Gate de Monetização da Curadoria com Inteligência Artificial (Master Prompt V18 - Fase 5)
 * Garante que apenas lojistas com Plano Pago ou com Chave Própria (BYOK)
 * consumam a inteligência generativa de reescrita editorial.
 */
export async function checkAiCurationAccess(
  storeId?: string,
  profileId?: string
): Promise<AiCurationAccessResult> {
  const supabase = getServerClient();

  if (!storeId && !profileId) {
    return {
      allowed: false,
      isPremium: false,
      hasByok: false,
      message: "Identidade não informada para validação de acesso à IA.",
    };
  }

  try {
    // 1. Verificar se a loja possui plano pago ou ativo
    let isPremium = false;
    if (storeId) {
      const { data: store } = await supabase
        .from("stores")
        .select("id, plan, is_platform_root")
        .eq("id", storeId)
        .maybeSingle();

      if (store?.is_platform_root) {
        // Acesso administrativo ilimitado para a loja matriz
        return { allowed: true, isPremium: true, hasByok: false };
      }

      if (store?.plan && store.plan !== "free" && store.plan !== "gratuito") {
        isPremium = true;
      }
    }

    // 2. Verificar se o lojista cadastrou chave própria (BYOK)
    let hasByok = false;
    if (storeId) {
      const { count: byokCount } = await supabase
        .from("tenant_ai_providers")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId)
        .eq("status", "active");

      if (byokCount && byokCount > 0) {
        hasByok = true;
      }
    }

    // 3. Decisão do Gate
    if (isPremium || hasByok) {
      return { allowed: true, isPremium, hasByok };
    }

    return {
      allowed: false,
      isPremium: false,
      hasByok: false,
      message:
        "A Curadoria Avançada com Inteligência Artificial exige um Plano Premium ou a inserção da sua Chave de API própria (BYOK) nas Configurações.",
    };
  } catch (err: any) {
    console.error("[checkAiCurationAccess] Error checking access:", err);
    // Em caso de falha de conexão, aplica fallback gracioso defensivo
    return {
      allowed: false,
      isPremium: false,
      hasByok: false,
      message: "Falha temporária ao verificar plano de IA.",
    };
  }
}
