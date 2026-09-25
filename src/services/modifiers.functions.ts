import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

export const getModifiersByProduct = createServerFn({ method: "GET" })
  .validator(z.string().uuid())
  .handler(async ({ data: productId }) => {
    const supabase = getServerClient();

    const { data: groups, error } = await supabase
      .from("product_modifier_groups")
      .select(
        `
        *,
        modifiers:product_modifiers (*)
        `,
      )
      .eq("product_id", productId)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[modifiers] getModifiersByProduct error:", error);
      throw new Error("Erro ao carregar adicionais do produto.");
    }

    return groups || [];
  });

export const upsertModifierGroup = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid().optional(),
      productId: z.string().uuid(),
      title: z.string().min(2),
      description: z.string().optional(),
      minSelections: z.number().int().min(0).default(0),
      maxSelections: z.number().int().min(1).default(1),
      isRequired: z.boolean().default(false),
      sortOrder: z.number().int().default(0),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    if (!identity?.id) throw new Error("Não autenticado");

    // Validação estrita de autoridade multi-tenant na loja dona do produto
    const { data: product, error: pErr } = await supabase
      .from("products")
      .select("id, store_id")
      .eq("id", input.productId)
      .single();

    if (pErr || !product) {
      throw new Error("Produto não encontrado.");
    }

    assertStoreAccess(identity, ["owner", "admin", "manager"], product.store_id);

    const payload = {
      product_id: input.productId,
      store_id: product.store_id,
      title: input.title,
      description: input.description,
      min_selections: input.minSelections,
      max_selections: input.maxSelections,
      is_required: input.isRequired,
      sort_order: input.sortOrder,
      updated_at: new Date().toISOString(),
    };

    if (input.id) {
      const { data, error } = await supabase
        .from("product_modifier_groups")
        .update(payload)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw new Error("Erro ao atualizar grupo de modificadores.");
      return data;
    } else {
      const { data, error } = await supabase
        .from("product_modifier_groups")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error("Erro ao criar grupo de modificadores.");
      return data;
    }
  });

export const deleteModifierGroup = createServerFn({ method: "POST" })
  .validator(
    z.object({
      groupId: z.string().uuid(),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    if (!identity?.id) throw new Error("Não autenticado");

    const { data: group, error: gErr } = await supabase
      .from("product_modifier_groups")
      .select("id, product_id, store_id")
      .eq("id", input.groupId)
      .single();

    if (gErr || !group) {
      throw new Error("Grupo de modificadores não encontrado.");
    }

    assertStoreAccess(identity, ["owner", "admin", "manager"], group.store_id);

    const { error: delErr } = await supabase
      .from("product_modifier_groups")
      .delete()
      .eq("id", input.groupId);

    if (delErr) {
      console.error("[modifiers] deleteModifierGroup error:", delErr);
      throw new Error("Erro ao excluir grupo de modificadores.");
    }

    return { success: true, deletedId: input.groupId };
  });

export const upsertModifier = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid().optional(),
      groupId: z.string().uuid(),
      title: z.string().min(1),
      priceDeltaCents: z.number().int().min(0).default(0),
      isDefault: z.boolean().default(false),
      isAvailable: z.boolean().default(true),
      sortOrder: z.number().int().default(0),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    if (!identity?.id) throw new Error("Não autenticado");

    const { data: group, error: gErr } = await supabase
      .from("product_modifier_groups")
      .select("id, store_id, product_id")
      .eq("id", input.groupId)
      .single();

    if (gErr || !group) {
      throw new Error("Grupo de modificadores pai não encontrado.");
    }

    assertStoreAccess(identity, ["owner", "admin", "manager"], group.store_id);

    const payload = {
      group_id: input.groupId,
      title: input.title,
      price_delta_cents: input.priceDeltaCents,
      is_default: input.isDefault,
      is_available: input.isAvailable,
      sort_order: input.sortOrder,
      updated_at: new Date().toISOString(),
    };

    if (input.id) {
      const { data, error } = await supabase
        .from("product_modifiers")
        .update(payload)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw new Error("Erro ao atualizar modificador.");
      return data;
    } else {
      const { data, error } = await supabase
        .from("product_modifiers")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error("Erro ao criar modificador.");
      return data;
    }
  });

export const deleteModifier = createServerFn({ method: "POST" })
  .validator(
    z.object({
      modifierId: z.string().uuid(),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    if (!identity?.id) throw new Error("Não autenticado");

    const { data: modifier, error: mErr } = await supabase
      .from("product_modifiers")
      .select("id, group_id, group:group_id (id, store_id)")
      .eq("id", input.modifierId)
      .single();

    if (mErr || !modifier) {
      throw new Error("Modificador não encontrado.");
    }

    const storeId = (modifier.group as any)?.store_id;
    assertStoreAccess(identity, ["owner", "admin", "manager"], storeId);

    const { error: delErr } = await supabase
      .from("product_modifiers")
      .delete()
      .eq("id", input.modifierId);

    if (delErr) {
      console.error("[modifiers] deleteModifier error:", delErr);
      throw new Error("Erro ao excluir modificador.");
    }

    return { success: true, deletedId: input.modifierId };
  });
