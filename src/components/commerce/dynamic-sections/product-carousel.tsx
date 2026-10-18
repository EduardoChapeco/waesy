import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { ProductCard } from "@/components/commerce/product-card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProductCarouselProps {
  node_id?: string;
  block_type?: string;
  title?: string;
  subtitle?: string;
  collection_slug?: string;
  categoryId?: string;
  filterCategory?: string;
  selectedProductIds?: string[];
  limit?: number;
  itemsPerRowDesktop?: string;
  itemsPerRowMobile?: string;
  freeScroll?: boolean;
  design_tokens?: any;
  data_bindings?: any;
  resolvedProducts?: any[];
  resolvedData?: any;
  transientData?: any;
  isEditing?: boolean;
}

export function ProductCarousel({
  title,
  subtitle,
  categoryId,
  filterCategory,
  selectedProductIds,
  limit,
  itemsPerRowDesktop = "4",
  itemsPerRowMobile = "2",
  freeScroll = true,
  design_tokens,
  resolvedProducts,
  resolvedData,
  transientData,
  isEditing,
}: ProductCarouselProps) {
  const rawProducts: any[] =
    resolvedProducts ??
    (resolvedData?.products || (Array.isArray(resolvedData) ? resolvedData : null)) ??
    transientData?.products ??
    [];

  const activeCategoryFilter = (categoryId || filterCategory || "").trim();
  const selectedIds = Array.isArray(selectedProductIds) ? selectedProductIds.map(String) : [];

  const products = React.useMemo(() => {
    let list = rawProducts;
    if (selectedIds.length > 0) {
      list = list.filter((p) => selectedIds.includes(String(p.id)));
    } else if (activeCategoryFilter && activeCategoryFilter !== "all") {
      const lower = activeCategoryFilter.toLowerCase();
      list = list.filter(
        (p) =>
          String(p.category_id || "").toLowerCase() === lower ||
          String(p.category || "").toLowerCase() === lower ||
          String(p.category_slug || "").toLowerCase() === lower
      );
    }
    const maxItems = Number(limit || 0);
    return maxItems > 0 ? list.slice(0, maxItems) : list;
  }, [rawProducts, selectedIds, activeCategoryFilter, limit]);

  if (products.length === 0 && !isEditing) {
    return null;
  }

  const getDesktopBasis = (cols: string) => {
    switch (cols) {
      case "3":
        return "@md:basis-1/3 @lg:basis-1/3";
      case "5":
        return "@md:basis-1/4 @lg:basis-1/5";
      case "4":
      default:
        return "@md:basis-1/3 @lg:basis-1/4";
    }
  };

  const getMobileBasis = (cols: string) => {
    switch (cols) {
      case "1":
        return freeScroll ? "basis-4/5 @sm:basis-4/5" : "basis-full @sm:basis-full";
      case "2":
      default:
        return freeScroll ? "basis-1/2 @sm:basis-1/2" : "basis-1/2 @sm:basis-1/2";
    }
  };

  const itemClassName = `pl-3 @md:pl-4 ${getMobileBasis(itemsPerRowMobile)} ${getDesktopBasis(itemsPerRowDesktop)}`;

  return (
    <div
      className={cn("w-full py-12 @md:py-24 overflow-hidden", design_tokens?.className)}
      style={{
        backgroundColor: design_tokens?.backgroundColor,
        color: design_tokens?.textColor,
      }}
    >
      <div className="mx-auto max-w-7xl px-4 @md:px-8">
        <div className="flex items-end justify-between mb-8 @md:mb-12">
          <div>
            {title && (
              <h2 className="text-2xl @md:text-4xl font-bold tracking-tight mb-2">{title}</h2>
            )}
            {subtitle && <p className="text-muted-foreground text-sm @md:text-lg">{subtitle}</p>}
          </div>
          <Button variant="ghost" className="hidden @md:flex gap-2 group h-11 min-h-11" asChild>
            <Link to="/mercado">
              Ver Todos
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>

 {products.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-16 text-center gap-4 text-muted-foreground border-0">
 <ShoppingBag className="h-10 w-10 opacity-30" />
 <div>
 <p className="font-medium">Nenhum produto disponível</p>
 <p className="text-sm mt-1">
 Cadastre produtos ativos no painel para que apareçam aqui.
 </p>
 </div>
 </div>
 ) : (
 <Carousel
 opts={{ align: "start", loop: false, dragFree: freeScroll }}
 className="w-full relative"
 >
 <CarouselContent className="-ml-3 @md:-ml-4">
 {products.map((product: any) => (
 <CarouselItem key={product.id} className={itemClassName}>
 <ProductCard product={product} />
 </CarouselItem>
 ))}
 </CarouselContent>
 <CarouselPrevious className="hidden @md:flex -left-6" />
 <CarouselNext className="hidden @md:flex -right-6" />
 </Carousel>
 )}
 </div>
 </div>
 );
}
