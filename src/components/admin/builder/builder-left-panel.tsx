import * as React from "react";
import { useState } from "react";
import { Plus, ImageIcon, ShoppingBag, AlignLeft, Star, Zap, Store, Grid, Columns2, Megaphone, MessageSquare, Timer, Shield, LayoutTemplate, ListOrdered, Map, Video, Layers, GripVertical, ChevronUp, ChevronDown, Trash2, SlidersHorizontal, Sliders, MousePointerClick } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { builderRegistry } from "@/lib/builder-registry";

// ─── Block Category Definitions ────────────────────────────────────────────────

export const BLOCK_CATEGORIES = [
 {
 id: "hero",
 label: "Banners e Hero",
 icon: ImageIcon,
 blocks: ["hero_carousel", "split_banner", "announcement_bar", "mosaic_banners"],
 },
 {
 id: "products",
 label: "Vitrine de Produtos",
 icon: ShoppingBag,
 blocks: ["product_carousel", "product_grid", "product_rail"],
 },
 {
 id: "content",
 label: "Conteúdo e Mídia",
 icon: AlignLeft,
 blocks: [
 "rich_text",
 "info_cards",
 "bento_grid",
 "gallery_grid",
 "video_section",
 "timeline_history",
 ],
 },
 {
 id: "social",
 label: "Social e Comunidade",
 icon: Star,
 blocks: ["testimonial_carousel", "stories_ring", "social_grid"],
 },
 {
 id: "conversion",
 label: "Conversão e Ofertas",
 icon: Zap,
 blocks: ["countdown_timer", "trust_badges", "faq_accordion", "contact_form"],
 },
 {
 id: "store_profile",
 label: "Perfil da Empresa",
 icon: Store,
 blocks: ["store_profile_hero", "store_hours", "store_contact"],
 },
 {
 id: "media",
 label: "Widgets Interativos",
 icon: SlidersHorizontal,
 blocks: ["before_after_slider", "image_hotspots", "routine_steps", "ingredient_spotlight"],
 },
];

export type LeftPanelTab = "layers" | "blocks";

export interface BuilderLeftPanelProps {
 activePanel: LeftPanelTab;
 setActivePanel: (panel: LeftPanelTab) => void;
 nodesCount: number;
 treeNodes: any[];
 selectedNodeId: string | null;
 setSelectedNodeId: (id: string | null) => void;
 moveNode: (id: string, dir: -1 | 1, e: React.MouseEvent) => void;
 deleteNode: (id: string, e: React.MouseEvent) => void;
 reorderNodeAbsolute: (draggedId: string, targetId: string) => void;
 blockCategory: string;
 setBlockCategory: (cat: string) => void;
 insertBlock: (blockType: string) => void;
 insertSectionPreset: (presetId: string) => void;
 onAddSection: () => void;
}

