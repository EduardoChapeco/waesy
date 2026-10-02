import * as React from "react";
import { ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";

interface GalleryGridProps {
 content: {
 title?: string;
 columns?: "2" | "3" | "4";
 gap?: number;
 images?: Array<{
 image_url?: string;
 url?: string;
 link?: string;
 caption?: string;
 alt?: string;
 }>;
 };
 layout_rules?: {
 variant?: "grid" | "masonry" | "collage" | "slider" | "strip" | "column" | string;
 maxWidth?: string;
 gap?: string;
 };
}

export function GalleryGrid({ content, layout_rules }: GalleryGridProps) {
 const images = content.images || [];
 const variant = layout_rules?.variant || "grid";
 const columns = content.columns || "3";
 const gap = content.gap !== undefined ? content.gap : 16;

 if (images.length === 0) {
 return (
 <section className="w-full max-w-6xl mx-auto px-4 py-8">
 <div className="p-8 rounded-lg text-center text-xs text-muted-foreground border border-dashed border-border/80 bg-muted/20">
 Nenhuma imagem cadastrada na galeria.
 </div>
 </section>
 );
 }

 // 1. Variante Masonry (Cascata Dinâmica)
 if (variant === "masonry") {
 return (
 <section className="w-full max-w-6xl mx-auto px-4 py-8 space-y-4">
 {content.title && (
 <h2 className="text-xl @md:text-2xl font-black text-foreground tracking-tight">
 {content.title}
 </h2>
 )}
 <div className="columns-1 @sm:columns-2 @md:columns-3 gap-4 space-y-4">
 {images.map((img, idx) => (
 <div
 key={idx}
 className="break-inside-avoid rounded-lg overflow-hidden bg-muted/40 relative group cursor-pointer shadow-2xs"
 >
 <img
 src={img.url || img.image_url}
 alt={img.alt || img.caption || ""}
 className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
 />
 {(img.caption || img.alt) && (
 <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3 text-white text-xs font-semibold">
 <p className="line-clamp-2">{img.caption || img.alt}</p>
 </div>
 )}
 </div>
 ))}
 </div>
 </section>
 );
 }

 // 2. Variante Collage (Colagem Editorial)
 if (variant === "collage") {
 return (
 <section className="w-full max-w-6xl mx-auto px-4 py-8 space-y-4">
 {content.title && (
 <h2 className="text-xl @md:text-2xl font-black text-foreground tracking-tight">
 {content.title}
 </h2>
 )}
 <div className="grid grid-cols-1 @md:grid-cols-3 gap-4">
 {images.map((img, idx) => (
 <div
 key={idx}
 className={cn(
 "rounded-lg overflow-hidden bg-muted/40 relative group cursor-pointer shadow-2xs",
 idx === 0 ? "col-span-1 @md:col-span-2 @md:row-span-2 aspect-[4/3]" : "aspect-square"
 )}
 >
 <img
 src={img.url || img.image_url}
 alt={img.alt || img.caption || ""}
 className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
 />
 </div>
 ))}
 </div>
 </section>
 );
 }

 // 3. Variante Slider (Carrossel Horizontal Deslizante)
 if (variant === "slider") {
 return (
 <section className="w-full max-w-6xl mx-auto px-4 py-8 space-y-4">
 {content.title && (
 <h2 className="text-xl @md:text-2xl font-black text-foreground tracking-tight">
 {content.title}
 </h2>
 )}
 <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 snap-x snap-mandatory">
 {images.map((img, idx) => (
 <div
 key={idx}
 className="shrink-0 w-72 sm:w-80 aspect-square rounded-lg overflow-hidden bg-muted/40 relative group cursor-pointer snap-start shadow-2xs"
 >
 <img
 src={img.url || img.image_url}
 alt={img.alt || img.caption || ""}
 className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
 />
 </div>
 ))}
 </div>
 </section>
 );
 }

 // 4. Variante Padrão Grid Regular
 const getColClass = () => {
 switch (columns) {
 case "2":
 return "grid-cols-1 @sm:grid-cols-2";
 case "4":
 return "grid-cols-1 @sm:grid-cols-2 @md:grid-cols-4";
 case "3":
 default:
 return "grid-cols-1 @sm:grid-cols-2 @md:grid-cols-3";
 }
 };

 return (
 <section className="w-full max-w-6xl mx-auto px-4 py-8 space-y-6">
 {content.title && (
 <h2 className="text-xl @md:text-2xl font-black text-foreground tracking-tight">
 {content.title}
 </h2>
 )}

 <div className={`grid ${getColClass()}`} style={{ gap: `${gap}px` }}>
 {images.map((img, idx) => {
 const Wrapper = img.link ? "a" : "div";
 const wrapperProps = img.link ? { href: img.link } : {};

 return (
 <Wrapper
 key={idx}
 {...wrapperProps}
 className="relative group aspect-square overflow-hidden rounded-lg bg-muted/40 flex items-center justify-center cursor-pointer shadow-2xs hover:border-primary/40 transition-all"
 >
 <img
 src={img.url || img.image_url}
 alt={img.alt || img.caption || ""}
 className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
 />

 <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-4 text-center text-white">
 <ZoomIn className="size-6 mb-2 scale-75 group-hover:scale-100 transition-transform duration-300" />
 {(img.caption || img.alt) && (
 <p className="text-xs font-semibold leading-relaxed line-clamp-3">
 {img.caption || img.alt}
 </p>
 )}
 </div>
 </Wrapper>
 );
 })}
 </div>
 </section>
 );
}
