import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Database, ShoppingBag, MapPin, Hotel, Star, Store, Plus, ExternalLink, Sliders, CheckCircle2, Layers } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
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
 actionLabel: "Inserir Grade de Produtos",
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
 actionLabel: "Inserir Carrossel de Destinos",
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
 actionLabel: "Inserir Depoimentos de Clientes",
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
 actionLabel: "Inserir Cabeçalho da Empresa",
 managementUrl: "/perfil-da-loja",
 },
 ];

 return (
 <aside className="w-80 bg-card border-r border-border/80 flex flex-col flex-none overflow-hidden select-none z-20 shadow-2xs animate-in slide-in-from-left duration-200">
 {/* Header */}
 <div className="p-4 border-b border-border/80 flex items-center justify-between bg-muted/20">
 <div className="flex items-center gap-2">
 <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
 <Database className="size-4" />
 </div>
 <div>
 <h3 className="text-xs font-bold text-foreground">Gerenciador de Dados (CMS)</h3>
 <p className="text-[10px] text-muted-foreground">Coleções dinâmicas conectadas</p>
 </div>
 </div>
 </div>

 <ScrollArea className="flex-1 p-3.5 space-y-3 text-xs">
 <div className="p-3 rounded-2xl bg-primary/5 border border-primary/20 space-y-1 mb-2">
 <span className="text-[11px] font-bold text-primary flex items-center gap-1">
 <Sliders className="size-3" />
 Live Data Binding
 </span>
 <p className="text-[10px] text-muted-foreground leading-relaxed">
 Blocos conectados ao CMS se atualizam sozinhos sempre que você altera preços, fotos ou destinos no painel.
 </p>
 </div>

 <div className="space-y-3">
 {collections.map((col) => {
 const Icon = col.icon;
 return (
 <div
 key={col.id}
 className="p-3.5 rounded-2xl border border-border/70 bg-card hover:border-primary/50 transition-all space-y-2.5 shadow-2xs group"
 >
 <div className="flex items-start justify-between gap-2">
 <div className="flex items-center gap-2">
 <div className="size-8 rounded-xl bg-muted flex items-center justify-center text-primary shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
 <Icon className="size-4" />
 </div>
 <div>
 <h4 className="text-xs font-bold text-foreground leading-tight">{col.title}</h4>
 <span className="text-[10px] text-muted-foreground font-mono">
 {col.count} {col.unit}
 </span>
 </div>
 </div>

 <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-none text-[9px] font-bold py-0 px-1.5 shrink-0">
 🟢 Ativo
 </Badge>
 </div>

 <p className="text-[11px] text-muted-foreground leading-relaxed">
 {col.description}
 </p>

 <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2">
 <Link
 to={col.managementUrl as any}
 className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
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
 className="rounded-xl text-[10px] font-bold h-7 px-3 gap-1 bg-primary text-primary-foreground cursor-pointer shadow-2xs"
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
