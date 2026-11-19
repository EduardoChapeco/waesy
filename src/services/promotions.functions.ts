import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { logSystemError } from "@/lib/logger";
import {
  assertStoreAccess,
  getServerIdentity,
  MANAGER_ROLES,
  STAFF_ROLES,
} from "@/lib/server-access";

export type PromotionDTO = {
 id: string;
 store_id: string;
 title: string;
 description: string | null;
 type:
 | "flash_offer"
 | "percentage_discount"
 | "fixed_discount"
 | "buy_x_get_y"
 | "progressive_quantity"
 | "club_price";
 discount_percent: number | null;
 discount_cents: number | null;
 buy_qty: number;
 get_qty: number;
 starts_at: string;
 ends_at: string | null;
 is_active: boolean;
 max_redemptions: number | null;
 current_redemptions: number;
 product_count?: number;
 target_catalog_ids?: string[] | null;
 target_price_table_ids?: string[] | null;
 target_seller_ids?: string[] | null;
};

export const listStorePromotions = createServerFn({ method: "GET" }).handler(async () => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, STAFF_ROLES);
 const supabase = getServerClient();
 const storeId = identity.store_id;

 const { data, error } = await supabase
 .from("promotions")
 .select(
 `
 id,
 store_id,
 title,
 description,
 type,
 discount_percent,
 discount_cents,
 buy_qty,
 get_qty,
 starts_at,
 ends_at,
 is_active,
 max_redemptions,
 current_redemptions,
 target_catalog_ids,
 target_price_table_ids,
 target_seller_ids,
 promotion_products(count)
 `,
 )
 .eq("store_id", storeId)
 .order("created_at", { ascending: false });

 if (error) {
  logSystemError({
   route: "promotions.listStorePromotions",
   contractName: "listStorePromotions",
   tableName: "promotions",
   error,
   userId: identity.id,
  });
  throw new Error("Erro ao listar promoções da loja.");
 }
 if (!data) {
 return [];
 }

 return data.map((p: any) => ({
 id: p.id,
 store_id: p.store_id,
 title: p.title,
 description: p.description,
 type: p.type,
 discount_percent: p.discount_percent,
 discount_cents: p.discount_cents,
 buy_qty: p.buy_qty,
 get_qty: p.get_qty,
 starts_at: p.starts_at,
 ends_at: p.ends_at,
 is_active: p.is_active,
 max_redemptions: p.max_redemptions,
 current_redemptions: p.current_redemptions,
 product_count: p.promotion_products?.[0]?.count || 0,
 target_catalog_ids: p.target_catalog_ids || null,
 target_price_table_ids: p.target_price_table_ids || null,
 target_seller_ids: p.target_seller_ids || null,
 }));
});

