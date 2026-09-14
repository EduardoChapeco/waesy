import { Tag } from "lucide-react";
import React from "react";
import { Link } from "@tanstack/react-router";
import { HorizontalRail } from "@/components/commerce/horizontal-rail";
import { StoreCard } from "@/components/commerce/store-card";
import { OfferCard } from "@/components/commerce/offer-card";
import { ArrowRight, Storefront, Flame, Lightning, Image as ImageIcon, SquaresFour } from "@phosphor-icons/react";
import type { SurfaceSectionDTO } from "@/services/surface-cms.functions";

export interface ModularSurfaceFeedProps {
 sections: SurfaceSectionDTO[];
 className?: string;
 onAddToCart?: (variantId: string) => void;
}

export function ModularSurfaceFeed({ sections, className = "", onAddToCart }: ModularSurfaceFeedProps) {
 if (!sections || sections.length === 0) return null;

 return (
 <div className={`w-full space-y-8 sm:space-y-10 ${className}`}>
 {sections.map((section) => {
 if (!section.items || section.items.length === 0) return null;

 // ── 0.1 Seção de Banner Único Panorâmico (21:9) ──
 if (section.type === "banner_single_21_9" || section.layout_variant === "banner_21_9") {
 const banner = section.items[0];
 if (!banner) return null;

 return (
 <section key={section.id} aria-label={section.title} className="w-full">
 <Link
 to={banner.link_url || "/"}
 className="group relative block w-full aspect-21/9 rounded-2xl overflow-hidden bg-muted/40 border border-border/60 shadow-xs active:scale-[0.99] transition-all"
 >
 {banner.image_url ? (
 <img
 src={banner.image_url}
 alt={banner.title || section.title}
 className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
 loading="lazy"
 />
 ) : (
 <div className="size-full flex items-center justify-center text-muted-foreground gap-2">
 <ImageIcon size={24} />
 <span className="text-xs font-semibold">{section.title}</span>
 </div>
 )}
 <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
 <div className="absolute bottom-3 left-4 right-4 text-left">
 {section.badge_tag && (
 <span className="inline-block px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md text-white border border-white/20 mb-1">
 {section.badge_tag}
 </span>
 )}
 <h3 className="text-sm sm:text-base font-bold text-white leading-tight drop-">
 {section.title}
 </h3>
 {section.subtitle && (
 <p className="text-xs text-white/80 line-clamp-1">{section.subtitle}</p>
 )}
 </div>
 </Link>
 </section>
 );
 }

 // ── 0.2 Seção de Banners Duplos Lado a Lado (16:9 Duo) ──
 if (section.type === "banner_duo_16_9" || section.layout_variant === "banner_16_9_duo") {
 const banners = section.items.slice(0, 2);

 return (
 <section key={section.id} aria-label={section.title} className="space-y-3">
 <div className="flex items-center justify-between px-1">
 <h2 className="text-sm sm:text-base font-bold text-foreground leading-tight">
 {section.title}
 </h2>
 {section.badge_tag && (
 <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
 {section.badge_tag}
 </span>
 )}
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
 {banners.map((b: any, idx: number) => (
 <Link
 key={b.id || idx}
 to={b.link_url || "/"}
 className="group relative block w-full aspect-16/9 rounded-2xl overflow-hidden bg-muted/40 border border-border/60 shadow-xs active:scale-[0.99] transition-all"
 >
 {b.image_url ? (
 <img
 src={b.image_url}
 alt={b.title || "Banner"}
 className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
 loading="lazy"
 />
 ) : (
 <div className="size-full flex items-center justify-center text-muted-foreground gap-2">
 <ImageIcon size={20} />
 <span className="text-xs font-semibold">{b.title || "Banner Promocional"}</span>
 </div>
 )}
 <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
 <div className="absolute bottom-2.5 left-3 right-3 text-left">
 <p className="text-xs sm:text-sm font-bold text-white leading-tight drop- truncate">
 {b.title || section.title}
 </p>
 </div>
 </Link>
 ))}
 </div>
 </section>
 );
 }

 // ── 0.3 Seção de Botões / Atalhos Personalizados (Custom Buttons Rail) ──
 if (section.type === "custom_buttons_rail" || section.layout_variant === "buttons_rail") {
 return (
 <section key={section.id} aria-label={section.title} className="space-y-3">
 <div className="flex items-center justify-between px-1">
 <div className="flex items-center gap-2">
 <span className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
 <SquaresFour size={14} weight="bold" />
 </span>
 <h2 className="text-sm sm:text-base font-bold text-foreground leading-tight">
 {section.title}
 </h2>
 </div>
 {section.badge_tag && (
 <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
 {section.badge_tag}
 </span>
 )}
 </div>

 <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1 ">
 {section.items.map((btn: any) => (
 <Link
 key={btn.id}
 to={btn.route || btn.link_url || "/"}
 className="inline-flex items-center gap-2.5 px-4 h-11 rounded-xl bg-card border border-border/80 text-foreground hover:bg-muted/60 hover:border-primary/40 transition-all shrink-0 active:scale-[0.98] shadow-xs cursor-pointer"
 >
 {btn.icon_url ? (
 <img src={btn.icon_url} alt={btn.label} className="size-5 object-contain" />
 ) : (
 <SquaresFour size={16} weight="bold" className="text-primary" />
 )}
 <span className="text-xs font-bold whitespace-nowrap">{btn.label}</span>
 {btn.badge && (
 <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded-full bg-primary text-primary-foreground">
 {btn.badge}
 </span>
 )}
 </Link>
 ))}
 </div>
 </section>
 );
 }

 // ── 1. Seção de Ofertas Relâmpago (Flash Deals) ──
 if (section.type === "flash_deal_rail" || section.data_source === "flash_deals") {
 return (
 <section key={section.id} aria-label={section.title} className="space-y-3">
 <div className="flex items-center justify-between px-1">
 <div className="flex items-center gap-2">
 <span className="size-6 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center font-bold text-xs">
 <Flame size={14} weight="fill" />
 </span>
 <div>
 <h2 className="text-sm sm:text-base font-bold text-foreground leading-tight">
 {section.title}
 </h2>
 {section.subtitle && (
 <p className="text-[11px] sm:text-xs text-muted-foreground font-medium">
 {section.subtitle}
 </p>
 )}
 </div>
 </div>
 {section.badge_tag && (
 <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
 {section.badge_tag}
 </span>
 )}
 </div>

 <HorizontalRail hideHeader={true} title={section.title}>
 {section.items.map((offer: any) => (
 <div key={offer.id} className="w-[320px] sm:w-[350px] shrink-0 snap-start">
 <OfferCard {...offer} />
 </div>
 ))}
 </HorizontalRail>
 </section>
 );
 }

 // ── 2. Seção de Lojas & Estabelecimentos ──
 if (section.type === "store_rail" || section.data_source === "stores") {
 return (
 <section key={section.id} aria-label={section.title} className="space-y-3">
 <div className="flex items-center justify-between px-1">
 <div className="flex items-center gap-2">
 <span className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
 <Storefront size={14} weight="bold" />
 </span>
 <div>
 <h2 className="text-sm sm:text-base font-bold text-foreground leading-tight">
 {section.title}
 </h2>
 {section.subtitle && (
 <p className="text-[11px] sm:text-xs text-muted-foreground font-medium">
 {section.subtitle}
 </p>
 )}
 </div>
 </div>
 <Link
 to="/diretorio"
 className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
 >
 <span>Ver todas</span>
 <ArrowRight size={12} weight="bold" />
 </Link>
 </div>

 <HorizontalRail hideHeader={true} title={section.title}>
 {section.items.map((store: any) => (
 <div key={store.id} className="w-[280px] sm:w-[320px] shrink-0 snap-start">
 <StoreCard
 id={store.id}
 name={store.name}
 slug={store.slug}
 avatar_url={store.avatar_url}
 banner_url={store.banner_url}
 category={store.category}
 rating={store.rating}
 review_count={store.review_count}
 distance_km={store.distance_km}
 is_open={store.is_open}
 delivery_time_min={store.delivery_time_min}
 />
 </div>
 ))}
 </HorizontalRail>
 </section>
 );
 }

 // ── 3. Seção Grade de 4 Colunas (Grid 4-Col) ──
 if (section.layout_variant === "grid_4col") {
 return (
 <section key={section.id} aria-label={section.title} className="space-y-3">
 <div className="flex items-center justify-between px-1">
 <div className="flex items-center gap-2">
 <span className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
 <SquaresFour size={14} weight="bold" />
 </span>
 <h2 className="text-sm sm:text-base font-bold text-foreground leading-tight">
 {section.title}
 </h2>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
 {section.items.map((prod: any) => (
 <OfferCard key={prod.id} {...prod} />
 ))}
 </div>
 </section>
 );
 }

  // ── 4. Seção Destaques Triplos (Grade Homogênea 3-Col) ──
  if (section.layout_variant === "bento_3" && section.items.length >= 3) {
    const items = section.items.slice(0, 3);

    return (
      <section key={section.id} aria-label={section.title} className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
              <Lightning size={14} weight="fill" />
            </span>
            <h2 className="text-sm sm:text-base font-bold text-foreground leading-tight">
              {section.title}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {items.map((prod: any) => (
            <OfferCard key={prod.id} {...prod} />
          ))}
        </div>
      </section>
    );
  }

 // ── 5. Padrão: Trilho Horizontal de Produtos (Product Rail Snap) ──
 return (
 <section key={section.id} aria-label={section.title} className="space-y-3">
 <div className="flex items-center justify-between px-1">
 <div className="flex items-center gap-2">
 <span className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
 <Tag size={14} strokeWidth={2.5} />
 </span>
 <div>
 <h2 className="text-sm sm:text-base font-bold text-foreground leading-tight">
 {section.title}
 </h2>
 {section.subtitle && (
 <p className="text-[11px] sm:text-xs text-muted-foreground font-medium">
 {section.subtitle}
 </p>
 )}
 </div>
 </div>
 </div>

 <HorizontalRail hideHeader={true} title={section.title}>
 {section.items.map((prod: any) => (
 <div key={prod.id} className="w-[320px] sm:w-[350px] shrink-0 snap-start">
 <OfferCard {...prod} />
 </div>
 ))}
 </HorizontalRail>
 </section>
 );
 })}
 </div>
 );
}
