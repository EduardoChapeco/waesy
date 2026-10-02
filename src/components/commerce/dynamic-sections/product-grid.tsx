import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { ProductCard } from "@/components/commerce/product-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProductGridProps {
 node_id?: string;
 block_type?: string;
 title?: string;
 subtitle?: string;
 collection_slug?: string;
 columns?: 2 | 3 | 4;
 design_tokens?: any;
 layout_rules?: {
 variant?: "grid" | "masonry" | "collage" | "slider" | "column" | string;
 maxWidth?: string;
 gap?: string;
 };
 data_bindings?: any;
 resolvedProducts?: any[];
 resolvedData?: any;
 transientData?: any;
 isEditing?: boolean;
}

export function ProductGrid({
 title,
 subtitle,
 columns = 4,
 design_tokens,
 layout_rules,
 resolvedProducts,
 resolvedData,
 transientData,
 isEditing,
}: ProductGridProps) {
 const products: any[] =
 resolvedProducts ??
 (resolvedData?.products || (Array.isArray(resolvedData) ? resolvedData : null)) ??
 transientData?.products ??
 [];

 const variant = layout_rules?.variant || "grid";

 if (products.length === 0 && !isEditing) {
 return null;
 }

 // 1. Variante Slider / Carrossel Horizontal
 if (variant === "slider") {
 return (
 <div
 className={cn("w-full py-8 @md:py-14 overflow-hidden", design_tokens?.className)}
 style={{
 backgroundColor: design_tokens?.backgroundColor,
 color: design_tokens?.textColor,
 }}
 >
 <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-6">
 <div className="flex items-end justify-between">
 <div>
 {title && (
 <h2 className="text-2xl @md:text-3xl font-black tracking-tight text-foreground">{title}</h2>
 )}
 {subtitle && <p className="text-muted-foreground text-xs @md:text-sm mt-1">{subtitle}</p>}
 </div>
 <Button variant="ghost" size="sm" className="hidden @md:flex gap-2 text-xs font-bold" asChild>
 <Link to="/mercado">
 <span>Ver Todos</span>
 <ArrowRight className="size-3.5" />
 </Link>
 </Button>
 </div>

 <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 snap-x snap-mandatory">
 {products.map((product: any) => (
 <div key={product.id} className="shrink-0 w-64 sm:w-72 snap-start">
 <ProductCard product={product} />
 </div>
 ))}
 </div>
 </div>
 </div>
 );
 }

 // 2. Variante Grid Regular
 const colClass =
 (
 {
 2: "grid-cols-1 sm:grid-cols-2",
 3: "grid-cols-1 sm:grid-cols-2 @md:grid-cols-3",
 4: "grid-cols-1 sm:grid-cols-2 @md:grid-cols-3 @lg:grid-cols-4",
 } as Record<number, string>
 )[columns] ?? "grid-cols-1 sm:grid-cols-2 @md:grid-cols-3 @lg:grid-cols-4";

 return (
 <div
 className={cn("w-full py-8 @md:py-14 overflow-hidden", design_tokens?.className)}
 style={{
 backgroundColor: design_tokens?.backgroundColor,
 color: design_tokens?.textColor,
 }}
 >
 <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-6">
 <div className="flex items-end justify-between">
 <div>
 {title && (
 <h2 className="text-2xl @md:text-3xl font-black tracking-tight text-foreground">{title}</h2>
 )}
 {subtitle && <p className="text-muted-foreground text-xs @md:text-sm mt-1">{subtitle}</p>}
 </div>
 <Button variant="ghost" size="sm" className="hidden @md:flex gap-2 text-xs font-bold" asChild>
 <Link to="/mercado">
 <span>Ver Todos</span>
 <ArrowRight className="size-3.5" />
 </Link>
 </Button>
 </div>

 {products.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-16 text-center gap-3 text-muted-foreground border border-dashed border-border/80 rounded-lg p-8 bg-muted/20">
 <ShoppingBag className="size-10 text-muted-foreground/40" />
 <div className="space-y-1">
 <p className="font-bold text-foreground text-sm">Nenhum produto cadastrado nesta coleção</p>
 <p className="text-xs text-muted-foreground">
 Cadastre produtos ou vincule uma coleção ativa no painel lateral.
 </p>
 </div>
 </div>
 ) : (
 <div className={cn("grid gap-4 sm:gap-6", colClass)}>
 {products.map((product: any) => (
 <ProductCard key={product.id} product={product} />
 ))}
 </div>
 )}
 </div>
 </div>
 );
}
