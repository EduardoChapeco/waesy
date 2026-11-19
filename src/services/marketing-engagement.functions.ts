import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getServerClient, SupabaseUnconfiguredError } from "@/lib/supabase";
import {
  getServerIdentity,
  assertStoreAccess,
  getSSRClient,
  requireStoreManagerIdentity,
} from "@/lib/server-access";

// ---------------------------------------------------------------------------
// Abandoned Carts
// ---------------------------------------------------------------------------

export const listAbandonedCarts = createServerFn({ method: "GET" }).handler(async () => {
 try {
 const identity = await requireStoreManagerIdentity(["content"]);
 const db = getServerClient();

 const { data, error } = await db
 .from("abandoned_carts_log")
 .select("*")
 .eq("store_id", identity.store_id)
 .order("updated_at", { ascending: false });

 if (error) throw error;
 return data;
 } catch (e) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 console.error("[marketing] listAbandonedCarts error:", e);
 throw new Error("Erro ao listar carrinhos abandonados.");
 }
});

export const updateAbandonedCartStatus = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid(),
 status: z.enum(["pending", "recovered", "lost", "contacted"]),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 const identity = await requireStoreManagerIdentity(["content"]);
 const db = getServerClient();

 const { data, error } = await db
 .from("abandoned_carts_log")
 .update({ status: input.status })
 .eq("id", input.id)
 .eq("store_id", identity.store_id)
 .select()
 .single();

 if (error) throw error;
 return data;
 } catch (e) {
 throw new Error("Erro ao atualizar status.");
 }
 });

// ---------------------------------------------------------------------------
// Match Time
// ---------------------------------------------------------------------------

export const listMatchTimeCampaigns = createServerFn({ method: "GET" }).handler(async () => {
 try {
 const identity = await requireStoreManagerIdentity(["content"]);
 const db = getServerClient();

 const { data, error } = await db
 .from("ad_campaigns")
 .select("*")
 .eq("store_id", identity.store_id)
 .order("created_at", { ascending: false });

 if (error) throw error;
 return data;
 } catch (e) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 throw new Error("Erro ao listar campanhas Match Time.");
 }
});

export const upsertMatchTimeCampaign = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid().optional(),
 name: z.string().min(2),
 prize_description: z.string().min(2),
 coupon_code: z.string().optional(),
 starts_at: z.string(),
 ends_at: z.string(),
 status: z.enum(["draft", "active", "finished"]),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 const identity = await requireStoreManagerIdentity(["content"]);
 const db = getServerClient();

 const payload = {
 store_id: identity.store_id,
 name: input.name,
 prize_description: input.prize_description,
 coupon_code: input.coupon_code || null,
 starts_at: input.starts_at,
 ends_at: input.ends_at,
 status: input.status,
 };

 let result;
 if (input.id) {
 result = await db
 .from("ad_campaigns")
 .update(payload)
 .eq("id", input.id)
 .eq("store_id", identity.store_id)
 .select()
 .single();
 } else {
 result = await db.from("ad_campaigns").insert(payload).select().single();
 }

 if (result.error) throw result.error;
 return result.data;
 } catch (e) {
 console.error("[marketing] upsertMatchTimeCampaign error:", e);
 throw new Error("Erro ao salvar campanha.");
 }
 });

// ---------------------------------------------------------------------------
// Social Posts Creator
// ---------------------------------------------------------------------------

export const listSocialPosts = createServerFn({ method: "GET" }).handler(async () => {
 try {
 const identity = await requireStoreManagerIdentity(["content"]);
 const db = getServerClient();

 const { data, error } = await db
 .from("social_posts_assets")
 .select("*")
 .eq("store_id", identity.store_id)
 .order("created_at", { ascending: false });

 if (error) throw error;
 return data;
 } catch (e) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 throw new Error("Erro ao listar posts.");
 }
});

export const createSocialPost = createServerFn({ method: "POST" })
 .validator(
 z.object({
 platform: z.string(),
 content_text: z.string(),
 image_url: z.string().url().optional(),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 const identity = await requireStoreManagerIdentity(["content"]);
 const db = getServerClient();

 const { data, error } = await db
 .from("social_posts_assets")
 .insert({
 store_id: identity.store_id,
 platform: input.platform,
 content_text: input.content_text,
 image_url: input.image_url || null,
 is_published: false,
 })
 .select()
 .single();

 if (error) throw error;
 return data;
 } catch (e) {
 console.error("[marketing] createSocialPost error:", e);
 throw new Error("Erro ao salvar post.");
 }
 });
