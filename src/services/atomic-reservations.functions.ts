import { createServerFn } from "@tanstack/react-start";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";
import { z } from "zod";

export const ReserveResourceSchema = z.object({
  resourceType: z.enum(["product_variant", "deal", "booking_service_slot", "ticket_lot"]),
  resourceId: z.string().uuid("ID do recurso deve ser um UUID válido"),
  qty: z.number().int().min(1, "Quantidade deve ser no mínimo 1").default(1),
  sessionId: z.string().min(1, "Identificador de sessão ou carrinho obrigatório"),
  minutes: z.number().int().min(1).max(60).default(15),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type ReserveResourceInput = z.infer<typeof ReserveResourceSchema>;

/**
 * Reserva atomicamente um recurso por 15 minutos (Anti-Race Condition).
 * Utiliza travamento pessimista (FOR UPDATE) no PostgreSQL.
 */
export const reserveResourceAtomic = createServerFn({ method: "POST" })
  .validator(ReserveResourceSchema)
  .handler(async ({ data: { resourceType, resourceId, qty, sessionId, minutes, metadata } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity().catch(() => ({ id: null }));

    const { data, error } = await supabase.rpc("reserve_resource_15min_atomic", {
      p_resource_type: resourceType,
      p_resource_id: resourceId,
      p_qty: qty,
      p_session_id: sessionId,
      p_user_id: identity.id ?? null,
      p_minutes: minutes,
      p_metadata: metadata ?? {},
    });

    if (error) {
      console.error("[reserveResourceAtomic] Erro na RPC de reserva:", error);
      throw new Error(error.message || "Falha ao reservar recurso.");
    }

    return data as {
      reservation_id: string;
      resource_type: string;
      resource_id: string;
      qty: number;
      status: "active";
      expires_at: string;
      expires_in_seconds: number;
    };
  });

export const ConsumeReservationSchema = z.object({
  reservationId: z.string().uuid("ID de reserva inválido"),
  orderId: z.string().uuid().optional(),
});

/**
 * Consome atomicamente uma reserva confirmada por pagamento/checkout.
 * Deduz o estoque real e finaliza o ciclo de vida da reserva.
 */
export const consumeReservationAtomic = createServerFn({ method: "POST" })
  .validator(ConsumeReservationSchema)
  .handler(async ({ data: { reservationId, orderId } }) => {
    const supabase = getServerClient();

    const { data, error } = await supabase.rpc("consume_reservation_atomic", {
      p_reservation_id: reservationId,
      p_order_id: orderId ?? null,
    });

    if (error) {
      console.error("[consumeReservationAtomic] Erro:", error);
      throw new Error(error.message || "Falha ao consumir reserva.");
    }

    return data as {
      status: "consumed" | "already_consumed";
      reservation_id: string;
      resource_type: string;
      resource_id: string;
      qty?: number;
    };
  });

export const ReleaseReservationSchema = z.object({
  reservationId: z.string().uuid("ID de reserva inválido"),
});

/**
 * Libera atomicamente uma reserva abandonada ou cancelada antes dos 15 minutos,
 * devolvendo o estoque para outros compradores imediatamente.
 */
export const releaseReservationAtomic = createServerFn({ method: "POST" })
  .validator(ReleaseReservationSchema)
  .handler(async ({ data: { reservationId } }) => {
    const supabase = getServerClient();

    const { data, error } = await supabase.rpc("release_reservation_atomic", {
      p_reservation_id: reservationId,
    });

    if (error) {
      console.error("[releaseReservationAtomic] Erro:", error);
      throw new Error(error.message || "Falha ao liberar reserva.");
    }

    return data as {
      status: string;
      reservation_id: string;
      resource_type: string;
      resource_id: string;
    };
  });

export const GetReservationStatusSchema = z.object({
  reservationId: z.string().uuid("ID de reserva inválido"),
});

/**
 * Consulta o status atual de uma reserva (tempo restante de expiração).
 */
export const getReservationStatus = createServerFn({ method: "GET" })
  .validator(GetReservationStatusSchema)
  .handler(async ({ data: { reservationId } }) => {
    const supabase = getServerClient();

    const { data, error } = await supabase
      .from("universal_reservations")
      .select("id, resource_type, resource_id, qty, status, expires_at, created_at, metadata")
      .eq("id", reservationId)
      .maybeSingle();

    if (error || !data) {
      throw new Error("Reserva não encontrada.");
    }

    const now = new Date();
    const expiresAt = new Date(data.expires_at);
    const isExpired = data.status === "active" && expiresAt < now;
    const remainingSeconds = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));

    return {
      ...data,
      isExpired,
      remainingSeconds,
    };
  });
