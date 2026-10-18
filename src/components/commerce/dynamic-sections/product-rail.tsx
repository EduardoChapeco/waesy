import { Link } from "@tanstack/react-router";
import { ChevronRight, ChevronLeft } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/commerce/product-card";
import type { ProductCardDTO } from "@/types/catalog";

export function ProductRail({
  content,
  title: topTitle,
  categoryId: topCategoryId,
  filterCategory: topFilterCategory,
  selectedProductIds: topSelectedIds,
  limit: topLimit,
  resolvedProducts,
  resolvedData,
  layout_variant,
  isEditing,
}: {
  content?: Record<string, unknown>;
  title?: string;
  categoryId?: string;
  filterCategory?: string;
  selectedProductIds?: string[];
  limit?: number;
  resolvedProducts?: any[];
  resolvedData?: any;
  layout_variant?: string | null;
  node_id?: string;
  block_type?: string;
  isEditing?: boolean;
}) {
  const safeContent = (content || {}) as Record<string, any>;
  const title = String(topTitle || safeContent.title || "Destaques");
  const slug = safeContent.collection_slug ? String(safeContent.collection_slug) : null;
  const layout = layout_variant || "carousel";

  const rawProducts: any[] =
    (Array.isArray(resolvedProducts) ? resolvedProducts : null) ??
    (Array.isArray(resolvedData) ? resolvedData : null) ??
    [];

  const activeCategoryFilter = String(
    topCategoryId || topFilterCategory || safeContent.categoryId || safeContent.filterCategory || ""
  ).trim();
  const rawSelected = topSelectedIds || safeContent.selectedProductIds;
  const selectedIds: string[] = Array.isArray(rawSelected) ? rawSelected.map(String) : [];
  const maxItems = Number(topLimit || safeContent.limit || 12);

  const productsToDisplay = rawProducts
    .filter((p) => {
      if (selectedIds.length > 0) {
        return selectedIds.includes(String(p.id));
      }
      if (activeCategoryFilter && activeCategoryFilter !== "all") {
        const lower = activeCategoryFilter.toLowerCase();
        return (
          String(p.category_id || "").toLowerCase() === lower ||
          String(p.category || "").toLowerCase() === lower ||
          String(p.category_slug || "").toLowerCase() === lower
        );
      }
      return true;
    })
    .slice(0, maxItems > 0 ? maxItems : 12);

  // Carousel layout hooks (must be unconditional)
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true,
  });

  const [prevBtnEnabled, setPrevBtnEnabled] = useState(false);
  const [nextBtnEnabled, setNextBtnEnabled] = useState(false);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setPrevBtnEnabled(emblaApi.canScrollPrev());
    setNextBtnEnabled(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  if (productsToDisplay.length === 0) {
    return isEditing ? (
      <div className="p-8 text-center border border-dashed border-border/60 rounded-lg text-muted-foreground text-sm">
        [Product Rail] Nenhum item encontrado para o filtro selecionado.
      </div>
    ) : null;
  }

  if (layout === "grid") {
    return (
      <section className="mx-auto max-w-7xl px-4 py-8 @md:px-6">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-semibold mt-1 text-2xl text-foreground @sm:text-3xl">{title}</h2>
          </div>
          {slug && (
            <Button variant="ghost" size="sm" className="h-11 min-h-11" asChild>
              <Link to="/colecao/$slug" params={{ slug }}>
                Ver tudo
                <ChevronRight className="size-4" aria-hidden />
              </Link>
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 @sm:grid-cols-3 @lg:grid-cols-4">
          {productsToDisplay.slice(0, 8).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 @md:px-6">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-semibold mt-1 text-2xl text-foreground @sm:text-3xl">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {slug && (
            <Button variant="link" size="sm" asChild className="hidden @sm:inline-flex h-11 min-h-11">
              <Link to="/colecao/$slug" params={{ slug }}>
                Ver coleção completa
              </Link>
            </Button>
          )}
          <div className="hidden @sm:flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-11 rounded-lg"
              onClick={scrollPrev}
              disabled={!prevBtnEnabled}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-11 rounded-lg"
              onClick={scrollNext}
              disabled={!nextBtnEnabled}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex -ml-4">
          {productsToDisplay.map((product) => (
            <div
              key={product.id}
              className="pl-4 min-w-0 shrink-0 basis-4/5 @sm:basis-1/2 @md:basis-1/3 @lg:basis-1/4"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
