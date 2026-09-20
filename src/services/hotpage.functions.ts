import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAnonServerClient, getServerClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/server-access";

export type HotpageModule =
 | "home"
 | "mercado"
 | "marketplace"
 | "noticias"
 | "agenda"
 | "events"
 | "eventos"
 | "diretorio"
 | "turismo"
 | "empregos"
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
 | "doacoes"
 | "ofertas"
 | "feed"
 | "afiliados"
 | "all";

export const HotpageModuleSchema = z.enum([
 "home",
 "mercado",
 "marketplace",
 "noticias",
 "agenda",
 "events",
 "eventos",
 "diretorio",
 "turismo",
 "empregos",
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
 "doacoes",
 "ofertas",
 "feed",
 "afiliados",
 "all",
]);

export type HotpageBgMediaType = "none" | "image" | "video" | "gif";
export type HotpageBgTexture = "none" | "noise" | "dots" | "grid" | "mesh" | "glass";

export type HotpageTemplateType =
 | "hero_module"
 | "category_hub"
 | "editorial_card"
 | "turbo"
 | "hits"
 | "bogo"
 | "market"
 | "travel"
 | "services"
 | "custom";
export type HotpageRulePreset = "all" | "free_shipping" | "turbo_express" | "bogo" | "discount_only" | "top_rated" | "under_20" | "custom";

export interface HotpageDTO {
 id: string;
 slug: string;
 title: string;
 badge_label?: string | null;
 description?: string | null;
 cover_image_url?: string | null;
 icon_name?: string | null;
 icon_url?: string | null;
 custom_icon_url?: string | null;
 target_route?: string | null;
 bg_media_type?: HotpageBgMediaType | null;
 bg_media_url?: string | null;
 bg_color?: string | null;
 bg_overlay_opacity?: number | null;
 bg_texture?: HotpageBgTexture | null;
 filter_rules?: Record<string, any>;
 module?: HotpageModule;
 is_active: boolean;
 sort_order: number;
 show_title?: boolean;
 show_description?: boolean;
 show_overlay?: boolean;
 show_badge?: boolean;
 template_type?: HotpageTemplateType;
 rule_preset?: HotpageRulePreset;
 hero_stat_badge?: string | null;
 hero_secondary_badge?: string | null;
 hero_floating_render_url?: string | null;
 featured_rail_title?: string | null;
  show_shadow?: boolean;
  text_color?: string | null;
}

export function mapHotpageDTO(row: any): HotpageDTO {
  if (!row) return row;
  const filterRules = row.filter_rules && typeof row.filter_rules === "object" ? row.filter_rules : {};
  return {
    ...row,
    show_title: row.show_title !== false,
    show_description: row.show_description !== false,
    show_overlay: row.show_overlay === true,
    show_shadow: row.show_shadow ?? filterRules.show_shadow ?? false,
    show_badge: row.show_badge !== false,
    text_color: row.text_color || filterRules.text_color || null,
  };
}

export function sanitizeHotpagePayload(payload: Record<string, any>): Record<string, any> {
  const { show_shadow, text_color, filter_rules, ...rest } = payload;
  const mergedFilterRules = {
    ...(filter_rules || {}),
    ...(show_shadow !== undefined ? { show_shadow } : {}),
    ...(text_color !== undefined ? { text_color } : {}),
  };

  const cleanPayload: Record<string, any> = {
    ...rest,
    filter_rules: mergedFilterRules,
  };

  if (show_shadow !== undefined) {
    cleanPayload.show_shadow = show_shadow;
  }
  if (text_color !== undefined) {
    cleanPayload.text_color = text_color;
  }

  return cleanPayload;
}

export const listHotpages = createServerFn({ method: "GET" })
 .validator(
 z
 .object({
 module: HotpageModuleSchema.optional(),
 template_type: z.string().optional(),
 })
 .optional(),
 )
  .handler(async ({ data }): Promise<HotpageDTO[]> => {
    const supabase = getAnonServerClient();
    const reqModule = data?.module;

    let query = supabase
      .from("hotpages")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (data?.template_type) {
      query = query.eq("template_type", data.template_type);
    } else if (reqModule === "home") {
      // Por padrão na home, não mistura category_hub
      query = query.or("template_type.is.null,template_type.neq.category_hub");
    }

    if (reqModule && reqModule !== "all") {
      if (reqModule === "eventos" || reqModule === "events" || reqModule === "agenda") {
        query = query.in("module", ["eventos", "events", "agenda"]);
      } else if (reqModule === "marketplace" || reqModule === "mercado") {
        query = query.in("module", ["mercado", "marketplace"]);
      } else if (reqModule === "classificados" || reqModule === "classifieds") {
        query = query.in("module", ["classificados", "classifieds"]);
      } else {
        query = query.eq("module", reqModule);
      }
    }

    const { data: records, error } = await query.order("sort_order", { ascending: true });

    if (error || !records) {
      return [];
    }

    return records.map(mapHotpageDTO);
  });

