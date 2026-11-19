import { createFileRoute, Link } from "@tanstack/react-router";
import { Tag } from "lucide-react";
import { buildUniversalHead } from "@/lib/seo/universal-seo-head";
import { RouteErrorFallback } from "@/components/state/route-error-fallback";
import { BannerHeroCarousel } from "@/components/commerce/banner-hero-carousel";
import { HotpagesRail } from "@/components/commerce/hotpages-rail";
import { NativeMobileHeader } from "@/components/navigation/native-mobile-header";
import { resolveActiveCity } from "@/lib/city-helper";
import { listActiveBanners } from "@/services/banner.functions";
import { listHotpages } from "@/services/hotpage.functions";
import { getPublicClassifieds } from "@/services/classifieds.functions";
import { resolveSurfacePageExperienceDocument } from "@/services/surface-cms.functions";
import { OmniPageRenderer } from "@/components/builder/OmniPageRenderer";
import {
  useClassifiedCatalog,
  ClassifiedCatalogHeader,
  ClassifiedFilterSheet,
  ClassifiedCatalogGrid,
  CLASSIFIEDS_HOTPAGES,
} from "@/components/classifieds/catalog";

export const Route = createFileRoute("/_store/classificados/")({
  validateSearch: (search: Record<string, unknown>): {
    category?: string;
    dealType?: string;
    search?: string;
    subniche?: string;
    ponto?: string;
  } => ({
    category: typeof search.category === "string" ? search.category : undefined,
    dealType: typeof search.dealType === "string" ? search.dealType : undefined,
    search: typeof search.search === "string" ? search.search : undefined,
    subniche: typeof search.subniche === "string" ? search.subniche : undefined,
    ponto: typeof search.ponto === "string" ? search.ponto : undefined,
  }),
  head: () =>
    buildUniversalHead({
      title: "Classificados, Imóveis e Desapegos | Waesy",
      description:
        "Compre, alugue imóveis, reserve hospedagens por temporada, veículos e serviços na sua região com garantia e segurança.",
      path: "/classificados",
      ogType: "website",
      webmcpType: "classifieds_index",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Classificados Waesy",
        description: "Catálogo comunitário de imóveis, veículos, empregos e desapegos locais.",
        url: "https://waesy.com.br/classificados",
      },
    }),
  loader: async ({ location }) => {
    const activeCity = resolveActiveCity(location?.search);
    try {
      const [banners, hotpages, classifieds, surfaceExperience] = await Promise.all([
        listActiveBanners({ data: { placement: "classificados", city: activeCity } }).catch(() => []),
        listHotpages({ data: { module: "classificados" } }).catch(() => []),
        getPublicClassifieds({ data: {} }).catch(() => []),
        resolveSurfacePageExperienceDocument({
          data: { surfaceSlug: "classificados", city: activeCity },
        }).catch(() => ({ mode: "canonical_cms" as const, documentId: null, document: null, liveData: null })),
      ]);

      return {
        banners: banners || [],
        hotpages: hotpages || [],
        classifieds: classifieds || [],
        surfaceExperience: surfaceExperience || null,
      };
    } catch (err) {
      console.warn("[classificados] Loader fallback acionado:", err);
      return { banners: [], hotpages: [], classifieds: [] };
    }
  },
  errorComponent: ({ error, reset }) => (
    <RouteErrorFallback
      error={error}
      reset={reset}
      icon={Tag}
      title="Falha ao Carregar Classificados"
      description="Não foi possível sincronizar o catálogo de classificados e desapegos no momento."
      showErrorDetails
    />
  ),
  component: ClassifiedsMasterPage,
});

