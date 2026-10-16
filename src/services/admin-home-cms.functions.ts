import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient, getAnonServerClient } from "@/lib/supabase";
import { getUserSession } from "@/services/auth.functions";

export type HomeLayoutVariant = "carousel" | "bento_grid" | "horizontal_scroll" | "grid_2d" | "native_dock";
export type HomeAspectRatio = "ifood" | "16:9" | "4:3" | "1:1" | "auto";

export interface HomeSectionItemDTO {
  id: string;
  section_id: string;
  title?: string | null;
  subtitle?: string | null;
  image_url: string;
  target_url: string;
  show_text: boolean;
  grid_span_x: number;
  grid_span_y: number;
  badge_text?: string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface HomePageSectionDTO {
  id: string;
  section_key: string;
  title?: string | null;
  subtitle?: string | null;
  show_title: boolean;
  show_subtitle: boolean;
  layout_variant: HomeLayoutVariant;
  aspect_ratio: HomeAspectRatio;
  is_active: boolean;
  sort_order: number;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
  items: HomeSectionItemDTO[];
}

export interface NormalizedShowcasePost {
  id: string;
  title: string;
  summary: string;
  coverUrl: string;
  category: string;
  publishedAt: string;
  targetUrl: string;
  authorName?: string;
  authorHandle?: string;
  authorAvatar?: string | null;
  isVerified?: boolean;
  likesCount?: number;
  commentsCount?: number;
}


export const CANONICAL_EDITORIAL_FALLBACKS = [
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80",
];

export function isHealthyImageUrl(url: unknown): boolean {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  if (
    !trimmed ||
    trimmed === "undefined" ||
    trimmed === "null" ||
    trimmed === "[object Object]" ||
    trimmed.length < 5
  ) {
    return false;
  }
  return trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/");
}

export function resolveHealthyCover(url: unknown, indexFallback = 0): string {
  if (isHealthyImageUrl(url)) {
    return (url as string).trim();
  }
  const idx = Math.abs(indexFallback) % CANONICAL_EDITORIAL_FALLBACKS.length;
  return CANONICAL_EDITORIAL_FALLBACKS[idx];
}

// ── Canônicos Padrão em Memória (Zero Downtime Fallback) ──
export const CANONICAL_DEFAULT_HOME_SECTIONS: HomePageSectionDTO[] = [
  {
    id: "canonical-hero-banners",
    section_key: "hero_banners",
    title: "Destaques Principais",
    subtitle: "Ofertas e novidades da sua cidade",
    show_title: false,
    show_subtitle: false,
    layout_variant: "carousel",
    aspect_ratio: "16:9",
    is_active: true,
    sort_order: 1,
    metadata: {},
    items: [
      {
        id: "item-hero-1",
        section_id: "canonical-hero-banners",
        title: "Tudo para o seu dia a dia no Waesy",
        subtitle: "Comércio, serviços e entregas locais",
        image_url: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
        target_url: "/marketplace",
        show_text: false,
        grid_span_x: 2,
        grid_span_y: 1,
        badge_text: "Destaque",
        is_active: true,
        sort_order: 1,
      },
      {
        id: "item-hero-2",
        section_id: "canonical-hero-banners",
        title: "Gastronomia & Restaurantes",
        subtitle: "Peça dos melhores estabelecimentos da região",
        image_url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
        target_url: "/marketplace?category=gastronomia",
        show_text: false,
        grid_span_x: 2,
        grid_span_y: 1,
        badge_text: "Delivery",
        is_active: true,
        sort_order: 2,
      },
    ],
  },
  {
    id: "canonical-quick-categories",
    section_key: "quick_categories_ifood",
    title: "Categorias Rápidas",
    subtitle: "Navegação por nichos e utilidades",
    show_title: false,
    show_subtitle: false,
    layout_variant: "horizontal_scroll",
    aspect_ratio: "1:1",
    is_active: true,
    sort_order: 2,
    metadata: {},
    items: [
      {
        id: "item-cat-1",
        section_id: "canonical-quick-categories",
        title: "Restaurantes",
        subtitle: null,
        image_url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=240&q=80",
        target_url: "/marketplace?category=gastronomia",
        show_text: true,
        grid_span_x: 1,
        grid_span_y: 1,
        badge_text: null,
        is_active: true,
        sort_order: 1,
      },
      {
        id: "item-cat-2",
        section_id: "canonical-quick-categories",
        title: "Mercados",
        subtitle: null,
        image_url: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=240&q=80",
        target_url: "/marketplace?category=mercado",
        show_text: true,
        grid_span_x: 1,
        grid_span_y: 1,
        badge_text: null,
        is_active: true,
        sort_order: 2,
      },
      {
        id: "item-cat-3",
        section_id: "canonical-quick-categories",
        title: "Farmácias",
        subtitle: null,
        image_url: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=240&q=80",
        target_url: "/diretorio?category=farmacia",
        show_text: true,
        grid_span_x: 1,
        grid_span_y: 1,
        badge_text: null,
        is_active: true,
        sort_order: 3,
      },
      {
        id: "item-cat-4",
        section_id: "canonical-quick-categories",
        title: "Bebidas",
        subtitle: null,
        image_url: "https://images.unsplash.com/photo-1527061011665-3652c757a4d4?auto=format&fit=crop&w=240&q=80",
        target_url: "/marketplace?category=bebidas",
        show_text: true,
        grid_span_x: 1,
        grid_span_y: 1,
        badge_text: null,
        is_active: true,
        sort_order: 4,
      },
      {
        id: "item-cat-5",
        section_id: "canonical-quick-categories",
        title: "Mobilidade",
        subtitle: null,
        image_url: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=240&q=80",
        target_url: "/mobilidade",
        show_text: true,
        grid_span_x: 1,
        grid_span_y: 1,
        badge_text: "Go",
        is_active: true,
        sort_order: 5,
      },
      {
        id: "item-cat-6",
        section_id: "canonical-quick-categories",
        title: "Pet Shop",
        subtitle: null,
        image_url: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=240&q=80",
        target_url: "/marketplace?category=pet",
        show_text: true,
        grid_span_x: 1,
        grid_span_y: 1,
        badge_text: null,
        is_active: true,
        sort_order: 6,
      },
      {
        id: "item-cat-7",
        section_id: "canonical-quick-categories",
        title: "Classificados",
        subtitle: null,
        image_url: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=240&q=80",
        target_url: "/classificados",
        show_text: true,
        grid_span_x: 1,
        grid_span_y: 1,
        badge_text: null,
        is_active: true,
        sort_order: 7,
      },
      {
        id: "item-cat-8",
        section_id: "canonical-quick-categories",
        title: "Lugares",
        subtitle: null,
        image_url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=240&q=80",
        target_url: "/diretorio",
        show_text: true,
        grid_span_x: 1,
        grid_span_y: 1,
        badge_text: null,
        is_active: true,
        sort_order: 8,
      },
    ],
  },
  {
    id: "canonical-hotpages-grid",
    section_key: "hotpages_grid",
    title: "Hotpages em Destaque",
    subtitle: "Páginas temáticas exclusivas",
    show_title: false,
    show_subtitle: false,
    layout_variant: "bento_grid",
    aspect_ratio: "16:9",
    is_active: true,
    sort_order: 3,
    metadata: {},
    items: [
      {
        id: "item-hot-1",
        section_id: "canonical-hotpages-grid",
        title: "Guia Gastronômico da Cidade",
        subtitle: "Roteiro dos melhores sabores",
        image_url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
        target_url: "/gastronomia",
        show_text: false,
        grid_span_x: 2,
        grid_span_y: 2,
        badge_text: "Especial",
        is_active: true,
        sort_order: 1,
      },
      {
        id: "item-hot-2",
        section_id: "canonical-hotpages-grid",
        title: "Ofertas da Semana",
        subtitle: "Descontos imperdíveis",
        image_url: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=600&q=80",
        target_url: "/marketplace?has_discount=true",
        show_text: false,
        grid_span_x: 1,
        grid_span_y: 1,
        badge_text: "Ofertas",
        is_active: true,
        sort_order: 2,
      },
      {
        id: "item-hot-3",
        section_id: "canonical-hotpages-grid",
        title: "Serviços & Especialistas",
        subtitle: "Profissionais avaliados",
        image_url: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=600&q=80",
        target_url: "/servicos",
        show_text: false,
        grid_span_x: 1,
        grid_span_y: 1,
        badge_text: "Serviços",
        is_active: true,
        sort_order: 3,
      },
    ],
  },
  {
    id: "canonical-marketplace-categories",
    section_key: "marketplace_categories",
    title: "Classificados e Negócios",
    subtitle: "Categorias comerciais",
    show_title: false,
    show_subtitle: false,
    layout_variant: "grid_2d",
    aspect_ratio: "1:1",
    is_active: true,
    sort_order: 4,
    metadata: {},
    items: [
      {
        id: "item-mkt-1",
        section_id: "canonical-marketplace-categories",
        title: "Veículos e Autos",
        subtitle: null,
        image_url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=240&q=80",
        target_url: "/classificados?category=veiculos",
        show_text: true,
        grid_span_x: 1,
        grid_span_y: 1,
        badge_text: null,
        is_active: true,
        sort_order: 1,
      },
      {
        id: "item-mkt-2",
        section_id: "canonical-marketplace-categories",
        title: "Imóveis & Aluguel",
        subtitle: null,
        image_url: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=240&q=80",
        target_url: "/classificados?category=imoveis",
        show_text: true,
        grid_span_x: 1,
        grid_span_y: 1,
        badge_text: null,
        is_active: true,
        sort_order: 2,
      },
      {
        id: "item-mkt-3",
        section_id: "canonical-marketplace-categories",
        title: "Eletrônicos & Celulares",
        subtitle: null,
        image_url: "https://images.unsplash.com/photo-1511707171634-5f897ff02560?auto=format&fit=crop&w=240&q=80",
        target_url: "/classificados?category=eletronicos",
        show_text: true,
        grid_span_x: 1,
        grid_span_y: 1,
        badge_text: null,
        is_active: true,
        sort_order: 3,
      },
      {
        id: "item-mkt-4",
        section_id: "canonical-marketplace-categories",
        title: "Moda & Acessórios",
        subtitle: null,
        image_url: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=240&q=80",
        target_url: "/marketplace?category=moda",
        show_text: true,
        grid_span_x: 1,
        grid_span_y: 1,
        badge_text: null,
        is_active: true,
        sort_order: 4,
      },
    ],
  },
  {
    id: "canonical-social-posts",
    section_key: "social_posts_vitrine",
    title: "Feed da Cidade",
    subtitle: "Publicações e acontecimentos locais",
    show_title: true,
    show_subtitle: false,
    layout_variant: "carousel",
    aspect_ratio: "4:3",
    is_active: true,
    sort_order: 5,
    metadata: {},
    items: [],
  },
];

// ── 1. LISTAGEM PÚBLICA DE SEÇÕES PARA A VITRINE HOME ──
export const listPublicHomePageSections = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        city: z.string().optional(),
      })
      .optional(),
  )
  .handler(async ({ data: input }): Promise<HomePageSectionDTO[]> => {
    try {
      const { city } = input || {};
      const supabase = getAnonServerClient();

      const { data: dbSections, error: secErr } = await supabase
        .from("home_page_sections")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (secErr || !dbSections || dbSections.length === 0) {
        return CANONICAL_DEFAULT_HOME_SECTIONS;
      }

      const sectionIds = dbSections.map((s) => s.id);
      const { data: dbItems } = await supabase
        .from("home_section_items")
        .select("*")
        .in("section_id", sectionIds)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      const itemsMap = new Map<string, HomeSectionItemDTO[]>();
      (dbItems || []).forEach((item: any) => {
        const list = itemsMap.get(item.section_id) || [];
        list.push({
          id: item.id,
          section_id: item.section_id,
          title: item.title,
          subtitle: item.subtitle,
          image_url: item.image_url,
          target_url: item.target_url || "/",
          show_text: item.show_text ?? false,
          grid_span_x: item.grid_span_x || 1,
          grid_span_y: item.grid_span_y || 1,
          badge_text: item.badge_text,
          is_active: item.is_active !== false,
          sort_order: item.sort_order ?? 0,
          created_at: item.created_at,
          updated_at: item.updated_at,
        });
        itemsMap.set(item.section_id, list);
      });

      return dbSections.map((sec) => ({
        id: sec.id,
        section_key: sec.section_key,
        title: sec.title,
        subtitle: sec.subtitle,
        show_title: sec.show_title ?? false,
        show_subtitle: sec.show_subtitle ?? false,
        layout_variant: sec.layout_variant as HomeLayoutVariant,
        aspect_ratio: sec.aspect_ratio as HomeAspectRatio,
        is_active: sec.is_active !== false,
        sort_order: sec.sort_order ?? 0,
        metadata: sec.metadata || {},
        created_at: sec.created_at,
        updated_at: sec.updated_at,
        items: itemsMap.get(sec.id) || [],
      }));
    } catch (err) {
      console.warn("[listPublicHomePageSections] Fallback ativado:", err);
      return CANONICAL_DEFAULT_HOME_SECTIONS;
    }
  });

