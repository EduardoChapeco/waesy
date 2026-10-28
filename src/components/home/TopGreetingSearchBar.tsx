import React from "react";
import { Search, Bell, ShoppingBag } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface TopGreetingSearchBarProps {
  userFullName?: string | null;
  unreadNotificationsCount?: number;
  cartItemCount?: number;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onOpenNotifications?: () => void;
  onOpenCart?: () => void;
  className?: string;
}

export function TopGreetingSearchBar({
  userFullName,
  unreadNotificationsCount = 0,
  cartItemCount = 0,
  searchValue,
  onSearchChange,
  onOpenNotifications,
  onOpenCart,
  className,
}: TopGreetingSearchBarProps) {
  const navigate = useNavigate();
  const firstName = userFullName
    ? userFullName.trim().split(" ")[0]
    : "Visitante";

  return (
    <div className={cn("w-full space-y-2", className)}>
      {/* Top Greeting & Action Cluster */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground leading-none">
            Bem-vindo ao Waesy
          </p>
          <h2 className="text-base font-bold text-foreground tracking-tight leading-tight truncate mt-1">
            Olá, {firstName}
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenNotifications || (() => navigate({ to: "/conta" }))}
            aria-label="Notificações"
            className="size-11 min-w-11 min-h-11 rounded-xl border border-border/60 bg-card hover:bg-muted/50 active:scale-95 transition-transform duration-200 flex items-center justify-center relative text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs"
          >
            <Bell className="size-5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-2 right-2 size-2 rounded-full bg-primary" />
            )}
          </button>

          <button
            type="button"
            onClick={onOpenCart || (() => navigate({ to: "/carrinho" }))}
            aria-label="Carrinho de Compras"
            className="size-11 min-w-11 min-h-11 rounded-xl border border-border/60 bg-card hover:bg-muted/50 active:scale-95 transition-transform duration-200 flex items-center justify-center relative text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs"
          >
            <ShoppingBag className="size-5" />
            {cartItemCount > 0 && (
              <Badge className="absolute -top-1 -right-1 size-5 p-0 flex items-center justify-center text-xs font-black bg-primary text-primary-foreground border-2 border-background">
                {cartItemCount}
              </Badge>
            )}
          </button>
        </div>
      </div>

      {/* Global Search Bar (44px) */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar lojas, restaurantes, serviços ou produtos..."
          className="w-full h-11 pl-10 pr-12 rounded-2xl border border-border/70 bg-card text-xs text-foreground placeholder:text-muted-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-colors duration-200 shadow-xs"
        />
        {searchValue && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            aria-label="Limpar pesquisa"
            className="absolute right-0 top-0 size-11 min-w-11 min-h-11 text-muted-foreground hover:text-foreground flex items-center justify-center text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            
          </button>
        )}
      </div>
    </div>
  );
}
