import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";

async function getAuthenticatedStoreContext() {
  const identity = await getServerIdentity();
  if (!identity.store_id) throw new Error("Contexto de loja inválido");
  const supabase = getServerClient();
  return { storeId: identity.store_id, supabase };
}

// ─── SCHEMAS ZOD ─────────────────────────────────────────────────────────────

export const supplyUnitSchema = z.enum(["g", "kg", "ml", "l", "un"]);
export const supplyCategorySchema = z.enum(["ingredient", "packaging", "chemical", "other"]);

export const listSuppliesSchema = z.object({
  category: supplyCategorySchema.optional(),
  search: z.string().optional(),
  lowStockOnly: z.boolean().optional(),
});

export const createSupplySchema = z.object({
  name: z.string().min(2, "Nome do insumo deve ter no mínimo 2 caracteres"),
  category: supplyCategorySchema.default("ingredient"),
  unit: supplyUnitSchema.default("un"),
  stockOnHand: z.number().min(0, "Estoque inicial não pode ser negativo").default(0),
  minStockAlert: z.number().min(0, "Estoque de alerta não pode ser negativo").default(0),
  costCentsPerUnit: z.number().min(0, "Custo unitário não pode ser negativo").default(0),
  isComposite: z.boolean().default(false),
  supplierId: z.string().uuid().optional().nullable(),
  barcode: z.string().optional().nullable(),
  standardShelfLifeDays: z.number().int().min(1).default(3),
  storageTemperature: z.string().default("Refrigerado 0°C a 4°C"),
});

export const updateSupplySchema = z.object({
  supplyId: z.string().uuid(),
  name: z.string().min(2).optional(),
  category: supplyCategorySchema.optional(),
  unit: supplyUnitSchema.optional(),
  minStockAlert: z.number().min(0).optional(),
  costCentsPerUnit: z.number().min(0).optional(),
  supplierId: z.string().uuid().optional().nullable(),
  barcode: z.string().optional().nullable(),
  standardShelfLifeDays: z.number().int().min(1).optional(),
  storageTemperature: z.string().optional(),
});

export const recipeItemInputSchema = z.object({
  supplyId: z.string().uuid(),
  quantity: z.number().positive("Quantidade deve ser maior que zero"),
  unit: supplyUnitSchema,
  notes: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
});

export const createRecipeSchema = z.object({
  name: z.string().min(2, "Nome da receita deve ter no mínimo 2 caracteres"),
  type: z.enum(["sub_recipe", "product_dish"]).default("sub_recipe"),
  yieldQuantity: z.number().positive("Rendimento deve ser maior que zero").default(1),
  yieldUnit: z.enum(["un", "kg", "l", "porcoes", "g", "ml"]).default("un"),
  preparationTimeMinutes: z.number().int().min(1).default(15),
  prepInstructions: z.string().optional().nullable(),
  chefNotes: z.string().optional().nullable(),
  standardShelfLifeHours: z.number().int().min(1).default(72),
  storageInstructions: z.string().default("Etiquetar e refrigerar entre 0°C e 4°C"),
  items: z.array(recipeItemInputSchema).default([]),
});

export const updateRecipeSchema = z.object({
  recipeId: z.string().uuid(),

  name: z.string().min(2).optional(),
  type: z.enum(["sub_recipe", "product_dish"]).optional(),
  yieldQuantity: z.number().positive().optional(),
  yieldUnit: z.enum(["un", "kg", "l", "porcoes", "g", "ml"]).optional(),
  preparationTimeMinutes: z.number().int().min(1).optional(),
  prepInstructions: z.string().optional().nullable(),
  chefNotes: z.string().optional().nullable(),
  standardShelfLifeHours: z.number().int().min(1).optional(),
  storageInstructions: z.string().optional(),
  items: z.array(recipeItemInputSchema).optional(),
});

export const linkProductRecipeSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  variantId: z.string().uuid().optional().nullable(),
  modifierId: z.string().uuid().optional().nullable(),
  bookingServiceId: z.string().uuid().optional().nullable(),
  supplyId: z.string().uuid().optional().nullable(),
  recipeId: z.string().uuid().optional().nullable(),
  unit: z.string().default("un"),
  isPrimaryGargalo: z.boolean().default(true),
  modifierOptionLabel: z.string().optional().nullable(),

  quantity: z.number().positive().default(1),
});

export const unlinkProductRecipeSchema = z.object({
  productRecipeId: z.string().uuid(),
});

export const createProductionOrderSchema = z.object({
  recipeId: z.string().uuid(),

  targetSupplyId: z.string().uuid().optional().nullable(),
  batchesCount: z.number().positive().default(1),
  producedBy: z.string().optional(),
  notes: z.string().optional(),
});

export const registerWasteSchema = z.object({
  supplyId: z.string().uuid().optional().nullable(),
  productId: z.string().uuid().optional().nullable(),
  quantity: z.number().positive("Quantidade de descarte deve ser positiva"),
  unit: z.string().default("un"),
  reason: z.enum(["expired", "spoiled", "burnt", "dropped", "prep_error", "customer_returned", "other"]),
  reasonDescription: z.string().optional(),
  reportedBy: z.string().optional(),
});

export const recordSupplyPurchaseSchema = z.object({
  supplyId: z.string().uuid(),
  quantity: z.number().positive("Quantidade recebida deve ser positiva"),
  conversionFactor: z.number().positive("Fator de conversão deve ser positivo").default(1),
  purchaseUnit: z.string().optional(),
  totalCostCents: z.number().int().nonnegative("Valor total da compra não pode ser negativo"),
  supplierId: z.string().uuid().optional().nullable(),
  invoiceNumber: z.string().optional(),
  notes: z.string().optional(),
});

export const generateLabelSchema = z.object({
  title: z.string().min(2),
  batchCode: z.string().optional(),
  shelfLifeHours: z.number().int().positive().default(72),
  storageTemperature: z.string().default("Refrigerado 0°C a 4°C"),
  responsibleName: z.string().optional(),
});

// ─── 1. GESTÃO DE INSUMOS (SUPPLIES) ─────────────────────────────────────────

