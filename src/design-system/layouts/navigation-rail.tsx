import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StatefulNavIcon } from "@/components/ui/stateful-nav-icon";
import {
  Home,
  Bot,
  Users,
  Briefcase,
  Calendar,
  DollarSign,
  ShoppingBag,
  LayoutTemplate,
  Grid,
  Settings,
} from "lucide-react";

export interface NavigationRailItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  badge?: string | number;
}

export const CANONICAL_RAIL_ITEMS: NavigationRailItem[] = [
  { id: "home", label: "Início", icon: Home, href: "/workspace" },
  { id: "copilot", label: "Copilot", icon: Bot, href: "/workspace/copilot" },
  { id: "crm", label: "Clientes", icon: Users, href: "/workspace/crm" },
  { id: "workspace", label: "Operações", icon: Briefcase, href: "/workspace" },
  { id: "agenda", label: "Agenda", icon: Calendar, href: "/workspace/agenda" },
  { id: "financeiro", label: "Financeiro", icon: DollarSign, href: "/workspace/financeiro" },
  { id: "commerce", label: "Comércio", icon: ShoppingBag, href: "/workspace/pedidos" },
  { id: "builder", label: "Construtor", icon: LayoutTemplate, href: "/workspace/builder" },
  { id: "apps", label: "Módulos", icon: Grid, href: "/workspace/skills" },
  { id: "settings", label: "Ajustes", icon: Settings, href: "/workspace/configuracoes" },
];

export interface NavigationRailProps {
  items?: NavigationRailItem[];
  activeId?: string;
  onSelectItem?: (id: string) => void;
  headerSlot?: React.ReactNode;
  footerSlot?: React.ReactNode;
  className?: string;
}

export function NavigationRail({
  items = CANONICAL_RAIL_ITEMS,
  activeId = "home",
  onSelectItem,
  headerSlot,
  footerSlot,
  className,
}: NavigationRailProps) {
  return (
    <TooltipProvider delayDuration={120}>
      <aside
        aria-label="Navegação Primária"
        className={cn(
          "flex flex-col items-center justify-between w-14 h-full border-r border-sidebar-border bg-rail select-none shrink-0 py-3",
          className
        )}
      >
        {/* Top / Brand / Logo Slot */}
        <div className="flex flex-col items-center gap-3 w-full">
          {headerSlot ? (
            headerSlot
          ) : (
            <div
              className="size-11 rounded-xl bg-foreground flex items-center justify-center text-background font-bold text-base"
              title="Waesy"
              aria-label="Waesy"
            >
              W
            </div>
          )}

          {/* Rail Navigation Icons */}
          <nav className="flex flex-col items-center gap-1 w-full px-1">
            {items.map((item) => {
              const isActive = item.id === activeId;
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onSelectItem?.(item.id)}
                      aria-label={item.label}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "relative flex items-center justify-center size-11 min-w-11 min-h-11 rounded-xl transition-colors cursor-pointer",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isActive
                          ? "bg-rail-active text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-rail-hover"
                      )}
                    >
                      <StatefulNavIcon icon={item.icon} active={isActive} className="size-5 shrink-0 pointer-events-none" />
                      {item.badge !== undefined && (
                        <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-destructive" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </nav>
        </div>

        {/* Footer / User / Status Slot */}
        {footerSlot && (
          <div className="flex flex-col items-center gap-2 w-full px-1 pt-2 border-t border-sidebar-border">
            {footerSlot}
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
}
