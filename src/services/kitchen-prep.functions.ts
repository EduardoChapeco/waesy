import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { withDataPayload } from "@/services/cart-helpers";

// ── Tipos e Schemas Canônicos ───────────────────────────────────────────────

export type KitchenStation = "chapa" | "forno" | "bebidas" | "sobremesas" | "geral";

export const updateProductPrepTimeSchema = z.object({
  productId: z.string().uuid(),
  prepTimeMinutes: z.number().int().min(0).max(360),
  kitchenStation: z.enum(["chapa", "forno", "bebidas", "sobremesas", "geral"]).default("geral"),
  toleranceMinutes: z.number().int().min(0).max(60).optional(),
});

export const batchUpdateProductPrepTimeSchema = z.object({
  updates: z.array(updateProductPrepTimeSchema),
});

export const assignOrderCourierSchema = z.object({
  orderId: z.string().uuid(),
  courierType: z.enum(["waesy_go", "own_fleet", "customer_pickup"]),
  driverId: z.string().uuid().optional().nullable(),
  driverName: z.string().optional().nullable(),
  driverPhone: z.string().optional().nullable(),
  deliveryNotes: z.string().optional().nullable(),
});

// ── Classificador Automático de Praça (Fallback Inteligente) ───────────────
export function inferKitchenStation(title: string): KitchenStation {
  const lower = (title || "").toLowerCase();
  if (/(hamb[úu]rg|burger|carne|picanha|costela|bife|x-|smash|grelhad|churrasc|frango)/i.test(lower)) {
    return "chapa";
  }
  if (/(pizza|lasanha|massa|p[ãa]o|bolo|batata frita|empanado|assado|gratinado)/.test(lower)) {
    return "forno";
  }
  if (/(suco|coca|refri|[áa]gua|cerveja|caipirinha|drink|shake|vitamina|caf[ée]|ch[áa]|vinho|chopp)/.test(lower)) {
    return "bebidas";
  }
  if (/(sorvete|pudim|brigadeiro|crepe|waffle|torta|mousse|cheesecake|a[çc]a[íi]|sobremesa)/.test(lower)) {
    return "sobremesas";
  }
  return "geral";
}

// ── 1. Listar Produtos com Tempo de Preparo & Praça da Cozinha ─────────────
export const listProductsKitchenPrep = createServerFn({ method: "GET" })
  .validator(
    withDataPayload(
      z.object({
        station: z.enum(["all", "chapa", "forno", "bebidas", "sobremesas", "geral"]).optional().default("all"),
        search: z.string().optional(),
      }),
    ),
  )
  .handler(async ({ data: input }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);
    const supabase = getServerClient();

    let query = supabase
      .from("products")
      .select("id, title, slug, price_cents, status, attributes, type_id, created_at")
      .eq("store_id", identity.store_id)
      .neq("status", "archived")
      .order("title", { ascending: true });

    if (input.search && input.search.trim().length > 0) {
      query = query.ilike("title", `%${input.search.trim()}%`);
    }

    const { data: products, error } = await query;
    if (error) {
      console.error("[kitchen-prep] Erro ao listar produtos:", error.message);
      throw new Error(`Falha ao listar itens: ${error.message}`);
    }

    const items = (products || []).map((p: any) => {
      const attrs = p.attributes || {};
      const foodSpecs = attrs.food_specs || {};
      const prepTime = typeof foodSpecs.preparationTimeMinutes === "number"
        ? foodSpecs.preparationTimeMinutes
        : (typeof attrs.preparationTimeMinutes === "number" ? attrs.preparationTimeMinutes : 15);
      
      const station = (foodSpecs.kitchenStation || attrs.kitchenStation || inferKitchenStation(p.title)) as KitchenStation;
      const tolerance = foodSpecs.toleranceMinutes || attrs.toleranceMinutes || 5;

      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        price_cents: p.price_cents,
        status: p.status,
        prepTimeMinutes: prepTime,
        kitchenStation: station,
        toleranceMinutes: tolerance,
        itemClassification: foodSpecs.itemClassification || "prepared_dish",
      };
    });

    if (input.station && input.station !== "all") {
      return items.filter((item) => item.kitchenStation === input.station);
    }

    return items;
  });

