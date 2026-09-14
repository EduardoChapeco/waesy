import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

export interface CondicionalItemDTO {
  id: string;
  condicional_id: string;
  name: string;
  size?: string | null;
  price_cents: number;
  status: "with_customer" | "returned" | "purchased";
  product_id?: string | null;
  variant_id?: string | null;
  created_at: string;
}

export interface StoreCondicionalDTO {
  id: string;
  store_id: string;
  customer_name: string;
  customer_phone?: string | null;
  customer_id?: string | null;
  dispatch_date: string;
  return_due_date: string;
  status: "open" | "due_today" | "overdue" | "closed";
  notes?: string | null;
  total_estimated_cents: number;
  total_sold_cents: number;
  items: CondicionalItemDTO[];
  created_at: string;
  updated_at: string;
}

/**
 * Lista condicionais da loja a partir do banco de dados real.
 */
export const listStoreCondicionais = createServerFn({ method: "GET" })
  .validator(
    z.object({
      storeId: z.string().uuid().optional(),
      filter: z.enum(["all", "open", "due_today", "overdue", "closed"]).default("all"),
      search: z.string().optional(),
    }).optional()
  )
  .handler(async ({ data }): Promise<StoreCondicionalDTO[]> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "seller", "manager"]);

    const targetStoreId = data?.storeId || identity.store_id;
    if (!targetStoreId) return [];

    let query = supabase
      .from("store_condicionais")
      .select("*, items:condicional_items(*)")
      .eq("store_id", targetStoreId)
      .order("created_at", { ascending: false });

    const { data: rows, error } = await query;
    if (error) {
      console.error("[listStoreCondicionais] Error fetching condicionais:", error);
      return [];
    }

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const mapped = (rows || []).map((row: any) => {
      const dueDate = new Date(row.return_due_date);
      const dueDateStr = dueDate.toISOString().slice(0, 10);
      let calculatedStatus: "open" | "due_today" | "overdue" | "closed" = row.status;

      if (row.status !== "closed") {
        if (dueDateStr === todayStr) {
          calculatedStatus = "due_today";
        } else if (dueDate < now) {
          calculatedStatus = "overdue";
        } else {
          calculatedStatus = "open";
        }
      }

      return {
        ...row,
        status: calculatedStatus,
        items: (row.items || []) as CondicionalItemDTO[],
      };
    });

    let filtered = mapped;
    if (data?.filter && data.filter !== "all") {
      filtered = mapped.filter((item) => item.status === data.filter);
    }

    if (data?.search && data.search.trim()) {
      const term = data.search.toLowerCase().trim();
      filtered = filtered.filter(
        (c) =>
          c.customer_name.toLowerCase().includes(term) ||
          (c.customer_phone && c.customer_phone.includes(term)) ||
          (c.notes && c.notes.toLowerCase().includes(term))
      );
    }

    return filtered;
  });

/**
 * Cria uma nova mala / saída em condicional.
 */
export const createStoreCondicional = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid().optional(),
      customerName: z.string().min(2),
      customerPhone: z.string().optional().nullable(),
      returnDueDate: z.string(),
      notes: z.string().optional().nullable(),
      items: z.array(
        z.object({
          name: z.string().min(1),
          size: z.string().optional().nullable(),
          priceCents: z.number().int().positive(),
          productId: z.string().uuid().optional().nullable(),
          variantId: z.string().uuid().optional().nullable(),
        })
      ).min(1),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "seller", "manager"]);

    const targetStoreId = data.storeId || identity.store_id;
    if (!targetStoreId) throw new Error("Loja não identificada.");

    const totalEstimatedCents = data.items.reduce((acc, item) => acc + item.priceCents, 0);

    const { data: condicional, error: condError } = await supabase
      .from("store_condicionais")
      .insert({
        store_id: targetStoreId,
        customer_name: data.customerName,
        customer_phone: data.customerPhone || null,
        dispatch_date: new Date().toISOString(),
        return_due_date: data.returnDueDate,
        status: "open",
        notes: data.notes || null,
        total_estimated_cents: totalEstimatedCents,
        total_sold_cents: 0,
      })
      .select()
      .single();

    if (condError || !condicional) {
      console.error("[createStoreCondicional] Insert condicional error:", condError);
      throw new Error(`Falha ao criar condicional: ${condError?.message}`);
    }

    const itemsPayload = data.items.map((it) => ({
      condicional_id: condicional.id,
      store_id: targetStoreId,
      name: it.name,
      size: it.size || null,
      price_cents: it.priceCents,
      product_id: it.productId || null,
      variant_id: it.variantId || null,
      status: "with_customer",
    }));

    const { error: itemsError } = await supabase.from("condicional_items").insert(itemsPayload);
    if (itemsError) {
      console.error("[createStoreCondicional] Insert items error:", itemsError);
      throw new Error(`Falha ao registrar itens do condicional: ${itemsError.message}`);
    }

    return condicional;
  });

/**
 * Atualiza status de itens e fecha condicional se concluído.
 */
export const resolveCondicionalItems = createServerFn({ method: "POST" })
  .validator(
    z.object({
      condicionalId: z.string().uuid(),
      items: z.array(
        z.object({
          id: z.string().uuid(),
          action: z.enum(["keep", "return", "purchase"]),
        })
      ),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "seller", "manager"]);

    for (const itemAction of data.items) {
      if (itemAction.action === "return") {
        await supabase
          .from("condicional_items")
          .update({ status: "returned", updated_at: new Date().toISOString() })
          .eq("id", itemAction.id);
      } else if (itemAction.action === "purchase") {
        await supabase
          .from("condicional_items")
          .update({ status: "purchased", updated_at: new Date().toISOString() })
          .eq("id", itemAction.id);
      }
    }

    // Recalcula totais da condicional
    const { data: allItems } = await supabase
      .from("condicional_items")
      .select("*")
      .eq("condicional_id", data.condicionalId);

    const items = allItems || [];
    const totalSoldCents = items
      .filter((i) => i.status === "purchased")
      .reduce((acc, i) => acc + (i.price_cents || 0), 0);

    const hasItemsWithCustomer = items.some((i) => i.status === "with_customer");
    const newStatus = hasItemsWithCustomer ? "open" : "closed";

    await supabase
      .from("store_condicionais")
      .update({
        total_sold_cents: totalSoldCents,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.condicionalId);

    return { success: true, totalSoldCents, isClosed: !hasItemsWithCustomer };
  });
