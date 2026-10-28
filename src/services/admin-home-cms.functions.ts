import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient, getAnonServerClient } from "@/lib/supabase";
import { getUserSession } from "@/services/auth.functions";
import { resolveCityNewsCover } from "@/lib/news/city-editorial-images";

export type HomeLayoutVariant =
  | "carousel"
  | "bento_grid"
  | "horizontal_scroll"
  | "grid_2d"
  | "native_dock"
  | "cards_action_grid"
  | "slim_slider"
  | "custom_buttons";

export type HomeAspectRatio =
  | "slim_desktop"
  | "ifood"
  | "16:9"
  | "4:3"
  | "1:1"
  | "4:5"
  | "9:16"
  | "auto";

export interface HomeSectionItemDTO {
  id: string;
  section_id: string;
  title?: string | null;
  subtitle?: string | null;
  image_url?: string | null;
  image_mobile_url?: string | null;
  image_desktop_url?: string | null;
  target_url: string;
  show_text: boolean;
  grid_span_x: number;
  grid_span_y: number;
  badge_text?: string | null;
  bg_color?: string | null;
  text_color?: string | null;
  icon_name?: string | null;
  button_shape?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
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
  city_filter?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  auto_archive_at?: string | null;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
  items: HomeSectionItemDTO[];
}

