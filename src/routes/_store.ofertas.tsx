import { resolveActiveCity } from "@/lib/city-helper";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Tag, Lightning, Truck, ArrowRight, Storefront, ShoppingCart, Percent } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/state/loading";
import { OfferCard } from "@/components/commerce/offer-card";
import { BannerHeroCarousel } from "@/components/commerce/banner-hero-carousel";
import { HotpagesRail } from "@/components/commerce/hotpages-rail";
import { getGlobalDealsPage, type GlobalDealNicheSection } from "@/services/marketplace.functions";
import { listActiveBanners } from "@/services/banner.functions";
import { listHotpages } from "@/services/hotpage.functions";
import { resolveNicheDepartments } from "@/lib/niche-helpers";

import { NativeMobileHeader } from "@/components/navigation/native-mobile-header";

const SearchSchema = z.object({
 nicho: z.string().optional(),
});

type OfertasSearch = z.infer<typeof SearchSchema>;

const NICHE_CHIPS = [
 { id: "todos", label: "Todas as Ofertas", emoji: "⚡" },
 { id: "gastronomia", label: "Gastronomia", emoji: "🍔" },
 { id: "mercado", label: "Mercado", emoji: "🛒" },
 { id: "farmacia", label: "Farmácia", emoji: "💊" },
 { id: "moda", label: "Moda", emoji: "👗" },
 { id: "eletronicos", label: "Eletrônicos", emoji: "💻" },
 { id: "beleza", label: "Beleza", emoji: "💄" },
 { id: "pet", label: "Pet Shop", emoji: "🐾" },
 { id: "acougue", label: "Açougue", emoji: "🥩" },
 { id: "bebidas", label: "Bebidas", emoji: "🍻" },
 { id: "casa", label: "Casa", emoji: "🏠" },
];

export const Route = createFileRoute("/_store/ofertas")({
 head: () => ({
 meta: [
 { title: "Ofertas e Promoções — As Melhores Ofertas da Região | Waesy" },
 {
 name: "description",
 content:
 "Descubra as melhores promoções e descontos de todos os segmentos: gastronomia, mercado, farmácia, moda, eletrônicos, beleza, pet shop e mais.",
 },
 { property: "og:title", content: "Ofertas e Promoções — Waesy" },
 {
 property: "og:description",
 content: "As melhores promoções de todos os segmentos da plataforma Waesy em um só lugar.",
 },
 ],
 }),
 validateSearch: (search: Record<string, unknown>): OfertasSearch =>
 SearchSchema.parse(search),
 loaderDeps: ({ search }) => search,
 loader: async ({ location, deps: { nicho } }) => {
    const activeCity = resolveActiveCity(location?.search);
   try {
 const [dealsPage, banners, hotpages] = await Promise.all([
 getGlobalDealsPage({
 data:
 nicho && nicho !== "todos" ? { nicheFilter: nicho, limit: 10 } : { limit: 8 },
 }).catch(() => ({ sections: [], totalDeals: 0, maxDiscount: 0, hasRealData: false })),
 listActiveBanners({ data: { placement: "ofertas", city: activeCity } }).catch(() => []),
 listHotpages({ data: { module: "ofertas" } }).catch(() => []),
 ]);
 return { dealsPage, banners, hotpages };
   } catch (err) {
     console.error("[loader:_store.ofertas] Unhandled error:", err);
     return { dealsPage: null, banners: null, hotpages: null };
   }
 },
 component: OfertasPage,
 pendingComponent: PageSkeleton,
});