export function BuilderLeftPanel({
 activePanel,
 setActivePanel,
 nodesCount,
 treeNodes,
 selectedNodeId,
 setSelectedNodeId,
 moveNode,
 deleteNode,
 reorderNodeAbsolute,
 blockCategory,
 setBlockCategory,
 insertBlock,
 onAddSection,
}: BuilderLeftPanelProps) {
 const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
 const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null);

 const renderLayer = (
 node: { id: string; block_type: string; children?: any[] },
 depth = 0,
 ): React.ReactNode => {
 const isSelected = selectedNodeId === node.id;
 const isDragged = draggedNodeId === node.id;
 const isDragOver = dragOverNodeId === node.id;
 const reg = builderRegistry[node.block_type];

 return (
 <div key={node.id} className="w-full">
 <div
 draggable
 role="button"
 tabIndex={0}
 aria-pressed={isSelected}
 onDragStart={(e) => {
 e.stopPropagation();
 setDraggedNodeId(node.id);
 e.dataTransfer.effectAllowed = "move";
 e.dataTransfer.setData("text/plain", node.id);
 }}
 onDragOver={(e) => {
 e.preventDefault();
 e.stopPropagation();
 if (draggedNodeId && draggedNodeId !== node.id) {
 setDragOverNodeId(node.id);
 }
 }}
 onDragLeave={(e) => {
 e.preventDefault();
 e.stopPropagation();
 if (dragOverNodeId === node.id) setDragOverNodeId(null);
 }}
 onDrop={(e) => {
 e.preventDefault();
 e.stopPropagation();
 setDragOverNodeId(null);
 if (draggedNodeId && draggedNodeId !== node.id) {
 reorderNodeAbsolute(draggedNodeId, node.id);
 }
 setDraggedNodeId(null);
 }}
 onDragEnd={() => {
 setDraggedNodeId(null);
 setDragOverNodeId(null);
 }}
 onKeyDown={(e) => {
 if (e.target !== e.currentTarget) return;
 if (e.key === "Enter" || e.key === " ") {
 e.preventDefault();
 setSelectedNodeId(node.id);
 }
 }}
 className={cn(
 "flex min-h-11 min-w-11 items-center gap-2 py-2 pr-2 rounded-lg text-xs cursor-pointer transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 group select-none relative my-1",
 isSelected
 ? "bg-primary/10 text-primary font-bold shadow-2xs border border-primary/20"
 : "hover:bg-muted/60 text-foreground",
 isDragged && "opacity-40",
 isDragOver && "border-t-2 border-t-primary"
 )}
 style={{ paddingLeft: `${depth * 14 + 10}px` }}
 onClick={() => setSelectedNodeId(node.id)}
 >
 <GripVertical className="size-3.5 opacity-40 shrink-0 text-muted-foreground group-hover:opacity-80" />
 <span className="truncate flex-1 text-xs">
 {reg?.name ?? node.block_type}
 </span>
 <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
 <button
 type="button"
 className="size-11 min-h-11 min-w-11 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors motion-reduce:transition-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
 onClick={(e) => moveNode(node.id, -1, e)}
 aria-label="Mover para cima"
 title="Mover para cima"
 >
 <ChevronUp className="size-3" />
 </button>
 <button
 type="button"
 className="size-11 min-h-11 min-w-11 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors motion-reduce:transition-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
 onClick={(e) => moveNode(node.id, 1, e)}
 aria-label="Mover para baixo"
 title="Mover para baixo"
 >
 <ChevronDown className="size-3" />
 </button>
 <button
 type="button"
 className="size-11 min-h-11 min-w-11 rounded-lg hover:bg-destructive/10 text-destructive transition-colors motion-reduce:transition-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
 onClick={(e) => deleteNode(node.id, e)}
 aria-label="Excluir bloco"
 title="Excluir bloco"
 >
 <Trash2 className="size-3" />
 </button>
 </div>
 </div>
 {node.children && node.children.length > 0 && (
 <div className="w-full">{node.children.map((c) => renderLayer(c, depth + 1))}</div>
 )}
 </div>
 );
 };

 return (
 <aside className="w-80 bg-card border-r border-border/80 flex flex-col flex-none overflow-hidden select-none z-20 shadow-2xs">
 {/* ── Abas de Controle: Camadas / Adicionar ── */}
 <div className="flex p-2 bg-muted/40 border-b border-border/60 gap-1">
 <button
 type="button"
 onClick={() => setActivePanel("layers")}
 className={cn(
 "flex-1 min-h-11 min-w-11 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors motion-reduce:transition-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
 activePanel === "layers"
 ? "bg-background text-foreground font-bold shadow-2xs"
 : "text-muted-foreground hover:text-foreground"
 )}
 >
 <Layers className="size-3.5 text-primary" />
 <span>Camadas ({nodesCount})</span>
 </button>

 <button
 type="button"
 onClick={() => setActivePanel("blocks")}
 className={cn(
 "flex-1 min-h-11 min-w-11 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors motion-reduce:transition-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
 activePanel === "blocks"
 ? "bg-background text-foreground font-bold shadow-2xs"
 : "text-muted-foreground hover:text-foreground"
 )}
 >
 <Plus className="size-3.5 text-primary" />
 <span>Adicionar</span>
 </button>
 </div>

 <ScrollArea className="flex-1">
 {/* ── PAINEL DE CAMADAS ── */}
 {activePanel === "layers" && (
 <div className="p-3 space-y-3">
 <Button
 type="button"
 onClick={onAddSection}
 className="w-full h-11 min-h-11 rounded-lg text-xs font-bold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
 >
 <LayoutTemplate className="size-4" />
 <span>Explorar Catálogo de Seções</span>
 </Button>

 {treeNodes.length === 0 ? (
 <div className="p-8 rounded-lg bg-muted/30 text-center space-y-2 border border-dashed border-border/80 my-4">
 <Layers className="size-8 mx-auto text-muted-foreground/40" />
 <p className="text-xs font-semibold text-foreground">Nenhuma seção inserida</p>
 <p className="text-xs text-muted-foreground">
 Clique no botão acima para adicionar a primeira seção da sua página.
 </p>
 </div>
 ) : (
 <div className="space-y-1 pt-1">
 {treeNodes.map((rootNode) => renderLayer(rootNode, 0))}
 </div>
 )}
 </div>
 )}

 {/* ── PAINEL DE ADICIONAR BLOCOS INDIVIDUAIS ── */}
 {activePanel === "blocks" && (
 <div className="flex flex-col p-3 space-y-4">
 <Button
 type="button"
 onClick={onAddSection}
 className="w-full h-11 min-h-11 rounded-lg text-xs font-bold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
 >
 <LayoutTemplate className="size-4" />
 <span>Seções Completas Prontas</span>
 </Button>

 <div className="space-y-2">
 <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
 Categorias de Blocos
 </span>
 <div className="grid grid-cols-2 gap-2">
 {BLOCK_CATEGORIES.map((cat) => {
 const Icon = cat.icon;
 return (
 <button
 type="button"
 key={cat.id}
 onClick={() => setBlockCategory(cat.id)}
 className={cn(
 "flex min-h-11 min-w-11 items-center gap-2 p-3 rounded-lg text-xs transition-colors motion-reduce:transition-none text-left cursor-pointer border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
 blockCategory === cat.id
 ? "bg-primary/10 border-primary/30 text-primary font-bold shadow-2xs"
 : "bg-muted/30 border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/60"
 )}
 >
 <Icon className="size-3.5 shrink-0" />
 <span className="truncate">{cat.label}</span>
 </button>
 );
 })}
 </div>
 </div>

 {/* Lista de Blocos da Categoria Selecionada */}
 <div className="space-y-2 pt-1">
 <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
 Blocos Disponíveis
 </span>
 <div className="grid grid-cols-1 gap-2">
 {(BLOCK_CATEGORIES.find((c) => c.id === blockCategory)?.blocks ?? []).map(
 (blockType) => {
 const reg = builderRegistry[blockType];
 if (!reg) return null;
 return (
 <button
 type="button"
 key={blockType}
 onClick={() => insertBlock(blockType)}
 className="flex min-h-11 min-w-11 items-center justify-between p-3 bg-muted/20 hover:bg-muted/60 border border-border/50 hover:border-primary/40 rounded-lg transition-colors motion-reduce:transition-none text-left cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
 >
 <div className="space-y-1 min-w-0 flex-1 pr-2">
 <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors motion-reduce:transition-none truncate">
 {reg.name}
 </p>
 <p className="text-xs text-muted-foreground line-clamp-1">
 {reg.description}
 </p>
 </div>
 <Plus className="size-4 text-muted-foreground group-hover:text-primary group-hover:scale-110 transition-transform motion-reduce:transition-none shrink-0" />
 </button>
 );
 }
 )}
 </div>
 </div>
 </div>
 )}
 </ScrollArea>
 </aside>
 );
}
