import { Tag } from "lucide-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Storefront, MagnifyingGlass, SquaresFour, ListDashes, Truck, Flame, ArrowRight, CaretLeft, ShareNetwork, Lightning, House, Briefcase, Plus, Clock, CurrencyCircleDollar, Percent, CheckCircle, ForkKnife, ShoppingBag, Heartbeat, Coffee,  } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { NativeMobileHeader } from "@/components/navigation";
import { cn } from "@/lib/utils";
import { ProductCard } from "@/components/commerce/product-card";
import { StoreCard } from "@/components/commerce/store-card";
import { HorizontalRail } from "@/components/commerce/horizontal-rail";
import { getHotpageBySlug, type HotpageDTO } from "@/services/hotpage.functions";
import { listPublishedProducts } from "@/services/catalog.functions";
import { getMarketplaceFeed } from "@/services/marketplace.functions";
import { getPublicClassifieds } from "@/services/classifieds.functions";
import { formatMoney } from "@/lib/money";
import { addToCart } from "@/services/cart.functions";
import { useCartContext } from "@/lib/cart-context";
import { toast } from "sonner";
import type { ProductCardDTO } from "@/types/catalog";

// ── TEMPLATES & ESTILOS VISUAIS CANÔNICOS (PADRÃO IFOOD TURBO / HITS / RETROSPECTIVA) ──
const HOTPAGE_THEMES: Record<
 string,
 {
 bgGradient: string;
 accentColor: string;
 badgeBg: string;
 icon: any;
 defaultBadge: string;
 heroPills: string[];
 tagLine: string;
 featuredRailTitle: string;
 }
> = {
 turbo: {
 bgGradient: "bg-linear-to-b from-pink-600 via-rose-600 to-fuchsia-700",
 accentColor: "text-primary",
 badgeBg: "bg-white text-primary",
 icon: Lightning,
 defaultBadge: "⚡ #turbo",
 heroPills: ["⚡ apenas + R$ 3,99", "⏱️ em até 20 min", "💰 ou R$ 5 de volta"],
 tagLine: "Lista de ofertas que chegam rapidinho na sua porta",
 featuredRailTitle: "Promos com Turbo",
 },
 hits: {
 bgGradient: "bg-linear-to-b from-amber-500 via-orange-500 to-red-600",
 accentColor: "text-amber-600",
 badgeBg: "bg-white text-warning",
 icon: Flame,
 defaultBadge: "🍔 hits",
 heroPills: ["🔥 os mais amados", "🛵 entrega grátis", "⭐ nota 4.8+"],
 tagLine: "Os pratos e lanches mais pedidos da cidade",
 featuredRailTitle: "Top 10 Mais Pedidos",
 },
 ofertas: {
 bgGradient: "bg-linear-to-b from-red-600 via-rose-600 to-amber-600",
 accentColor: "text-destructive",
 badgeBg: "bg-amber-400 text-black",
 icon: Flame,
 defaultBadge: "🏷️ Oferta Relâmpago",
 heroPills: ["🏷️ até 50% OFF", "⏳ por tempo limitado", "🚚 entrega expressa"],
 tagLine: "Descontos imperdíveis nos melhores estabelecimentos",
 featuredRailTitle: "Ofertas em Destaque",
 },
 "frete-gratis": {
 bgGradient: "bg-linear-to-b from-emerald-600 via-teal-600 to-cyan-700",
 accentColor: "text-emerald-600",
 badgeBg: "bg-white text-emerald-700",
 icon: Truck,
 defaultBadge: "🛵 Frete Grátis",
 heroPills: ["🛵 taxa R$ 0,00", "📍 raio de até 5km", "⚡ sem valor mínimo"],
 tagLine: "Taxa zero de entrega para economizar no seu pedido",
 featuredRailTitle: "Restaurantes com Entrega Grátis",
 },
 gastronomia: {
 bgGradient: "bg-linear-to-b from-amber-600 via-orange-600 to-red-600",
 accentColor: "text-amber-600",
 badgeBg: "bg-white text-amber-700",
 icon: Flame,
 defaultBadge: "🍕 Sabor Local",
 heroPills: ["🍕 pizzas & burgers", "🥗 opções saudáveis", "🍰 doces & cafés"],
 tagLine: "Pizzas, burgers, lanches e cafés especiais selecionados",
 featuredRailTitle: "Cardápios Recomendados",
 },
 mercado: {
 bgGradient: "bg-linear-to-b from-emerald-700 via-green-600 to-teal-700",
 accentColor: "text-emerald-700",
 badgeBg: "bg-white text-emerald-800",
 icon: Storefront,
 defaultBadge: "🥦 Feira & Hortifruti",
 heroPills: ["🥦 frescos do dia", "🥩 carnes nobres", "🥖 padaria colonial"],
 tagLine: "Alimentos frescos, mercearia e produtos da região",
 featuredRailTitle: "Supermercados & Empórios",
 },
};

