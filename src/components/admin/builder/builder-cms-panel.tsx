import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Database, ShoppingBag, MapPin, Star, Store, Plus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

export interface BuilderCmsPanelProps {
  productsCount: number;
  destinationsCount?: number;
  hotelsCount?: number;
  collectionsCount?: number;
  onInsertDynamicBlock: (blockType: string, bindingSource: string, title?: string) => void;
  onClose: () => void;
}

export function BuilderCmsPanel({
  productsCount = 0,
  destinationsCount = 0,
  hotelsCount = 0,
  collectionsCount = 0,
  onInsertDynamicBlock,
  onClose,
}: BuilderCmsPanelProps) {
  const collections = [
    {
      id: "products",
      title: "Catálogo de Produtos",
      description: "Sincronização em tempo real com preços, fotos, estoque e tags.",
      icon: ShoppingBag,
      count: productsCount,
      unit: "produtos cadastrados",
      blockType: "product_grid",
      bindingSource: "dynamic_products",
      actionLabel: "Inserir Produtos",
      managementUrl: "/workspace/catalogo/produtos",
    },
    {
      id: "destinations",
      title: "Banco de Destinos Turísticos",
      description: "Cidades, aeroportos IATA, fotos panorâmicas e roteiros.",
      icon: MapPin,
      count: destinationsCount,
      unit: "destinos catalogados",
      blockType: "tourism_destinations_carousel",
      bindingSource: "destinations_catalog",
      actionLabel: "Inserir Destinos",
      managementUrl: "/workspace/turismo/destinos",
    },
    {
      id: "reviews",
      title: "Avaliações e Provas Sociais",
      description: "Depoimentos de clientes e viajantes com notas em estrelas.",
      icon: Star,
      count: 12,
      unit: "avaliações verificadas",
      blockType: "testimonial_carousel",
      bindingSource: "dynamic_reviews",
      actionLabel: "Inserir Depoimentos",
      managementUrl: "/workspace/turismo/destinos",
    },
    {
      id: "store_profile",
      title: "Dados da Empresa e Loja",
      description: "Logo, WhatsApp, endereço, horário de funcionamento e capa.",
      icon: Store,
      count: 1,
      unit: "perfil sincronizado",
      blockType: "store_profile_hero",
      bindingSource: "store_profile",
      actionLabel: "Inserir Cabeçalho",
      managementUrl: "/perfil-da-loja",
    },
  ];

  return (
    <aside className="w-80 bg-card border-r border-border flex flex-col flex-none overflow-hidden select-none z-20 animate-in slide-in-from-left duration-200">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Database className="size-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground">Gerenciador de Dados (CMS)</h3>
            <p className="text-xs text-muted-foreground">Coleções conectadas</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4 space-y-3 text-xs">
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
      </ScrollArea>
    </aside>
  );
}