export const listActiveHotpages = listHotpages;

/**
 * Lista exclusivamente os Cards Herói do Topo (Módulos Principais 16:9 Limpos da Home)
 */
export const listHomeHeroCards = createServerFn({ method: "GET" }).handler(
  async (): Promise<HotpageDTO[]> => {
    const supabase = getAnonServerClient();
    const { data: rows } = await supabase
      .from("hotpages")
      .select("*")
      .eq("is_active", true)
      .or("template_type.eq.hero_module,and(module.eq.home,template_type.neq.category_hub,template_type.neq.editorial_card)")
      .order("sort_order", { ascending: true });

    return (rows || []).map(mapHotpageDTO);
  }
);

/**
 * Lista exclusivamente os Botões / Chips de Supercategorias (Continuação das categorias)
 */
export const listSubcategoryChips = createServerFn({ method: "GET" }).handler(
 async (): Promise<HotpageDTO[]> => {
 const supabase = getAnonServerClient();
 const { data: rows } = await supabase
 .from("hotpages")
 .select("*")
 .eq("is_active", true)
 .eq("template_type", "category_hub")
 .order("sort_order", { ascending: true });

 return (rows || []) as HotpageDTO[];
 }
);

/**
 * Lista exclusivamente as Coleções & Hotpages Editoriais (para o HotpagesRail)
 */
export const listEditorialHotpages = createServerFn({ method: "GET" })
 .validator(z.object({ module: HotpageModuleSchema.optional() }).optional())
 .handler(async ({ data }): Promise<HotpageDTO[]> => {
 const supabase = getAnonServerClient();
 const mod = data?.module || "home";
 const { data: rows } = await supabase
 .from("hotpages")
 .select("*")
 .eq("is_active", true)
 .eq("template_type", "editorial_card")
 .order("sort_order", { ascending: true });

 return (rows || []) as HotpageDTO[];
 });

export const getHotpageBySlug = createServerFn({ method: "GET" })
 .validator(z.object({ slug: z.string() }))
 .handler(async ({ data: { slug } }): Promise<HotpageDTO | null> => {
 const supabase = getAnonServerClient();
 const { data, error } = await supabase
 .from("hotpages")
 .select("*")
 .eq("slug", slug)
 .eq("is_active", true)
 .single();

 if (error || !data) {
 return null;
 }

 return {
 ...data,
 show_title: data.show_title !== false,
 show_description: data.show_description !== false,
 show_overlay: data.show_overlay !== false,
 show_badge: data.show_badge !== false,
 } as HotpageDTO;
 });

export const saveUserPreferences = createServerFn({ method: "POST" })
 .validator(
 z.object({
 selected_niches: z.array(z.string()),
 default_city: z.string().optional(),
 onboarding_done: z.boolean().default(true),
 }),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const { getCurrentIdentity } = await import("@/services/cart-helpers");
 const identity = await getCurrentIdentity().catch(() => null);
 const userId = identity?.customer_id || null;

 if (userId) {
 const { error } = await supabase.from("user_preferences").upsert(
 {
 user_id: userId,
 selected_niches: data.selected_niches,
 default_city: data.default_city || "Global",
 onboarding_done: data.onboarding_done,
 updated_at: new Date().toISOString(),
 },
 { onConflict: "user_id" },
 );

 if (error) {
 console.error("[PREFERENCES] Falha ao salvar preferências no Supabase:", error);
 }
 }

 // 2. Alimenta o motor de afinidade preditiva para os nichos selecionados
 for (const niche of data.selected_niches) {
 if (niche !== "all") {
 try {
 await supabase.rpc("record_user_behavior_event", {
 p_user_id: userId,
 p_session_id: userId ? null : "anon_session",
 p_event_type: "search",
 p_entity_type: "product",
 p_entity_id: null,
 p_category_slug: niche,
 p_niche: niche,
 p_metadata: { source: "onboarding_picker", weight_boost: 10 },
 });
 } catch {
 // rpc telemetry optional
 }
 }
 }

 return { success: true };
 });

