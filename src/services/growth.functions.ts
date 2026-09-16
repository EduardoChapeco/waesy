import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getServerClient, SupabaseUnconfiguredError } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess, getSSRClient } from "@/lib/server-access";

async function getAdminIdentity() {
 const { getServerIdentity } = await import("@/lib/server-access");
 const identity = await getServerIdentity();

 if (!identity.store_id || !["owner", "admin", "manager"].includes(identity.role)) {
 throw new Error("Acesso negado");
 }

 return identity;
}

// ---------------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------------

export const listCoupons = createServerFn({ method: "GET" }).handler(async () => {
 try {
 const identity = await getAdminIdentity();
 const db = getServerClient();

 const { data, error } = await db
 .from("coupons")
 .select("*")
 .eq("store_id", identity.store_id)
 .order("created_at", { ascending: false });

 if (error) throw error;
 return data;
 } catch (e) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 console.error("[growth] listCoupons error:", e);
 throw new Error("Erro ao listar cupons.");
 }
});

const couponSchema = z.object({
 id: z.string().uuid().optional(),
 code: z.string().min(3).toUpperCase(),
 discount_type: z.enum(["percentage", "fixed_amount", "free_shipping"]),
 discount_value: z.number().nonnegative(),
 min_order_cents: z.number().nullable().optional(),
 max_uses: z.number().nullable().optional(),
 expires_at: z.string().nullable().optional(),
 is_active: z.boolean(),
});

export const upsertCoupon = createServerFn({ method: "POST" })
 .validator(couponSchema)
 .handler(async ({ data: input }) => {
 try {
 const identity = await getAdminIdentity();
 const db = getServerClient();

 const payload = {
 store_id: identity.store_id,
 code: input.code,
 discount_type: input.discount_type,
 discount_value: input.discount_value,
 min_order_cents: input.min_order_cents || null,
 max_uses: input.max_uses || null,
 expires_at: input.expires_at || null,
 is_active: input.is_active,
 };

 let result;
 if (input.id) {
 result = await db.from("coupons").update(payload).eq("id", input.id).select().single();
 } else {
 result = await db.from("coupons").insert(payload).select().single();
 }

 if (result.error) throw result.error;
 return result.data;
 } catch (e: unknown) {
 console.error("[growth] upsertCoupon error:", e);
 if ((e as any).code === "23505") throw new Error("Código de cupom já existe.");
 throw new Error("Erro ao salvar cupom.");
 }
 });

export const deleteCoupon = createServerFn({ method: "POST" })
 .validator(z.object({ id: z.string().uuid() }))
 .handler(async ({ data: { id } }) => {
 try {
 const identity = await getAdminIdentity();
 const db = getServerClient();

 const { error } = await db
 .from("coupons")
 .delete()
 .eq("id", id)
 .eq("store_id", identity.store_id);

 if (error) throw error;
 return { status: "success" as const };
 } catch (e: unknown) {
 console.error("[growth] deleteCoupon error:", e);
 throw new Error("Erro ao excluir cupom.");
 }
 });

export async function validateCouponLogic(data: {
  storeId: string;
  code: string;
  cartTotalCents: number;
}) {
  const db = getServerClient();
  const cleanCode = data.code.trim().toUpperCase();

  const { data: coupon, error } = await db
    .from("coupons")
    .select("*")
    .eq("store_id", data.storeId)
    .eq("code", cleanCode)
    .maybeSingle();

  if (error || !coupon) {
    throw new Error("Cupom inválido ou não encontrado.");
  }

  if (!coupon.is_active) {
    throw new Error("Este cupom está temporariamente desativado.");
  }

  if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) {
    throw new Error("Este cupom já expirou.");
  }

  if (coupon.max_uses && coupon.uses_count >= coupon.max_uses) {
    throw new Error("Este cupom atingiu o limite máximo de utilizações.");
  }

  if (coupon.min_order_cents && data.cartTotalCents < coupon.min_order_cents) {
    const minFormatted = (coupon.min_order_cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
    throw new Error(`Este cupom exige um pedido mínimo de ${minFormatted}.`);
  }

  let discountCents = 0;
  let isFreeShipping = false;

  if (coupon.discount_type === "percentage") {
    discountCents = Math.round((data.cartTotalCents * Number(coupon.discount_value)) / 100);
  } else if (coupon.discount_type === "fixed_amount") {
    discountCents = Math.min(data.cartTotalCents, Math.round(Number(coupon.discount_value) * 100));
  } else if (coupon.discount_type === "free_shipping") {
    isFreeShipping = true;
  }

  return {
    valid: true,
    coupon_id: coupon.id,
    code: coupon.code,
    discount_type: coupon.discount_type,
    discount_value: Number(coupon.discount_value),
    discount_cents: discountCents,
    is_free_shipping: isFreeShipping,
  };
}

