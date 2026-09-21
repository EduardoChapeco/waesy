import { Tag } from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
 Compass,
 MapPin,
 Star,
 AirplaneTilt,
 ForkKnife,
 Buildings,
 Mountains,
 ArrowRight,
 ShieldCheck,
 CalendarDots,
 Users,
 SuitcaseSimple,
 Ticket,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BannerHeroCarousel } from "@/components/commerce/banner-hero-carousel";
import { SlimActionBanner } from "@/components/commerce/slim-action-banner";
import { HotpagesRail } from "@/components/commerce/hotpages-rail";
import {
 DiscoveryControlBar,
 type ViewModeType,
 type FilterChipOption,
} from "@/components/commerce/discovery-control-bar";
import { listActiveBanners } from "@/services/banner.functions";
import { listHotpages } from "@/services/hotpage.functions";
import { listPublicTourism } from "@/services/tourism.functions";
import { HorizontalRail } from "@/components/commerce/horizontal-rail";
import { ContextualStoriesRail } from "@/components/stories/contextual-stories-rail";
import { TravelQuoteModal } from "@/components/tourism/travel-quote-modal";
import { resolveNicheDepartments } from "@/lib/niche-helpers";

export const Route = createFileRoute("/_store/turismo/")({
 head: () => ({
 meta: [
 { title: "Turismo, Viagens & Lazer Regional" },
 {
 name: "description",
 content:
 "Descubra os melhores passeios, pousadas de charme, ecoturismo, cachoeiras e pacotes de viagens com saída da sua região.",
 },
 ],
 }),
 loader: async () => {
   try {
 const [banners, hotpages, tourismItems] = await Promise.all([
 listActiveBanners({ data: { placement: "turismo" } }).catch(() => []),
 listHotpages({ data: { module: "turismo" } }).catch(() => []),
 listPublicTourism().catch(() => []),
 ]);

 return { banners, hotpages, tourismItems };
   } catch (err) {
     console.error("[loader:_store.turismo.index] Unhandled error:", err);
     return { banners: [], hotpages: [], tourismItems: [] };
   }
 },
 component: TourismMasterPage,
});

const CATEGORY_CHIPS: FilterChipOption[] = [
 { id: "todos", label: "Tudo", emoji: "✈️", icon: Tag },
 { id: "pacotes", label: "Pacotes & Voos", emoji: "🏖️", icon: AirplaneTilt },
 { id: "hospedagens", label: "Cabanas & Pousadas", emoji: "🏡", icon: Buildings },
 { id: "passeios", label: "Passeios & Lazer", emoji: "🚤", icon: Mountains },
 { id: "cruzeiros", label: "Cruzeiros Marítimos", emoji: "🚢", icon: SuitcaseSimple },
 { id: "vistos", label: "Visto Americano", emoji: "🛂", icon: ShieldCheck },
 { id: "agencias", label: "Agências & Guias", emoji: "🧭", icon: Compass },
];