export const createPromotion = createServerFn({ method: "POST" })
 .validator(
 z.object({
 title: z.string().min(3),
 description: z.string().optional(),
 type: z.enum([
 "flash_offer",
 "percentage_discount",
 "fixed_discount",
 "buy_x_get_y",
 "progressive_quantity",
 "club_price",
 ]),
 discount_percent: z.number().int().min(0).max(100).optional(),
 discount_cents: z.number().int().min(0).optional(),
 buy_qty: z.number().int().min(1).default(1),
 get_qty: z.number().int().min(1).default(1),
 starts_at: z.string().optional(),
 ends_at: z.string().optional(),
 product_ids: z.array(z.string().uuid()).optional(),
 target_catalog_ids: z.array(z.string().uuid()).optional(),
 target_price_table_ids: z.array(z.string().uuid()).optional(),
 target_seller_ids: z.array(z.string().uuid()).optional(),
 }),
 )
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, MANAGER_ROLES);
 const supabase = getServerClient();
 const storeId = identity.store_id;

 const { data: promo, error } = await supabase
 .from("promotions")
 .insert({
 store_id: storeId,
 title: data.title,
 description: data.description || null,
 type: data.type,
 discount_percent: data.discount_percent || 0,
 discount_cents: data.discount_cents || 0,
 buy_qty: data.buy_qty,
 get_qty: data.get_qty,
 starts_at: data.starts_at || new Date().toISOString(),
 ends_at: data.ends_at || null,
 is_active: true,
 target_catalog_ids: data.target_catalog_ids || null,
 target_price_table_ids: data.target_price_table_ids || null,
 target_seller_ids: data.target_seller_ids || null,
 })
 .select()
 .single();

 if (error || !promo) {
 logSystemError({
  route: "promotions.createPromotion",
  contractName: "createPromotion",
  tableName: "promotions",
  error: error || new Error("Promotion creation returned null"),
  userId: identity.id,
 });
 throw new Error("Erro ao criar promoção");
 }

 if (data.product_ids && data.product_ids.length > 0) {
  const { data: ownedProducts } = await supabase
   .from("products")
   .select("id")
   .eq("store_id", storeId)
   .in("id", data.product_ids);
  const ownedIds = (ownedProducts || []).map((p: any) => p.id);
  if (ownedIds.length > 0) {
   const links = ownedIds.map((pid: string) => ({
    promotion_id: promo.id,
    product_id: pid,
   }));
   const { error: linkErr } = await supabase.from("promotion_products").insert(links);
   if (linkErr) {
    logSystemError({
     route: "promotions.createPromotion",
     contractName: "createPromotion.linkProducts",
     tableName: "promotion_products",
     error: linkErr,
     userId: identity.id,
    });
   }
  }
 }

 return promo;
 });

export const togglePromotionStatus = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid(),
 is_active: z.boolean(),
 }),
 )
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, MANAGER_ROLES);
 const supabase = getServerClient();
 const storeId = identity.store_id;

 const { data: updated, error } = await supabase
 .from("promotions")
 .update({ is_active: data.is_active, updated_at: new Date().toISOString() })
 .eq("id", data.id)
 .eq("store_id", storeId)
 .select("id")
 .maybeSingle();

 if (error || !updated) {
 throw new Error("Promoção não encontrada ou acesso negado.");
 }

 return { success: true };
 });

export function computePromotionDiscount(params: {
 basePriceCents: number;
 quantity: number;
 promotion: {
  type: string;
  discount_percent?: number | null;
  discount_cents?: number | null;
  buy_qty?: number;
  get_qty?: number;
 };
}): { discountCents: number; discountedPriceCents: number } {
 let discount = 0;
 if (params.promotion.type === "percentage_discount" || params.promotion.type === "flash_offer") {
  discount = Math.round(params.basePriceCents * (Number(params.promotion.discount_percent || 0) / 100));
 } else if (params.promotion.type === "fixed_discount") {
  discount = Math.min(params.basePriceCents, Number(params.promotion.discount_cents || 0));
 } else if (params.promotion.type === "buy_x_get_y" && params.quantity >= Number(params.promotion.buy_qty || 1)) {
  discount = Math.round((params.basePriceCents / params.quantity) * Number(params.promotion.get_qty || 1));
 }
 return {
  discountCents: discount,
  discountedPriceCents: Math.max(0, params.basePriceCents - discount),
 };
}

export function isPromotionEligibleForB2B(params: {
 promotion: {
  is_active?: boolean;
  starts_at?: string;
  ends_at?: string | null;
  max_redemptions?: number | null;
  current_redemptions?: number;
  target_catalog_ids?: string[] | null;
  target_price_table_ids?: string[] | null;
  target_seller_ids?: string[] | null;
 };
 catalogId?: string | null;
 priceTableId?: string | null;
 sellerId?: string | null;
 nowIso?: string;
}): boolean {
 const now = params.nowIso || new Date().toISOString();
 const p = params.promotion;
 if (p.is_active === false) return false;
 if (p.starts_at && p.starts_at > now) return false;
 if (p.ends_at && p.ends_at < now) return false;
 if (p.max_redemptions && (p.current_redemptions || 0) >= p.max_redemptions) return false;

 if (Array.isArray(p.target_catalog_ids) && p.target_catalog_ids.length > 0) {
  if (!params.catalogId || !p.target_catalog_ids.includes(params.catalogId)) return false;
 }
 if (Array.isArray(p.target_price_table_ids) && p.target_price_table_ids.length > 0) {
  if (!params.priceTableId || !p.target_price_table_ids.includes(params.priceTableId)) return false;
 }
 if (Array.isArray(p.target_seller_ids) && p.target_seller_ids.length > 0) {
  if (!params.sellerId || !p.target_seller_ids.includes(params.sellerId)) return false;
 }
 return true;
}

