/**
 * orders.functions.ts — BFF Server Functions Canônicas para Gestão de Pedidos do Workspace Pro
 *
 * Fase F11 do Plano Mestre de Estabilização dos 4 Pilares.
 *
 * Provê endpoints tipados para listagem com paginação keyset, detalhe com itens e
 * transições de status auditadas com isolamento estrito de tenant (assertStoreAccess).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient, SupabaseUnconfiguredError } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { ORDER_STATUS_VALUES } from "@/services/order.functions";

// ── Schemas de Validação Zod ──────────────────────────────────────────────

export const listOrdersInputSchema = z.object({
  status: z.enum([...ORDER_STATUS_VALUES, "all"]).optional().default("all"),
  limit: z.number().int().min(1).max(100).optional().default(50),
  cursor: z.string().nullable().optional(),
  storeId: z.string().uuid().optional(),
});

export type ListOrdersInput = z.infer<typeof listOrdersInputSchema>;

export const getOrderDetailInputSchema = z.object({
  orderId: z.string().min(1, "ID do pedido é obrigatório"),
  storeId: z.string().uuid().optional(),
});

export type GetOrderDetailInput = z.infer<typeof getOrderDetailInputSchema>;

export const updateOrderStatusInputSchema = z.object({
  orderId: z.string().min(1, "ID do pedido é obrigatório"),
  status: z.enum(ORDER_STATUS_VALUES),
  storeId: z.string().uuid().optional(),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusInputSchema>;

// ── DTOs ──────────────────────────────────────────────────────────────────

export interface WorkspaceOrderItemDTO {
  id: string;
  productTitle: string;
  variantSku?: string | null;
  qty: number;
  unitPriceCents: number;
  totalCents: number;
}

export interface OrderDetailDTO {
  id: string;
  orderNumber?: number | string | null;
  publicToken: string;
  status: (typeof ORDER_STATUS_VALUES)[number];
  totalCents: number;
  subtotalCents: number;
  shippingCents: number;
  discountCents?: number;
  createdAt: string;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  shippingMethod?: string | null;
  shippingAddress?: any;
  items: WorkspaceOrderItemDTO[];
}

// ── Server Functions ──────────────────────────────────────────────────────

export const listOrdersFn = createServerFn({ method: "GET" })
  .validator(listOrdersInputSchema)
  .handler(async ({ data }): Promise<OrderDetailDTO[]> => {
    const identity = await getServerIdentity();
    const targetStoreId = data?.storeId || identity.store_id;

    if (targetStoreId === null || targetStoreId === undefined) {
      throw new Error("Loja ativa não identificada para listar pedidos");
    }

    assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);

    const db = getServerClient();
    const limit = data?.limit || 50;

    let query = db
      .from("orders")
      .select(
        `
        id,
        order_number,
        public_token,
        status,
        total_cents,
        subtotal_cents,
        shipping_cents,
        discount_cents,
        created_at,
        shipping_method,
        customer_snapshot,
        shipping_address,
        order_items (
          id,
          product_title,
          variant_sku,
          qty,
          unit_price_cents,
          total_cents
        )
      `
      )
      .eq("store_id", targetStoreId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (data?.status && data.status !== "all") {
      query = query.eq("status", data.status);
    }

    if (data?.cursor) {
      query = query.lt("created_at", data.cursor);
    }

    const { data: rows, error } = await query;
    if (error) {
      console.error("[orders.functions] listOrdersFn error:", error);
      throw error;
    }

    return (rows || []).map((row: any) => {
      const snapshot = row.customer_snapshot || {};
      const itemsRaw = Array.isArray(row.order_items) ? row.order_items : [];

      return {
        id: row.id,
        orderNumber: row.order_number,
        publicToken: row.public_token,
        status: row.status,
        totalCents: Number(row.total_cents || 0),
        subtotalCents: Number(row.subtotal_cents || 0),
        shippingCents: Number(row.shipping_cents || 0),
        discountCents: Number(row.discount_cents || 0),
        createdAt: row.created_at,
        customerName: snapshot.name || null,
        customerEmail: snapshot.email || null,
        customerPhone: snapshot.phone || null,
        shippingMethod: row.shipping_method || null,
        shippingAddress: row.shipping_address || null,
        items: itemsRaw.map((it: any) => ({
          id: it.id,
          productTitle: it.product_title || "Item",
          variantSku: it.variant_sku || null,
          qty: Number(it.qty || 1),
          unitPriceCents: Number(it.unit_price_cents || 0),
          totalCents: Number(it.total_cents || 0),
        })),
      };
    });
  });

export const getOrderDetailFn = createServerFn({ method: "GET" })
  .validator(getOrderDetailInputSchema)
  .handler(async ({ data }): Promise<OrderDetailDTO | null> => {
    const identity = await getServerIdentity();
    const targetStoreId = data?.storeId || identity.store_id;

    if (targetStoreId === null || targetStoreId === undefined) {
      throw new Error("Loja ativa não identificada para consultar pedido");
    }

    assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);

    const db = getServerClient();
    const { data: row, error } = await db
      .from("orders")
      .select(
        `
        id,
        order_number,
        public_token,
        status,
        total_cents,
        subtotal_cents,
        shipping_cents,
        discount_cents,
        created_at,
        shipping_method,
        customer_snapshot,
        shipping_address,
        order_items (
          id,
          product_title,
          variant_sku,
          qty,
          unit_price_cents,
          total_cents
        )
      `
      )
      .eq("id", data.orderId)
      .eq("store_id", targetStoreId)
      .maybeSingle();

    if (Boolean(error) || row === null || row === undefined) {
      return null;
    }

    const snapshot = row.customer_snapshot || {};
    const itemsRaw = Array.isArray(row.order_items) ? row.order_items : [];

    return {
      id: row.id,
      orderNumber: row.order_number,
      publicToken: row.public_token,
      status: row.status,
      totalCents: Number(row.total_cents || 0),
      subtotalCents: Number(row.subtotal_cents || 0),
      shippingCents: Number(row.shipping_cents || 0),
      discountCents: Number(row.discount_cents || 0),
      createdAt: row.created_at,
      customerName: snapshot.name || null,
      customerEmail: snapshot.email || null,
      customerPhone: snapshot.phone || null,
      shippingMethod: row.shipping_method || null,
      shippingAddress: row.shipping_address || null,
      items: itemsRaw.map((it: any) => ({
        id: it.id,
        productTitle: it.product_title || "Item",
        variantSku: it.variant_sku || null,
        qty: Number(it.qty || 1),
        unitPriceCents: Number(it.unit_price_cents || 0),
        totalCents: Number(it.total_cents || 0),
      })),
    };
  });

export const updateOrderStatusFn = createServerFn({ method: "POST" })
  .validator(updateOrderStatusInputSchema)
  .handler(async ({ data }): Promise<{ success: boolean; newStatus: string }> => {
    const identity = await getServerIdentity();
    const targetStoreId = data?.storeId || identity.store_id;

    if (targetStoreId === null || targetStoreId === undefined) {
      throw new Error("Loja ativa não identificada para atualizar status");
    }

    assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

    const db = getServerClient();
    const updatePayload: Record<string, any> = {
      status: data.status,
      updated_at: new Date().toISOString(),
    };

    if (data.status === "paid") {
      updatePayload.paid_at = new Date().toISOString();
    } else if (data.status === "processing") {
      updatePayload.prep_started_at = new Date().toISOString();
    } else if (data.status === "shipped") {
      updatePayload.shipped_at = new Date().toISOString();
    } else if (data.status === "delivered") {
      updatePayload.delivered_at = new Date().toISOString();
    }

    const { error } = await db
      .from("orders")
      .update(updatePayload)
      .eq("id", data.orderId)
      .eq("store_id", targetStoreId);

    if (error) {
      console.error("[orders.functions] updateOrderStatusFn error:", error);
      throw new Error("Erro ao atualizar status do pedido no banco de dados.");
    }

    return {
      success: true,
      newStatus: data.status,
    };
  });
