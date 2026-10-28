import React, { useEffect } from "react";
import { Bell, ChevronDown, MapPin, Search, X } from "lucide-react";
import type { BaseSiteBlockProps, PrometheeNewsHeaderBlockData } from "@/types/omni-builder";
import { usePrometheePortalController } from "@/components/news/promethee-portal-store";
import { PrometheeLocationSheet } from "@/components/news/promethee-location-sheet";
import { PrometheeExploreSearchModal } from "@/components/news/promethee-explore-search-modal";
import { getStoredLocation } from "@/components/location/location-master-pill";

export function PrometheeWireframeDomeLogo({ className = "size-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M8 52H56M12 52V36C12 22.7452 20.9543 12 32 12C43.0457 12 52 22.7452 52 36V52"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M32 6V12M20 52V36C20 24.9543 25.3726 12 32 12C38.6274 12 44 24.9543 44 36V52"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M28 52V36C28 24.9543 29.7909 12 32 12C34.2091 12 36 24.9543 36 36V52"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M14 28H50M12 38H52M12 46H52"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export interface PrometheeNewsHeaderBlockProps extends BaseSiteBlockProps {
  data: PrometheeNewsHeaderBlockData;
  isEditing?: boolean;
}

export function PrometheeNewsHeaderBlock({
  id,
  className = "",
  styling,
  data,
  isEditing = false,
}: PrometheeNewsHeaderBlockProps) {
  const portal = usePrometheePortalController();
  const mastheadTitle = data?.brandName || data?.mastheadTitle || "Waesynews";
  const allCitiesLabel = data?.allCitiesLabel || "Todas as Cidades";

  useEffect(() => {
    if (isEditing) return;
    const stored = getStoredLocation();
    if (stored?.city && portal.selectedCity === "Todas as Cidades") {
      portal.setSelectedCity(stored.city);
    }
  }, [isEditing]);

  const inlineStyle: React.CSSProperties = {};
  if (styling?.backgroundColor) inlineStyle.backgroundColor = styling.backgroundColor;
  if (styling?.textColor) inlineStyle.color = styling.textColor;

  const activeCityLabel =
    portal.selectedCity === "Todas as Cidades" ? allCitiesLabel : portal.selectedCity;

  return (
    <header
      id={id}
      style={inlineStyle}
      className={`sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur-md text-foreground ${className}`}
    >
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-2">
        {/* Marca Editorial Limpa */}
        <button
          type="button"
          onClick={() => {
            portal.openArticle(null);
            portal.setSelectedTab("Para você");
          }}
          className="min-h-11 flex items-center gap-3 text-left rounded-2xl px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-w-0"
        >
          {data?.logoStyle === "custom_image" && data?.logoUrl ? (
            <img
              src={data.logoUrl}
              alt={mastheadTitle}
              className="size-9 rounded-xl object-contain shrink-0"
            />
          ) : (
            <span className="size-10 rounded-2xl border border-border bg-muted/30 flex items-center justify-center shrink-0">
              <PrometheeWireframeDomeLogo className="size-7 text-foreground" />
            </span>
          )}
          <span className="text-base sm:text-xl font-black tracking-tight text-foreground leading-tight">
            {mastheadTitle}
          </span>
        </button>

        {/* Controles Minimalistas: Ícones 44px no Mobile sem comprimir o topo */}
        <div className="flex items-center gap-2 shrink-0">
          {data?.showCityFilter !== false && (
            <button
              type="button"
              onClick={() => portal.setIsLocationSheetOpen(true)}
              className="h-11 min-h-11 px-3 rounded-full border border-border bg-muted/30 hover:bg-muted flex items-center gap-2 text-xs font-semibold text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Filtrar cidade: ${activeCityLabel}`}
            >
              <MapPin className="size-4 text-foreground shrink-0" />
              <span className="hidden sm:inline max-w-36 overflow-hidden whitespace-nowrap">
                {activeCityLabel}
              </span>
              <ChevronDown className="hidden sm:inline size-3 text-muted-foreground" />
            </button>
          )}

          {data?.showSearch !== false && (
            <button
              type="button"
              onClick={() => portal.setIsSearchOpen((prev) => !prev)}
              className="size-11 min-h-11 rounded-full border border-border bg-muted/30 hover:bg-muted flex items-center justify-center text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Buscar notícias"
            >
              {portal.isSearchOpen ? <X className="size-4" /> : <Search className="size-4" />}
            </button>
          )}

          {data?.showUrgentBell !== false && (
            <button
              type="button"
              onClick={() => portal.setSelectedTab("Urgente")}
              className="size-11 min-h-11 rounded-full border border-border bg-muted/30 hover:bg-muted flex items-center justify-center text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Plantão Urgente"
            >
              <Bell className="size-4" />
            </button>
          )}

          {data?.actionLabel && data?.actionHref && (
            <a
              href={isEditing ? undefined : data.actionHref}
              onClick={(e) => {
                if (isEditing) e.preventDefault();
              }}
              className="hidden md:inline-flex h-11 min-h-11 px-4 rounded-full bg-foreground text-background hover:bg-foreground/90 items-center justify-center text-xs font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {data.actionLabel}
            </a>
          )}
        </div>
      </div>

      {/* Campo de Busca Sob Demanda */}
      {portal.isSearchOpen && (
        <div className="mx-auto max-w-6xl px-4 pb-3">
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/30 px-3 h-11 min-h-11">
            <Search className="size-4 text-muted-foreground shrink-0" />
            <input
              type="search"
              value={portal.searchQuery}
              onChange={(e) => portal.setSearchQuery(e.target.value)}
              placeholder="Pesquisar fatos, bairros ou temas..."
              className="w-full h-11 min-h-11 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            {portal.searchQuery && (
              <button
                type="button"
                onClick={() => portal.setSearchQuery("")}
                className="size-11 min-h-11 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Limpar pesquisa"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>
      )}

      <PrometheeLocationSheet
        isOpen={portal.isLocationSheetOpen}
        selectedCity={portal.selectedCity}
        allCitiesLabel={allCitiesLabel}
        presetCities={data?.cities || []}
        onSelectCity={(city) => portal.setSelectedCity(city)}
        onClose={() => portal.setIsLocationSheetOpen(false)}
      />

      <PrometheeExploreSearchModal
        isOpen={portal.isSearchOpen}
        onClose={() => portal.setIsSearchOpen(false)}
        articles={portal.citizenArticles}
        onSelectArticle={(art) => portal.openArticle(art)}
        onSelectCity={(city) => portal.setSelectedCity(city)}
        onSelectSearchQuery={(query) => portal.setSearchQuery(query)}
        initialQuery={portal.searchQuery}
      />
    </header>
  );
}