function OfertasPage() {
 const { dealsPage, banners, hotpages } = ((Route.useLoaderData?.() as any) || {});
 const search = Route.useSearch();
 const navigate = useNavigate({ from: Route.fullPath });

 const activeNiche = search.nicho || "todos";

 const handleNicheChange = (nichoId: string) => {
 navigate({
 search: (prev) => ({
 ...prev,
 nicho: nichoId === "todos" ? undefined : nichoId,
 }),
 });
 };

 const sections: GlobalDealNicheSection[] = dealsPage?.sections || [];
 const totalDeals = dealsPage?.totalDeals || 0;
 const maxDiscount = dealsPage?.maxDiscount || 0;

 return (
 <div className="w-full max-w-6xl mx-auto px-0 sm:px-4 space-y-4 sm:space-y-6 pb-24">
 <NativeMobileHeader
   title="Ofertas de Hoje"
   mobileOnly
   badge={
     maxDiscount > 0 ? (
       <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
         Até {maxDiscount}% OFF
       </span>
     ) : undefined
   }
 />

 {banners && banners.length > 0 ? (
 <section aria-label="Banners de Ofertas">
 <BannerHeroCarousel banners={banners} />
 </section>
 ) : (
 <header className="hidden md:flex items-center justify-between gap-4 pt-2">
   <div className="flex items-center gap-3">
     <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
       <Lightning size={20} weight="fill" />
     </div>
     <div>
       <h1 className="text-2xl font-bold tracking-tight text-foreground">
         Ofertas de Hoje
       </h1>
       {totalDeals > 0 && (
         <p className="text-xs text-muted-foreground">
           {totalDeals} ofertas verificadas • Até {maxDiscount}% de economia
         </p>
       )}
     </div>
   </div>
 </header>
 )}

 {/* ── 2. Hotpages / Destaques de Ofertas ── */}
 {hotpages && hotpages.length > 0 && (
 <section aria-label="Coleções de Ofertas">
 <HotpagesRail hotpages={hotpages} />
 </section>
 )}

 <div className="relative w-full overflow-hidden">
   <div
     aria-hidden="true"
     className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background via-background/70 to-transparent z-10"
   />
   <nav
     aria-label="Filtrar ofertas por categoria"
     className="flex items-center overflow-x-auto snap-x snap-mandatory scrollbar-hide no-scrollbar gap-2 px-4 sm:px-0 py-2 pr-12"
   >
     {NICHE_CHIPS.map((chip) => (
       <button
         key={chip.id}
         type="button"
         id={`chip-ofertas-${chip.id}`}
         onClick={() => handleNicheChange(chip.id)}
         className={`snap-start shrink-0 h-9 px-4 rounded-full text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer select-none ${
           activeNiche === chip.id
             ? "bg-foreground text-background shadow-xs"
             : "bg-card text-muted-foreground border border-border/60 hover:text-foreground hover:border-border"
         }`}
       >
         {chip.emoji ? <span>{chip.emoji}</span> : null}
         <span>{chip.label}</span>
       </button>
     ))}
   </nav>
 </div>

 {/* ── 3. Carrosséis de Ofertas por Nicho ── */}
 {sections.length === 0 ? (
 <div className="py-16 px-4 flex flex-col items-center justify-center text-center select-none">
   <div className="size-16 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground/35 mb-3">
     <Percent size={34} weight="thin" />
   </div>
   <p className="text-sm font-medium text-muted-foreground">
     Nenhuma oferta ativa neste filtro no momento.
   </p>
 </div>
 ) : (
 <div className="space-y-8">
 {sections.map((section: GlobalDealNicheSection) => (
 <section
 key={section.nicho}
 aria-label={`Ofertas de ${section.label}`}
 className="space-y-3"
 >
 {/* Header do nicho */}
 <div className="flex items-center justify-between gap-2">
 <div className="flex items-center gap-2">
 <div
 className={`size-8 rounded-lg bg-linear-to-br ${section.color} flex items-center justify-center text-white shrink-0 `}
 >
 <span className="text-base leading-none">{section.emoji}</span>
 </div>
 <div>
 <h2 className="text-sm font-bold text-foreground leading-tight">
 {section.label}
 </h2>
 <p className="text-[10px] text-muted-foreground font-medium">
 {section.items.length} oferta{section.items.length !== 1 ? "s" : ""}{" "}
 disponível{section.items.length !== 1 ? "is" : ""}
 </p>
 </div>
 </div>
 <Link
 to={section.to as any}
 className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors"
 >
 Ver tudo
 <ArrowRight size={12} weight="bold" />
 </Link>
 </div>

 {/* Rail de Ofertas */}
 <div className="flex items-start gap-3 overflow-x-auto no-scrollbar pb-2">
 {section.items.map((offer) => (
 <div key={offer.id} className="min-w-40 sm:min-w-[180px] shrink-0">
 <OfferCard
 id={offer.id}
 title={offer.title}
 slug={offer.slug}
 store_name={offer.store_name}
 price_cents={offer.price_cents}
 original_price_cents={offer.original_price_cents}
 discount_percent={offer.discount_percent}
 mechanic_label={offer.mechanic_label}
 ends_at={offer.ends_at}
 has_flash_offer={offer.has_flash_offer}
 cover_image={offer.cover_image || "/banner-placeholder.png"}
 selling_unit={offer.selling_unit || "un"}
 in_stock={offer.in_stock ?? true}
 />
 </div>
 ))}
 </div>

 {/* Lojas do nicho (compactas) */}
 {section.stores.length > 0 && (
 <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 pt-1">
 {section.stores.map((store) => (
 <Link
 key={store.id}
 to="/mercado"
 search={{ niche: section.nicho } as any}
 className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card hover:border-foreground/30 transition-all shrink-0"
 >
 {store.avatar_url ? (
 <img
 src={store.avatar_url}
 alt={store.name}
 className="size-5 rounded-md object-cover "
 />
 ) : (
 <div className="size-5 rounded-md bg-muted flex items-center justify-center">
 <Storefront size={10} />
 </div>
 )}
 <span className="text-[11px] font-semibold text-foreground whitespace-nowrap">
 {store.name}
 </span>
 {store.is_open && (
 <span
 className="size-1.5 rounded-full bg-emerald-500 shrink-0"
 title="Aberto"
 />
 )}
 </Link>
 ))}
 </div>
 )}
 </section>
 ))}

 {/* CTA Final */}
 <section className="rounded-lg border-0 bg-card/60 p-6 text-center space-y-3">
 <div className="size-12 rounded-lg bg-muted text-muted-foreground flex items-center justify-center mx-auto">
 <ShoppingCart size={24} />
 </div>
 <h3 className="text-sm font-bold text-foreground">Você é lojista?</h3>
 <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
 Publique suas promoções e apareça aqui para milhares de consumidores na região.
 Configure descontos no Workspace.
 </p>
 <Button asChild size="sm" variant="outline" className="rounded-lg font-bold text-xs">
 <Link to="/workspace/marketing/promocoes">Criar Promoção</Link>
 </Button>
 </section>
 </div>
 )}
 </div>
 );
}

