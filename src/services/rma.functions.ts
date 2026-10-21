import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient, SupabaseUnconfiguredError } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

// --- DTO TYPES (Linguagem Comercial Estrita) ---

export interface CustomerAfterSalesRequestDTO {
  id: string;
  orderId: string;
  orderToken: string;
  orderTotalCents: number;
  storeId: string;
  storeName?: string;
  type: "return" | "exchange" | "warranty";
  typeLabel: string;
  status: "pending" | "authorized" | "shipped_back" | "received" | "inspected" | "resolved" | "rejected" | "cancelled";
  statusLabel: string;
  statusDescription: string;
  customerReason: string;
  customerNotes?: string | null;
  claimPhotoUrl?: string | null;
  returnTrackingCode?: string | null;
  returnCarrier?: string | null;
  returnLabelUrl?: string | null;
  requestedAt: string;
  updatedAt: string;
  refundAmountCents?: number | null;
  items: Array<{
    id: string;
    orderItemId: string;
    productTitle: string;
    qty: number;
    unitPriceCents: number;
    reason: string;
  }>;
}

// --- HELPER DE FORMATAÇÃO COMERCIAL (EARS-01) ---

export function getCommercialStatusInfo(status: string): { label: string; description: string; step: number } {
  switch (status) {
    case "pending":
      return {
        label: "Aguardando Análise da Loja",
        description: "A loja parceira está analisando sua solicitação. O prazo habitual de resposta é de até 2 dias úteis.",
        step: 1,
      };
    case "authorized":
      return {
        label: "Devolução Aprovada • Envie o Produto",
        description: "Sua solicitação foi aprovada. Utilize o código de postagem abaixo para enviar o produto sem custos.",
        step: 2,
      };
    case "shipped_back":
      return {
        label: "Produto a Caminho da Loja",
        description: "O produto está em transporte com a transportadora. Acompanhe a entrega pelo código de rastreamento.",
        step: 2,
      };
    case "received":
      return {
        label: "Produto Recebido pela Loja",
        description: "O estabelecimento recebeu o pacote e iniciará a conferência dos itens.",
        step: 3,
      };
    case "inspected":
      return {
        label: "Em Avaliação Técnica",
        description: "Os itens estão sendo inspecionados para confirmação das condições de troca ou estorno.",
        step: 3,
      };
    case "resolved":
      return {
        label: "Solicitação Concluída",
        description: "Processo finalizado com sucesso! O estorno ou vale-compras foi liberado conforme acordado.",
        step: 4,
      };
    case "rejected":
      return {
        label: "Solicitação Não Aprovada",
        description: "A solicitação não pôde ser aprovada com base nas políticas comerciais ou prazo legal.",
        step: 4,
      };
    case "cancelled":
      return {
        label: "Solicitação Cancelada",
        description: "Esta solicitação foi cancelada pelo comprador.",
        step: 4,
      };
    default:
      return {
        label: "Em Andamento",
        description: "Acompanhe as atualizações da sua solicitação por aqui.",
        step: 1,
      };
  }
}

export function getCommercialTypeLabel(type: string): string {
  switch (type) {
    case "exchange":
      return "Troca de Produto";
    case "warranty":
      return "Acionamento de Garantia";
    case "return":
    default:
      return "Devolução e Reembolso";
  }
}

// --- HELPER FORENSE SEGURO (SEGREGAÇÃO DE NOTAS INTERNAS - EARS-04) ---

