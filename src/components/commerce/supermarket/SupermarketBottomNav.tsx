import React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  House,
  Percent,
  Sparkle,
  Receipt,
  List,
  CreditCard,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface SupermarketBottomNavProps {
  activeTab: "inicio" | "ofertas" | "clube" | "compras" | "menu";
  onTabChange: (tab: "inicio" | "ofertas" | "clube" | "compras" | "menu") => void;
  offersCount?: number;
  userAvatarUrl?: string | null;
  clubBrandName?: string;
  className?: string;
}

export function SupermarketBottomNav({
  activeTab,
  onTabChange,
  offersCount = 0,
  userAvatarUrl,
  clubBrandName = "Clube",
  className,
}: SupermarketBottomNavProps) {
  const tabs = [
    {
      id: "inicio" as const,
      label: "Início",
      icon: House,
    },
    {
      id: "ofertas" as const,
      label: "Ofertas",
      icon: Percent,
      badge: offersCount > 0 ? (offersCount > 99 ? "99+" : String(offersCount)) : null,
    },
    {
      id: "clube" as const,
      label: clubBrandName,
      icon: Sparkle,
      isSpecial: true,
    },
    {
      id: "compras" as const,
      label: "Compras",
      icon: Receipt,
    },
    {
      id: "menu" as const,
      label: "Menu",
      icon: List,
      isAvatar: Boolean(userAvatarUrl),
    },
  ];

  return (
    <nav
      aria-label="Navegação do Supermercado"
      className={cn(
        "fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur-md border-t border-border/60 pb-safe select-none md:hidden",
        className,
      )}
    >
      <div className="grid grid-cols-5 items-center h-14 min-h-11 px-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const IconComp = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 h-12 min-h-11 w-full rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary relative",
                isActive ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground",
              )}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="relative flex items-center justify-center">
                {tab.isAvatar && userAvatarUrl ? (
                  <img
                    src={userAvatarUrl}
                    alt=""
                    className={cn(
                      "size-6 rounded-full object-cover border",
                      isActive ? "border-primary" : "border-border/60",
                    )}
                  />
                ) : (
                  <IconComp
                    size={22}
                    weight={isActive || tab.isSpecial ? "fill" : "regular"}
                    className={cn(
                      tab.isSpecial && !isActive && "text-blue-600 dark:text-blue-400",
                    )}
                  />
                )}

                {tab.badge ? (
                  <span className="absolute -top-1.5 -right-3 px-1.5 py-0.2 rounded-full text-3xs font-extrabold bg-emerald-600 text-white">
                    {tab.badge}
                  </span>
                ) : null}
              </div>

              <span className="text-3xs leading-none truncate max-w-14">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
