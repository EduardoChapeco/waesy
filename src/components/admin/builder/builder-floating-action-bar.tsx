import * as React from "react";
import { Tag, Edit3, LayoutGrid, Copy, Trash2, Sliders, Layers, ArrowUp, ArrowDown, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { builderRegistry } from "@/lib/builder-registry";

export interface BuilderFloatingActionBarProps {
 selectedNode: any;
 onEditContent: () => void;
 onChangeLayout: () => void;
 onDuplicate: () => void;
 onDelete: () => void;
 onMoveUp?: () => void;
 onMoveDown?: () => void;
}

export function BuilderFloatingActionBar({
 selectedNode,
 onEditContent,
 onChangeLayout,
 onDuplicate,
 onDelete,
 onMoveUp,
 onMoveDown,
}: BuilderFloatingActionBarProps) {
 if (!selectedNode) return null;

 const reg = builderRegistry[selectedNode.block_type];
 const blockName = reg?.name || selectedNode.block_type;

 return (
 <div
 onClick={(e) => e.stopPropagation()}
 className="inline-flex items-center gap-1 p-1 bg-card/95 backdrop-blur-md border border-border/80 rounded-lg shadow-xl z-40 select-none animate-in fade-in zoom-in-95 duration-150 ring-1 ring-black/5"
 >
 {/* Tag do Tipo de Bloco */}
 <Badge
 variant="secondary"
 className="text-[10px] font-bold px-2 py-1 rounded-lg bg-primary/10 text-primary border-primary/20 shrink-0 uppercase font-mono mr-1"
 >
 {blockName}
 </Badge>

 {/* Ação 1: Editar Conteúdo / Texto */}
 <button
 type="button"
 onClick={onEditContent}
 className="h-7 px-3 rounded-lg text-xs font-semibold flex items-center gap-2 bg-muted/60 hover:bg-muted text-foreground transition-colors cursor-pointer"
 title="Editar Textos e Imagens"
 >
 <Edit3 className="size-3 text-primary" />
 <span>Editar</span>
 </button>

 {/* Ação 2: Alterar Layout de Grid */}
 <button
 type="button"
 onClick={onChangeLayout}
 className="h-7 px-3 rounded-lg text-xs font-semibold flex items-center gap-2 bg-muted/60 hover:bg-muted text-foreground transition-colors cursor-pointer"
 title="Trocar Formato de Grid / Layout"
 >
 <LayoutGrid className="size-3 text-primary" />
 <span>Layout</span>
 </button>

 <div className="h-4 w-px bg-border/60 mx-1" />

 {/* Ação 3: Mover Cima / Baixo */}
 {onMoveUp && (
 <button
 type="button"
 onClick={onMoveUp}
 className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
 title="Mover para cima"
 >
 <ArrowUp className="size-3.5" />
 </button>
 )}

 {onMoveDown && (
 <button
 type="button"
 onClick={onMoveDown}
 className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
 title="Mover para baixo"
 >
 <ArrowDown className="size-3.5" />
 </button>
 )}

 {/* Ação 4: Duplicar */}
 <button
 type="button"
 onClick={onDuplicate}
 className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
 title="Duplicar bloco"
 >
 <Copy className="size-3.5" />
 </button>

 {/* Ação 5: Excluir */}
 <button
 type="button"
 onClick={onDelete}
 className="size-7 rounded-lg flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
 title="Excluir bloco"
 >
 <Trash2 className="size-3.5" />
 </button>
 </div>
 );
}
