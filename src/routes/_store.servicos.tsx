import { Tag } from "lucide-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useState, useMemo } from "react";
import {
 Briefcase,
 Hammer,
 Scales,
 Calculator,
 PaintBrush,
 Wrench,
 Desktop,
 Broom,
 CarProfile,
 Snowflake,
 PhoneCall,
 CheckCircle,
 PaperPlaneTilt,
 MapPin,
 Star,
 Truck,
 Compass,
 Tree,
 Package,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/state/states";
import { PageSkeleton } from "@/components/state/loading";
import { HorizontalRail } from "@/components/commerce/horizontal-rail";
import { StoreCard } from "@/components/commerce/store-card";
import { BannerHeroCarousel } from "@/components/commerce/banner-hero-carousel";
import { ContextualStoriesRail } from "@/components/stories/contextual-stories-rail";
import { HotpagesRail } from "@/components/commerce/hotpages-rail";
import { RequestQuoteModal } from "@/components/commerce/request-quote-modal";
import { ServicePackagesRail } from "@/components/commerce/service-packages-rail";
import { DiscoveryControlBar, type ViewModeType } from "@/components/commerce/discovery-control-bar";
import { getModularSurfaceFeed } from "@/services/surface-cms.functions";
import { ModularSurfaceFeed } from "@/components/commerce/modular-surface-feed";
import { listActiveBanners } from "@/services/banner.functions";
import { listHotpages } from "@/services/hotpage.functions";
import { listPublicStorePackages } from "@/services/service-packages.functions";
import { resolveNicheDepartments } from "@/lib/niche-helpers";

const SearchSchema = z.object({
 q: z.string().optional(),
 categoria: z.string().optional(),
});

type ServicosSearch = z.infer<typeof SearchSchema>;

interface ServiceCategory {
 id: string;
 name: string;
 description: string;
 icon: any;
 tags: string[];
}

const SERVICE_CATEGORIES: ServiceCategory[] = [
 {
 id: "todos",
 name: "Todos os Serviços",
 description: "Encontre profissionais qualificados em todas as áreas",
 icon: Tag,
 tags: ["todos"],
 },
 {
 id: "escavacao",
 name: "Escavação, Terraplanagem & Máquinas Pesadas",
 description: "Locação de escavadeiras, retroescavadeiras, abertura de valas, poços e terraplanagem",
 icon: Truck,
 tags: ["escavacao", "terraplanagem", "maquinas", "retroescavadeira", "caminhao", "entulho", "poco"],
 },
 {
 id: "arquitetura",
 name: "Arquitetura, Engenharia & Projetos",
 description: "Projetos arquitetônicos, estruturais, design de interiores e laudos técnicos",
 icon: Compass,
 tags: ["arquitetura", "arquiteto", "engenharia", "engenheiro", "projetos", "interiores", "laudos"],
 },
 {
 id: "obras",
 name: "Obras, Reformas & Construção",
 description: "Pedreiros, pintores, eletricistas, encanadores e gesso",
 icon: Hammer,
 tags: ["obras", "reformas", "construcao", "pedreiro", "pintor", "eletricista", "encanador"],
 },
 {
 id: "contabil",
 name: "Contabilidade & Consultoria Empresarial",
 description: "Abertura de empresas, assessoria fiscal, tributária, financeira e consultorias",
 icon: Calculator,
 tags: ["contabilidade", "contador", "consultoria", "fiscal", "financeiro", "empresas"],
 },
 {
 id: "juridico",
 name: "Advocacia & Serviços Jurídicos",
 description: "Direito civil, trabalhista, empresarial, imobiliário e previdenciário",
 icon: Scales,
 tags: ["advocacia", "advogado", "juridico", "direito"],
 },
 {
 id: "marcenaria",
 name: "Marcenaria & Móveis Planejados",
 description: "Projetos sob medida em MDF, restaurações e montagem de móveis",
 icon: Tree,
 tags: ["marcenaria", "marceneiro", "moveis planejados", "mdf", "montador"],
 },
 {
 id: "climatizacao",
 name: "Climatização & Refrigeração",
 description: "Instalação, limpeza e manutenção de ar-condicionado e câmaras frias",
 icon: Snowflake,
 tags: ["climatizacao", "ar condicionado", "refrigeracao"],
 },
 {
 id: "mecanica",
 name: "Mecânica, Autoelétrica & Frotas",
 description: "Oficinas mecânicas, freios, injeção eletrônica, autoelétrica e guincho",
 icon: CarProfile,
 tags: ["mecanica", "oficina", "auto eletrica", "automotivo", "veiculos", "guincho"],
 },
 {
 id: "limpeza",
 name: "Limpeza, Diárias & Higienização",
 description: "Diaristas, higienização de estofados, corte de grama e limpeza pós-obra",
 icon: Broom,
 tags: ["limpeza", "diarista", "jardinagem", "estofados", "faxina"],
 },
 {
 id: "fretes",
 name: "Fretes, Mudanças & Carretos",
 description: "Transporte de cargas, carretos rápidos e mudanças residenciais e comerciais",
 icon: Package,
 tags: ["frete", "mudanca", "carreto", "transporte", "logistica"],
 },
 {
 id: "tecnologia",
 name: "Tecnologia, Sites & Marketing",
 description: "Criação de sites, sistemas, design gráfico, marketing digital e suporte de TI",
 icon: Desktop,
 tags: ["tecnologia", "sites", "design", "informatica", "suporte ti", "software", "marketing"],
 },
];

export const Route = createFileRoute("/_store/servicos")({
 head: () => ({
 meta: [
 { title: "Serviços Especializados & Orçamentos | Waesy" },
 {
 name: "description",
 content:
 "Encontre profissionais liberais, técnicos, consultorias e empresas de serviços na sua cidade. Solicite orçamentos gratuitos.",
 },
 ],
 }),
 validateSearch: (search: Record<string, unknown>): ServicosSearch => SearchSchema.parse(search),
 loaderDeps: ({ search }) => search,
 loader: async () => {
   try {
 const [banners, hotpages, marketplaceFeed, packages] = await Promise.all([
 listActiveBanners({ data: { placement: "servicos" } }).catch(() => []),
 listHotpages({ data: { module: "servicos" } }).catch(() => []),
 getModularSurfaceFeed({ data: { surfaceSlug: "servicos" } }).catch(() => ({ sections: [], allProducts: [] })),
 listPublicStorePackages().catch(() => []),
 ]);

      return {
        banners: banners || [],
        hotpages: hotpages || [],
        marketplaceFeed: marketplaceFeed || { sections: [], allProducts: [] },
        packages: packages || [],
      };
    } catch (err) {
      console.error("[loader:_store.servicos] Unhandled error:", err);
      return {
        banners: [],
        hotpages: [],
        marketplaceFeed: { sections: [], allProducts: [] },
        packages: [],
      };
    }
  },
 component: ServicosVerticalPage,
 pendingComponent: PageSkeleton,
});

function ServicosVerticalPage() {
  const loaderData = (Route.useLoaderData() as any) || {};
  const banners = loaderData.banners || [];
  const hotpages = loaderData.hotpages || [];
  const marketplaceFeed = loaderData.marketplaceFeed || { sections: [], allProducts: [] };
  const packages = loaderData.packages || [];
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const [activeCategory, setActiveCategory] = useState(search.categoria || "todos");
  const [searchTerm, setSearchTerm] = useState(search.q || "");
  const [viewMode, setViewMode] = useState<ViewModeType>("grid");

 // Modal de orçamento
 const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
 const [selectedProvider, setSelectedProvider] = useState<{
 id: string;
 name: string;
 phone?: string;
 category?: string;
 } | null>(null);

 const handleCategoryChange = (catId: string) => {
 setActiveCategory(catId);
 navigate({
 search: (prev) => ({
 ...prev,
 categoria: catId === "todos" ? undefined : catId,
 }),
 });
 };

 const handleOpenQuote = (store: any) => {
 setSelectedProvider({
 id: store.id,
 name: store.name,
 phone: store.phone,
 category: activeCategory !== "todos" ? SERVICE_CATEGORIES.find((c) => c.id === activeCategory)?.name : undefined,
 });
 setIsQuoteModalOpen(true);
 };

 // Filtragem de prestadores de serviços e empresas
 const serviceStores = useMemo(() => {
 const storeSection = marketplaceFeed?.sections?.find((s: any) => s.type === "store_rail");
 const stores = storeSection?.items || [];
 return stores.filter((s: any) => {
 const type = (s.type || "").toLowerCase();
 const name = (s.name || "").toLowerCase();
 const desc = (s.description || "").toLowerCase();

 const isServiceBusiness =
 type.includes("servico") ||
 type.includes("consultoria") ||
 type.includes("oficina") ||
 type.includes("advocacia") ||
 type.includes("contabilidade") ||
 type.includes("construcao") ||
 type.includes("tecnologia") ||
 type.includes("prestador") ||
 desc.includes("serviço") ||
 desc.includes("orçamento") ||
 desc.includes("manutenção");

 if (activeCategory === "todos") {
 if (!searchTerm) return isServiceBusiness || stores.length <= 15;
 return (
 name.includes(searchTerm.toLowerCase()) ||
 desc.includes(searchTerm.toLowerCase()) ||
 type.includes(searchTerm.toLowerCase())
 );
 }

 const catObj = SERVICE_CATEGORIES.find((c) => c.id === activeCategory);
 if (!catObj) return true;

 const matchesCategory = catObj.tags.some(
 (tag) => name.includes(tag) || desc.includes(tag) || type.includes(tag)
 );

 if (!searchTerm) return matchesCategory;
 return (
 matchesCategory &&
 (name.includes(searchTerm.toLowerCase()) || desc.includes(searchTerm.toLowerCase()))
 );
 });
 }, [marketplaceFeed, activeCategory, searchTerm]);

 return (
 <div className="w-full space-y-6 pb-20">
 {/* ── 1. Banners ── */}
 {banners && banners.length > 0 && (
 <section aria-label="Banners de Serviços">
 <BannerHeroCarousel banners={banners} />
 </section>
 )}

 {/* ── 1.5. Stories de Prestadores & Demonstrações de Serviços ── */}
 <ContextualStoriesRail niche="servicos" className="py-1" />

 {/* ── 2. Pacotes de Aulas & Passes com Desconto ── */}
 {packages && packages.length > 0 && (
 <section aria-label="Pacotes de Serviços">
 <ServicePackagesRail packages={packages} />
 </section>
 )}

 {/* ── 3. Hotpages / Destaques de Serviços ── */}
 {hotpages && hotpages.length > 0 && (
 <section aria-label="Coleções de Serviços">
 <HotpagesRail hotpages={hotpages} />
 </section>
 )}

 {/* ── 3.5 Seções Modulares do CMS (Destaques, Lojas, Grids) ── */}
 {marketplaceFeed?.sections && marketplaceFeed.sections.length > 0 && (
 <ModularSurfaceFeed sections={marketplaceFeed.sections} />
 )}

 {/* ── 4. Discovery Control Bar (Busca + Categorias + Modos) ── */}
      <DiscoveryControlBar
        search={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar eletricistas, pedreiros, arquitetos, advogados, oficinas..."
        categories={SERVICE_CATEGORIES.map((c) => ({
          id: c.id,
          label: c.name,
          icon: c.icon,
        }))}
        activeCategory={activeCategory}
        onSelectCategory={handleCategoryChange}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        allowedViewModes={["feed", "grid", "list"]}
      />

      {/* ── 5. Renderização Conforme o Modo de Visualização ── */}
      {viewMode === "feed" ? (
        <div className="space-y-8">
          {serviceStores.length > 0 ? (
            <div className="space-y-8">
              {(() => {
                const grouped = serviceStores.reduce((acc: Record<string, typeof serviceStores>, store: any) => {
                  const key = store.category || store.type || "Prestadores de Serviços";
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(store);
                  return acc;
                }, {});

                return Object.entries(grouped).map(([groupName, stores]: [string, any]) => (
                  <HorizontalRail
                    key={groupName}
                    title={groupName}
                    hideHeader={false}
                    actionLabel="Ver grade"
                    onAction={() => setViewMode("grid")}
                  >
                    {stores.map((store: any) => (
                      <div key={store.id} className="w-64 sm:w-72 shrink-0">
                        <StoreCard {...store} />
                      </div>
                    ))}
                  </HorizontalRail>
                ));
              })()}
            </div>
          ) : (
            <div className="py-12 text-center bg-card rounded-2xl p-6">
              <EmptyState
                title="Nenhum prestador encontrado"
                description="Tente selecionar outra categoria ou busque por termos mais amplos."
              />
            </div>
          )}
        </div>
      ) : viewMode === "list" ? (
        <section aria-label="Lista de Prestadores">
          {serviceStores.length === 0 ? (
            <div className="py-12 text-center bg-card rounded-2xl p-6">
              <EmptyState
                title="Nenhum prestador encontrado"
                description="Tente selecionar outra categoria ou busque por termos mais amplos."
              />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {serviceStores.map((store: any) => (
                <div
                  key={store.id}
                  className="p-4 rounded-2xl bg-card border border-border/60 hover:border-foreground/30 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="size-12 rounded-xl bg-muted overflow-hidden shrink-0 flex items-center justify-center font-bold text-primary text-lg">
                      {store.logo_url ? (
                        <img src={store.logo_url} alt={store.name} className="size-full object-cover" />
                      ) : (
                        store.name.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link to="/diretorio/$id" params={{ id: store.id }} className="font-bold text-sm text-foreground hover:underline truncate">
                          {store.name}
                        </Link>
                        <Badge variant="outline" className="text-[10px] uppercase font-semibold bg-primary/10 text-primary border-primary/20 shrink-0">
                          Verificado
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {store.description || "Prestador de serviços especializado."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                    <Button
                      onClick={() => handleOpenQuote(store)}
                      size="sm"
                      className="flex-1 sm:flex-initial bg-primary text-primary-foreground font-bold text-xs h-9 rounded-xl"
                    >
                      Pedir Orçamento
                    </Button>
                    <Button asChild variant="outline" size="sm" className="h-9 px-3 text-xs rounded-xl font-semibold">
                      <Link to="/diretorio/$id" params={{ id: store.id }}>
                        Perfil
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
 <section aria-label="Profissionais & Empresas Verificadas">
 {serviceStores.length === 0 ? (
 <div className="py-12 text-center bg-card rounded-2xl p-6 ">
 <EmptyState
 title="Nenhum prestador encontrado"
 description="Tente selecionar outra categoria ou busque por termos mais amplos."
 />
 </div>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
 {serviceStores.map((store: any) => (
 <div
 key={store.id}
 className="group relative flex flex-col justify-between p-4.5 rounded-2xl bg-card border border-border/60 hover:border-foreground/30 hover:shadow-xs transition-all shadow-2xs"
 >
 <div>
 <div className="flex items-start justify-between gap-3 mb-3">
 <div className="size-12 rounded-xl bg-muted overflow-hidden shrink-0 flex items-center justify-center font-bold text-primary text-lg">
 {store.logo_url ? (
 <img src={store.logo_url} alt={store.name} className="size-full object-cover" />
 ) : (
 store.name.charAt(0)
 )}
 </div>
 <Badge variant="outline" className="text-[10px] uppercase font-semibold bg-primary/10 text-primary border-primary/20">
 Verificado
 </Badge>
 </div>

 <Link to="/diretorio/$id" params={{ id: store.id }} className="hover:underline">
 <h3 className="font-bold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
 {store.name}
 </h3>
 </Link>

 <p className="text-xs text-muted-foreground line-clamp-2 mt-1 min-h-[32px]">
 {store.description || "Prestador de serviços especializado e atendimento de alta qualidade."}
 </p>

 <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3 pt-2 ">
 <MapPin size={13} className="text-primary shrink-0" />
 <span className="truncate">{store.address_city || "São Miguel do Oeste"} - SC</span>
 </div>
 </div>

 <div className="mt-4 pt-3 flex items-center gap-2">
              <Button
                onClick={() => handleOpenQuote(store)}
                size="sm"
                className="w-full bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground font-bold text-xs h-10 rounded-xl transition-all"
              >
                Pedir Orçamento
              </Button>
              <Button asChild variant="ghost" size="sm" className="h-10 px-3 text-xs rounded-xl font-semibold shrink-0">
                <Link to="/diretorio/$id" params={{ id: store.id }}>
                  Perfil
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </div>
    )}
  </section>
)}

      {/* Modal de Orçamento Conectado */}
      {selectedProvider && (
 <RequestQuoteModal
 isOpen={isQuoteModalOpen}
 onClose={() => {
 setIsQuoteModalOpen(false);
 setSelectedProvider(null);
 }}
 storeId={selectedProvider.id}
 storeName={selectedProvider.name}
 storePhone={selectedProvider.phone}
 defaultCategory={selectedProvider.category}
 />
 )}
 </div>
 );
}