function TourismMasterPage() {
 const { banners = [], hotpages = [], tourismItems: initialItems = [] } = ((Route.useLoaderData() as any) || {});
 const [selectedCategory, setSelectedCategory] = useState("todos");
 const [viewMode, setViewMode] = useState<ViewModeType>("grid");
 const [search, setSearch] = useState("");
 const [selectedDepartureAirport, setSelectedDepartureAirport] = useState<string>("todos");
 const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
 const [quoteDestination, setQuoteDestination] = useState("");

 const { data: items } = useQuery({
 queryKey: ["tourism-list", selectedCategory, search],
 queryFn: () =>
 listPublicTourism({
 data: {
 category: selectedCategory !== "todos" ? selectedCategory : undefined,
 search: search || undefined,
 },
 }),
 initialData: initialItems,
 });

 const tourismList: any[] = items || [];

 // Agrupamento por Categoria para Modo Feed
 const tourismByCategory = useMemo(() => {
 const map = new Map<string, typeof tourismList>();
 tourismList.forEach((item) => {
 const cat = item.category || "passeios";
 if (!map.has(cat)) map.set(cat, []);
 map.get(cat)!.push(item);
 });
 return Array.from(map.entries()).map(([catKey, catItems]) => {
 const chip = CATEGORY_CHIPS.find((c) => c.id === catKey);
 return {
 categoryKey: catKey,
 categoryName: chip?.label || "Experiências em Destaque",
 items: catItems,
 };
 });
 }, [tourismList]);

 const handleOpenQuote = (destination = "") => {
 setQuoteDestination(destination);
 setIsQuoteModalOpen(true);
 };

 return (
 <div className="w-full space-y-6 pb-20">
 {/* ── 1. Top Banners Promocionais ── */}
 {banners && banners.length > 0 && (
 <BannerHeroCarousel banners={banners} className="w-full" />
 )}

 {/* ── 2. Stories Rápidos de Roteiros, Hotéis & Experiências ── */}
 <ContextualStoriesRail niche="turismo" className="py-1" />

 {/* ── 2.5. Banner Fino Dinâmico (Renderiza SOMENTE se cadastrado no Admin Master) ── */}
 {banners?.some((b: any) => (b as any).format === "slim") && (
 <SlimActionBanner
 banner={banners?.find((b: any) => (b as any).format === "slim")}
 onCtaClick={() => handleOpenQuote()}
 />
 )}

 {/* ── 3. Hotpages Contextuais de Turismo ── */}
 {hotpages && hotpages.length > 0 && (
 <section aria-label="Coleções Turísticas">
 <HotpagesRail
 hotpages={hotpages}
 activeSlug={selectedCategory}
 onSelect={(slug) => setSelectedCategory(slug)}
 />
 </section>
 )}

 {/* ── 4. Discovery Control Bar com Chips de Turismo ── */}
 <DiscoveryControlBar
 search={search}
 onSearchChange={setSearch}
 searchPlaceholder="Buscar destinos, pousadas, vinícolas, roteiros..."
 categories={CATEGORY_CHIPS}
 activeCategory={selectedCategory}
 onSelectCategory={(id) => setSelectedCategory(id)}
 viewMode={viewMode}
 onViewModeChange={setViewMode}
 />

 {/* ── 5. Modo Feed / Modo Grade de Turismo com Mídia Full Bleed ── */}
 {viewMode === "grid" ? (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
 {tourismList.map((item) => (
 <div
 key={item.id}
 className="rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-foreground/30 transition-all flex flex-col justify-between group"
 >
 {/* Mídia Full Bleed 100% de ponta a ponta */}
 <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
 {item.cover_image ? (
 <img
 src={item.cover_image}
 alt={item.title}
 className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
 loading="lazy"
 />
 ) : (
 <div className="size-full flex items-center justify-center text-muted-foreground">
 <AirplaneTilt size={36} />
 </div>
 )}
 {item.badge_label && (
 <div className="absolute top-3 left-3">
 <Badge className="bg-background/95 backdrop-blur-md text-foreground font-mono text-[10px] uppercase font-bold ">
 {item.badge_label}
 </Badge>
 </div>
 )}
 </div>

 {/* Corpo com Padding Interno */}
 <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
 <div className="space-y-1.5">
 <div className="flex items-center justify-between gap-1 text-xs text-muted-foreground font-semibold">
 <span className="flex items-center gap-1 truncate">
 <MapPin size={13} className="text-primary shrink-0" />
 <span className="truncate">{item.location_name || "Regional"}</span>
 </span>
 {item.rating && (
 <span className="flex items-center gap-1 font-bold text-foreground">
 <Star size={13} weight="fill" className="text-amber-400" />
 <span>{item.rating.toFixed(1)}</span>
 </span>
 )}
 </div>

 <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1">
 {item.title}
 </h3>

 {item.subtitle && (
 <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
 {item.subtitle}
 </p>
 )}
 </div>

 <div className="pt-3 flex items-center justify-between gap-2">
 <div>
 <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
 A partir de
 </span>
 <span className="text-base font-black font-mono text-foreground">
 {item.price_display || "Consulte"}
 </span>
 </div>

 <div className="flex items-center gap-2">
 <Button
 size="sm"
 variant="outline"
 onClick={() => handleOpenQuote(item.title)}
 className="rounded-xl font-bold text-xs h-9 px-3"
 >
 Cotar
 </Button>

 <Button
 asChild
 size="sm"
 className="rounded-xl font-bold text-xs h-9 px-4"
 >
 <Link to="/turismo/$id" params={{ id: item.id }}>
 <span>Ver Roteiro</span>
 <ArrowRight size={14} weight="bold" className="ml-1" />
 </Link>
 </Button>
 </div>
 </div>
 </div>
 </div>
 ))}
 </div>
 ) : (
 /* MODO FEED COM TRILHOS HORIZONTAIS */
 <div className="space-y-8">
 {tourismByCategory.map(({ categoryKey, categoryName, items: catItems }) => (
 <HorizontalRail
 key={categoryKey}
 title={categoryName}
 hideHeader={true}
 badge={`${catItems.length} ${catItems.length === 1 ? "roteiro" : "roteiros"}`}
 actionLabel="Ver todos"
 onAction={() => {
 setSelectedCategory(categoryKey);
 setViewMode("grid");
 }}
 >
 {catItems.map((item) => (
 <div
 key={item.id}
 className="min-w-[280px] sm:min-w-[320px] max-w-[340px] rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-foreground/30 transition-all flex flex-col justify-between shrink-0 group"
 >
 <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
 {item.cover_image && (
 <img
 src={item.cover_image}
 alt={item.title}
 className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
 loading="lazy"
 />
 )}
 {item.badge_label && (
 <div className="absolute top-2.5 left-2.5">
 <Badge className="bg-background/90 text-foreground font-mono text-[9px] uppercase font-bold">
 {item.badge_label}
 </Badge>
 </div>
 )}
 </div>

 <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
 <div>
 <span className="text-[11px] text-muted-foreground font-semibold truncate block">
 {item.location_name || "Regional"}
 </span>
 <h4 className="font-bold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
 {item.title}
 </h4>
 </div>

 <div className="pt-2 flex items-center justify-between gap-2">
										<span className="font-black font-mono text-sm text-foreground">
											{item.price_display || "Consulte"}
										</span>
										<div className="flex items-center gap-1.5">
											<Button
												size="sm"
												variant="outline"
												onClick={() => handleOpenQuote(item.title)}
												className="h-9 px-3 rounded-xl font-bold text-xs"
											>
												Cotar
											</Button>
											<Button
												asChild
												size="sm"
												className="h-9 px-3 rounded-xl font-bold text-xs"
											>
												<Link to="/turismo/$id" params={{ id: item.id }}>
													Ver
												</Link>
											</Button>
										</div>
									</div>
 </div>
 </div>
 ))}
 </HorizontalRail>
 ))}
 </div>
 )}

 {/* Modal / Wizard de Cotação CVC */}
 <TravelQuoteModal
 open={isQuoteModalOpen}
 onOpenChange={setIsQuoteModalOpen}
 defaultDestination={quoteDestination}
 />
 </div>
 );
}