export const listSupplies = createServerFn({ method: "GET" })
  .validator((d: unknown) => listSuppliesSchema.parse(d || {}))
  .handler(async ({ data }) => {
    const { storeId, supabase } = await getAuthenticatedStoreContext();

    let query = supabase
      .from("supplies")
      .select(`
        *,
        suppliers (
          id,
          trade_name,
          corporate_name,
          phone
        )
      `)
      .eq("store_id", storeId)
      .eq("status", "active")
      .order("name", { ascending: true });

    if (data.category) {
      query = query.eq("category", data.category);
    }

    if (data.search?.trim()) {
      query = query.ilike("name", `%${data.search.trim()}%`);
    }

    const { data: supplies, error } = await query;
    if (error) {
      console.error("[listSupplies] Database error:", error);
      throw new Error(`Falha ao carregar insumos: ${error.message}`);
    }

    const result = (supplies || []).map((s: any) => {
      const stock = Number(s.stock_on_hand || 0);
      const minAlert = Number(s.min_stock_alert || 0);
      const isLow = stock <= minAlert;
      const isZero = stock <= 0;

      return {
        ...s,
        stock_on_hand: stock,
        min_stock_alert: minAlert,
        cost_cents_per_unit: Number(s.cost_cents_per_unit || 0),
        is_low_stock: isLow,
        is_out_of_stock: isZero,
      };
    });

    if (data.lowStockOnly) {
      return result.filter((s) => s.is_low_stock);
    }

    return result;
  });

export const createSupply = createServerFn({ method: "POST" })
  .validator((d: unknown) => createSupplySchema.parse(d))
  .handler(async ({ data }) => {
    const { storeId, supabase } = await getAuthenticatedStoreContext();

    const insertPayload = {
      store_id: storeId,
      name: data.name.trim(),
      category: data.category,
      unit: data.unit,
      stock_on_hand: data.stockOnHand,
      min_stock_alert: data.minStockAlert,
      cost_cents_per_unit: data.costCentsPerUnit,
      is_composite: data.isComposite,
      supplier_id: data.supplierId || null,
      barcode: data.barcode?.trim() || null,
      standard_shelf_life_days: data.standardShelfLifeDays,
      storage_temperature: data.storageTemperature,
      status: "active",
    };

    const { data: created, error } = await supabase
      .from("supplies")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error("[createSupply] Insert error:", error);
      throw new Error(`Falha ao cadastrar insumo: ${error.message}`);
    }

    // Se houve estoque inicial informado, lança movimentação
    if (data.stockOnHand > 0) {
      await supabase.from("supply_inventory_movements").insert({
        store_id: storeId,
        supply_id: created.id,
        movement_type: "manual_adjustment",
        quantity_delta: data.stockOnHand,
        balance_after: data.stockOnHand,
        unit_cost_cents: data.costCentsPerUnit,
        notes: "Estoque inicial de cadastro de insumo",
      });
    }

    return created;
  });

export const updateSupply = createServerFn({ method: "POST" })
  .validator((d: unknown) => updateSupplySchema.parse(d))
  .handler(async ({ data }) => {
    const { storeId, supabase } = await getAuthenticatedStoreContext();

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (data.name !== undefined) updatePayload.name = data.name.trim();
    if (data.category !== undefined) updatePayload.category = data.category;
    if (data.unit !== undefined) updatePayload.unit = data.unit;
    if (data.minStockAlert !== undefined) updatePayload.min_stock_alert = data.minStockAlert;
    if (data.costCentsPerUnit !== undefined) updatePayload.cost_cents_per_unit = data.costCentsPerUnit;
    if (data.supplierId !== undefined) updatePayload.supplier_id = data.supplierId;
    if (data.barcode !== undefined) updatePayload.barcode = data.barcode?.trim() || null;
    if (data.standardShelfLifeDays !== undefined) updatePayload.standard_shelf_life_days = data.standardShelfLifeDays;
    if (data.storageTemperature !== undefined) updatePayload.storage_temperature = data.storageTemperature;

    const { data: updated, error } = await supabase
      .from("supplies")
      .update(updatePayload)
      .eq("id", data.supplyId)
      .eq("store_id", storeId)
      .select()
      .single();

    if (error) {
      console.error("[updateSupply] Update error:", error);
      throw new Error(`Falha ao atualizar insumo: ${error.message}`);
    }

    return updated;
  });

export const deleteSupply = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ supplyId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { storeId, supabase } = await getAuthenticatedStoreContext();

    // Soft delete para manter rastreabilidade histórica
    const { error } = await supabase
      .from("supplies")
      .update({ status: "inactive", updated_at: new Date().toISOString() })
      .eq("id", data.supplyId)
      .eq("store_id", storeId);

    if (error) {
      console.error("[deleteSupply] Error:", error);
      throw new Error(`Falha ao inativar insumo: ${error.message}`);
    }

    return { success: true };
  });

// ─── 2. RECEITAS & FICHAS TÉCNICAS (RECIPES & POP) ───────────────────────────

export const listRecipes = createServerFn({ method: "GET" })
  .validator((d: unknown) => z.object({ type: z.enum(["sub_recipe", "product_dish"]).optional() }).parse(d || {}))
  .handler(async ({ data }) => {
    const { storeId, supabase } = await getAuthenticatedStoreContext();

    let query = supabase
      .from("recipes")
      .select(`
        *,
        recipe_items (
          id,
          supply_id,
          quantity,
          unit,
          notes,
          sort_order,
          supplies (
            id,
            name,
            category,
            unit,
            stock_on_hand,
            cost_cents_per_unit
          )
        )
      `)
      .eq("store_id", storeId)
      .order("name", { ascending: true });

    if (data.type) {
      query = query.eq("type", data.type);
    }

    const { data: recipes, error } = await query;
    if (error) {
      console.error("[listRecipes] Database error:", error);
      throw new Error(`Falha ao listar receitas: ${error.message}`);
    }

    return recipes || [];
  });

