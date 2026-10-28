import React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  ForkKnife,
  Storefront,
  Pill,
  BeerBottle,
  Flame,
  PawPrint,
  SquaresFour,
  TShirt,
  Laptop,
  Couch,
  Hammer,
  Sparkle,
  Broom,
  BookOpen,
} from "@phosphor-icons/react";
import { useSuperAppDrawer } from "@/lib/drawer-store";
import { cn } from "@/lib/utils";

export interface VitrineDockItem {
  id: string;
  label: string;
  to: string;
  icon: React.ComponentType<any>;
  badge?: string;
}

export const CANONICAL_COMMERCIAL_VITRINES: VitrineDockItem[] = [
  { id: "gastronomia", label: "Restaurantes", to: "/gastronomia", icon: ForkKnife },
  { id: "mercado", label: "Mercados", to: "/mercado", icon: Storefront },
  { id: "farmacia", label: "Farmácias", to: "/farmacia", icon: Pill },
  { id: "bebidas", label: "Bebidas", to: "/bebidas", icon: BeerBottle },
  { id: "acougue", label: "Açougue", to: "/acougue", icon: Flame },
  { id: "pet", label: "Pet Shop", to: "/pet", icon: PawPrint },
  { id: "moda", label: "Moda", to: "/moda", icon: TShirt },
  { id: "eletronicos", label: "Eletrônicos", to: "/eletronicos", icon: Laptop },
  { id: "casa", label: "Casa", to: "/casa", icon: Couch },
  { id: "construcao", label: "Construção", to: "/construcao", icon: Hammer },
  { id: "beleza", label: "Beleza", to: "/beleza", icon: Sparkle },
  { id: "limpeza", label: "Limpeza", to: "/limpeza", icon: Broom },
  { id: "livros", label: "Papelaria", to: "/livros", icon: BookOpen },
];

export interface MultiVitrineDockProps {
  activeId?: string;
  items?: VitrineDockItem[];
  className?: string;
}

export function MultiVitrineDock({
  activeId,
  items = CANONICAL_COMMERCIAL_VITRINES,
  className,
}: MultiVitrineDockProps) {
  const location = useLocation();
  const { open: openSuperApp } = useSuperAppDrawer();

  // Detecta id ativo a partir do pathname se não fornecido
  const currentActiveId =
    activeId ||
    items.find((it) => location.pathname.includes(it.to))?.id ||
    items[0]?.id;

  return (
    <nav
      aria-label="Vitrines Comerciais"
      className={cn(
        "w-full flex items-center gap-2 overflow-x-auto no-scrollbar py-2 px-3 sm:px-4 snap-x snap-mandatory",
        className,
      )}
      data-testid="multi-vitrine-dock"
    >
      {/* Botão Ver Mais / Todas as Categorias */}
      <button
        type="button"
        onClick={openSuperApp}
        aria-label="Ver todas as categorias"
        className="h-11 min-h-11 px-3 rounded-xl border border-border/70 bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground flex items-center justify-center shrink-0 snap-start transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring gap-2"
      >
        <SquaresFour size={18} weight="bold" />
        <span className="text-xs font-bold leading-none hidden xs:inline">Categorias</span>
      </button>

      {/* Trilho de Vitrines Comerciais */}
      {items.map((item) => {
        const isActive = currentActiveId === item.id;
        const IconComponent = item.icon;

        return (
          <Link
            key={item.id}
            to={item.to}
            className={cn(
              "h-11 min-h-11 px-3 rounded-xl border flex items-center gap-2 shrink-0 snap-start transition-all cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring relative",
              isActive
                ? "bg-foreground text-background border-foreground font-bold"
                : "bg-card text-muted-foreground hover:text-foreground border-border/70 hover:bg-muted/50 font-medium",
            )}
          >
            <div
              className={cn(
                "size-6 rounded-lg flex items-center justify-center shrink-0",
                isActive ? "bg-background/20 text-background" : "bg-primary/10 text-primary",
              )}
            >
              <IconComponent size={16} weight="bold" />
            </div>

            <span className="text-xs tracking-tight whitespace-nowrap leading-none">
              {item.label}
            </span>

            {item.badge && (
              <span className="absolute -top-1 -right-1 px-1 py-0.5 rounded-full bg-destructive text-destructive-foreground text-3xs font-black uppercase tracking-wider">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
