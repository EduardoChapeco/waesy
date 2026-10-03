import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

const upsellRuleSchema = z.object({
 id: z.string().uuid().optional(),
 trigger_product_id: z.string().uuid(),
 offer_product_id: z.string().uuid(),
 discount_percentage: z.number().min(0).max(100),
 active: z.boolean(),
});

export const listUpsellRules = createServerFn({ method: "GET" }).handler(async () => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "content"]);

 const { data, error } = await supabase
 .from("upsell_rules")
 .select(
 `
 *,
 trigger_product:products!upsell_rules_trigger_product_id_fkey(id, title),
 offer_product:products!upsell_rules_offer_product_id_fkey(id, title)
 `,
 )
 .eq("store_id", identity.store_id)
 .order("created_at", { ascending: false });

 if (error) {
 console.error("[upsell] listUpsellRules error:", error);
 throw new Error("Erro ao buscar regras de upsell");
 }

 return data;
});

export const createUpsellRule = createServerFn({ method: "POST" })
 .validator(upsellRuleSchema.omit({ id: true }))
 .handler(async ({ data: input }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "content"]);

 if (input.trigger_product_id === input.offer_product_id) {
 throw new Error("O produto gatilho e o produto oferecido devem ser diferentes.");
 }

 const { data, error } = await supabase
 .from("upsell_rules")
 .insert({
 store_id: identity.store_id,
 trigger_product_id: input.trigger_product_id,
 offer_product_id: input.offer_product_id,
 discount_percentage: input.discount_percentage,
 active: input.active,
 })
 .select()
 .single();

 if (error) {
 console.error("[upsell] createUpsellRule error:", error);
 if (error.code === "23505") {
 throw new Error(
 "Já existe uma regra de upsell cadastrada para este produto gatilho e produto de oferta.",
 );
 }
 throw new Error("Erro ao cadastrar regra de upsell");
 }

 return data;
 });

export const updateUpsellRule = createServerFn({ method: "POST" })
 .validator(upsellRuleSchema)
 .handler(async ({ data: input }) => {
 if (!input.id) throw new Error("ID da regra é obrigatório para atualização.");

 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "content"]);

 if (input.trigger_product_id === input.offer_product_id) {
 throw new Error("O produto gatilho e o produto oferecido devem ser diferentes.");
 }

 const { data, error } = await supabase
 .from("upsell_rules")
 .update({
 trigger_product_id: input.trigger_product_id,
 offer_product_id: input.offer_product_id,
 discount_percentage: input.discount_percentage,
 active: input.active,
 })
 .eq("id", input.id)
 .eq("store_id", identity.store_id)
 .select()
 .single();

 if (error) {
 console.error("[upsell] updateUpsellRule error:", error);
 if (error.code === "23505") {
 throw new Error(
 "Já existe uma regra de upsell cadastrada para este produto gatilho e produto de oferta.",
 );
 }
 throw new Error("Erro ao atualizar regra de upsell");
 }

 return data;
 });

export const deleteUpsellRule = createServerFn({ method: "POST" })
 .validator(z.object({ id: z.string().uuid() }))
 .handler(async ({ data: { id } }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "content"]);

 const { error } = await supabase
 .from("upsell_rules")
 .delete()
 .eq("id", id)
 .eq("store_id", identity.store_id);

 if (error) {
 console.error("[upsell] deleteUpsellRule error:", error);
 throw new Error("Erro ao excluir regra de upsell");
 }

 return { status: "success" as const };
 });


export interface OrderBumpOfferDTO {
  ruleId: string;
  productId: string;
  variantId: string;
  title: string;
  originalPriceCents: number;
  discountPercentage: number;
  offerPriceCents: number;
  coverUrl: string | null;
  headline: string;
}

export const getActiveOrderBumpForCart = createServerFn({ method: "GET" })
  .validator(
    z.object({
      storeId: z.string().uuid().optional(),
      cartProductIds: z.array(z.string().uuid()).default([]),
    })
  )
  .handler(async ({ data: { storeId, cartProductIds } }): Promise<OrderBumpOfferDTO | null> => {
    try {
      const supabase = getServerClient();
      let targetStoreId = storeId;

      if (!targetStoreId) {
        const { data: firstStore } = await supabase
          .from("stores")
          .select("id")
          .limit(1)
          .maybeSingle();
        targetStoreId = firstStore?.id;
      }

      if (!targetStoreId) return null;

      // 1. Busca regra onde o trigger_product_id esta no carrinho
      let selectedRule: any = null;
      if (cartProductIds.length > 0) {
        const { data: triggerRules } = await supabase
          .from("upsell_rules")
          .select(`
            id,
            trigger_product_id,
            offer_product_id,
            discount_percentage,
            active
          `)
          .eq("store_id", targetStoreId)
          .eq("active", true)
          .in("trigger_product_id", cartProductIds)
          .limit(1);

        if (triggerRules && triggerRules.length > 0) {
          selectedRule = triggerRules[0];
        }
      }

      // 2. Fallback: regra geral da loja se nao encontrou gatilho especifico
      if (!selectedRule) {
        const { data: generalRules } = await supabase
          .from("upsell_rules")
          .select(`
            id,
            trigger_product_id,
            offer_product_id,
            discount_percentage,
            active
          `)
          .eq("store_id", targetStoreId)
          .eq("active", true)
          .limit(1);

        if (generalRules && generalRules.length > 0) {
          selectedRule = generalRules[0];
        }
      }

      if (!selectedRule || !selectedRule.offer_product_id) return null;

      // Nao oferece um item que o cliente ja tem no carrinho
      if (cartProductIds.includes(selectedRule.offer_product_id)) {
        return null;
      }

      // 3. Busca os dados reais do produto da oferta
      const { data: product, error: pErr } = await supabase
        .from("products")
        .select(`
          id,
          title,
          price_cents,
          product_media (url),
          product_variants (id, price_override_cents, stock_on_hand)
        `)
        .eq("id", selectedRule.offer_product_id)
        .single();

      if (pErr || !product) return null;

      const activeVariant = product.product_variants?.[0];
      if (!activeVariant) return null;

      const originalPrice = activeVariant.price_override_cents ?? product.price_cents ?? 0;
      const discount = selectedRule.discount_percentage || 0;
      const offerPrice = Math.max(0, Math.round(originalPrice * (1 - discount / 100)));
      const coverUrl = product.product_media?.[0]?.url || null;

      return {
        ruleId: selectedRule.id,
        productId: product.id,
        variantId: activeVariant.id,
        title: product.title,
        originalPriceCents: originalPrice,
        discountPercentage: discount,
        offerPriceCents: offerPrice,
        coverUrl,
        headline: discount > 0
          ? `Oferta Especial: Leve com ${discount}% de desconto!`
          : "Complemento perfeito para seu pedido!",
      };
    } catch (err) {
      console.warn("[upsell] Falha ao obter Order Bump:", err);
      return null;
    }
  });