function ClassifiedsMasterPage() {
  const { banners = [], hotpages = [], classifieds: initialClassifieds = [], surfaceExperience = null } = (Route.useLoaderData() as any) || {};
  const searchParams = Route.useSearch();

  const catalog = useClassifiedCatalog({
    initialClassifieds,
    hotpages,
    searchParams,
  });

  if (surfaceExperience?.mode === "omni_published" && surfaceExperience.document) {
    const live = surfaceExperience.liveData || {};
    return (
      <main className="min-h-screen bg-background pb-24">
        <OmniPageRenderer
          document={surfaceExperience.document}
          classifieds={live.classifieds?.length ? live.classifieds : initialClassifieds}
          banners={live.banners?.length ? live.banners : banners}
          hotpages={live.hotpages?.length ? live.hotpages : hotpages}
          stores={live.stores?.length ? live.stores : []}
        />
      </main>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto pb-24">
      <NativeMobileHeader
        title="Classificados"
        centerTitle
        backTo="/"
        searchValue={catalog.search}
        onSearchChange={catalog.setSearch}
        searchPlaceholder="Buscar imóveis, carros, serviços..."
        onFilterClick={() => catalog.setMobileFilterSheetOpen(true)}
        activeFiltersCount={catalog.activeFiltersCount}
      />

      {/* ── Cabeçalho Inpage Desktop (Apple HIG) ── */}
      <div className="hidden md:flex items-center justify-between pt-4 pb-3 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Classificados</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Anúncios diretos, veículos, imóveis, serviços e produtos da sua comunidade
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/marketplace"
            className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold bg-muted/60 text-muted-foreground hover:text-foreground transition-colors inline-flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary"
          >
            Marketplace ↗
          </Link>
          <Link
            to="/diretorio"
            className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold bg-muted/60 text-muted-foreground hover:text-foreground transition-colors inline-flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary"
          >
            Guia de Empresas ↗
          </Link>
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4 pt-2 sm:pt-4">

        {/* Barra de controle superior */}
        <ClassifiedCatalogHeader
          search={catalog.search}
          onSearchChange={catalog.setSearch}
          activeFiltersCount={catalog.activeFiltersCount}
          onOpenFilters={() => catalog.setMobileFilterSheetOpen(true)}
          viewMode={catalog.viewMode}
          onViewModeChange={catalog.setViewMode}
          categoryChips={catalog.dynamicCategoryChips}
          selectedCategory={catalog.selectedCategory}
          onSelectCategory={(catId) => {
            catalog.setSelectedCategory(catId);
            if (catId !== "real_estate") catalog.setSelectedDealType("todos");
          }}
        />

        {/* 1. Banners Contextuais */}
        {banners && banners.length > 0 && (
          <section aria-label="Banners de Classificados">
            <BannerHeroCarousel banners={banners} />
          </section>
        )}

        {/* 2. Hotpages Horizontal Rail */}
        {(hotpages?.length > 0 || CLASSIFIEDS_HOTPAGES.length > 0) && (
          <section aria-label="Destaques de Classificados">
            <HotpagesRail
              hotpages={(hotpages && hotpages.length > 0 ? hotpages : CLASSIFIEDS_HOTPAGES) as any}
              activeSlug={catalog.selectedCategory}
              onSelect={(slug) => {
                if (slug === "real_estate_temporada") {
                  catalog.setSelectedCategory("real_estate");
                  catalog.setSelectedDealType("temporada");
                } else {
                  catalog.setSelectedCategory(slug);
                  catalog.setSelectedDealType("todos");
                }
              }}
            />
          </section>
        )}

        {/* 3. Modal de Filtros Avançados */}
        <ClassifiedFilterSheet
          open={catalog.mobileFilterSheetOpen}
          onOpenChange={catalog.setMobileFilterSheetOpen}
          activeFiltersCount={catalog.activeFiltersCount}
          filteredCount={catalog.filtered.length}
          onClearAll={catalog.handleClearAllFilters}
          selectedCity={catalog.selectedCity}
          onSelectCity={catalog.setSelectedCity}
          onlyBoosted={catalog.onlyBoosted}
          onToggleBoosted={catalog.setOnlyBoosted}
          onlyTrade={catalog.onlyTrade}
          onToggleTrade={catalog.setOnlyTrade}
          onlyInstallments={catalog.onlyInstallments}
          onToggleInstallments={catalog.setOnlyInstallments}
          selectedDelivery={catalog.selectedDelivery}
          onSelectDelivery={catalog.setSelectedDelivery}
          selectedCategory={catalog.selectedCategory}
          selectedDealType={catalog.selectedDealType}
          onSelectDealType={catalog.setSelectedDealType}
          selectedAmenities={catalog.selectedAmenities}
          onToggleAmenity={catalog.toggleAmenity}
          vehicleGearbox={catalog.vehicleGearbox}
          onSelectVehicleGearbox={catalog.setVehicleGearbox}
          vehicleFuel={catalog.vehicleFuel}
          onSelectVehicleFuel={catalog.setVehicleFuel}
          onlySingleOwner={catalog.onlySingleOwner}
          onToggleSingleOwner={catalog.setOnlySingleOwner}
          selectedSubcategory={catalog.selectedSubcategory}
          onSelectSubcategory={catalog.setSelectedSubcategory}
          foodSubniche={catalog.foodSubniche}
          onSelectFoodSubniche={catalog.setFoodSubniche}
          serviceAudience={catalog.serviceAudience}
          onSelectServiceAudience={catalog.setServiceAudience}
          serviceSubniche={catalog.serviceSubniche}
          onSelectServiceSubniche={catalog.setServiceSubniche}
          selectedServiceModality={catalog.selectedServiceModality}
          onSelectServiceModality={catalog.setSelectedServiceModality}
          businessGoal={catalog.businessGoal}
          onSelectBusinessGoal={catalog.setBusinessGoal}
          businessPointType={catalog.businessPointType}
          onSelectBusinessPointType={catalog.setBusinessPointType}
          onlyBusinessWithNda={catalog.onlyBusinessWithNda}
          onToggleBusinessWithNda={catalog.setOnlyBusinessWithNda}
          selectedJobRegime={catalog.selectedJobRegime}
          onSelectJobRegime={catalog.setSelectedJobRegime}
          onlyInstantDigital={catalog.onlyInstantDigital}
          onToggleInstantDigital={catalog.setOnlyInstantDigital}
          agriSubcategory={catalog.agriSubcategory}
          onSelectAgriSubcategory={catalog.setAgriSubcategory}
          agriTraction={catalog.agriTraction}
          onSelectAgriTraction={catalog.setAgriTraction}
          pharmacySubniche={catalog.pharmacySubniche}
          onSelectPharmacySubniche={catalog.setPharmacySubniche}
          onlyPrescription={catalog.onlyPrescription}
          onToggleOnlyPrescription={catalog.setOnlyPrescription}
          eventType={catalog.eventType}
          onSelectEventType={catalog.setEventType}
        />

        {/* 4. Grade / Feed / Lista de Itens */}
        <ClassifiedCatalogGrid
          items={catalog.filtered}
          viewMode={catalog.viewMode}
          selectedCategory={catalog.selectedCategory}
          onSelectCategory={catalog.setSelectedCategory}
          onSetGridMode={() => catalog.setViewMode("grid")}
          hasActiveFilters={catalog.activeFiltersCount > 0}
          onClearFilters={catalog.handleClearAllFilters}
        />
      </div>
    </div>
  );
}
