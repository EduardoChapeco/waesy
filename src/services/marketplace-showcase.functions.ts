/**
 * marketplace-showcase.functions.ts — BFF da Vitrine Pública de Loja no Marketplace
 *
 * Fase F07 do Plano Mestre de Estabilização dos 4 Pilares.
 *
 * Busca perfil público e produtos ativos de uma loja credenciada (Workspace Pro)
 * para exibição canônica na rota /marketplace/:storeSlug com SSR e SEO completo.
 *
 * Zero Mocks: consultas reais no Supabase com getAnonServerClient().
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAnonServerClient, SupabaseUnconfiguredError } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Schemas e Tipos DTO
// ---------------------------------------------------------------------------

export const marketplaceStoreParamSchema = z.object({
  storeSlug: z.string().min(1),
});

export interface MarketplaceStoreProfileDTO {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  niche: string | null;
  isVerified: boolean;
}

export interface MarketplaceProductDTO {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  priceCents: number;
  compareAtCents: number | null;
  imageUrl: string | null;
  images: string[];
  status: string;
  category: string | null;
  createdAt: string;
}

export interface MarketplaceShowcaseResult {
  store: MarketplaceStoreProfileDTO | null;
  products: MarketplaceProductDTO[];
}

// ---------------------------------------------------------------------------
// getMarketplaceStoreShowcaseFn
// ---------------------------------------------------------------------------

export const getMarketplaceStoreShowcaseFn = createServerFn({ method: "GET" })
  .validator((input: { storeSlug: string }) => marketplaceStoreParamSchema.parse(input))
  .handler(async ({ data: { storeSlug } }): Promise<MarketplaceShowcaseResult> => {
    try {
      const db = getAnonServerClient();
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          storeSlug
        );

      // 1. Buscar a Loja Credenciada
      let storeQuery = db
        .from("stores")
        .select(
          "id, name, slug, description, phone, email, address, city, state, logo_url, banner_url, settings"
        );

      if (isUuid) {
        storeQuery = storeQuery.eq("id", storeSlug);
      } else {
        storeQuery = storeQuery.eq("slug", storeSlug);
      }

      const { data: rawStore, error: storeErr } = await storeQuery.maybeSingle();

      if (storeErr || rawStore === null || rawStore === undefined) {
        return { store: null, products: [] };
      }

      const settings = (rawStore.settings ?? {}) as Record<string, any>;
      const resolvedLogo =
        (rawStore.logo_url as string | null) ||
        (typeof settings.logoUrl === "string" ? settings.logoUrl : null) ||
        (typeof settings.logo_url === "string" ? settings.logo_url : null) ||
        null;

      const resolvedBanner =
        (rawStore.banner_url as string | null) ||
        (typeof settings.bannerUrl === "string" ? settings.bannerUrl : null) ||
        (typeof settings.banner_url === "string" ? settings.banner_url : null) ||
        (typeof settings.cover_url === "string" ? settings.cover_url : null) ||
        null;

      const store: MarketplaceStoreProfileDTO = {
        id: rawStore.id,
        name: rawStore.name || "Empresa Verificada",
        slug: rawStore.slug || storeSlug,
        description: rawStore.description ?? null,
        phone: rawStore.phone ?? null,
        email: rawStore.email ?? null,
        address: rawStore.address ?? null,
        city: rawStore.city ?? null,
        state: rawStore.state ?? null,
        logoUrl: resolvedLogo,
        bannerUrl: resolvedBanner,
        niche: settings.segment || settings.niche || null,
        isVerified: true, // Lojas registradas em Workspace Pro
      };

      // 2. Buscar Produtos da Loja Ativos/Publicados
      const { data: rawProducts, error: prodErr } = await db
        .from("products")
        .select(
          `id, title, slug, description, price_cents, compare_at_cents, status, created_at,
           product_media(url, alt, sort_order),
           attributes`
        )
        .eq("store_id", store.id)
        .in("status", ["published", "active"])
        .order("created_at", { ascending: false })
        .limit(60);

      if (prodErr || rawProducts === null || rawProducts === undefined) {
        return { store, products: [] };
      }

      const products: MarketplaceProductDTO[] = rawProducts.map((p: any) => {
        const mediaList = Array.isArray(p.product_media)
          ? [...p.product_media].sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
          : [];

        const mediaUrls = mediaList.map((m: any) => m.url).filter(Boolean);
        const attrImages = Array.isArray(p.attributes?.images) ? p.attributes.images : [];
        const allImages = mediaUrls.length > 0 ? mediaUrls : attrImages;

        return {
          id: p.id,
          title: p.title || "Produto sem título",
          slug: p.slug || p.id,
          description: p.description ?? null,
          priceCents: p.price_cents ?? 0,
          compareAtCents: p.compare_at_cents ?? null,
          imageUrl: allImages[0] ?? null,
          images: allImages,
          status: p.status,
          category: p.attributes?.category ?? null,
          createdAt: p.created_at,
        };
      });

      return { store, products };
    } catch (err: unknown) {
      if (err instanceof SupabaseUnconfiguredError) {
        return { store: null, products: [] };
      }
      console.warn("[marketplace-showcase] Erro no loader:", err);
      return { store: null, products: [] };
    }
  });