// ── 2. LISTAGEM ADMINISTRATIVA DE SEÇÕES COM TODOS OS ITENS ──
export const listAdminHomePageSections = createServerFn({ method: "GET" })
  .validator(z.object({}).optional())
  .handler(async (): Promise<HomePageSectionDTO[]> => {
    try {
      const supabase = getServerClient();

      const { data: dbSections, error: secErr } = await supabase
        .from("home_page_sections")
        .select("*")
        .order("sort_order", { ascending: true });

      if (secErr || !dbSections || dbSections.length === 0) {
        return CANONICAL_DEFAULT_HOME_SECTIONS;
      }

      const sectionIds = dbSections.map((s) => s.id);
      const { data: dbItems } = await supabase
        .from("home_section_items")
        .select("*")
        .in("section_id", sectionIds)
        .order("sort_order", { ascending: true });

      const itemsMap = new Map<string, HomeSectionItemDTO[]>();
      (dbItems || []).forEach((item: any) => {
        const list = itemsMap.get(item.section_id) || [];
        list.push({
          id: item.id,
          section_id: item.section_id,
          title: item.title,
          subtitle: item.subtitle,
          image_url: item.image_url,
          target_url: item.target_url || "/",
          show_text: item.show_text ?? false,
          grid_span_x: item.grid_span_x || 1,
          grid_span_y: item.grid_span_y || 1,
          badge_text: item.badge_text,
          is_active: item.is_active !== false,
          sort_order: item.sort_order ?? 0,
          created_at: item.created_at,
          updated_at: item.updated_at,
        });
        itemsMap.set(item.section_id, list);
      });

      return dbSections.map((sec) => ({
        id: sec.id,
        section_key: sec.section_key,
        title: sec.title,
        subtitle: sec.subtitle,
        show_title: sec.show_title ?? false,
        show_subtitle: sec.show_subtitle ?? false,
        layout_variant: sec.layout_variant as HomeLayoutVariant,
        aspect_ratio: sec.aspect_ratio as HomeAspectRatio,
        is_active: sec.is_active !== false,
        sort_order: sec.sort_order ?? 0,
        metadata: sec.metadata || {},
        created_at: sec.created_at,
        updated_at: sec.updated_at,
        items: itemsMap.get(sec.id) || [],
      }));
    } catch (err) {
      console.warn("[listAdminHomePageSections] Erro:", err);
      return CANONICAL_DEFAULT_HOME_SECTIONS;
    }
  });

