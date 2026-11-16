import { useMemo, useState } from "react";
import type { ViewModeType } from "@/components/commerce/discovery-control-bar";
import type { VitrineEngineMode } from "@/types/marketplace-compliance";
import { formatMoney } from "@/lib/money";
import { HomeMobileNativeApp } from "@/components/home/HomeMobileNativeApp";
import { HomeDesktopWebApp } from "@/components/home/HomeDesktopWebApp";
import { OmniPageRenderer } from "@/components/builder/OmniPageRenderer";
import { useEffectiveViewport } from "@/design-system/vitrine";
import type { HomePageSectionDTO } from "@/services/admin-home-cms.functions";
import type { RaffleDTO } from "@/services/invite.functions";
import {
  buildUnifiedCommunityItems,
  COMMUNITY_DISCOVERY_CATEGORIES,
} from "@/lib/community-home-items";

const CANONICAL_MANAGED_KEYS = new Set([
  "promo_coupon_banner",
  "quick_categories_ifood",
  "hero_banners",
  "recent_stores_rail",
  "feature_mini_banners",
  "spotlight_restaurants",
  "spotlight_pharmacies",
  "filter_chips_bar",
  "stores_feed_list",
  "marketplace_products_rail",
  "classifieds_rail",
  "jobs_rail",
  "vitrine_engine_selector",
  "discovery_control_bar",
  "dual_line_filter_pills",
  "hotpages_grid",
  "marketplace_categories",
  "places_directory_rail",
  "social_posts_vitrine",
  "news_rail",
  "events_rail",
  "procedural_infinite_feed",
]);

