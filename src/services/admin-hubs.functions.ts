/**
 * BFF Server Functions para Gestão de Hubs Verticais, Super Nichos e Categorias Globais
 * Exclusivo para Administrador Master Global (platform_admin)
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { requirePlatformAdmin } from "@/lib/server-access";
import type { HotpageDTO, HotpageModule } from "./hotpage.functions";

const PlatformHubSchema = z.object({
 id: z.string().uuid().optional(),
 slug: z.string().min(2),
 title: z.string().min(2),
 badge_label: z.string().nullable().optional(),
 description: z.string().nullable().optional(),
 cover_image_url: z.string().nullable().optional(),
 icon_name: z.string().nullable().optional(),
 icon_url: z.string().nullable().optional(),
 custom_icon_url: z.string().nullable().optional(),
 module: z
 .enum([
 "home",
 "mercado",
 "marketplace",
 "noticias",
 "agenda",
 "events",
 "diretorio",
 "turismo",
 "empregos",
 "classificados",
 "mobilidade",
 "all",
 ])
 .default("home"),
 sort_order: z.number().int().default(0),
 show_title: z.boolean().default(true),
 show_description: z.boolean().default(true),
 show_overlay: z.boolean().default(true),
 show_badge: z.boolean().default(true),
 is_active: z.boolean().default(true),
 filter_rules: z.record(z.any()).nullable().optional(),
});

export const listAllAdminHubs = createServerFn({ method: "GET" })
 .validator(z.object({ module: z.string().optional() }).optional())
 .handler(async ({ data }) => {
 await requirePlatformAdmin();

 const supabase = getServerClient();
 let query = supabase
 .from("hotpages")
 .select("*")
 .eq("template_type", "category_hub")
 .order("sort_order", { ascending: true });

 if (data?.module && data.module !== "all") {
 query = query.eq("module", data.module);
 }

 const { data: rows, error } = await query;
 if (error) throw new Error(error.message);
 return (rows || []) as HotpageDTO[];
 });

export const listPublicCategoryHubs = createServerFn({ method: "GET" })
 .validator(z.object({ module: z.string().optional() }).optional())
 .handler(async ({ data }) => {
 const { getAnonServerClient } = await import("@/lib/supabase");
 const supabase = getAnonServerClient();
 let query = supabase
 .from("hotpages")
 .select("*")
 .eq("is_active", true)
 .eq("template_type", "category_hub")
 .order("sort_order", { ascending: true });

 if (data?.module && data.module !== "all") {
 query = query.eq("module", data.module);
 }

 const { data: rows } = await query;
 return (rows || []) as HotpageDTO[];
 });

export const saveAdminHub = createServerFn({ method: "POST" })
 .validator(PlatformHubSchema)
 .handler(async ({ data }) => {
 await requirePlatformAdmin();

 const supabase = getServerClient();
 const payload = {
 slug: data.slug.toLowerCase().trim(),
 title: data.title.trim(),
 badge_label: data.badge_label || null,
 description: data.description || null,
 cover_image_url: data.cover_image_url || null,
 icon_name: data.icon_name || null,
 icon_url: data.custom_icon_url || data.icon_url || null,
 custom_icon_url: data.custom_icon_url || data.icon_url || null,
 module: data.module,
 template_type: "category_hub",
 sort_order: data.sort_order,
 show_title: data.show_title,
 show_description: data.show_description,
 show_overlay: data.show_overlay,
 show_badge: data.show_badge,
 is_active: data.is_active,
 filter_rules: data.filter_rules || {},
 };

 if (data.id) {
 const { data: updated, error } = await supabase
 .from("hotpages")
 .update(payload)
 .eq("id", data.id)
 .select()
 .single();

 if (error) throw new Error(`Erro ao atualizar categoria global: ${error.message}`);
 return updated as HotpageDTO;
 } else {
 const { data: created, error } = await supabase
 .from("hotpages")
 .insert(payload)
 .select()
 .single();

 if (error) throw new Error(`Erro ao criar categoria global: ${error.message}`);
 return created as HotpageDTO;
 }
 });

export const deleteAdminHub = createServerFn({ method: "POST" })
 .validator(z.object({ id: z.string().uuid() }))
 .handler(async ({ data: { id } }) => {
 await requirePlatformAdmin();

 const supabase = getServerClient();
 const { error } = await supabase.from("hotpages").delete().eq("id", id);
 if (error) throw new Error(`Erro ao remover categoria global: ${error.message}`);
 return { success: true };
 });

export const toggleAdminHubStatus = createServerFn({ method: "POST" })
 .validator(z.object({ id: z.string().uuid(), is_active: z.boolean() }))
 .handler(async ({ data: { id, is_active } }) => {
 await requirePlatformAdmin();

 const supabase = getServerClient();
 const { data: updated, error } = await supabase
 .from("hotpages")
 .update({ is_active })
 .eq("id", id)
 .select()
 .single();

 if (error) throw new Error(error.message);
 return updated as HotpageDTO;
 });