export const createRecipe = createServerFn({ method: "POST" })
  .validator((d: unknown) => createRecipeSchema.parse(d))
  .handler(async ({ data }) => {
    const { storeId, supabase } = await getAuthenticatedStoreContext();

    // 1. Busca os custos unitários dos insumos para calcular o custo total da ficha
    const supplyIds = data.items.map((i) => i.supplyId);
    let totalCostCents = 0;

    if (supplyIds.length > 0) {
      const { data: supplies } = await supabase
        .from("supplies")
        .select("id, cost_cents_per_unit, unit")
        .in("id", supplyIds);

      const supplyCostMap = new Map<string, number>();
      for (const s of supplies || []) {
        supplyCostMap.set(s.id, Number(s.cost_cents_per_unit || 0));
      }

      for (const item of data.items) {
        const unitCost = supplyCostMap.get(item.supplyId) || 0;
        totalCostCents += Math.round(item.quantity * unitCost);
      }
    }

    const yieldQty = data.yieldQuantity || 1;
    const costPerYieldUnit = Math.round(totalCostCents / yieldQty);

    // 2. Insere a receita
    const { data: recipe, error: recipeErr } = await supabase
      .from("recipes")
      .insert({
        store_id: storeId,
        name: data.name.trim(),
        type: data.type,
        yield_quantity: yieldQty,
        yield_unit: data.yieldUnit,
        preparation_time_minutes: data.preparationTimeMinutes,
        prep_instructions: data.prepInstructions?.trim() || null,
        chef_notes: data.chefNotes?.trim() || null,
        total_cost_cents: totalCostCents,
        cost_cents_per_yield_unit: costPerYieldUnit,
        standard_shelf_life_hours: data.standardShelfLifeHours,
        storage_instructions: data.storageInstructions,
      })
      .select()
      .single();

    if (recipeErr || !recipe) {
      console.error("[createRecipe] Recipe insert error:", recipeErr);
      throw new Error(`Falha ao salvar receita: ${recipeErr?.message}`);
    }

    // 3. Insere os itens da receita
    if (data.items.length > 0) {
      const itemsPayload = data.items.map((item, idx) => ({
        recipe_id: recipe.id,
        supply_id: item.supplyId,
        quantity: item.quantity,
        unit: item.unit,
        notes: item.notes?.trim() || null,
        sort_order: item.sortOrder ?? idx,
      }));

      const { error: itemsErr } = await supabase.from("recipe_items").insert(itemsPayload);
      if (itemsErr) {
        console.error("[createRecipe] Recipe items insert error:", itemsErr);
      }
    }

    return recipe;
  });