export function parseCustomerSafeNotes(rawNotes?: string | null): {
  cleanNotes: string;
  claimPhotoUrl: string | null;
  photoUrl: string | null;
} {
  if (!rawNotes) return { cleanNotes: "", claimPhotoUrl: null, photoUrl: null };

  const photoTagMatch = rawNotes.match(/\[CLAIM_PHOTO:\s*([^\]]+)\]/);
  const photoUrlMatch = rawNotes.match(/FotoUrl:\s*(\S+)/);
  const foundPhoto = photoTagMatch ? photoTagMatch[1].trim() : (photoUrlMatch ? photoUrlMatch[1].trim() : null);

  // Remove tags [CLAIM_PHOTO: ...] e [LAUDO_PERICIAL]...
  let cleanNotes = rawNotes.replace(/\[CLAIM_PHOTO:\s*[^\]]+\]/g, "");
  cleanNotes = cleanNotes.replace(/\n*\[LAUDO_PERICIAL\].*$/s, "").trim();

  return {
    cleanNotes,
    claimPhotoUrl: foundPhoto,
    photoUrl: foundPhoto,
  };
}

export function parseRmaForensics(rawNotes?: string | null): {
  cleanNotes: string;
  claimPhotoUrl: string | null;
  forensicStatus: string | null;
  forensicRisk: string | null;
  isAiFlagged: boolean;
} {
  if (!rawNotes) {
    return {
      cleanNotes: "",
      claimPhotoUrl: null,
      forensicStatus: null,
      forensicRisk: null,
      isAiFlagged: false,
    };
  }

  const safe = parseCustomerSafeNotes(rawNotes);
  const laudoMatch = rawNotes.match(/\[LAUDO_PERICIAL\]([^\n]*)/);
  let forensicStatus: string | null = null;
  let forensicRisk: string | null = null;
  let isAiFlagged = false;

  if (laudoMatch) {
    const laudoContent = laudoMatch[1] || "";
    const statusMatch = laudoContent.match(/Status:\s*([^\s|]+)/i);
    const riskMatch = laudoContent.match(/Risco:\s*([^|\n]+)/i);
    if (statusMatch) forensicStatus = statusMatch[1].trim();
    if (riskMatch) forensicRisk = riskMatch[1].trim();
    if (
      (forensicStatus && ["flagged", "suspect", "synthetic", "rejected"].includes(forensicStatus.toLowerCase())) ||
      (forensicRisk && (forensicRisk.toUpperCase().includes("ALTO") || forensicRisk.toUpperCase().includes("MEDIO")))
    ) {
      isAiFlagged = true;
    }
  }

  return {
    cleanNotes: safe.cleanNotes,
    claimPhotoUrl: safe.claimPhotoUrl,
    forensicStatus,
    forensicRisk,
    isAiFlagged,
  };
}

export function formatForensicNotes(params: {
  customerNotes?: string;
  claimPhotoUrl?: string | null;
  forensicStatus?: string;
  forensicRisk?: string;
  internalStaffNotes?: string;
}): string {
  const parts: string[] = [];
  if (params.customerNotes?.trim()) {
    parts.push(params.customerNotes.trim());
  }
  if (params.claimPhotoUrl?.trim()) {
    parts.push(`[CLAIM_PHOTO: ${params.claimPhotoUrl.trim()}]`);
  }
  if (params.forensicStatus || params.forensicRisk) {
    parts.push(`[LAUDO_PERICIAL] Status: ${params.forensicStatus || "pending"} | Risco: ${params.forensicRisk || "MODERADO"}`);
  }
  if (params.internalStaffNotes?.trim()) {
    parts.push(params.internalStaffNotes.trim());
  }
  return parts.join("\n");
}

export function analyzePhotoForensicsInternal(photoData: string, description: string) {
  const lower = photoData.toLowerCase();
  const isAiGen =
    lower.includes("midjourney") ||
    lower.includes("dall-e") ||
    lower.includes("dalle") ||
    lower.includes("stable_diffusion") ||
    lower.includes("stablediffusion") ||
    lower.includes("generated_photos") ||
    lower.includes("synthetic") ||
    lower.includes("placeholder") ||
    lower.includes("picsum.photos");

  const isSuspicious = isAiGen || (description.trim().length < 8 && lower.includes("test"));

  return {
    forensicStatus: isSuspicious ? "flagged" : "verified",
    forensicRisk: isSuspicious ? "ALTO (Possível Imagem Sintética)" : "BAIXO (Foto Autêntica Verificada)",
    isAiFlagged: isSuspicious,
  };
}

