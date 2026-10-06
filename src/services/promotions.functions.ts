import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { resolveTenantStoreId } from "@/lib/server-access";

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
};

export const listStorePromotions = createServerFn({ method: "GET" }).handler(async () => {
 const supabase = getServerClient();
 const storeId = await resolveTenantStoreId();

 if (!storeId) {
 return [];
 }

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
 promotion_products(count)
 `,
 )
 .eq("store_id", storeId)
 .order("created_at", { ascending: false });

 if (error || !data) {
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
 product_ids: z.array(z.string()).optional(),
 }),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const storeId = await resolveTenantStoreId();

 if (!storeId) {
 throw new Error("Loja não autorizada ou não encontrada");
 }

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
 })
 .select()
 .single();

 if (error || !promo) {
 console.error("[promotions.functions] createPromotion error:", error);
 throw new Error("Erro ao criar promoção");
 }

 if (data.product_ids && data.product_ids.length > 0) {
 const links = data.product_ids.map((pid) => ({
 promotion_id: promo.id,
 product_id: pid,
 }));
 await supabase.from("promotion_products").insert(links);
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
 const supabase = getServerClient();
 const storeId = await resolveTenantStoreId();

 if (!storeId) throw new Error("Loja não identificada");

 const { error } = await supabase
 .from("promotions")
 .update({ is_active: data.is_active, updated_at: new Date().toISOString() })
 .eq("id", data.id)
 .eq("store_id", storeId);

 if (error) {
 throw new Error("Erro ao atualizar status da promoção");
 }

 return { success: true };
 });
