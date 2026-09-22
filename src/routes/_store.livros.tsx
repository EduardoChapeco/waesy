import { Tag } from "lucide-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useState, useMemo } from "react";
import {
 Books,
 BookOpen,
 PencilCircle,
 Gift,
 Student,
 PaintBrush,
 PuzzlePiece,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/state/states";
import { PageSkeleton } from "@/components/state/loading";
import { HorizontalRail } from "@/components/commerce/horizontal-rail";
import { StoreCard } from "@/components/commerce/store-card";
import { HotpagesRail } from "@/components/commerce/hotpages-rail";
import {
 DiscoveryControlBar,
 type ViewModeType,
 type FilterChipOption,
} from "@/components/commerce/discovery-control-bar";
import { getModularSurfaceFeed } from "@/services/surface-cms.functions";
import { ModularSurfaceFeed } from "@/components/commerce/modular-surface-feed";
import { OfferCard } from "@/components/commerce/offer-card";
import { listActiveBanners } from "@/services/banner.functions";
import { listHotpages } from "@/services/hotpage.functions";
import { BannerHeroCarousel } from "@/components/commerce/banner-hero-carousel";
import { listPublishedProducts } from "@/services/catalog.functions";
import type { ProductCardDTO } from "@/types/catalog";
import { resolveNicheDepartments } from "@/lib/niche-helpers";

const SearchSchema = z.object({
 q: z.string().optional(),
 view: z.enum(["feed", "grid", "list"]).default("feed").optional(),
 sort: z.enum(["newest", "price_asc", "price_desc", "in_stock"]).default("newest").optional(),
 categoria: z.string().optional(),
});

type LivrosSearch = z.infer<typeof SearchSchema>;

const LIVROS_DEPARTMENTS: FilterChipOption[] = [
 { id: "todos", label: "Tudo em Livros & Papelaria", icon: Tag },
 { id: "livros", label: "Livros & Best-sellers", icon: BookOpen },
 { id: "papelaria", label: "Papelaria & Material Escolar", icon: PencilCircle },
 { id: "presentes", label: "Presentes & Criativos", icon: Gift },
 { id: "arte", label: "Arte & Artesanato", icon: PaintBrush },
 { id: "jogos", label: "Jogos de Tabuleiro & Quebra-cabeças", icon: PuzzlePiece },
 { id: "academico", label: "Acadêmico & Concursos", icon: Student },
];

export const Route = createFileRoute("/_store/livros")({
 head: () => ({
 meta: [
 { title: "Livros, Papelaria & Presentes Criativos | Waesy" },
 {
 name: "description",
 content:
 "Encontre livros, materiais escolares e de escritório, presentes criativos e jogos nas livrarias e papelarias da sua região.",
 },
 ],
 }),
 validateSearch: (search: Record<string, unknown>): LivrosSearch => SearchSchema.parse(search),
 loaderDeps: ({ search }) => search,
 loader: async () => {
   try {
 const [banners, hotpages, marketplaceFeed, productsRes] = await Promise.all([
 listActiveBanners({ data: { placement: "livros" } }).catch(() => []),
 listHotpages({ data: { module: "livros" } }).catch(() => []),
 getModularSurfaceFeed({ data: { surfaceSlug: "livros" } }).catch(() => ({ sections: [], allProducts: [] })),
 listPublishedProducts({ data: { niche: "livros", limit: 40 } }).catch(() => ({ status: "empty" as const, data: [] as ProductCardDTO[] })),
 ]);
 return {
 banners,
 hotpages,
 marketplaceFeed,
 catalogProducts: (productsRes as any).data ?? [],
 };
   } catch (err) {
     console.error("[loader:_store.livros] Unhandled error:", err);
     return { banners: null, hotpages: null, marketplaceFeed: null, catalogProducts: null };
   }
 },
 component: LivrosVerticalPage,
 pendingComponent: PageSkeleton,
});

function LivrosVerticalPage() {
 const { banners, hotpages, marketplaceFeed, catalogProducts } = ((Route.useLoaderData?.() as any) || {});
 const search = Route.useSearch();
 const navigate = useNavigate({ from: Route.fullPath });

 const [activeDepartment, setActiveDepartment] = useState(search.categoria || "todos");
 const [viewMode, setViewMode] = useState<ViewModeType>(search.view || "feed");

 const handleDepartmentChange = (depId: string) => {
 setActiveDepartment(depId);
 navigate({
 search: (prev) => ({
 ...prev,
 categoria: depId === "todos" ? undefined : depId,
 }),
 });
 };

 const handleViewModeChange = (mode: ViewModeType) => {
 setViewMode(mode);
 navigate({
 search: (prev) => ({
 ...prev,
 view: mode === "feed" ? undefined : mode,
 }),
 });
 };

 // Filtragem de produtos para livros, papelaria e presentes
 const filteredProducts = useMemo(() => {
 const allProducts = marketplaceFeed?.allProducts || [];
 return allProducts.filter((p: any) => {
 const titleLower = p.title.toLowerCase();
 const descLower = (p.description || "").toLowerCase();
 const tags = (p.tags || []).map((t: string) => t.toLowerCase());

 const isBookItem =
 titleLower.includes("livro") ||
 titleLower.includes("caderno") ||
 titleLower.includes("caneta") ||
 titleLower.includes("lápis") ||
 titleLower.includes("mochila") ||
 titleLower.includes("estojo") ||
 titleLower.includes("agenda") ||
 titleLower.includes("planner") ||
 titleLower.includes("jogo") ||
 titleLower.includes("presente") ||
 titleLower.includes("tinta") ||
 titleLower.includes("pincel") ||
 tags.some((t: string) => ["livros", "papelaria", "presentes", "jogos"].includes(t));

 if (activeDepartment === "todos") return isBookItem || allProducts.length <= 12;
 if (activeDepartment === "livros")
 return titleLower.includes("livro") || titleLower.includes("romance") || titleLower.includes("box") || titleLower.includes("hq") || titleLower.includes("manga");
 if (activeDepartment === "papelaria")
 return titleLower.includes("caderno") || titleLower.includes("caneta") || titleLower.includes("lápis") || titleLower.includes("planner") || titleLower.includes("estojo");
 if (activeDepartment === "presentes")
 return titleLower.includes("presente") || titleLower.includes("caneca") || titleLower.includes("chaveiro") || titleLower.includes("pelúcia");
 if (activeDepartment === "arte")
 return titleLower.includes("tinta") || titleLower.includes("pincel") || titleLower.includes("tela") || titleLower.includes("aquarela");
 if (activeDepartment === "jogos")
 return titleLower.includes("jogo") || titleLower.includes("quebra-cabeça") || titleLower.includes("tabuleiro") || titleLower.includes("card");
 if (activeDepartment === "academico")
 return titleLower.includes("concurso") || titleLower.includes("direito") || titleLower.includes("dicionário") || titleLower.includes("gramática");
 return true;
 });
 }, [marketplaceFeed, activeDepartment]);

 // Livrarias e Papelarias locais
 const bookStores = useMemo(() => {
 const storeSection = marketplaceFeed?.sections?.find((s: any) => s.type === "store_rail");
 const stores = storeSection?.items || [];
 return stores.filter((s: any) => {
 const type = (s.type || "").toLowerCase();
 const name = (s.name || "").toLowerCase();
 return (
 type.includes("livraria") ||
 type.includes("papelaria") ||
 name.includes("livraria") ||
 name.includes("papelaria") ||
 name.includes("livros") ||
 name.includes("presentes")
 );
 });
 }, [marketplaceFeed]);

 return (
 <div className="w-full space-y-6 pb-20">
 {/* ── 1. Banners ── */}
 {banners && banners.length > 0 && (
 <section aria-label="Banners de Livraria">
 <BannerHeroCarousel banners={banners} />
 </section>
 )}

 {/* ── 2. Hotpages / Destaques ── */}
 {hotpages && hotpages.length > 0 && (
 <section aria-label="Coleções de Livros">
 <HotpagesRail hotpages={hotpages} />
 </section>
 )}

 {/* ── 3. Discovery Control Bar ── */}
 <DiscoveryControlBar
 search={search.q || ""}
 onSearchChange={(q) => navigate({ search: (prev) => ({ ...prev, q }) })}
 searchPlaceholder="Buscar livros, cadernos, canetas, jogos, presentes..."
 categories={LIVROS_DEPARTMENTS}
 activeCategory={activeDepartment}
 onSelectCategory={handleDepartmentChange}
 viewMode={viewMode}
 onViewModeChange={handleViewModeChange}
 />

 {/* ── 4. Renderização do Feed Modular ou Grade Filtrada ── */}
 {viewMode === "feed" ? (
 <div className="space-y-8">
 {marketplaceFeed?.sections && marketplaceFeed.sections.length > 0 && (
 <ModularSurfaceFeed sections={marketplaceFeed.sections} />
 )}

 {filteredProducts.length > 0 ? (
 <div className="space-y-8">
 {(() => {
 const grouped = filteredProducts.reduce((acc: Record<string, typeof filteredProducts>, prod: any) => {
 const key = prod.category_name || prod.category || prod.store_name || "Livros em Destaque";
 if (!acc[key]) acc[key] = [];
 acc[key].push(prod);
 return acc;
 }, {});

 return Object.entries(grouped).map(([groupName, prods]: [string, any]) => (
 <HorizontalRail
 key={groupName}
 title={groupName}
 hideHeader={false}
 actionLabel="Ver grade"
 onAction={() => handleViewModeChange("grid")}
 >
 {prods.map((prod: any) => (
 <div key={prod.id} className="w-56 sm:w-64 shrink-0">
 <GroceryProductCard product={prod} viewMode="grid" />
 </div>
 ))}
 </HorizontalRail>
 ));
 })()}
 </div>
 ) : (
 <div className="py-12 text-center bg-card rounded-2xl p-6">
 <EmptyState
 title="Nenhum livro ou item de papelaria encontrado"
 description="Tente selecionar outro departamento ou busque por títulos específicos."
 />
 </div>
 )}
 </div>
 ) : (
 <section aria-label="Vitrine de Produtos">
 {filteredProducts.length === 0 ? (
 <div className="py-12 text-center bg-card rounded-2xl p-6">
 <EmptyState
 title="Nenhum livro ou item de papelaria encontrado"
 description="Tente selecionar outro departamento ou busque por títulos específicos."
 />
 </div>
 ) : viewMode === "list" ? (
 <div className="flex flex-col gap-3">
 {filteredProducts.map((product: any) => (
 <OfferCard key={product.id} {...product} />
 ))}
 </div>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
 {filteredProducts.map((product: any) => (
 <OfferCard key={product.id} {...product} />
 ))}
 </div>
 )}
 </section>
 )}
 </div>
 );
}