// ── 3. UPSERT DE SEÇÃO DA HOME ──
const UpsertSectionSchema = z.object({
  id: z.string().optional(),
  section_key: z.string().min(2),
  title: z.string().optional().nullable(),
  subtitle: z.string().optional().nullable(),
  show_title: z.boolean().default(false),
  show_subtitle: z.boolean().default(false),
  layout_variant: z.enum(["carousel", "bento_grid", "horizontal_scroll", "grid_2d", "native_dock"]).default("carousel"),
  aspect_ratio: z.enum(["ifood", "16:9", "4:3", "1:1", "auto"]).default("ifood"),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
  metadata: z.record(z.any()).optional().nullable(),
});

export const upsertHomePageSection = createServerFn({ method: "POST" })
  .validator(UpsertSectionSchema)
  .handler(async ({ data: payload }) => {
    const supabase = getServerClient();
    const session = await getUserSession();
    if (!session) {
      throw new Error("Não autenticado.");
    }

    const {
      id,
      section_key,
      title,
      subtitle,
      show_title,
      show_subtitle,
      layout_variant,
      aspect_ratio,
      is_active,
      sort_order,
      metadata,
    } = payload;

    const row: any = {
      section_key,
      title: title || null,
      subtitle: subtitle || null,
      show_title: Boolean(show_title),
      show_subtitle: Boolean(show_subtitle),
      layout_variant,
      aspect_ratio,
      is_active: Boolean(is_active),
      sort_order: Number(sort_order) || 0,
      metadata: metadata || {},
      updated_at: new Date().toISOString(),
    };

    if (id) {
      const { data, error } = await supabase
        .from("home_page_sections")
        .update(row)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from("home_page_sections")
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  });

// ── 4. DELETE DE SEÇÃO DA HOME ──
export const deleteHomePageSection = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data: { id } }) => {
    const supabase = getServerClient();
    const session = await getUserSession();
    if (!session) throw new Error("Não autenticado.");

    const { error } = await supabase.from("home_page_sections").delete().eq("id", id);
    if (error) throw error;
    return { success: true };
  });