export const getUserPreferences = createServerFn({ method: "GET" }).handler(
 async (): Promise<{
 selected_niches: string[];
 default_city: string;
 onboarding_done: boolean;
 } | null> => {
 const supabase = getServerClient();
 const { getCurrentIdentity } = await import("@/services/cart-helpers");
 const identity = await getCurrentIdentity().catch(() => null);
 const userId = identity?.customer_id || null;

 if (!userId) return null;

 const { data, error } = await supabase
 .from("user_preferences")
 .select("*")
 .eq("user_id", userId)
 .limit(1)
 .maybeSingle();

 if (error || !data) return null;
 return {
 selected_niches: data.selected_niches || [],
 default_city: data.default_city || "Global",
 onboarding_done: !!data.onboarding_done,
 };
 },
);

export const createHotpage = createServerFn({ method: "POST" })
 .validator(
 z.object({
 slug: z.string().min(2),
 title: z.string().min(2),
 badge_label: z.string().nullable().optional(),
 hero_stat_badge: z.string().nullable().optional(),
 hero_secondary_badge: z.string().nullable().optional(),
 description: z.string().nullable().optional(),
 cover_image_url: z.string().nullable().optional(),
 icon_name: z.string().nullable().optional(),
 icon_url: z.string().nullable().optional(),
 custom_icon_url: z.string().nullable().optional(),
 target_route: z.string().nullable().optional(),
 bg_media_type: z.enum(["none", "image", "video", "gif"]).default("none"),
 bg_media_url: z.string().nullable().optional(),
 bg_color: z.string().nullable().optional(),
 bg_overlay_opacity: z.number().min(0).max(100).default(30),
 bg_texture: z.enum(["none", "noise", "dots", "grid", "mesh", "glass"]).default("none"),
 filter_rules: z.record(z.any()).optional(),
 module: HotpageModuleSchema.default("home"),
 template_type: z.enum([
 "hero_module",
 "category_hub",
 "editorial_card",
 "turbo",
 "hits",
 "bogo",
 "market",
 "travel",
 "services",
 "custom",
 ]).default("editorial_card"),
 sort_order: z.number().int().default(0),
 show_title: z.boolean().default(true),
 show_description: z.boolean().default(true),
 show_overlay: z.boolean().default(false),
 show_shadow: z.boolean().default(false),
 show_badge: z.boolean().default(true),
 text_color: z.string().nullable().optional(),
 }),
 )
 .handler(async ({ data }) => {
 await requireAdmin();
 const supabase = getServerClient();
 const sanitized = sanitizeHotpagePayload({
      slug: data.slug,
      title: data.title,
      template_type: data.template_type || "editorial_card",
      badge_label: data.badge_label || null,
      hero_stat_badge: data.hero_stat_badge || null,
      hero_secondary_badge: data.hero_secondary_badge || null,
      description: data.description || null,
      cover_image_url: data.cover_image_url || null,
      icon_name: data.icon_name || null,
      icon_url: data.icon_url || data.custom_icon_url || null,
      custom_icon_url: data.custom_icon_url || data.icon_url || null,
      target_route: data.target_route || null,
      bg_media_type: data.bg_media_type || "none",
      bg_media_url: data.bg_media_url || null,
      bg_color: data.bg_color || null,
      bg_overlay_opacity: data.bg_overlay_opacity ?? 30,
      bg_texture: data.bg_texture || "none",
      filter_rules: data.filter_rules || {},
      module: data.module || "home",
      sort_order: data.sort_order,
      show_title: data.show_title,
      show_description: data.show_description,
      show_overlay: data.show_overlay,
      show_shadow: data.show_shadow,
      show_badge: data.show_badge,
      text_color: data.text_color || null,
      is_active: true,
    });

    let { data: created, error } = await supabase
      .from("hotpages")
      .insert(sanitized)
      .select()
      .single();

    // Blindagem extrema: se o schema cache do PostgREST ainda não tiver a coluna física show_shadow ou text_color
    if (error && (error.message.includes("schema cache") || error.message.includes("show_shadow") || error.message.includes("text_color"))) {
      const { show_shadow, text_color, ...safePayload } = sanitized;
      const fallbackResult = await supabase
        .from("hotpages")
        .insert(safePayload)
        .select()
        .single();
      created = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (error) throw new Error(error.message);
    return mapHotpageDTO(created);
  });

export const updateHotpage = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      slug: z.string().min(2).optional(),
      title: z.string().min(2).optional(),
      badge_label: z.string().nullable().optional(),
      hero_stat_badge: z.string().nullable().optional(),
      hero_secondary_badge: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      cover_image_url: z.string().nullable().optional(),
      icon_name: z.string().nullable().optional(),
      icon_url: z.string().nullable().optional(),
      custom_icon_url: z.string().nullable().optional(),
      target_route: z.string().nullable().optional(),
      bg_media_type: z.enum(["none", "image", "video", "gif"]).optional(),
      bg_media_url: z.string().nullable().optional(),
      bg_color: z.string().nullable().optional(),
      bg_overlay_opacity: z.number().min(0).max(100).optional(),
      bg_texture: z.enum(["none", "noise", "dots", "grid", "mesh", "glass"]).optional(),
      filter_rules: z.record(z.any()).nullable().optional(),
      module: HotpageModuleSchema.optional(),
      template_type: z.enum([
        "hero_module",
        "category_hub",
        "editorial_card",
        "turbo",
        "hits",
        "bogo",
        "market",
        "travel",
        "services",
        "custom",
      ]).optional(),
      sort_order: z.number().int().optional(),
      show_title: z.boolean().optional(),
      show_description: z.boolean().optional(),
      show_overlay: z.boolean().optional(),
      show_shadow: z.boolean().optional(),
      show_badge: z.boolean().optional(),
      text_color: z.string().nullable().optional(),
      is_active: z.boolean().optional(),
    }),
  )
  .handler(async ({ data: { id, ...patch } }) => {
    await requireAdmin();
    const supabase = getServerClient();
    const sanitized = sanitizeHotpagePayload(patch);
    let { data: updated, error } = await supabase
      .from("hotpages")
      .update(sanitized)
      .eq("id", id)
      .select()
      .single();

    // Blindagem extrema: se o schema cache do PostgREST ainda não tiver a coluna física show_shadow ou text_color
    if (error && (error.message.includes("schema cache") || error.message.includes("show_shadow") || error.message.includes("text_color"))) {
      const { show_shadow, text_color, ...safePayload } = sanitized;
      const fallbackResult = await supabase
        .from("hotpages")
        .update(safePayload)
        .eq("id", id)
        .select()
        .single();
      updated = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (error) throw new Error(error.message);
    return mapHotpageDTO(updated);
  });

export const deleteHotpage = createServerFn({ method: "POST" })
 .validator(z.object({ id: z.string().uuid() }))
 .handler(async ({ data: { id } }) => {
 await requireAdmin();
 const supabase = getServerClient();
 const { error } = await supabase.from("hotpages").delete().eq("id", id);
 if (error) throw new Error(error.message);
 return { success: true };
 });

export const saveHotpage = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid().optional(),
 slug: z.string().min(2),
 title: z.string().min(2),
 badge_label: z.string().optional(),
 hero_stat_badge: z.string().optional(),
 hero_secondary_badge: z.string().optional(),
 description: z.string().optional(),
 cover_image_url: z.string().optional(),
 icon_name: z.string().optional(),
 icon_url: z.string().optional(),
 custom_icon_url: z.string().optional(),
 target_route: z.string().optional(),
 bg_media_type: z.enum(["none", "image", "video", "gif"]).optional(),
 bg_media_url: z.string().optional(),
 bg_color: z.string().optional(),
 bg_overlay_opacity: z.number().min(0).max(100).optional(),
 bg_texture: z.enum(["none", "noise", "dots", "grid", "mesh", "glass"]).optional(),
 filter_rules: z.record(z.any()).optional(),
 module: HotpageModuleSchema.optional(),
 template_type: z.enum([
 "hero_module",
 "category_hub",
 "editorial_card",
 "turbo",
 "hits",
 "bogo",
 "market",
 "travel",
 "services",
 "custom",
 ]).optional(),
 sort_order: z.number().int().default(0),
 show_title: z.boolean().default(true),
 show_description: z.boolean().default(true),
 show_overlay: z.boolean().default(true),
 show_badge: z.boolean().default(true),
 is_active: z.boolean().default(true),
 }),
 )
 .handler(async ({ data }) => {
 await requireAdmin();
 if (data.id) {
 return updateHotpage({ data: { id: data.id, ...data } });
 } else {
 return createHotpage({ data: { ...data, sort_order: data.sort_order ?? 0 } });
 }
 });