const MODULE_CHIPS_MAP: Record<string, Array<{ id: string; label: string; icon: any }>> = {
 turismo: [
 { id: "todos", label: "Todos os Roteiros", icon: Tag },
 { id: "passeios", label: "Passeios & Catamarã", icon: Tag },
 { id: "pousadas", label: "Cabanas & Pousadas", icon: House },
 { id: "gastronomia", label: "Vinícolas & Sabores", icon: ForkKnife },
 { id: "aventura", label: "Trilhas & Aventura", icon: Lightning },
 ],
 empregos: [
 { id: "todos", label: "Todas as Vagas", icon: Tag },
 { id: "clt", label: "Comércio & CLT", icon: Briefcase },
 { id: "tech", label: "Tech & TI", icon: Lightning },
 { id: "vendas", label: "Vendas & Comercial", icon: Flame },
 { id: "estagio", label: "Estágios & Trainee", icon: Briefcase },
 ],
 bebidas: [
 { id: "todos", label: "Todas as Bebidas", icon: Tag },
 { id: "cervejas", label: "Cervejas & Chopp", icon: Flame },
 { id: "vinhos", label: "Vinhos & Adegas", icon: Coffee },
 { id: "destilados", label: "Destilados & Gin", icon: Lightning },
 { id: "gelo", label: "Gelo & Carvão", icon: Truck },
 ],
 acougue: [
 { id: "todos", label: "Todos os Cortes", icon: Tag },
 { id: "nobres", label: "Cortes Nobres Angus", icon: Flame },
 { id: "churrasco", label: "Kits Churrasco", icon: Flame },
 { id: "diaadia", label: "Carnes do Dia a Dia", icon: ShoppingBag },
 { id: "linguicas", label: "Linguiças Coloniais", icon: Tag },
 ],
 moda: [
 { id: "todos", label: "Todas as Peças", icon: Tag },
 { id: "feminino", label: "Moda Feminina", icon: Tag },
 { id: "masculino", label: "Moda Masculina", icon: Tag },
 { id: "calcados", label: "Calçados & Tênis", icon: Lightning },
 { id: "acessorios", label: "Bolsas & Acessórios", icon: Tag },
 ],
 eletronicos: [
 { id: "todos", label: "Toda a Linha Tech", icon: Tag },
 { id: "smartphones", label: "Smartphones & 5G", icon: Lightning },
 { id: "informatica", label: "Notebooks & PC", icon: Lightning },
 { id: "audio", label: "Fones & Caixas de Som", icon: Tag },
 { id: "tvs", label: "Smart TVs 4K", icon: Lightning },
 ],
 pet: [
 { id: "todos", label: "Tudo para Pets", icon: Tag },
 { id: "caes", label: "Cães & Rações", icon: Tag },
 { id: "gatos", label: "Gatos & Areias", icon: Tag },
 { id: "veterinaria", label: "Farmácia Pet", icon: Heartbeat },
 { id: "higiene", label: "Banho & Tosa", icon: Tag },
 ],
 servicos: [
 { id: "todos", label: "Todos os Serviços", icon: Tag },
 { id: "obras", label: "Obras & Reformas", icon: Briefcase },
 { id: "manutencao", label: "Manutenção & Reparos", icon: Lightning },
 { id: "limpeza", label: "Diaristas & Faxinas", icon: Tag },
 { id: "profissionais", label: "Consultoria & Jurídico", icon: Briefcase },
 ],
 imoveis: [
 { id: "todos", label: "Todos os Imóveis", icon: Tag },
 { id: "aluguel", label: "Aluguel Fácil", icon: House },
 { id: "venda", label: "Venda & Lançamentos", icon: House },
 { id: "terrenos", label: "Terrenos & Lotes", icon: Tag },
 { id: "comercial", label: "Salas & Galpões", icon: Briefcase },
 ],
 construcao: [
 { id: "todos", label: "Todos os Materiais", icon: Tag },
 { id: "tintas", label: "Tintas & Acabamento", icon: Tag },
 { id: "ferramentas", label: "Ferramentas Pro", icon: Lightning },
 { id: "eletrica", label: "Elétrica & Fios", icon: Lightning },
 { id: "hidraulica", label: "Hidráulica & Tubos", icon: Truck },
 ],
 casa: [
 { id: "todos", label: "Tudo para Casa", icon: Tag },
 { id: "moveis", label: "Móveis & Estofados", icon: House },
 { id: "decoracao", label: "Decoração & Quadros", icon: Tag },
 { id: "iluminacao", label: "Lustres & Luzes", icon: Lightning },
 { id: "utilidades", label: "Cama, Mesa & Banho", icon: Tag },
 ],
 beleza: [
 { id: "todos", label: "Todos os Cuidados", icon: Tag },
 { id: "barbearia", label: "Barbearias Premium", icon: Tag },
 { id: "salao", label: "Salões de Beleza", icon: Tag },
 { id: "unhas", label: "Unhas & Manicure", icon: Heartbeat },
 { id: "estetica", label: "Estética & Massagem", icon: Heartbeat },
 ],
 limpeza: [
 { id: "todos", label: "Toda a Linha", icon: Tag },
 { id: "pesada", label: "Limpeza Pesada", icon: Lightning },
 { id: "lavanderia", label: "Lavanderia & Roupas", icon: Tag },
 { id: "cozinha", label: "Cozinha & Desengordurantes", icon: Tag },
 { id: "descartaveis", label: "Descartáveis & Papéis", icon: Truck },
 ],
 livros: [
 { id: "todos", label: "Todo o Catálogo", icon: Tag },
 { id: "bestsellers", label: "Best-sellers & Livros", icon: Tag },
 { id: "papelaria", label: "Papelaria Criativa", icon: Tag },
 { id: "presentes", label: "Presentes & Canecas", icon: Tag },
 { id: "jogos", label: "Jogos & Board Games", icon: Lightning },
 ],
 mobilidade: [
 { id: "todos", label: "Todos os Serviços", icon: Tag },
 { id: "corridas", label: "Corridas Rápidas", icon: Lightning },
 { id: "entregas", label: "MotoLink Flash", icon: Truck },
 { id: "fretes", label: "Fretes & Vans", icon: Truck },
 { id: "executivo", label: "Transporte VIP", icon: Tag },
 ],
 ofertas: [
 { id: "todos", label: "Todas as Ofertas", icon: Tag },
 { id: "50off", label: "Até 50% OFF", icon: Flame },
 { id: "fretegratis", label: "Frete Grátis", icon: Truck },
 { id: "combos", label: "Combos & Pague Menos", icon: Tag },
 { id: "queima", label: "Últimas Unidades", icon: Lightning },
 ],
};

