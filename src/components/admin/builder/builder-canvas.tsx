import * as React from "react";
import { Plus, LayoutTemplate, Layers, Monitor, Smartphone, Sliders } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ExperienceRenderer } from "@/components/commerce/experience-renderer";
import { BuilderFloatingActionBar } from "./builder-floating-action-bar";

export type ViewportMode = "desktop" | "tablet" | "mobile" | "story";

export interface BuilderCanvasProps {
 viewport: ViewportMode | string;
 nodesCount: number;
 treeNodes: any[];
 selectedNodeId: string | null;
 setSelectedNodeId: (id: string | null) => void;
 onAddSection: () => void;
 onEditContent?: () => void;
 onChangeLayout?: () => void;
 onDuplicateNode?: (nodeId: string) => void;
 onDeleteNode?: (nodeId: string) => void;
 onMoveNode?: (nodeId: string, dir: -1 | 1) => void;
 pageSlug?: string;
 transientData?: any;
 themeConfig?: any;
}

export function BuilderCanvas({
 viewport,
 nodesCount,
 treeNodes,
 selectedNodeId,
 setSelectedNodeId,
 onAddSection,
 onEditContent,
 onChangeLayout,
 onDuplicateNode,
 onDeleteNode,
 onMoveNode,
 pageSlug = "vitrine",
 transientData,
 themeConfig,
}: BuilderCanvasProps) {
 // Encontra o nó selecionado para alimentar a Floating Action Bar
 const findNodeById = (id: string, list: any[]): any | null => {
 for (const item of list) {
 if (item.id === id) return item;
 if (item.children) {
 const found = findNodeById(id, item.children);
 if (found) return found;
 }
 }
 return null;
 };

 const selectedNode = selectedNodeId ? findNodeById(selectedNodeId, treeNodes) : null;

 return (
 <main
 className="flex-1 overflow-y-auto bg-muted/20 dark:bg-muted/10 flex flex-col items-center select-none relative p-0 sm:px-6 sm:py-6 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
 onClick={() => setSelectedNodeId(null)}
 >
 {/* ── Barra de Ações Flutuante (Floating Action Bar - Studio Standard) ── */}
 {selectedNode && (
 <div className="sticky top-3 z-30 flex justify-center w-full pointer-events-auto mb-3">
 <BuilderFloatingActionBar
 selectedNode={selectedNode}
 onEditContent={() => onEditContent?.()}
 onChangeLayout={() => onChangeLayout?.()}
 onDuplicate={() => onDuplicateNode?.(selectedNode.id)}
 onDelete={() => onDeleteNode?.(selectedNode.id)}
 onMoveUp={() => onMoveNode?.(selectedNode.id, -1)}
 onMoveDown={() => onMoveNode?.(selectedNode.id, 1)}
 />
 </div>
 )}

 {/* ── 1. FRAME DE VISUALIZAÇÃO STUDIO: DESKTOP (EDGE-TO-EDGE REAL) ── */}
 {viewport === "desktop" && (
 <div
 className="w-full max-w-[1440px] min-h-[calc(100dvh-100px)] bg-background border border-border/60 rounded-none shadow-none overflow-hidden flex flex-col mb-16 transition-all"
 onClick={(e) => e.stopPropagation()}
 >
 {/* Régua de Precisão Superior Studio (Sem Mac dots, sem cartoonismo) */}
 <div className="h-8 px-4 bg-muted/40 dark:bg-muted/20 border-b border-border/60 flex items-center justify-between select-none shrink-0 text-[11px] font-mono text-muted-foreground">
 <div className="flex items-center gap-2">
 <Monitor className="size-3.5 text-primary/70" />
 <span className="font-sans font-semibold text-foreground/80">Desktop Canvas</span>
 <span className="text-[10px] px-1.5 py-0.2 bg-muted rounded">1440px</span>
 </div>

 <div className="text-[10px] text-muted-foreground font-sans truncate max-w-xs">
 /{pageSlug || "vitrine"} · {nodesCount} bloco(s)
 </div>

 <div className="flex items-center gap-2">
 <span className="text-[10px]">100% Escala</span>
 </div>
 </div>

 {/* Viewport Retangular Reto 1:1 com a Web Real */}
 <div
 className="@container flex-1 overflow-y-auto overflow-x-hidden w-full h-full flex flex-col bg-background no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden transition-colors"
 style={{
 backgroundColor: themeConfig?.backgroundColor || undefined,
 color: themeConfig?.textColor || undefined,
 fontFamily: themeConfig?.bodyFont || undefined,
 }}
 >
 {nodesCount === 0 ? (
 <div className="flex-1 flex flex-col items-center justify-center min-h-[460px] text-muted-foreground gap-3 p-8 text-center animate-in fade-in duration-200">
 <div className="size-12 rounded-xl bg-muted/50 flex items-center justify-center border border-border/50 text-muted-foreground/70">
 <LayoutTemplate className="size-6" />
 </div>
 <div className="max-w-sm space-y-1">
 <p className="font-semibold text-foreground text-sm tracking-tight">Sua página está vazia</p>
 <p className="text-xs text-muted-foreground leading-relaxed">
 Clique abaixo para inserir uma seção pré-configurada ou adicione blocos pelo menu lateral.
 </p>
 </div>
 <Button
 onClick={onAddSection}
 size="sm"
 className="mt-2 h-9 px-4 rounded-xl font-semibold text-xs gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer"
 >
 <Plus className="size-3.5" />
 <span>Adicionar Seção</span>
 </Button>
 </div>
 ) : (
 <div className="flex flex-col min-h-full">
 <ExperienceRenderer
 nodes={treeNodes}
 isEditing
 transientData={transientData}
 selectedNodeId={selectedNodeId}
 onSelectNode={(id: string) => setSelectedNodeId(id)}
 />

 {/* Botão de Adicionar Seção no Final da Página */}
 <div className="py-12 flex justify-center w-full mt-auto bg-muted/5 border-t border-dashed border-border/60">
 <Button
 onClick={onAddSection}
 variant="outline"
 size="sm"
 className="rounded-xl text-xs font-semibold gap-2 bg-background hover:bg-muted border-border/80 cursor-pointer shadow-2xs"
 >
 <Plus className="size-3.5 text-primary" />
 <span>Adicionar Nova Seção</span>
 </Button>
 </div>
 </div>
 )}
 </div>
 </div>
 )}

 {/* ── 2. FRAME DE VISUALIZAÇÃO STUDIO: MOBILE (VIEWPORT PRECISO 390PX) ── */}
 {viewport === "mobile" && (
 <div
 className="w-[390px] min-h-[844px] bg-background border border-border/70 rounded-none shadow-none overflow-hidden flex flex-col my-4 relative shrink-0 transition-all"
 onClick={(e) => e.stopPropagation()}
 >
 {/* Régua de Precisão Mobile */}
 <div className="h-7 px-3 bg-muted/40 dark:bg-muted/20 border-b border-border/60 flex items-center justify-between select-none shrink-0 text-[10px] font-mono text-muted-foreground">
 <div className="flex items-center gap-1.5">
 <Smartphone className="size-3 text-primary/70" />
 <span className="font-sans font-semibold text-foreground/80">Mobile Viewport</span>
 </div>
 <span>390 × 844 px</span>
 </div>

 {/* Viewport Interno Mobile */}
 <div
 className="@container flex-1 overflow-y-auto overflow-x-hidden w-full flex flex-col bg-background no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden transition-colors"
 style={{
 backgroundColor: themeConfig?.backgroundColor || undefined,
 color: themeConfig?.textColor || undefined,
 fontFamily: themeConfig?.bodyFont || undefined,
 }}
 >
 {nodesCount === 0 ? (
 <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] text-muted-foreground gap-3 p-6 text-center animate-in fade-in duration-200">
 <LayoutTemplate className="size-7 text-muted-foreground/60" />
 <p className="font-semibold text-foreground text-xs">Página sem seções</p>
 <Button
 onClick={onAddSection}
 size="sm"
 className="h-8 px-3 rounded-lg font-semibold text-xs gap-1.5 bg-primary text-primary-foreground"
 >
 <Plus className="size-3" />
 <span>Adicionar Seção</span>
 </Button>
 </div>
 ) : (
 <div className="flex flex-col min-h-full">
 <ExperienceRenderer
 nodes={treeNodes}
 isEditing
 transientData={transientData}
 selectedNodeId={selectedNodeId}
 onSelectNode={(id: string) => setSelectedNodeId(id)}
 />

 <div className="py-8 flex justify-center w-full mt-auto bg-muted/5 border-t border-dashed border-border/60">
 <Button
 onClick={onAddSection}
 variant="outline"
 size="sm"
 className="rounded-xl text-xs font-semibold gap-1.5 bg-background"
 >
 <Plus className="size-3 text-primary" />
 <span>Adicionar Seção</span>
 </Button>
 </div>
 </div>
 )}
 </div>
 </div>
 )}

 {/* ── 3. FRAME DE VISUALIZAÇÃO STUDIO: STORY (9:16 VERTICAL CANVAS) ── */}
 {viewport === "story" && (
 <div
 className="w-[360px] min-h-[640px] bg-background border border-border/70 rounded-none shadow-none overflow-hidden flex flex-col my-4 relative shrink-0 transition-all"
 onClick={(e) => e.stopPropagation()}
 >
 <div className="h-7 px-3 bg-muted/40 dark:bg-muted/20 border-b border-border/60 flex items-center justify-between select-none shrink-0 text-[10px] font-mono text-muted-foreground">
 <span className="font-sans font-semibold text-foreground/80">Vertical (9:16)</span>
 <span>360 × 640 px</span>
 </div>

 <div className="@container flex-1 overflow-y-auto overflow-x-hidden w-full flex flex-col bg-background no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
 {nodesCount === 0 ? (
 <div className="flex-1 flex flex-col items-center justify-center min-h-[320px] text-muted-foreground gap-3 p-6 text-center animate-in fade-in duration-200">
 <LayoutTemplate className="size-7 text-muted-foreground/60" />
 <p className="font-semibold text-foreground text-xs">Sem blocos</p>
 <Button
 onClick={onAddSection}
 size="sm"
 className="h-8 px-3 rounded-lg font-semibold text-xs gap-1.5 bg-primary text-primary-foreground"
 >
 <Plus className="size-3" />
 <span>Adicionar Bloco</span>
 </Button>
 </div>
 ) : (
 <div className="flex flex-col min-h-full">
 <ExperienceRenderer
 nodes={treeNodes}
 isEditing
 transientData={transientData}
 selectedNodeId={selectedNodeId}
 onSelectNode={(id: string) => setSelectedNodeId(id)}
 />
 </div>
 )}
 </div>
 </div>
 )}
 </main>
 );
}
