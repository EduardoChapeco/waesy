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
  priceCents?: number;
  status: "with_customer" | "returned" | "purchased";
  product_id?: string | null;
  variant_id?: string | null;
  created_at: string;
}

export interface StoreCondicionalDTO {
  id: string;
  store_id: string;
  customer_name: string;
  customerName?: string;
  customer_phone?: string | null;
  customerPhone?: string | null;
  customer_id?: string | null;
  dispatch_date: string;
  dispatchDate?: string;
  return_due_date: string;
  returnDueDate?: string;
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
        customerName: row.customer_name,
        customerPhone: row.customer_phone,
        dispatchDate: row.dispatch_date,
        returnDueDate: row.return_due_date,
        status: calculatedStatus,
        items: (row.items || []).map((it: any) => ({
          ...it,
          priceCents: it.price_cents,
        })) as CondicionalItemDTO[],
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

/**
 * Converte as compras de um condicional em um carnê digital formal.
 */
export const convertCondicionalToCarne = createServerFn({ method: "POST" })
  .validator(
    z.object({
      condicionalId: z.string().uuid(),
      debtorId: z.string().uuid(),
      installmentsCount: z.number().int().min(1).max(72),
      firstDueDate: z.string(),
      interestRateMonthly: z.number().min(0).default(0),
      finePercent: z.number().min(0).default(0),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "seller", "manager"]);

    const { data: cond, error: condErr } = await supabase
      .from("store_condicionais")
      .select("*, items:condicional_items(*)")
      .eq("id", data.condicionalId)
      .single();

    if (condErr || !cond) throw new Error("Condicional não encontrado.");
    assertStoreAccess(identity, undefined, cond.store_id);

    const purchasedItems = (cond.items || []).filter((it: any) => it.status === "purchased");
    const totalCents = purchasedItems.reduce((acc: number, it: any) => acc + (it.price_cents || 0), 0);

    if (totalCents <= 0) {
      throw new Error("Não há itens comprados neste condicional para emissão de carnê.");
    }

    const { data: rpcRes, error: rpcErr } = await supabase.rpc("create_receivable_with_installments", {
      p_creditor_id: identity.id,
      p_debtor_id: data.debtorId,
      p_store_id: cond.store_id,
      p_contract_id: null,
      p_deal_id: null,
      p_title: `Carnê — Mala Ref. ${cond.id.substring(0, 8).toUpperCase()} (${cond.customer_name})`,
      p_description: `Conversão de mala condicional em compras parceladas (${purchasedItems.length} peças).`,
      p_total_cents: totalCents,
      p_installments_count: data.installmentsCount,
      p_first_due_date: new Date(data.firstDueDate).toISOString(),
      p_interest_rate_monthly: data.interestRateMonthly,
      p_fine_percent: data.finePercent,
      p_grace_days: 0,
    });

    if (rpcErr) throw new Error("Erro ao emitir carnê: " + rpcErr.message);

    const recId = (rpcRes as any)?.receivable_id;
    if (recId) {
      await supabase
        .from("receivables")
        .update({
          origin_type: "condicional_conversion",
          metadata: {
            condicional_id: cond.id,
            customer_name: cond.customer_name,
            customer_phone: cond.customer_phone,
            items_count: purchasedItems.length,
          },
        })
        .eq("id", recId);
    }

    // Fechar condicional se tudo foi resolvido
    await supabase
      .from("store_condicionais")
      .update({
        status: "closed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", cond.id);

    return {
      success: true,
      receivableId: recId,
      totalCents,
      installmentsCount: data.installmentsCount,
    };
  });