export function CommunityMarketplaceExperience({ data }: { data: any }) {
  const {
    banners = [],
    middleBanners = [],
    footerBanners = [],
    editorialHotpages = [],
    marketplaceProducts = [],
    placesListings = [],
    classifieds = [],
    jobs = [],
    events = [],
    newsArticles = [],
    feedPosts = [],
    concursos = [],
    homeSections = [],
    showcasePosts = [],
  } = data || {};

  const heroSection = useMemo(
    () => (homeSections as HomePageSectionDTO[]).find((s) => s.section_key === "hero_banners" && s.is_active),
    [homeSections],
  );
  const quickCategoriesSection = useMemo(
    () => (homeSections as HomePageSectionDTO[]).find((s) => s.section_key === "quick_categories_ifood" && s.is_active),
    [homeSections],
  );
  const customSections = useMemo(
    () => (homeSections as HomePageSectionDTO[]).filter((s) => s.is_active && !CANONICAL_MANAGED_KEYS.has(s.section_key)),
    [homeSections],
  );
  const socialPostsSection = useMemo(
    () => (homeSections as HomePageSectionDTO[]).find((s) => s.section_key === "social_posts_vitrine"),
    [homeSections],
  );

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("todos");
  const [viewMode, setViewMode] = useState<ViewModeType>("feed");
  const [engineMode, setEngineMode] = useState<VitrineEngineMode>("empresas");

  const term = search.trim().toLowerCase();
  const match = (fields: unknown[]) =>
    !term || fields.some((v) => String(v || "").toLowerCase().includes(term));

  const filteredPlaces = useMemo(
    () => placesListings.filter((p: any) => match([p.business_name, p.category, p.address])),
    [placesListings, term],
  );
  const filteredClassifieds = useMemo(
    () => classifieds.filter((c: any) => match([c.title, c.category, c.location_name])),
    [classifieds, term],
  );
  const filteredFeed = useMemo(
    () => feedPosts.filter((f: any) => match([f.content_text, f.profiles?.full_name, f.location_name])),
    [feedPosts, term],
  );
  const filteredNews = useMemo(
    () => newsArticles.filter((n: any) => match([n.title, n.summary, n.category])),
    [newsArticles, term],
  );
  const filteredJobs = useMemo(
    () => jobs.filter((j: any) => match([j.title, j.company_name, j.location])),
    [jobs, term],
  );
  const filteredEvents = useMemo(
    () => events.filter((e: any) => match([e.title, e.category, e.location])),
    [events, term],
  );
  const filteredConcursos = useMemo(
    () => concursos.filter((c: RaffleDTO) => match([c.title, c.storeName, c.description])),
    [concursos, term],
  );
  const filteredMarketplaceProducts = useMemo(
    () => marketplaceProducts.filter((m: any) => match([m.title, m.store_name])),
    [marketplaceProducts, term],
  );

  const unifiedItems = useMemo(
    () =>
      buildUnifiedCommunityItems({
        activeCategory,
        filteredMarketplaceProducts,
        filteredPlaces,
        filteredClassifieds,
        filteredFeed,
        filteredNews,
        filteredJobs,
        filteredEvents,
        filteredConcursos,
      }),
    [
      activeCategory,
      filteredMarketplaceProducts,
      filteredPlaces,
      filteredClassifieds,
      filteredFeed,
      filteredNews,
      filteredJobs,
      filteredEvents,
      filteredConcursos,
    ],
  );

  const sharedViewProps = {
    homeSections: homeSections as HomePageSectionDTO[],
    heroSection,
    quickCategoriesSection,
    socialPostsSection,
    customSections,
    editorialHotpages,
    banners,
    middleBanners,
    footerBanners,
    showcasePosts,
    engineMode,
    onEngineModeChange: setEngineMode,
    search,
    onSearchChange: setSearch,
    categories: COMMUNITY_DISCOVERY_CATEGORIES,
    activeCategory,
    onSelectCategory: setActiveCategory,
    viewMode,
    onViewModeChange: setViewMode,
    filteredPlaces,
    filteredMarketplaceProducts,
    filteredClassifieds,
    filteredNews,
    filteredJobs,
    filteredEvents,
    unifiedItems,
    formatMoney,
    session: data?.session,
  };

  const { isCompact } = useEffectiveViewport();

  return (
    <div className="space-y-6">
      <section aria-label="Apresentação Institucional Waesy Explorer" className="sr-only">
        <h1>Waesy Explorer da Sua Cidade</h1>
        <p>
          Explore lojas verificadas com CNPJ, ofertas do marketplace regional, classificados, vagas de emprego, agenda cultural e notícias locais.
        </p>
      </section>

      {data?.surfaceExperience?.mode === "omni_published" && data.surfaceExperience.document ? (
        <OmniPageRenderer
          document={data.surfaceExperience.document}
          products={data.surfaceExperience.liveData?.products?.length ? data.surfaceExperience.liveData.products : marketplaceProducts}
          stores={data.surfaceExperience.liveData?.stores?.length ? data.surfaceExperience.liveData.stores : placesListings}
          banners={data.surfaceExperience.liveData?.banners?.length ? data.surfaceExperience.liveData.banners : banners}
          newsArticles={data.surfaceExperience.liveData?.newsArticles?.length ? data.surfaceExperience.liveData.newsArticles : newsArticles}
          events={data.surfaceExperience.liveData?.events?.length ? data.surfaceExperience.liveData.events : events}
          jobs={data.surfaceExperience.liveData?.jobs?.length ? data.surfaceExperience.liveData.jobs : jobs}
          classifieds={data.surfaceExperience.liveData?.classifieds?.length ? data.surfaceExperience.liveData.classifieds : classifieds}
          hotpages={data.surfaceExperience.liveData?.hotpages?.length ? data.surfaceExperience.liveData.hotpages : editorialHotpages}
          posts={data.surfaceExperience.liveData?.posts?.length ? data.surfaceExperience.liveData.posts : feedPosts}
        />
      ) : isCompact ? (
        <HomeMobileNativeApp {...sharedViewProps} />
      ) : (
        <HomeDesktopWebApp {...sharedViewProps} />
      )}
    </div>
  );
}
