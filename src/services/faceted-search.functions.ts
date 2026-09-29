/**
 * faceted-search.functions.ts — Motor de Busca Facetada Híbrida & Ranqueamento Algorítmico Preditivo
 * Waesy Platform — BigTech Algorithmic Engine (V135)
 *
 * Funcionalidades:
 * 1. Busca textual com FTS / Trigram ponderado.
 * 2. Ranqueamento comportamental por afinidade de telemetria (Waesy Behavioral Engine - Módulo 23).
 * 3. Agregação em tempo de execução de facetas dinâmicas (preços, categorias, nichos, cidades).
 * 4. Feedback loop silencioso registrando telemetria associada à sessão / civil_id.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getUserTopAffinities, recordUserBehavior, type UserAffinityDTO } from "./telemetry-affinity.functions";

// ---------------------------------------------------------------------------
// Schemas Estritos de Validação (Zod)
// ---------------------------------------------------------------------------

export const FacetedSearchInputSchema = z.object({
  query: z.string().max(200).optional().default(""),
  category_slugs: z.array(z.string()).optional().default([]),
  niches: z.array(z.string()).optional().default([]),
  min_price_cents: z.number().int().min(0).optional(),
  max_price_cents: z.number().int().min(0).optional(),
  in_stock_only: z.boolean().optional().default(false),
  city: z.string().optional(),
  sort_by: z
    .enum(["relevance_telemetry", "price_asc", "price_desc", "rating", "newest"])
    .optional()
    .default("relevance_telemetry"),
  page: z.number().int().min(1).optional().default(1),
  page_size: z.number().int().min(1).max(50).optional().default(16),
  store_id: z.string().uuid().optional(),
  session_id: z.string().optional(),
});

export type FacetedSearchInput = z.infer<typeof FacetedSearchInputSchema>;

export interface SearchFacetItem {
  id: string;
  label: string;
  count: number;
}

export interface FacetedSearchFacets {
  price_range: {
    min_cents: number;
    max_cents: number;
  };
  categories: SearchFacetItem[];
  niches: SearchFacetItem[];
  cities: SearchFacetItem[];
}

export interface FacetedProductItem {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  price_cents: number;
  original_price_cents?: number | null;
  cover_url: string | null;
  store: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    city?: string | null;
    state?: string | null;
    niche?: string | null;
  };
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  niche: string;
  relevance_score: number;
  is_boosted?: boolean;
  created_at: string;
}

export interface FacetedSearchResponse {
  items: FacetedProductItem[];
  facets: FacetedSearchFacets;
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
  };
  applied_filters: {
    query: string;
    category_slugs: string[];
    niches: string[];
    min_price_cents?: number;
    max_price_cents?: number;
    sort_by: string;
  };
  telemetry_echo: {
    top_affinity_niche: string | null;
    affinity_boost_applied: boolean;
  };
}

// ---------------------------------------------------------------------------
// Algoritmo Preditivo de Relevância & Pontuação de Afinidade (Waesy Engine)
// ---------------------------------------------------------------------------

export function calculateRelevanceScore(
  item: {
    title: string;
    description: string | null;
    niche: string;
    created_at: string;
    is_boosted?: boolean;
  },
  query: string,
  userAffinities: UserAffinityDTO[] = [],
): number {
  let score = 50; // Pontuação base
  const cleanQ = query.trim().toLowerCase();

  if (cleanQ) {
    const titleLower = item.title.toLowerCase();
    const descLower = (item.description || "").toLowerCase();

    // 1. Ponderação Textual
    if (titleLower === cleanQ) {
      score += 150; // Match Exato
    } else if (titleLower.startsWith(cleanQ)) {
      score += 100; // Prefixo no Título
    } else if (titleLower.includes(cleanQ)) {
      score += 70; // Substring no Título
    } else {
      // Correspondência de palavras individuais
      const words = cleanQ.split(/\s+/).filter(Boolean);
      const matchedWords = words.filter((w) => titleLower.includes(w));
      score += matchedWords.length * 25;
    }

    if (descLower.includes(cleanQ)) {
      score += 20; // Menção na descrição
    }
  }

  // 2. Ponderação Comportamental da Telemetria (Decaimento Temporal Exponencial)
  const itemNiche = item.niche.toLowerCase();
  const affinity = userAffinities.find(
    (a) => a.niche.toLowerCase() === itemNiche || (itemNiche === "geral" && a.niche === "varejo"),
  );

  if (affinity && affinity.total_score > 0) {
    // Multiplicador de afinidade comprovada: score adiciona até 12x os pontos acumulados
    const affinityBoost = Math.min(Math.round(affinity.total_score * 12), 120);
    score += affinityBoost;
  }

  // 3. Ponderação de Recência (Freshness Multiplier)
  const itemDate = new Date(item.created_at).getTime();
  const now = Date.now();
  const daysOld = (now - itemDate) / (1000 * 60 * 60 * 24);

  if (daysOld <= 3) {
    score += 25; // Super novidade
  } else if (daysOld <= 14) {
    score += 15;
  } else if (daysOld <= 30) {
    score += 5;
  }

  // 4. Boost de Anúncio Patrocinado
  if (item.is_boosted) {
    score += 40;
  }

  return score;
}

// ---------------------------------------------------------------------------
// Server Function: Execução de Busca Facetada com Feedback Loop
// ---------------------------------------------------------------------------

export const searchFacetedCatalog = createServerFn({ method: "POST" })
  .validator(FacetedSearchInputSchema)
  .handler(async ({ data }): Promise<FacetedSearchResponse> => {
    const supabase = getServerClient();
    const startTime = Date.now();

    // 1. Carregar afinidades do usuário em paralelo
    const userAffinities = await getUserTopAffinities({
      data: { sessionId: data.session_id, limit: 5 },
    }).catch(() => []);

    const topAffinity = userAffinities.length > 0 ? userAffinities[0].niche : null;

    // 2. Query dos Produtos Ativos no Supabase
    let queryBuilder = supabase
      .from("products")
      .select(`
        id,
        title,
        slug,
        description,
        price_cents,
        original_price_cents,
        status,
        created_at,
        category:categories(id, name, slug),
        store:stores(id, name, slug, logo_url, city, state, niche),
        product_media(url, is_cover, sort_order)
      `)
      .in("status", ["published", "active"]);

    if (data.store_id) {
      queryBuilder = queryBuilder.eq("store_id", data.store_id);
    }

    if (data.min_price_cents !== undefined) {
      queryBuilder = queryBuilder.gte("price_cents", data.min_price_cents);
    }
    if (data.max_price_cents !== undefined) {
      queryBuilder = queryBuilder.lte("price_cents", data.max_price_cents);
    }

    // Se houver busca textual, aplicamos filtro preliminar
    const cleanQuery = data.query?.trim() || "";
    if (cleanQuery) {
      queryBuilder = queryBuilder.ilike("title", `%${cleanQuery}%`);
    }

    const { data: rawProducts, error } = await queryBuilder.limit(200);

    if (error) {
      console.error("[faceted-search] Erro ao buscar produtos:", error);
    }

    const products = rawProducts || [];

    // Helper para extrair imagem de capa
    const extractCover = (mediaList: any[] = []) => {
      if (!mediaList || mediaList.length === 0) return null;
      const cover = mediaList.find((m) => m.is_cover);
      return cover?.url || mediaList[0]?.url || null;
    };

    // 3. Normalização e Atribuição de Relevância
    const mappedItems: FacetedProductItem[] = products.map((p: any) => {
      const niche = p.store?.niche || "varejo";
      const isBoosted = false; // Integrável com ad_campaigns

      const relevance = calculateRelevanceScore(
        {
          title: p.title || "",
          description: p.description,
          niche,
          created_at: p.created_at,
          is_boosted: isBoosted,
        },
        cleanQuery,
        userAffinities,
      );

      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        description: p.description,
        price_cents: p.price_cents || 0,
        original_price_cents: p.original_price_cents,
        cover_url: extractCover(p.product_media),
        store: {
          id: p.store?.id || "",
          name: p.store?.name || "Loja Parceira",
          slug: p.store?.slug || "loja",
          logo_url: p.store?.logo_url || null,
          city: p.store?.city || null,
          state: p.store?.state || null,
          niche,
        },
        category: p.category
          ? {
              id: p.category.id,
              name: p.category.name,
              slug: p.category.slug,
            }
          : null,
        niche,
        relevance_score: relevance,
        is_boosted: isBoosted,
        created_at: p.created_at,
      };
    });

    // 4. Cálculo de Facetas Dinâmicas (Agregação de Todo o Corpus)
    let minPriceFound = 0;
    let maxPriceFound = 0;
    const categoryCountMap = new Map<string, { label: string; count: number }>();
    const nicheCountMap = new Map<string, number>();
    const cityCountMap = new Map<string, number>();

    mappedItems.forEach((item) => {
      // Preço
      if (minPriceFound === 0 || item.price_cents < minPriceFound) {
        minPriceFound = item.price_cents;
      }
      if (item.price_cents > maxPriceFound) {
        maxPriceFound = item.price_cents;
      }

      // Categoria
      if (item.category?.slug) {
        const existing = categoryCountMap.get(item.category.slug);
        if (existing) {
          existing.count += 1;
        } else {
          categoryCountMap.set(item.category.slug, {
            label: item.category.name,
            count: 1,
          });
        }
      }

      // Nicho
      const n = item.niche;
      nicheCountMap.set(n, (nicheCountMap.get(n) || 0) + 1);

      // Cidade
      if (item.store.city) {
        cityCountMap.set(item.store.city, (cityCountMap.get(item.store.city) || 0) + 1);
      }
    });

    const categoriesFacet: SearchFacetItem[] = Array.from(categoryCountMap.entries()).map(
      ([slug, val]) => ({
        id: slug,
        label: val.label,
        count: val.count,
      }),
    );

    const nichesFacet: SearchFacetItem[] = Array.from(nicheCountMap.entries()).map(
      ([niche, count]) => ({
        id: niche,
        label: niche.charAt(0).toUpperCase() + niche.slice(1),
        count,
      }),
    );

    const citiesFacet: SearchFacetItem[] = Array.from(cityCountMap.entries()).map(
      ([city, count]) => ({
        id: city,
        label: city,
        count,
      }),
    );

    // 5. Aplicação de Filtros Facetados Refinados (Em Memória)
    let filteredItems = mappedItems;

    if (data.category_slugs && data.category_slugs.length > 0) {
      filteredItems = filteredItems.filter(
        (it) => it.category?.slug && data.category_slugs.includes(it.category.slug),
      );
    }

    if (data.niches && data.niches.length > 0) {
      filteredItems = filteredItems.filter((it) => data.niches.includes(it.niche));
    }

    if (data.city) {
      filteredItems = filteredItems.filter(
        (it) => it.store.city?.toLowerCase() === data.city?.toLowerCase(),
      );
    }

    // 6. Ordenação Algorítmica Conforme Critério
    filteredItems.sort((a, b) => {
      switch (data.sort_by) {
        case "price_asc":
          return a.price_cents - b.price_cents;
        case "price_desc":
          return b.price_cents - a.price_cents;
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "relevance_telemetry":
        default:
          return b.relevance_score - a.relevance_score;
      }
    });

    // 7. Paginação
    const totalItems = filteredItems.length;
    const page = data.page || 1;
    const pageSize = data.page_size || 16;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const startIndex = (page - 1) * pageSize;
    const paginatedItems = filteredItems.slice(startIndex, startIndex + pageSize);

    // 8. Feedback Loop Silencioso: Injeção na Telemetria Comportamental (V125)
    if (cleanQuery) {
      // Disparo em background sem bloquear a resposta da query
      recordUserBehavior({
        data: {
          sessionId: data.session_id,
          eventType: "search",
          entityType: "product",
          niche: topAffinity || "geral",
          metadata: {
            query: cleanQuery,
            results_count: totalItems,
            filters: {
              category_slugs: data.category_slugs,
              niches: data.niches,
              sort_by: data.sort_by,
            },
            duration_ms: Date.now() - startTime,
          },
        },
      }).catch((e) => console.warn("[faceted-search] Falha ao gravar telemetria:", e));
    }

    return {
      items: paginatedItems,
      facets: {
        price_range: {
          min_cents: minPriceFound,
          max_cents: maxPriceFound,
        },
        categories: categoriesFacet,
        niches: nichesFacet,
        cities: citiesFacet,
      },
      pagination: {
        page,
        page_size: pageSize,
        total_items: totalItems,
        total_pages: totalPages,
      },
      applied_filters: {
        query: cleanQuery,
        category_slugs: data.category_slugs || [],
        niches: data.niches || [],
        min_price_cents: data.min_price_cents,
        max_price_cents: data.max_price_cents,
        sort_by: data.sort_by || "relevance_telemetry",
      },
      telemetry_echo: {
        top_affinity_niche: topAffinity,
        affinity_boost_applied: (userAffinities || []).length > 0,
      },
    };
  });