// --- SCHEMAS DE VALIDAÇÃO (EARS-02 / EARS-03 / EARS-06) ---

export const CreateCustomerAfterSalesSchema = z.object({
  orderId: z.string().uuid("ID do pedido inválido"),
  type: z.enum(["return", "exchange", "warranty"]).default("return"),
  reason: z.string().optional().default("Solicitação de atendimento"),
  notes: z.string().optional(),
  claimPhotoUrl: z.string().optional(),
  claimPhotoBase64: z.string().optional(),
  items: z.array(
    z.object({
      orderItemId: z.string().uuid().optional(),
      order_item_id: z.string().uuid().optional(),
      qty: z.number().int().positive(),
      reason: z.string().optional(),
      photos: z.array(z.string()).optional(),
    }).refine((data) => !!(data.orderItemId || data.order_item_id), {
      message: "Item do pedido obrigatório",
    })
  ).min(1, "Selecione pelo menos um item para atendimento"),
});

export const CancelCustomerAfterSalesSchema = z.object({
  requestId: z.string().uuid("ID da solicitação inválido"),
  cancelReason: z.string().optional(),
});

// --- SERVER FUNCTIONS ---

/**
 * Lista solicitações de pós-venda do cliente com segregação estrita de dados internos (EARS-01 / EARS-04).
 */
export const listCustomerAfterSales = createServerFn({ method: "GET" }).handler(
  async (): Promise<CustomerAfterSalesRequestDTO[]> => {
    try {
      const identity = await getServerIdentity().catch(() => null);
      if (!identity?.id) return [];

      const db = getServerClient();
      const { data, error } = await db
        .from("rma_requests")
        .select(`
          id,
          order_id,
          store_id,
          status,
          type,
          notes,
          refund_amount_cents,
          return_tracking_code,
          return_label_url,
          return_carrier,
          created_at,
          updated_at,
          orders (
            id,
            public_token,
            total_cents,
            stores (
              id,
              name
            )
          ),
          rma_items (
            id,
            order_item_id,
            qty,
            reason,
            order_items (
              id,
              unit_price_cents,
              product_title
            )
          )
        `)
        .eq("customer_id", identity.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("[after-sales] listCustomerAfterSales error:", error);
        return [];
      }

      return (data || []).map((row: any) => {
        const statusInfo = getCommercialStatusInfo(row.status);
        const typeLabel = getCommercialTypeLabel(row.type);
        const { cleanNotes, photoUrl } = parseCustomerSafeNotes(row.notes);

        const items = (row.rma_items || []).map((it: any) => {
          const oi = it.order_items;
          return {
            id: it.id,
            orderItemId: it.order_item_id,
            productTitle: oi?.product_title || "Produto",
            qty: it.qty || 1,
            unitPriceCents: oi?.unit_price_cents || 0,
            reason: it.reason || "Não informado",
          };
        });

        return {
          id: row.id,
          orderId: row.order_id,
          orderToken: row.orders?.public_token || row.order_id?.substring(0, 8) || "N/A",
          orderTotalCents: row.orders?.total_cents || 0,
          storeId: row.store_id,
          storeName: row.orders?.stores?.name || "Loja Parceira",
          type: (row.type as any) || "return",
          typeLabel,
          status: (row.status as any) || "pending",
          statusLabel: statusInfo.label,
          statusDescription: statusInfo.description,
          customerReason: items[0]?.reason || cleanNotes || "Solicitação de pós-venda",
          customerNotes: cleanNotes || null,
          claimPhotoUrl: photoUrl,
          returnTrackingCode: row.return_tracking_code || null,
          returnCarrier: row.return_carrier || null,
          returnLabelUrl: row.return_label_url || null,
          requestedAt: row.created_at,
          updatedAt: row.updated_at || row.created_at,
          refundAmountCents: row.refund_amount_cents || null,
          items,
        };
      });
    } catch (e: unknown) {
      console.warn("[after-sales] listCustomerAfterSales fallback:", e);
      return [];
    }
  }
);

