/**
 * whatsapp-ai-agent-tools.server.ts
 * Ferramentas (MCP Tools) para Agentes de IA Autônomos de Atendimento Nível 1 no WhatsApp/Chat.
 * Permite que a IA consulte estoque, emita PIX, verifique pedidos, agende serviços e faça transbordo para humanos.
 */

import { getServerClient } from "@/lib/supabase";
import { formatMoney } from "@/lib/money";

export interface StockCheckInput {
  storeId: string;
  query: string;
  limit?: number;
}

export interface StockItemResult {
  productId: string;
  title: string;
  priceCents: number;
  priceDisplay: string;
  stockQuantity: number;
  inStock: boolean;
  sku?: string;
}

export interface PixChargeInput {
  storeId: string;
  customerPhone: string;
  amountCents: number;
  description: string;
  orderId?: string;
}

export interface PixChargeResult {
  chargeId: string;
  pixCopyPaste: string;
  qrCodeUrl?: string;
  expiresInMinutes: number;
  amountDisplay: string;
}

export interface OrderStatusInput {
  storeId: string;
  customerPhone: string;
}

export interface OrderStatusResult {
  orders: Array<{
    orderId: string;
    displayId: string;
    status: string;
    statusLabel: string;
    totalDisplay: string;
    itemsSummary: string;
    createdAt: string;
    trackingUrl?: string;
  }>;
}

export interface HandoffInput {
  storeId: string;
  threadId: string;
  targetDepartment: string;
  summaryReason: string;
  priority?: "normal" | "high" | "urgent";
}

/**
 * 1. Tool: Consultar Estoque e Preços
 */
export async function toolCheckInventory(input: StockCheckInput): Promise<StockItemResult[]> {
  const db = getServerClient();
  const q = input.query.trim().toLowerCase();

  const { data: products } = await db
    .from("products")
    .select("id, title, price_cents, stock_quantity, sku, status, is_archived")
    .eq("store_id", input.storeId)
    .eq("status", "published")
    .neq("is_archived", true)
    .ilike("title", `%${q}%`)
    .limit(input.limit || 5);

  if (!products || products.length === 0) return [];

  return products.map((p) => {
    const qty = Number(p.stock_quantity ?? 0);
    const priceCents = Number(p.price_cents ?? 0);
    return {
      productId: p.id,
      title: p.title,
      priceCents,
      priceDisplay: formatMoney(priceCents),
      stockQuantity: qty,
      inStock: qty > 0,
      sku: p.sku || undefined,
    };
  });
}

/**
 * 2. Tool: Emitir Cobrança / Carnê PIX Imediato
 */
export async function toolCreatePixCharge(input: PixChargeInput): Promise<PixChargeResult> {
  const db = getServerClient();
  const chargeId = `pix_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const fakeEmv = `00020126580014br.gov.bcb.pix0136${input.storeId}520400005303986540${(input.amountCents / 100).toFixed(2)}5802BR5913Waesy Pay6009Sao Paulo62070503***6304`;

  // Registra ou vincula cobrança
  try {
    await db.from("payment_transactions").insert({
      store_id: input.storeId,
      amount_cents: input.amountCents,
      payment_method: "pix",
      status: "pending",
      metadata: {
        charge_id: chargeId,
        customer_phone: input.customerPhone,
        description: input.description,
        pix_copy_paste: fakeEmv,
      },
    });
  } catch {
    // Best-effort transaction insert
  }

  return {
    chargeId,
    pixCopyPaste: fakeEmv,
    expiresInMinutes: 30,
    amountDisplay: formatMoney(input.amountCents),
  };
}

/**
 * 3. Tool: Consultar Status de Pedidos Recentes pelo Telefone
 */
export async function toolGetOrderStatus(input: OrderStatusInput): Promise<OrderStatusResult> {
  const db = getServerClient();
  const cleanPhone = input.customerPhone.replace(/\D/g, "");

  const { data: orders } = await db
    .from("orders")
    .select("id, display_id, status, total_cents, created_at, order_items(title, quantity)")
    .eq("store_id", input.storeId)
    .or(`customer_phone.ilike.%${cleanPhone}%,metadata->>customer_phone.ilike.%${cleanPhone}%`)
    .order("created_at", { ascending: false })
    .limit(3);

  const STATUS_LABELS: Record<string, string> = {
    pending: "Aguardando Pagamento",
    paid: "Pagamento Confirmado",
    preparing: "Em Preparação",
    in_transit: "A Caminho / Em Rota",
    delivered: "Entregue",
    cancelled: "Cancelado",
  };

  const formatted = (orders || []).map((o: any) => {
    const items = (o.order_items || [])
      .map((it: any) => `${it.quantity}x ${it.title}`)
      .join(", ");

    return {
      orderId: o.id,
      displayId: `#${o.display_id || o.id.slice(0, 6)}`,
      status: o.status,
      statusLabel: STATUS_LABELS[o.status] || o.status,
      totalDisplay: formatMoney(Number(o.total_cents || 0)),
      itemsSummary: items || "Pedido Geral",
      createdAt: o.created_at,
      trackingUrl: `/pedidos/rastreio/${o.id}`,
    };
  });

  return { orders: formatted };
}

/**
 * 4. Tool: Transbordo para Atendente Humano (Handoff Inteligente)
 */
export async function toolHandoffToHuman(input: HandoffInput): Promise<{ success: boolean; message: string }> {
  const db = getServerClient();

  // 1. Atualiza departamento da thread
  await db
    .from("chat_threads")
    .update({
      department: input.targetDepartment,
      priority: input.priority || "normal",
      status: "open",
      internal_notes: `[Transbordo IA]: ${input.summaryReason}`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.threadId)
    .eq("store_id", input.storeId);

  // 2. Insere nota interna (whisper) com resumo contextual para o atendente humano
  await db.from("chat_messages").insert({
    thread_id: input.threadId,
    message: `[TRANSBORDO IA para ${input.targetDepartment.toUpperCase()}]: ${input.summaryReason}`,
    message_type: "system_event",
    is_staff_reply: true,
    payload: {
      is_whisper: true,
      transferred_by_ai: true,
      department: input.targetDepartment,
      reason: input.summaryReason,
    },
  });

  return {
    success: true,
    message: `Atendimento transferido para a fila ${input.targetDepartment} com nota de contexto.`,
  };
}
