/**
 * places-detail.functions.ts — BFF Server Functions para Detalhe do Estabelecimento (Places)
 *
 * Fase F09 do Plano Mestre de Estabilização dos 4 Pilares.
 * Invariantes: M01 (Zero Mocks), M02 (SSR / Hidratação Limpa), M10 (Isolamento de Pilares: Places = Estabelecimentos Físicos).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAnonServerClient } from "@/lib/supabase";

export interface PlaceReviewItem {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface PlaceDetailDTO {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  address: string;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  website: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  galleryImages: string[];
  operatingHours: Record<string, string> | null;
  isVerified: boolean;
  ratingAverage: number;
  reviewsCount: number;
  hasMarketplaceShowcase: boolean;
  reviews: PlaceReviewItem[];
}

export const placeDetailInputSchema = z.object({
  slug: z.string().trim().min(1, "Slug do estabelecimento é obrigatório"),
});

export const getPlaceDetailBySlugFn = createServerFn({ method: "GET" })
  .validator(placeDetailInputSchema)
  .handler(async ({ data }): Promise<PlaceDetailDTO | null> => {
    const supabase = getAnonServerClient();
    const cleanSlug = data.slug.trim().toLowerCase();

    // 1. Tentar localizar na tabela de diretório físico ou stores
    // Busca em directory_listings primeiro
    const { data: dirItem } = await supabase
      .from("directory_listings")
      .select(
        `
        id,
        store_id,
        business_name,
        category,
        description,
        address,
        latitude,
        longitude,
        contact_phone,
        contact_whatsapp,
        contact_email,
        website_url,
        working_hours,
        is_verified,
        rating,
        reviews_count,
        avatar_url,
        banner_url,
        status,
        stores:stores!directory_listings_store_id_fkey(
          id,
          name,
          slug,
          settings,
          is_physical_location
        )
      `
      )
      .eq("status", "active")
      .or(`id.eq.${cleanSlug},business_name.ilike.%${cleanSlug}%`)
      .limit(1)
      .maybeSingle();

    let storeId: string | null = null;
    let placeDetail: PlaceDetailDTO | null = null;

    if (dirItem) {
      storeId = dirItem.store_id || null;
      const associatedStore = Array.isArray(dirItem.stores) ? dirItem.stores[0] : dirItem.stores;
      const slugVal = associatedStore?.slug || dirItem.id;

      placeDetail = {
        id: dirItem.id,
        name: dirItem.business_name || "Estabelecimento Local",
        slug: slugVal,
        category: dirItem.category || "Comércio Local",
        description: dirItem.description || "",
        address: dirItem.address || "Endereço sob consulta",
        city: "São Miguel do Oeste",
        state: "SC",
        latitude: dirItem.latitude || null,
        longitude: dirItem.longitude || null,
        phone: dirItem.contact_phone || null,
        whatsapp: dirItem.contact_whatsapp || null,
        instagram: null,
        website: dirItem.website_url || null,
        avatarUrl: dirItem.avatar_url || null,
        bannerUrl: dirItem.banner_url || null,
        galleryImages: [],
        operatingHours: dirItem.working_hours || null,
        isVerified: Boolean(dirItem.is_verified),
        ratingAverage: Number(dirItem.rating || 5.0),
        reviewsCount: Number(dirItem.reviews_count || 0),
        hasMarketplaceShowcase: false,
        reviews: [],
      };
    } else {
      // 2. Tentar na tabela stores diretamente (estabelecimentos cadastrados como store)
      const { data: storeItem } = await supabase
        .from("stores")
        .select(
          `
          id,
          name,
          slug,
          settings,
          is_physical_location,
          created_at
        `
        )
        .or(`slug.eq.${cleanSlug},id.eq.${cleanSlug}`)
        .limit(1)
        .maybeSingle();

      if (storeItem) {
        storeId = storeItem.id;
        const settings = (storeItem.settings as Record<string, any>) || {};

        placeDetail = {
          id: storeItem.id,
          name: storeItem.name || "Estabelecimento Comercial",
          slug: storeItem.slug || storeItem.id,
          category: settings.category || settings.segment || "Empresa Verificada",
          description: settings.description || settings.bio || "",
          address: settings.address || settings.street || "Endereço no Guia Oficial",
          city: settings.city || "São Miguel do Oeste",
          state: settings.state || "SC",
          latitude: settings.latitude ? Number(settings.latitude) : null,
          longitude: settings.longitude ? Number(settings.longitude) : null,
          phone: settings.phone || null,
          whatsapp: settings.whatsapp || settings.contact_phone || null,
          instagram: settings.instagram || null,
          website: settings.website || null,
          avatarUrl: settings.logo_url || settings.avatar_url || null,
          bannerUrl: settings.banner_url || settings.cover_url || null,
          galleryImages: Array.isArray(settings.gallery) ? settings.gallery : [],
          operatingHours: settings.operating_hours || settings.working_hours || null,
          isVerified: Boolean(settings.is_verified ?? true),
          ratingAverage: Number(settings.rating || 5.0),
          reviewsCount: Number(settings.reviews_count || 0),
          hasMarketplaceShowcase: false,
          reviews: [],
        };
      }
    }

    if (placeDetail === null) {
      return null;
    }

    // 3. Buscar avaliações reais se tiver storeId
    if (storeId) {
      const { data: reviewsData } = await supabase
        .from("reviews")
        .select("id, rating, comment, author_name, created_at")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (reviewsData && reviewsData.length > 0) {
        placeDetail.reviews = reviewsData.map((r) => ({
          id: r.id,
          authorName: r.author_name || "Cliente Verificado",
          rating: Number(r.rating || 5),
          comment: r.comment || "",
          createdAt: r.created_at,
        }));
        placeDetail.reviewsCount = reviewsData.length;
        const totalRating = reviewsData.reduce((acc, curr) => acc + Number(curr.rating || 5), 0);
        placeDetail.ratingAverage = Number((totalRating / reviewsData.length).toFixed(1));
      }

      // 4. Checar se possui vitrine com produtos no Marketplace (Pilar 3)
      const { count: productCount } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId)
        .in("status", ["active", "published"]);

      placeDetail.hasMarketplaceShowcase = Boolean(productCount && productCount > 0);
    }

    return placeDetail;
  });
