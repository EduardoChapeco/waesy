import React from "react";
import { Home, Search, Grid, ShoppingBag, User } from "lucide-react";

export interface MobileBottomNavProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  accentColor?: string;
  cartCount?: number;
  showLabels?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab = "home",
  onTabChange,
  accentColor = "#0F172A",
  cartCount = 2,
  showLabels = true,
}) => {
  const tabs = [
    { id: "home", label: "Início", icon: Home },
    { id: "search", label: "Busca", icon: Search },
    { id: "categories", label: "Categorias", icon: Grid },
    { id: "cart", label: "Carrinho", icon: ShoppingBag, badge: cartCount },
    { id: "account", label: "Conta", icon: User },
  ];

  return (
    <nav
      aria-label="Navegação do Aplicativo"
      className="w-full bg-card/95 backdrop-blur-md border-t border-border/60 px-2 py-2 flex items-center justify-around shrink-0 select-none safe-area-bottom"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange?.(tab.id)}
            className="flex-1 flex flex-col items-center justify-center py-1 relative min-h-11 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-lg transition-colors"
          >
            <div className="relative flex items-center justify-center">
              <Icon
                className="size-5 transition-transform duration-200 group-hover:scale-105"
                style={{ color: isActive ? accentColor : "currentColor" }}
              />
              {Boolean(tab.badge && tab.badge > 0) && (
                <span
                  style={{ backgroundColor: accentColor }}
                  className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full text-xs font-bold text-white flex items-center justify-center leading-none"
                >
                  {tab.badge}
                </span>
              )}
            </div>

            {showLabels && (
              <span
                className="text-xs font-medium tracking-tight mt-1 truncate max-w-14"
                style={{
                  color: isActive ? accentColor : undefined,
                  fontWeight: isActive ? 600 : 500,
                }}
              >
                {tab.label}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