const DEFAULT_QUICK_CHIPS = [
 { id: "todos", label: "Explorar", icon: Tag },
 { id: "restaurantes", label: "Restaurantes", icon: ForkKnife },
 { id: "mercados", label: "Mercados", icon: ShoppingBag },
 { id: "bebidas", label: "Bebidas", icon: Coffee },
 { id: "farmacias", label: "Farmácias", icon: Heartbeat },
];

export const Route = createFileRoute("/_store/destaques/$slug")({
 head: ({ loaderData }: { loaderData?: any }) => ({
 meta: [
 {
 title: `${loaderData?.hotpage?.title || "Destaques"} | Waesy`,
 },
 {
 name: "description",
 content:
 loaderData?.hotpage?.description ||
 "Aproveite as melhores seleções, ofertas e entregas rápidas na plataforma Waesy.",
 },
 ],
 }),
 loader: async ({ params }) => {
   try {
 const hotpageRes = await getHotpageBySlug({ data: { slug: params.slug } }).catch(() => null);
 const targetNiche = hotpageRes?.module && hotpageRes.module !== "home" && hotpageRes.module !== "ofertas"
 ? hotpageRes.module
 : params.slug === "ofertas" ? undefined : params.slug;

 const [productsRes, feedRes, classifiedsRes] = await Promise.all([
 listPublishedProducts({
 data: {
 niche: targetNiche,
 limit: 60,
 },
 }).catch(() => ({ status: "ok" as const, data: [] })),
 getMarketplaceFeed().catch(() => ({ sections: [] })),
 getPublicClassifieds({ data: {} }).catch(() => []),
 ]);

 return {
 hotpage: hotpageRes,
 initialProducts: productsRes?.status === "ok" ? productsRes.data : [],
 marketFeed: feedRes,
 classifieds: classifiedsRes || [],
 slug: params.slug,
 };
   } catch (err) {
     console.error("[loader:_store.destaques.$slug] Unhandled loader error:", err);
     return { hotpage: null, initialProducts: null, marketFeed: null, classifieds: null, slug: null };
   }
 },
 component: DedicatedHotpageView,
});