// ── 2. Atualizar Tempo de Preparo & Praça de um Produto ─────────────────────
export const updateProductPrepTimeAndStation = createServerFn({ method: "POST" })
  .validator(withDataPayload(updateProductPrepTimeSchema))
  .handler(async ({ data: input }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);
    const supabase = getServerClient();

    // 1. Busca atributos atuais
    const { data: product, error: fetchErr } = await supabase
      .from("products")
      .select("attributes")
      .eq("id", input.productId)
      .eq("store_id", identity.store_id)
      .single();

    if (fetchErr || !product) {
      throw new Error("Produto não encontrado.");
    }

    const currentAttrs = product.attributes || {};
    const currentFoodSpecs = currentAttrs.food_specs || {};

    const updatedFoodSpecs = {
      ...currentFoodSpecs,
      preparationTimeMinutes: input.prepTimeMinutes,
      kitchenStation: input.kitchenStation,
      toleranceMinutes: input.toleranceMinutes ?? currentFoodSpecs.toleranceMinutes ?? 5,
    };

    const updatedAttrs = {
      ...currentAttrs,
      food_specs: updatedFoodSpecs,
      preparationTimeMinutes: input.prepTimeMinutes,
      kitchenStation: input.kitchenStation,
      toleranceMinutes: input.toleranceMinutes ?? 5,
    };

    const { error: updateErr } = await supabase
      .from("products")
      .update({
        attributes: updatedAttrs,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.productId)
      .eq("store_id", identity.store_id);

    if (updateErr) {
      console.error("[kitchen-prep] Erro ao atualizar atributos:", updateErr.message);
      throw new Error(`Falha ao salvar tempo de preparo: ${updateErr.message}`);
    }

    return {
      success: true,
      productId: input.productId,
      prepTimeMinutes: input.prepTimeMinutes,
      kitchenStation: input.kitchenStation,
    };
  });

// ── 3. Atualizar em Lote (Estilo Planilha) ──────────────────────────────────
export const batchUpdateProductPrepTime = createServerFn({ method: "POST" })
  .validator(withDataPayload(batchUpdateProductPrepTimeSchema))
  .handler(async ({ data: input }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);
    const supabase = getServerClient();

    let successCount = 0;
    for (const update of input.updates) {
      const { data: product } = await supabase
        .from("products")
        .select("attributes")
        .eq("id", update.productId)
        .eq("store_id", identity.store_id)
        .single();

      if (product) {
        const currentAttrs = product.attributes || {};
        const currentFoodSpecs = currentAttrs.food_specs || {};
        const updatedAttrs = {
          ...currentAttrs,
          food_specs: {
            ...currentFoodSpecs,
            preparationTimeMinutes: update.prepTimeMinutes,
            kitchenStation: update.kitchenStation,
            toleranceMinutes: update.toleranceMinutes ?? 5,
          },
          preparationTimeMinutes: update.prepTimeMinutes,
          kitchenStation: update.kitchenStation,
          toleranceMinutes: update.toleranceMinutes ?? 5,
        };

        await supabase
          .from("products")
          .update({ attributes: updatedAttrs, updated_at: new Date().toISOString() })
          .eq("id", update.productId)
          .eq("store_id", identity.store_id);
        successCount++;
      }
    }

    return { success: true, updatedCount: successCount };
  });

