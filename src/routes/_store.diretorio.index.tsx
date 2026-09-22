import { Tag } from "lucide-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { PlacesHighlightBadge } from "@/components/shell/places-highlight-badge";
import { Badge } from "@/components/ui/badge";
import { Compass, CheckCircle, MapPin, Clock, WhatsappLogo, Heartbeat, Wrench, CarProfile, Briefcase, Star, ArrowRight, Storefront, ShieldCheck, Phone, ShareNetwork, Image as ImageIcon, AirplaneTilt, ForkKnife } from "@phosphor-icons/react";
import { getPublicDirectory, type DirectoryListingDTO } from "@/services/directory.functions";
import { listHotpages } from "@/services/hotpage.functions";
import { listActiveBanners } from "@/services/banner.functions";
import { BannerHeroCarousel } from "@/components/commerce/banner-hero-carousel";
import { HotpagesRail } from "@/components/commerce/hotpages-rail";
import { trackAndOpenWhatsApp } from "@/lib/whatsapp";
import { ProtectedContactButton } from "@/components/common/protected-contact-button";
import {
 DiscoveryControlBar,
 type ViewModeType,
 type FilterChipOption,
} from "@/components/commerce/discovery-control-bar";
import { HorizontalRail } from "@/components/commerce/horizontal-rail";
import { EmptyState } from "@/components/state/states";
import { resolveNicheDepartments } from "@/lib/niche-helpers";

const DIRECTORY_CATEGORIES: FilterChipOption[] = [
 { id: "todos", label: "Tudo", emoji: "🏢", icon: Tag },
 { id: "turismo", label: "Turismo", emoji: "✈️", icon: AirplaneTilt },
 { id: "gastronomia", label: "Gastronomia", emoji: "🍽️", icon: ForkKnife },
 { id: "comercio", label: "Comércio", emoji: "🛍️", icon: Storefront },
 { id: "saude", label: "Saúde", emoji: "🩺", icon: Heartbeat },
 { id: "reformas", label: "Reformas", emoji: "🔨", icon: Wrench },
 { id: "auto", label: "Automotivo", emoji: "🚗", icon: CarProfile },
 { id: "pet", label: "Pet", emoji: "🐾", icon: Tag },
 { id: "servicos", label: "Serviços", emoji: "💼", icon: Briefcase },
];

export const Route = createFileRoute("/_store/diretorio/")({
 head: () => ({
 meta: [
 { title: "Guia & Diretório de Empresas e Serviços" },
 {
 name: "description",
 content:
 "Encontre empresas, clínicas, oficinas, prestadores de serviços e comércios locais na região com fotos, avaliações, horários e contato direto via WhatsApp.",
 },
 ],
 }),
  loader: async () => {
    try {
      const [banners, hotpages] = await Promise.all([
        listActiveBanners({ data: { placement: "diretorio" } }).catch(() => []),
        listHotpages({ data: { module: "diretorio" } }).catch(() => []),
      ]);
      return { banners: banners || [], hotpages: hotpages || [] };
    } catch (err) {
      console.error("[loader:_store.diretorio.index] Unhandled error:", err);
      return { banners: [], hotpages: [] };
    }
  },
  component: DirectoryPage,
});

