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
 // Flat content fields (spread by ExperienceRenderer from node.content)
 title?: string;
 subtitle?: string;
 collection_slug?: string;
 itemsPerRowDesktop?: string;
 itemsPerRowMobile?: string;
 freeScroll?: boolean;
 design_tokens?: any;
 data_bindings?: any;
 // Canonical dynamic data props from ExperienceRenderer
 resolvedProducts?: any[];
 // Legacy compat
 resolvedData?: any;
 transientData?: any;
 isEditing?: boolean;
}

/**
 * ProductCarousel — reads products from server-resolved resolvedProducts.
 * NEVER issues its own network requests. If resolvedProducts is absent or empty,
 * shows an honest empty state. No mock data, no fallback lists.
 */
export function ProductCarousel({
 title,
 subtitle,
 itemsPerRowDesktop = "4",
 itemsPerRowMobile = "2",
 freeScroll = true,
 design_tokens,
 resolvedProducts,
 resolvedData,
 transientData,
 isEditing,
}: ProductCarouselProps) {
 // Canonical: resolvedProducts → legacy resolvedData → legacy transientData
 const products: any[] =
 resolvedProducts ??
 (resolvedData?.products || (Array.isArray(resolvedData) ? resolvedData : null)) ??
 transientData?.products ??
 [];

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
 return freeScroll ? "basis-[85%] @sm:basis-[85%]" : "basis-full @sm:basis-full";
 case "2":
 default:
 return freeScroll ? "basis-[45%] @sm:basis-1/2" : "basis-1/2 @sm:basis-1/2";
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
 <div className="mx-auto max-w-[1400px] px-4 @md:px-8">
 <div className="flex items-end justify-between mb-8 @md:mb-12">
 <div>
 {title && (
 <h2 className="text-2xl @md:text-4xl font-bold tracking-tight mb-2">{title}</h2>
 )}
 {subtitle && <p className="text-muted-foreground text-sm @md:text-lg">{subtitle}</p>}
 </div>
 <Button variant="ghost" className="hidden @md:flex gap-2 group" asChild>
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