export const syncDefaultHotpages = createServerFn({ method: "POST" }).handler(
  async () => {
    await requireAdmin();
    const supabase = getServerClient();

    // ── 1. CARDS HERÓI DE MÓDULOS PRINCIPAIS (SEPARADOS E SEM FALLBACKS EXTERNOS) ──
    const CANONICAL_HERO_MODULES = [
    {
      slug: "home-places",
      title: "Places (Lista Telefônica)",
      cover_image_url: null,
      target_route: "/diretorio",
      template_type: "hero_module" as const,
      module: "home" as const,
      sort_order: 1,
      show_title: true,
      show_badge: false,
      show_overlay: true,
    },
    {
      slug: "home-classificados",
      title: "Classificados",
      cover_image_url: null,
      target_route: "/classificados",
      template_type: "hero_module" as const,
      module: "home" as const,
      sort_order: 2,
      show_title: true,
      show_badge: false,
      show_overlay: true,
    },
    {
      slug: "home-feed",
      title: "Feed",
      cover_image_url: null,
      target_route: "/feed",
      template_type: "hero_module" as const,
      module: "home" as const,
      sort_order: 3,
      show_title: true,
      show_badge: false,
      show_overlay: true,
    },
    {
      slug: "home-noticias",
      title: "Notícias",
      cover_image_url: null,
      target_route: "/noticias",
      template_type: "hero_module" as const,
      module: "home" as const,
      sort_order: 4,
      show_title: true,
      show_badge: false,
      show_overlay: true,
    },
    {
      slug: "home-empregos",
      title: "Empregos",
      cover_image_url: null,
      target_route: "/empregos",
      template_type: "hero_module" as const,
      module: "home" as const,
      sort_order: 5,
      show_title: true,
      show_badge: false,
      show_overlay: true,
    },
    {
      slug: "home-eventos",
      title: "Eventos",
      cover_image_url: null,
      target_route: "/eventos",
      template_type: "hero_module" as const,
      module: "home" as const,
      sort_order: 6,
      show_title: true,
      show_badge: false,
      show_overlay: true,
    },
    {
      slug: "home-agenda",
      title: "Agenda",
      cover_image_url: null,
      target_route: "/agenda",
      template_type: "hero_module" as const,
      module: "home" as const,
      sort_order: 7,
      show_title: true,
      show_badge: false,
      show_overlay: true,
    },
    {
      slug: "home-afiliados",
      title: "Afiliados",
      cover_image_url: null,
      target_route: "/afiliados",
      template_type: "hero_module" as const,
      module: "home" as const,
      sort_order: 8,
      show_title: true,
      show_badge: false,
      show_overlay: true,
    },
  ];


 // ── 2. BOTÕES / CHIPS DE SUPERCATEGORIAS (CONTINUAÇÃO - NÃO REPETE O TOPO) ──
 const CANONICAL_SUBCATEGORY_CHIPS = [
 {
 slug: "chip-farmacia",
 title: "Farmácia",
 target_route: "/farmacia",
 template_type: "category_hub" as const,
 module: "home" as const,
 icon_name: "Heartbeat",
 sort_order: 1,
 show_title: true,
 },
 {
 slug: "chip-bebidas",
 title: "Bebidas & Adega",
 target_route: "/bebidas",
 template_type: "category_hub" as const,
 module: "home" as const,
 icon_name: "Coffee",
 sort_order: 2,
 show_title: true,
 },
 {
 slug: "chip-acougue",
 title: "Açougue & Carnes",
 target_route: "/acougue",
 template_type: "category_hub" as const,
 module: "home" as const,
 icon_name: "Flame",
 sort_order: 3,
 show_title: true,
 },
 {
 slug: "chip-eletronicos",
 title: "Eletrônicos & Tech",
 target_route: "/eletronicos",
 template_type: "category_hub" as const,
 module: "home" as const,
 icon_name: "Storefront",
 sort_order: 4,
 show_title: true,
 },
 {
 slug: "chip-moda",
 title: "Roupas & Moda",
 target_route: "/moda",
 template_type: "category_hub" as const,
 module: "home" as const,
 icon_name: "TShirt",
 sort_order: 5,
 show_title: true,
 },
 {
 slug: "chip-casa",
 title: "Casa & Decoração",
 target_route: "/casa",
 template_type: "category_hub" as const,
 module: "home" as const,
 icon_name: "Storefront",
 sort_order: 6,
 show_title: true,
 },
 {
 slug: "chip-pet",
 title: "Pet Shop & Veterinária",
 target_route: "/pet",
 template_type: "category_hub" as const,
 module: "home" as const,
 icon_name: "Heartbeat",
 sort_order: 7,
 show_title: true,
 },
 {
 slug: "chip-beleza",
 title: "Beleza & Estética",
 target_route: "/beleza",
 template_type: "category_hub" as const,
 module: "home" as const,
 icon_name: "Scissors",
 sort_order: 8,
 show_title: true,
 },
 {
 slug: "chip-construcao",
 title: "Construção & Reforma",
 target_route: "/construcao",
 template_type: "category_hub" as const,
 module: "home" as const,
 icon_name: "Storefront",
 sort_order: 9,
 show_title: true,
 },
 {
 slug: "chip-servicos",
 title: "Serviços & Profissionais",
 target_route: "/servicos",
 template_type: "category_hub" as const,
 module: "home" as const,
 icon_name: "Briefcase",
 sort_order: 10,
 show_title: true,
 },
 {
 slug: "chip-imoveis",
 title: "Imóveis & Locação",
 target_route: "/imoveis",
 template_type: "category_hub" as const,
 module: "home" as const,
 icon_name: "House",
 sort_order: 11,
 show_title: true,
 },
 {
 slug: "chip-doacoes",
 title: "Doações & Solidariedade",
 target_route: "/doacoes",
 template_type: "category_hub" as const,
 module: "home" as const,
 icon_name: "Heartbeat",
 sort_order: 12,
 show_title: true,
 },
 {
 slug: "chip-diretorio",
 title: "Diretório Comercial",
 target_route: "/diretorio",
 template_type: "category_hub" as const,
 module: "home" as const,
 icon_name: "Compass",
 sort_order: 13,
 show_title: true,
 },
 ];

 // ── 3. COLEÇÕES & HOTPAGES EDITORIAIS (HOTPAGES RAIL) ──
 const CANONICAL_EDITORIAL_HOTPAGES = [
 {
 slug: "ofertas-relampago",
 title: "Ofertas Relâmpago",
 badge_label: "OFERTAS",
 hero_stat_badge: "ATÉ 60% OFF",
 cover_image_url: null,
 target_route: "/ofertas",
 template_type: "editorial_card" as const,
 module: "home" as const,
 sort_order: 1,
 show_title: true,
 show_badge: true,
 show_overlay: true,
 },
 {
 slug: "almoco-executivo",
 title: "Almoço Rápido & Pratos Executivos",
 badge_label: "SABOR",
 hero_stat_badge: "DELIVERY",
 cover_image_url: null,
 target_route: "/gastronomia",
 template_type: "editorial_card" as const,
 module: "home" as const,
 sort_order: 2,
 show_title: true,
 show_badge: true,
 show_overlay: true,
 },
 {
 slug: "supermercado-express",
 title: "Supermercado em 15 Minutos",
 badge_label: "ESSENCIAL",
 hero_stat_badge: "EXPRESS",
 cover_image_url: null,
 target_route: "/mercado",
 template_type: "editorial_card" as const,
 module: "home" as const,
 sort_order: 3,
 show_title: true,
 show_badge: true,
 show_overlay: true,
 },
 ];

 const ALL_ITEMS = [
 ...CANONICAL_HERO_MODULES,
 ...CANONICAL_SUBCATEGORY_CHIPS,
 ...CANONICAL_EDITORIAL_HOTPAGES,
 ];

 let insertedCount = 0;
 for (const item of ALL_ITEMS) {
 const { data: existing } = await supabase
 .from("hotpages")
 .select("id, cover_image_url, custom_icon_url")
 .eq("slug", item.slug)
 .maybeSingle();

 if (!existing) {
 await supabase.from("hotpages").insert({
 ...item,
 is_active: true,
 });
 insertedCount++;
 } else {
 // Atualiza campos sem sobrescrever uploads personalizados
 await supabase
 .from("hotpages")
 .update({
 template_type: item.template_type,
 target_route: item.target_route,
 show_title: (item as any).show_title ?? false,
 show_badge: (item as any).show_badge ?? false,
 show_overlay: (item as any).show_overlay ?? false,
 sort_order: item.sort_order,
 })
 .eq("id", existing.id);
 }
 }

 return { success: true, insertedCount };
 }
);