// ── 5. UPSERT DE ITEM DE SEÇÃO (CARD / BANNER / BOTÃO) ──
const UpsertItemSchema = z.object({
  id: z.string().optional(),
  section_id: z.string().min(1),
  title: z.string().optional().nullable(),
  subtitle: z.string().optional().nullable(),
  image_url: z.string().min(1, "URL da imagem é obrigatória"),
  target_url: z.string().default("/"),
  show_text: z.boolean().default(false),
  grid_span_x: z.number().int().min(1).max(6).default(1),
  grid_span_y: z.number().int().min(1).max(4).default(1),
  badge_text: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

export const upsertHomeSectionItem = createServerFn({ method: "POST" })
  .validator(UpsertItemSchema)
  .handler(async ({ data: payload }) => {
    const supabase = getServerClient();
    const session = await getUserSession();
    if (!session) throw new Error("Não autenticado.");

    const {
      id,
      section_id,
      title,
      subtitle,
      image_url,
      target_url,
      show_text,
      grid_span_x,
      grid_span_y,
      badge_text,
      is_active,
      sort_order,
    } = payload;

    const row: any = {
      section_id,
      title: title || null,
      subtitle: subtitle || null,
      image_url,
      target_url: target_url || "/",
      show_text: Boolean(show_text),
      grid_span_x: Number(grid_span_x) || 1,
      grid_span_y: Number(grid_span_y) || 1,
      badge_text: badge_text || null,
      is_active: Boolean(is_active),
      sort_order: Number(sort_order) || 0,
      updated_at: new Date().toISOString(),
    };

    if (id) {
      const { data, error } = await supabase
        .from("home_section_items")
        .update(row)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from("home_section_items")
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  });

// ── 6. DELETE DE ITEM DE SEÇÃO ──
export const deleteHomeSectionItem = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data: { id } }) => {
    const supabase = getServerClient();
    const session = await getUserSession();
    if (!session) throw new Error("Não autenticado.");

    const { error } = await supabase.from("home_section_items").delete().eq("id", id);
    if (error) throw error;
    return { success: true };
  });

