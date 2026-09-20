import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient, getAnonServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

export type BannerPlacement =
 | "home"
 | "home_middle"
 | "home_footer"
 | "mercado"
 | "marketplace"
 | "noticias"
 | "agenda"
 | "events"
 | "eventos"
 | "diretorio"
 | "empregos"
 | "turismo"
 | "classificados"
 | "classifieds"
 | "mobilidade"
 | "gastronomia"
 | "moda"
 | "pet"
 | "livros"
 | "imoveis"
 | "limpeza"
 | "beleza"
 | "servicos"
 | "acougue"
 | "bebidas"
 | "farmacia"
 | "construcao"
 | "casa"
 | "eletronicos"
 | "all"
 | "ofertas"
 | "store";


export interface BannerDTO {
 id: string;
 store_id?: string | null;
 title: string;
 subtitle?: string | null;
 badge_text?: string | null;
 media_url: string;
 media_type: "image" | "video" | "gif";
 target_type: "product" | "category" | "hotpage" | "store" | "external_url";
 target_id?: string | null;
 target_url?: string | null;
 cta_label?: string | null;
 placement: BannerPlacement;
 city_filter?: string | null;
 starts_at: string;
 ends_at?: string | null;
 is_active: boolean;
 sort_order: number;
 show_title?: boolean;
 show_description?: boolean;
 show_overlay?: boolean;
 show_shadow?: boolean;
 bg_color?: string | null;
 bg_overlay_opacity?: number | null;
 show_badge?: boolean;
 show_cta?: boolean;
}

export const BannerPlacementSchema = z.enum([
 "home",
 "home_middle",
 "home_footer",
 "mercado",
 "marketplace",
 "noticias",
 "agenda",
 "events",
 "eventos",
 "diretorio",
 "empregos",
 "turismo",
 "classificados",
 "classifieds",
 "mobilidade",
 "gastronomia",
 "moda",
 "pet",
 "livros",
 "imoveis",
 "limpeza",
 "beleza",
 "servicos",
 "acougue",
 "bebidas",
 "farmacia",
 "construcao",
 "casa",
 "eletronicos",
 "all" as const,
 "ofertas" as const,
 "store" as const,
]);

export const listActiveBanners = createServerFn({ method: "GET" })
 .validator(
 z.object({
 placement: BannerPlacementSchema.optional(),
 city: z.string().optional(),
 storeId: z.string().optional(),
 }),
 )
 .handler(async ({ data: { placement, city, storeId } }): Promise<BannerDTO[]> => {
 const supabase = getAnonServerClient();

 let query = supabase
 .from("banners")
 .select("*")
 .eq("is_active", true)
 .order("sort_order", { ascending: true })
 .order("created_at", { ascending: false });

 // Tratamento de sinônimos e isolamento canônico
 if (placement && placement !== "all") {
 if (placement === "events" || placement === "eventos" || placement === "agenda") {
 query = query.in("placement", ["eventos", "events", "agenda"]);
 } else if (placement === "marketplace" || placement === "mercado") {
 query = query.in("placement", ["mercado", "marketplace"]);
 } else if (placement === "classificados" || placement === "classifieds") {
 query = query.in("placement", ["classificados", "classifieds"]);
 } else {
 query = query.eq("placement", placement);
 }
 }

 // Se for banner de loja específica
 if (storeId) {
 query = query.eq("store_id", storeId);
 }

 if (city) {
 query = query.or(`city_filter.eq.${city},city_filter.is.null`);
 }

 const { data, error } = await query;
 if (error || !data) {
 return [];
 }

 const active = data.map((b: any) => ({
 ...b,
 show_title: b.show_title === true,
 show_description: b.show_description === true,
 show_overlay: b.show_overlay === true,
 show_badge: b.show_badge === true,
 show_cta: b.show_cta === true,
 })) as BannerDTO[];

 return active;
 });

