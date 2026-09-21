import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Tag, Lightning, Truck, ArrowRight, Storefront, ShoppingCart, Percent } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/state/loading";
import { OfferCard } from "@/components/commerce/offer-card";
import { BannerHeroCarousel } from "@/components/commerce/banner-hero-carousel";
import { HotpagesRail } from "@/components/commerce/hotpages-rail";
import {
 getGlobalDealsPage,
 type GlobalDealNicheSection,
} from "@/services/marketplace.functions";
import { listActiveBanners } from "@/services/banner.functions";
import { listHotpages } from "@/services/hotpage.functions";
import { resolveNicheDepartments } from "@/lib/niche-helpers";

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
 { title: "Ofertas & Promoções — As Melhores Ofertas da Região | Waesy" },
 {
 name: "description",
 content:
 "Descubra as melhores promoções e descontos de todos os segmentos: gastronomia, mercado, farmácia, moda, eletrônicos, beleza, pet shop e mais.",
 },
 { property: "og:title", content: "Ofertas & Promoções — Waesy" },
 {
 property: "og:description",
 content: "As melhores promoções de todos os segmentos da plataforma Waesy em um só lugar.",
 },
 ],
 }),
 validateSearch: (search: Record<string, unknown>): OfertasSearch =>
 SearchSchema.parse(search),
 loaderDeps: ({ search }) => search,
 loader: async ({ deps: { nicho } }) => {
   try {
 const [dealsPage, banners, hotpages] = await Promise.all([
 getGlobalDealsPage({
 data:
 nicho && nicho !== "todos" ? { nicheFilter: nicho, limit: 10 } : { limit: 8 },
 }).catch(() => ({ sections: [], totalDeals: 0, maxDiscount: 0, hasRealData: false })),
 listActiveBanners({ data: { placement: "ofertas" } }).catch(() => []),
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

 const sections: GlobalDealNicheSection[] = dealsPage.sections || [];
 const totalDeals = dealsPage.totalDeals || 0;
 const maxDiscount = dealsPage.maxDiscount || 0;

 return (
 <div className="w-full space-y-6 pb-20">
 {/* ── 1. Hero Banner ── */}
 {banners && banners.length > 0 ? (
 <section aria-label="Banners de Ofertas">
 <BannerHeroCarousel banners={banners} />
 </section>
 ) : (
 <section
 aria-label="Hub de Ofertas"
 className="relative w-full rounded-2xl overflow-hidden bg-linear-to-r from-red-600 via-rose-600 to-amber-600 p-6 sm:p-8"
 >
 <div
 className="absolute inset-0 opacity-10"
 style={{
 backgroundImage:
 "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
 backgroundSize: "40px 40px",
 }}
 />
 <div className="relative z-10 space-y-3 max-w-xl">
 <div className="flex items-center gap-2">
 <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-black uppercase tracking-widest bg-amber-400 text-black ">
 Tabloide Digital
 </span>
 {maxDiscount > 0 && (
 <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-black uppercase tracking-wider bg-white/20 text-white">
 Até {maxDiscount}% OFF
 </span>
 )}
 </div>
 <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-none flex items-center gap-3">
 <Lightning size={36} weight="fill" className="shrink-0 text-amber-300" />
 <span>Ofertas de Hoje</span>
 </h1>
 <p className="text-sm text-white/90 font-medium leading-relaxed">
 As melhores promoções de <strong>todos os segmentos</strong> da plataforma — gastronomia,
 mercado, moda, farmácia e muito mais.
 </p>
 {totalDeals > 0 && (
 <div className="flex items-center gap-4 pt-1">
 <div className="flex items-center gap-1.5 text-white/90">
 <Tag size={14} weight="fill" />
 <span className="text-xs font-semibold">{totalDeals} ofertas ativas</span>
 </div>
 <div className="flex items-center gap-1.5 text-white/90">
 <Truck size={14} weight="fill" />
 <span className="text-xs font-semibold">Frete grátis em selecionados</span>
 </div>
 </div>
 )}
 </div>
 </section>
 )}

 {/* ── 2. Hotpages / Destaques de Ofertas ── */}
 {hotpages && hotpages.length > 0 && (
 <section aria-label="Coleções de Ofertas">
 <HotpagesRail hotpages={hotpages} />
 </section>
 )}

 <nav
 aria-label="Filtrar ofertas por categoria"
 className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1"
 >
 {NICHE_CHIPS.map((chip) => (
 <button
 key={chip.id}
 type="button"
 id={`chip-ofertas-${chip.id}`}
 onClick={() => handleNicheChange(chip.id)}
 className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all border cursor-pointer active:scale-98 ${
 activeNiche === chip.id
 ? "bg-primary/10 text-primary border-primary/30 font-bold"
 : "bg-card text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground"
 }`}
 >
 {chip.emoji ? <span>{chip.emoji}</span> : null}
 <span>{chip.label}</span>
 </button>
 ))}
 </nav>

 {/* ── 3. Carrosséis de Ofertas por Nicho ── */}
 {sections.length === 0 ? (
 <div className="py-20 text-center space-y-3 bg-muted/10 rounded-2xl border-0 p-8">
 <Percent size={40} className="text-muted-foreground/40 mx-auto" />
 <h2 className="text-sm font-bold text-foreground">Nenhuma oferta ativa no momento</h2>
 <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 Lojas e restaurantes da região publicarão promoções e descontos aqui. Verifique novamente em breve!
 </p>
 <Button asChild className="rounded-xl font-bold text-xs">
 <Link to="/mercado">Explorar o Mercado</Link>
 </Button>
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
 className={`size-8 rounded-xl bg-linear-to-br ${section.color} flex items-center justify-center text-white shrink-0 `}
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
 <div key={offer.id} className="min-w-[160px] sm:min-w-[180px] shrink-0">
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
 <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 pt-0.5">
 {section.stores.map((store) => (
 <Link
 key={store.id}
 to="/mercado"
 search={{ niche: section.nicho } as any}
 className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card hover:border-foreground/30 transition-all shrink-0"
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
 <section className="rounded-2xl border-0 bg-card/60 p-6 text-center space-y-3">
 <div className="size-12 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mx-auto">
 <ShoppingCart size={24} />
 </div>
 <h3 className="text-sm font-bold text-foreground">Você é lojista?</h3>
 <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
 Publique suas promoções e apareça aqui para milhares de consumidores na região.
 Configure descontos no Workspace.
 </p>
 <Button asChild size="sm" variant="outline" className="rounded-xl font-bold text-xs">
 <Link to="/workspace/marketing/promocoes">Criar Promoção</Link>
 </Button>
 </section>
 </div>
 )}
 </div>
 );
}

