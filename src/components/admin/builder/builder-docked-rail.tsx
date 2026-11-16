import * as React from "react";
import { Plus, Layers, FileText, Palette, Database, LayoutGrid, Code2, HelpCircle, Home } from "lucide-react";
import { StatefulNavIcon } from "@/components/ui/stateful-nav-icon";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type DockedRailActivePanel = "add" | "layers" | "pages" | "design" | "cms" | "apps" | "code" | null;

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
  const [showShortcutHint, setShowShortcutHint] = React.useState(false);
  const tools = [
    {
      id: "add" as const,
      label: "Adicionar Seções e Blocos (+)",
      icon: Plus,
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
    {
      id: "apps" as const,
      label: "Omni Apps Market",
      icon: LayoutGrid,
    },
    {
      id: "code" as const,
      label: "Explorador de Código",
      icon: Code2,
    },
  ];

  return (
    <TooltipProvider delayDuration={120}>
      <aside
        aria-label="Ferramentas do Builder Omni"
        className="w-14 bg-rail border-r border-sidebar-border flex flex-col items-center justify-between py-3 px-1 shrink-0 select-none z-30 h-full overflow-y-auto no-scrollbar"
      >
        {/* Grupo Superior: Ferramentas Principais (Somente Ícones — Sólido quando ativo) */}
        <div className="flex flex-col items-center gap-1 w-full">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isActive = activePanel === tool.id;

            return (
              <Tooltip key={tool.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onTogglePanel(isActive ? null : tool.id)}
                    aria-label={tool.label}
                    aria-pressed={isActive}
                    className={cn(
                      "size-11 min-w-11 min-h-11 rounded-xl relative flex items-center justify-center transition-colors motion-reduce:transition-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isActive
                        ? "bg-rail-active text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-rail-hover",
                    )}
                  >
                    <StatefulNavIcon
                      icon={Icon}
                      active={isActive}
                      size={20}
                      className="size-5 shrink-0"
                    />
                    <span className="sr-only">{tool.label}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {tool.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Grupo Inferior: Atalhos & Workspace */}
        <div className="w-full pt-2 border-t border-sidebar-border flex flex-col items-center gap-1 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setShowShortcutHint((visible) => !visible)}
                aria-label="Atalhos do Construtor"
                aria-pressed={showShortcutHint}
                className={cn(
                  "size-11 min-w-11 min-h-11 rounded-xl flex items-center justify-center transition-colors motion-reduce:transition-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  showShortcutHint
                    ? "bg-rail-active text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-rail-hover",
                )}
              >
                <StatefulNavIcon
                  icon={HelpCircle}
                  active={showShortcutHint}
                  size={20}
                  className="size-5 shrink-0"
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              Atalhos (Ctrl+Z / Ctrl+Y)
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href="/workspace"
                aria-label="Painel Workspace"
                className="size-11 min-w-11 min-h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-rail-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <StatefulNavIcon icon={Home} active={false} size={20} className="size-5 shrink-0" />
              </a>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              Painel Workspace
            </TooltipContent>
          </Tooltip>

          {showShortcutHint && (
            <div className="sr-only" aria-live="polite">
              Atalhos do Construtor: Ctrl+Z para desfazer, Ctrl+Y para refazer, Esc para fechar painéis laterais.
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