export const createBanner = createServerFn({ method: "POST" })
 .validator(
 z.object({
 title: z.string().min(1),
 subtitle: z.string().optional(),
 badge_text: z.string().optional(),
 media_url: z.string().url(),
 media_type: z.enum(["image", "video", "gif"]).default("image"),
 target_type: z
 .enum(["product", "category", "hotpage", "store", "external_url"])
 .default("hotpage"),
 target_id: z.string().optional(),
 target_url: z.string().optional(),
 cta_label: z.string().optional(),
 placement: BannerPlacementSchema.default("home"),
 city_filter: z.string().optional(),
 starts_at: z.string().optional(),
 ends_at: z.string().optional(),
 is_active: z.boolean().optional(),
 sort_order: z.number().int().default(0),
 show_title: z.boolean().optional(),
 show_description: z.boolean().optional(),
 show_overlay: z.boolean().optional(),
 show_shadow: z.boolean().optional(),
 bg_color: z.string().nullable().optional(),
 bg_overlay_opacity: z.number().min(0).max(100).optional(),
 show_badge: z.boolean().optional(),
 show_cta: z.boolean().optional(),
 }),
 )
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 const isPlatformAdmin = identity.role === "platform_admin" || identity.role === "master";

 // Se NÃO for Admin Master da Plataforma, é um Lojista: isolamento rígido multi-tenant
 if (!isPlatformAdmin) {
 assertStoreAccess(identity, ["owner", "admin", "manager", "content"]);
 if (!identity.store_id) {
 throw new Error("Lojista não associado a uma loja válida.");
 }
 }

 const supabase = getServerClient();

 // Lojista comum só pode criar banner para sua própria vitrine (placement: "store")
 const finalPlacement = isPlatformAdmin ? data.placement : "store";
 const finalStoreId = isPlatformAdmin ? (data.placement === "store" ? identity.store_id : null) : identity.store_id;

 const { data: banner, error } = await supabase
 .from("banners")
 .insert({
 ...data,
 placement: finalPlacement,
 store_id: finalStoreId,
 starts_at: data.starts_at || new Date().toISOString(),
 is_active: data.is_active !== undefined ? data.is_active : true,
 })
 .select()
 .single();

 if (error) {
 throw new Error(`Erro ao criar banner: ${error.message}`);
 }

 return banner as BannerDTO;
 });

export const updateBanner = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid(),
 title: z.string().min(1).optional(),
 subtitle: z.string().optional().nullable(),
 badge_text: z.string().optional().nullable(),
 media_url: z.string().url().optional(),
 media_type: z.enum(["image", "video", "gif"]).optional(),
 target_type: z
 .enum(["product", "category", "hotpage", "store", "external_url"])
 .optional(),
 target_id: z.string().optional().nullable(),
 target_url: z.string().optional().nullable(),
 cta_label: z.string().optional().nullable(),
 placement: BannerPlacementSchema.optional(),
 city_filter: z.string().optional().nullable(),
 starts_at: z.string().optional(),
 ends_at: z.string().optional().nullable(),
 is_active: z.boolean().optional(),
 sort_order: z.number().int().optional(),
 show_title: z.boolean().optional(),
 show_description: z.boolean().optional(),
 show_overlay: z.boolean().optional(),
 show_shadow: z.boolean().optional(),
 bg_color: z.string().nullable().optional(),
 bg_overlay_opacity: z.number().min(0).max(100).optional(),
 show_badge: z.boolean().optional(),
 show_cta: z.boolean().optional(),
 }),
 )
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 const isPlatformAdmin = identity.role === "platform_admin" || identity.role === "master";

 if (!isPlatformAdmin) {
 assertStoreAccess(identity, ["owner", "admin", "manager", "content"]);
 if (!identity.store_id) {
 throw new Error("Lojista não associado a uma loja válida.");
 }
 }

 const supabase = getServerClient();
 const { id, ...updates } = data;

 let query = supabase.from("banners").update(updates).eq("id", id);

 // Se for Lojista, bloqueia edição de banners de outras lojas ou globais
 if (!isPlatformAdmin) {
 query = query.eq("store_id", identity.store_id);
 }

 const { data: updated, error } = await query.select().single();

 if (error) {
 throw new Error(`Erro ao atualizar banner: ${error.message}`);
 }
 return updated as BannerDTO;
 });

export const deleteBanner = createServerFn({ method: "POST" })
 .validator(z.object({ id: z.string().uuid() }))
 .handler(async ({ data: { id } }) => {
 const identity = await getServerIdentity();
 const isPlatformAdmin = identity.role === "platform_admin" || identity.role === "master";

 if (!isPlatformAdmin) {
 assertStoreAccess(identity, ["owner", "admin", "manager", "content"]);
 if (!identity.store_id) {
 throw new Error("Lojista não associado a uma loja válida.");
 }
 }

 const supabase = getServerClient();

 let query = supabase.from("banners").delete().eq("id", id);
 if (!isPlatformAdmin) {
 query = query.eq("store_id", identity.store_id);
 }

 const { error } = await query;
 if (error) {
 throw new Error(`Falha ao excluir banner: ${error.message}`);
 }
 return { success: true };
 });