export interface EvaluatedPromotionResult {
 hasPromotion: boolean;
 promotionId: string | null;
 promotionTitle: string | null;
 originalPriceCents: number;
 discountedPriceCents: number;
 savingsCents: number;
 badgeLabel: string | null;
}

export const evaluatePromotionEligibilityFn = createServerFn({ method: "POST" })
 .validator(
  z.object({
   storeId: z.string().uuid(),
   productId: z.string().uuid(),
   basePriceCents: z.number().int().min(0),
   quantity: z.number().int().min(1).default(1),
   catalogId: z.string().uuid().optional().nullable(),
   priceTableId: z.string().uuid().optional().nullable(),
   sellerId: z.string().uuid().optional().nullable(),
   customerId: z.string().uuid().optional().nullable(),
  }),
 )
 .handler(async ({ data }): Promise<EvaluatedPromotionResult> => {
  const supabase = getServerClient();
  const nowIso = new Date().toISOString();

  const { data: promoLinks, error: linkErr } = await supabase
   .from("promotion_products")
   .select("promotion_id, promotions(*)")
   .eq("product_id", data.productId);

  if (linkErr) {
   logSystemError({
    route: "promotions.evaluatePromotionEligibility",
    contractName: "evaluatePromotionEligibilityFn",
    tableName: "promotion_products",
    error: linkErr,
   });
  }

  const candidatePromos: any[] = [];
  if (promoLinks) {
   for (const link of promoLinks) {
    if (link.promotions && (link.promotions as any).is_active) {
     candidatePromos.push(link.promotions);
    }
   }
  }

  const eligiblePromos = candidatePromos.filter((p) =>
   isPromotionEligibleForB2B({
    promotion: p,
    catalogId: data.catalogId,
    priceTableId: data.priceTableId,
    sellerId: data.sellerId,
    nowIso,
   }),
  );

  if (eligiblePromos.length === 0) {
   return {
    hasPromotion: false,
    promotionId: null,
    promotionTitle: null,
    originalPriceCents: data.basePriceCents,
    discountedPriceCents: data.basePriceCents,
    savingsCents: 0,
    badgeLabel: null,
   };
  }

  let bestDiscountCents = 0;
  let bestPromo: any = eligiblePromos[0];

  for (const p of eligiblePromos) {
   const { discountCents } = computePromotionDiscount({
    basePriceCents: data.basePriceCents,
    quantity: data.quantity,
    promotion: p,
   });

   if (discountCents >= bestDiscountCents) {
    bestDiscountCents = discountCents;
    bestPromo = p;
   }
  }

  const discountedPriceCents = Math.max(0, data.basePriceCents - bestDiscountCents);
  const badgeLabel = bestPromo.type === "flash_offer"
   ? "Oferta Relâmpago"
   : bestPromo.discount_percent
    ? `-${bestPromo.discount_percent}%`
    : "Promoção B2B";

  return {
   hasPromotion: bestDiscountCents > 0,
   promotionId: bestPromo.id,
   promotionTitle: bestPromo.title,
   originalPriceCents: data.basePriceCents,
   discountedPriceCents,
   savingsCents: bestDiscountCents,
   badgeLabel: bestDiscountCents > 0 ? badgeLabel : null,
  };
 });