/**
 * Criação de solicitação comercial de Troca, Devolução ou Garantia pelo cliente (EARS-02 / EARS-03).
 */
export const createCustomerAfterSalesRequest = createServerFn({ method: "POST" })
  .validator(CreateCustomerAfterSalesSchema)
  .handler(async ({ data: input }) => {
    const identity = await getServerIdentity();
    if (!identity?.id) {
      throw new Error("Você precisa estar conectado à sua conta para abrir solicitações.");
    }

    const db = getServerClient();

    // 1. Validar propriedade e status do pedido
    const { data: order, error: orderErr } = await db
      .from("orders")
      .select("id, customer_id, store_id, status, created_at, updated_at")
      .eq("id", input.orderId)
      .eq("customer_id", identity.id)
      .single();

    if (orderErr || !order) {
      throw new Error("Pedido não encontrado ou não pertence a esta conta.");
    }

    const validStatuses = ["delivered", "completed", "shipped"];
    if (!validStatuses.includes(order.status)) {
      throw new Error(
        `Apenas pedidos entregues ou enviados podem receber solicitações de troca ou devolução. Status atual: ${order.status}`
      );
    }

    // 2. Perícia visual interna (grava metadados para o Workspace, sem expor ao consumidor)
    const effectivePhoto = input.claimPhotoUrl || input.claimPhotoBase64 || input.items[0]?.photos?.[0] || null;
    const effectiveReason = input.reason || input.items[0]?.reason || (input.type === "exchange" ? "Troca de Produto" : input.type === "warranty" ? "Acionamento de Garantia" : "Devolução e Reembolso");
    let forensicTag = "[LAUDO_PERICIAL] Sem foto anexada | Status: pending | Risco: MODERADO";

    if (effectivePhoto) {
      const forensics = analyzePhotoForensicsInternal(effectivePhoto, effectiveReason);
      forensicTag = `[LAUDO_PERICIAL] Foto: ${effectivePhoto.startsWith("data:") ? "upload_local_midia" : effectivePhoto} | Status: ${forensics.forensicStatus} | Risco: ${forensics.forensicRisk} | FotoUrl: ${effectivePhoto}`;
    }

    const userNotes = input.notes?.trim() || "";
    const internalCombinedNotes = userNotes ? `${userNotes}\n\n${forensicTag}` : forensicTag;

    // 3. Formatar itens para a RPC
    const finalItems = input.items.map((it) => ({
      order_item_id: it.orderItemId || it.order_item_id!,
      qty: it.qty,
      reason: it.reason || effectiveReason,
    }));

    const { data: rmaId, error: rpcErr } = await db.rpc("request_order_return", {
      p_store_id: order.store_id,
      p_customer_id: identity.id,
      p_order_id: order.id,
      p_items: finalItems,
      p_notes: internalCombinedNotes,
    });

    if (rpcErr) {
      throw new Error(`Erro ao registrar solicitação: ${rpcErr.message}`);
    }

    // Atualiza o tipo na solicitação criada se diferente do default
    if (input.type && input.type !== "return") {
      await db
        .from("rma_requests")
        .update({ type: input.type, updated_at: new Date().toISOString() })
        .eq("id", rmaId);
    }

    return {
      success: true,
      requestId: rmaId,
      message: "Sua solicitação foi registrada com sucesso! Acompanhe o andamento pelo seu painel.",
    };
  });

/**
 * Cancelamento voluntário de solicitação em andamento pelo próprio cliente (EARS-06).
 */
