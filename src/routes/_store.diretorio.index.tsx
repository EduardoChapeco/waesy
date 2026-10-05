import { resolveActiveCity } from "@/lib/city-helper";
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
import { DiscoveryControlBar, type ViewModeType, type FilterChipOption } from "@/components/commerce/discovery-control-bar";
import { NativeMobileHeader } from "@/components/navigation/native-mobile-header";
import { HorizontalRail } from "@/components/commerce/horizontal-rail";
import { EmptyState } from "@/components/state/states";
import { resolveNicheDepartments } from "@/lib/niche-helpers";

const DIRECTORY_CATEGORIES: FilterChipOption[] = [
  { id: "todos", label: "Tudo", icon: Tag },
  { id: "turismo", label: "Turismo", icon: AirplaneTilt },
  { id: "gastronomia", label: "Gastronomia", icon: ForkKnife },
  { id: "comercio", label: "Comércio", icon: Storefront },
  { id: "saude", label: "Saúde", icon: Heartbeat },
  { id: "reformas", label: "Reformas", icon: Wrench },
  { id: "auto", label: "Automotivo", icon: CarProfile },
  { id: "pet", label: "Pet", icon: Tag },
  { id: "servicos", label: "Serviços", icon: Briefcase },
];

export const Route = createFileRoute("/_store/diretorio/")({
 head: () => ({
 meta: [
 { title: "Guia e Diretório de Empresas e Serviços" },
 {
 name: "description",
 content:
 "Encontre empresas, clínicas, oficinas, prestadores de serviços e comércios locais na região com fotos, avaliações, horários e contato direto via WhatsApp.",
 },
 ],
 }),
  loader: async ({ location }) => {
    const activeCity = resolveActiveCity(location?.search);
    try {
      const [banners, hotpages] = await Promise.all([
        listActiveBanners({ data: { placement: "diretorio", city: activeCity } }).catch(() => []),
        listHotpages({ data: { module: "diretorio" } }).catch(() => []),
      ]);
      return { banners: banners || [], hotpages: hotpages || [], activeCity };
    } catch (err) {
      console.error("[loader:_store.diretorio.index] Unhandled error:", err);
      return { banners: [], hotpages: [] };
    }
  },
  component: DirectoryPage,
});

