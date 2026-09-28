import * as React from "react";
import { Star } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TestimonialCarouselProps {
 node_id?: string;
 block_type?: string;
 // Flat content fields (spread by ExperienceRenderer from node.content)
 title?: string;
 subtitle?: string;
 testimonials?: Array<any>; // Static fallback when not using dynamic binding
 design_tokens?: any;
 data_bindings?: { type?: string; source?: string };
 // Canonical dynamic data props from ExperienceRenderer
 resolvedReviews?: any[];
 // Legacy compat
 transientData?: any;
 resolvedData?: any;
}

export function TestimonialCarousel({
 title,
 subtitle,
 testimonials: staticTestimonials,
 design_tokens,
 data_bindings,
 resolvedReviews,
 resolvedData,
 transientData,
}: TestimonialCarouselProps) {
 const bindingType = data_bindings?.type || data_bindings?.source;
 const isDynamic =
 bindingType === "dynamic_reviews" || !staticTestimonials || staticTestimonials.length === 0;

 // Canonical: resolvedReviews → legacy resolvedData → transientData
 const serverReviews: any[] | null =
 resolvedReviews ??
 resolvedData?.reviews ??
 (Array.isArray(resolvedData) ? resolvedData : null) ??
 transientData?.reviews ??
 null;

 const testimonials = isDynamic ? (serverReviews ?? []) : (staticTestimonials ?? []);

 return (
 <div
 className={cn("w-full py-12 @md:py-24 overflow-hidden", design_tokens?.className)}
 style={{
 backgroundColor: design_tokens?.backgroundColor,
 color: design_tokens?.textColor,
 }}
 >
 <div className="mx-auto max-w-6xl px-4 @md:px-8">
 {(title || subtitle) && (
 <div className="mb-12 text-center">
 {title && (
 <h2 className="text-3xl @md:text-4xl font-bold tracking-tight mb-3">{title}</h2>
 )}
 {subtitle && (
 <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{subtitle}</p>
 )}
 </div>
 )}

 {testimonials.length > 0 ? (
 <Carousel
 opts={{
 align: "start",
 loop: true,
 }}
 className="w-full relative"
 >
 <CarouselContent className="-ml-2 @md:-ml-4">
 {testimonials.map((item: any, idx: number) => (
 <CarouselItem key={idx} className="pl-2 @md:pl-4 @md:basis-1/2 @lg:basis-1/3">
 <div className="p-1 h-full">
 <Card className="h-full border-muted/50 bg-background/50 backdrop-blur ">
 <CardContent className="flex flex-col h-full p-6">
 {item.rating && (
 <div className="flex gap-1 mb-4 text-warning">
 {Array.from({ length: 5 }).map((_, i) => (
 <Star
 key={i}
 className={cn(
 "h-4 w-4",
 i < item.rating!
 ? "fill-current"
 : "text-muted opacity-30 fill-transparent",
 )}
 />
 ))}
 </div>
 )}
 <p className="text-sm @md:text-base leading-relaxed text-foreground flex-1 italic mb-6">
 "{item.content}"
 </p>
 <div className="flex items-center gap-3 mt-auto">
 {item.avatar_url ? (
 <img
 src={item.avatar_url}
 alt={item.author}
 className="h-10 w-10 rounded-full object-cover border"
 />
 ) : (
 <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary uppercase">
 {item.author?.charAt(0) || "C"}
 </div>
 )}
 <div>
 <p className="font-semibold text-sm">{item.author}</p>
 {item.role && (
 <p className="text-xs text-muted-foreground">{item.role}</p>
 )}
 </div>
 </div>
 </CardContent>
 </Card>
 </div>
 </CarouselItem>
 ))}
 </CarouselContent>
 <div className="hidden @md:block">
 <CarouselPrevious className="-left-4 @lg:-left-12 bg-background border-muted hover:bg-background" />
 <CarouselNext className="-right-4 @lg:-right-12 bg-background border-muted hover:bg-background" />
 </div>
 </Carousel>
 ) : (
 <div className="text-center py-12 text-muted-foreground border border-dashed">
 Nenhuma avaliação disponível no momento.
 </div>
 )}
 </div>
 </div>
 );
}
