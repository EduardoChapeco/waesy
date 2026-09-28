import * as React from "react";
import { Plus, Layers, FileText, Palette, Database, Sliders, Settings, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type DockedRailActivePanel = "add" | "layers" | "pages" | "design" | "cms" | null;

export interface BuilderDockedRailProps {
 activePanel: DockedRailActivePanel;
 onTogglePanel: (panel: DockedRailActivePanel) => void;
 nodesCount?: number;
}

export function BuilderDockedRail({
 activePanel,
 onTogglePanel,
 nodesCount = 0,
}: BuilderDockedRailProps) {
 const tools = [
 {
 id: "add" as const,
 label: "Adicionar Seções e Blocos (+)",
 icon: Plus,
 isPrimary: true,
 },
 {
 id: "layers" as const,
 label: `Camadas (${nodesCount})`,
 icon: Layers,
 },
 {
 id: "pages" as const,
 label: "Páginas do Site",
 icon: FileText,
 },
 {
 id: "design" as const,
 label: "Tema e Estilo Global",
 icon: Palette,
 },
 {
 id: "cms" as const,
 label: "Gerenciador de Dados (CMS)",
 icon: Database,
 },
 ];

 return (
 <aside className="w-12 bg-card border-r border-border/80 flex flex-col items-center justify-between py-3 flex-none select-none z-30 shadow-2xs">
 {/* Grupo Superior: Ferramentas Principais */}
 <div className="flex flex-col items-center gap-2 w-full px-1.5">
 {tools.map((tool) => {
 const Icon = tool.icon;
 const isActive = activePanel === tool.id;

 return (
 <button
 key={tool.id}
 type="button"
 onClick={() => onTogglePanel(isActive ? null : tool.id)}
 title={tool.label}
 className={cn(
 "size-9 rounded-xl flex items-center justify-center transition-all cursor-pointer relative group",
 tool.isPrimary && !isActive
 ? "bg-primary text-primary-foreground hover:opacity-90 shadow-2xs"
 : isActive
 ? "bg-primary/15 text-primary font-bold border border-primary/30"
 : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
 )}
 >
 <Icon className={cn("size-4", tool.isPrimary && !isActive && "text-primary-foreground")} />

 {/* Indicador de Painel Ativo */}
 {isActive && (
 <span className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-1 h-4 bg-primary rounded-l-full" />
 )}

 {/* Tooltip Hover Lateral */}
 <span className="absolute left-14 px-2.5 py-1 rounded-lg bg-foreground text-background text-[10px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-md">
 {tool.label}
 </span>
 </button>
 );
 })}
 </div>

 {/* Grupo Inferior: Ajuda & Suporte */}
 <div className="flex flex-col items-center gap-2 w-full px-1.5 pt-3 border-t border-border/50">
 <button
 type="button"
 title="Atalhos do Construtor"
 className="size-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer group relative"
 >
 <HelpCircle className="size-4" />
 <span className="absolute left-14 px-2.5 py-1 rounded-lg bg-foreground text-background text-[10px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-md">
 Atalhos (Ctrl+Z / Ctrl+Y)
 </span>
 </button>
 </div>
 </aside>
 );
}
