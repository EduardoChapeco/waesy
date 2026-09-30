import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

export interface CourierLogisticsConfigDTO {
  id: string;
  name: string;
  phone: string;
  allows_door_delivery: boolean;
  door_delivery_fee_cents: number;
  max_waiting_time_minutes: number;
  waiting_penalty_per_min_cents: number;
}

/**
 * Obtém a configuração de logística de porta do entregador autenticado.
 */
export const getCourierLogisticsConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<CourierLogisticsConfigDTO | null> => {
    try {
      const identity = await getServerIdentity();
      if (!identity.id) return null;

      const supabase = getServerClient();
      const { data, error } = await supabase
        .from("couriers")
        .select("id, name, phone, allows_door_delivery, door_delivery_fee_cents, max_waiting_time_minutes, waiting_penalty_per_min_cents")
        .eq("user_id", identity.id)
        .maybeSingle();

      if (error || !data) return null;
      return data as CourierLogisticsConfigDTO;
    } catch (e) {
      console.error("[waesy-go] getCourierLogisticsConfig error:", e);
      return null;
    }
  }
);

/**
 * Atualiza as preferências de entrega na porta e tempo de espera do entregador.
 */
export const updateCourierLogisticsConfig = createServerFn({ method: "POST" })
  .validator(
    z.object({
      allowsDoorDelivery: z.boolean(),
      doorDeliveryFeeCents: z.number().int().min(0).max(5000), // Max R$ 50,00
      maxWaitingTimeMinutes: z.number().int().min(5).max(30).default(15),
      waitingPenaltyPerMinCents: z.number().int().min(0).max(500).default(100), // Max R$ 5,00/min
    })
  )
  .handler(async ({ data: input }) => {
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Acesso não autorizado.");

    const supabase = getServerClient();
    const { data, error } = await supabase
      .from("couriers")
      .update({
        allows_door_delivery: input.allowsDoorDelivery,
        door_delivery_fee_cents: input.doorDeliveryFeeCents,
        max_waiting_time_minutes: input.maxWaitingTimeMinutes,
        waiting_penalty_per_min_cents: input.waitingPenaltyPerMinCents,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", identity.id)
      .select()
      .single();

    if (error) throw new Error("Erro ao atualizar configurações de entrega: " + error.message);
    return { success: true, courier: data };
  });

/**
 * Dispara o registro de chegada do motoboy no endereço de entrega.
 * Inicia a janela oficial de tolerância de 15 minutos.
 */
export const recordCourierArrival = createServerFn({ method: "POST" })
  .validator(
    z.object({
      orderId: z.string().uuid(),
      courierId: z.string().uuid().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
    })
  )
  .handler(async ({ data: { orderId, courierId } }) => {
    const identity = await getServerIdentity().catch(() => ({ id: null }));
    const effectiveCourierId = identity?.id || courierId || null;

    const supabase = getServerClient();
    const { data, error } = await supabase.rpc("record_courier_arrival", {
      p_order_id: orderId,
      p_courier_id: effectiveCourierId,
    });

    if (error) {
      console.error("[waesy-go] record_courier_arrival RPC error:", error);
      throw new Error("Erro ao registrar chegada do entregador.");
    }

    return (data || { success: true }) as {
      success: boolean;
      arrived_at?: string;
      tolerance_minutes?: number;
      already_arrived?: boolean;
    };
  });

/**
 * Calcula e aplica a taxa de espera excedente se ultrapassar os 15 minutos de tolerância.
 */
export const checkCourierWaitingPenalty = createServerFn({ method: "POST" })
  .validator(
    z.object({
      orderId: z.string().uuid(),
    })
  )
  .handler(async ({ data: { orderId } }) => {
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Acesso não autorizado.");

    const supabase = getServerClient();
    const { data, error } = await supabase.rpc("calculate_courier_waiting_penalty", {
      p_order_id: orderId,
    });

    if (error) {
      console.error("[waesy-go] calculate_courier_waiting_penalty RPC error:", error);
      throw new Error("Erro ao calcular taxa de espera.");
    }

    return (data || { success: true, penalty_cents: 0 }) as {
      success: boolean;
      elapsed_minutes: number;
      penalty_minutes: number;
      penalty_cents: number;
    };
  });