export function DirectoryPage() {
  const loaderData = ((typeof Route?.useLoaderData === "function" ? Route.useLoaderData() : {}) as any) || {};
  const activeCity = loaderData?.activeCity || "";
  const banners = loaderData?.banners || [];
  const hotpages = loaderData?.hotpages || [];
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [viewMode, setViewMode] = useState<ViewModeType>("feed");
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

 const { data: listings, isLoading } = useQuery({
 queryKey: ["public-directory", selectedCategory, searchQuery, activeCity],
 queryFn: () =>
 getPublicDirectory({
 data: {
 limit: 60,
 city: activeCity || undefined,
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
 categoryName: chip?.label || "Comércios e Serviços",
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
    <div className="w-full pb-14">
      <NativeMobileHeader
        title="Diretório"
        centerTitle
        backTo="/"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Buscar empresas, clínicas, serviços..."
      />
      <div className="px-4 sm:px-5 space-y-4 pt-2 sm:pt-4">
        {/* ── Desambiguação Canônica dos 4 Pilares (SPEC-F03) ── */}
        <div className="rounded-lg border border-border bg-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary/20 text-primary">Places Oficial</Badge>
              <span className="text-xs text-muted-foreground">Catálogo de Estabelecimentos</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Guia oficial de estabelecimentos físicos, contatos e localização. Para compra online integrada, visite o <Link to="/marketplace" className="text-primary underline font-medium hover:text-primary/80">Marketplace</Link>. Para desapego e vendas rápidas, consulte os <Link to="/classificados" className="text-primary underline font-medium hover:text-primary/80">Classificados</Link>.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button asChild variant="outline" size="sm" className="h-11 px-4">
              <Link to="/marketplace">Ver Marketplace</Link>
            </Button>
            <Button asChild variant="default" size="sm" className="h-11 px-4">
              <Link to="/workspace">Cadastrar Empresa</Link>
            </Button>
          </div>
        </div>

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
 title="Destaques"
 badge="Top Escolhas"
 actionLabel="Ver grade"
 onAction={() => setViewMode("grid")}
 >
 {topRatedListings.map((item) => (
              <div key={item.id} className="w-72 sm:w-80 shrink-0 flex flex-col h-full">
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
              <div key={item.id} className="w-72 sm:w-80 shrink-0 flex flex-col h-full">
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
        <span>Empresas</span>
      </h2>
    </div>

    {/* Mobile: WhatsApp Minimalist List */}
    <div className="block sm:hidden divide-y divide-border/30 rounded-lg border border-border/40 bg-card overflow-hidden">
      {filteredListings.map((item) => (
        <DirectoryMobileWhatsAppItem key={item.id} item={item} />
      ))}
    </div>

    {/* Desktop: Grid Canônico */}
    <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
      {filteredListings.map((item) => (
        <div key={item.id} className="h-full flex flex-col">
          <DirectoryBusinessCard item={item} />
        </div>
      ))}
    </div>
  </div>

  {filteredListings.length === 0 && !isLoading && (
    <div className="py-16 text-center space-y-3 bg-card rounded-lg border border-border/60 p-8">
      <EmptyState title="Nenhuma empresa ou serviço encontrado nesta categoria." />
      <div className="pt-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setSelectedCategory("todos");
            setSearchQuery("");
          }}
          className="rounded-lg font-bold text-xs h-11 px-4"
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
            <div className="py-24 text-center space-y-3 bg-card rounded-lg border border-border/60 p-8">
              <EmptyState title="Nenhuma empresa encontrada com estes filtros." />
            </div>
          ) : (
            <>
              {/* Mobile: WhatsApp Minimalist List */}
              <div className="block sm:hidden divide-y divide-border/30 rounded-lg border border-border/40 bg-card overflow-hidden">
                {filteredListings.map((item) => (
                  <DirectoryMobileWhatsAppItem key={item.id} item={item} />
                ))}
              </div>
              {/* Desktop: Grid Canônico */}
              <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 items-stretch">
                {filteredListings.map((item) => (
                  <div key={item.id} className="h-full flex flex-col">
                    <DirectoryBusinessCard item={item} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* MODE 3: LISTA ESTILO GUIA COMERCIAL COM SPLIT HORIZONTAL PERFEITO */}
      {viewMode === "list" && (
        <div className="space-y-3 w-full">
          {filteredListings.length === 0 && !isLoading ? (
            <div className="py-24 text-center space-y-3 bg-card rounded-lg border border-border/60 p-8">
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
    </div>
  );
}

// ─── COMPONENTE PADRONIZADO MOBILE: WHATSAPP MINIMALIST LIST (APPLE HIG) ─────────────────────────
function DirectoryMobileWhatsAppItem({ item }: { item: DirectoryListingDTO }) {
  const coverUrl = item.banner_url || item.avatar_url;
  const categoryLabel = DIRECTORY_CATEGORIES.find((c) => c.id === item.category)?.label || item.category;
  const whatsappNumber = (item.contact_whatsapp || item.contact_phone || "").replace(/\D/g, "");

  return (
    <div className="flex items-center justify-between gap-3 p-3 hover:bg-muted/10 transition-colors">
      <Link
        to="/diretorio/$id"
        params={{ id: item.id }}
        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
      >
        <div className="size-11 rounded-lg bg-muted/30 border border-border/40 overflow-hidden shrink-0 flex items-center justify-center">
          {item.avatar_url || coverUrl ? (
            <img src={item.avatar_url || coverUrl || ""} alt="" className="size-full object-cover" />
          ) : (
            <Briefcase className="size-5 text-muted-foreground/40" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-semibold text-foreground truncate">{item.business_name}</h4>
            {item.is_verified && (
              <ShieldCheck size={13} weight="fill" className="text-foreground shrink-0" />
            )}
          </div>
          <div className="text-xs text-muted-foreground truncate flex items-center gap-2">
            <span>{categoryLabel}</span>
            {item.address && (
              <>
                <span>•</span>
                <span className="truncate">{item.address}</span>
              </>
            )}
          </div>
          {item.rating && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono mt-1">
              <Star size={10} weight="fill" className="text-amber-500" />
              <span className="font-semibold text-foreground">{Number(item.rating).toFixed(1)}</span>
              {item.reviews_count > 0 && <span>({item.reviews_count})</span>}
            </div>
          )}
        </div>
      </Link>
      <div className="flex items-center gap-1 shrink-0">
        {whatsappNumber && (
          <ProtectedContactButton
            phone={whatsappNumber}
            entityType="directory"
            entityId={item.id}
            entityTitle={item.business_name}
            storeId={(item as any).store_id || null}
            niche={item.category}
            variant="ghost"
            size="sm"
            className="size-11 p-0 rounded-full hover:bg-muted/40 text-foreground active:scale-95 transition-colors"
          />
        )}
        <Link
          to="/diretorio/$id"
          params={{ id: item.id }}
          className="size-11 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/30 active:scale-95 transition-colors"
          aria-label="Ver Detalhes do Local"
        >
          <ArrowRight size={18} />
        </Link>
      </div>
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
    <div className="group relative flex flex-col justify-between w-full h-full min-h-96 rounded-lg border border-border/60 bg-card overflow-hidden hover:border-foreground/30 transition-colors duration-200 select-none shadow-2xs">
      <Link
        to="/diretorio/$id"
        params={{ id: item.id }}
        className="focus-visible:outline-none flex-1 flex flex-col min-h-0"
      >
        {/* ── Imagem Full Split Superior (16:9 Rigoroso) ── */}
        <div className="relative aspect-video w-full overflow-hidden bg-muted/30 shrink-0">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={item.business_name}
              loading="lazy"
              className="size-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="size-full bg-muted/30 flex items-center justify-center">
              <Briefcase className="size-8 text-primary/30" />
            </div>
          )}

          {/* Gradiente de proteção para badges superiores */}


          {/* Badge de Categoria no Topo Esquerdo */}
          <div className="absolute top-2.5 left-2.5">
            <Badge className="bg-background/90 text-foreground backdrop-blur-md text-xs font-bold px-2 py-1 rounded-lg border border-border/40">
              {categoryLabel}
            </Badge>
          </div>

          {/* Badge de Verificado no Topo Direito (Clean Paradigma) */}
          {item.is_verified && (
            <div className="absolute top-2.5 right-2.5">
              <Badge className="bg-background/90 text-foreground backdrop-blur-md text-xs font-bold px-2 py-1 rounded-lg border border-border/40 flex items-center gap-1 shadow-2xs">
                <ShieldCheck size={12} weight="bold" className="text-primary" />
                <span>Verificado</span>
              </Badge>
            </div>
          )}
        </div>

        {/* ── Conteúdo do Card: Espaçamento e Alturas Padronizadas ── */}
        <div className="p-4 flex-1 flex flex-col justify-between space-y-3 min-h-0">
          <div className="space-y-2">
            {/* Header: Avatar + Título + Avaliação */}
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-lg bg-card border border-border/80 overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
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

              <div className="min-w-0 flex-1 pt-1">
                <h3 className="text-sm font-bold text-foreground truncate leading-tight group-hover:text-primary transition-colors h-5">
                  {item.business_name}
                </h3>

                {/* Avaliação em Estrelas (Altura fixa h-4 garantida) */}
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground h-4">
                  {item.rating ? (
                    <>
                      <div className="flex items-center text-amber-500">
                        <Star size={12} weight="fill" />
                        <span className="font-bold font-mono ml-1 text-foreground text-xs">
                          {Number(item.rating).toFixed(1)}
                        </span>
                      </div>
                      {item.reviews_count > 0 && (
                        <span className="text-xs font-medium text-muted-foreground truncate">
                          ({item.reviews_count} avaliações)
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground/60 font-mono">Novo no diretório</span>
                  )}
                </div>
              </div>
            </div>

            {/* Endereço / Localização (Altura fixa h-4) */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium h-4">
              <MapPin size={13} weight="bold" className="text-primary shrink-0" />
              <span className="truncate">{item.address || "Regional"}</span>
            </div>

            {/* Especialidades / Tags (Altura fixa h-6) */}
            <div className="h-6 flex items-center gap-1 overflow-hidden">
              {item.specialties && item.specialties.length > 0 ? (
                item.specialties.slice(0, 3).map((spec, i) => (
                  <span
                    key={i}
                    className="text-xs font-semibold bg-muted text-muted-foreground px-2 py-1 rounded-md truncate max-w-28 shrink-0"
                  >
                    {spec}
                  </span>
                ))
              ) : (
                <span className="text-xs font-medium text-muted-foreground/50 italic truncate">
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
      <div className="px-4 py-2 flex items-center justify-between gap-2 border-t border-border/40 mt-auto shrink-0 min-h-14">
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
            className="h-11 text-xs px-3 shrink-0"
          />
        ) : (
          <div className="hidden" />
        )}

        <Button
          asChild
          size="sm"
          className="rounded-lg font-bold text-xs h-11 px-4 flex-1 bg-foreground text-background hover:bg-foreground/90 transition-colors gap-2 cursor-pointer"
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
    <div className="group relative overflow-hidden rounded-lg border border-border/60 bg-card hover:border-foreground/30 transition-colors duration-200 min-h-36 pl-32 sm:pl-44 w-full">
      <Link
        to="/diretorio/$id"
        params={{ id: item.id }}
        className="absolute inset-y-0 left-0 w-32 sm:w-44 overflow-hidden rounded-l-lg bg-muted/40 block cursor-pointer"
      >
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={item.business_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/50">
            <Briefcase size={24} className="text-primary/30" />
          </div>
        )}

        <div className="absolute top-2.5 left-2.5">
          <Badge className="bg-background/90 text-foreground backdrop-blur-md text-xs font-bold px-2 py-1 rounded-md border border-border/40">
            {categoryLabel}
          </Badge>
        </div>
      </Link>

      <div className="p-4 sm:p-4 flex flex-col justify-between min-h-36 gap-2">
        <Link to="/diretorio/$id" params={{ id: item.id }} className="space-y-1 block min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm sm:text-base text-foreground truncate group-hover:text-primary transition-colors">
              {item.business_name}
            </h3>
            {item.is_verified && (
              <ShieldCheck size={14} weight="fill" className="text-primary shrink-0" />
            )}
          </div>

          {item.rating && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center text-amber-500 font-bold font-mono">
                <Star size={12} weight="fill" className="mr-1" />
                {Number(item.rating).toFixed(1)}
              </span>
              <span>•</span>
              <span className="truncate">{item.address || "Regional"}</span>
            </div>
          )}

          {item.description && (
            <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
              {item.description}
            </p>
          )}
        </Link>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/30">
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
              className="h-11 text-xs px-3 rounded-lg"
            />
          )}

          <Button
            asChild
            size="sm"
            className="h-11 px-4 rounded-lg font-bold text-xs bg-foreground text-background hover:bg-foreground/90 cursor-pointer"
          >
            <Link to="/diretorio/$id" params={{ id: item.id }}>
              Ver Perfil
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
