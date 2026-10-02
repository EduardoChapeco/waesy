import * as React from "react";
import { X, Grid as GridIcon, LayoutGrid, Columns, Sliders, Check, Film, Layers, StretchHorizontal } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface BuilderLayoutOption {
 id: string;
 label: string;
 description: string;
 icon: any;
 columns?: number;
 gap?: string;
}

export const CANONICAL_LAYOUT_OPTIONS: BuilderLayoutOption[] = [
 {
 id: "grid",
 label: "Grid Regular",
 description: "Grade uniforme e simétrica (2, 3 ou 4 colunas)",
 icon: GridIcon,
 },
 {
 id: "masonry",
 label: "Masonry (Cascata)",
 description: "Mosaico estilo Pinterest com alturas dinâmicas",
 icon: LayoutGrid,
 },
 {
 id: "collage",
 label: "Collage (Editorial)",
 description: "Item de destaque maior com itens secundários ao lado",
 icon: Layers,
 },
 {
 id: "slider",
 label: "Slider / Carrossel",
 description: "Trilho horizontal deslizante com setas e toque",
 icon: Sliders,
 },
 {
 id: "strip",
 label: "Strip (Faixa)",
 description: "Blocos horizontais de ponta a ponta",
 icon: StretchHorizontal,
 },
 {
 id: "column",
 label: "Colunas 50/50",
 description: "Divisão proporcional balanceada em 2 colunas",
 icon: Columns,
 },
];

export interface BuilderLayoutSwitcherModalProps {
 isOpen: boolean;
 onClose: () => void;
 currentNode: any;
 onApplyLayout: (layoutId: string) => void;
}

export function BuilderLayoutSwitcherModal({
 isOpen,
 onClose,
 currentNode,
 onApplyLayout,
}: BuilderLayoutSwitcherModalProps) {
 if (!isOpen || !currentNode) return null;

 const currentVariant = currentNode.layout_rules?.variant || "grid";

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs select-none animate-in fade-in duration-150">
 <div className="w-full max-w-lg bg-card border border-border rounded-lg shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
 {/* Cabeçalho do Seletor (Wix Pro Gallery Standard — Imagem 2) */}
 <div className="p-5 border-b border-border/70 flex items-center justify-between bg-muted/20">
 <div className="flex items-center gap-3">
 <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
 <LayoutGrid className="size-5" />
 </div>
 <div>
 <h3 className="text-base font-bold text-foreground">Alterar Layout da Seção</h3>
 <p className="text-xs text-muted-foreground">
 Escolha uma nova disposição visual sem perder os dados cadastrados.
 </p>
 </div>
 </div>

 <Button
 type="button"
 variant="ghost"
 size="icon"
 onClick={onClose}
 className="size-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
 >
 <X className="size-4" />
 </Button>
 </div>

 {/* Grade de Layouts Visuais com Diagramas */}
 <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[65vh] overflow-y-auto no-scrollbar">
 {CANONICAL_LAYOUT_OPTIONS.map((layout) => {
 const Icon = layout.icon;
 const isSelected = currentVariant === layout.id;

 return (
 <button
 key={layout.id}
 type="button"
 onClick={() => {
 onApplyLayout(layout.id);
 onClose();
 }}
 className={cn(
 "p-4 rounded-lg border flex flex-col items-center justify-between text-center gap-3 transition-all cursor-pointer group relative",
 isSelected
 ? "bg-primary/10 border-primary shadow-xs ring-2 ring-primary/20"
 : "bg-muted/30 border-border/70 hover:bg-muted/70 hover:border-primary/40"
 )}
 >
 {/* Diagrama / Ícone Visual do Layout */}
 <div
 className={cn(
 "size-12 rounded-lg flex items-center justify-center transition-all",
 isSelected
 ? "bg-primary text-primary-foreground shadow-xs"
 : "bg-background border border-border/80 text-muted-foreground group-hover:text-foreground group-hover:scale-105"
 )}
 >
 <Icon className="size-6" />
 </div>

 <div className="space-y-1">
 <span
 className={cn(
 "text-xs font-bold block",
 isSelected ? "text-primary" : "text-foreground"
 )}
 >
 {layout.label}
 </span>
 <span className="text-[10px] text-muted-foreground line-clamp-1">
 {layout.description}
 </span>
 </div>

 {isSelected && (
 <span className="absolute top-2 right-2 size-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
 <Check className="size-2.5 stroke-[3]" />
 </span>
 )}
 </button>
 );
 })}
 </div>

 {/* Rodapé Informativo */}
 <div className="p-4 bg-muted/10 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground px-5">
 <span>O layout selecionado é salvo instantaneamente.</span>
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={onClose}
 className="h-8 px-4 rounded-lg text-xs font-bold"
 >
 Concluir
 </Button>
 </div>
 </div>
 </div>
 );
}
