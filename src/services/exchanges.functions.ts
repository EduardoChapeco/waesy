import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getSSRClient } from "@/lib/server-access";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { logSystemError } from "@/lib/logger";
import { parseRmaForensics } from "@/services/rma.functions";

export const requestExchange = createServerFn({ method: "POST" })
  .validator(
    z.object({
      orderId: z.string().uuid(),
      reason: z.string().min(5),
    }),
  )
  .handler(async ({ data: { orderId, reason } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();

    if (!identity.id) {
      throw new Error("Você precisa estar logado para solicitar uma troca");
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, store_id, status, total_cents")
      .eq("id", orderId)
      .eq("customer_id", identity.id)
      .single();

    if (orderError || !order) {
      throw new Error("Pedido não encontrado ou não pertence ao seu usuário");
    }

    if (["draft", "cancelled", "payment_failed"].includes(order.status)) {
      throw new Error("Este pedido não é elegível para troca.");
    }

    const { error: insertError } = await supabase.from("exchanges").insert({
      store_id: order.store_id,
      original_order_id: order.id,
      customer_id: identity.id,
      created_by: identity.id,
      total_value_cents: order.total_cents || 0,
      reason,
      status: "requested",
    });

    if (insertError) {
      await logSystemError({
        route: "requestExchange",
        page_url: "/workspace/pedidos/trocas",
        schema_name: "public",
        table_name: "exchanges",
        contract_name: "requestExchange",
        error_message: insertError.message,
      });
      throw new Error("Erro ao solicitar troca: " + insertError.message);
    }

    return { status: "success" };
  });

export const listExchanges = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    if (!identity.id || !identity.store_id) return [];

    const [exchangesRes, rmaRes] = await Promise.all([
      supabase
        .from("exchanges")
        .select(
          "id, status, reason, created_at, total_value_cents, resolution_type, original_order_id, orders:original_order_id(id, public_token, total_cents, customer_snapshot)",
        )
        .eq("store_id", identity.store_id)
        .order("created_at", { ascending: false }),
      supabase
        .from("rma_requests")
        .select(
          "id, status, type, notes, created_at, order_id, orders:order_id(id, public_token, total_cents, customer_snapshot), profiles:customer_id(full_name)",
        )
        .eq("store_id", identity.store_id)
        .order("created_at", { ascending: false }),
    ]);

    const items: any[] = [];

    // Mapear trocas registradas diretamente
    if (exchangesRes.data) {
      for (const ex of exchangesRes.data) {
        const order = (ex as any).orders;
        const custName =
          order?.customer_snapshot?.full_name ||
          order?.customer_snapshot?.name ||
          "Cliente";
        const forensics = parseRmaForensics(ex.reason);
        items.push({
          id: ex.id,
          status: ex.status,
          reason: forensics.cleanNotes || ex.reason,
          claimPhotoUrl: forensics.claimPhotoUrl,
          forensicStatus: forensics.forensicStatus,
          forensicRisk: forensics.forensicRisk,
          isAiFlagged: forensics.isAiFlagged,
          requestedAt: ex.created_at,
          orderToken: order?.public_token || "N/A",
          orderTotal: ex.total_value_cents || order?.total_cents || 0,
          customerName: custName,
          resolutionType: ex.resolution_type,
          source: "exchange",
        });
      }
    }

    // Mapear solicitações de RMA (Portal B2C do cliente)
    if (rmaRes.data) {
      for (const rma of rmaRes.data) {
        const mappedStatus =
          rma.status === "pending"
            ? "requested"
            : rma.status === "authorized" || rma.status === "received" || rma.status === "inspected" || rma.status === "shipped_back"
            ? "approved"
            : rma.status === "resolved"
            ? "completed"
            : rma.status === "rejected"
            ? "rejected"
            : rma.status;

        const order = (rma as any).orders;
        const custName =
          (rma as any).profiles?.full_name ||
          order?.customer_snapshot?.full_name ||
          order?.customer_snapshot?.name ||
          "Cliente";
        const forensics = parseRmaForensics(rma.notes);
        items.push({
          id: rma.id,
          status: mappedStatus,
          reason: forensics.cleanNotes || rma.notes || `Devolução (${rma.type})`,
          claimPhotoUrl: forensics.claimPhotoUrl,
          forensicStatus: forensics.forensicStatus,
          forensicRisk: forensics.forensicRisk,
          isAiFlagged: forensics.isAiFlagged,
          requestedAt: rma.created_at,
          orderToken: order?.public_token || "N/A",
          orderTotal: order?.total_cents || 0,
          customerName: custName,
          resolutionType: rma.status === "resolved" ? "refund" : undefined,
          source: "rma_request",
        });
      }
    }

    // Ordenação unificada por data decrescente
    items.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());

    return items;
  } catch (e: any) {
    console.error("[exchanges.functions] listExchanges:", e);
    return [];
  }
});