export const validateCoupon = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid(),
      code: z.string().min(1),
      cartTotalCents: z.number().int().min(0),
    }),
  )
  .handler(async ({ data }) => {
    try {
      return await validateCouponLogic(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao validar cupom.";
      throw new Error(msg);
    }
  });

// ---------------------------------------------------------------------------
// Integrations (Delegated to canonical integrations.functions.ts)
// ---------------------------------------------------------------------------

export { listIntegrationSettings as listIntegrations, saveIntegrationCredential as upsertIntegration } from "./integrations.functions";

// --- CAMPAIGNS ---

export const listCampaigns = createServerFn({ method: "GET" }).handler(async () => {
 try {
 const identity = await getAdminIdentity();
 const db = getServerClient();

 const { data, error } = await db
 .from("ad_campaigns")
 .select(
 `
 id, title, status, budget_cents, start_date, end_date, target_url, placements,
 campaign_metrics(impressions, clicks, spend_cents)
 `,
 )
 .eq("store_id", identity.store_id)
 .order("created_at", { ascending: false });

 if (error) throw error;

 const formattedData = (data || []).map((camp: any) => {
 let totalImpressions = 0;
 let totalClicks = 0;
 let totalSpend = 0;

 if (camp.campaign_metrics) {
 camp.campaign_metrics.forEach((m: any) => {
 totalImpressions += m.impressions;
 totalClicks += m.clicks;
 totalSpend += m.spend_cents;
 });
 }

 return {
 ...camp,
 metrics: { impressions: totalImpressions, clicks: totalClicks, spend_cents: totalSpend },
 };
 });

 return formattedData;
 } catch (e: unknown) {
 console.error("[growth] listCampaigns error:", e);
 throw new Error("Erro ao listar campanhas.");
 }
});

export const saveCampaign = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid().optional(),
 title: z.string().min(1),
 body: z.string().optional(),
 target_url: z.string().optional(),
 budget_cents: z.number().int().min(0),
 status: z.enum(["draft", "active", "paused", "completed", "archived"]).default("active"),
 placements: z.array(z.string()).default(["feed"]),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 const identity = await getAdminIdentity();
 const db = getServerClient();

 if (!input.id) {
 const { data, error } = await db
 .from("ad_campaigns")
 .insert({
 store_id: identity.store_id,
 title: input.title,
 body: input.body,
 target_url: input.target_url,
 budget_cents: input.budget_cents,
 status: input.status,
 placements: input.placements,
 })
 .select("id")
 .single();

 if (error || !data) throw error || new Error("Falha ao criar campanha");
 return { success: true, id: data.id };
 } else {
 const { error } = await db
 .from("ad_campaigns")
 .update({
 title: input.title,
 body: input.body,
 target_url: input.target_url,
 budget_cents: input.budget_cents,
 status: input.status,
 placements: input.placements,
 })
 .eq("id", input.id)
 .eq("store_id", identity.store_id);

 if (error) throw error;
 return { success: true, id: input.id };
 }
 } catch (e: unknown) {
 console.error("[growth] saveCampaign error:", e);
 throw new Error("Erro ao salvar campanha.");
 }
 });

// --- DYNAMIC COMMISSIONS ---

export const listCommissionRules = createServerFn({ method: "GET" }).handler(async () => {
 try {
 const identity = await getAdminIdentity();
 const db = getServerClient();

 const { data, error } = await db
 .from("dynamic_commission_rules")
 .select(
 `
 id, rate_percentage, status, valid_until, seller_id, product_id,
 seller:profiles!dynamic_commission_rules_seller_id_fkey(name, email),
 product:products!dynamic_commission_rules_product_id_fkey(title)
 `,
 )
 .eq("store_id", identity.store_id)
 .order("created_at", { ascending: false });

 if (error) throw error;
 return data || [];
 } catch (e: unknown) {
 console.error("[growth] listCommissionRules error:", e);
 throw new Error("Erro ao listar regras de comissão.");
 }
});

export const saveCommissionRule = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid().optional(),
 seller_id: z.string().uuid().optional().nullable(),
 product_id: z.string().uuid().optional().nullable(),
 rate_percentage: z.number().min(0).max(100),
 status: z.enum(["active", "inactive"]).default("active"),
 valid_until: z.string().optional().nullable(),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 const identity = await getAdminIdentity();
 const db = getServerClient();

 const payload = {
 store_id: identity.store_id,
 seller_id: input.seller_id || null,
 product_id: input.product_id || null,
 rate_percentage: input.rate_percentage,
 status: input.status,
 valid_until: input.valid_until || null,
 };

 if (!input.id) {
 const { data, error } = await db
 .from("dynamic_commission_rules")
 .insert(payload)
 .select("id")
 .single();

 if (error || !data) throw error || new Error("Falha ao criar regra");
 return { success: true, id: data.id };
 } else {
 const { error } = await db
 .from("dynamic_commission_rules")
 .update(payload)
 .eq("id", input.id)
 .eq("store_id", identity.store_id);

 if (error) throw error;
 return { success: true, id: input.id };
 }
 } catch (e: unknown) {
 console.error("[growth] saveCommissionRule error:", e);
 throw new Error("Erro ao salvar regra de comissão.");
 }
 });