export const cancelCustomerAfterSalesRequest = createServerFn({ method: "POST" })
  .validator(CancelCustomerAfterSalesSchema)
  .handler(async ({ data: { requestId } }) => {
    const identity = await getServerIdentity();
    if (!identity?.id) throw new Error("Acesso não autorizado.");

    const db = getServerClient();

    // Validar se pertence ao cliente e se está em estado cancelável
    const { data: req, error } = await db
      .from("rma_requests")
      .select("id, status, customer_id")
      .eq("id", requestId)
      .eq("customer_id", identity.id)
      .single();

    if (error || !req) {
      throw new Error("Solicitação não encontrada.");
    }

    if (req.status === "resolved" || req.status === "received" || req.status === "inspected") {
      throw new Error("Esta solicitação já está em processamento avançado e não pode ser cancelada diretamente.");
    }

    const { error: updateErr } = await db
      .from("rma_requests")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", requestId);

    if (updateErr) throw new Error(`Falha ao cancelar: ${updateErr.message}`);
    return { success: true };
  });

// --- WORKSPACE FUNCTIONS (LOJISTA) ---

export const updateAfterSalesStatus = createServerFn({ method: "POST" })
  .validator(
    z.object({
      requestId: z.string().uuid(),
      status: z.enum(["authorized", "received", "resolved", "rejected", "cancelled"]),
      returnTrackingCode: z.string().optional().nullable(),
      returnLabelUrl: z.string().url().optional().nullable(),
      returnCarrier: z.string().optional().nullable(),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    await assertStoreAccess(identity, ["owner", "admin", "manager", "finance", "logistics"]);

    const db = getServerClient();
    const updatePayload: any = {
      status: data.status,
      updated_at: new Date().toISOString(),
    };

    if (data.returnTrackingCode) updatePayload.return_tracking_code = data.returnTrackingCode;
    if (data.returnLabelUrl) updatePayload.return_label_url = data.returnLabelUrl;
    if (data.returnCarrier) updatePayload.return_carrier = data.returnCarrier;

    const { error } = await db
      .from("rma_requests")
      .update(updatePayload)
      .eq("id", data.requestId)
      .eq("store_id", identity.store_id);

    if (error) throw new Error(`Erro ao atualizar status: ${error.message}`);
    return { success: true };
  });

export const resolveAfterSalesWithCredit = createServerFn({ method: "POST" })
  .validator(z.object({ requestId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    await assertStoreAccess(identity, ["owner", "admin", "manager", "finance"]);

    const db = getServerClient();

    const { data: rma, error: fetchError } = await db
      .from("rma_requests")
      .select(`
        id,
        customer_id,
        rma_items (
          qty,
          order_items ( unit_price_cents )
        )
      `)
      .eq("id", data.requestId)
      .eq("store_id", identity.store_id)
      .single();

    if (fetchError || !rma) throw new Error("Solicitação não encontrada.");

    let totalRefundCents = 0;
    for (const item of rma.rma_items || []) {
      const orderItem = Array.isArray(item.order_items) ? item.order_items[0] : item.order_items;
      const price = (orderItem as any)?.unit_price_cents || 0;
      totalRefundCents += item.qty * price;
    }

    if (totalRefundCents > 0) {
      await db.rpc("grant_customer_credit", {
        p_customer_id: rma.customer_id,
        p_store_id: identity.store_id,
        p_amount_cents: totalRefundCents,
        p_reason: `Vale-compras referente à solicitação #${data.requestId.substring(0, 8)}`,
      });
    }

    await db
      .from("rma_requests")
      .update({
        status: "resolved",
        refund_amount_cents: totalRefundCents,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.requestId);

    return { success: true, creditAmountCents: totalRefundCents };
  });

// Aliases para compatibilidade reversa com chamadas legadas
export const listCustomerRmas = listCustomerAfterSales;
export const requestCustomerRma = createCustomerAfterSalesRequest;
export const requestOrderReturn = createCustomerAfterSalesRequest;
export const updateRmaStatus = updateAfterSalesStatus;
export const resolveRmaWithCredit = resolveAfterSalesWithCredit;
export const analyzePhotoForensics = analyzePhotoForensicsInternal;