export const updateExchangeStatus = createServerFn({ method: "POST" })
  .validator(
    z.object({
      exchangeId: z.string().uuid(),
      status: z.enum(["requested", "approved", "completed", "rejected"]),
      resolutionType: z.enum(["store_credit", "refund", "replacement"]).optional(),
      refundCents: z.number().int().optional(),
    }),
  )
  .handler(async ({ data: { exchangeId, status, resolutionType, refundCents } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "finance"]);

    // Se estiver concluindo com resolução, usa a RPC atômica idempotente
    if (status === "completed" && resolutionType) {
      let { data: exchange } = await supabase
        .from("exchanges")
        .select("original_order_id, reason, total_value_cents")
        .eq("id", exchangeId)
        .maybeSingle();

      if (!exchange) {
        // Fallback para rma_requests caso tenha sido aberto via portal B2C
        const { data: rma } = await supabase
          .from("rma_requests")
          .select("order_id, notes")
          .eq("id", exchangeId)
          .maybeSingle();

        if (rma) {
          exchange = {
            original_order_id: rma.order_id,
            reason: rma.notes || "Conclusão de Troca / Devolução",
            total_value_cents: 0,
          };
          await supabase
            .from("rma_requests")
            .update({ status: "resolved", updated_at: new Date().toISOString() })
            .eq("id", exchangeId);
        }
      }

      if (!exchange) throw new Error("Troca não encontrada");

      const { data: rpcResult, error: rpcError } = await supabase.rpc("process_exchange_transaction", {
        p_store_id: identity.store_id,
        p_original_order_id: exchange.original_order_id,
        p_resolution_type: resolutionType,
        p_reason: exchange.reason || "Conclusão de Troca",
        p_value_cents: refundCents ?? exchange.total_value_cents ?? 0,
        p_user_id: identity.id,
        p_exchange_id: exchangeId,
      });

      if (rpcError) {
        await logSystemError({
          route: "updateExchangeStatus.rpc",
          page_url: "/workspace/pedidos/trocas",
          schema_name: "public",
          table_name: "exchanges",
          contract_name: "process_exchange_transaction",
          error_message: rpcError.message,
        });
        throw new Error("Erro ao processar transação de troca: " + rpcError.message);
      }

      return { status: "success", rpcResult };
    }

    // Atualização normal de status (approved / rejected)
    const { error } = await supabase
      .from("exchanges")
      .update({
        status,
        processed_by: identity.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", exchangeId)
      .eq("store_id", identity.store_id);

    if (error) {
      // Tenta atualizar rma_requests caso seja solicitação aberta via portal B2C
      const rmaStatus = status === "approved" ? "authorized" : status === "rejected" ? "rejected" : status;
      const { error: rmaErr } = await supabase
        .from("rma_requests")
        .update({ status: rmaStatus, updated_at: new Date().toISOString() })
        .eq("id", exchangeId)
        .eq("store_id", identity.store_id);

      if (rmaErr) {
        await logSystemError({
          route: "updateExchangeStatus",
          page_url: "/workspace/pedidos/trocas",
          schema_name: "public",
          table_name: "exchanges",
          contract_name: "updateExchangeStatus",
          error_message: error.message,
        });
        throw new Error("Erro ao atualizar status: " + error.message);
      }
    }

    return { status: "success" };
  });

// ---------------------------------------------------------------------------
// Customer-facing: list their own exchange requests
// ---------------------------------------------------------------------------

export const listCustomerExchanges = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const ssrClient = await getSSRClient();
    const {
      data: { user },
    } = await ssrClient.auth.getUser();
    if (!user) throw new Error("Não autorizado");

    const supabase = getServerClient();
    const { data, error } = await supabase
      .from("exchanges")
      .select(
        "id, status, reason, created_at, total_value_cents, original_order_id, orders:original_order_id(public_token, total_cents)",
      )
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error instanceof Error ? error.message : String(error));

    return (data || []).map((ex: any) => ({
      id: ex.id,
      status: ex.status as string,
      reason: ex.reason as string,
      requestedAt: ex.created_at as string,
      orderToken: ex.orders?.public_token as string | null,
      orderTotal: ex.total_value_cents || (ex.orders?.total_cents as number | null) || 0,
    }));
  } catch (e: unknown) {
    throw new Error((e instanceof Error ? e.message : String(e)) || "Erro ao buscar trocas.");
  }
});