function DedicatedHotpageView() {
 const data = (Route.useLoaderData() || {}) as any;
 const { hotpage, initialProducts = [], marketFeed = { sections: [] }, slug = "" } = data;
 const { refreshCart } = useCartContext();
 const navigate = useNavigate();

 const [search, setSearch] = useState("");
 const [selectedSubCategory, setSelectedSubCategory] = useState("todos");
 const [selectedFastFilter, setSelectedFastFilter] = useState<string | null>(null);
 const [viewMode, setViewMode] = useState<"list" | "grid">("list");
 const [addingId, setAddingId] = useState<string | null>(null);

 const activeModule = hotpage?.module || slug;
 const activeChips = MODULE_CHIPS_MAP[activeModule] || DEFAULT_QUICK_CHIPS;

 const theme = HOTPAGE_THEMES[slug] || {
 bgGradient: "bg-linear-to-b from-neutral-900 via-neutral-800 to-neutral-900",
 accentColor: "text-primary",
 badgeBg: "bg-white/20 text-white",
 icon: Tag,
 defaultBadge: " Coleção Especial",
 heroPills: ["⭐ Seleção Waesy", "🚚 Entrega Rápida", "💳 Pagamento Online"],
 tagLine: "Produtos e lojas selecionadas na curadoria Waesy",
 featuredRailTitle: "Destaques da Curadoria",
 };

 const title = hotpage?.title || slug.charAt(0).toUpperCase() + slug.slice(1);
 const badgeLabel = hotpage?.badge_label || theme.defaultBadge;
 const description = hotpage?.description || theme.tagLine;
 const customIcon = hotpage?.custom_icon_url || hotpage?.icon_url;

 const { data: productsData, isLoading } = useQuery({
 queryKey: ["hotpage-products", slug, activeModule, search],
 queryFn: () =>
 listPublishedProducts({
 data: {
 niche: activeModule === "ofertas" || activeModule === "home" ? undefined : activeModule,
 limit: 60,
 },
 }),
 initialData: { status: "ok", data: initialProducts },
 });

 const rawProducts = (productsData?.status === "ok" ? productsData.data : initialProducts) as ProductCardDTO[];

 // Lógica de filtragem contextual
 const filteredProducts = useMemo(() => {
 return rawProducts.filter((p) => {
 // Regra de ofertas
 if (slug === "ofertas" || slug === "promocoes" || slug === "relampago") {
 const hasDiscount = (p.compareAtCents && p.compareAtCents > p.priceCents) || p.isBoosted;
 if (!hasDiscount && rawProducts.length > 5) return false;
 }

 // Filtro rápido
 if (selectedFastFilter === "desconto") {
 if (!p.compareAtCents || p.compareAtCents <= p.priceCents) return false;
 }

 // Filtro textual
 if (search.trim()) {
 const q = search.toLowerCase();
 const matchesTitle = p.title?.toLowerCase().includes(q);
 const matchesBrand = p.brand?.toLowerCase().includes(q);
 if (!matchesTitle && !matchesBrand) return false;
 }

 return true;
 });
 }, [rawProducts, slug, search, selectedFastFilter]);

 const handleQuickAdd = async (product: ProductCardDTO) => {
 setAddingId(product.id);
 try {
 await addToCart({ data: { variantId: product.id, quantity: 1 } });
 await refreshCart();
 toast.success(`${product.title} adicionado à sacola!`);
 } catch (err: any) {
 toast.error(err?.message || "Erro ao adicionar produto.");
 } finally {
 setAddingId(null);
 }
 };

 const handleShare = async () => {
 if (navigator.share) {
 try {
 await navigator.share({
 title: `${title} | Waesy`,
 text: description,
 url: window.location.href,
 });
 } catch {
 // Ignorado
 }
 } else {
 navigator.clipboard.writeText(window.location.href);
 toast.success("Link copiado para a área de transferência!");
 }
 };

 // Lojas participantes
 const storeSection = marketFeed.sections?.find((s: any) => s.type === "store_rail");
 const relatedStores = storeSection?.items || [];

  return (
    <div className="w-full space-y-0 pb-20 -mt-2 sm:-mt-4">
 {/* ── 1. HERO IMERSIVO FULL NO TOPO COM CAPA CONTEXTUAL ── */}
 <section className={`relative w-full ${hotpage?.cover_image_url ? "bg-black" : theme.bgGradient} text-white pt-6 sm:pt-8 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden`}>
 {/* Cover Background Fotográfico em Alta Resolução */}
 {hotpage?.cover_image_url && (
 <div className="absolute inset-0 size-full overflow-hidden pointer-events-none">
 <img
 src={hotpage.cover_image_url}
 alt={title}
 className="size-full object-cover scale-102 filter brightness-90"
 />
 <div className="absolute inset-0 bg-linear-to-t from-background via-black/75 to-black/50" />
 </div>
 )}

 {/* Barra de Navegação Canônica Flutuante no Topo do Hero */}
 <NativeMobileHeader
 fallbackHref="/explorar"
 transparent={true}
 bordered={false}
 className="relative z-10 max-w-7xl mx-auto pb-4 text-white"
 rightActions={
 <Button
 size="icon"
 variant="ghost"
 onClick={handleShare}
 className="size-9 sm:size-10 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-md border border-white/15 cursor-pointer"
 title="Compartilhar"
 >
 <ShareNetwork size={18} weight="bold" />
 </Button>
 }
 />

 {/* Conteúdo Central do Hero */}
 <div className="relative z-10 max-w-7xl mx-auto space-y-3 sm:space-y-4">
 <div className="flex items-center gap-2">
 {customIcon && (
 <div className="size-8 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 p-1 flex items-center justify-center shrink-0">
 <img
 src={customIcon}
 alt="Ícone"
 className="size-full object-contain"
 onError={(e) => {
 e.currentTarget.style.display = "none";
 }}
 />
 </div>
 )}
 <span className={`px-3 py-1 rounded-full text-xs font-mono font-black uppercase tracking-wider  ${theme.badgeBg}`}>
 {badgeLabel}
 </span>
 </div>

 <h1 className="text-3xl sm:text-5xl font-black tracking-tight drop-">
 {title}
 </h1>

 <p className="text-xs sm:text-sm text-white/90 font-medium max-w-xl leading-relaxed drop-">
 {description}
 </p>

 {/* Stat Pills Flutuantes */}
 <div className="flex flex-wrap items-center gap-2 pt-2">
 {theme.heroPills.map((pill, idx) => (
 <span
 key={idx}
 className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/35 text-white text-[11px] sm:text-xs font-bold border border-white/15 drop-"
 >
 {pill}
 </span>
 ))}
 </div>
 </div>
 </section>

 {/* ── 2. CORPO SOBREPOSTO COM CANTOS ARREDONDADOS (FOLHA / CARD FLUTUANTE) ── */}
      <div className="relative z-20 -mt-8 rounded-t-[32px] bg-background px-0 sm:px-4 md:px-0 pt-6 pb-12 space-y-6 max-w-7xl mx-auto">
 
        {/* ── 2.1. Sub-abas de Navegação por Nicho (Padrão Botão Grande) ── */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1">
          {activeChips.map((chip) => {
            const Icon = chip.icon;
            const isSelected = selectedSubCategory === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setSelectedSubCategory(chip.id)}
                className={cn(
                  "h-10 sm:h-11 px-3.5 sm:px-4 rounded-xl border text-xs sm:text-sm font-semibold shrink-0 flex items-center gap-2 transition-all cursor-pointer select-none active:scale-98 ",
                  isSelected
                    ? "bg-foreground text-background border-foreground font-bold "
                    : "bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground border-border/70"
                )}
              >
                <Icon size={16} weight={isSelected ? "bold" : "regular"} />
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>

 {/* ── 2.2. Barra de Busca e Filtros Rápidos (Ordenar, Preço, Tempo, Desconto) ── */}
 <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
 <div className="relative flex-1 max-w-md">
 <MagnifyingGlass
 size={16}
 weight="bold"
 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
 />
 <Input
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 placeholder={`Buscar em ${title}...`}
 className="pl-9.5 h-10 rounded-xl bg-card border-border text-xs focus:ring-1 focus:ring-primary w-full"
 />
 </div>

 <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
 <button
 type="button"
 onClick={() => setSelectedFastFilter(selectedFastFilter === "desconto" ? null : "desconto")}
 className={`h-8.5 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
 selectedFastFilter === "desconto"
 ? "bg-primary text-primary-foreground border-primary"
 : "bg-card border-border text-muted-foreground hover:text-foreground"
 }`}
 >
 <Percent size={13} weight="bold" />
 <span>Com Desconto</span>
 </button>

 {/* Alternador de Modo de Visualização */}
 <div className="flex items-center p-1 rounded-xl bg-muted/60 shrink-0 ml-auto sm:ml-0">
 <button
 type="button"
 onClick={() => setViewMode("list")}
 className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
 viewMode === "list"
 ? "bg-foreground text-background"
 : "text-muted-foreground hover:text-foreground"
 }`}
 title="Modo Lista (iFood)"
 >
 <ListDashes size={16} weight="bold" />
 </button>
 <button
 type="button"
 onClick={() => setViewMode("grid")}
 className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
 viewMode === "grid"
 ? "bg-foreground text-background"
 : "text-muted-foreground hover:text-foreground"
 }`}
 title="Modo Grade"
 >
 <SquaresFour size={16} weight="bold" />
 </button>
 </div>
 </div>
 </div>

 {/* ── 2.3. Carrossel de Lojas Parceiras Oficiais ── */}
 {relatedStores.length > 0 && (
 <section aria-label="Lojas Participantes" className="space-y-3 pt-2">
 <div className="flex items-center justify-between">
 <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
 <Storefront size={18} weight="bold" className={theme.accentColor} />
 <span>Lojas & Restaurantes Participantes</span>
 </h2>
 <span className="text-xs text-muted-foreground font-mono font-bold">
 {relatedStores.length} parceiros
 </span>
 </div>

 <HorizontalRail hideHeader={true} title="Lojas">
 {relatedStores.map((store: any) => (
 <div key={store.id} className="min-w-[220px] sm:min-w-[250px] max-w-[260px] shrink-0">
 <StoreCard
 id={store.id}
 name={store.name}
 slug={store.slug}
 avatar_url={store.logo_url || store.avatar_url}
 banner_url={store.banner_url}
 category={store.category || "Comércio"}
 is_open={store.isOpen ?? store.is_open ?? true}
 />
 </div>
 ))}
 </HorizontalRail>
 </section>
 )}

 {/* ── 2.4. Vitrine Principal de Produtos ── */}
 <section aria-label="Itens em Destaque" className="space-y-4 pt-2">
 <div className="flex items-center justify-between">
 <h2 className="text-sm sm:text-base font-bold text-foreground">
 {theme.featuredRailTitle}
 </h2>
 
 </div>

 {filteredProducts.length === 0 ? (
 <div className="py-16 text-center space-y-3 bg-muted/10 rounded-2xl border-0 p-8">
 <p className="font-bold text-sm text-foreground">Nenhum produto encontrado.</p>
 <p className="text-xs text-muted-foreground">Tente limpar a busca ou selecionar outro filtro.</p>
 </div>
 ) : viewMode === "list" ? (
 /* Modo Lista Canônico (Padrão iFood / 99 Delivery com imagem full na gôndola e botão +) */
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
 {filteredProducts.map((p) => {
 const isAdding = addingId === p.id;
 const hasDiscount = p.compareAtCents && p.compareAtCents > p.priceCents;
 const discountPercent = hasDiscount
 ? Math.round(((p.compareAtCents! - p.priceCents) / p.compareAtCents!) * 100)
 : null;

 return (
 <div
 key={p.id}
 className="flex items-stretch justify-between p-3 sm:p-4 rounded-2xl bg-card hover:border-foreground/30 transition-all gap-3.5 group"
 >
 {/* Imagem do Produto com Badge de Desconto */}
 <div className="relative size-20 sm:size-24 rounded-xl overflow-hidden bg-muted shrink-0 flex items-center justify-center">
 {p.coverUrl ? (
 <img
 src={p.coverUrl}
 alt={p.title}
 loading="lazy"
 className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
 />
 ) : (
 <ShoppingBag className="size-6 text-muted-foreground/40" />
 )}
 {discountPercent && (
 <div className="absolute top-1 left-1">
 <span className="bg-destructive text-white font-mono font-black text-[9px] px-1.5 py-0.5 rounded-md">
 -{discountPercent}%
 </span>
 </div>
 )}
 </div>

 {/* Informações Centrais */}
 <div className="min-w-0 flex-1 flex flex-col justify-between space-y-1">
 <div>
 {p.brand && (
 <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate block">
 {p.brand}
 </span>
 )}
 <h3 className="font-bold text-xs sm:text-sm text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
 {p.title}
 </h3>
 </div>

 <div className="flex items-baseline gap-2 pt-1">
 <span className="font-black font-mono text-sm sm:text-base text-foreground">
 {formatMoney(p.priceCents)}
 </span>
 {hasDiscount && (
 <span className="font-mono text-xs text-muted-foreground line-through">
 {formatMoney(p.compareAtCents!)}
 </span>
 )}
 </div>
 </div>

 {/* Botão de Adicionar (+) */}
 <div className="flex items-center shrink-0 self-center">
 <Button
 size="icon"
 disabled={isAdding}
 onClick={() => handleQuickAdd(p)}
 className="size-9 rounded-xl bg-foreground text-background hover:bg-foreground/90 transition-all cursor-pointer"
 title="Adicionar à Sacola"
 >
 <Plus size={16} weight="bold" />
 </Button>
 </div>
 </div>
 );
 })}
 </div>
 ) : (
 /* Modo Grade (Cards com Mídia Full Bleed) */
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
 {filteredProducts.map((product) => (
 <ProductCard key={product.id} product={product} />
 ))}
 </div>
 )}
 </section>
 </div>
 </div>
 );
}