// ── 7. REORDENAÇÃO EM LOTE DE SEÇÕES ──
export const reorderHomeSections = createServerFn({ method: "POST" })
  .validator(z.object({ sectionIds: z.array(z.string()) }))
  .handler(async ({ data: { sectionIds } }) => {
    const supabase = getServerClient();
    const session = await getUserSession();
    if (!session) throw new Error("Não autenticado.");

    for (let index = 0; index < sectionIds.length; index++) {
      await supabase
        .from("home_page_sections")
        .update({ sort_order: index, updated_at: new Date().toISOString() })
        .eq("id", sectionIds[index]);
    }
    return { success: true };
  });

// ── 8. REORDENAÇÃO EM LOTE DE ITENS ──
export const reorderHomeSectionItems = createServerFn({ method: "POST" })
  .validator(z.object({ itemIds: z.array(z.string()) }))
  .handler(async ({ data: { itemIds } }) => {
    const supabase = getServerClient();
    const session = await getUserSession();
    if (!session) throw new Error("Não autenticado.");

    for (let index = 0; index < itemIds.length; index++) {
      await supabase
        .from("home_section_items")
        .update({ sort_order: index, updated_at: new Date().toISOString() })
        .eq("id", itemIds[index]);
    }
    return { success: true };
  });

// ── 9. CONSULTA UNIFICADA E NORMALIZADA DE POSTS PARA VITRINE SOCIAL (ANTI-BROKEN IMAGE) ──
export const getUnifiedShowcasePosts = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        limit: z.number().int().min(1).max(30).default(12),
        city: z.string().optional(),
      })
      .optional(),
  )
  .handler(async ({ data: input }): Promise<NormalizedShowcasePost[]> => {
    const supabase = getAnonServerClient();
    const { limit = 12, city } = input || {};

    const normalizedList: NormalizedShowcasePost[] = [];

    try {
      // 1. Busca posts ativos com profiles e stores
      let postsQuery = supabase
        .from("posts")
        .select(`
          id, content_text, media_urls, created_at, post_type, city,
          publish_as_handle,
          profiles!posts_author_profile_id_fkey(full_name, avatar_url, username),
          stores(name)
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (city && city.trim().length > 0) {
        postsQuery = postsQuery.ilike("city", `%${city.trim()}%`);
      }

      const { data: postsData } = await postsQuery;

      // 1.1 Batch: likes e comentários para alimentar contadores de engajamento (Invariante B.30)
      const postIds = (postsData || []).map((p: any) => p.id).filter(Boolean);
      const likeCountMap = new Map<string, number>();
      const commentCountMap = new Map<string, number>();

      if (postIds.length > 0) {
        try {
          const { data: likeRows } = await supabase
            .from("post_likes")
            .select("post_id")
            .in("post_id", postIds);
          (likeRows || []).forEach((row: any) => {
            likeCountMap.set(row.post_id, (likeCountMap.get(row.post_id) ?? 0) + 1);
          });
        } catch {
          // safe fallback
        }

        try {
          const { data: commentRows } = await supabase
            .from("post_comments")
            .select("post_id")
            .in("post_id", postIds)
            .eq("status", "active");
          (commentRows || []).forEach((row: any) => {
            commentCountMap.set(row.post_id, (commentCountMap.get(row.post_id) ?? 0) + 1);
          });
        } catch {
          // safe fallback
        }
      }

      if (postsData && Array.isArray(postsData)) {
        postsData.forEach((p: any, idx: number) => {
          const rawMedia = Array.isArray(p.media_urls) ? p.media_urls[0] : null;
          const cover = resolveHealthyCover(rawMedia, idx);
          const rawText = p.content_text || "Acontecimentos e destaques da comunidade local";
          const cleanText = rawText
            .replace(/==([^=]+)==/g, "$1")
            .replace(/\*\*([^*]+)\*\*/g, "$1")
            .replace(/__([^_]+)__/g, "$1")
            .trim();

          const author = p.profiles?.full_name || p.stores?.name || "Membro local";
          const handle = p.publish_as_handle
            ? (p.publish_as_handle.startsWith("@") ? p.publish_as_handle : `@${p.publish_as_handle}`)
            : p.profiles?.username
              ? `@${p.profiles.username}`
              : p.stores?.name
                ? `@${p.stores.name.toLowerCase().replace(/\s+/g, "")}`
                : "@comunidade";
          const avatar = isHealthyImageUrl(p.profiles?.avatar_url) ? p.profiles.avatar_url : null;

          normalizedList.push({
            id: `post-${p.id}`,
            title: cleanText.slice(0, 90) + (cleanText.length > 90 ? "..." : ""),
            summary: cleanText,
            coverUrl: cover,
            category: p.post_type === "moment" ? "Momento" : p.post_type === "news" ? "Notícia" : "Comunidade",
            publishedAt: p.created_at || new Date().toISOString(),
            targetUrl: `/feed?postId=${p.id}`,
            authorName: author,
            authorHandle: handle,
            authorAvatar: avatar,
            isVerified: Boolean(p.stores?.name),
            likesCount: likeCountMap.get(p.id) ?? 0,
            commentsCount: commentCountMap.get(p.id) ?? 0,
          });
        });
      }

      // 2. Se a lista for inferior a 4 itens, complementa com notícias publicadas
      if (normalizedList.length < 4) {
        let articlesQuery = supabase
          .from("news_articles")
          .select("id, slug, title, summary, cover_media_url, category, published_at, city")
          .eq("status", "published")
          .order("published_at", { ascending: false })
          .limit(6);

        if (city && city.trim().length > 0) {
          articlesQuery = articlesQuery.ilike("city", `%${city.trim()}%`);
        }

        const { data: articlesData } = await articlesQuery;

        if (articlesData && Array.isArray(articlesData)) {
          articlesData.forEach((art: any, idx: number) => {
            const cover = resolveHealthyCover(art.cover_media_url, idx + 10);
            normalizedList.push({
              id: `article-${art.id}`,
              title: art.title,
              summary: art.summary || art.title,
              coverUrl: cover,
              category: art.category || "Notícia",
              publishedAt: art.published_at || new Date().toISOString(),
              targetUrl: `/noticias/${art.slug || art.id}`,
              authorName: "Redação Local",
              authorHandle: "@redacaolocal",
              authorAvatar: null,
              isVerified: true,
              likesCount: 5 + (idx % 7),
              commentsCount: 2 + (idx % 4),
            });
          });
        }
      }

      // 3. Se ainda assim estiver vazio (banco zerado), aplica cards editoriais padrão da cidade
      if (normalizedList.length === 0) {
        return [
          {
            id: "editorial-demo-1",
            title: "Descobertas e novidades do comércio regional",
            summary: "Acompanhe as atualizações das lojas e estabelecimentos parceiros.",
            coverUrl: CANONICAL_EDITORIAL_FALLBACKS[0],
            category: "Destaque",
            publishedAt: new Date().toISOString(),
            targetUrl: "/feed",
            authorName: "Waesy Comunidade",
            authorHandle: "@waesycomunidade",
            authorAvatar: null,
            isVerified: true,
            likesCount: 14,
            commentsCount: 3,
          },
          {
            id: "editorial-demo-2",
            title: "Gastronomia e cultura local em movimento",
            summary: "Conheça novos pratos e experiências disponíveis na sua cidade.",
            coverUrl: CANONICAL_EDITORIAL_FALLBACKS[1],
            category: "Gastronomia",
            publishedAt: new Date().toISOString(),
            targetUrl: "/gastronomia",
            authorName: "Guia Gastronômico",
            authorHandle: "@guiagastronomico",
            authorAvatar: null,
            isVerified: true,
            likesCount: 28,
            commentsCount: 6,
          },
          {
            id: "editorial-demo-3",
            title: "Empreendimentos e serviços inovadores",
            summary: "Conectando profissionais e clientes com agilidade.",
            coverUrl: CANONICAL_EDITORIAL_FALLBACKS[2],
            category: "Negócios",
            publishedAt: new Date().toISOString(),
            targetUrl: "/diretorio",
            authorName: "Waesy Negócios",
            authorHandle: "@waesynegocios",
            authorAvatar: null,
            isVerified: true,
            likesCount: 19,
            commentsCount: 4,
          },
        ];
      }

      return normalizedList.slice(0, limit);
    } catch (err) {
      console.warn("[getUnifiedShowcasePosts] Erro:", err);
      return [];
    }
  });
