import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Tag, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BannerHeroCarousel } from "@/components/commerce/banner-hero-carousel";
import { HotpagesRail } from "@/components/commerce/hotpages-rail";
import { NativeMobileHeader } from "@/components/navigation/native-mobile-header";
import { resolveActiveCity } from "@/lib/city-helper";
import { listActiveBanners } from "@/services/banner.functions";
import { listHotpages } from "@/services/hotpage.functions";
import { getPublicClassifieds } from "@/services/classifieds.functions";
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
  head: () => ({
    meta: [
      { title: "Classificados, Imóveis e Desapegos | Waesy" },
      {
        name: "description",
        content:
          "Compre, alugue imóveis, reserve hospedagens por temporada, veículos e serviços na sua região.",
      },
    ],
  }),
  loader: async ({ location }) => {
    const activeCity = resolveActiveCity(location?.search);
    try {
      const [banners, hotpages, classifieds] = await Promise.all([
        listActiveBanners({ data: { placement: "classificados", city: activeCity } }).catch(() => []),
        listHotpages({ data: { module: "classificados" } }).catch(() => []),
        getPublicClassifieds({ data: {} }).catch(() => []),
      ]);

      return {
        banners: banners || [],
        hotpages: hotpages || [],
        classifieds: classifieds || [],
      };
    } catch (err) {
      console.warn("[classificados] Loader fallback acionado:", err);
      return { banners: [], hotpages: [], classifieds: [] };
    }
  },
  errorComponent: ClassifiedsIndexErrorComponent,
  component: ClassifiedsMasterPage,
});

function ClassifiedsIndexErrorComponent({ error }: { error: any }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center space-y-4">
      <div className="inline-flex size-14 items-center justify-center rounded-lg bg-destructive/10 text-destructive mb-1">
        <Tag className="size-7" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-foreground">Falha ao Carregar Classificados</h1>
        <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
          Não foi possível sincronizar o catálogo de classificados e desapegos no momento.
        </p>
      </div>
      {error?.message && (
        <pre className="mt-2 rounded-lg bg-muted/40 border border-border/50 p-3 text-xs text-muted-foreground overflow-auto max-h-32 text-left font-mono">
          {error.message}
        </pre>
      )}
      <div className="pt-2 flex items-center justify-center gap-3">
        <Button
          variant="default"
          className="rounded-lg text-xs h-11 px-5 font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => window.location.reload()} /* focus-visible: */
        >
          <RefreshCw className="size-3.5 mr-2" />
          <span>Tentar Novamente</span>
        </Button>
      </div>
    </div>
  );
}

function ClassifiedsMasterPage() {
  const { banners = [], hotpages = [], classifieds: initialClassifieds = [] } = Route.useLoaderData();
  const searchParams = Route.useSearch();

  const catalog = useClassifiedCatalog({
    initialClassifieds,
    hotpages,
    searchParams,
  });

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

      <div className="px-4 sm:px-6 space-y-4 pt-2 sm:pt-4">
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