export interface NormalizedShowcasePost {
  id: string;
  title: string;
  summary: string;
  coverUrl: string | null;
  mediaUrls?: string[];
  postType?: string;
  layoutStyle?: "trilho_horizontal" | "carrossel_unico" | "panoramico" | "grid";
  locationName?: string | null;
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


export const CANONICAL_EDITORIAL_FALLBACKS: string[] = [];

export function isHealthyImageUrl(url: unknown): boolean {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  if (
    !trimmed ||
    trimmed === "undefined" ||
    trimmed === "null" ||
    trimmed === "[object Object]" ||
    trimmed.length < 5 ||
    trimmed.includes("1511707171634-5f897ff02560")
  ) {
    return false;
  }
  return trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/");
}

export function resolveHealthyCover(url: unknown, _indexFallback = 0): string | null {
  if (isHealthyImageUrl(url)) {
    const trimmed = (url as string).trim();
    if (trimmed.includes("images.unsplash.com") || trimmed.includes("unsplash.com")) {
      return null;
    }
    return trimmed;
  }
  return null;
}

// ── Canônicos Padrão em Memória (Zero Downtime Fallback & Governança Unificada CMS) ──
export const CANONICAL_DEFAULT_HOME_SECTIONS: HomePageSectionDTO[] = [
  // ── SEÇÕES ATIVAS POR PADRÃO (NOVO DESIGN CANÔNICO SUPERAPP / iFOOD) ──
  {
    id: "canonical-promo-coupon-banner",
    section_key: "promo_coupon_banner",
    title: "Você ganhou 2 meses grátis em cupons!",
    subtitle: "Faixa promocional de benefícios e cupons no topo",
    show_title: true,
    show_subtitle: false,
    layout_variant: "slim_slider",
    aspect_ratio: "auto",
    is_active: true,
    sort_order: 1,
    metadata: { category: "ifood_core" },
    items: [],
  },
  {
    id: "canonical-quick-categories",
    section_key: "quick_categories_ifood",
    title: "Categorias Principais (Grade 5x2 iFood)",
    subtitle: "Navegação rápida por nichos e serviços urbanos",
    show_title: false,
    show_subtitle: false,
    layout_variant: "grid_2d",
    aspect_ratio: "1:1",
    is_active: true,
    sort_order: 2,
    metadata: { category: "ifood_core" },
    items: [
      {
        id: "item-cat-1",
        section_id: "canonical-quick-categories",
        title: "Restaurantes",
        subtitle: null,
        image_url: null,
        target_url: "/gastronomia",
        show_text: true,
        grid_span_x: 1,
        grid_span_y: 1,
        badge_text: null,
        icon_name: "Hamburger",
        is_active: true,
        sort_order: 1,
      },
      {
        id: "item-cat-2",
        section_id: "canonical-quick-categories",
        title: "Mercados",
        subtitle: null,
        image_url: null,
        target_url: "/mercado",
        show_text: true,
        grid_span_x: 1,
        grid_span_y: 1,
        badge_text: null,
        icon_name: "Storefront",
        is_active: true,
        sort_order: 2,
      },
      {
        id: "item-cat-3",
        section_id: "canonical-quick-categories",
        title: "Farmácias",
        subtitle: null,
        image_url: null,
        target_url: "/farmacia",
        show_text: true,
        grid_span_x: 1,
        grid_span_y: 1,
        badge_text: null,
        icon_name: "Pill",
        is_active: true,
        sort_order: 3,
      },
      {
        id: "item-cat-4",
        section_id: "canonical-quick-categories",
        title: "Corridas",
        subtitle: null,
        image_url: null,
        target_url: "/mobilidade",
        show_text: true,
        grid_span_x: 1,
        grid_span_y: 1,
        badge_text: "Novo",
        icon_name: "Car",
        is_active: true,
        sort_order: 4,
      },
      {
        id: "item-cat-5",
        section_id: "canonical-quick-categories",
        title: "Promoções",
        subtitle: null,
        image_url: null,
        target_url: "/ofertas",
        show_text: true,
        grid_span_x: 1,
        grid_span_y: 1,
        badge_text: "Novo",
        icon_name: "Tag",
        is_active: true,
        sort_order: 5,
      },
      {
        id: "item-cat-6",
        section_id: "canonical-quick-categories",
        title: "Bolão",
        subtitle: null,
        image_url: null,
        target_url: "/concursos",
        show_text: true,
        grid_span_x: 1,
        grid_span_y: 1,
        badge_text: null,
        icon_name: "SoccerBall",
        is_active: true,
        sort_order: 6,
      },
      {
        id: "item-cat-7",
        section_id: "canonical-quick-categories",
        title: "Gourmet",
        subtitle: null,
        image_url: null,
        target_url: "/gastronomia",
        show_text: true,
        grid_span_x: 1,
        grid_span_y: 1,
        badge_text: null,
        icon_name: "CookingPot",
        is_active: true,
        sort_order: 7,
      },
      {
        id: "item-cat-8",
        section_id: "canonical-quick-categories",
        title: "Clube",
        subtitle: null,
        image_url: null,
        target_url: "/conta/creditos",
        show_text: true,
        grid_span_x: 1,
        grid_span_y: 1,
        badge_text: null,
        icon_name: "Sparkle",
        is_active: true,
        sort_order: 8,
      },
      {
        id: "item-cat-9",
        section_id: "canonical-quick-categories",
        title: "Turbo",
        subtitle: null,
        image_url: null,
        target_url: "/gastronomia",
        show_text: true,
        grid_span_x: 1,
        grid_span_y: 1,
        badge_text: "Novo",
        icon_name: "Lightning",
        is_active: true,
        sort_order: 9,
      },
      {
        id: "item-cat-10",
        section_id: "canonical-quick-categories",
        title: "Ver mais",
        subtitle: null,
        image_url: null,
        target_url: "#categorias",
        show_text: true,
        grid_span_x: 1,
        grid_span_y: 1,
        badge_text: null,
        icon_name: "SquaresFour",
        is_active: true,
        sort_order: 10,
      },
    ],
  },
  {
    id: "canonical-hero-banners",
    section_key: "hero_banners",
    title: "Destaques Principais (Banner Carrossel iFood)",
    subtitle: "Ofertas e novidades da sua cidade com indicadores em traço",
    show_title: false,
    show_subtitle: false,
    layout_variant: "carousel",
    aspect_ratio: "16:9",
    is_active: true,
    sort_order: 3,
    metadata: { category: "ifood_core" },
    items: [
      {
        id: "item-hero-1",
        section_id: "canonical-hero-banners",
        title: "Peça com cupons de até R$ 21,90",
        subtitle: "Descontos exclusivos nos restaurantes parceiros da cidade",
        image_url: null,
        target_url: "/ofertas",
        show_text: true,
        grid_span_x: 2,
        grid_span_y: 1,
        badge_text: "Clube Waesy",
        is_active: true,
        sort_order: 1,
      },
      {
        id: "item-hero-2",
        section_id: "canonical-hero-banners",
        title: "Gastronomia & Restaurantes",
        subtitle: "Peça dos melhores estabelecimentos da região",
        image_url: null,
        target_url: "/gastronomia",
        show_text: true,
        grid_span_x: 2,
        grid_span_y: 1,
        badge_text: "Delivery",
        is_active: true,
        sort_order: 2,
      },
    ],
  },
  {
    id: "canonical-recent-stores-rail",
    section_key: "recent_stores_rail",
    title: "Últimas lojas",
    subtitle: "Estabelecimentos visitados e parceiros em destaque",
    show_title: true,
    show_subtitle: false,
    layout_variant: "horizontal_scroll",
    aspect_ratio: "1:1",
    is_active: true,
    sort_order: 4,
    metadata: { category: "ifood_core", viewMoreTo: "/gastronomia" },
    items: [],
  },
  {
    id: "canonical-feature-mini-banners",
    section_key: "feature_mini_banners",
    title: "No Waesy também tem",
    subtitle: "Mini-banners verticais de experiências e benefícios",
    show_title: true,
    show_subtitle: false,
    layout_variant: "horizontal_scroll",
    aspect_ratio: "4:5",
    is_active: true,
    sort_order: 5,
    metadata: { category: "ifood_core" },
    items: [
      {
        id: "fmb-clube",
        section_id: "canonical-feature-mini-banners",
        title: "Confira ofertas do clube para você",
        subtitle: "Economize em cada pedido",
        image_url: null,
        target_url: "/conta/creditos",
        show_text: true,
        grid_span_x: 1,
        grid_span_y: 1,
        badge_text: "Clube >",
        bg_color: "#7c3aed",
        is_active: true,
        sort_order: 1,
      },
      {
        id: "fmb-gourmet",
        section_id: "canonical-feature-mini-banners",
        title: "Experiência diferenciada",
        subtitle: "Alta gastronomia e chefs",
        image_url: null,
        target_url: "/gastronomia",
        show_text: true,
        grid_span_x: 1,
        grid_span_y: 1,
        badge_text: "Gourmet >",
        bg_color: "#171717",
        is_active: true,
        sort_order: 2,
      },
      {
        id: "fmb-corridas",
        section_id: "canonical-feature-mini-banners",
        title: "Peça corridas e entregas rápidas",
        subtitle: "Mobilidade urbana taxa fixa",
        image_url: null,
        target_url: "/mobilidade",
        show_text: true,
        grid_span_x: 1,
        grid_span_y: 1,
        badge_text: "Corridas >",
        bg_color: "#dc2626",
        is_active: true,
        sort_order: 3,
      },
      {
        id: "fmb-turbo",
        section_id: "canonical-feature-mini-banners",
        title: "Burguer com entrega grátis",
        subtitle: "Hamburguerias da sua região",
        image_url: null,
        target_url: "/gastronomia",
        show_text: true,
        grid_span_x: 1,
        grid_span_y: 1,
        badge_text: "Pedir agora",
        bg_color: "#ea580c",
        is_active: true,
        sort_order: 4,
      },
    ],
  },
  {
    id: "canonical-spotlight-restaurants",
    section_key: "spotlight_restaurants",
    title: "Restaurantes com Cupom",
    subtitle: "Ad",
    show_title: true,
    show_subtitle: true,
    layout_variant: "horizontal_scroll",
    aspect_ratio: "4:3",
    is_active: true,
    sort_order: 6,
    metadata: { category: "ifood_core", viewMoreTo: "/gastronomia", isAd: true },
    items: [],
  },
  {
    id: "canonical-spotlight-pharmacies",
    section_key: "spotlight_pharmacies",
    title: "Farmácias & Mercados Famosos",
    subtitle: "Entregas rápidas na sua porta",
    show_title: true,
    show_subtitle: false,
    layout_variant: "horizontal_scroll",
    aspect_ratio: "4:3",
    is_active: true,
    sort_order: 7,
    metadata: { category: "ifood_core", viewMoreTo: "/farmacia" },
    items: [],
  },
  {
    id: "canonical-filter-chips-bar",
    section_key: "filter_chips_bar",
    title: "Filtros Rápidos de Lojas",
    subtitle: "Ordenar, Turbo, Entrega grátis, Super Restaurantes, Promoção",
    show_title: false,
    show_subtitle: false,
    layout_variant: "horizontal_scroll",
    aspect_ratio: "auto",
    is_active: true,
    sort_order: 8,
    metadata: { category: "ifood_core" },
    items: [],
  },
  {
    id: "canonical-stores-feed-list",
    section_key: "stores_feed_list",
    title: "Lojas",
    subtitle: "Lista vertical de lojas e restaurantes abertos",
    show_title: true,
    show_subtitle: false,
    layout_variant: "grid_2d",
    aspect_ratio: "auto",
    is_active: true,
    sort_order: 9,
    metadata: { category: "ifood_core" },
    items: [],
  },

  // ── SEÇÕES SECUNDÁRIAS / LEGADAS (OCULTAS POR PADRÃO — ATIVÁVEIS NO ADMIN CMS) ──
  {
    id: "canonical-marketplace-products-rail",
    section_key: "marketplace_products_rail",
    title: "Mais Vendidos & Ofertas",
    subtitle: "Produtos em destaque das lojas locais",
    show_title: true,
    show_subtitle: false,
    layout_variant: "horizontal_scroll",
    aspect_ratio: "4:3",
    is_active: false,
    sort_order: 10,
    metadata: { category: "optional_module" },
    items: [],
  },
  {
    id: "canonical-classifieds-rail",
    section_key: "classifieds_rail",
    title: "Classificados da Região",
    subtitle: "Imóveis, veículos, desapegos e oportunidades locais",
    show_title: true,
    show_subtitle: false,
    layout_variant: "horizontal_scroll",
    aspect_ratio: "4:3",
    is_active: false,
    sort_order: 11,
    metadata: { category: "optional_module" },
    items: [],
  },
  {
    id: "canonical-jobs-rail",
    section_key: "jobs_rail",
    title: "Vagas & Oportunidades",
    subtitle: "Carreiras e empregos nas empresas da região",
    show_title: true,
    show_subtitle: false,
    layout_variant: "horizontal_scroll",
    aspect_ratio: "4:3",
    is_active: false,
    sort_order: 12,
    metadata: { category: "optional_module" },
    items: [],
  },
  {
    id: "canonical-vitrine-engine-selector",
    section_key: "vitrine_engine_selector",
    title: "Seletor de Ecossistema (Lugares | Marketplace | Classificados)",
    subtitle: "Abas superiores de troca de motor da vitrine",
    show_title: false,
    show_subtitle: false,
    layout_variant: "native_dock",
    aspect_ratio: "auto",
    is_active: false,
    sort_order: 13,
    metadata: { category: "legacy_control" },
    items: [],
  },
  {
    id: "canonical-discovery-control-bar",
    section_key: "discovery_control_bar",
    title: "Barra Clássica de Descoberta (13 Pilares + Feed/Grade/Lista)",
    subtitle: "Filtro horizontal de pilares e alternador de visualização",
    show_title: false,
    show_subtitle: false,
    layout_variant: "horizontal_scroll",
    aspect_ratio: "auto",
    is_active: false,
    sort_order: 14,
    metadata: { category: "legacy_control" },
    items: [],
  },
  {
    id: "canonical-dual-line-filter-pills",
    section_key: "dual_line_filter_pills",
    title: "Pílulas de Filtro em Dupla Linha (Legado)",
    subtitle: "Grade dupla de filtros secundários",
    show_title: false,
    show_subtitle: false,
    layout_variant: "horizontal_scroll",
    aspect_ratio: "auto",
    is_active: false,
    sort_order: 15,
    metadata: { category: "legacy_control" },
    items: [],
  },
  {
    id: "canonical-hotpages-grid",
    section_key: "hotpages_grid",
    title: "Hotpages em Destaque (Bento Grid)",
    subtitle: "Páginas temáticas exclusivas",
    show_title: false,
    show_subtitle: false,
    layout_variant: "bento_grid",
    aspect_ratio: "16:9",
    is_active: false,
    sort_order: 16,
    metadata: { category: "optional_module" },
    items: [
      {
        id: "item-hot-1",
        section_id: "canonical-hotpages-grid",
        title: "Guia Gastronômico da Cidade",
        subtitle: "Roteiro dos melhores sabores",
        image_url: null,
        target_url: "/gastronomia",
        show_text: true,
        grid_span_x: 2,
        grid_span_y: 2,
        badge_text: null,
        is_active: true,
        sort_order: 1,
      },
      {
        id: "item-hot-2",
        section_id: "canonical-hotpages-grid",
        title: "Ofertas da Semana",
        subtitle: "Descontos imperdíveis",
        image_url: null,
        target_url: "/ofertas",
        show_text: true,
        grid_span_x: 1,
        grid_span_y: 1,
        badge_text: null,
        is_active: true,
        sort_order: 2,
      },
      {
        id: "item-hot-3",
        section_id: "canonical-hotpages-grid",
        title: "Serviços & Especialistas",
        subtitle: "Profissionais avaliados",
        image_url: null,
        target_url: "/servicos",
        show_text: true,
        grid_span_x: 1,
        grid_span_y: 1,
        badge_text: null,
        is_active: true,
        sort_order: 3,
      },
    ],
  },
  {
    id: "canonical-marketplace-categories",
    section_key: "marketplace_categories",
    title: "Classificados e Negócios (Grade 2D)",
    subtitle: "Categorias comerciais secundárias",
    show_title: false,
    show_subtitle: false,
    layout_variant: "grid_2d",
    aspect_ratio: "1:1",
    is_active: false,
    sort_order: 17,
    metadata: { category: "optional_module" },
    items: [
      {
        id: "item-mkt-1",
        section_id: "canonical-marketplace-categories",
        title: "Veículos e Autos",
        subtitle: null,
        image_url: null,
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
        image_url: null,
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
        image_url: null,
        target_url: "/eletronicos",
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
        image_url: null,
        target_url: "/moda",
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
    id: "canonical-places-directory-rail",
    section_key: "places_directory_rail",
    title: "Lugares e Empresas (Guia Comercial)",
    subtitle: "Empresas locais verificadas com WhatsApp direto",
    show_title: true,
    show_subtitle: false,
    layout_variant: "horizontal_scroll",
    aspect_ratio: "16:9",
    is_active: false,
    sort_order: 18,
    metadata: { category: "optional_module" },
    items: [],
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
    is_active: false,
    sort_order: 19,
    metadata: { category: "optional_module" },
    items: [],
  },
  {
    id: "canonical-news-rail",
    section_key: "news_rail",
    title: "Notícias Locais",
    subtitle: "Jornalismo e atualizações da região",
    show_title: true,
    show_subtitle: false,
    layout_variant: "horizontal_scroll",
    aspect_ratio: "16:9",
    is_active: false,
    sort_order: 20,
    metadata: { category: "optional_module" },
    items: [],
  },
  {
    id: "canonical-events-rail",
    section_key: "events_rail",
    title: "Agenda e Eventos",
    subtitle: "Ingressos, shows e programação cultural",
    show_title: true,
    show_subtitle: false,
    layout_variant: "horizontal_scroll",
    aspect_ratio: "16:9",
    is_active: false,
    sort_order: 21,
    metadata: { category: "optional_module" },
    items: [],
  },
  {
    id: "canonical-procedural-infinite-feed",
    section_key: "procedural_infinite_feed",
    title: "Feed Infinito de Descoberta",
    subtitle: "Rolagem contínua de produtos e estabelecimentos",
    show_title: true,
    show_subtitle: false,
    layout_variant: "grid_2d",
    aspect_ratio: "auto",
    is_active: false,
    sort_order: 22,
    metadata: { category: "optional_module" },
    items: [],
  },
];

// Chaves canônicas ativas por padrão no novo design SuperApp / iFood
const CANONICAL_DEFAULT_ACTIVE_KEYS = new Set([
  "promo_coupon_banner",
  "quick_categories_ifood",
  "hero_banners",
  "recent_stores_rail",
  "feature_mini_banners",
  "spotlight_restaurants",
  "spotlight_pharmacies",
  "filter_chips_bar",
  "stores_feed_list",
]);

function mergeCanonicalWithDbSections(
  dbSections: any[],
  itemsMap: Map<string, HomeSectionItemDTO[]>,
): HomePageSectionDTO[] {
  const byKey = new Map<string, HomePageSectionDTO>();

  for (const canonical of CANONICAL_DEFAULT_HOME_SECTIONS) {
    byKey.set(canonical.section_key, {
      ...canonical,
      items: [...canonical.items],
    });
  }

  for (const sec of dbSections) {
    const canonical = byKey.get(sec.section_key);
    const dbItemsForSec = itemsMap.get(sec.id) || [];
    const resolvedItems =
      dbItemsForSec.length > 0 ? dbItemsForSec : canonical?.items || [];

    byKey.set(sec.section_key, {
      id: sec.id,
      section_key: sec.section_key,
      title: sec.title ?? canonical?.title ?? null,
      subtitle: sec.subtitle ?? canonical?.subtitle ?? null,
      show_title: sec.show_title ?? canonical?.show_title ?? false,
      show_subtitle: sec.show_subtitle ?? canonical?.show_subtitle ?? false,
      layout_variant: (sec.layout_variant || canonical?.layout_variant || "carousel") as HomeLayoutVariant,
      aspect_ratio: (sec.aspect_ratio || canonical?.aspect_ratio || "auto") as HomeAspectRatio,
      is_active: sec.is_active !== false,
      sort_order: sec.sort_order ?? canonical?.sort_order ?? 99,
      city_filter: sec.city_filter || null,
      starts_at: sec.starts_at || null,
      ends_at: sec.ends_at || null,
      auto_archive_at: sec.auto_archive_at || null,
      metadata: { ...(canonical?.metadata || {}), ...(sec.metadata || {}) },
      created_at: sec.created_at,
      updated_at: sec.updated_at,
      items: resolvedItems,
    });
  }

  return Array.from(byKey.values()).sort((a, b) => a.sort_order - b.sort_order);
}

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
        .order("sort_order", { ascending: true });

      if (secErr || !dbSections || dbSections.length === 0) {
        return CANONICAL_DEFAULT_HOME_SECTIONS.filter((s) => s.is_active);
      }

      const sectionIds = dbSections.map((s) => s.id);
      const { data: dbItems } = await supabase
        .from("home_section_items")
        .select("*")
        .in("section_id", sectionIds)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      const now = new Date().toISOString();
      const itemsMap = new Map<string, HomeSectionItemDTO[]>();
      (dbItems || []).forEach((item: any) => {
        if (item.ends_at && item.ends_at < now) return;
        if (item.starts_at && item.starts_at > now) return;
        const hasVisualOrText =
          Boolean(item.title?.trim()) ||
          Boolean(item.icon_name?.trim()) ||
          isHealthyImageUrl(item.image_url) ||
          isHealthyImageUrl(item.image_desktop_url) ||
          isHealthyImageUrl(item.image_mobile_url);
        if (!hasVisualOrText) return;

        const list = itemsMap.get(item.section_id) || [];
        list.push({
          id: item.id,
          section_id: item.section_id,
          title: item.title,
          subtitle: item.subtitle,
          image_url: isHealthyImageUrl(item.image_url) ? String(item.image_url).trim() : null,
          image_mobile_url: isHealthyImageUrl(item.image_mobile_url) ? String(item.image_mobile_url).trim() : null,
          image_desktop_url: isHealthyImageUrl(item.image_desktop_url) ? String(item.image_desktop_url).trim() : null,
          target_url: item.target_url || "/",
          show_text: item.show_text !== false,
          grid_span_x: item.grid_span_x || 1,
          grid_span_y: item.grid_span_y || 1,
          badge_text: item.badge_text,
          bg_color: item.bg_color || null,
          text_color: item.text_color || null,
          icon_name: item.icon_name || null,
          button_shape: item.button_shape || "squircle",
          starts_at: item.starts_at || null,
          ends_at: item.ends_at || null,
          is_active: item.is_active !== false,
          sort_order: item.sort_order ?? 0,
          created_at: item.created_at,
          updated_at: item.updated_at,
        });
        itemsMap.set(item.section_id, list);
      });

      const merged = mergeCanonicalWithDbSections(dbSections, itemsMap);

      return merged.filter((sec) => {
        if (!sec.is_active) return false;
        if (sec.ends_at && sec.ends_at < now) return false;
        if (sec.starts_at && sec.starts_at > now) return false;
        if (sec.city_filter && city && sec.city_filter !== "all" && sec.city_filter !== city) return false;
        return true;
      });
    } catch (err) {
      console.warn("[listPublicHomePageSections] Fallback ativado:", err);
      return CANONICAL_DEFAULT_HOME_SECTIONS.filter((s) => s.is_active);
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
          image_url: isHealthyImageUrl(item.image_url) ? String(item.image_url).trim() : (item.image_url || ""),
          image_mobile_url: item.image_mobile_url || null,
          image_desktop_url: item.image_desktop_url || null,
          target_url: item.target_url || "/",
          show_text: item.show_text !== false,
          grid_span_x: item.grid_span_x || 1,
          grid_span_y: item.grid_span_y || 1,
          badge_text: item.badge_text,
          bg_color: item.bg_color || null,
          text_color: item.text_color || null,
          icon_name: item.icon_name || null,
          button_shape: item.button_shape || "squircle",
          starts_at: item.starts_at || null,
          ends_at: item.ends_at || null,
          is_active: item.is_active !== false,
          sort_order: item.sort_order ?? 0,
          created_at: item.created_at,
          updated_at: item.updated_at,
        });
        itemsMap.set(item.section_id, list);
      });

      return mergeCanonicalWithDbSections(dbSections, itemsMap);
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
  layout_variant: z
    .enum([
      "carousel",
      "bento_grid",
      "horizontal_scroll",
      "grid_2d",
      "native_dock",
      "cards_action_grid",
      "slim_slider",
      "custom_buttons",
    ])
    .default("carousel"),
  aspect_ratio: z
    .enum([
      "slim_desktop",
      "ifood",
      "16:9",
      "4:3",
      "1:1",
      "4:5",
      "9:16",
      "auto",
    ])
    .default("ifood"),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
  city_filter: z.string().optional().nullable(),
  starts_at: z.string().optional().nullable(),
  ends_at: z.string().optional().nullable(),
  auto_archive_at: z.string().optional().nullable(),
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
      city_filter,
      starts_at,
      ends_at,
      auto_archive_at,
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
      city_filter: city_filter || null,
      starts_at: starts_at ? new Date(starts_at).toISOString() : null,
      ends_at: ends_at ? new Date(ends_at).toISOString() : null,
      auto_archive_at: auto_archive_at ? new Date(auto_archive_at).toISOString() : null,
      metadata: { ...(metadata || {}), admin_overridden: true },
      updated_at: new Date().toISOString(),
    };

    if (id && !id.startsWith("canonical-")) {
      const { data, error } = await supabase
        .from("home_page_sections")
        .update(row)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const { data: existing } = await supabase
        .from("home_page_sections")
        .select("id")
        .eq("section_key", section_key)
        .maybeSingle();

      if (existing?.id) {
        const { data, error } = await supabase
          .from("home_page_sections")
          .update(row)
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }

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
  image_mobile_url: z.string().optional().nullable(),
  image_desktop_url: z.string().optional().nullable(),
  target_url: z.string().default("/"),
  show_text: z.boolean().default(false),
  grid_span_x: z.number().int().min(1).max(6).default(1),
  grid_span_y: z.number().int().min(1).max(4).default(1),
  badge_text: z.string().optional().nullable(),
  bg_color: z.string().optional().nullable(),
  text_color: z.string().optional().nullable(),
  icon_name: z.string().optional().nullable(),
  button_shape: z.string().optional().nullable(),
  starts_at: z.string().optional().nullable(),
  ends_at: z.string().optional().nullable(),
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
      image_mobile_url,
      image_desktop_url,
      target_url,
      show_text,
      grid_span_x,
      grid_span_y,
      badge_text,
      bg_color,
      text_color,
      icon_name,
      button_shape,
      starts_at,
      ends_at,
      is_active,
      sort_order,
    } = payload;

    const row: any = {
      section_id,
      title: title || null,
      subtitle: subtitle || null,
      image_url,
      image_mobile_url: image_mobile_url || null,
      image_desktop_url: image_desktop_url || null,
      target_url: target_url || "/",
      show_text: Boolean(show_text),
      grid_span_x: Number(grid_span_x) || 1,
      grid_span_y: Number(grid_span_y) || 1,
      badge_text: badge_text || null,
      bg_color: bg_color || null,
      text_color: text_color || null,
      icon_name: icon_name || null,
      button_shape: button_shape || "squircle",
      starts_at: starts_at ? new Date(starts_at).toISOString() : null,
      ends_at: ends_at ? new Date(ends_at).toISOString() : null,
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

// ── 9. CONSULTA UNIFICADA E NORMALIZADA DE POSTS PARA VITRINE SOCIAL (ZERO FAKES / ANTI-BROKEN IMAGE) ──
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
    const cleanCity = city ? city.split("-")[0].trim().toLowerCase() : "";

    const normalizedList: NormalizedShowcasePost[] = [];

    try {
      // 1. Busca publicações reais ativas (prioriza correspondências da cidade e mantém cobertura regional)
      const { data: rawPostsData } = await supabase
        .from("posts")
        .select(`
          id, content_text, media_urls, layout_style, created_at, post_type, city, location_name,
          publish_as_handle, metadata,
          profiles!posts_author_profile_id_fkey(full_name, avatar_url, username),
          stores(name, settings, logo_url)
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(Math.max(limit * 2, 24));

      const postsData = Array.isArray(rawPostsData) ? [...rawPostsData] : [];
      if (cleanCity && postsData.length > 1) {
        postsData.sort((a: any, b: any) => {
          const aMatch =
            (a.city || "").toLowerCase().includes(cleanCity) ||
            (a.location_name || "").toLowerCase().includes(cleanCity);
          const bMatch =
            (b.city || "").toLowerCase().includes(cleanCity) ||
            (b.location_name || "").toLowerCase().includes(cleanCity);
          if (aMatch && !bMatch) return -1;
          if (!aMatch && bMatch) return 1;
          return 0;
        });
      }

      // 1.1 Batch: curtidas e comentários reais (Invariante B.30 — Zero Engajamento Falso)
      const postIds = postsData.map((p: any) => p.id).filter(Boolean);
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

      postsData.forEach((p: any, idx: number) => {
        const validMediaUrls = Array.isArray(p.media_urls)
          ? p.media_urls.filter((u: unknown) => isHealthyImageUrl(u)).map((u: string) => u.trim())
          : [];
        const rawMedia = validMediaUrls[0] || null;
        // Invariante Anti-Fake: Post sem mídia NÃO deve receber imagem do Unsplash como fallback.
        // Se não possui mídia enviada pelo criador/loja, coverUrl é null (post puro de texto).
        const cover = rawMedia && isHealthyImageUrl(rawMedia) ? rawMedia : null;
        const rawText =
          p.content_text ||
          p.metadata?.title ||
          p.metadata?.subtitle ||
          "";
        // Preserva a formatação rica (==destaque==, menções, hashtags) para exibição nativa
        const cleanText = rawText.trim();

        if (!cleanText && validMediaUrls.length === 0) return;

        const storeSettings = (p.stores?.settings as Record<string, any>) || {};
        const author =
          p.metadata?.creator_name ||
          p.profiles?.full_name ||
          p.stores?.name ||
          "Membro da Comunidade";
        const isWaesyAuthor = Boolean((author && /waesy/i.test(author)) || (p.stores?.name && /waesy/i.test(p.stores.name)));
        const storeAvatar = p.stores?.logo_url || storeSettings.avatar_url || storeSettings.logo_url || storeSettings.logoUrl || (isWaesyAuthor ? "/brand-logo.png" : null);
        const handle = p.publish_as_handle
          ? p.publish_as_handle.startsWith("@")
            ? p.publish_as_handle
            : `@${p.publish_as_handle}`
          : p.profiles?.username
            ? `@${p.profiles.username}`
            : p.stores?.name
              ? `@${p.stores.name.toLowerCase().replace(/\s+/g, "")}`
              : (isWaesyAuthor ? "@waesy" : undefined);
        const rawAvatar = p.profiles?.avatar_url || storeAvatar || (isWaesyAuthor ? "/brand-logo.png" : null);
        const avatar = isHealthyImageUrl(rawAvatar) || rawAvatar?.startsWith("/") ? rawAvatar : null;

        const resolvedLayoutStyle: NormalizedShowcasePost["layoutStyle"] =
          p.post_type === "trilho_horizontal" ||
          (validMediaUrls.length > 1 && p.layout_style !== "carousel" && p.post_type !== "carrossel_unico")
            ? "trilho_horizontal"
            : p.post_type === "carrossel_unico" || p.layout_style === "carousel"
              ? "carrossel_unico"
              : p.post_type === "grid"
                ? "grid"
                : "panoramico";

        normalizedList.push({
          id: p.id,
          title: p.metadata?.title || cleanText.slice(0, 96) + (cleanText.length > 96 ? "..." : ""),
          summary: cleanText,
          coverUrl: cover,
          mediaUrls: validMediaUrls,
          postType: p.post_type || "simple",
          layoutStyle: resolvedLayoutStyle,
          locationName: p.city || p.location_name || null,
          category:
            p.post_type === "moment"
              ? "Momento"
              : p.post_type === "news"
                ? "Notícia"
                : p.post_type === "travel"
                  ? "Roteiro"
                  : "Comunidade",
          publishedAt: p.created_at || new Date().toISOString(),
          targetUrl: `/publicacao/${p.id}`,
          authorName: author,
          authorHandle: handle,
          authorAvatar: avatar,
          isVerified: Boolean(p.stores?.name || p.publish_as_handle),
          likesCount: likeCountMap.get(p.id) ?? 0,
          commentsCount: commentCountMap.get(p.id) ?? 0,
        });
      });

      // 2. Complementa com notícias reais publicadas (link direto para /noticias/$slug)
      if (normalizedList.length < limit) {
        const { data: rawArticlesData } = await supabase
          .from("news_articles")
          .select("id, slug, title, subtitle, summary, cover_media_url, category, published_at, city")
          .eq("status", "published")
          .order("published_at", { ascending: false })
          .limit(Math.max(limit, 8));

        const articlesData = Array.isArray(rawArticlesData) ? [...rawArticlesData] : [];
        if (cleanCity && articlesData.length > 1) {
          articlesData.sort((a: any, b: any) => {
            const aMatch = (a.city || "").toLowerCase().includes(cleanCity);
            const bMatch = (b.city || "").toLowerCase().includes(cleanCity);
            if (aMatch && !bMatch) return -1;
            if (!aMatch && bMatch) return 1;
            return 0;
          });
        }

        articlesData.forEach((art: any, idx: number) => {
          const cover = resolveCityNewsCover({
            coverUrl: art.cover_media_url,
            city: art.city,
            category: art.category,
            title: art.title,
          });
          const validMedia = cover ? [cover] : [];
          normalizedList.push({
            id: `article-${art.id}`,
            title: art.title,
            summary: art.summary || art.subtitle || art.title,
            coverUrl: cover,
            mediaUrls: validMedia,
            postType: "news",
            layoutStyle: "panoramico",
            locationName: art.city || null,
            category: art.category || "Notícia",
            publishedAt: art.published_at || new Date().toISOString(),
            targetUrl: `/noticias/${art.slug || art.id}`,
            authorName: "Redação Waesy",
            authorHandle: "@waesy",
            authorAvatar: "/brand-logo.png",
            isVerified: true,
            likesCount: 0,
            commentsCount: 0,
          });
        });
      }

      return normalizedList.slice(0, limit);
    } catch (err) {
      console.warn("[getUnifiedShowcasePosts] Erro:", err);
      return [];
    }
  });