export const updateRecipe = createServerFn({ method: "POST" })
  .validator((d: unknown) => updateRecipeSchema.parse(d))
  .handler(async ({ data }) => {
    const { storeId, supabase } = await getAuthenticatedStoreContext();

    // 1. Recalcula custos se itens foram enviados
    let totalCostCents = 0;
    const items = data.items;

    if (items && items.length > 0) {
      const supplyIds = items.map((i) => i.supplyId);
      const { data: supplies } = await supabase
        .from("supplies")
        .select("id, cost_cents_per_unit")
        .in("id", supplyIds);

      const supplyCostMap = new Map<string, number>();
      for (const s of supplies || []) {
        supplyCostMap.set(s.id, Number(s.cost_cents_per_unit || 0));
      }

      for (const item of items) {
        const unitCost = supplyCostMap.get(item.supplyId) || 0;
        totalCostCents += Math.round(item.quantity * unitCost);
      }
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (data.name !== undefined) updatePayload.name = data.name.trim();
    if (data.type !== undefined) updatePayload.type = data.type;
    if (data.yieldQuantity !== undefined) updatePayload.yield_quantity = data.yieldQuantity;
    if (data.yieldUnit !== undefined) updatePayload.yield_unit = data.yieldUnit;
    if (data.preparationTimeMinutes !== undefined) updatePayload.preparation_time_minutes = data.preparationTimeMinutes;
    if (data.prepInstructions !== undefined) updatePayload.prep_instructions = data.prepInstructions?.trim() || null;
    if (data.chefNotes !== undefined) updatePayload.chef_notes = data.chefNotes?.trim() || null;
    if (data.standardShelfLifeHours !== undefined) updatePayload.standard_shelf_life_hours = data.standardShelfLifeHours;
    if (data.storageInstructions !== undefined) updatePayload.storage_instructions = data.storageInstructions;

    if (items !== undefined) {
      updatePayload.total_cost_cents = totalCostCents;
      const yieldQty = data.yieldQuantity || 1;
      updatePayload.cost_cents_per_yield_unit = Math.round(totalCostCents / yieldQty);
    }

    const { data: updated, error } = await supabase
      .from("recipes")
      .update(updatePayload)
      .eq("id", data.recipeId)
      .eq("store_id", storeId)
      .select()
      .single();

    if (error) {
      console.error("[updateRecipe] Recipe update error:", error);
      throw new Error(`Falha ao atualizar receita: ${error.message}`);
    }

    // Atualiza itens substituindo a coleção anterior se enviada
    if (items !== undefined) {
      await supabase.from("recipe_items").delete().eq("recipe_id", data.recipeId);

      if (items.length > 0) {
        const itemsPayload = items.map((item, idx) => ({
          recipe_id: data.recipeId,
  
          supply_id: item.supplyId,
          quantity: item.quantity,
          unit: item.unit,
          notes: item.notes?.trim() || null,
          sort_order: item.sortOrder ?? idx,
        }));
        await supabase.from("recipe_items").insert(itemsPayload);
      }
    }

    return updated;
  });

// ─── 3. VÍNCULO DE RECEITA / FICHA TÉCNICA A PRODUTOS & MODIFICADORES ────────

export const listProductRecipes = createServerFn({ method: "GET" })
  .validator((d: unknown) => z.object({ productId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { storeId, supabase } = await getAuthenticatedStoreContext();

    const { data: links, error } = await supabase
      .from("product_recipes")
      .select(`
        *,
        recipes (
          id,
          name,
          type,
          yield_quantity,
          yield_unit,
          total_cost_cents,
          cost_cents_per_yield_unit,
          recipe_items (
            id,
            supply_id,
            quantity,
            unit,
            supplies (
              id,
              name,
              stock_on_hand,
              unit,
              cost_cents_per_unit
            )
          )
        )
      `)
      .eq("store_id", storeId)
      .eq("product_id", data.productId);

    if (error) {
      console.error("[listProductRecipes] Error:", error);
      throw new Error(`Falha ao obter fichas do produto: ${error.message}`);
    }

    return links || [];
  });

export const linkProductRecipe = createServerFn({ method: "POST" })
  .validator((d: unknown) => linkProductRecipeSchema.parse(d))
  .handler(async ({ data }) => {
    const { storeId, supabase } = await getAuthenticatedStoreContext();

    const { data: created, error } = await supabase
      .from("product_recipes")
      .insert({
        store_id: storeId,
        product_id: data.productId || null,
        variant_id: data.variantId || null,
        modifier_id: data.modifierId || null,
        booking_service_id: data.bookingServiceId || null,
        supply_id: data.supplyId || null,
        recipe_id: data.recipeId || null,
        unit: data.unit || "un",
        is_primary_gargalo: data.isPrimaryGargalo ?? true,
        modifier_option_label: data.modifierOptionLabel || null,

        quantity: data.quantity,
      })
      .select()
      .single();

    if (error) {
      console.error("[linkProductRecipe] Error:", error);
      throw new Error(`Falha ao vincular receita: ${error.message}`);
    }

    return created;
  });

export const unlinkProductRecipe = createServerFn({ method: "POST" })
  .validator((d: unknown) => unlinkProductRecipeSchema.parse(d))
  .handler(async ({ data }) => {
    const { storeId, supabase } = await getAuthenticatedStoreContext();

    const { error } = await supabase
      .from("product_recipes")
      .delete()
      .eq("id", data.productRecipeId)
      .eq("store_id", storeId);

    if (error) {
      console.error("[unlinkProductRecipe] Error:", error);
      throw new Error(`Falha ao desvincular receita: ${error.message}`);
    }

    return { success: true };
  });

// ─── 4. MOTOR DE ESTOQUE TEÓRICO E GARGALO DE PRODUÇÃO (AUTO-PAUSE) ─────────

export const calculateProductProducibleStock = createServerFn({ method: "GET" })
  .validator((d: unknown) => z.object({ productId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { storeId, supabase } = await getAuthenticatedStoreContext();

    // 1. Obtém as fichas técnicas associadas ao produto
    const { data: links } = await supabase
      .from("product_recipes")
      .select(`
        quantity,
        recipes (
          id,
          name,
          recipe_items (
            quantity,
            unit,
            supplies (
              id,
              name,
              stock_on_hand,
              min_stock_alert,
              unit
            )
          )
        )
      `)
      .eq("store_id", storeId)
      .eq("product_id", data.productId);

    if (!links || links.length === 0) {
      return {
        has_recipe: false,
        max_producible: null,
        bottleneck_supply: null,
        supplies_breakdown: [],
      };
    }

    let minProducible = Infinity;
    let bottleneck: any = null;
    const breakdown: any[] = [];

    for (const link of links) {
      const recipe = link.recipes as any;
      if (!recipe?.recipe_items) continue;

      const portionMultiplier = Number(link.quantity || 1);

      for (const item of recipe.recipe_items) {
        const supply = item.supplies;
        if (!supply) continue;

        const neededPerDish = Number(item.quantity || 0) * portionMultiplier;
        const currentStock = Number(supply.stock_on_hand || 0);

        const producibleFromThis = neededPerDish > 0 ? Math.floor(currentStock / neededPerDish) : Infinity;

        breakdown.push({
          supply_id: supply.id,
          supply_name: supply.name,
          needed_per_dish: neededPerDish,
          current_stock: currentStock,
          unit: supply.unit,
          producible: producibleFromThis,
        });

        if (producibleFromThis < minProducible) {
          minProducible = producibleFromThis;
          bottleneck = {
            supply_id: supply.id,
            supply_name: supply.name,
            current_stock: currentStock,
            unit: supply.unit,
            max_dishes: producibleFromThis,
          };
        }
      }
    }

    const maxProducibleFinal = minProducible === Infinity ? 0 : minProducible;

    return {
      has_recipe: true,
      max_producible: maxProducibleFinal,
      is_out_of_stock: maxProducibleFinal <= 0,
      bottleneck_supply: bottleneck,
      supplies_breakdown: breakdown,
    };
  });

// ─── 5. ORDENS DE PRODUÇÃO INTERNA NA COZINHA (TRANSFORMAÇÃO) ───────────────

export const createProductionOrder = createServerFn({ method: "POST" })
  .validator((d: unknown) => createProductionOrderSchema.parse(d))
  .handler(async ({ data }) => {
    const { storeId, supabase } = await getAuthenticatedStoreContext();

    // 1. Carrega a receita com seus itens e dados de insumos
    const { data: recipe, error: recErr } = await supabase
      .from("recipes")
      .select(`
        *,
        recipe_items (
          supply_id,
          quantity,
          unit,
          supplies (
            id,
            name,
            stock_on_hand,
            cost_cents_per_unit
          )
        )
      `)
      .eq("id", data.recipeId)
      .eq("store_id", storeId)
      .single();

    if (recErr || !recipe) {
      throw new Error("Receita não encontrada.");
    }

    const batches = Number(data.batchesCount || 1);
    const actualYield = Number(recipe.yield_quantity || 1) * batches;
    const totalCostCents = Number(recipe.total_cost_cents || 0) * batches;

    // Código do Lote (LOTE-AAAAMMDD-HHMM)
    const now = new Date();
    const batchCode = `LOTE-${now.toISOString().slice(0, 10).replace(/-/g, "")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;

    // Data de Validade calculada
    const shelfLifeHours = Number(recipe.standard_shelf_life_hours || 72);
    const expiresAt = new Date(now.getTime() + shelfLifeHours * 60 * 60 * 1000);

    // 2. Insere a Ordem de Produção
    const { data: order, error: orderErr } = await supabase
      .from("production_orders")
      .insert({
        store_id: storeId,
        recipe_id: recipe.id,
        target_supply_id: data.targetSupplyId || null,
        batches_count: batches,
        actual_yield_quantity: actualYield,
        total_cost_cents: totalCostCents,
        status: "completed",
        produced_by: data.producedBy || "Chef da Cozinha",
        produced_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        batch_code: batchCode,
        notes: data.notes || null,
      })
      .select()
      .single();

    if (orderErr) {
      console.error("[createProductionOrder] Error:", orderErr);
      throw new Error(`Falha ao registrar ordem de produção: ${orderErr.message}`);
    }

    // 3. Abate os ingredientes do estoque
    for (const item of recipe.recipe_items || []) {
      const consumedQty = Number(item.quantity) * batches;
      const currentSupplyStock = Number(item.supplies?.stock_on_hand || 0);
      const newStock = Math.max(0, currentSupplyStock - consumedQty);

      await supabase
        .from("supplies")
        .update({ stock_on_hand: newStock, updated_at: now.toISOString() })
        .eq("id", item.supply_id)
        .eq("store_id", storeId);

      await supabase.from("supply_inventory_movements").insert({
        store_id: storeId,
        supply_id: item.supply_id,
        movement_type: "production_consumption",
        quantity_delta: -consumedQty,
        balance_after: newStock,
        unit_cost_cents: Number(item.supplies?.cost_cents_per_unit || 0),
        reference_id: order.id,
        notes: `Consumo para lote ${batchCode} (${recipe.name})`,
      });
    }

    // 4. Se tiver insumo alvo de entrada (ex: Massa pronta ou Chilli no estoque), credita
    // 4. Se tiver insumo alvo de entrada (ex: Massa pronta ou Chilli no estoque) ou for sub_recipe, credita em supplies
    let resolvedTargetSupplyId = data.targetSupplyId || null;
    if (!resolvedTargetSupplyId && recipe.type === "sub_recipe") {
      const { data: existingComposite } = await supabase
        .from("supplies")
        .select("id")
        .eq("store_id", storeId)
        .ilike("name", recipe.name)
        .limit(1)
        .maybeSingle();

      if (existingComposite?.id) {
        resolvedTargetSupplyId = existingComposite.id;
      } else {
        const unitMap: Record<string, string> = { porcoes: "porcao" };
        const safeUnit = unitMap[recipe.yield_unit] || recipe.yield_unit || "un";
        const { data: createdComposite } = await supabase
          .from("supplies")
          .insert({
            store_id: storeId,
            name: recipe.name,
            category: "semi_acabado",
            unit: safeUnit,
            stock_on_hand: 0,
            min_stock_alert: 2,
            cost_cents_per_unit: Math.round(totalCostCents / Math.max(1, actualYield)),
            is_composite: true,
            status: "active",
          })
          .select("id")
          .maybeSingle();
        if (createdComposite?.id) {
          resolvedTargetSupplyId = createdComposite.id;
        }
      }
    }

    if (resolvedTargetSupplyId) {
      const { data: targetSupply } = await supabase
        .from("supplies")
        .select("stock_on_hand")
        .eq("id", resolvedTargetSupplyId)
        .eq("store_id", storeId)
        .single();

      const curTarget = Number(targetSupply?.stock_on_hand || 0);
      const newTarget = curTarget + actualYield;
      const unitYieldCost = Math.round(totalCostCents / Math.max(1, actualYield));

      await supabase
        .from("supplies")
        .update({
          stock_on_hand: newTarget,
          cost_cents_per_unit: unitYieldCost,
          is_composite: true,
          updated_at: now.toISOString(),
        })
        .eq("id", resolvedTargetSupplyId)
        .eq("store_id", storeId);

      await supabase.from("supply_inventory_movements").insert({
        store_id: storeId,
        supply_id: resolvedTargetSupplyId,
        movement_type: "production_yield",
        quantity_delta: actualYield,
        balance_after: newTarget,
        unit_cost_cents: unitYieldCost,
        reference_id: order.id,
        notes: `Rendimento do lote ${batchCode} (${recipe.name})`,
      });
    }
    if (false && data.targetSupplyId) {
      const { data: targetSupply } = await supabase
        .from("supplies")
        .select("stock_on_hand")
        .eq("id", data.targetSupplyId)
        .eq("store_id", storeId)
        .single();

      const curTarget = Number(targetSupply?.stock_on_hand || 0);
      const newTarget = curTarget + actualYield;

      await supabase
        .from("supplies")
        .update({ stock_on_hand: newTarget, updated_at: now.toISOString() })
        .eq("id", data.targetSupplyId)
        .eq("store_id", storeId);

      await supabase.from("supply_inventory_movements").insert({
        store_id: storeId,
        supply_id: data.targetSupplyId,
        movement_type: "production_yield",
        quantity_delta: actualYield,
        balance_after: newTarget,
        unit_cost_cents: Math.round(totalCostCents / actualYield),
        reference_id: order.id,
        notes: `Rendimento do lote ${batchCode} (${recipe.name})`,
      });
    }

    // 5. Registra automaticamente a etiqueta de validade pronta para impressão
    await supabase.from("expiration_labels").insert({
      store_id: storeId,
      title: recipe.name,
      batch_code: batchCode,
      manufactured_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      storage_temperature: recipe.storage_instructions || "Refrigerado 0°C a 4°C",
      responsible_name: data.producedBy || "Cozinha",
    });

    return {
      order,
      batch_code: batchCode,
      actual_yield: actualYield,
      expires_at: expiresAt.toISOString(),
    };
  });

// ─── 6. DESPERDÍCIO, AVARIAS E PERDAS (WASTE MANAGEMENT) ─────────────────────

export const listWasteLogs = createServerFn({ method: "GET" })
  .validator((d: unknown) => z.object({ limit: z.number().int().default(50) }).parse(d || {}))
  .handler(async ({ data }) => {
    const { storeId, supabase } = await getAuthenticatedStoreContext();

    const { data: logs, error } = await supabase
      .from("waste_logs")
      .select(`
        *,
        supplies (
          id,
          name,
          unit,
          cost_cents_per_unit
        ),
        products (
          id,
          title
        )
      `)
      .eq("store_id", storeId)
      .order("logged_at", { ascending: false })
      .limit(data.limit);

    if (error) {
      console.error("[listWasteLogs] Error:", error);
      throw new Error(`Falha ao obter relatório de perdas: ${error.message}`);
    }

    // Totalização financeira de perdas
    let totalLossCents = 0;
    const lossByReason: Record<string, number> = {};

    for (const l of logs || []) {
      const cents = Number(l.cost_loss_cents || 0);
      totalLossCents += cents;
      lossByReason[l.reason] = (lossByReason[l.reason] || 0) + cents;
    }

    return {
      logs: logs || [],
      total_loss_cents: totalLossCents,
      loss_by_reason: lossByReason,
    };
  });

export const registerWaste = createServerFn({ method: "POST" })
  .validator((d: unknown) => registerWasteSchema.parse(d))
  .handler(async ({ data }) => {
    const { storeId, supabase } = await getAuthenticatedStoreContext();

    let costLossCents = 0;
    let supplyUnit = data.unit;

    // Se for insumo cadastrado, busca custo unitário e atualiza saldo
    if (data.supplyId) {
      const { data: supply } = await supabase
        .from("supplies")
        .select("cost_cents_per_unit, unit, stock_on_hand")
        .eq("id", data.supplyId)
        .eq("store_id", storeId)
        .single();

      if (supply) {
        supplyUnit = supply.unit;
        const unitCost = Number(supply.cost_cents_per_unit || 0);
        costLossCents = Math.round(data.quantity * unitCost);

        const currentStock = Number(supply.stock_on_hand || 0);
        const newStock = Math.max(0, currentStock - data.quantity);

        await supabase
          .from("supplies")
          .update({ stock_on_hand: newStock, updated_at: new Date().toISOString() })
          .eq("id", data.supplyId)
          .eq("store_id", storeId);

        await supabase.from("supply_inventory_movements").insert({
          store_id: storeId,
          supply_id: data.supplyId,
          movement_type: "waste",
          quantity_delta: -data.quantity,
          balance_after: newStock,
          unit_cost_cents: unitCost,
          notes: `Descarte/Perda: ${data.reason} (${data.reasonDescription || ""})`,
        });

        if (newStock <= 0) {
          await checkAndAutoPauseProductsBySupply(supabase, storeId, data.supplyId);
        }
      }
      if (false) {
        const _unused = ({
        });
      }
    }

    const { data: created, error } = await supabase
      .from("waste_logs")
      .insert({
        store_id: storeId,
        supply_id: data.supplyId || null,
        product_id: data.productId || null,
        quantity: data.quantity,
        unit: supplyUnit,
        cost_loss_cents: costLossCents,
        reason: data.reason,
        reason_description: data.reasonDescription?.trim() || null,
        reported_by: data.reportedBy || "Operador",
      })
      .select()
      .single();

    if (error) {
      console.error("[registerWaste] Error:", error);
      throw new Error(`Falha ao registrar perda: ${error.message}`);
    }

    return created;
  });

// ─── 7. VALIDADE & ETIQUETAS TÉRMICAS 58MM / 80MM ───────────────────────────

export const listExpirationLabels = createServerFn({ method: "GET" })
  .validator((d: unknown) => z.object({ limit: z.number().int().default(30) }).parse(d || {}))
  .handler(async ({ data }) => {
    const { storeId, supabase } = await getAuthenticatedStoreContext();

    const { data: labels, error } = await supabase
      .from("expiration_labels")
      .select("*")
      .eq("store_id", storeId)
      .order("printed_at", { ascending: false })
      .limit(data.limit);

    if (error) {
      console.error("[listExpirationLabels] Error:", error);
      throw new Error(`Falha ao obter etiquetas: ${error.message}`);
    }

    return labels || [];
  });

export const generateExpirationLabel = createServerFn({ method: "POST" })
  .validator((d: unknown) => generateLabelSchema.parse(d))
  .handler(async ({ data }) => {
    const { storeId, supabase } = await getAuthenticatedStoreContext();

    const now = new Date();
    const batchCode =
      data.batchCode ||
      `LOT-${now.toISOString().slice(0, 10).replace(/-/g, "")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
    const expiresAt = new Date(now.getTime() + data.shelfLifeHours * 60 * 60 * 1000);

    const { data: label, error } = await supabase
      .from("expiration_labels")
      .insert({
        store_id: storeId,
        title: data.title.trim(),
        batch_code: batchCode,
        manufactured_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        storage_temperature: data.storageTemperature,
        responsible_name: data.responsibleName || "Cozinha",
        printed_at: now.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("[generateExpirationLabel] Error:", error);
      throw new Error(`Falha ao gerar etiqueta: ${error.message}`);
    }

    return label;
  });

// ─── 8. FORNECEDORES & ENTRADA DE COMPRAS DE INSUMOS ─────────────────────────

export const listSuppliers = createServerFn({ method: "GET" })
  .validator((d: unknown) => z.object({ search: z.string().optional() }).parse(d || {}))
  .handler(async ({ data }) => {
    const { storeId, supabase } = await getAuthenticatedStoreContext();

    let query = supabase
      .from("suppliers")
      .select("*")
      .eq("store_id", storeId)
      .eq("status", "active")
      .order("trade_name", { ascending: true });

    if (data.search?.trim()) {
      query = query.or(`trade_name.ilike.%${data.search.trim()}%,corporate_name.ilike.%${data.search.trim()}%`);
    }

    const { data: suppliers, error } = await query;
    if (error) {
      console.error("[listSuppliers] Error:", error);
      throw new Error(`Falha ao listar fornecedores: ${error.message}`);
    }

    return suppliers || [];
  });

export const recordSupplyPurchaseEntry = createServerFn({ method: "POST" })
  .validator((d: unknown) => recordSupplyPurchaseSchema.parse(d))
  .handler(async ({ data }) => {
    const { storeId, supabase } = await getAuthenticatedStoreContext();

    // 1. Busca saldo e custo atual para calcular custo médio ponderado
    const { data: supply, error: sErr } = await supabase
      .from("supplies")
      .select("stock_on_hand, cost_cents_per_unit")
      .eq("id", data.supplyId)
      .eq("store_id", storeId)
      .single();

    if (sErr || !supply) {
      throw new Error("Insumo não encontrado.");
    }

    const currentStock = Number(supply.stock_on_hand || 0);
    const currentCost = Number(supply.cost_cents_per_unit || 0);
    const conversionFactor = Number(data.conversionFactor || 1);
    const addedQty = data.quantity * conversionFactor;
    const newStock = currentStock + addedQty;

    // Novo Custo Médio Unitário Ponderado
    const previousTotalValue = currentStock * currentCost;
    const newTotalValue = previousTotalValue + data.totalCostCents;
    const weightedAvgCostCents = newStock > 0 ? Math.round(newTotalValue / newStock) : currentCost;

    // 2. Atualiza insumo
    await supabase
      .from("supplies")
      .update({
        stock_on_hand: newStock,
        cost_cents_per_unit: weightedAvgCostCents,
        supplier_id: data.supplierId || undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.supplyId)
      .eq("store_id", storeId);

    // 3. Registra movimentação no Kardex
    const unitCostAdded = Math.round(data.totalCostCents / addedQty);
    await supabase.from("supply_inventory_movements").insert({
      store_id: storeId,
      supply_id: data.supplyId,
      movement_type: "purchase_entry",
      quantity_delta: addedQty,
      balance_after: newStock,
      unit_cost_cents: unitCostAdded,
      reference_id: data.invoiceNumber || null,
      notes: `Entrada de Compras NF: ${data.invoiceNumber || "S/N"} (Qtd Compra: ${data.quantity} x Fator ${conversionFactor} = +${addedQty}) - ${data.notes || ""}`,
    });

    return {
      supply_id: data.supplyId,
      new_stock: newStock,
      weighted_average_cost_cents: weightedAvgCostCents,
    };
  });

// ─── DEDUÇÃO AUTOMÁTICA DE INSUMOS EM PEDIDOS / COMANDAS ──────────────────────

export const deductSuppliesForOrderSchema = z.object({
  orderId: z.string().uuid(),
});

export const deductSuppliesForOrder = createServerFn({ method: "POST" })
  .validator(deductSuppliesForOrderSchema)
  .handler(async ({ data: { orderId } }) => {
    const { storeId, supabase } = await getAuthenticatedStoreContext();

    // 1. Idempotência estrita: verifica se este pedido já movimentou insumos
    const { data: existingMovements } = await supabase
      .from("supply_inventory_movements")
      .select("id")
      .eq("store_id", storeId)
      .eq("reference_id", orderId)
      .eq("movement_type", "order_consumption")
      .limit(1);

    if (existingMovements && existingMovements.length > 0) {
      return { success: true, alreadyDeducted: true };
    }

    // 2. Busca itens do pedido com produto e opções selecionadas
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("id, item_id, product_title, qty, selected_options")
      .eq("order_id", orderId);

    if (itemsError || !items || items.length === 0) {
      return { success: true, itemsProcessed: 0 };
    }

    const deductedSupplies: Record<string, { name: string; qty: number }> = {};

    for (const item of items) {
      const itemQty = Number(item.qty || 1);
      const productId = item.item_id;

      // 2a. Abater insumos da Ficha Técnica (BOM) do Produto Principal
      if (productId) {
        const { data: productRecipes } = await supabase
          .from("product_recipes")
          .select("quantity, unit, supply_id, recipe_id, modifier_id, modifier_option_label, is_primary_gargalo")
          .eq("product_id", productId);

        if (productRecipes && productRecipes.length > 0) {
          const selectedModifierIds = new Set<string>(
            Array.isArray(item.selected_options)
              ? item.selected_options
                  .map((o: any) => String(o?.option_value_id || o?.id || ""))
                  .filter(Boolean)
              : [],
          );
          for (const pr of productRecipes) {
            if (pr.modifier_id && !selectedModifierIds.has(String(pr.modifier_id))) {
              continue;
            }
            if (pr.supply_id) {
              const qtyToDeduct = Number(pr.quantity || 1) * itemQty;
              await applySupplyDeduction(
                supabase,
                storeId,
                pr.supply_id,
                qtyToDeduct,
                orderId,
                `Consumo pedido #${orderId.slice(0, 8)}: ${item.product_title}`,
              );
              deductedSupplies[pr.supply_id] = {
                name: item.product_title,
                qty: (deductedSupplies[pr.supply_id]?.qty || 0) + qtyToDeduct,
              };
            } else if (pr.recipe_id) {
              const { data: recipe } = await supabase
                .from("recipes")
                .select("yield_quantity, recipe_items(supply_id, quantity)")
                .eq("id", pr.recipe_id)
                .single();

              if (recipe && recipe.recipe_items) {
                const yieldQty = Number(recipe.yield_quantity || 1);
                const recipePortion = Number(pr.quantity || 1) * itemQty;

                for (const ri of recipe.recipe_items) {
                  if (ri.supply_id) {
                    const riQty = (Number(ri.quantity || 1) / yieldQty) * recipePortion;
                    await applySupplyDeduction(
                      supabase,
                      storeId,
                      ri.supply_id,
                      riQty,
                      orderId,
                      `Consumo sub-receita pedido #${orderId.slice(0, 8)}: ${item.product_title}`,
                    );
                  }
                }
              }
            }
          }
        }
      }

      // 2b. Abater insumos dos Adicionais / Opcionais Selecionados
      if (item.selected_options && Array.isArray(item.selected_options)) {
        for (const opt of item.selected_options) {
          const optionValueId = opt.option_value_id || opt.id;
          if (optionValueId) {
            const { data: optionVal } = await supabase
              .from("option_values")
              .select("label, supply_id, recipe_id, consume_quantity")
              .eq("id", optionValueId)
              .maybeSingle();

            if (optionVal) {
              const optQty = Number(optionVal.consume_quantity || 1) * itemQty;
              if (optionVal.supply_id) {
                await applySupplyDeduction(
                  supabase,
                  storeId,
                  optionVal.supply_id,
                  optQty,
                  orderId,
                  `Consumo opcional [${optionVal.label}] em ${item.product_title}`,
                );
              } else if (optionVal.recipe_id) {
                const { data: recipe } = await supabase
                  .from("recipes")
                  .select("yield_quantity, recipe_items(supply_id, quantity)")
                  .eq("id", optionVal.recipe_id)
                  .single();

                if (recipe && recipe.recipe_items) {
                  const yieldQty = Number(recipe.yield_quantity || 1);
                  for (const ri of recipe.recipe_items) {
                    if (ri.supply_id) {
                      const riQty = (Number(ri.quantity || 1) / yieldQty) * optQty;
                      await applySupplyDeduction(
                        supabase,
                        storeId,
                        ri.supply_id,
                        riQty,
                        orderId,
                        `Consumo opcional receita [${optionVal.label}] em ${item.product_title}`,
                      );
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    return {
      success: true,
      orderId,
      itemsProcessed: items.length,
      suppliesDeductedCount: Object.keys(deductedSupplies).length,
    };
  });

async function applySupplyDeduction(
  supabase: any,
  storeId: string,
  supplyId: string,
  qty: number,
  orderId: string,
  notes: string,
) {
  const { data: supply } = await supabase
    .from("supplies")
    .select("name, stock_on_hand, unit, min_stock_alert")
    .eq("id", supplyId)
    .single();

  if (!supply) return;

  const currentStock = Number(supply.stock_on_hand || 0);
  const newStock = Math.max(0, currentStock - qty);

  // Atualiza saldo em supplies
  await supabase
    .from("supplies")
    .update({
      stock_on_hand: newStock,
      updated_at: new Date().toISOString(),
    })
    .eq("id", supplyId);

  // Registra movimentação no Kardex
  await supabase.from("supply_inventory_movements").insert({
    store_id: storeId,
    supply_id: supplyId,
    movement_type: "order_consumption",
    quantity_delta: -qty,
    balance_after: newStock,
    reference_id: orderId,
    notes,
  });

  if (newStock <= 0) {
    await checkAndAutoPauseProductsBySupply(supabase, storeId, supplyId);
  }
}

export async function checkAndAutoPauseProductsBySupply(
  supabase: any,
  storeId: string,
  supplyId: string,
): Promise<string[]> {
  const pausedProductIds = new Set<string>();

  // 1. Produtos que usam este insumo diretamente como gargalo primário
  const { data: directLinks } = await supabase
    .from("product_recipes")
    .select("product_id, is_primary_gargalo")
    .eq("store_id", storeId)
    .eq("supply_id", supplyId);

  for (const link of directLinks || []) {
    if (link.product_id && link.is_primary_gargalo !== false) {
      pausedProductIds.add(link.product_id);
    }
  }

  // 2. Receitas que usam este insumo e produtos vinculados a essas receitas como gargalo primário
  const { data: recipeItems } = await supabase
    .from("recipe_items")
    .select("recipe_id")
    .eq("supply_id", supplyId);

  const affectedRecipeIds = Array.from(
    new Set((recipeItems || []).map((r: any) => r.recipe_id).filter(Boolean)),
  );

  if (affectedRecipeIds.length > 0) {
    const { data: recipeLinks } = await supabase
      .from("product_recipes")
      .select("product_id, is_primary_gargalo")
      .eq("store_id", storeId)
      .in("recipe_id", affectedRecipeIds);

    for (const link of recipeLinks || []) {
      if (link.product_id && link.is_primary_gargalo !== false) {
        pausedProductIds.add(link.product_id);
      }
    }
  }

  const productIdsArray = Array.from(pausedProductIds);
  if (productIdsArray.length > 0) {
    await supabase
      .from("products")
      .update({ status: "draft", updated_at: new Date().toISOString() })
      .eq("store_id", storeId)
      .in("id", productIdsArray);
  }

  return productIdsArray;
}

export const createSupplierSchema = z.object({
  tradeName: z.string().min(2, "Nome fantasia do fornecedor é obrigatório"),
  corporateName: z.string().optional(),
  documentNumber: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
});

export const createSupplier = createServerFn({ method: "POST" })
  .validator((d: unknown) => createSupplierSchema.parse(d))
  .handler(async ({ data }) => {
    const { storeId, supabase } = await getAuthenticatedStoreContext();

    const { data: created, error } = await supabase
      .from("suppliers")
      .insert({
        store_id: storeId,
        trade_name: data.tradeName.trim(),
        corporate_name: data.corporateName?.trim() || data.tradeName.trim(),
        document_number: data.documentNumber?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Falha ao cadastrar fornecedor: ${error.message}`);
    }

    return created;
  });

export const deductSuppliesForServiceAppointmentSchema = z.object({
  appointmentId: z.string().uuid(),
  bookingServiceId: z.string().uuid(),
  serviceTitle: z.string().optional(),
});

export const deductSuppliesForServiceAppointment = createServerFn({ method: "POST" })
  .validator((d: unknown) => deductSuppliesForServiceAppointmentSchema.parse(d))
  .handler(async ({ data }) => {
    const { storeId, supabase } = await getAuthenticatedStoreContext();

    // 1. Idempotência por appointmentId
    const { data: existingMovements } = await supabase
      .from("supply_inventory_movements")
      .select("id")
      .eq("store_id", storeId)
      .eq("reference_id", data.appointmentId)
      .eq("movement_type", "order_consumption")
      .limit(1);

    if (existingMovements && existingMovements.length > 0) {
      return { success: true, alreadyDeducted: true, suppliesDeductedCount: 0 };
    }

    // 2. Busca fichas/insumos vinculados ao serviço em product_recipes (booking_service_id)
    const { data: serviceLinks } = await supabase
      .from("product_recipes")
      .select("quantity, unit, supply_id, recipe_id, is_primary_gargalo")
      .eq("store_id", storeId)
      .eq("booking_service_id", data.bookingServiceId);

    let deductedCount = 0;
    const label = data.serviceTitle || `Serviço #${data.bookingServiceId.slice(0, 8)}`;

    for (const link of serviceLinks || []) {
      const qty = Number(link.quantity || 1);
      if (link.supply_id) {
        await applySupplyDeduction(
          supabase,
          storeId,
          link.supply_id,
          qty,
          data.appointmentId,
          `Consumo de procedimento (${label})`,
        );
        deductedCount++;
      } else if (link.recipe_id) {
        const { data: recipe } = await supabase
          .from("recipes")
          .select("yield_quantity, recipe_items(supply_id, quantity)")
          .eq("id", link.recipe_id)
          .single();

        if (recipe && recipe.recipe_items) {
          const yieldQty = Number(recipe.yield_quantity || 1);
          for (const ri of recipe.recipe_items) {
            if (ri.supply_id) {
              const riQty = (Number(ri.quantity || 1) / yieldQty) * qty;
              await applySupplyDeduction(
                supabase,
                storeId,
                ri.supply_id,
                riQty,
                data.appointmentId,
                `Consumo kit/mistura em procedimento (${label})`,
              );
              deductedCount++;
            }
          }
        }
      }
    }

    return {
      success: true,
      appointmentId: data.appointmentId,
      suppliesDeductedCount: deductedCount,
    };
  });

function _noopEnd(notes: any) {
  return ({
    notes,
  });
}