function DirectoryPage() {
  const { banners = [], hotpages = [] } = ((Route.useLoaderData?.() as any) || {});
 const [selectedCategory, setSelectedCategory] = useState("todos");
 const [viewMode, setViewMode] = useState<ViewModeType>("feed");
 const [searchQuery, setSearchQuery] = useState("");
 const navigate = useNavigate();

 const { data: listings, isLoading } = useQuery({
 queryKey: ["public-directory", selectedCategory, searchQuery],
 queryFn: () =>
 getPublicDirectory({
 data: {
 limit: 60,
 category: selectedCategory === "todos" ? undefined : selectedCategory,
 search: searchQuery || undefined,
 },
 }),
 staleTime: 60_000,
 });

 const filteredListings = listings || [];

 // Agrupamento por Categoria para o Modo Feed
 const listingsByCategory = useMemo(() => {
 const map = new Map<string, DirectoryListingDTO[]>();
 filteredListings.forEach((item) => {
 const cat = item.category || "servicos";
 if (!map.has(cat)) map.set(cat, []);
 map.get(cat)!.push(item);
 });
 return Array.from(map.entries()).map(([catKey, catItems]) => {
 const chip = DIRECTORY_CATEGORIES.find((c) => c.id === catKey);
 return {
 categoryKey: catKey,
 categoryName: chip?.label || "Comércios & Serviços",
 items: catItems,
 };
 });
 }, [filteredListings]);

 // Empresas mais bem avaliadas para o carrossel de destaques no Feed
 const topRatedListings = useMemo(() => {
 return [...filteredListings]
 .filter((item) => item.rating >= 4.5)
 .slice(0, 6);
 }, [filteredListings]);

  return (
    <div className="w-full space-y-3.5 sm:space-y-4 pb-14">
      {/* ── 1. Banners Hero de Topo ── */}
 {banners && banners.length > 0 && (
 <BannerHeroCarousel banners={banners} className="w-full" />
 )}

 {/* ── 2. Hotpages & Coleções Locais ── */}
 {hotpages && hotpages.length > 0 && (
 <section aria-label="Categorias em Destaque">
 <HotpagesRail
 hotpages={hotpages}
 activeSlug={selectedCategory}
 onSelect={(slug) => setSelectedCategory(slug)}
 />
 </section>
 )}

 <DiscoveryControlBar
 search={searchQuery}
 onSearchChange={setSearchQuery}
 searchPlaceholder="Buscar empresas, médicos, mecânicos, pet shops, lojas..."
 categories={DIRECTORY_CATEGORIES}
 activeCategory={selectedCategory}
 onSelectCategory={setSelectedCategory}
 viewMode={viewMode}
 onViewModeChange={setViewMode}
 allowedViewModes={["feed", "grid", "list"]}
 />

 {/* ── 4. Renderização Conforme o Modo de Visualização ── */}

  {/* MODE 1: FEED / TIMELINE DE EMPRESAS COM TRILHOS TEMÁTICOS CANÔNICOS */}
  {viewMode === "feed" && (
    <div className="space-y-4 sm:space-y-5">
 {/* Trilho de Empresas em Destaque (Mais Bem Avaliadas / Verificadas) */}
 {topRatedListings.length > 0 && (
 <HorizontalRail
 title="Destaques & Mais Bem Avaliados"
 badge="Top Escolhas"
 actionLabel="Ver grade"
 onAction={() => setViewMode("grid")}
 >
 {topRatedListings.map((item) => (
 <div key={item.id} className="w-[300px] sm:w-[320px] shrink-0 flex flex-col h-full">
 <DirectoryBusinessCard item={item} />
 </div>
 ))}
 </HorizontalRail>
 )}

 {/* Trilhos por Categoria com Títulos Limpos e Itens Específicos */}
 {listingsByCategory.length > 1 &&
 listingsByCategory.map(({ categoryKey, categoryName, items }) => (
 <HorizontalRail
 key={categoryKey}
 title={categoryName}
 actionLabel="Ver todas"
 onAction={() => {
 setSelectedCategory(categoryKey);
 setViewMode("grid");
 }}
 >
 {items.map((item) => (
 <div key={item.id} className="w-[300px] sm:w-[320px] shrink-0 flex flex-col h-full">
 <DirectoryBusinessCard item={item} />
 </div>
 ))}
 </HorizontalRail>
 ))}

  {/* Seção Geral: Todas as Empresas da Região */}
  <div className="space-y-3 pt-3 border-t border-border/40">
 <div className="flex items-center justify-between">
 <h2 className="text-base font-bold text-foreground flex items-center gap-2">
 <Storefront size={18} weight="bold" className="text-primary" />
 <span>Todas as Empresas e Serviços da Região</span>
 </h2>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
 {filteredListings.map((item) => (
 <div key={item.id} className="h-full flex flex-col">
 <DirectoryBusinessCard item={item} />
 </div>
 ))}
 </div>
 </div>

 {filteredListings.length === 0 && !isLoading && (
 <div className="py-16 text-center space-y-3 bg-card rounded-2xl border border-border/60 p-8">
 <EmptyState title="Nenhuma empresa ou serviço encontrado nesta categoria." />
 <div className="pt-2">
 <Button
 size="sm"
 variant="outline"
 onClick={() => {
 setSelectedCategory("todos");
 setSearchQuery("");
 }}
 className="rounded-xl font-bold text-xs"
 >
 Ver todo o diretório
 </Button>
 </div>
 </div>
 )}
 </div>
 )}

      {/* MODE 2: GRADE EXPANDIDA PADRONIZADA COM IMAGEM FULL SPLIT */}
      {viewMode === "grid" && (
        <div>
          {filteredListings.length === 0 && !isLoading ? (
            <div className="py-24 text-center space-y-3 bg-card rounded-2xl border border-border/60 p-8">
              <EmptyState title="Nenhuma empresa encontrada com estes filtros." />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 items-stretch">
              {filteredListings.map((item) => (
                <div key={item.id} className="h-full flex flex-col">
                  <DirectoryBusinessCard item={item} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODE 3: LISTA ESTILO GUIA COMERCIAL COM SPLIT HORIZONTAL PERFEITO */}
      {viewMode === "list" && (
        <div className="space-y-3 w-full">
          {filteredListings.length === 0 && !isLoading ? (
            <div className="py-24 text-center space-y-3 bg-card rounded-2xl border border-border/60 p-8">
              <EmptyState title="Nenhuma empresa encontrada com estes filtros." />
            </div>
          ) : (
            <div className="flex flex-col space-y-3 w-full">
              {filteredListings.map((item) => (
                <DirectoryListItem key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── COMPONENTE PADRONIZADO: CARD DE EMPRESA COM ALTURA E LARGURA RIGOROSAS (APPLE HIG) ──────────────
function DirectoryBusinessCard({
  item,
}: {
  item: DirectoryListingDTO;
}) {
  const coverUrl = item.banner_url || item.avatar_url;

  const categoryLabel =
    DIRECTORY_CATEGORIES.find((c) => c.id === item.category)?.label || item.category;

  const whatsappNumber = (item.contact_whatsapp || item.contact_phone || "").replace(/\D/g, "");

  return (
    <div className="group relative flex flex-col justify-between w-full h-full min-h-[440px] max-h-[450px] rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-foreground/30 transition-all duration-300 select-none shadow-2xs">
      <Link
        to="/diretorio/$id"
        params={{ id: item.id }}
        className="focus-visible:outline-none flex-1 flex flex-col min-h-0"
      >
        {/* ── Imagem Full Split Superior (16:9 Rigoroso) ── */}
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted/30 shrink-0">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={item.business_name}
              loading="lazy"
              className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="size-full bg-gradient-to-br from-primary/10 via-muted/40 to-muted flex items-center justify-center">
              <Briefcase className="size-8 text-primary/30" />
            </div>
          )}

          {/* Gradiente de proteção para badges superiores */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/30 pointer-events-none" />

          {/* Badge de Categoria no Topo Esquerdo */}
          <div className="absolute top-2.5 left-2.5">
            <Badge className="bg-background/90 text-foreground backdrop-blur-md text-[10px] font-bold px-2 py-0.5 rounded-lg border border-border/40">
              {categoryLabel}
            </Badge>
          </div>

          {/* Badge de Verificado no Topo Direito (Clean Paradigma) */}
          {item.is_verified && (
            <div className="absolute top-2.5 right-2.5">
              <Badge className="bg-background/90 text-foreground backdrop-blur-md text-[10px] font-bold px-2 py-0.5 rounded-lg border border-border/40 flex items-center gap-1 shadow-2xs">
                <ShieldCheck size={12} weight="bold" className="text-primary" />
                <span>Verificado</span>
              </Badge>
            </div>
          )}
        </div>

        {/* ── Conteúdo do Card: Espaçamento e Alturas Padronizadas ── */}
        <div className="p-4 flex-1 flex flex-col justify-between space-y-2.5 min-h-0">
          <div className="space-y-2">
            {/* Header: Avatar + Título + Avaliação */}
            <div className="flex items-start gap-2.5">
              <div className="size-10 rounded-xl bg-card border border-border/80 overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
                {item.avatar_url ? (
                  <img
                    src={item.avatar_url}
                    alt={item.business_name}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="size-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs font-mono">
                    {item.business_name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1 pt-0.5">
                <h3 className="text-sm font-bold text-foreground truncate leading-tight group-hover:text-primary transition-colors h-5">
                  {item.business_name}
                </h3>

                {/* Avaliação em Estrelas (Altura fixa h-4 garantida) */}
                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground h-4">
                  {item.rating ? (
                    <>
                      <div className="flex items-center text-amber-500">
                        <Star size={12} weight="fill" />
                        <span className="font-bold font-mono ml-1 text-foreground text-[11px]">
                          {Number(item.rating).toFixed(1)}
                        </span>
                      </div>
                      {item.reviews_count > 0 && (
                        <span className="text-[11px] font-medium text-muted-foreground truncate">
                          ({item.reviews_count} avaliações)
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/60 font-mono">Novo no diretório</span>
                  )}
                </div>
              </div>
            </div>

            {/* Endereço / Localização (Altura fixa h-4) */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium h-4">
              <MapPin size={13} weight="bold" className="text-primary shrink-0" />
              <span className="truncate">{item.address || "Regional"}</span>
            </div>

            {/* Especialidades / Tags (Altura fixa h-6) */}
            <div className="h-6 flex items-center gap-1 overflow-hidden">
              {item.specialties && item.specialties.length > 0 ? (
                item.specialties.slice(0, 3).map((spec, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-md truncate max-w-[110px] shrink-0"
                  >
                    {spec}
                  </span>
                ))
              ) : (
                <span className="text-[10px] font-medium text-muted-foreground/50 italic truncate">
                  Atendimento Comercial Oficial
                </span>
              )}
            </div>

            {/* Descrição Resumida (Altura fixa de 2 linhas h-9 exata) */}
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed h-9 overflow-hidden">
              {item.description || "Empresa oficial cadastrada no ecossistema Waesy."}
            </p>
          </div>
        </div>
      </Link>

      {/* ── Barra de Ações Rápidas (Sempre Ancorada no Rodapé com Altura Fixa h-14) ── */}
      <div className="px-4 pb-4 pt-2.5 flex items-center justify-between gap-2 border-t border-border/40 mt-auto shrink-0 h-14">
        {whatsappNumber ? (
          <ProtectedContactButton
            phone={whatsappNumber}
            entityType="directory"
            entityId={item.id}
            entityTitle={item.business_name}
            storeId={(item as any).store_id || null}
            niche={item.category}
            variant="outline"
            size="sm"
            label="WhatsApp"
            className="h-10 text-xs px-3 shrink-0"
          />
        ) : (
          <div className="hidden" />
        )}

        <Button
          asChild
          size="sm"
          className="rounded-xl font-bold text-xs h-10 px-4 flex-1 bg-foreground text-background hover:bg-foreground/90 transition-all gap-1.5 cursor-pointer"
        >
          <Link to="/diretorio/$id" params={{ id: item.id }}>
            <span>Ver Perfil</span>
            <ArrowRight size={14} weight="bold" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

// ─── COMPONENTE PADRONIZADO: ITEM EM MODO LISTA COM SPLIT HORIZONTAL PERFEITO ──────────────────────────────────
function DirectoryListItem({ item }: { item: DirectoryListingDTO }) {
 const coverUrl = item.banner_url || item.avatar_url;

 const categoryLabel =
 DIRECTORY_CATEGORIES.find((c) => c.id === item.category)?.label || item.category;

 const whatsappNumber = (item.contact_whatsapp || item.contact_phone || "").replace(/\D/g, "");

 return (
 <div className="flex flex-col sm:flex-row items-stretch justify-between rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-foreground/30 transition-all group">
 <Link
 to="/diretorio/$id"
 params={{ id: item.id }}
 className="flex flex-col sm:flex-row items-stretch min-w-0 flex-1 focus-visible:outline-none"
 >
 {/* ── Imagem Split Lateral Completa (Full Split) ── */}
 <div className="relative w-full sm:w-44 md:w-52 aspect-[16/10] sm:aspect-auto sm:h-full min-h-[140px] overflow-hidden bg-muted/30 shrink-0">
 {coverUrl ? (
 <img
 src={coverUrl}
 alt={item.business_name}
 className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
 loading="lazy"
 />
 ) : (
 <div className="size-full flex items-center justify-center bg-muted/50">
 <Briefcase size={24} className="text-primary/30" />
 </div>
 )}

 <div className="absolute top-2.5 left-2.5">
 <Badge className="bg-background/90 text-foreground backdrop-blur-md text-[9px] font-bold px-2 py-0.5 rounded-md border border-border/40">
 {categoryLabel}
 </Badge>
 </div>
 </div>

 {/* ── Informações da Empresa ── */}
 <div className="p-4 sm:p-5 flex flex-col justify-between space-y-2 min-w-0 flex-1">
 <div className="space-y-1.5">
 <div className="flex items-center gap-2">
 <h3 className="font-bold text-sm sm:text-base text-foreground truncate group-hover:text-primary transition-colors">
 {item.business_name}
 </h3>

 {item.is_verified && (
 <span className="text-emerald-600 flex items-center text-[10px] font-bold gap-0.5 shrink-0">
 <ShieldCheck size={14} weight="fill" />
 <span className="hidden sm:inline">Verificado</span>
 </span>
 )}
 </div>

 {item.rating && (
 <div className="flex items-center gap-2 text-xs text-muted-foreground">
 <div className="flex items-center text-amber-500 font-bold font-mono">
 <Star size={13} weight="fill" className="mr-0.5" />
 <span>{Number(item.rating).toFixed(1)}</span>
 </div>
 <span>•</span>
 <span className="truncate">{item.address || "Regional"}</span>
 </div>
 )}

 {item.description && (
 <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed pt-0.5">
 {item.description}
 </p>
 )}
 </div>

 {item.specialties && item.specialties.length > 0 && (
 <div className="flex flex-wrap gap-1 pt-1">
 {item.specialties.slice(0, 3).map((spec, i) => (
 <span
 key={i}
 className="text-[10px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-md"
 >
 {spec}
 </span>
 ))}
 </div>
 )}
 </div>
 </Link>

 {/* ── Botões de Ação na Lista (Touch Target 44px) ── */}
 <div className="p-4 sm:p-5 flex sm:flex-col items-center justify-end gap-2 shrink-0 border-t sm:border-t-0 sm:border-l border-border/40 bg-muted/10">
 {whatsappNumber && (
 <ProtectedContactButton
 phone={whatsappNumber}
 entityType="directory"
 entityId={item.id}
 entityTitle={item.business_name}
 storeId={(item as any).store_id || null}
 niche={item.category}
 variant="outline"
 size="sm"
 label="WhatsApp"
 className="h-10 text-xs px-3 w-full sm:w-auto"
 />
 )}

 <Button
 asChild
 size="sm"
 className="h-10 px-4 rounded-xl font-bold text-xs bg-foreground text-background hover:bg-foreground/90 w-full sm:w-auto cursor-pointer"
 >
 <Link to="/diretorio/$id" params={{ id: item.id }}>
 Ver Perfil
 </Link>
 </Button>
 </div>
 </div>
 );
}
