import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

export interface UserReputationDTO {
  user_id: string;
  trust_score: number;
  strikes: number;
  avg_pickup_time_minutes: number;
  complaint_rate_pct: number;
  total_orders_completed: number;
  total_orders_cancelled: number;
  scam_attempts_detected: number;
  last_strike_reason: string | null;
  last_strike_at: string | null;
  status: "good_standing" | "warning" | "restricted" | "banned";
}

/**
 * Consulta a reputação do usuário autenticado ou de um cliente específico no contexto de um pedido.
 */
export const getUserReputation = createServerFn({ method: "GET" })
  .validator(z.object({ targetUserId: z.string().uuid().optional() }).optional())
  .handler(async ({ data }): Promise<UserReputationDTO> => {
    try {
      const identity = await getServerIdentity();
      if (!identity.id) throw new Error("Não autenticado");

      const supabase = getServerClient();
      const userId = data?.targetUserId || identity.id;

      // Se consultando outro usuário, exige ser staff de loja
      if (data?.targetUserId && data.targetUserId !== identity.id) {
        assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "finance"]);
      }

      const { data: rep, error } = await supabase
        .from("user_reputation")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error || !rep) {
        return {
          user_id: userId,
          trust_score: 100,
          strikes: 0,
          avg_pickup_time_minutes: 4.0,
          complaint_rate_pct: 0.0,
          total_orders_completed: 0,
          total_orders_cancelled: 0,
          scam_attempts_detected: 0,
          last_strike_reason: null,
          last_strike_at: null,
          status: "good_standing",
        };
      }

      return rep as UserReputationDTO;
    } catch (e) {
      console.error("[trust-and-safety] getUserReputation error:", e);
      return {
        user_id: "anonymous",
        trust_score: 100,
        strikes: 0,
        avg_pickup_time_minutes: 4.0,
        complaint_rate_pct: 0.0,
        total_orders_completed: 0,
        total_orders_cancelled: 0,
        scam_attempts_detected: 0,
        last_strike_reason: null,
        last_strike_at: null,
        status: "good_standing",
      };
    }
  });

export const StoreSafeCancellationReasonSchema = z.enum([
  "suspected_fraud",
  "abusive_customer",
  "high_risk_area",
  "ai_manipulation_attempt",
  "stock_out",
  "other",
]);

export type StoreSafeCancellationReason = z.infer<typeof StoreSafeCancellationReasonSchema>;

/**
 * Cancelamento seguro por parte do estabelecimento:
 * Cancela o pedido com justificativa auditável, marca `is_safe_cancellation = true`
 * (não penalizando o algoritmo da loja) e aplica strike ao cliente se constatada má conduta.
 */
export const cancelOrderByStoreSafely = createServerFn({ method: "POST" })
  .validator(
    z.object({
      orderId: z.string().uuid(),
      reason: StoreSafeCancellationReasonSchema,
      internalNotes: z.string().optional(),
    })
  )
  .handler(async ({ data: input }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const supabase = getServerClient();

    // 1. Obter o pedido e confirmar o tenant
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, status, customer_id, store_id")
      .eq("id", input.orderId)
      .eq("store_id", identity.store_id)
      .single();

    if (orderErr || !order) throw new Error("Pedido não encontrado ou sem autorização.");

    // 2. Atualizar status do pedido para cancelado com as flags seguras
    const { error: updateErr } = await supabase
      .from("orders")
      .update({
        status: "cancelled",
        cancelled_by_role: "store",
        store_cancellation_reason: input.reason,
        is_safe_cancellation: true,
        cancel_reason: `Cancelado pela loja (${input.reason}): ${input.internalNotes || "Proteção Trust & Safety"}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.orderId);

    if (updateErr) throw new Error("Erro ao cancelar pedido: " + updateErr.message);

    // 3. Se for motivo de abuso ou fraude, aplica strike ao cliente na tabela user_reputation
    if (order.customer_id && (input.reason === "suspected_fraud" || input.reason === "abusive_customer" || input.reason === "ai_manipulation_attempt")) {
      const { data: currentRep } = await supabase
        .from("user_reputation")
        .select("trust_score, strikes")
        .eq("user_id", order.customer_id)
        .maybeSingle();

      const newStrikes = (currentRep?.strikes || 0) + 1;
      const newScore = Math.max(0, (currentRep?.trust_score ?? 100) - 25);
      const newStatus = newStrikes >= 3 ? "restricted" : newStrikes >= 1 ? "warning" : "good_standing";

      await supabase
        .from("user_reputation")
        .upsert({
          user_id: order.customer_id,
          trust_score: newScore,
          strikes: newStrikes,
          status: newStatus,
          last_strike_reason: input.reason,
          last_strike_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
    }

    return {
      success: true,
      orderId: input.orderId,
      isSafeCancellation: true,
      message: "Pedido cancelado com sucesso sob o protocolo de segurança sem penalização para a loja.",
    };
  });

/**
 * Motor Anti-Scam: Detecta tentativas de fraude visual ou manipulação com IA
 * em reclamações e contestações de pedidos.
 */
export const analyzeClaimForScam = createServerFn({ method: "POST" })
  .validator(
    z.object({
      orderId: z.string().uuid(),
      claimPhotoUrl: z.string().url(),
      claimDescription: z.string().min(5),
    })
  )
  .handler(async ({ data: input }) => {
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Não autorizado.");

    // Análise heurística de anomalia de imagem (ex: URLs falsas, placeholders suspeitos, geradores de IA)
    const lowerUrl = input.claimPhotoUrl.toLowerCase();
    const isAiGeneratedUrl =
      lowerUrl.includes("midjourney") ||
      lowerUrl.includes("dall-e") ||
      lowerUrl.includes("dalle") ||
      lowerUrl.includes("stable_diffusion") ||
      lowerUrl.includes("stablediffusion") ||
      lowerUrl.includes("generated_photos") ||
      lowerUrl.includes("hyperrealistic") ||
      lowerUrl.includes("synthetic");

    const isSuspiciousUrl =
      isAiGeneratedUrl ||
      lowerUrl.includes("placeholder") ||
      lowerUrl.includes("loremflickr") ||
      lowerUrl.includes("picsum.photos");

    const isShortDescription = input.claimDescription.trim().length < 10;
    const isFlaggedAsScam = isSuspiciousUrl || (isShortDescription && lowerUrl.includes("test"));

    if (isFlaggedAsScam) {
      const supabase = getServerClient();
      // Incrementa tentativa de golpe detectada
      await supabase
        .from("user_reputation")
        .upsert({
          user_id: identity.id,
          scam_attempts_detected: 1,
          strikes: 1,
          trust_score: 75,
          status: "warning",
          last_strike_reason: "ai_manipulation_attempt",
          last_strike_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
    }

    return {
      isFlaggedAsScam,
      requiresManualReview: true,
      trustStatus: isFlaggedAsScam ? "flagged" : "verified",
    };
  });
