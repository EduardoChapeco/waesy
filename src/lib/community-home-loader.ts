import { resolveActiveCity } from "@/lib/city-helper";
import { listActiveBanners } from "@/services/banner.functions";
import { listEditorialHotpages } from "@/services/hotpage.functions";
import { getMarketplaceFeed, type FlashOfferDTO } from "@/services/marketplace.functions";
import { listUnifiedListings } from "@/services/unified-listing.functions";
import type { UnifiedListing } from "@/types/unified-ad-engine";
import { getPublicDirectory } from "@/services/directory.functions";
import { getPublicClassifieds } from "@/services/classifieds.functions";
import { listPublicJobs } from "@/services/jobs.functions";
import { getPublicEvents } from "@/services/events.functions";
import { listPublicArticles } from "@/services/news.functions";
import { getMuralFeed, type MuralFeedResponse } from "@/services/social.functions";
import { getAllPublicConcursos } from "@/services/invite.functions";
import { getUserSession } from "@/services/auth.functions";
import { resolveSurfacePageExperienceDocument } from "@/services/surface-cms.functions";
import { listPublicHomePageSections, getUnifiedShowcasePosts } from "@/services/admin-home-cms.functions";
import { getPublicEcosystemSubsystemsFn } from "@/services/vertical-subsystems.functions";

export async function loadCommunityHomeData(locationSearch: unknown) {
  try {
    const filteredCity = resolveActiveCity(locationSearch as any);
    const [
      banners,
      middleBanners,
      footerBanners,
      editorialHotpages,
      marketplaceFeed,
      placesListings,
      classifieds,
      jobs,
      events,
      newsArticles,
      feedResponse,
      concursos,
      workspaceListings,
      homeSections,
      showcasePosts,
      session,
      surfaceExperience,
      ecosystemConfig,
    ] = await Promise.all([
      listActiveBanners({ data: { placement: "home", city: filteredCity } }).catch(() => []),
      listActiveBanners({ data: { placement: "home_middle", city: filteredCity } }).catch(() => []),
      listActiveBanners({ data: { placement: "home_footer", city: filteredCity } }).catch(() => []),
      listEditorialHotpages({ data: { module: "home" } }).catch(() => []),
      getMarketplaceFeed().catch(() => ({ sections: [], allProducts: [] })),
      getPublicDirectory({ data: { limit: 12, city: filteredCity } }).catch(() => []),
      getPublicClassifieds({ data: { limit: 12, city: filteredCity } }).catch(() => []),
      listPublicJobs({ data: { limit: 8, city: filteredCity } }).catch(() => []),
      getPublicEvents({ data: { limit: 8, city: filteredCity } }).catch(() => []),
      listPublicArticles({ data: { limit: 6, city: filteredCity } }).catch(() => []),
      getMuralFeed({ data: { limit: 8 } }).catch(() => ({ items: [] })),
      getAllPublicConcursos({ data: { filter: "all" } }).catch(() => []),
      listUnifiedListings({ data: { origin: "workspace", limit: 36 } }).catch(() => []),
      listPublicHomePageSections({ data: { city: filteredCity } }).catch(() => []),
      getUnifiedShowcasePosts({ data: { limit: 12, city: filteredCity } }).catch(() => []),
      getUserSession().catch(() => null),
      resolveSurfacePageExperienceDocument({ data: { surfaceSlug: "home", city: filteredCity } }).catch(
        () => ({ mode: "canonical_cms" as const, documentId: null, document: null, liveData: null }),
      ),
      getPublicEcosystemSubsystemsFn().catch(() => null),
    ]);

    const combinedMap = new Map<string, any>();
    for (const item of (workspaceListings || []) as UnifiedListing[]) {
      const origPrice = item.compare_at_cents || item.price_cents;
      const price = item.price_cents;
      const discount = origPrice > price ? Math.round(((origPrice - price) / origPrice) * 100) : 0;
      if (item.id) {
        combinedMap.set(item.id, {
          id: item.id,
          title: item.title,
          slug: item.slug || item.id,
          store_id: item.store_id,
          store_name: item.store_name || "Loja Credenciada",
          price_cents: price,
          original_price_cents: origPrice,
          discount_percent: discount,
          mechanic_label: discount > 0 ? `${discount}% OFF` : "Verificado",
          cover_image: item.cover_url || item.media_urls?.[0] || "",
          selling_unit: item.selling_unit || "un",
          in_stock: item.is_unlimited_stock || (item.stock_quantity ?? 1) > 0,
          has_flash_offer: discount > 0,
        });
      }
    }
    for (const p of marketplaceFeed?.allProducts || []) {
      if (p.id && !combinedMap.has(p.id)) combinedMap.set(p.id, p);
    }

    const searchObj = (locationSearch || {}) as Record<string, unknown>;
    return {
      banners: banners || [],
      middleBanners: middleBanners || [],
      footerBanners: footerBanners || [],
      editorialHotpages: editorialHotpages || [],
      marketplaceProducts: Array.from(combinedMap.values()) as FlashOfferDTO[],
      placesListings: placesListings || [],
      classifieds: classifieds || [],
      jobs: jobs || [],
      events: events || [],
      newsArticles: newsArticles || [],
      feedPosts: (feedResponse as MuralFeedResponse)?.items || [],
      concursos: concursos || [],
      homeSections: homeSections || [],
      showcasePosts: showcasePosts || [],
      session: session || null,
      surfaceExperience: surfaceExperience || null,
      ecosystemConfig: ecosystemConfig || null,
      forceVitrineMode: Boolean(searchObj.vitrine === "1" || searchObj.vitrine === "true"),
      activeCity: filteredCity,
    };
  } catch (err) {
    console.error("[loadCommunityHomeData] Erro ao carregar vitrine comunitária:", err);
    return {
      banners: [],
      middleBanners: [],
      footerBanners: [],
      editorialHotpages: [],
      marketplaceProducts: [],
      placesListings: [],
      classifieds: [],
      jobs: [],
      events: [],
      newsArticles: [],
      feedPosts: [],
      concursos: [],
      homeSections: [],
      showcasePosts: [],
      session: null,
      surfaceExperience: null,
      ecosystemConfig: null,
      forceVitrineMode: false,
    };
  }
}
