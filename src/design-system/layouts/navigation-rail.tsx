import * as React from "react";
import { cn } from "@/lib/utils";
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
  { id: "settings", label: "Ajustes", icon: Settings, href: "/workspace/settings" },
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
    <aside
      aria-label="Navegação Primária"
      className={cn(
        "flex flex-col items-center justify-between w-16 h-full border-r border-border/60 bg-card select-none shrink-0 py-3",
        className
      )}
    >
      {/* Top / Brand / Logo Slot */}
      <div className="flex flex-col items-center gap-4 w-full">
        {headerSlot ? (
          headerSlot
        ) : (
          <div
            className="size-11 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-base shadow-xs"
            title="Waesy Workspace"
            aria-label="Waesy"
          >
            W
          </div>
        )}

        {/* Rail Navigation Icons */}
        <nav className="flex flex-col items-center gap-1 w-full px-2">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectItem?.(item.id)}
                title={item.label}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex items-center justify-center size-11 rounded-lg transition-colors cursor-pointer",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isActive
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                )}
              >
                <Icon className="size-5 shrink-0 pointer-events-none" />
                {item.badge !== undefined && (
                  <span className="absolute top-1 right-1 size-2 rounded-full bg-destructive" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / User / Status Slot */}
      {footerSlot && (
        <div className="flex flex-col items-center gap-2 w-full px-2 pt-2 border-t border-border/40">
          {footerSlot}
        </div>
      )}
    </aside>
  );
}
