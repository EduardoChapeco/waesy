import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Database, ShoppingBag, MapPin, Star, Store, Plus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

export interface BuilderCmsPanelProps {
  storeId?: string;
  productsCount: number;
  destinationsCount?: number;
  hotelsCount?: number;
  collectionsCount?: number;
  cmsCollections?: Array<{
    id: string;
    name: string;
    slug: string;
    is_public?: boolean;
    fields?: any[];
    items?: any[];
    item_count?: number;
  }>;
  nativeCounts?: {
    products?: number;
    categories?: number;
    classifieds?: number;
    events?: number;
    jobs?: number;
    posts?: number;
    reviews?: number;
    banners?: number;
    hotpages?: number;
  };
  onInsertDynamicBlock: (
    blockType: string,
    bindingSource: string,
    title?: string,
    collectionSlug?: string,
  ) => void;
  onOpenCollectionManager?: (collectionSlug?: string) => void;
  onClose: () => void;
}

export function BuilderCmsPanel({
  storeId,
  productsCount = 0,
  destinationsCount = 0,
  hotelsCount = 0,
  collectionsCount = 0,
  cmsCollections = [],
  nativeCounts,
  onInsertDynamicBlock,
  onOpenCollectionManager,
  onClose,
}: BuilderCmsPanelProps) {
  const realProductsCount = nativeCounts?.products ?? productsCount;
  const realReviewsCount = nativeCounts?.reviews ?? 0;
  const realClassifiedsCount = nativeCounts?.classifieds ?? destinationsCount;
  const realEventsCount = nativeCounts?.events ?? hotelsCount;
  const realPostsCount = nativeCounts?.posts ?? 0;

  const collections = [
    {
      id: "products",
      title: "Catálogo de Produtos",
      description: "Sincronização em tempo real com preços, fotos, estoque e tags.",
      icon: ShoppingBag,
      count: realProductsCount,
      unit: "produtos cadastrados",
      blockType: "product_grid",
      bindingSource: "dynamic_products",
      actionLabel: "Inserir Produtos",
      managementUrl: "/workspace/catalogo/produtos",
    },
    {
      id: "classifieds",
      title: "Classificados & Destinos",
      description: "Anúncios locais, roteiros, veículos e pacotes publicados no banco.",
      icon: MapPin,
      count: realClassifiedsCount,
      unit: "registros publicados",
      blockType: "vitrine_classifieds_rail",
      bindingSource: "classifieds",
      actionLabel: "Inserir Trilho",
      managementUrl: "/workspace/cms/paginas",
    },
    {
      id: "events",
      title: "Agenda & Eventos",
      description: "Eventos, ingressos e saídas programadas do tenant ou região.",
      icon: Database,
      count: realEventsCount,
      unit: "eventos cadastrados",
      blockType: "event_rail",
      bindingSource: "events",
      actionLabel: "Inserir Agenda",
      managementUrl: "/workspace/cms/calendario",
    },
    {
      id: "posts",
      title: "Publicações & Artigos",
      description: "Posts sociais e matérias conectadas em tempo real ao banco.",
      icon: Star,
      count: realPostsCount,
      unit: "posts ativos",
      blockType: "vitrine_social_stream",
      bindingSource: "posts",
      actionLabel: "Inserir Stream",
      managementUrl: "/workspace/cms/paginas",
    },
    {
      id: "reviews",
      title: "Avaliações Verificadas",
      description: "Depoimentos reais de clientes registrados com nota verificada.",
      icon: Star,
      count: realReviewsCount,
      unit: "avaliações verificadas",
      blockType: "testimonial_carousel",
      bindingSource: "dynamic_reviews",
      actionLabel: "Inserir Avaliações",
      managementUrl: "/workspace/cms/avaliacoes",
    },
    {
      id: "store_profile",
      title: "Dados da Empresa e Loja",
      description: "Logo, WhatsApp, endereço, horário de funcionamento e capa.",
      icon: Store,
      count: storeId ? 1 : collectionsCount > 0 ? collectionsCount : 0,
      unit: storeId ? "perfil sincronizado" : "loja selecionada",
      blockType: "store_profile_hero",
      bindingSource: "store_profile",
      actionLabel: "Inserir Cabeçalho",
      managementUrl: "/perfil-da-loja",
    },
  ];

  return (
    <aside className="w-80 bg-card border-r border-border flex flex-col flex-none overflow-hidden select-none z-20 animate-in slide-in-from-left duration-200">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-sidebar">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-muted text-foreground flex items-center justify-center">
            <Database className="size-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground">Dados e Coleções</h3>
            <p className="text-xs text-muted-foreground">Coleções conectadas</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4 space-y-3 text-xs">
        <div className="space-y-4">
          <div className="space-y-2 p-3 rounded-lg border border-border bg-muted">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-foreground">
                  Coleções Customizadas
                </h4>
                <p className="text-2xs text-muted-foreground">
                  {cmsCollections.length} coleções configuradas
                </p>
              </div>
              {onOpenCollectionManager && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenCollectionManager()}
                  className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Plus className="size-3.5" />
                  <span>Gerenciar</span>
                </Button>
              )}
            </div>

            {cmsCollections.length === 0 ? (
              <p className="text-2xs text-muted-foreground pt-1">
                Crie tabelas reais (imóveis, equipe, serviços) no Gerenciador CMS e conecte via Grid CMS.
              </p>
            ) : (
              <div className="space-y-2 pt-1">
                {cmsCollections.map((col) => (
                  <div
                    key={col.id}
                    className="p-3 rounded-lg border border-border bg-card flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{col.name}</p>
                      <span className="text-2xs font-mono text-muted-foreground">
                        /{col.slug} · {col.item_count ?? col.items?.length ?? 0} itens
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        onInsertDynamicBlock("cms_collection_grid", "cms_collection", col.name, col.slug);
                        toast.success(`Grid conectado à coleção "${col.name}" inserido!`);
                      }}
                      className="h-11 min-h-11 px-3 rounded-lg text-xs font-medium shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Plus className="size-3.5" />
                      <span>Inserir</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
          {collections.map((col) => {
            const Icon = col.icon;
            return (
              <div
                key={col.id}
                className="p-4 rounded-lg border border-border bg-card hover:border-primary/40 transition-colors space-y-3 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-lg bg-muted flex items-center justify-center text-primary shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-foreground leading-tight">
                        {col.title}
                      </h4>
                      <span className="text-xs text-muted-foreground font-mono tabular-nums">
                        {col.count} {col.unit}
                      </span>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-medium py-0 px-2 shrink-0"
                  >
                    Ativo
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">{col.description}</p>

                <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2">
                  <Link
                    to={col.managementUrl as any}
                    className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <span>Gerenciar</span>
                    <ExternalLink className="size-2.5" />
                  </Link>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      onInsertDynamicBlock(col.blockType, col.bindingSource, col.title);
                      toast.success(`Bloco dinâmico de "${col.title}" inserido na página!`);
                    }}
                    className="h-11 min-h-11 rounded-lg px-3 text-xs font-medium gap-1 bg-primary text-primary-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <Plus className="size-3" />
                    <span>{col.actionLabel}</span>
                  </Button>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