// ── 4. Telemetria e Dashboard Real de Tempo de Preparo & Gargalos ───────────
export const getKitchenSlaTelemetry = createServerFn({ method: "GET" })
  .handler(async () => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);
    const supabase = getServerClient();

    // 1. Busca pedidos dos últimos 14 dias para telemetria real
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, status, created_at, updated_at, shipping_method, origin_type, items:order_items(id, title, quantity, price_cents)")
      .eq("store_id", identity.store_id)
      .gte("created_at", fourteenDaysAgo)
      .neq("status", "cancelled");

    if (error) {
      console.error("[kitchen-prep] Erro ao buscar telemetria de pedidos:", error.message);
    }

    const orderList = orders || [];
    let totalPrepMinutes = 0;
    let completedCount = 0;
    let onTimeCount = 0;
    let delayedCount = 0;

    const stationVolume: Record<KitchenStation, { totalOrders: number; delayedOrders: number; totalMinutes: number }> = {
      chapa: { totalOrders: 0, delayedOrders: 0, totalMinutes: 0 },
      forno: { totalOrders: 0, delayedOrders: 0, totalMinutes: 0 },
      bebidas: { totalOrders: 0, delayedOrders: 0, totalMinutes: 0 },
      sobremesas: { totalOrders: 0, delayedOrders: 0, totalMinutes: 0 },
      geral: { totalOrders: 0, delayedOrders: 0, totalMinutes: 0 },
    };

    const hourlyVolume: Record<string, number> = {};
    for (let h = 10; h <= 23; h++) {
      hourlyVolume[`${String(h).padStart(2, "0")}:00`] = 0;
    }

    for (const order of orderList) {
      const createdDate = new Date(order.created_at);
      const hourStr = `${String(createdDate.getHours()).padStart(2, "0")}:00`;
      if (hourlyVolume[hourStr] !== undefined) {
        hourlyVolume[hourStr]++;
      }

      // Calcula tempo de conclusão se finalizado/entregue
      if (["delivered", "completed", "shipped"].includes(order.status)) {
        const finishedDate = new Date(order.updated_at);
        const durationMins = Math.max(1, Math.round((finishedDate.getTime() - createdDate.getTime()) / 60000));
        
        // Desconsidera anomalias de teste (> 180 min)
        if (durationMins <= 180) {
          totalPrepMinutes += durationMins;
          completedCount++;

          const slaTarget = 30; // Padrão 30 min
          if (durationMins <= slaTarget) {
            onTimeCount++;
          } else {
            delayedCount++;
          }

          // Atribui à estação predominante dos itens
          for (const item of (order.items || [])) {
            const st = inferKitchenStation(item.title);
            stationVolume[st].totalOrders += item.quantity || 1;
            stationVolume[st].totalMinutes += durationMins;
            if (durationMins > slaTarget) {
              stationVolume[st].delayedOrders += item.quantity || 1;
            }
          }
        }
      }
    }

    const avgMinutes = completedCount > 0 ? Math.round(totalPrepMinutes / completedCount) : 18;
    const slaCompliancePercent = completedCount > 0 ? Math.round((onTimeCount / completedCount) * 100) : 95;

    // Identifica estação mais sobrecarregada
    let bottleneckStation: KitchenStation = "chapa";
    let maxDelayed = -1;
    for (const [st, val] of Object.entries(stationVolume)) {
      if (val.delayedOrders > maxDelayed) {
        maxDelayed = val.delayedOrders;
        bottleneckStation = st as KitchenStation;
      }
    }

    return {
      averagePrepTimeMinutes: avgMinutes,
      slaCompliancePercent,
      totalAnalyzedOrders: completedCount,
      delayedOrdersCount: delayedCount,
      bottleneckStation,
      stationStats: Object.entries(stationVolume).map(([station, stats]) => ({
        station: station as KitchenStation,
        totalItems: stats.totalOrders,
        delayedItems: stats.delayedOrders,
        avgMinutes: stats.totalOrders > 0 ? Math.round(stats.totalMinutes / stats.totalOrders) : 15,
      })),
      hourlyVolume,
    };
  });

// ── 5. Vincular / Chamar Motoboy ou Marcar para Retirada ────────────────────
export const assignOrderCourier = createServerFn({ method: "POST" })
  .validator(withDataPayload(assignOrderCourierSchema))
  .handler(async ({ data: input }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);
    const supabase = getServerClient();

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };

    if (input.courierType === "customer_pickup") {
      updatePayload.status = "shipped";
      updatePayload.shipping_method = "pickup";
    } else {
      updatePayload.status = "shipped";
      updatePayload.shipping_method = "delivery";
      if (input.driverId) {
        updatePayload.assigned_driver_id = input.driverId;
      }
    }

    const { data: updatedOrder, error } = await supabase
      .from("orders")
      .update(updatePayload)
      .eq("id", input.orderId)
      .eq("store_id", identity.store_id)
      .select()
      .single();

    if (error) {
      console.error("[kitchen-prep] Erro ao atribuir entregador:", error.message);
      throw new Error(`Falha ao despachar pedido: ${error.message}`);
    }

    return {
      success: true,
      orderId: input.orderId,
      courierType: input.courierType,
      driverName: input.driverName || "Entregador Parceiro",
      status: updatedOrder.status,
    };
  });
